import type { AgUiEvent, ChatMessage } from "@slopcade/shared/chat";
import { useCallback, useRef, useState } from "react";
import { getAuthToken } from "@/lib/auth/token";
import { env } from "@/lib/config/env";
import { trpcReact as trpc } from "@/lib/trpc/react";
import {
	useChatEventNotify,
	useStreamDispatch,
	useStreamState,
} from "./ChatStreamProvider";
import { connectSSE } from "./sse-client";
import { isPlaceholderThreadId, PLACEHOLDER_THREAD_ID } from "./stream-reducer";

export interface UseSendMessageReturn {
	sendMessage: (text: string, gameId: string) => Promise<string | null>;
	submitAnswer: (questionId: string, answer: string) => Promise<void>;
	submitUserAnswer: (batchId: string, answers: string[][]) => Promise<void>;
	isSending: boolean;
	error: string | null;
}

export function useSendMessage(): UseSendMessageReturn {
	const dispatch = useStreamDispatch();
	const state = useStreamState();
	const notifySubscribers = useChatEventNotify();
	const [isSending, setIsSending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const sseRef = useRef<{ close: () => void } | null>(null);
	const isSendingRef = useRef(false);

	const sendMessageMutation = trpc.chatThreads.sendMessage.useMutation();
	const submitToolAnswerMutation =
		trpc.chatThreads.submitToolAnswer.useMutation();

	const connectToStream = useCallback(
		async (relativeStreamUrl: string, targetThreadId: string) => {
			let fullUrl = `${env.apiUrl}${relativeStreamUrl}`;
			if (!fullUrl.includes("token=")) {
				const token = await getAuthToken();
				if (!token) {
					setIsSending(false);
					isSendingRef.current = false;
					setError("Authentication required");
					return;
				}
				const separator = fullUrl.includes("?") ? "&" : "?";
				fullUrl = `${fullUrl}${separator}token=${encodeURIComponent(token)}`;
			}

			sseRef.current?.close();
			sseRef.current = null;

			sseRef.current = connectSSE({
				url: fullUrl,
				onEvent: (event: AgUiEvent) => {
					dispatch({
						type: "EVENT",
						event,
						threadId: targetThreadId,
					});
					notifySubscribers(event);
					setError(null);
					if (event.type === "RUN_FINISHED" || event.type === "RUN_ERROR") {
						setIsSending(false);
						isSendingRef.current = false;
					}
				},
				onError: (err: Error) => {
					setError(err.message);
					setIsSending(false);
					isSendingRef.current = false;
				},
				onClose: () => {
					sseRef.current = null;
					if (isSendingRef.current) {
						setError("Connection closed unexpectedly");
						setIsSending(false);
						isSendingRef.current = false;
					}
				},
			});
		},
		[dispatch, notifySubscribers],
	);

	const sendMessage = useCallback(
		async (text: string, gameId: string): Promise<string | null> => {
			if (isSendingRef.current) return null;

			const currentThreadId = state.currentThreadId;
			const targetThreadId = isPlaceholderThreadId(currentThreadId)
				? PLACEHOLDER_THREAD_ID
				: currentThreadId;

			const userMessage: ChatMessage = {
				id: `user-${Date.now()}`,
				role: "user",
				content: [{ type: "text", text }],
				createdAt: Date.now(),
			};

			dispatch({
				type: "ADD_USER_MESSAGE",
				threadId: targetThreadId,
				message: userMessage,
			});

			setIsSending(true);
			isSendingRef.current = true;
			setError(null);

			try {
				const apiThreadId = isPlaceholderThreadId(currentThreadId)
					? undefined
					: currentThreadId;

				const result = await sendMessageMutation.mutateAsync({
					threadId: apiThreadId,
					gameId,
					text,
				});

				const realThreadId = result.threadId;

				await connectToStream(result.streamUrl, realThreadId);
				return realThreadId;
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Failed to send message";
				setError(errorMessage);
				setIsSending(false);
				isSendingRef.current = false;
				return null;
			}
		},
		[state.currentThreadId, sendMessageMutation, connectToStream, dispatch],
	);

	const submitAnswer = useCallback(
		async (questionId: string, answer: string) => {
			const currentThreadId = state.currentThreadId;
			if (isPlaceholderThreadId(currentThreadId)) return;

			try {
				const result = await submitToolAnswerMutation.mutateAsync({
					threadId: currentThreadId,
					toolCallId: questionId,
					answer,
				});

				setIsSending(true);
				isSendingRef.current = true;
				setError(null);
				await connectToStream(result.streamUrl, currentThreadId);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to submit answer",
				);
				setIsSending(false);
				isSendingRef.current = false;
			}
		},
		[state.currentThreadId, submitToolAnswerMutation, connectToStream],
	);

	const submitUserAnswer = useCallback(
		async (batchId: string, answers: string[][]) => {
			await submitAnswer(batchId, JSON.stringify(answers));
		},
		[submitAnswer],
	);

	return {
		sendMessage,
		submitAnswer,
		submitUserAnswer,
		isSending,
		error,
	};
}
