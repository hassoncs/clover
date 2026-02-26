import type {
	AgUiEvent,
	ChatMessage,
	ContentBlock,
} from "@slopcade/shared/chat";
import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useReducer,
	useRef,
} from "react";
import { trpcReact as trpc } from "@/lib/trpc/react";
import {
	createInitialState,
	isPlaceholderThreadId,
	PLACEHOLDER_THREAD_ID,
	type StreamAction,
	type StreamState,
	streamReducer,
} from "./stream-reducer";

export interface ThreadManagement {
	initThread: (threadId: string) => void;
	switchThread: (threadId: string) => void;
	startNewThread: () => string;
}

const StreamStateContext = createContext<StreamState | null>(null);
const StreamDispatchContext =
	createContext<React.Dispatch<StreamAction> | null>(null);
const ThreadManagementContext = createContext<ThreadManagement | null>(null);

type ChatEventSubscriber = (event: AgUiEvent) => void;

type ChatEventSubscriptionContextType = {
	subscribe: (listener: ChatEventSubscriber) => () => void;
	notify: (event: AgUiEvent) => void;
};

const ChatEventSubscriptionContext =
	createContext<ChatEventSubscriptionContextType | null>(null);

interface ChatStreamProviderProps {
	children: React.ReactNode;
}

type PersistedMessage = {
	id: string;
	role: string;
	content: unknown;
	createdAt: number | string;
};

function isChatRole(role: string): role is ChatMessage["role"] {
	return (
		role === "assistant" ||
		role === "user" ||
		role === "system" ||
		role === "tool"
	);
}

function normalizeContentBlocks(rawContent: unknown): ContentBlock[] {
	if (!Array.isArray(rawContent)) {
		if (typeof rawContent === "string" && rawContent.length > 0) {
			return [{ type: "text", text: rawContent }];
		}
		return [];
	}

	const blocks: ContentBlock[] = [];
	for (const rawBlock of rawContent) {
		if (!rawBlock || typeof rawBlock !== "object") {
			continue;
		}

		const block = rawBlock as Record<string, unknown>;
		if (block.type === "text" && typeof block.text === "string") {
			blocks.push({ type: "text", text: block.text });
			continue;
		}

		if (
			block.type === "tool-use" &&
			typeof block.toolCallId === "string" &&
			typeof block.toolName === "string"
		) {
			const args = block.args;
			blocks.push({
				type: "tool-use",
				toolCallId: block.toolCallId,
				toolName: block.toolName,
				args:
					args && typeof args === "object" && !Array.isArray(args)
						? (args as Record<string, unknown>)
						: {},
				status:
					block.status === "streaming" || block.status === "complete"
						? block.status
						: "calling",
			});
			continue;
		}

		if (
			block.type === "tool-result" &&
			typeof block.toolCallId === "string" &&
			typeof block.toolName === "string"
		) {
			blocks.push({
				type: "tool-result",
				toolCallId: block.toolCallId,
				toolName: block.toolName,
				result: block.result,
				isError: typeof block.isError === "boolean" ? block.isError : undefined,
			});
		}
	}

	return blocks;
}

function convertPersistedMessages(messages: PersistedMessage[]): ChatMessage[] {
	return messages.map((message) => ({
		id: message.id,
		role: isChatRole(message.role) ? message.role : "system",
		content: normalizeContentBlocks(message.content),
		createdAt:
			typeof message.createdAt === "number"
				? message.createdAt
				: new Date(message.createdAt).getTime(),
	}));
}

