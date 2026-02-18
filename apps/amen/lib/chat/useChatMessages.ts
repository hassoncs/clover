import type { ChatMessage } from "@slopcade/shared/chat";
import { useMemo } from "react";
import { useStreamState } from "./ChatStreamProvider";

export interface UseChatMessagesReturn {
	messages: ChatMessage[];
	isStreaming: boolean;
	error: string | null;
}

function deduplicateMessages(messages: ChatMessage[]): ChatMessage[] {
	const seen = new Set<string>();
	const result: ChatMessage[] = [];
	for (const msg of messages) {
		if (!seen.has(msg.id)) {
			seen.add(msg.id);
			result.push(msg);
		}
	}
	return result;
}

export function useChatMessages(threadId: string): UseChatMessagesReturn {
	const state = useStreamState();
	const threadState = state.threadMap[threadId];

	return useMemo(
		() => ({
			messages: deduplicateMessages(threadState?.thread.messages ?? []),
			isStreaming: threadState?.streaming.status === "streaming",
			error: threadState?.thread.error?.message ?? null,
		}),
		[threadState],
	);
}
