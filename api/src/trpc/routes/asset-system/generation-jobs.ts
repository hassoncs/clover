import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
	AssetService,
	buildStructuredPrompt,
	type EntityType,
} from "@/ai/assets";
import type { ThemePlan } from "@/ai/pipeline/theme-plan";
import { generateThemePlan } from "@/ai/pipeline/theme-planner";
import { microsToSparks, RATE_LIMITS, USER_COSTS } from "@/economy/pricing";
import {
	InsufficientBalanceError,
	WalletService,
} from "@/economy/wallet-service";
import { protectedProcedure, router } from "../../index";
import type { GenerationJobRow, GenerationTaskRow } from "./types";
import { promptDefaultsSchema } from "./types";
import {
	buildPlannerInput,
	getTargetDimensions,
	jobLog,
	toClientJob,
	toClientTask,
} from "./utils";

export const generationJobsRouter = router({
	getJob: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const jobRow = await ctx.env.DB.prepare(
				"SELECT * FROM generation_jobs WHERE id = ?",
			)
				.bind(input.id)
				.first<GenerationJobRow>();

			if (!jobRow) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Generation job not found",
				});
			}

			const game = await ctx.env.DB.prepare(
				"SELECT user_id FROM games WHERE id = ? AND deleted_at IS NULL",
			)
				.bind(jobRow.game_id)
				.first<{ user_id: string }>();

			if (!game || game.user_id !== ctx.user.id) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
			}

			const tasksResult = await ctx.env.DB.prepare(
				"SELECT * FROM generation_tasks WHERE job_id = ? ORDER BY created_at",
			)
				.bind(input.id)
				.all<GenerationTaskRow>();

			return {
				...toClientJob(jobRow),
				tasks: tasksResult.results.map(toClientTask),
			};
		}),

	createGenerationJob: protectedProcedure
		.input(
			z.object({
				gameId: z.string(),
				prefabIds: z.array(z.string()).min(1),
				promptDefaults: promptDefaultsSchema,
				prefabOverrides: z
					.record(
						z.string(),
						z.object({
							entityPrompt: z.string().optional(),
							styleOverride: z.string().optional(),
						}),
					)
					.optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const walletService = new WalletService(ctx.env.DB);

			const gameRow = await ctx.env.DB.prepare(
				"SELECT definition, user_id FROM games WHERE id = ? AND deleted_at IS NULL",
			)
				.bind(input.gameId)
				.first<{ definition: string; user_id: string }>();

			if (!gameRow) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
			}

			if (gameRow.user_id !== ctx.user.id) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
			}

			const allowed = await walletService.checkRateLimit(
				ctx.user.id,
				"generation",
				RATE_LIMITS.GENERATIONS_PER_HOUR,
				60 * 60 * 1000,
			);
			if (!allowed) {
				throw new TRPCError({
					code: "TOO_MANY_REQUESTS",
					message: `Rate limit exceeded. Max ${RATE_LIMITS.GENERATIONS_PER_HOUR} generations per hour.`,
				});
			}

			const estimatedCostMicros =
				input.prefabIds.length * USER_COSTS.ASSET_ENTITY;
			const jobId = crypto.randomUUID();

			try {
				await walletService.debit({
					userId: ctx.user.id,
					type: "generation_debit",
					amountMicros: -estimatedCostMicros,
					referenceType: "generation_job",
					referenceId: jobId,
					idempotencyKey: `gen_debit_${jobId}`,
					description: `Asset generation for ${input.prefabIds.length} prefabs`,
				});
			} catch (err) {
				if (err instanceof InsufficientBalanceError) {
					throw new TRPCError({
						code: "PRECONDITION_FAILED",
						message: `Insufficient balance. Need ${microsToSparks(estimatedCostMicros)} Sparks.`,
					});
				}
				throw err;
			}

			let definition: {
				prefabs?: Record<
					string,
					{
						physics?: {
							shape: string;
							width?: number;
							height?: number;
							radius?: number;
						};
						tags?: string[];
					}
				>;
			};
			try {
				definition = JSON.parse(gameRow.definition);
			} catch {
				await walletService.credit({
					userId: ctx.user.id,
					type: "generation_refund",
					amountMicros: estimatedCostMicros,
					referenceType: "generation_job",
					referenceId: jobId,
					idempotencyKey: `gen_refund_${jobId}`,
					description: `Refund: invalid game definition`,
				});
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Invalid game definition",
				});
			}

			const now = Date.now();

			try {
				await ctx.env.DB.prepare(
					`INSERT INTO generation_jobs (id, game_id, theme_id, status, style, created_at)
           VALUES (?, ?, ?, 'queued', ?, ?)`,
				)
					.bind(
						jobId,
						input.gameId,
						input.promptDefaults.themeId ?? null,
						input.promptDefaults.styleOverride ?? null,
						now,
					)
					.run();

				let themePlan: ThemePlan | null = null;
				const plannerEnabled = ctx.env.THEME_PLANNER_ENABLED !== "false";
				if (!plannerEnabled) {
					console.log(
						"[AssetSystem] Theme planner: disabled via THEME_PLANNER_ENABLED=false",
					);
				}
				if (
					plannerEnabled &&
					ctx.env.OPENROUTER_API_KEY &&
					input.promptDefaults.themePrompt
				) {
					console.log(
						"[AssetSystem] Theme planner: generating plan for createGenerationJob",
					);
					const plannerInput = buildPlannerInput(
						definition,
						input.prefabIds,
						input.promptDefaults.themePrompt,
						input.promptDefaults.styleOverride,
					);
					themePlan = await generateThemePlan(
						plannerInput,
						ctx.env.OPENROUTER_API_KEY,
					);

					if (themePlan) {
						console.log(
							"[AssetSystem] Theme planner: plan generated successfully",
						);
						await ctx.env.DB.prepare(
							`UPDATE generation_jobs SET theme_plan_json = ? WHERE id = ?`,
						)
							.bind(JSON.stringify(themePlan), jobId)
							.run();
					} else {
						console.log(
							"[AssetSystem] Theme planner: plan generation failed, falling back to buildStructuredPrompt",
						);
					}
				}

				for (const prefabId of input.prefabIds) {
					const prefab = definition.prefabs?.[prefabId];
					const physics = prefab?.physics;
					const tags = prefab?.tags ?? [];

					let entityType: EntityType = "item";
					if (tags.includes("player") || tags.includes("character"))
						entityType = "character";
					else if (tags.includes("enemy")) entityType = "enemy";
					else if (
						tags.includes("platform") ||
						tags.includes("wall") ||
						tags.includes("ground")
					)
						entityType = "platform";
					else if (tags.includes("background")) entityType = "background";
					else if (tags.includes("ui")) entityType = "ui";

					const physicsContext = physics
						? {
								shape: physics.shape,
								width: physics.width,
								height: physics.height,
								radius: physics.radius,
							}
						: { shape: "box" as const, width: 1, height: 1 };

					const dimensions = getTargetDimensions(
						physicsContext.shape,
						physicsContext.width,
						physicsContext.height,
					);

					let compiledPrompt: string;
					if (themePlan && themePlan.prefabPlans[prefabId]) {
						compiledPrompt = themePlan.prefabPlans[prefabId].prompt;
					} else {
						compiledPrompt = buildStructuredPrompt({
							prefabId,
							physicsShape: physicsContext.shape as
								| "box"
								| "circle"
								| "polygon",
							physicsWidth: physicsContext.width,
							physicsHeight: physicsContext.height,
							physicsRadius: physicsContext.radius,
							entityType,
							themePrompt: input.promptDefaults.themePrompt,
							style: input.promptDefaults.styleOverride,
							targetWidth: dimensions.width,
							targetHeight: dimensions.height,
						});
					}

					const taskId = crypto.randomUUID();

					await ctx.env.DB.prepare(
						`INSERT INTO generation_tasks (id, job_id, template_id, status, compiled_prompt, model_id, target_width, target_height, created_at)
             VALUES (?, ?, ?, 'queued', ?, ?, ?, ?, ?)`,
					)
						.bind(
							taskId,
							jobId,
							prefabId,
							compiledPrompt,
							input.promptDefaults.modelId ?? null,
							dimensions.width,
							dimensions.height,
							now,
						)
						.run();
				}

				return { jobId, taskCount: input.prefabIds.length };
			} catch (jobCreationError) {
				await walletService.credit({
					userId: ctx.user.id,
					type: "generation_refund",
					amountMicros: estimatedCostMicros,
					referenceType: "generation_job",
					referenceId: jobId,
					idempotencyKey: `gen_refund_${jobId}`,
					description: `Refund: job creation failed`,
				});
				throw jobCreationError;
			}
		}),

	processGenerationJob: protectedProcedure
		.input(z.object({ jobId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const jobRow = await ctx.env.DB.prepare(
				"SELECT * FROM generation_jobs WHERE id = ?",
			)
				.bind(input.jobId)
				.first<GenerationJobRow>();

			if (!jobRow) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
			}

			const now = Date.now();
			await ctx.env.DB.prepare(
				`UPDATE generation_jobs SET status = 'running', started_at = ? WHERE id = ?`,
			)
				.bind(now, input.jobId)
				.run();

			const tasksResult = await ctx.env.DB.prepare(
				`SELECT * FROM generation_tasks WHERE job_id = ? AND status = 'queued'`,
			)
				.bind(input.jobId)
				.all<GenerationTaskRow>();

			jobLog(
				"INFO",
				input.jobId,
				null,
				`Starting job with ${tasksResult.results.length} tasks`,
			);

			const assetService = new AssetService(ctx.env);
			let successCount = 0;
			let failCount = 0;

			const shouldRemoveBackground = true;

			for (const task of tasksResult.results) {
				jobLog(
					"DEBUG",
					input.jobId,
					task.id,
					`Processing: ${task.template_id}`,
				);
				jobLog(
					"DEBUG",
					input.jobId,
					task.id,
					`Target dimensions: ${task.target_width}x${task.target_height}`,
				);
				const taskNow = Date.now();
				await ctx.env.DB.prepare(
					`UPDATE generation_tasks SET status = 'running', started_at = ? WHERE id = ?`,
				)
					.bind(taskNow, task.id)
					.run();

				try {
					const entityType = "item" as EntityType;

					let result = await assetService.generateDirect({
						prompt: task.compiled_prompt ?? "",
						entityType,
						width: task.target_width ?? 512,
						height: task.target_height ?? 512,
					});

					if (result.success && result.r2Key && shouldRemoveBackground) {
						console.log(
							`[processGenerationJob] Removing background for ${task.template_id}`,
						);
						try {
							const originalAsset = await ctx.env.ASSETS.get(result.r2Key);
							if (originalAsset) {
								const buffer = await originalAsset.arrayBuffer();
								const bgRemovedResult = await assetService.removeBackground(
									buffer,
									entityType,
								);
								if (bgRemovedResult.success && bgRemovedResult.assetUrl) {
									result = bgRemovedResult;
								} else {
									console.warn(
										`[processGenerationJob] Background removal failed, using original: ${bgRemovedResult.error}`,
									);
								}
							}
						} catch (bgErr) {
							console.warn(
								`[processGenerationJob] Background removal error, using original:`,
								bgErr,
							);
						}
					}

					if (result.success && result.r2Key) {
						const assetId = crypto.randomUUID();
						const assetNow = Date.now();

						await ctx.env.DB.prepare(
							`INSERT INTO assets (id, owner_game_id, source, r2_key, width, height, theme_id, compiled_prompt, model_id, created_at)
               VALUES (?, ?, 'generated', ?, ?, ?, ?, ?, ?, ?)`,
						)
							.bind(
								assetId,
								jobRow.game_id,
								result.r2Key,
								task.target_width,
								task.target_height,
								jobRow.theme_id,
								task.compiled_prompt,
								task.model_id,
								assetNow,
							)
							.run();

						await ctx.env.DB.prepare(
							`UPDATE generation_tasks SET status = 'succeeded', asset_id = ?, finished_at = ? WHERE id = ?`,
						)
							.bind(assetId, Date.now(), task.id)
							.run();

						const costId = crypto.randomUUID();
						const costMicros = USER_COSTS.ASSET_ENTITY;
						await ctx.env.DB.prepare(
							`INSERT INTO operation_costs (id, user_id, operation_type, estimated_cost_micros, charged_cost_micros, reference_type, reference_id, created_at)
               VALUES (?, ?, 'scenario_txt2img', ?, ?, 'generation_task', ?, ?)`,
						)
							.bind(
								costId,
								ctx.user.id,
								costMicros,
								costMicros,
								task.id,
								assetNow,
							)
							.run();

						jobLog(
							"INFO",
							input.jobId,
							task.id,
							`Task succeeded - Asset: ${assetId}`,
						);

						successCount++;
					} else {
						throw new Error(result.error ?? "Generation failed");
					}
				} catch (err) {
					const errorMessage =
						err instanceof Error ? err.message : "Unknown error";
					await ctx.env.DB.prepare(
						`UPDATE generation_tasks SET status = 'failed', error_message = ?, finished_at = ? WHERE id = ?`,
					)
						.bind(errorMessage, Date.now(), task.id)
						.run();
					jobLog("ERROR", input.jobId, task.id, `Task failed: ${errorMessage}`);
					failCount++;
				}
			}

			const finalStatus =
				failCount === 0
					? "succeeded"
					: successCount === 0
						? "failed"
						: "succeeded";
			await ctx.env.DB.prepare(
				`UPDATE generation_jobs SET status = ?, finished_at = ? WHERE id = ?`,
			)
				.bind(finalStatus, Date.now(), input.jobId)
				.run();

			jobLog(
				"INFO",
				input.jobId,
				null,
				`Job finished: ${successCount} succeeded, ${failCount} failed`,
			);

			return { successCount, failCount, status: finalStatus };
		}),

	cancelJob: protectedProcedure
		.input(z.object({ jobId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const jobRow = await ctx.env.DB.prepare(
				"SELECT game_id FROM generation_jobs WHERE id = ?",
			)
				.bind(input.jobId)
				.first<{ game_id: string }>();

			if (!jobRow) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Generation job not found",
				});
			}

			const game = await ctx.env.DB.prepare(
				"SELECT user_id FROM games WHERE id = ? AND deleted_at IS NULL",
			)
				.bind(jobRow.game_id)
				.first<{ user_id: string }>();

			if (!game || game.user_id !== ctx.user.id) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
			}

			const now = Date.now();
			await ctx.env.DB.prepare(
				`UPDATE generation_jobs SET status = 'canceled', finished_at = ? WHERE id = ? AND status IN ('queued', 'running')`,
			)
				.bind(now, input.jobId)
				.run();

			await ctx.env.DB.prepare(
				`UPDATE generation_tasks SET status = 'canceled', finished_at = ? WHERE job_id = ? AND status IN ('queued', 'running')`,
			)
				.bind(now, input.jobId)
				.run();

			return { success: true };
		}),

	retryFailedTasks: protectedProcedure
		.input(z.object({ jobId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const jobRow = await ctx.env.DB.prepare(
				"SELECT game_id FROM generation_jobs WHERE id = ?",
			)
				.bind(input.jobId)
				.first<{ game_id: string }>();

			if (!jobRow) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Generation job not found",
				});
			}

			const game = await ctx.env.DB.prepare(
				"SELECT user_id FROM games WHERE id = ? AND deleted_at IS NULL",
			)
				.bind(jobRow.game_id)
				.first<{ user_id: string }>();

			if (!game || game.user_id !== ctx.user.id) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
			}

			await ctx.env.DB.prepare(
				`UPDATE generation_tasks SET status = 'queued', error_message = NULL, started_at = NULL, finished_at = NULL WHERE job_id = ? AND status = 'failed'`,
			)
				.bind(input.jobId)
				.run();

			await ctx.env.DB.prepare(
				`UPDATE generation_jobs SET status = 'queued', started_at = NULL, finished_at = NULL WHERE id = ?`,
			)
				.bind(input.jobId)
				.run();

			return { success: true };
		}),
});
