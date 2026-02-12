import { chatReducer, initialStreamState } from '../accumulator.ts';
import type { AgUiEvent } from '../events.ts';
import type {
	ChatMessage,
	ContentBlock,
	ToolResultContent,
	ToolUseContent,
} from '../types.ts';
import { describe, expect, it } from 'vitest';

function reduceEvents(threadId: string, events: AgUiEvent[]) {
	return events.reduce(chatReducer, initialStreamState(threadId));
}

function getMessageById(messages: ChatMessage[], messageId: string): ChatMessage {
	const message = messages.find((candidate) => candidate.id === messageId);
	if (!message) {
		throw new Error(`Expected message ${messageId} to exist`);
	}
	return message;
}

function getToolUse(blocks: ContentBlock[], toolCallId: string): ToolUseContent {
	const block = blocks.find(
		(candidate) => candidate.type === 'tool-use' && candidate.toolCallId === toolCallId,
	);
	if (!block || block.type !== 'tool-use') {
		throw new Error(`Expected tool-use block for ${toolCallId}`);
	}
	return block;
}

function getToolResult(blocks: ContentBlock[], toolCallId: string): ToolResultContent {
	const block = blocks.find(
		(candidate) => candidate.type === 'tool-result' && candidate.toolCallId === toolCallId,
	);
	if (!block || block.type !== 'tool-result') {
		throw new Error(`Expected tool-result block for ${toolCallId}`);
	}
	return block;
}

