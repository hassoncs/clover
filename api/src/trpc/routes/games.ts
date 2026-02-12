import { validateEconomyGraph } from "@slopcade/economy-engine";
import type { GameDefinition } from "@slopcade/shared/types/GameDefinition";
import type { GameValidationReport } from "@slopcade/shared/validation";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
	classifyPrompt,
	generateGame,
	getAIConfigFromEnv,
	getClassificationConfidence,
	getValidationSummary,
	refineGame,
	validateGameDefinition,
} from "@/ai";
import { ArtifactManager } from "@/ai/agent/artifact-manager";
import { ForkService } from "@/services/ForkService";
import { GitService } from "@/services/git/GitService";
import { WorkspaceCopyService } from "@/services/WorkspaceCopyService";
import { WorkspaceScaffoldService } from "@/services/WorkspaceScaffoldService";
import {
	getValidationReportJson,
	validateGame,
} from "@/validation/gameValidator";
import { protectedProcedure, publicProcedure, router } from "../index";

type R2Bucket = import("@cloudflare/workers-types").R2Bucket;
type DurableObjectNamespace =
	import("@cloudflare/workers-types").DurableObjectNamespace;

interface GameRow {
	id: string;
	user_id: string | null;
	title: string;
	description: string | null;
	thumbnail_url: string | null;
	r2_prefix: string;
	is_public: number;
	play_count: number;
	created_at: number;
	updated_at: number;
	deleted_at: number | null;
	base_game_id: string | null;
	forked_from_id: string | null;
	validation_report: string | null;
	validation_score: number | null;
	validation_critical_count: number;
	validation_warning_count: number;
	validation_valid: number;
	validation_updated_at: number | null;
	validator_version: string | null;
}

function parseValidationReport(
	json: string | null,
): GameValidationReport | null {
	if (!json) return null;
	try {
		return JSON.parse(json) as GameValidationReport;
	} catch {
		return null;
	}
}

function validationFromRow(row: GameRow) {
	const validationReport = parseValidationReport(row.validation_report);
	if (!validationReport) return null;
	return {
		valid: row.validation_valid === 1,
		score: row.validation_score ?? 0,
		criticalCount: row.validation_critical_count,
		warningCount: row.validation_warning_count,
		topIssues: validationReport.summary.topIssues,
		isStale: validationReport.validatorVersion !== "1.0.0",
	};
}

function toClientGameIndex(row: GameRow) {
	return {
		id: row.id,
		userId: row.user_id,
		title: row.title,
		description: row.description,
		thumbnailUrl: row.thumbnail_url,
		isPublic: Boolean(row.is_public),
		playCount: row.play_count,
		createdAt: new Date(row.created_at),
		updatedAt: new Date(row.updated_at),
		baseGameId: row.base_game_id,
		forkedFromId: row.forked_from_id,
		source: "database" as const,
		validation: validationFromRow(row),
	};
}

function toClientGameFull(row: GameRow, definition: string) {
	return {
		...toClientGameIndex(row),
		definition,
	};
}

async function readDefinitionFromR2(
	assets: R2Bucket,
	r2Prefix: string,
): Promise<string> {
	const key = `${r2Prefix}/definition.json`;
	const obj = await assets.get(key);
	if (!obj) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: `Definition not found in R2: ${key}`,
		});
	}
	return await obj.text();
}

async function writeDefinitionToR2(
	assets: R2Bucket,
	r2Prefix: string,
	definition: string,
): Promise<void> {
	await assets.put(`${r2Prefix}/definition.json`, definition, {
		httpMetadata: { contentType: "application/json" },
	});
}

async function writeMetadataToR2(
	assets: R2Bucket,
	r2Prefix: string,
	meta: {
		id: string;
		title: string;
		description: string | null;
		thumbnailUrl: string | null;
		updatedAt: number;
	},
): Promise<void> {
	const metadata = {
		id: meta.id,
		title: meta.title,
		description: meta.description,
		version: "1.0.0",
		thumbnailUrl: meta.thumbnailUrl,
		packs: [],
		activeRemixId: null,
		updatedAt: meta.updatedAt,
	};
	await assets.put(`${r2Prefix}/metadata.json`, JSON.stringify(metadata), {
		httpMetadata: { contentType: "application/json" },
	});
}

