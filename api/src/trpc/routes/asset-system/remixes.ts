import { RemixOverridesSchema } from "@slopcade/shared/types/remix";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../../index";
import type { GameRowForAssets, RemixRow } from "./types";
import { parseAssetOverrides, resolveAssetUrl, toClientRemix } from "./utils";

export const remixesRouter = router({
	getRemix: publicProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const row = await ctx.env.DB.prepare(
				"SELECT * FROM remixes WHERE id = ? AND deleted_at IS NULL",
			)
				.bind(input.id)
				.first<RemixRow>();

			if (!row) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Remix not found" });
			}

			return toClientRemix(row, ctx.env.ASSET_HOST);
		}),

	listRemixes: publicProcedure
		.input(z.object({ gameId: z.string() }))
		.query(async ({ ctx, input }) => {
			const gameRow = await ctx.env.DB.prepare(
				"SELECT id, base_game_id FROM games WHERE id = ? AND deleted_at IS NULL",
			)
				.bind(input.gameId)
				.first<GameRowForAssets>();

			if (!gameRow) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
			}

			const baseGameId = gameRow.base_game_id ?? gameRow.id;

			const result = await ctx.env.DB.prepare(
				"SELECT * FROM remixes WHERE base_game_id = ? AND deleted_at IS NULL ORDER BY created_at DESC",
			)
				.bind(baseGameId)
				.all<RemixRow>();

			return result.results.map((row) =>
				toClientRemix(row, ctx.env.ASSET_HOST),
			);
		}),

	createRemix: protectedProcedure
		.input(
			z.object({
				gameId: z.string(),
				name: z.string().min(1).max(100),
				description: z.string().max(500).optional(),
				overrides: RemixOverridesSchema,
				themeId: z.string().optional(),
				themeName: z.string().optional(),
				style: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const gameRow = await ctx.env.DB.prepare(
				"SELECT id, base_game_id FROM games WHERE id = ? AND deleted_at IS NULL",
			)
				.bind(input.gameId)
				.first<GameRowForAssets>();

			if (!gameRow) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
			}

			const baseGameId = gameRow.base_game_id ?? gameRow.id;

			const id = crypto.randomUUID();
			const now = Date.now();

			const variableOverridesJson = input.overrides.variables
				? JSON.stringify(input.overrides.variables)
				: null;
			const assetOverridesJson = input.overrides.assets
				? JSON.stringify(input.overrides.assets)
				: null;
			const shaderParamOverridesJson = input.overrides.shaderParams
				? JSON.stringify(input.overrides.shaderParams)
				: null;
			const soundOverridesJson = input.overrides.sounds
				? JSON.stringify(input.overrides.sounds)
				: null;

			try {
				await ctx.env.DB.prepare(
					`INSERT INTO remixes (id, base_game_id, name, description, creator_user_id,
             variable_overrides_json, asset_overrides_json, shader_param_overrides_json, sound_overrides_json,
             theme_id, theme_prompt, style, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				)
					.bind(
						id,
						baseGameId,
						input.name,
						input.description ?? null,
						ctx.user.id,
						variableOverridesJson,
						assetOverridesJson,
						shaderParamOverridesJson,
						soundOverridesJson,
						input.themeId ?? null,
						input.themeName ?? null,
						input.style ?? null,
						now,
					)
					.run();
			} catch (err: unknown) {
				if (
					err instanceof Error &&
					err.message.includes("UNIQUE constraint failed")
				) {
					throw new TRPCError({
						code: "CONFLICT",
						message: `A remix named "${input.name}" already exists for this game`,
					});
				}
				throw err;
			}

			return { id, baseGameId, createdAt: now };
		}),

	updateRemix: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().min(1).max(100).optional(),
				description: z.string().max(500).optional(),
				overrides: RemixOverridesSchema.optional(),
				themeId: z.string().optional(),
				themeName: z.string().optional(),
				style: z.string().optional(),
				isComplete: z.boolean().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const remixRow = await ctx.env.DB.prepare(
				"SELECT base_game_id FROM remixes WHERE id = ? AND deleted_at IS NULL",
			)
				.bind(input.id)
				.first<{ base_game_id: string }>();

			if (!remixRow) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Remix not found" });
			}

			const game = await ctx.env.DB.prepare(
				"SELECT user_id FROM games WHERE id = ? AND deleted_at IS NULL",
			)
				.bind(remixRow.base_game_id)
				.first<{ user_id: string }>();

			if (!game || game.user_id !== ctx.user.id) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
			}

			const updates: string[] = [];
			const values: (string | number | null)[] = [];

			if (input.name !== undefined) {
				updates.push("name = ?");
				values.push(input.name);
			}
			if (input.description !== undefined) {
				updates.push("description = ?");
				values.push(input.description);
			}
			if (input.overrides !== undefined) {
				updates.push("variable_overrides_json = ?");
				values.push(
					input.overrides.variables
						? JSON.stringify(input.overrides.variables)
						: null,
				);
				updates.push("asset_overrides_json = ?");
				values.push(
					input.overrides.assets
						? JSON.stringify(input.overrides.assets)
						: null,
				);
				updates.push("shader_param_overrides_json = ?");
				values.push(
					input.overrides.shaderParams
						? JSON.stringify(input.overrides.shaderParams)
						: null,
				);
				updates.push("sound_overrides_json = ?");
				values.push(
					input.overrides.sounds
						? JSON.stringify(input.overrides.sounds)
						: null,
				);
			}
			if (input.themeId !== undefined) {
				updates.push("theme_id = ?");
				values.push(input.themeId);
			}
			if (input.themeName !== undefined) {
				updates.push("theme_prompt = ?");
				values.push(input.themeName);
			}
			if (input.style !== undefined) {
				updates.push("style = ?");
				values.push(input.style);
			}
			if (input.isComplete !== undefined) {
				updates.push("is_complete = ?");
				values.push(input.isComplete ? 1 : 0);
			}

			if (updates.length === 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "No fields to update",
				});
			}

			updates.push("updated_at = ?");
			values.push(Date.now());

			values.push(input.id);

			try {
				await ctx.env.DB.prepare(
					`UPDATE remixes SET ${updates.join(", ")} WHERE id = ?`,
				)
					.bind(...values)
					.run();
			} catch (err: unknown) {
				if (
					err instanceof Error &&
					err.message.includes("UNIQUE constraint failed")
				) {
					throw new TRPCError({
						code: "CONFLICT",
						message: `A remix with that name already exists for this game`,
					});
				}
				throw err;
			}

			return { success: true };
		}),

	deleteRemix: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const remixRow = await ctx.env.DB.prepare(
				"SELECT base_game_id FROM remixes WHERE id = ? AND deleted_at IS NULL",
			)
				.bind(input.id)
				.first<{ base_game_id: string }>();

			if (!remixRow) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Remix not found" });
			}

			const game = await ctx.env.DB.prepare(
				"SELECT user_id FROM games WHERE id = ? AND deleted_at IS NULL",
			)
				.bind(remixRow.base_game_id)
				.first<{ user_id: string }>();

			if (!game || game.user_id !== ctx.user.id) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
			}

			const now = Date.now();
			await ctx.env.DB.prepare("UPDATE remixes SET deleted_at = ? WHERE id = ?")
				.bind(now, input.id)
				.run();

			return { success: true };
		}),

	getResolvedRemix: publicProcedure
		.input(
			z.object({
				gameId: z.string(),
				remixId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const remixRow = await ctx.env.DB.prepare(
				"SELECT * FROM remixes WHERE id = ? AND deleted_at IS NULL",
			)
				.bind(input.remixId)
				.first<RemixRow>();

			if (!remixRow) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Remix not found" });
			}

			const resolvedAssets: Record<
				string,
				{
					imageUrl: string | null;
					placement: {
						scale?: number;
						offsetX?: number;
						offsetY?: number;
					} | null;
				}
			> = {};

			if (remixRow.asset_overrides_json) {
				const parsed = parseAssetOverrides(
					remixRow.asset_overrides_json,
					ctx.env.ASSET_HOST,
				);
				for (const [templateId, entry] of Object.entries(parsed)) {
					resolvedAssets[templateId] = {
						imageUrl: entry.assetUrl,
						placement: entry.placement ?? null,
					};
				}
			}

			return {
				remix: {
					id: remixRow.id,
					name: remixRow.name,
					description: remixRow.description,
					baseGameId: remixRow.base_game_id,
					createdAt: remixRow.created_at,
				},
				overrides: {
					variables: remixRow.variable_overrides_json
						? JSON.parse(remixRow.variable_overrides_json)
						: undefined,
					assets: remixRow.asset_overrides_json
						? JSON.parse(remixRow.asset_overrides_json)
						: undefined,
					shaderParams: remixRow.shader_param_overrides_json
						? JSON.parse(remixRow.shader_param_overrides_json)
						: undefined,
					sounds: remixRow.sound_overrides_json
						? JSON.parse(remixRow.sound_overrides_json)
						: undefined,
				},
				entriesByPrefabId: resolvedAssets,
			};
		}),
});