describe('chatReducer contract', () => {
	it('accumulates a simple text message into one text content block', () => {
		const messageId = 'message-1';
		const state = reduceEvents('thread-1', [
			{ type: 'RUN_STARTED', threadId: 'thread-1', runId: 'run-1' },
			{ type: 'TEXT_MESSAGE_START', messageId, role: 'assistant' },
			{ type: 'TEXT_MESSAGE_CONTENT', messageId, delta: 'Hello ' },
			{ type: 'TEXT_MESSAGE_CONTENT', messageId, delta: 'world!' },
			{ type: 'TEXT_MESSAGE_END', messageId },
			{ type: 'RUN_FINISHED', threadId: 'thread-1', runId: 'run-1' },
		]);

		expect(state.thread.status).toBe('idle');
		expect(state.thread.messages).toHaveLength(1);
		expect(state.thread.messages[0]).toEqual({
			id: messageId,
			role: 'assistant',
			createdAt: expect.any(Number),
			content: [{ type: 'text', text: 'Hello world!' }],
		});
	});

	it('tracks a tool call lifecycle with args, result, and interleaved text', () => {
		const messageId = 'message-2';
		const toolCallId = 'tool-1';
		const state = reduceEvents('thread-2', [
			{ type: 'RUN_STARTED', threadId: 'thread-2', runId: 'run-2' },
			{ type: 'TEXT_MESSAGE_START', messageId, role: 'assistant' },
			{ type: 'TEXT_MESSAGE_CONTENT', messageId, delta: 'Let me read that...' },
			{
				type: 'TOOL_CALL_START',
				toolCallId,
				toolName: 'readFile',
				parentMessageId: messageId,
			},
			{ type: 'TOOL_CALL_ARGS', toolCallId, delta: '{"filename":' },
			{ type: 'TOOL_CALL_ARGS', toolCallId, delta: '"test.md"}' },
			{ type: 'TOOL_CALL_END', toolCallId },
			{
				type: 'TOOL_CALL_RESULT',
				toolCallId,
				result: '{"content":"file contents"}',
			},
			{ type: 'TEXT_MESSAGE_CONTENT', messageId, delta: ' Here is what I found.' },
			{ type: 'TEXT_MESSAGE_END', messageId },
			{ type: 'RUN_FINISHED', threadId: 'thread-2', runId: 'run-2' },
		]);

		const message = getMessageById(state.thread.messages, messageId);
		expect(message.content).toEqual([
			{ type: 'text', text: 'Let me read that...' },
			{
				type: 'tool-use',
				toolCallId,
				toolName: 'readFile',
				args: { filename: 'test.md' },
				status: 'complete',
			},
			{
				type: 'tool-result',
				toolCallId,
				toolName: 'readFile',
				result: '{"content":"file contents"}',
			},
			{ type: 'text', text: ' Here is what I found.' },
		]);
		expect(state.thread.status).toBe('idle');
	});

	it('enters waiting state when askUser is pending at run finish', () => {
		const messageId = 'message-3';
		const toolCallId = 'ask-1';
		const state = reduceEvents('thread-3', [
			{ type: 'RUN_STARTED', threadId: 'thread-3', runId: 'run-3' },
			{ type: 'TEXT_MESSAGE_START', messageId, role: 'assistant' },
			{ type: 'TEXT_MESSAGE_CONTENT', messageId, delta: 'I have a question.' },
			{
				type: 'TOOL_CALL_START',
				toolCallId,
				toolName: 'askUser',
				parentMessageId: messageId,
			},
			{
				type: 'TOOL_CALL_ARGS',
				toolCallId,
				delta: '{"questions":[{"id":"q1","label":"Need detail?"}]}',
			},
			{ type: 'TOOL_CALL_END', toolCallId },
			{ type: 'RUN_FINISHED', threadId: 'thread-3', runId: 'run-3' },
		]);

		const message = getMessageById(state.thread.messages, messageId);
		const askUser = getToolUse(message.content, toolCallId);
		expect(askUser.toolName).toBe('askUser');
		expect(askUser.status).toBe('calling');
		expect(
			message.content.some(
				(block) => block.type === 'tool-result' && block.toolCallId === toolCallId,
			),
		).toBe(false);
		expect(state.thread.status).toBe('waiting');
	});

	it('captures run errors on the thread state', () => {
		const messageId = 'message-4';
		const state = reduceEvents('thread-4', [
			{ type: 'RUN_STARTED', threadId: 'thread-4', runId: 'run-4' },
			{ type: 'TEXT_MESSAGE_START', messageId, role: 'assistant' },
			{ type: 'TEXT_MESSAGE_CONTENT', messageId, delta: 'Starting...' },
			{ type: 'RUN_ERROR', message: 'Model overloaded' },
		]);

		expect(state.thread.status).toBe('error');
		expect(state.thread.error).toEqual({ message: 'Model overloaded' });
	});

	it('preserves ordering for multi-step tool and text blocks', () => {
		const messageId = 'message-5';
		const state = reduceEvents('thread-5', [
			{ type: 'RUN_STARTED', threadId: 'thread-5', runId: 'run-5' },
			{ type: 'TEXT_MESSAGE_START', messageId, role: 'assistant' },
			{ type: 'TEXT_MESSAGE_CONTENT', messageId, delta: 'First, I will inspect.' },
			{
				type: 'TOOL_CALL_START',
				toolCallId: 'tool-read',
				toolName: 'readFile',
				parentMessageId: messageId,
			},
			{ type: 'TOOL_CALL_ARGS', toolCallId: 'tool-read', delta: '{"path":"a.md"}' },
			{ type: 'TOOL_CALL_END', toolCallId: 'tool-read' },
			{ type: 'TOOL_CALL_RESULT', toolCallId: 'tool-read', result: '{"content":"A"}' },
			{ type: 'TEXT_MESSAGE_CONTENT', messageId, delta: ' Now I will write.' },
			{
				type: 'TOOL_CALL_START',
				toolCallId: 'tool-write',
				toolName: 'writeFile',
				parentMessageId: messageId,
			},
			{
				type: 'TOOL_CALL_ARGS',
				toolCallId: 'tool-write',
				delta: '{"path":"b.md","content":"B"}',
			},
			{ type: 'TOOL_CALL_END', toolCallId: 'tool-write' },
			{ type: 'TOOL_CALL_RESULT', toolCallId: 'tool-write', result: '{"ok":true}' },
			{ type: 'TEXT_MESSAGE_CONTENT', messageId, delta: ' Done.' },
			{ type: 'TEXT_MESSAGE_END', messageId },
			{ type: 'RUN_FINISHED', threadId: 'thread-5', runId: 'run-5' },
		]);

		const message = getMessageById(state.thread.messages, messageId);
		expect(message.content.map((block) => block.type)).toEqual([
			'text',
			'tool-use',
			'tool-result',
			'text',
			'tool-use',
			'tool-result',
			'text',
		]);
		expect(getToolUse(message.content, 'tool-read').status).toBe('complete');
		expect(getToolUse(message.content, 'tool-write').status).toBe('complete');
		expect(state.thread.status).toBe('idle');
	});

	it('resumes from waiting state and returns to idle after follow-up run', () => {
		const initial = reduceEvents('thread-6', [
			{ type: 'RUN_STARTED', threadId: 'thread-6', runId: 'run-6a' },
			{ type: 'TEXT_MESSAGE_START', messageId: 'message-6a', role: 'assistant' },
			{ type: 'TEXT_MESSAGE_CONTENT', messageId: 'message-6a', delta: 'Need your input.' },
			{
				type: 'TOOL_CALL_START',
				toolCallId: 'ask-2',
				toolName: 'askUser',
				parentMessageId: 'message-6a',
			},
			{ type: 'TOOL_CALL_ARGS', toolCallId: 'ask-2', delta: '{"questions":[{"id":"q2"}]}' },
			{ type: 'TOOL_CALL_END', toolCallId: 'ask-2' },
			{ type: 'RUN_FINISHED', threadId: 'thread-6', runId: 'run-6a' },
		]);

		expect(initial.thread.status).toBe('waiting');

		const resumed = [
			{ type: 'RUN_STARTED', threadId: 'thread-6', runId: 'run-6b' } as const,
			{ type: 'TEXT_MESSAGE_START', messageId: 'message-6b', role: 'assistant' } as const,
			{
				type: 'TOOL_CALL_RESULT',
				toolCallId: 'ask-2',
				result: '{"answers":{"q2":"blue"}}',
			} as const,
			{
				type: 'TEXT_MESSAGE_CONTENT',
				messageId: 'message-6b',
				delta: 'Thanks for your answer!',
			} as const,
			{ type: 'TEXT_MESSAGE_END', messageId: 'message-6b' } as const,
			{ type: 'RUN_FINISHED', threadId: 'thread-6', runId: 'run-6b' } as const,
		];

		const state = resumed.reduce(chatReducer, initial);
		const resumedMessage = getMessageById(state.thread.messages, 'message-6b');

		expect(state.thread.messages.length).toBeGreaterThanOrEqual(2);
		expect(resumedMessage.content).toEqual([
			{
				type: 'tool-result',
				toolCallId: 'ask-2',
				toolName: 'askUser',
				result: '{"answers":{"q2":"blue"}}',
			},
			{ type: 'text', text: 'Thanks for your answer!' },
		]);
		expect(getToolUse(state.thread.messages[0].content, 'ask-2').status).toBe('complete');
		expect(state.thread.status).toBe('idle');
		expect(getToolResult(resumedMessage.content, 'ask-2').toolName).toBe('askUser');
	});
});
