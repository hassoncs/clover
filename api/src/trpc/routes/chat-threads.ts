import type {
	WorkspaceSnapshot,
	WorkspaceSnapshotFile,
} from "@slopcade/shared";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
	insertToolResult,
	insertUserMessage,
	type MessageRow,
	type ThreadRow,
} from "@/chat/chat-handler";
import { microsToSparks, USER_COSTS } from "@/economy/pricing";
import { WalletService } from "@/economy/wallet-service";
import { AuditService } from "@/services/audit-service";
import { GitService } from "@/services/git/GitService";
import {
	MODERATION_ERROR_MESSAGE,
	ModerationService,
} from "@/services/moderation-service";
import { WorkspaceScaffoldService } from "@/services/WorkspaceScaffoldService";
import { pathsToTree } from "@/utils/file-tree";
import type { Env } from "../context";
import { protectedProcedure, router } from "../index";

function requireGitService(env: Env): GitService {
	if (!env.GAME_REPO) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "GAME_REPO binding not configured",
		});
	}
	return new GitService(env.GAME_REPO);
}

function toThread(row: ThreadRow) {
	return {
		id: row.id,
		userId: row.user_id,
		gameId: row.game_id,
		title: row.title,
		status: row.status,
		generationStage: row.generation_stage,
		statusMessage: row.status_message,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function toMessage(row: MessageRow) {
	return {
		id: row.id,
		threadId: row.thread_id,
		role: row.role,
		content: JSON.parse(row.content_json),
		componentName: row.component_name,
		componentProps: row.component_props_json
			? JSON.parse(row.component_props_json)
			: null,
		componentState: row.component_state_json
			? JSON.parse(row.component_state_json)
			: null,
		toolCallId: row.tool_call_id,
		toolName: row.tool_name,
		model: row.model,
		costMicros: row.cost_micros,
		inputTokens: row.input_tokens,
		outputTokens: row.output_tokens,
		error: row.error_json ? JSON.parse(row.error_json) : null,
		createdAt: row.created_at,
		seq: row.seq,
	};
}

async function getWorkspaceSnapshotResult(
	gitService: GitService,
	gameId: string,
	sinceRevision: string | undefined,
) {
	const result = await gitService.getSnapshot(gameId, sinceRevision);

	if (!result.changed || !result.files) {
		return { changed: false as const };
	}

	const snapshotFiles: WorkspaceSnapshotFile[] = result.files.map((f) => ({
		filename: f.filename,
		content: f.content,
		contentHash: f.contentHash,
		size: f.size,
		uploaded: 0,
	}));

	const snapshot: WorkspaceSnapshot = {
		gameId,
		revision: result.revision!,
		generatedAt: Date.now(),
		files: snapshotFiles,
	};

	return { changed: true as const, snapshot };
}

export const chatThreadsRouter = router({
	createThread: protectedProcedure
		.input(
			z.object({
				gameId: z.string().uuid(),
				title: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const game = await ctx.env.DB.prepare(
				"SELECT id, user_id FROM games WHERE id = ? AND deleted_at IS NULL AND brand_id = ?",
			)
				.bind(input.gameId, ctx.brandId)
				.first<{ id: string; user_id: string }>();

			if (!game)
				throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
			if (game.user_id !== ctx.user.id) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Not your game" });
			}

			const id = crypto.randomUUID();
			const now = Date.now();

			await ctx.env.DB.prepare(
				`INSERT INTO threads (id, user_id, game_id, title, status, generation_stage, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'active', 'idle', ?, ?)`,
			)
				.bind(id, ctx.user.id, input.gameId, input.title ?? null, now, now)
				.run();

			return { threadId: id, gameId: input.gameId, createdAt: now };
		}),

	listThreads: protectedProcedure
		.input(
			z.object({
				gameId: z.string().uuid().optional(),
				limit: z.number().int().min(1).max(100).default(20),
				offset: z.number().int().min(0).default(0),
			}),
		)
		.query(async ({ ctx, input }) => {
			let query = "SELECT * FROM threads WHERE user_id = ? AND status = ?";
			const values: Array<string | number> = [ctx.user.id, "active"];

			if (input.gameId) {
				query += " AND game_id = ?";
				values.push(input.gameId);
			}

			query += " ORDER BY updated_at DESC LIMIT ? OFFSET ?";
			values.push(input.limit, input.offset);

			const result = await ctx.env.DB.prepare(query)
				.bind(...values)
				.all<ThreadRow>();

			return {
				threads: result.results.map(toThread),
			};
		}),

	getThread: protectedProcedure
		.input(z.object({ threadId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const row = await ctx.env.DB.prepare(
				"SELECT * FROM threads WHERE id = ? AND user_id = ?",
			)
				.bind(input.threadId, ctx.user.id)
				.first<ThreadRow>();

			if (!row)
				throw new TRPCError({ code: "NOT_FOUND", message: "Thread not found" });

			return toThread(row);
		}),

	getMessages: protectedProcedure
		.input(
			z.object({
				threadId: z.string().uuid(),
				afterSeq: z.number().int().min(0).default(0),
				limit: z.number().int().min(1).max(500).default(100),
			}),
		)
		.query(async ({ ctx, input }) => {
			const thread = await ctx.env.DB.prepare(
				"SELECT id FROM threads WHERE id = ? AND user_id = ?",
			)
				.bind(input.threadId, ctx.user.id)
				.first();

			if (!thread)
				throw new TRPCError({ code: "NOT_FOUND", message: "Thread not found" });

			const result = await ctx.env.DB.prepare(
				"SELECT * FROM messages WHERE thread_id = ? AND seq > ? ORDER BY seq ASC LIMIT ?",
			)
				.bind(input.threadId, input.afterSeq, input.limit)
				.all<MessageRow>();

			return { messages: result.results.map(toMessage) };
		}),

	sendMessage: protectedProcedure
		.input(
			z.object({
				threadId: z.string().uuid().optional(),
				gameId: z.string().uuid(),
				text: z.string().min(1).max(10000),
				selectedDesignFrameId: z.string().nullable().optional(),
				selectedDesignElementId: z.string().nullable().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const moderationService = new ModerationService();
			const moderationResult = moderationService.check(input.text);
			if (!moderationResult.allowed) {
				const auditService = new AuditService(ctx.env.DB);
				const rejectionLog = await moderationService.createRejectionLog(
					input.text,
					moderationResult,
				);
				await auditService.logEvent({
					actorId: ctx.user.id,
					action: "moderation.reject",
					targetType: "prompt",
					metadata: rejectionLog,
				});
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: MODERATION_ERROR_MESSAGE,
				});
			}

			const game = await ctx.env.DB.prepare(
				"SELECT id, user_id FROM games WHERE id = ? AND deleted_at IS NULL AND brand_id = ?",
			)
				.bind(input.gameId, ctx.brandId)
				.first<{ id: string; user_id: string }>();

			if (!game)
				throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
			if (game.user_id !== ctx.user.id) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Not your game" });
			}

			// Billing: Pre-check minimum balance before starting chat
			// Chat uses metered billing (billed after generation), but we require minimum balance
			const walletService = new WalletService(ctx.env.DB);
			const minimumBalanceMicros = USER_COSTS.GAME_GENERATION_BASE;
			const hasFunds = await walletService.hasSufficientBalance(
				ctx.user.id,
				minimumBalanceMicros,
			);
			if (!hasFunds) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: `Insufficient balance. Need at least ${microsToSparks(minimumBalanceMicros)} Sparks to start a chat.`,
				});
			}

			let threadId = input.threadId;

			if (!threadId) {
				threadId = crypto.randomUUID();
				const now = Date.now();
				await ctx.env.DB.prepare(
					`INSERT INTO threads (id, user_id, game_id, title, status, generation_stage, created_at, updated_at)
             VALUES (?, ?, ?, NULL, 'active', 'idle', ?, ?)`,
				)
					.bind(threadId, ctx.user.id, input.gameId, now, now)
					.run();
			} else {
				const thread = await ctx.env.DB.prepare(
					"SELECT id, user_id FROM threads WHERE id = ? AND user_id = ?",
				)
					.bind(threadId, ctx.user.id)
					.first();

				if (!thread)
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Thread not found",
					});
			}

			const gitService = requireGitService(ctx.env);
			const scaffoldService = new WorkspaceScaffoldService(gitService);
			await scaffoldService.seedIfMissing({ gameId: input.gameId });

			if (!ctx.authToken) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "Authentication required",
				});
			}

			await insertUserMessage(ctx.env.DB, threadId, input.text, {
				selectedFrameId: input.selectedDesignFrameId ?? null,
				selectedElementId: input.selectedDesignElementId ?? null,
			});

			const streamUrl = `/api/chat/stream?threadId=${encodeURIComponent(threadId)}&token=${encodeURIComponent(ctx.authToken)}`;

			return {
				threadId,
				streamUrl,
				status: null,
				text: null,
				pendingAskUser: null,
				error: null,
			};
		}),

	submitToolAnswer: protectedProcedure
		.input(
			z.object({
				threadId: z.string().uuid(),
				toolCallId: z.string().trim().min(1),
				answer: z.string().trim().min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const moderationService = new ModerationService();
			const moderationResult = moderationService.check(input.answer);
			if (!moderationResult.allowed) {
				const auditService = new AuditService(ctx.env.DB);
				const rejectionLog = await moderationService.createRejectionLog(
					input.answer,
					moderationResult,
				);
				await auditService.logEvent({
					actorId: ctx.user.id,
					action: "moderation.reject",
					targetType: "prompt",
					metadata: rejectionLog,
				});
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: MODERATION_ERROR_MESSAGE,
				});
			}

			const thread = await ctx.env.DB.prepare(
				"SELECT * FROM threads WHERE id = ? AND user_id = ?",
			)
				.bind(input.threadId, ctx.user.id)
				.first<ThreadRow>();

			if (!thread)
				throw new TRPCError({ code: "NOT_FOUND", message: "Thread not found" });

			if (thread.generation_stage !== "waiting_for_input") {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "Thread must be waiting for input to submit a tool answer",
				});
			}

			if (!thread.game_id) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "Thread has no associated game",
				});
			}

			if (!ctx.authToken) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "Authentication required",
				});
			}

			await insertToolResult(
				ctx.env.DB,
				input.threadId,
				input.toolCallId,
				input.answer,
			);

			const streamUrl = `/api/chat/stream?threadId=${encodeURIComponent(input.threadId)}&token=${encodeURIComponent(ctx.authToken)}`;

			return {
				threadId: input.threadId,
				streamUrl,
				status: null,
				text: null,
				pendingAskUser: null,
				error: null,
			};
		}),

	getWorkspaceSnapshot: protectedProcedure
		.input(
			z.object({
				gameId: z.string().uuid(),
				sinceRevision: z.string().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const game = await ctx.env.DB.prepare(
				"SELECT id, user_id FROM games WHERE id = ? AND deleted_at IS NULL AND brand_id = ?",
			)
				.bind(input.gameId, ctx.brandId)
				.first<{ id: string; user_id: string }>();

			if (!game || game.user_id !== ctx.user.id) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
			}

			const gitService = requireGitService(ctx.env);
			return getWorkspaceSnapshotResult(
				gitService,
				input.gameId,
				input.sinceRevision,
			);
		}),

	listWorkspaceFiles: protectedProcedure
		.input(
			z.object({
				gameId: z.string().uuid(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const game = await ctx.env.DB.prepare(
				"SELECT id, user_id FROM games WHERE id = ? AND deleted_at IS NULL AND brand_id = ?",
			)
				.bind(input.gameId, ctx.brandId)
				.first<{ id: string; user_id: string }>();

			if (!game || game.user_id !== ctx.user.id) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
			}

			const gitService = requireGitService(ctx.env);
			let filePaths: string[] = [];
			try {
				filePaths = await gitService.listFiles(input.gameId);
			} catch {
				// Repo may not exist yet
			}

			const filesWithSize = filePaths.map((f) => ({ filename: f, size: 0 }));
			const { tree, roots } = pathsToTree(filesWithSize);
			return { files: filePaths, tree, roots };
		}),

	readWorkspaceFile: protectedProcedure
		.input(
			z.object({
				gameId: z.string().uuid(),
				filename: z.string().min(1),
			}),
		)
		.query(async ({ ctx, input }) => {
			const game = await ctx.env.DB.prepare(
				"SELECT id, user_id FROM games WHERE id = ? AND deleted_at IS NULL AND brand_id = ?",
			)
				.bind(input.gameId, ctx.brandId)
				.first<{ id: string; user_id: string }>();

			if (!game || game.user_id !== ctx.user.id) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
			}

			const gitService = requireGitService(ctx.env);
			const data = await gitService.readFile(input.gameId, input.filename);
			if (!data) return { exists: false, content: null };
			return { exists: true, content: new TextDecoder().decode(data) };
		}),

	scaffoldWorkspace: protectedProcedure
		.input(
			z.object({
				gameId: z.string().uuid(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const game = await ctx.env.DB.prepare(
				"SELECT id, user_id, title FROM games WHERE id = ? AND deleted_at IS NULL AND brand_id = ?",
			)
				.bind(input.gameId, ctx.brandId)
				.first<{ id: string; user_id: string; title: string | null }>();

			if (!game || game.user_id !== ctx.user.id) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
			}

			const gitService = requireGitService(ctx.env);
			const scaffoldService = new WorkspaceScaffoldService(gitService);
			return scaffoldService.seedIfMissing({
				gameId: input.gameId,
				gameTitle: game.title ?? undefined,
			});
		}),

	writeWorkspaceFile: protectedProcedure
		.input(
			z.object({
				gameId: z.string().uuid(),
				filename: z.string().min(1),
				content: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const game = await ctx.env.DB.prepare(
				"SELECT id, user_id FROM games WHERE id = ? AND deleted_at IS NULL AND brand_id = ?",
			)
				.bind(input.gameId, ctx.brandId)
				.first<{ id: string; user_id: string }>();

			if (!game || game.user_id !== ctx.user.id) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
			}

			const gitService = requireGitService(ctx.env);
			await gitService.writeFiles(input.gameId, [
				{ path: input.filename, content: input.content },
			]);
			return { success: true };
		}),

	debugConversation: protectedProcedure
		.input(
			z.object({
				threadId: z.string().uuid(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const thread = await ctx.env.DB.prepare(
				"SELECT id, game_id FROM threads WHERE id = ? AND user_id = ?",
			)
				.bind(input.threadId, ctx.user.id)
				.first<{ id: string; game_id: string }>();

			if (!thread)
				throw new TRPCError({ code: "NOT_FOUND", message: "Thread not found" });

			const messages = await ctx.env.DB.prepare(
				"SELECT * FROM messages WHERE thread_id = ? ORDER BY seq ASC",
			)
				.bind(input.threadId)
				.all<MessageRow>();

			return {
				threadId: input.threadId,
				gameId: thread.game_id,
				messages: messages.results.map(toMessage),
			};
		}),
});
