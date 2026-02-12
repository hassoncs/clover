import {
	type AgUiEvent,
	type ChatMessage,
	type ContentBlock,
	chatReducer,
	initialStreamState,
	type StreamState,
} from "@slopcade/shared/chat";
import {
	useCallback,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from "react";
import { getAuthToken } from "@/lib/auth/token";
import { env } from "@/lib/config/env";
import { trpcReact as trpc } from "@/lib/trpc/react";
import { connectSSE } from "./sse-client";

type StreamAction =
	| AgUiEvent
	| { type: "RESET"; threadId: string }
	| { type: "ADD_USER_MESSAGE"; message: ChatMessage }
	| { type: "MIGRATE_THREAD"; toThreadId: string };

type PendingAskUserPayload = {
	questions: Array<{
		header: string;
		question: string;
		options: Array<{ label: string; description: string; iconKey?: string }>;
		multiple?: boolean;
	}>;
	batchId: string;
};

type PersistedMessage = {
	id: string;
	role: string;
	content: unknown;
	createdAt: number;
};

function streamStateReducer(
	state: StreamState,
	action: StreamAction,
): StreamState {
	if (action.type === "RESET") {
		return initialStreamState(action.threadId);
	}

	if (action.type === "ADD_USER_MESSAGE") {
		return {
			...state,
			thread: {
				...state.thread,
				messages: [...state.thread.messages, action.message],
			},
		};
	}

	if (action.type === "MIGRATE_THREAD") {
		return {
			...state,
			thread: {
				...state.thread,
				id: action.toThreadId,
			},
		};
	}

	return chatReducer(state, action);
}

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

function convertPersistedMessages(messages: PersistedMessage[]): ChatMessage[] {
	return messages.map((message) => ({
		id: message.id,
		role: isChatRole(message.role) ? message.role : "system",
		content: normalizeContentBlocks(message.content),
		createdAt: message.createdAt,
	}));
}

function getTextContent(msg: ChatMessage): string {
	return msg.content
		.filter(
			(b): b is Extract<ContentBlock, { type: "text" }> => b.type === "text",
		)
		.map((b) => b.text)
		.join("");
}

function mergeMessages(
	base: ChatMessage[],
	stream: ChatMessage[],
): ChatMessage[] {
	if (base.length === 0) return stream;
	if (stream.length === 0) return base;

	const ids = new Set(base.map((msg) => msg.id));
	const baseUserTexts = new Set(
		base.filter((msg) => msg.role === "user").map((msg) => getTextContent(msg)),
	);

	const merged = [...base];
	for (const message of stream) {
		if (ids.has(message.id)) continue;
		if (
			message.id.startsWith("user-") &&
			message.role === "user" &&
			baseUserTexts.has(getTextContent(message))
		) {
			continue;
		}
		merged.push(message);
		ids.add(message.id);
	}
	return merged;
}

export function useStreamingChat(
	threadId: string | null,
	gameId: string | null,
) {
	const [state, dispatch] = useReducer(
		streamStateReducer,
		initialStreamState(threadId ?? "pending"),
	);
	const [isSending, setIsSending] = useState(false);
	const [streamError, setStreamError] = useState<string | null>(null);
	const sseRef = useRef<{ close: () => void } | null>(null);
	const currentStreamUrlRef = useRef<string | null>(null);
	const isConnectingRef = useRef(false);
	const isSendingRef = useRef(false);
	const prevThreadIdRef = useRef(threadId);

	const sendMessageMutation = trpc.chatThreads.sendMessage.useMutation();
	const submitToolAnswerMutation =
		trpc.chatThreads.submitToolAnswer.useMutation();

	const messagesQuery = trpc.chatThreads.getMessages.useQuery(
		{ threadId: threadId ?? "", limit: 100 },
		{ enabled: Boolean(threadId) },
	);

	const documentQuery = trpc.chatThreads.readWorkspaceFile.useQuery(
		{ gameId: gameId ?? "", filename: "document.md" },
		{ enabled: Boolean(gameId) },
	);

	useEffect(() => {
		isSendingRef.current = isSending;
	}, [isSending]);

	useEffect(() => {
		const prevId = prevThreadIdRef.current;
		prevThreadIdRef.current = threadId;

		const isFirstThreadAssignment =
			(prevId === null || prevId === "pending") &&
			threadId !== null &&
			threadId !== "pending";

		if (isFirstThreadAssignment && sseRef.current) {
			dispatch({ type: "MIGRATE_THREAD", toThreadId: threadId });
			return;
		}

		dispatch({ type: "RESET", threadId: threadId ?? "pending" });
		setIsSending(false);
		setStreamError(null);
		sseRef.current?.close();
		sseRef.current = null;
		currentStreamUrlRef.current = null;
		isConnectingRef.current = false;
	}, [threadId]);

	useEffect(() => {
		return () => {
			sseRef.current?.close();
			sseRef.current = null;
			currentStreamUrlRef.current = null;
			isConnectingRef.current = false;
		};
	}, []);

	const connectToStream = useCallback(async (relativeStreamUrl: string) => {
		if (isConnectingRef.current) {
			return;
		}

		isConnectingRef.current = true;

		let fullUrl = `${env.apiUrl}${relativeStreamUrl}`;
		if (!fullUrl.includes("token=")) {
			const token = await getAuthToken();
			if (!token) {
				setIsSending(false);
				setStreamError("Authentication required");
				isConnectingRef.current = false;
				return;
			}
			const separator = fullUrl.includes("?") ? "&" : "?";
			fullUrl = `${fullUrl}${separator}token=${encodeURIComponent(token)}`;
		}

		if (currentStreamUrlRef.current === fullUrl && sseRef.current) {
			isConnectingRef.current = false;
			return;
		}

		sseRef.current?.close();
		sseRef.current = null;
		currentStreamUrlRef.current = fullUrl;

		sseRef.current = connectSSE({
			url: fullUrl,
			onEvent: (event) => {
				dispatch(event);
				setStreamError(null);
				if (event.type === "RUN_FINISHED" || event.type === "RUN_ERROR") {
					setIsSending(false);
				}
			},
			onError: (error) => {
				setStreamError(error.message);
				setIsSending(false);
			},
			onClose: () => {
				sseRef.current = null;
				currentStreamUrlRef.current = null;
				isConnectingRef.current = false;
				if (isSendingRef.current) {
					setStreamError("Connection closed unexpectedly");
					setIsSending(false);
				}
			},
		});
	}, []);

	const sendMessage = useCallback(
		async (
			text: string,
			overrideThreadId?: string,
			overrideGameId?: string,
		): Promise<string | null> => {
			const targetGameId = overrideGameId ?? gameId;
			if (!targetGameId || isSendingRef.current) return null;

			const nextMessage: ChatMessage = {
				id: `user-${Date.now()}`,
				role: "user",
				content: [{ type: "text", text }],
				createdAt: Date.now(),
			};

			dispatch({ type: "ADD_USER_MESSAGE", message: nextMessage });
			setIsSending(true);
			setStreamError(null);

			try {
				const result = await sendMessageMutation.mutateAsync({
					threadId: overrideThreadId ?? threadId ?? undefined,
					gameId: targetGameId,
					text,
				});

				await connectToStream(result.streamUrl);
				return result.threadId;
			} catch (error) {
				setStreamError(
					error instanceof Error ? error.message : "Failed to send message",
				);
				setIsSending(false);
				return null;
			}
		},
		[threadId, gameId, sendMessageMutation, connectToStream],
	);

	const submitAnswer = useCallback(
		async (questionId: string, answer: string) => {
			if (!threadId) return;

			try {
				const result = await submitToolAnswerMutation.mutateAsync({
					threadId,
					toolCallId: questionId,
					answer,
				});

				setIsSending(true);
				setStreamError(null);
				await connectToStream(result.streamUrl);
			} catch (error) {
				setStreamError(
					error instanceof Error ? error.message : "Failed to submit answer",
				);
				setIsSending(false);
			}
		},
		[threadId, submitToolAnswerMutation, connectToStream],
	);

	const submitUserAnswer = useCallback(
		async (batchId: string, answers: string[][]) => {
			await submitAnswer(batchId, JSON.stringify(answers));
		},
		[submitAnswer],
	);

	const cancelBuild = useCallback(() => {
		sseRef.current?.close();
		sseRef.current = null;
		currentStreamUrlRef.current = null;
		isConnectingRef.current = false;
		setIsSending(false);
	}, []);

	const resetSession = useCallback(() => {
		dispatch({ type: "RESET", threadId: threadId ?? "pending" });
		sseRef.current?.close();
		sseRef.current = null;
		currentStreamUrlRef.current = null;
		isConnectingRef.current = false;
		setIsSending(false);
		setStreamError(null);
	}, [threadId]);

	const persistedMessages = useMemo(
		() =>
			convertPersistedMessages(
				(messagesQuery.data?.messages ?? []) as PersistedMessage[],
			),
		[messagesQuery.data?.messages],
	);

	const allMessages = useMemo(
		() => mergeMessages(persistedMessages, state.thread.messages),
		[persistedMessages, state.thread.messages],
	);

	const pendingQuestions = useMemo(() => {
		for (let i = allMessages.length - 1; i >= 0; i -= 1) {
			const message = allMessages[i];
			const toolResults = new Set(
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
					!toolResults.has(block.toolCallId)
				) {
					return toPendingPayload(block);
				}
			}
		}
		return null;
	}, [allMessages]);

	const isRunning = state.thread.status === "streaming" || isSending;

	return {
		messages: allMessages,
		thread: state.thread,
		sendMessage,
		cancelBuild,
		resetSession,
		submitAnswer,
		submitUserAnswer,
		run: isRunning ? { status: "running", gameId } : null,
		isRunning,
		isSending,
		documentContent: documentQuery.data?.content ?? null,
		pendingQuestions,
		questions: [],
		isConnected: true,
		error: streamError ?? state.thread.error?.message ?? null,
	};
}