export function ChatStreamProvider({ children }: ChatStreamProviderProps) {
	const [state, dispatch] = useReducer(
		streamReducer,
		undefined,
		createInitialState,
	);

	const initThread = useCallback((threadId: string) => {
		dispatch({ type: "INIT_THREAD", threadId });
	}, []);

	const switchThread = useCallback((threadId: string) => {
		dispatch({ type: "SET_CURRENT_THREAD", threadId });
	}, []);

	const startNewThread = useCallback(() => {
		dispatch({
			type: "START_NEW_THREAD",
			threadId: PLACEHOLDER_THREAD_ID,
		});
		return PLACEHOLDER_THREAD_ID;
	}, []);

	const threadManagement = useMemo<ThreadManagement>(
		() => ({
			initThread,
			switchThread,
			startNewThread,
		}),
		[initThread, switchThread, startNewThread],
	);

	const subscribersRef = useRef<Set<ChatEventSubscriber>>(new Set());

	const subscribe = useCallback((listener: ChatEventSubscriber) => {
		subscribersRef.current.add(listener);
		return () => {
			subscribersRef.current.delete(listener);
		};
	}, []);

	const notify = useCallback((event: AgUiEvent) => {
		for (const listener of subscribersRef.current) {
			listener(event);
		}
	}, []);

	const eventSubscription = useMemo<ChatEventSubscriptionContextType>(
		() => ({ subscribe, notify }),
		[subscribe, notify],
	);

	return (
		<StreamStateContext.Provider value={state}>
			<StreamDispatchContext.Provider value={dispatch}>
				<ThreadManagementContext.Provider value={threadManagement}>
					<ChatEventSubscriptionContext.Provider value={eventSubscription}>
						<ThreadSyncManager />
						{children}
					</ChatEventSubscriptionContext.Provider>
				</ThreadManagementContext.Provider>
			</StreamDispatchContext.Provider>
		</StreamStateContext.Provider>
	);
}

function ThreadSyncManager(): null {
	const state = useContext(StreamStateContext);
	const dispatch = useContext(StreamDispatchContext);

	const lastSyncedThreadRef = useRef<string | null>(null);
	const currentThreadId = state?.currentThreadId ?? PLACEHOLDER_THREAD_ID;
	const threadState = state?.threadMap[currentThreadId];

	const isNotPlaceholder = !isPlaceholderThreadId(currentThreadId);
	const isNotSynced = currentThreadId !== lastSyncedThreadRef.current;
	const hasNoMessages =
		!threadState || threadState.thread.messages.length === 0;
	const isStreaming = threadState?.thread.status === "streaming";
	const shouldFetch =
		isNotPlaceholder && isNotSynced && hasNoMessages && !isStreaming;

	const { data: messagesData, isSuccess: messagesSuccess } =
		trpc.chatThreads.getMessages.useQuery(
			{ threadId: currentThreadId, limit: 100 },
			{
				enabled: shouldFetch,
				staleTime: 1000,
				refetchOnWindowFocus: false,
			},
		);

	useEffect(() => {
		if (!messagesSuccess || !messagesData || !dispatch) return;
		if (lastSyncedThreadRef.current === currentThreadId) return;

		const converted = convertPersistedMessages(
			messagesData.messages as PersistedMessage[],
		);

		dispatch({
			type: "LOAD_THREAD_MESSAGES",
			threadId: currentThreadId,
			messages: converted,
			skipIfStreaming: true,
		});

		lastSyncedThreadRef.current = currentThreadId;
	}, [messagesSuccess, messagesData, currentThreadId, dispatch]);

	return null;
}

export function useStreamState(): StreamState {
	const context = useContext(StreamStateContext);
	if (!context) {
		throw new Error("useStreamState must be used within ChatStreamProvider");
	}
	return context;
}

export function useStreamDispatch(): React.Dispatch<StreamAction> {
	const context = useContext(StreamDispatchContext);
	if (!context) {
		throw new Error("useStreamDispatch must be used within ChatStreamProvider");
	}
	return context;
}

export function useThreadManagement(): ThreadManagement {
	const context = useContext(ThreadManagementContext);
	if (!context) {
		throw new Error(
			"useThreadManagement must be used within ChatStreamProvider",
		);
	}
	return context;
}

export function useChatEventNotify(): (event: AgUiEvent) => void {
	const context = useContext(ChatEventSubscriptionContext);
	if (!context) {
		throw new Error(
			"useChatEventNotify must be used within ChatStreamProvider",
		);
	}
	return context.notify;
}

export function useChatEventSubscription(listener: (event: AgUiEvent) => void) {
	const context = useContext(ChatEventSubscriptionContext);
	if (!context) {
		throw new Error(
			"useChatEventSubscription must be used within ChatStreamProvider",
		);
	}
	useEffect(() => {
		return context.subscribe(listener);
	}, [context, listener]);
}
