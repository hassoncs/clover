import type { AgUiEvent, ChatMessage } from "@slopcade/shared/chat";
import type { ComponentType, ReactNode } from "react";
import { createContext, useContext } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTRPCReact = any;

export interface ChatStreamHooks {
	useChatMessages: (threadId: string) => {
		messages: ChatMessage[];
		isLoading?: boolean;
		isStreaming?: boolean;
		error?: string | null;
	};
	useSendMessage: () => {
		sendMessage: (content: string, gameId: string) => Promise<string | null>;
		submitAnswer: (questionId: string, answer: string) => Promise<void>;
		submitUserAnswer: (batchId: string, answers: string[][]) => Promise<void>;
		isSending: boolean;
		error: string | null;
	};
	useStreamState: () => { currentThreadId: string };
	useThreadManagement: () => { switchThread: (threadId: string) => void };
	useChatEventSubscription: (listener: (event: AgUiEvent) => void) => void;
	useChatEventNotify: () => (event: AgUiEvent) => void;
	ChatStreamProvider: ComponentType<{ children: ReactNode }>;
}

export interface EditorConfig {
	trpc: AnyTRPCReact;
	chat: ChatStreamHooks;
	getStorageItem: (key: string) => Promise<string | null>;
	setStorageItem: (key: string, value: string) => Promise<void>;
}

const EditorConfigContext = createContext<EditorConfig | null>(null);

export function EditorConfigProvider({
	config,
	children,
}: {
	config: EditorConfig;
	children: ReactNode;
}) {
	return (
		<EditorConfigContext.Provider value={config}>
			{children}
		</EditorConfigContext.Provider>
	);
}

export function useEditorConfig(): EditorConfig {
	const config = useContext(EditorConfigContext);
	if (!config) {
		throw new Error("EditorConfigProvider is required above this component");
	}
	return config;
}

export function useEditorTRPC(): AnyTRPCReact {
	return useEditorConfig().trpc;
}

export function useEditorChat(): ChatStreamHooks {
	return useEditorConfig().chat;
}
