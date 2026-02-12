import type { ChatMessage, ContentBlock } from "@slopcade/shared/chat";
import { useCallback, useEffect, useState } from "react";
import { useThreads } from "@/components/create-game/useThreads";
import { useStreamingChat } from "@/lib/chat/useStreamingChat";
import { useEditor } from "./EditorProvider";

type PendingAskUserPayload = {
	questions: Array<{
		header: string;
		question: string;
		options: Array<{ label: string; description: string; iconKey?: string }>;
		multiple?: boolean;
	}>;
	batchId: string;
};

function toPendingPayload(
	toolUse: Extract<ContentBlock, { type: "tool-use" }>,
): PendingAskUserPayload {
	const args = toolUse.args;
	const questionsRaw = args.questions;
	if (Array.isArray(questionsRaw)) {
		return {
			questions: questionsRaw
				.map((q): PendingAskUserPayload["questions"][number] | null => {
					if (!q || typeof q !== "object") return null;
					const obj = q as Record<string, unknown>;
					const optionsRaw = Array.isArray(obj.options) ? obj.options : [];
					const options = optionsRaw
						.map(
							(
								opt,
							):
								| PendingAskUserPayload["questions"][number]["options"][number]
								| null => {
								if (!opt || typeof opt !== "object") return null;
								const optObj = opt as Record<string, unknown>;
								if (
									typeof optObj.label !== "string" ||
									typeof optObj.description !== "string"
								) {
									return null;
								}
								return {
									label: optObj.label,
									description: optObj.description,
									iconKey:
										typeof optObj.iconKey === "string"
											? optObj.iconKey
											: undefined,
								};
							},
						)
						.filter(
							(
								opt,
							): opt is PendingAskUserPayload["questions"][number]["options"][number] =>
								opt !== null,
						);

					if (
						typeof obj.question !== "string" ||
						typeof obj.header !== "string" ||
						options.length === 0
					) {
						return null;
					}

					return {
						header: obj.header,
						question: obj.question,
						options,
						multiple:
							typeof obj.multiple === "boolean" ? obj.multiple : undefined,
					};
				})
				.filter(
					(question): question is PendingAskUserPayload["questions"][number] =>
						question !== null,
				),
			batchId: toolUse.toolCallId,
		};
	}

	return {
		questions: [],
		batchId: toolUse.toolCallId,
	};
}

function findPendingQuestions(
	messages: ChatMessage[],
): PendingAskUserPayload | null {
	for (let i = messages.length - 1; i >= 0; i -= 1) {
		const message = messages[i];
		const completedToolCallIds = new Set(
			message.content
				.filter(
					(block): block is Extract<ContentBlock, { type: "tool-result" }> =>
						block.type === "tool-result",
				)
				.map((block) => block.toolCallId),
		);

		for (const block of message.content) {
			if (
				block.type === "tool-use" &&
				block.toolName === "askUser" &&
				block.status === "calling" &&
				!completedToolCallIds.has(block.toolCallId)
			) {
				return toPendingPayload(block);
			}
		}
	}

	return null;
}

export function useEditorChatSession() {
	const { gameId } = useEditor();

	const effectiveGameId = gameId !== "preview" ? gameId : null;
	const { threads, initForGame } = useThreads();
	const [threadId, setThreadId] = useState<string | null>(null);

	useEffect(() => {
		if (effectiveGameId) {
			initForGame(effectiveGameId);
		}
	}, [effectiveGameId, initForGame]);

	useEffect(() => {
		if (!threadId && threads.length > 0) {
			setThreadId(threads[0].id);
		}
	}, [threads, threadId]);

	const {
		messages,
		thread,
		sendMessage,
		isRunning,
		isSending,
		submitAnswer,
		submitUserAnswer,
	} = useStreamingChat(threadId, effectiveGameId);

	const pendingQuestions = findPendingQuestions(thread?.messages ?? messages);

	const handleSendMessage = useCallback(
		async (text: string) => {
			if (!effectiveGameId) {
				return;
			}

			const resolvedThreadId = await sendMessage(
				text,
				threadId ?? undefined,
				effectiveGameId,
			);

			if (!threadId && resolvedThreadId) {
				setThreadId(resolvedThreadId);
			}
		},
		[threadId, effectiveGameId, sendMessage],
	);

	return {
		messages,
		handleSendMessage,
		isRunning,
		isSending,
		submitAnswer,
		submitUserAnswer,
		pendingQuestions,
	};
}