async function initGitRepoWithWorkspace(
	gameId: string,
	assets: R2Bucket,
	gameRepoNamespace: DurableObjectNamespace | undefined,
): Promise<void> {
	if (!gameRepoNamespace) {
		console.warn(
			`[Game ${gameId}] GAME_REPO binding unavailable, skipping Git init`,
		);
		return;
	}

	try {
		const gitService = new GitService(gameRepoNamespace);
		await gitService.initRepo(gameId);

		const workspacePrefix = `games/${gameId}/workspace/`;
		const workspaceFiles = await assets.list({ prefix: workspacePrefix });

		const files = await Promise.all(
			workspaceFiles.objects.map(async (obj) => {
				const content = await assets.get(obj.key);
				if (!content) {
					throw new Error(`Failed to read ${obj.key} from R2`);
				}
				const text = await content.text();
				const path = obj.key.replace(workspacePrefix, "");
				return { path, content: text };
			}),
		);

		if (files.length > 0) {
			await gitService.commitFiles(gameId, files, "Initialize game", {
				name: "System",
				email: "system@slopcade.app",
			});
		}
	} catch (error) {
		console.error(
			`[Game ${gameId}] Failed to initialize Git repo:`,
			error instanceof Error ? error.message : String(error),
		);
	}
}

export const gamesRouter = router({
	list: protectedProcedure.query(async ({ ctx }) => {
		const result = await ctx.env.DB.prepare(
			`SELECT * FROM games WHERE user_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC`,
		)
			.bind(ctx.user.id)
			.all<GameRow>();

		return result.results.map((row) => toClientGameIndex(row));
	}),

	getPublic: publicProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const result = await ctx.env.DB.prepare(
				`SELECT * FROM games WHERE id = ? AND deleted_at IS NULL`,
			)
				.bind(input.id)
				.first<GameRow>();

			if (!result) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
			}

			if (!result.is_public) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "This game is private. Sign in to access your games.",
				});
			}

			const definition = await readDefinitionFromR2(
				ctx.env.ASSETS,
				result.r2_prefix,
			);
			return toClientGameFull(result, definition);
		}),

	get: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const result = await ctx.env.DB.prepare(
				`SELECT * FROM games WHERE id = ? AND deleted_at IS NULL`,
			)
				.bind(input.id)
				.first<GameRow>();

			if (!result) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
			}

			const isOwner = result.user_id === ctx.user.id;

			if (!result.is_public && !isOwner) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
			}

			const definition = await readDefinitionFromR2(
				ctx.env.ASSETS,
				result.r2_prefix,
			);
			return toClientGameFull(result, definition);
		}),

	getVersionHistory: protectedProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				limit: z.number().int().min(1).max(100).default(50),
			}),
		)
		.query(async ({ ctx, input }) => {
			const game = await ctx.env.DB.prepare(
				`SELECT id, user_id FROM games WHERE id = ? AND deleted_at IS NULL`,
			)
				.bind(input.id)
				.first<{ id: string; user_id: string | null }>();

			if (!game) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
			}

			if (game.user_id !== ctx.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Cannot view versions for game you do not own",
				});
			}

			const artifactManager = new ArtifactManager(ctx.env.ASSETS);
			const versions = await artifactManager.listVersions(
				input.id,
				input.limit,
			);

			return {
				gameId: input.id,
				versions: versions.map((version) => ({
					versionId: version.versionId,
					key: version.key,
					url: artifactManager.getAssetUrl(ctx.env.APP_URL, version.key),
					uploadedAt: version.uploadedAt,
					size: version.size,
				})),
			};
		}),

	create: protectedProcedure
		.input(
			z.object({
				title: z.string().min(1).max(100),
				description: z.string().max(500).optional(),
				definition: z.string(),
				isPublic: z.boolean().default(false),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			let gameDefinition: GameDefinition;
			try {
				gameDefinition = JSON.parse(input.definition) as GameDefinition;
			} catch {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Invalid game definition JSON",
				});
			}

			const validationReport = validateGame(gameDefinition);
			const now = Date.now();
			const id = crypto.randomUUID();
			const r2Prefix = `games/${id}`;

			await writeDefinitionToR2(ctx.env.ASSETS, r2Prefix, input.definition);
			await writeMetadataToR2(ctx.env.ASSETS, r2Prefix, {
				id,
				title: input.title,
				description: input.description ?? null,
				thumbnailUrl: null,
				updatedAt: now,
			});

			const scaffoldService = new WorkspaceScaffoldService(ctx.env.ASSETS);
			await scaffoldService.seedIfMissing({
				gameId: id,
				gameTitle: input.title,
			});

			await initGitRepoWithWorkspace(id, ctx.env.ASSETS, ctx.env.GAME_REPO);

			await ctx.env.DB.prepare(
				`INSERT INTO games (
          id, user_id, title, description, r2_prefix, is_public, play_count,
          created_at, updated_at, base_game_id,
          validation_report, validation_score, validation_critical_count,
          validation_warning_count, validation_valid, validation_updated_at, validator_version
        ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
				.bind(
					id,
					ctx.user.id,
					input.title,
					input.description ?? null,
					r2Prefix,
					input.isPublic ? 1 : 0,
					now,
					now,
					id,
					getValidationReportJson(validationReport),
					validationReport.summary.score,
					validationReport.summary.criticalCount,
					validationReport.summary.warningCount,
					validationReport.valid ? 1 : 0,
					now,
					validationReport.validatorVersion,
				)
				.run();

			return {
				id,
				userId: ctx.user.id,
				title: input.title,
				description: input.description ?? null,
				definition: input.definition,
				thumbnailUrl: null,
				isPublic: input.isPublic,
				playCount: 0,
				createdAt: new Date(now),
				updatedAt: new Date(now),
				baseGameId: id,
				forkedFromId: null,
				validation: {
					valid: validationReport.valid,
					score: validationReport.summary.score,
					criticalCount: validationReport.summary.criticalCount,
					warningCount: validationReport.summary.warningCount,
					topIssues: validationReport.summary.topIssues,
				},
			};
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				title: z.string().min(1).max(100).optional(),
				description: z.string().max(500).optional(),
				definition: z.string().optional(),
				isPublic: z.boolean().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const existing = await ctx.env.DB.prepare(
				`SELECT * FROM games WHERE id = ? AND deleted_at IS NULL`,
			)
				.bind(input.id)
				.first<GameRow>();

			if (!existing) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
			}

			if (existing.user_id !== ctx.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Cannot edit games you do not own",
				});
			}

			const updates: string[] = [];
			const values: (string | number | null)[] = [];

			if (input.title !== undefined) {
				updates.push("title = ?");
				values.push(input.title);
			}
			if (input.description !== undefined) {
				updates.push("description = ?");
				values.push(input.description);
			}

			let validationReport: GameValidationReport | null = null;

			if (input.definition !== undefined) {
				let gameDefinition: GameDefinition;
				try {
					gameDefinition = JSON.parse(input.definition) as GameDefinition;
					validationReport = validateGame(gameDefinition);
				} catch {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Invalid game definition JSON",
					});
				}

				await writeDefinitionToR2(
					ctx.env.ASSETS,
					existing.r2_prefix,
					input.definition,
				);

				updates.push("validation_report = ?");
				updates.push("validation_score = ?");
				updates.push("validation_critical_count = ?");
				updates.push("validation_warning_count = ?");
				updates.push("validation_valid = ?");
				updates.push("validation_updated_at = ?");
				updates.push("validator_version = ?");

				const now = Date.now();
				values.push(getValidationReportJson(validationReport));
				values.push(validationReport.summary.score);
				values.push(validationReport.summary.criticalCount);
				values.push(validationReport.summary.warningCount);
				values.push(validationReport.valid ? 1 : 0);
				values.push(now);
				values.push(validationReport.validatorVersion);
			}

			if (input.isPublic !== undefined) {
				updates.push("is_public = ?");
				values.push(input.isPublic ? 1 : 0);
			}

			if (updates.length === 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "No fields to update",
				});
			}

			const now = Date.now();
			updates.push("updated_at = ?");
			values.push(now);
			values.push(input.id);

			await ctx.env.DB.prepare(
				`UPDATE games SET ${updates.join(", ")} WHERE id = ?`,
			)
				.bind(...values)
				.run();

			return {
				id: input.id,
				updatedAt: new Date(now),
				validation: validationReport
					? {
							valid: validationReport.valid,
							score: validationReport.summary.score,
							criticalCount: validationReport.summary.criticalCount,
							warningCount: validationReport.summary.warningCount,
							topIssues: validationReport.summary.topIssues,
						}
					: null,
			};
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const existing = await ctx.env.DB.prepare(
				`SELECT * FROM games WHERE id = ? AND deleted_at IS NULL`,
			)
				.bind(input.id)
				.first<GameRow>();

			if (!existing) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
			}

			if (existing.user_id !== ctx.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Cannot delete games you do not own",
				});
			}

			await ctx.env.DB.prepare(`UPDATE games SET deleted_at = ? WHERE id = ?`)
				.bind(Date.now(), input.id)
				.run();

			return { success: true };
		}),

	incrementPlayCount: publicProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.env.DB.prepare(
				`UPDATE games SET play_count = play_count + 1 WHERE id = ? AND deleted_at IS NULL`,
			)
				.bind(input.id)
				.run();

			return { success: true };
		}),

	listPublic: publicProcedure
		.input(
			z
				.object({
					limit: z.number().min(1).max(50).default(20),
					offset: z.number().min(0).default(0),
					includeCritical: z.boolean().default(false),
				})
				.optional(),
		)
		.query(async ({ ctx, input }) => {
			const limit = input?.limit ?? 20;
			const offset = input?.offset ?? 0;
			const includeCritical = input?.includeCritical ?? false;

			let query = `SELECT * FROM games WHERE is_public = 1 AND deleted_at IS NULL`;

			if (!includeCritical) {
				query += ` AND (validation_valid = 1 OR validation_valid IS NULL)`;
			}

			query += ` ORDER BY play_count DESC, created_at DESC LIMIT ? OFFSET ?`;

			const result = await ctx.env.DB.prepare(query)
				.bind(limit, offset)
				.all<GameRow>();

			return result.results.map((row) => toClientGameIndex(row));
		}),

	validate: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const existing = await ctx.env.DB.prepare(
				`SELECT * FROM games WHERE id = ? AND deleted_at IS NULL`,
			)
				.bind(input.id)
				.first<GameRow>();

			if (!existing) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
			}

			if (existing.user_id !== ctx.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Cannot validate games you do not own",
				});
			}

			const definitionStr = await readDefinitionFromR2(
				ctx.env.ASSETS,
				existing.r2_prefix,
			);
			let gameDefinition: GameDefinition;
			try {
				gameDefinition = JSON.parse(definitionStr) as GameDefinition;
			} catch {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Invalid game definition JSON",
				});
			}

			const validationReport = validateGame(gameDefinition);
			const now = Date.now();

			await ctx.env.DB.prepare(
				`UPDATE games SET 
          validation_report = ?,
          validation_score = ?,
          validation_critical_count = ?,
          validation_warning_count = ?,
          validation_valid = ?,
          validation_updated_at = ?,
          validator_version = ?
        WHERE id = ?`,
			)
				.bind(
					getValidationReportJson(validationReport),
					validationReport.summary.score,
					validationReport.summary.criticalCount,
					validationReport.summary.warningCount,
					validationReport.valid ? 1 : 0,
					now,
					validationReport.validatorVersion,
					input.id,
				)
				.run();

			return {
				valid: validationReport.valid,
				score: validationReport.summary.score,
				criticalCount: validationReport.summary.criticalCount,
				warningCount: validationReport.summary.warningCount,
				topIssues: validationReport.summary.topIssues,
			};
		}),

	generate: protectedProcedure
		.input(
			z.object({
				prompt: z.string().min(5).max(500),
				saveToLibrary: z.boolean().default(false),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const aiConfig = getAIConfigFromEnv(ctx.env);
			if (!aiConfig) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message:
						"AI generation not configured. Set OPENAI_API_KEY, OPENROUTER_API_KEY, or ANTHROPIC_API_KEY.",
				});
			}

			const result = await generateGame(input.prompt, aiConfig, {
				maxRetries: 2,
				temperature: 0.7,
			});

			if (!result.success || !result.game) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: result.error?.message ?? "Failed to generate game",
					cause: result.error,
				});
			}

			let savedGame = null;

			if (input.saveToLibrary) {
				const id = crypto.randomUUID();
				const now = Date.now();
				const definition = JSON.stringify(result.game);
				const r2Prefix = `games/${id}`;
				const validationReport = validateGame(result.game);

				await writeDefinitionToR2(ctx.env.ASSETS, r2Prefix, definition);
				await writeMetadataToR2(ctx.env.ASSETS, r2Prefix, {
					id,
					title: result.game.metadata.title,
					description: result.game.metadata.description ?? input.prompt,
					thumbnailUrl: null,
					updatedAt: now,
				});

				const scaffoldService = new WorkspaceScaffoldService(ctx.env.ASSETS);
				await scaffoldService.seedIfMissing({
					gameId: id,
					gameTitle: result.game.metadata.title,
				});

				await initGitRepoWithWorkspace(id, ctx.env.ASSETS, ctx.env.GAME_REPO);

				await ctx.env.DB.prepare(
					`INSERT INTO games (
            id, user_id, title, description, r2_prefix, is_public, play_count,
            created_at, updated_at, base_game_id,
            validation_report, validation_score, validation_critical_count,
            validation_warning_count, validation_valid, validation_updated_at, validator_version
          ) VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				)
					.bind(
						id,
						ctx.user.id,
						result.game.metadata.title,
						result.game.metadata.description ?? input.prompt,
						r2Prefix,
						now,
						now,
						id,
						getValidationReportJson(validationReport),
						validationReport.summary.score,
						validationReport.summary.criticalCount,
						validationReport.summary.warningCount,
						validationReport.valid ? 1 : 0,
						now,
						validationReport.validatorVersion,
					)
					.run();

				savedGame = {
					id,
					userId: ctx.user.id,
					title: result.game.metadata.title,
					description: result.game.metadata.description ?? input.prompt,
					createdAt: new Date(now),
					updatedAt: new Date(now),
				};
			}

			let economyValidation = null;
			if (result.game.economy) {
				const economyResult = validateEconomyGraph(
					result.game.economy as Parameters<typeof validateEconomyGraph>[0],
				);
				economyValidation = {
					valid: economyResult.valid,
					errors: economyResult.errors,
				};
			}

			return {
				game: result.game,
				intent: result.intent,
				validation: result.validationResult
					? {
							valid: result.validationResult.valid,
							errorCount: result.validationResult.errors.length,
							warningCount: result.validationResult.warnings.length,
							summary: getValidationSummary(result.validationResult),
						}
					: null,
				economyValidation,
				savedGame,
				retryCount: result.retryCount,
			};
		}),

	refine: protectedProcedure
		.input(
			z.object({
				gameDefinition: z.string(),
				request: z.string().min(3).max(300),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const aiConfig = getAIConfigFromEnv(ctx.env);
			if (!aiConfig) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message:
						"AI generation not configured. Set OPENAI_API_KEY, OPENROUTER_API_KEY, or ANTHROPIC_API_KEY.",
				});
			}

			let currentGame: unknown;
			try {
				currentGame = JSON.parse(input.gameDefinition);
			} catch {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Invalid game definition JSON",
				});
			}

			const result = await refineGame(
				currentGame as Parameters<typeof refineGame>[0],
				input.request,
				aiConfig,
			);

			if (!result.success || !result.game) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: result.error?.message ?? "Failed to refine game",
					cause: result.error,
				});
			}

			let economyValidation = null;
			if (result.game.economy) {
				const economyResult = validateEconomyGraph(
					result.game.economy as Parameters<typeof validateEconomyGraph>[0],
				);
				economyValidation = {
					valid: economyResult.valid,
					errors: economyResult.errors,
				};
			}

			return {
				game: result.game,
				validation: result.validationResult
					? {
							valid: result.validationResult.valid,
							errorCount: result.validationResult.errors.length,
							warningCount: result.validationResult.warnings.length,
							summary: getValidationSummary(result.validationResult),
						}
					: null,
				economyValidation,
			};
		}),

	analyze: publicProcedure
		.input(z.object({ prompt: z.string().min(5).max(500) }))
		.query(({ input }) => {
			const intent = classifyPrompt(input.prompt);
			const confidence = getClassificationConfidence(input.prompt);

			return {
				intent,
				confidence,
			};
		}),

	validateDefinition: publicProcedure
		.input(z.object({ gameDefinition: z.string() }))
		.query(({ input }) => {
			let game: unknown;
			try {
				game = JSON.parse(input.gameDefinition);
			} catch {
				return {
					valid: false,
					errors: [{ code: "INVALID_JSON", message: "Invalid JSON" }],
					warnings: [],
					summary: "Invalid JSON - could not parse game definition",
					economyValidation: null,
				};
			}

			const result = validateGameDefinition(
				game as Parameters<typeof validateGameDefinition>[0],
			);

			let economyValidation = null;
			const gameDef = game as {
				economy?: {
					id: string;
					resourceTypes: string[];
					nodes: unknown[];
					edges: unknown[];
				};
			};
			if (gameDef.economy) {
				const economyResult = validateEconomyGraph(
					gameDef.economy as Parameters<typeof validateEconomyGraph>[0],
				);
				economyValidation = {
					valid: economyResult.valid,
					errors: economyResult.errors,
				};
			}

			return {
				valid: result.valid,
				errors: result.errors,
				warnings: result.warnings,
				summary: getValidationSummary(result),
				economyValidation,
			};
		}),

	fork: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const existing = await ctx.env.DB.prepare(
				`SELECT * FROM games WHERE id = ? AND deleted_at IS NULL`,
			)
				.bind(input.id)
				.first<GameRow>();

			if (!existing) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
			}

			const isOwner = existing.user_id === ctx.user.id;

			if (!existing.is_public && !isOwner) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Cannot fork private game",
				});
			}

			const sourceDefinitionStr = await readDefinitionFromR2(
				ctx.env.ASSETS,
				existing.r2_prefix,
			);
			let definition: Record<string, unknown>;
			try {
				definition = JSON.parse(sourceDefinitionStr);
			} catch {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Invalid game definition",
				});
			}

			const newId = crypto.randomUUID();
			const now = Date.now();
			const newR2Prefix = `games/${newId}`;

			if (definition.metadata && typeof definition.metadata === "object") {
				const metadata = definition.metadata as Record<string, unknown>;
				metadata.id = newId;
				metadata.title = `${existing.title} (Fork)`;
				metadata.createdAt = now;
				metadata.updatedAt = now;
				if (existing.user_id) {
					metadata.forkedFrom = {
						gameId: existing.id,
						title: existing.title,
					};
				}
			}

			const newDefinition = JSON.stringify(definition);
			const validationReport = validateGame(
				definition as unknown as GameDefinition,
			);

			await writeDefinitionToR2(ctx.env.ASSETS, newR2Prefix, newDefinition);
			await writeMetadataToR2(ctx.env.ASSETS, newR2Prefix, {
				id: newId,
				title: `${existing.title} (Fork)`,
				description: existing.description,
				thumbnailUrl: existing.thumbnail_url,
				updatedAt: now,
			});

			const workspaceCopier = new WorkspaceCopyService(ctx.env.ASSETS);
			await workspaceCopier.copyWorkspace({
				sourcePrefix: existing.r2_prefix,
				destPrefix: newR2Prefix,
				metadataOverrides: {
					id: newId,
					title: `${existing.title} (Fork)`,
				},
			});

			const parentBaseGameId = existing.base_game_id ?? existing.id;

			const forkService = new ForkService(
				ctx.env.ASSETS,
				ctx.env.DB,
				ctx.env.GAME_REPO,
			);

			await forkService.forkGame({
				sourceGameId: existing.id,
				newGameId: newId,
				userId: ctx.user.id,
				title: `${existing.title} (Fork)`,
				description: existing.description,
				r2Prefix: newR2Prefix,
				baseGameId: parentBaseGameId,
				validationReport: getValidationReportJson(validationReport),
				validationScore: validationReport.summary.score,
				validationCriticalCount: validationReport.summary.criticalCount,
				validationWarningCount: validationReport.summary.warningCount,
				validationValid: validationReport.valid ? 1 : 0,
				validatorVersion: validationReport.validatorVersion,
			});

			return {
				id: newId,
				userId: ctx.user.id,
				title: `${existing.title} (Fork)`,
				description: existing.description,
				definition: newDefinition,
				thumbnailUrl: existing.thumbnail_url,
				isPublic: false,
				playCount: 0,
				createdAt: new Date(now),
				updatedAt: new Date(now),
				baseGameId: parentBaseGameId,
				forkedFromId: existing.id,
			};
		}),

	syncTemplates: protectedProcedure
		.input(
			z.object({
				templates: z.array(
					z.object({
						id: z.string(),
						title: z.string(),
						description: z.string().optional(),
						definition: z.string(),
						isPublic: z.boolean().default(true),
					}),
				),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";
			const now = Date.now();

			const results: Array<{
				id: string;
				title: string;
				action: "created" | "updated" | "error";
				error?: string;
			}> = [];

			for (const template of input.templates) {
				try {
					let gameDefinition: GameDefinition;
					try {
						gameDefinition = JSON.parse(template.definition) as GameDefinition;
					} catch {
						results.push({
							id: template.id,
							title: template.title,
							action: "error",
							error: "Invalid game definition JSON",
						});
						continue;
					}

					const validationReport = validateGame(gameDefinition);
					const r2Prefix = `games/${template.id}`;

					await writeDefinitionToR2(
						ctx.env.ASSETS,
						r2Prefix,
						template.definition,
					);
					await writeMetadataToR2(ctx.env.ASSETS, r2Prefix, {
						id: template.id,
						title: template.title,
						description: template.description ?? null,
						thumbnailUrl: null,
						updatedAt: now,
					});

					const existing = await ctx.env.DB.prepare(
						`SELECT id, user_id FROM games WHERE id = ? AND deleted_at IS NULL`,
					)
						.bind(template.id)
						.first<{ id: string; user_id: string }>();

					if (existing) {
						await ctx.env.DB.prepare(
							`UPDATE games SET
                title = ?,
                description = ?,
                r2_prefix = ?,
                is_public = ?,
                updated_at = ?,
                validation_report = ?,
                validation_score = ?,
                validation_critical_count = ?,
                validation_warning_count = ?,
                validation_valid = ?,
                validation_updated_at = ?,
                validator_version = ?
              WHERE id = ?`,
						)
							.bind(
								template.title,
								template.description ?? null,
								r2Prefix,
								template.isPublic ? 1 : 0,
								now,
								getValidationReportJson(validationReport),
								validationReport.summary.score,
								validationReport.summary.criticalCount,
								validationReport.summary.warningCount,
								validationReport.valid ? 1 : 0,
								now,
								validationReport.validatorVersion,
								template.id,
							)
							.run();

						results.push({
							id: template.id,
							title: template.title,
							action: "updated",
						});
					} else {
						await ctx.env.DB.prepare(
							`INSERT INTO games (
                id, user_id, title, description, r2_prefix, is_public, play_count,
                created_at, updated_at, base_game_id,
                validation_report, validation_score, validation_critical_count,
                validation_warning_count, validation_valid, validation_updated_at, validator_version
              ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
						)
							.bind(
								template.id,
								SYSTEM_USER_ID,
								template.title,
								template.description ?? null,
								r2Prefix,
								template.isPublic ? 1 : 0,
								now,
								now,
								template.id,
								getValidationReportJson(validationReport),
								validationReport.summary.score,
								validationReport.summary.criticalCount,
								validationReport.summary.warningCount,
								validationReport.valid ? 1 : 0,
								now,
								validationReport.validatorVersion,
							)
							.run();

						results.push({
							id: template.id,
							title: template.title,
							action: "created",
						});
					}
				} catch (error) {
					results.push({
						id: template.id,
						title: template.title,
						action: "error",
						error: error instanceof Error ? error.message : "Unknown error",
					});
				}
			}

			const created = results.filter((r) => r.action === "created").length;
			const updated = results.filter((r) => r.action === "updated").length;
			const errors = results.filter((r) => r.action === "error").length;

			return {
				summary: {
					total: input.templates.length,
					created,
					updated,
					errors,
				},
				results,
			};
		}),
});
