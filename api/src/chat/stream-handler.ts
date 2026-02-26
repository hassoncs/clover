import type { AgUiEvent } from "@slopcade/shared/chat";
import type { ModelMessage } from "ai";
import { stepCountIs, streamText } from "ai";
import { nanoid } from "nanoid";

type DesignFailureReason =
	| "VALIDATION_FAILED"
	| "MODEL_ERROR"
	| "MISSING_PREREQUISITE";

const DESIGN_FAILURE_MESSAGES: Record<DesignFailureReason, string> = {
	VALIDATION_FAILED: "Design generation produced invalid output. Retrying...",
	MODEL_ERROR: "Design generation encountered an error.",
	MISSING_PREREQUISITE: "Planning must complete before design generation.",
};

export function buildDesignStageFailedEvent(
	failureReason: DesignFailureReason,
): Extract<AgUiEvent, { type: "DESIGN_STAGE_FAILED" }> {
	return {
		type: "DESIGN_STAGE_FAILED",
		failureReason,
		message: DESIGN_FAILURE_MESSAGES[failureReason],
	};
}

import { CHAT_STAGE_PROMPT } from "@/agent/engine/prompts";
import { assembleSystemPrompt, getSkills, matchSkill } from "@/ai/skills";

import { AgUiMapper } from "./agui-mapper";
import type {
	ChatHandlerContext,
	DesignSelectionContext,
} from "./chat-handler";
import { createChatTools } from "./chat-tools";

function buildDesignSelectionBlock(
	designContext: DesignSelectionContext | undefined,
): string | null {
	if (!designContext) return null;

	const frameLabel = designContext.selectedFrameId ?? "none";
	const elementLabel = designContext.selectedElementId ?? "none";

	return `============================================================
DESIGN CANVAS SELECTION CONTEXT
============================================================
Currently selected frame: ${frameLabel}
Currently selected element: ${elementLabel}

Design editing rules:
- When the user asks to edit a design element and one is selected (element not "none"), call updateDesignElement targeting the selected frameId and elementId.
- When the user's target is ambiguous and NO element is selected (element is "none"), call askUser to clarify which element to edit BEFORE calling updateDesignElement.
- NEVER mutate elements in frames other than the targeted frame.
- After updateDesignElement succeeds, summarize the changedFields in your response.`;
}

type D1Database = import("@cloudflare/workers-types").D1Database;

type ResponseMessage = {
	role: string;
	content: unknown[];
};

type PendingAskUser = {
	toolCallId: string;
	toolName: string;
	questionsJson: string;
};

const MAX_STEPS = 10;

async function getNextSeq(db: D1Database, threadId: string): Promise<number> {
	const row = await db
		.prepare(
			"SELECT COALESCE(MAX(seq), 0) + 1 AS next_seq FROM messages WHERE thread_id = ?",
		)
		.bind(threadId)
		.first<{ next_seq: number }>();

	return row?.next_seq ?? 1;
}

