import type {
	WorkspaceSnapshot,
	WorkspaceSnapshotFile,
} from "@slopcade/shared";
import { hashStringFNV1a64 } from "@slopcade/shared";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ArtifactService } from "@/agent/artifact-service";
import { resolveChatModel } from "@/ai/chat-model-config";
import { createModel } from "@/ai/model-factory";
import {
	type ChatHandlerContext,
	insertToolResult,
	insertUserMessage,
	type MessageRow,
	type ThreadRow,
} from "@/chat/chat-handler";
import { WalletService } from "@/economy/wallet-service";
import { GitService } from "@/services/git/GitService";
import { WorkspaceScaffoldService } from "@/services/WorkspaceScaffoldService";
import type { Env, User } from "../context";
import { protectedProcedure, router } from "../index";

function computeWorkspaceRevision(
	files: Array<{
		filename: string;
		content: string;
		size: number;
		uploaded: number;
	}>,
): string {
	const lines = files
		.map((f) => {
			const contentHash = hashStringFNV1a64(f.content);
			return `${f.filename}|${f.size}|${f.uploaded}|${contentHash}`;
		})
		.sort();
	return hashStringFNV1a64(lines.join("\n"));
}

function buildChatContext(
	env: Env,
	user: User,
	gameId: string,
): ChatHandlerContext {
	const apiKey = env.OPENROUTER_API_KEY;
	if (!apiKey) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "AI provider not configured",
		});
	}

	const chatModel = resolveChatModel(env.AI_CHAT_MODEL ?? env.AI_MODEL);
	const model = createModel({ apiKey, model: chatModel.id });
	const artifactService = new ArtifactService(env.ASSETS, env.DB);
	const walletService = new WalletService(env.DB);

	return {
		db: env.DB,
		model,
		modelName: chatModel.id,
		userId: user.id,
		gameId,
		artifactService,
		walletService,
	};
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

async function getWorkspaceSnapshotFromGit(
	gitService: GitService,
	gameId: string,
	sinceRevision: string | undefined,
) {
	const commits = await gitService.log(gameId, 1);
	const revision = commits.length > 0 ? commits[0].oid : "";

	if (!revision || (sinceRevision && sinceRevision === revision)) {
		return { changed: false as const };
	}

	const filenames = await gitService.listFiles(gameId);
	const snapshotFiles: WorkspaceSnapshotFile[] = await Promise.all(
		filenames.map(async (filename) => {
			const bytes = await gitService.readFile(gameId, filename);
			const content = bytes ? new TextDecoder().decode(bytes) : "";
			return {
				filename,
				content,
				contentHash: hashStringFNV1a64(content),
				size: new TextEncoder().encode(content).byteLength,
				uploaded: 0,
			};
		}),
	);

	const snapshot: WorkspaceSnapshot = {
		gameId,
		revision,
		generatedAt: Date.now(),
		files: snapshotFiles,
	};

	return { changed: true as const, snapshot };
}

async function getWorkspaceSnapshotFromArtifacts(
	env: Env,
	gameId: string,
	sinceRevision: string | undefined,
) {
	const artifactService = new ArtifactService(env.ASSETS, env.DB);
	const fileMetas = await artifactService.listWorkspaceFileMeta(gameId);
	const filenames = fileMetas.map((f) => f.filename);
	const contentMap = await artifactService.readWorkspaceFiles(
		gameId,
		filenames,
	);

	const filesForRevision = fileMetas.map((f) => ({
		filename: f.filename,
		content: contentMap.get(f.filename) ?? "",
		size: f.size,
		uploaded: f.uploaded,
	}));

	const revision = computeWorkspaceRevision(filesForRevision);

	if (sinceRevision === revision) {
		return { changed: false as const };
	}

	const snapshotFiles: WorkspaceSnapshotFile[] = filesForRevision.map((f) => ({
		filename: f.filename,
		content: f.content,
		contentHash: hashStringFNV1a64(f.content),
		size: f.size,
		uploaded: f.uploaded,
	}));

	const snapshot: WorkspaceSnapshot = {
		gameId,
		revision,
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
				"SELECT id, user_id FROM games WHERE id = ? AND deleted_at IS NULL",
			)
				.bind(input.gameId)
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
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const game = await ctx.env.DB.prepare(
				"SELECT id, user_id FROM games WHERE id = ? AND deleted_at IS NULL",
			)
				.bind(input.gameId)
				.first<{ id: string; user_id: string }>();

			if (!game)
				throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
			if (game.user_id !== ctx.user.id) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Not your game" });
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

			const scaffoldService = new WorkspaceScaffoldService(ctx.env.ASSETS);
			await scaffoldService.seedIfMissing({ gameId: input.gameId });

			if (!ctx.authToken) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "Authentication required",
				});
			}

			await insertUserMessage(ctx.env.DB, threadId, input.text);

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
				"SELECT id, user_id FROM games WHERE id = ? AND deleted_at IS NULL",
			)
				.bind(input.gameId)
				.first<{ id: string; user_id: string }>();

			if (!game || game.user_id !== ctx.user.id) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
			}

			const gitService = ctx.env.GAME_REPO
				? new GitService(ctx.env.GAME_REPO)
				: null;

			if (gitService) {
				return getWorkspaceSnapshotFromGit(
					gitService,
					input.gameId,
					input.sinceRevision,
				);
			}

			return getWorkspaceSnapshotFromArtifacts(
				ctx.env,
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
				"SELECT id, user_id FROM games WHERE id = ? AND deleted_at IS NULL",
			)
				.bind(input.gameId)
				.first<{ id: string; user_id: string }>();

			if (!game || game.user_id !== ctx.user.id) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
			}

			const prefix = `games/${input.gameId}/workspace/`;
			const listed = await ctx.env.ASSETS.list({ prefix });

			return listed.objects.map((obj) => ({
				filename: obj.key.slice(prefix.length),
				size: obj.size,
				uploaded: obj.uploaded.toISOString(),
			}));
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
				"SELECT id, user_id FROM games WHERE id = ? AND deleted_at IS NULL",
			)
				.bind(input.gameId)
				.first<{ id: string; user_id: string }>();

			if (!game || game.user_id !== ctx.user.id) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
			}

			const key = `games/${input.gameId}/workspace/${input.filename}`;
			const obj = await ctx.env.ASSETS.get(key);
			if (!obj) return { exists: false, content: null };
			return { exists: true, content: await obj.text() };
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
				"SELECT id, user_id FROM games WHERE id = ? AND deleted_at IS NULL",
			)
				.bind(input.gameId)
				.first<{ id: string; user_id: string }>();

			if (!game || game.user_id !== ctx.user.id) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
			}

			const key = `games/${input.gameId}/workspace/${input.filename}`;
			await ctx.env.ASSETS.put(key, input.content, {
				httpMetadata: { contentType: "text/plain" },
			});
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
