import type { AgUiEvent } from './events';
import type { ChatMessage, ChatThread, ToolUseContent } from './types';

export interface StreamState {
	thread: ChatThread;
	currentMessageId: string | null;
	currentRunId: string | null;
	accumulatingToolArgs: Map<string, string>;
}

export function initialStreamState(threadId: string): StreamState {
	return {
		thread: {
			id: threadId,
			messages: [],
			status: 'idle',
		},
		currentMessageId: null,
		currentRunId: null,
		accumulatingToolArgs: new Map(),
	};
}

function appendTextContent(message: ChatMessage, delta: string): ChatMessage {
	if (message.content.length === 0) {
		return {
			...message,
			content: [{ type: 'text', text: delta }],
		};
	}

	const lastBlock = message.content[message.content.length - 1];
	if (lastBlock.type === 'text') {
		const nextContent = message.content.slice(0, -1);
		nextContent.push({
			type: 'text',
			text: `${lastBlock.text}${delta}`,
		});
		return {
			...message,
			content: nextContent,
		};
	}

	return {
		...message,
		content: [...message.content, { type: 'text', text: delta }],
	};
}

function updateMessage(
	messages: ChatMessage[],
	messageId: string,
	updater: (message: ChatMessage) => ChatMessage,
): ChatMessage[] {
	const messageIndex = messages.findIndex((message) => message.id === messageId);
	if (messageIndex < 0) {
		return messages;
	}

	const nextMessages = [...messages];
	nextMessages[messageIndex] = updater(nextMessages[messageIndex]);
	return nextMessages;
}

function updateToolUseByToolCallId(
	messages: ChatMessage[],
	toolCallId: string,
	updater: (toolUse: ToolUseContent) => ToolUseContent,
): ChatMessage[] {
	let changed = false;
	const nextMessages = messages.map((message) => {
		const content = message.content.map((block) => {
			if (block.type !== 'tool-use' || block.toolCallId !== toolCallId) {
				return block;
			}
			changed = true;
			return updater(block);
		});

		if (!changed || content === message.content) {
			return message;
		}

		return {
			...message,
			content,
		};
	});

	return changed ? nextMessages : messages;
}

function findToolUseBlock(messages: ChatMessage[], toolCallId: string): ToolUseContent | null {
	for (const message of messages) {
		for (const block of message.content) {
			if (block.type === 'tool-use' && block.toolCallId === toolCallId) {
				return block;
			}
		}
	}

	return null;
}

function findMessageIdForToolCall(messages: ChatMessage[], toolCallId: string): string | null {
	for (const message of messages) {
		if (
			message.content.some(
				(block) => block.type === 'tool-use' && block.toolCallId === toolCallId,
			)
		) {
			return message.id;
		}
	}

	return null;
}

function hasPendingAskUser(messages: ChatMessage[]): boolean {
	const completedToolCallIds = new Set<string>();
	for (const message of messages) {
		for (const block of message.content) {
			if (block.type === 'tool-result') {
				completedToolCallIds.add(block.toolCallId);
			}
		}
	}

	for (const message of messages) {
		for (const block of message.content) {
			if (
				block.type === 'tool-use' &&
				block.toolName === 'askUser' &&
				block.status === 'calling' &&
				!completedToolCallIds.has(block.toolCallId)
			) {
				return true;
			}
		}
	}

	return false;
}

function resolveTargetMessageId(state: StreamState, toolCallId: string): string | null {
	if (state.currentMessageId) {
		return state.currentMessageId;
	}

	return findMessageIdForToolCall(state.thread.messages, toolCallId);
}