async function insertMessage(
	db: D1Database,
	threadId: string,
	params: {
		role: string;
		contentJson: string;
		toolCallId?: string;
		toolName?: string;
		model?: string;
		costMicros?: number;
		inputTokens?: number;
		outputTokens?: number;
		errorJson?: string;
	},
): Promise<void> {
	const id = nanoid();
	const now = Date.now();
	const seq = await getNextSeq(db, threadId);

	await db
		.prepare(
			`INSERT INTO messages (id, thread_id, role, content_json, tool_call_id, tool_name, model, cost_micros, input_tokens, output_tokens, error_json, created_at, seq)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			id,
			threadId,
			params.role,
			params.contentJson,
			params.toolCallId ?? null,
			params.toolName ?? null,
			params.model ?? null,
			params.costMicros ?? 0,
			params.inputTokens ?? 0,
			params.outputTokens ?? 0,
			params.errorJson ?? null,
			now,
			seq,
		)
		.run();
}

async function updateThread(
	db: D1Database,
	threadId: string,
	updates: {
		generation_stage?:
			| "idle"
			| "generating"
			| "waiting_for_input"
			| "complete"
			| "error";
		status_message?: string | null;
		metadata_json?: string | null;
	},
): Promise<void> {
	const setClauses: string[] = ["updated_at = ?"];
	const binds: Array<string | number | null> = [Date.now()];

	if (updates.generation_stage !== undefined) {
		setClauses.push("generation_stage = ?");
		binds.push(updates.generation_stage);
	}

	if (updates.status_message !== undefined) {
		setClauses.push("status_message = ?");
		binds.push(updates.status_message);
	}

	if (updates.metadata_json !== undefined) {
		setClauses.push("metadata_json = ?");
		binds.push(updates.metadata_json);
	}

	binds.push(threadId);

	await db
		.prepare(`UPDATE threads SET ${setClauses.join(", ")} WHERE id = ?`)
		.bind(...binds)
		.run();
}

function findPendingAskUser(steps: unknown[]): PendingAskUser | undefined {
	const lastStep = steps[steps.length - 1];
	if (!lastStep || typeof lastStep !== "object") {
		return undefined;
	}

	const stepRecord = lastStep as Record<string, unknown>;
	if (!Array.isArray(stepRecord.toolCalls)) {
		return undefined;
	}

	for (const toolCall of stepRecord.toolCalls) {
		if (!toolCall || typeof toolCall !== "object") {
			continue;
		}

		const tc = toolCall as Record<string, unknown>;
		if (tc.toolName !== "askUser") {
			continue;
		}

		if (typeof tc.toolCallId !== "string" || tc.toolCallId.length === 0) {
			continue;
		}

		return {
			toolCallId: tc.toolCallId,
			toolName: "askUser",
			questionsJson: JSON.stringify(tc.args ?? tc.input ?? null),
		};
	}

	return undefined;
}

function estimateCostMicros(
	inputTokens: number,
	outputTokens: number,
	costPer1kTokensMicros: number,
): number {
	const tokens = inputTokens + outputTokens;
	if (tokens <= 0) {
		return 0;
	}

	return Math.max(1, Math.round((tokens / 1000) * costPer1kTokensMicros));
}

async function billForUsage(
	ctx: ChatHandlerContext,
	threadId: string,
	inputTokens: number,
	outputTokens: number,
): Promise<void> {
	const costPer1k = ctx.costPer1kTokensMicros ?? 1_000;
	const costMicros = estimateCostMicros(inputTokens, outputTokens, costPer1k);
	if (costMicros <= 0) {
		return;
	}

	const idempotencyKey = `chat-message:${threadId}:${Date.now()}`;
	await ctx.walletService.debit({
		userId: ctx.userId,
		type: "generation_debit",
		amountMicros: -costMicros,
		referenceType: "thread",
		referenceId: threadId,
		idempotencyKey,
		description: "Chat message generation",
		metadata: { threadId, inputTokens, outputTokens, costMicros },
	});
}

async function persistGenerationResults(
	db: D1Database,
	threadId: string,
	modelName: string,
	responseMessages: ReadonlyArray<ResponseMessage>,
): Promise<void> {
	for (const message of responseMessages) {
		if (message.role === "assistant") {
			await insertMessage(db, threadId, {
				role: "assistant",
				contentJson: JSON.stringify(message.content),
				model: modelName,
			});
			continue;
		}

		if (message.role !== "tool") {
			continue;
		}

		for (const contentPart of message.content) {
			const part = contentPart as Record<string, unknown>;
			if (part.type !== "tool-result") {
				continue;
			}

			await insertMessage(db, threadId, {
				role: "tool",
				contentJson: JSON.stringify([contentPart]),
				toolCallId:
					typeof part.toolCallId === "string" ? part.toolCallId : undefined,
				toolName: typeof part.toolName === "string" ? part.toolName : undefined,
			});
		}
	}
}

function toErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	if (error === undefined || error === null) {
		return "Unknown error (undefined/null thrown)";
	}
	try {
		return String(error);
	} catch {
		return "Unknown error (could not stringify)";
	}
}

export async function handleChatStream(
	ctx: ChatHandlerContext,
	threadId: string,
	messages: ModelMessage[],
	waitUntil: (promise: Promise<unknown>) => void,
): Promise<Response> {
	const encoder = new TextEncoder();
	const { readable, writable } = new TransformStream();
	const writer = writable.getWriter();

	const emit = async (event: AgUiEvent) => {
		await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
	};

	const keepalive = async () => {
		await writer.write(encoder.encode(": keepalive\n\n"));
	};

	await updateThread(ctx.db, threadId, {
		generation_stage: "generating",
		status_message: "Thinking...",
	});

	const runId = nanoid();

	const mapper = new AgUiMapper({
		threadId,
		runId,
		generateMessageId: () => nanoid(),
	});

	let lastUserText = "";
	for (let i = messages.length - 1; i >= 0; i--) {
		const msg = messages[i];
		if (msg.role === "user") {
			if (typeof msg.content === "string") {
				lastUserText = msg.content;
			} else if (Array.isArray(msg.content)) {
				const textParts = msg.content
					.filter((part) => typeof part === "object" && part.type === "text")
					.map((part) => part.text);
				lastUserText = textParts.join(" ");
			}
			break;
		}
	}

	const matchedSkill = matchSkill(lastUserText, getSkills());
	const designSelectionBlock = buildDesignSelectionBlock(ctx.designContext);

	const result = streamText({
		model: ctx.model,
		system: assembleSystemPrompt(
			CHAT_STAGE_PROMPT +
				(designSelectionBlock ? `\n\n${designSelectionBlock}` : ""),
			matchedSkill,
		),
		messages,
		tools: createChatTools({
			gameId: ctx.gameId,
			gitService: ctx.gitService,
			env: ctx.env,
			designContext: ctx.designContext,
			onFileChanged: async ({ gameId, filename }) => {
				try {
					await emit({ type: "FILE_CHANGED", gameId, filename });
				} catch {
					// Don't fail the run if event delivery fails
				}
			},
			onEditorCommand: async ({ command, payload }) => {
				try {
					await emit({
						type: "EDITOR_COMMAND",
						command,
						payload,
					});
					return { dispatched: true, command };
				} catch {
					return { dispatched: false, error: "Failed to deliver command" };
				}
			},
		}),
		stopWhen: stepCountIs(MAX_STEPS),
	});

	const keepaliveInterval = setInterval(() => {
		keepalive().catch(() => {});
	}, 5_000);

	const streamingPromise = (async () => {
		try {
			console.log("[stream-handler] Starting stream for thread:", threadId);
			await emit({ type: "RUN_STARTED", threadId, runId });

			if (ctx.pendingDesignFailure) {
				await emit(buildDesignStageFailedEvent(ctx.pendingDesignFailure));
			}

			console.log("[stream-handler] Beginning fullStream iteration");
			for await (const part of result.fullStream) {
				console.log("[stream-handler] Received stream part:", part.type);
				const event = mapper.map(part);
				if (event) {
					try {
						await emit(event);
					} catch (emitError) {
						console.error(
							"[stream-handler] Emit error (client likely disconnected):",
							emitError,
						);
						// Don't throw - client disconnect is not a fatal error
						break;
					}
				}
			}
			console.log("[stream-handler] fullStream iteration complete");

			await emit({ type: "RUN_FINISHED", threadId, runId });

			console.log("[stream-handler] Waiting for response...");
			const response = await result.response;
			console.log("[stream-handler] Got response");
			await persistGenerationResults(
				ctx.db,
				threadId,
				ctx.modelName,
				response.messages as ReadonlyArray<ResponseMessage>,
			);

			console.log("[stream-handler] Getting usage...");
			const totalUsage = await result.totalUsage;
			console.log("[stream-handler] Got usage:", totalUsage);
			await billForUsage(
				ctx,
				threadId,
				totalUsage.inputTokens ?? 0,
				totalUsage.outputTokens ?? 0,
			);

			console.log("[stream-handler] Getting steps...");
			const steps = await result.steps;
			console.log("[stream-handler] Got steps:", steps.length);
			const pending = findPendingAskUser(steps as unknown[]);
			if (pending) {
				await updateThread(ctx.db, threadId, {
					generation_stage: "waiting_for_input",
					status_message: "Waiting for your input...",
					metadata_json: JSON.stringify({
						pendingToolCallId: pending.toolCallId,
					}),
				});
			} else {
				await updateThread(ctx.db, threadId, {
					generation_stage: "complete",
					status_message: null,
				});
			}
			console.log("[stream-handler] Stream completed successfully");
		} catch (error) {
			console.error("[stream-handler] Stream error:", error);
			console.error("[stream-handler] Error type:", typeof error);
			console.error(
				"[stream-handler] Error constructor:",
				error?.constructor?.name,
			);
			console.error(
				"[stream-handler] Error stack:",
				error instanceof Error ? error.stack : "N/A",
			);
			const errorMessage = toErrorMessage(error);
			await emit({ type: "RUN_ERROR", message: errorMessage });

			await insertMessage(ctx.db, threadId, {
				role: "assistant",
				contentJson: JSON.stringify([
					{ type: "text", text: `Error: ${errorMessage}` },
				]),
				errorJson: JSON.stringify({
					message: errorMessage,
					timestamp: Date.now(),
				}),
			});

			await updateThread(ctx.db, threadId, {
				generation_stage: "error",
				status_message: errorMessage,
			});
		} finally {
			clearInterval(keepaliveInterval);
			await writer.close();
		}
	})();

	waitUntil(streamingPromise);

	return new Response(readable, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
		},
	});
}
