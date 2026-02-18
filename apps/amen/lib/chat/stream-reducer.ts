import type { AgUiEvent, ChatMessage, ChatThread } from "@slopcade/shared/chat";
import {
	chatReducer,
	type StreamState as SharedStreamState,
} from "@slopcade/shared/chat";

export interface ThreadState {
	thread: ChatThread;
	streaming: { status: "idle" | "streaming"; runId?: string };
	currentMessageId: string | null;
	accumulatingToolArgs: Map<string, string>;
}

export interface StreamState {
	threadMap: Record<string, ThreadState>;
	currentThreadId: string;
}

export interface EventAction {
	type: "EVENT";
	event: AgUiEvent;
	threadId: string;
}

export interface InitThreadAction {
	type: "INIT_THREAD";
	threadId: string;
}

export interface SetCurrentThreadAction {
	type: "SET_CURRENT_THREAD";
	threadId: string;
}

export interface StartNewThreadAction {
	type: "START_NEW_THREAD";
	threadId: string;
}

export interface LoadThreadMessagesAction {
	type: "LOAD_THREAD_MESSAGES";
	threadId: string;
	messages: ChatMessage[];
	skipIfStreaming?: boolean;
}

export interface ResetThreadAction {
	type: "RESET_THREAD";
	threadId: string;
}

export interface AddUserMessageAction {
	type: "ADD_USER_MESSAGE";
	threadId: string;
	message: ChatMessage;
}

export type StreamAction =
	| EventAction
	| InitThreadAction
	| SetCurrentThreadAction
	| StartNewThreadAction
	| LoadThreadMessagesAction
	| ResetThreadAction
	| AddUserMessageAction;

export const PLACEHOLDER_THREAD_ID = "pending";

export function isPlaceholderThreadId(
	threadId: string | null | undefined,
): boolean {
	return threadId === PLACEHOLDER_THREAD_ID;
}

function createInitialThreadState(threadId: string): ThreadState {
	return {
		thread: {
			id: threadId,
			messages: [],
			status: "idle",
		},
		streaming: { status: "idle" },
		currentMessageId: null,
		accumulatingToolArgs: new Map(),
	};
}

export function createInitialState(): StreamState {
	return {
		threadMap: {
			[PLACEHOLDER_THREAD_ID]: createInitialThreadState(PLACEHOLDER_THREAD_ID),
		},
		currentThreadId: PLACEHOLDER_THREAD_ID,
	};
}

function applyAgUiEvent(
	threadState: ThreadState,
	event: AgUiEvent,
): ThreadState {
	const sharedState: SharedStreamState = {
		thread: threadState.thread,
		currentMessageId: threadState.currentMessageId,
		currentRunId: threadState.streaming.runId ?? null,
		accumulatingToolArgs: threadState.accumulatingToolArgs,
	};

	const nextSharedState = chatReducer(sharedState, event);

	let streamingStatus: "idle" | "streaming" = threadState.streaming.status;
	let runId = threadState.streaming.runId;

	if (event.type === "RUN_STARTED") {
		streamingStatus = "streaming";
		runId = event.runId;
	} else if (event.type === "RUN_FINISHED" || event.type === "RUN_ERROR") {
		streamingStatus = "idle";
		runId = undefined;
	}

	return {
		thread: nextSharedState.thread,
		streaming: { status: streamingStatus, runId },
		currentMessageId: nextSharedState.currentMessageId,
		accumulatingToolArgs: nextSharedState.accumulatingToolArgs,
	};
}

export function streamReducer(
	state: StreamState,
	action: StreamAction,
): StreamState {
	switch (action.type) {
		case "INIT_THREAD": {
			if (state.threadMap[action.threadId]) {
				return state;
			}
			return {
				...state,
				threadMap: {
					...state.threadMap,
					[action.threadId]: createInitialThreadState(action.threadId),
				},
			};
		}

		case "SET_CURRENT_THREAD": {
			return {
				...state,
				currentThreadId: action.threadId,
			};
		}

		case "START_NEW_THREAD": {
			if (state.threadMap[action.threadId]) {
				return {
					...state,
					currentThreadId: action.threadId,
				};
			}
			return {
				...state,
				threadMap: {
					...state.threadMap,
					[action.threadId]: createInitialThreadState(action.threadId),
				},
				currentThreadId: action.threadId,
			};
		}

		case "LOAD_THREAD_MESSAGES": {
			return handleLoadThreadMessages(state, action);
		}

		case "RESET_THREAD": {
			return {
				...state,
				threadMap: {
					...state.threadMap,
					[action.threadId]: createInitialThreadState(action.threadId),
				},
			};
		}

		case "ADD_USER_MESSAGE": {
			const threadState =
				state.threadMap[action.threadId] ??
				createInitialThreadState(action.threadId);

			return {
				...state,
				threadMap: {
					...state.threadMap,
					[action.threadId]: {
						...threadState,
						thread: {
							...threadState.thread,
							messages: [...threadState.thread.messages, action.message],
						},
					},
				},
			};
		}

		case "EVENT": {
			return handleEvent(state, action);
		}
	}
}

function handleEvent(state: StreamState, action: EventAction): StreamState {
	const { event, threadId } = action;

	const effectiveThreadId =
		event.type === "RUN_STARTED" ? event.threadId : threadId;

	let threadState = state.threadMap[effectiveThreadId];
	let updatedState = state;

	if (!threadState) {
		threadState = createInitialThreadState(effectiveThreadId);
		updatedState = {
			...state,
			threadMap: {
				...state.threadMap,
				[effectiveThreadId]: threadState,
			},
		};
	}

	if (
		event.type === "RUN_STARTED" &&
		effectiveThreadId !== PLACEHOLDER_THREAD_ID
	) {
		const placeholderState = updatedState.threadMap[PLACEHOLDER_THREAD_ID];
		if (placeholderState?.thread.messages.length) {
			threadState = {
				...threadState,
				thread: {
					...threadState.thread,
					messages: [
						...placeholderState.thread.messages,
						...threadState.thread.messages,
					],
				},
			};

			const resetPlaceholder = createInitialThreadState(PLACEHOLDER_THREAD_ID);
			updatedState = {
				...updatedState,
				threadMap: {
					...updatedState.threadMap,
					[PLACEHOLDER_THREAD_ID]: resetPlaceholder,
					[effectiveThreadId]: threadState,
				},
				currentThreadId: isPlaceholderThreadId(updatedState.currentThreadId)
					? effectiveThreadId
					: updatedState.currentThreadId,
			};
		}
	}

	const updatedThreadState = applyAgUiEvent(threadState, event);

	return {
		...updatedState,
		threadMap: {
			...updatedState.threadMap,
			[effectiveThreadId]: updatedThreadState,
		},
	};
}

function handleLoadThreadMessages(
	state: StreamState,
	action: LoadThreadMessagesAction,
): StreamState {
	const { threadId, messages, skipIfStreaming } = action;

	let threadState = state.threadMap[threadId];
	if (!threadState) {
		threadState = createInitialThreadState(threadId);
	}

	if (skipIfStreaming && threadState.streaming.status === "streaming") {
		return state;
	}

	const existingIds = new Set(threadState.thread.messages.map((m) => m.id));
	const newMessages = messages.filter((m) => !existingIds.has(m.id));

	const merged = [...threadState.thread.messages, ...newMessages];
	merged.sort((a, b) => a.createdAt - b.createdAt);

	return {
		...state,
		threadMap: {
			...state.threadMap,
			[threadId]: {
				...threadState,
				thread: {
					...threadState.thread,
					messages: merged,
				},
			},
		},
	};
}