export function chatReducer(state: StreamState, event: AgUiEvent): StreamState {
	switch (event.type) {
		case 'RUN_STARTED': {
			return {
				...state,
				thread: {
					...state.thread,
					id: event.threadId,
					status: 'streaming',
					error: undefined,
				},
				currentRunId: event.runId,
			};
		}

		case 'TEXT_MESSAGE_START': {
			const nextMessage: ChatMessage = {
				id: event.messageId,
				role: event.role,
				content: [],
				createdAt: Date.now(),
			};

			return {
				...state,
				thread: {
					...state.thread,
					messages: [...state.thread.messages, nextMessage],
				},
				currentMessageId: event.messageId,
			};
		}

		case 'TEXT_MESSAGE_CONTENT': {
			const nextMessages = updateMessage(
				state.thread.messages,
				event.messageId,
				(message) => appendTextContent(message, event.delta),
			);

			if (nextMessages === state.thread.messages) {
				return state;
			}

			return {
				...state,
				thread: {
					...state.thread,
					messages: nextMessages,
				},
			};
		}

		case 'TEXT_MESSAGE_END': {
			return state;
		}

		case 'TOOL_CALL_START': {
			const nextMessages = updateMessage(
				state.thread.messages,
				event.parentMessageId,
				(message) => ({
					...message,
					content: [
						...message.content,
						{
							type: 'tool-use',
							toolCallId: event.toolCallId,
							toolName: event.toolName,
							args: {},
							status: 'streaming',
						},
					],
				}),
			);

			if (nextMessages === state.thread.messages) {
				return state;
			}

			const nextAccumulatingToolArgs = new Map(state.accumulatingToolArgs);
			nextAccumulatingToolArgs.set(event.toolCallId, '');

			return {
				...state,
				thread: {
					...state.thread,
					messages: nextMessages,
				},
				accumulatingToolArgs: nextAccumulatingToolArgs,
			};
		}

		case 'TOOL_CALL_ARGS': {
			const currentArgs = state.accumulatingToolArgs.get(event.toolCallId) ?? '';
			const nextArgs = `${currentArgs}${event.delta}`;
			const nextAccumulatingToolArgs = new Map(state.accumulatingToolArgs);
			nextAccumulatingToolArgs.set(event.toolCallId, nextArgs);

			let parsedArgs: Record<string, unknown> | null = null;
			try {
				const parsed = JSON.parse(nextArgs);
				if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
					parsedArgs = parsed as Record<string, unknown>;
				}
			} catch {
				parsedArgs = null;
			}

			if (!parsedArgs) {
				return {
					...state,
					accumulatingToolArgs: nextAccumulatingToolArgs,
				};
			}

			const nextMessages = updateToolUseByToolCallId(
				state.thread.messages,
				event.toolCallId,
				(toolUse) => ({
					...toolUse,
					args: parsedArgs,
				}),
			);

			return {
				...state,
				thread: {
					...state.thread,
					messages: nextMessages,
				},
				accumulatingToolArgs: nextAccumulatingToolArgs,
			};
		}

		case 'TOOL_CALL_END': {
			const nextMessages = updateToolUseByToolCallId(
				state.thread.messages,
				event.toolCallId,
				(toolUse) => ({
					...toolUse,
					status: 'calling',
				}),
			);

			if (nextMessages === state.thread.messages) {
				return state;
			}

			return {
				...state,
				thread: {
					...state.thread,
					messages: nextMessages,
				},
			};
		}

		case 'TOOL_CALL_RESULT': {
			const toolUse = findToolUseBlock(state.thread.messages, event.toolCallId);
			const toolName = toolUse?.toolName ?? 'unknown';
			const nextToolMessages = updateToolUseByToolCallId(
				state.thread.messages,
				event.toolCallId,
				(previous) => ({
					...previous,
					status: 'complete',
				}),
			);

			const messageId = resolveTargetMessageId(state, event.toolCallId);
			if (!messageId) {
				return {
					...state,
					thread: {
						...state.thread,
						messages: nextToolMessages,
					},
				};
			}

			const nextMessages = updateMessage(nextToolMessages, messageId, (message) => ({
				...message,
				content: [
					...message.content,
					{
						type: 'tool-result',
						toolCallId: event.toolCallId,
						toolName,
						result: event.result,
						isError: event.isError,
					},
				],
			}));

			const nextAccumulatingToolArgs = new Map(state.accumulatingToolArgs);
			nextAccumulatingToolArgs.delete(event.toolCallId);

			return {
				...state,
				thread: {
					...state.thread,
					messages: nextMessages,
				},
				accumulatingToolArgs: nextAccumulatingToolArgs,
			};
		}

		case 'RUN_FINISHED': {
			const nextStatus = hasPendingAskUser(state.thread.messages) ? 'waiting' : 'idle';
			return {
				...state,
				thread: {
					...state.thread,
					id: event.threadId,
					status: nextStatus,
				},
				currentRunId: null,
				currentMessageId: null,
			};
		}

		case 'RUN_ERROR': {
			return {
				...state,
				thread: {
					...state.thread,
					status: 'error',
					error: {
						message: event.message,
						code: event.code,
					},
				},
				currentRunId: null,
			};
		}

		default:
			return state;
	}
}
