import type { ComponentType } from "react";

export declare const ChatConversation: ComponentType<Record<string, unknown>>;
export declare const ChatTextArea: ComponentType<Record<string, unknown>>;

export function useThreads(): {
	threads: Array<{ id: string }>;
	initForGame: (gameId: string) => void;
};
