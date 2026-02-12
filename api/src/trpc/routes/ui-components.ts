import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { AssetRun, UIComponentSheetSpec } from "@/ai/pipeline/types";
import { getControlConfig } from "@/ai/pipeline/ui-control-config";
import { protectedProcedure, router } from "../index";

const componentTypeSchema = z.enum([
	"button",
	"checkbox",
	"radio",
	"slider",
	"panel",
	"progress_bar",
	"scroll_bar_h",
	"scroll_bar_v",
	"tab_bar",
	"list_item",
	"dropdown",
	"toggle_switch",
]);
const stateSchema = z.enum([
	"normal",
	"hover",
	"pressed",
	"disabled",
	"focus",
	"selected",
	"unselected",
]);

export const uiComponentsRouter = router({
	generateUIComponent: protectedProcedure
		.input(
			z.object({
				gameId: z.string(),
				componentType: componentTypeSchema,
				theme: z.union([
					z.string(),
					z.object({
						palette: z.array(z.string()).optional(),
						texture: z.string().optional(),
						era: z.string().optional(),
					}),
				]),
				states: z
					.array(stateSchema)
					.default(["normal", "hover", "pressed", "disabled"]),
				baseResolution: z.number().min(64).max(1024).default(256),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const gameRow = await ctx.env.DB.prepare(
				"SELECT id, base_game_id FROM games WHERE id = ? AND deleted_at IS NULL",
			)
				.bind(input.gameId)
				.first<{ id: string; base_game_id: string | null }>();

			if (!gameRow) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
			}

			const themeString =
				typeof input.theme === "string"
					? input.theme
					: [
							input.theme.era,
							input.theme.texture,
							input.theme.palette?.join(", "),
						]
							.filter(Boolean)
							.join(", ");

			const spec: UIComponentSheetSpec = {
				type: "sheet",
				id: `ui-${input.componentType}-${Date.now()}`,
				kind: "ui_component",
				componentType: input.componentType,
				states: input.states,
				ninePatchMargins: { left: 12, right: 12, top: 12, bottom: 12 },
				baseResolution: input.baseResolution,
				layout: { type: "manual" },
			};

			const remixId = crypto.randomUUID();
			const now = Date.now();
			const baseGameId = gameRow.base_game_id ?? gameRow.id;

			await ctx.env.DB.prepare(
				`INSERT INTO remixes (id, base_game_id, name, description, variable_overrides_json, is_complete, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			)
				.bind(
					remixId,
					baseGameId,
					`${input.componentType} UI Component`,
					`Theme: ${themeString}`,
					JSON.stringify({
						componentType: input.componentType,
						ninePatchMargins: spec.ninePatchMargins,
						generationStrategy: "sequential",
						gameId: input.gameId,
					}),
					0,
					now,
					now,
				)
				.run();

			return {
				success: true,
				remixId,
				spec,
				themeString,
				message:
					"UI component created. Use processUIComponentJob to generate images.",
			};
		}),

	getUIComponent: protectedProcedure
		.input(z.object({ remixId: z.string() }))
		.query(async ({ input, ctx }) => {
			const packRow = await ctx.env.DB.prepare(
				`SELECT id, base_game_id, name, description, variable_overrides_json, created_at
         FROM remixes WHERE id = ? AND deleted_at IS NULL`,
			)
				.bind(input.remixId)
				.first<{
					id: string;
					base_game_id: string;
					name: string;
					description: string | null;
					variable_overrides_json: string | null;
					created_at: number;
				}>();

			if (!packRow) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "UI component pack not found",
				});
			}

			const metadata = packRow.variable_overrides_json
				? JSON.parse(packRow.variable_overrides_json)
				: {};

			return {
				id: packRow.id,
				gameId: metadata.gameId || packRow.base_game_id,
				name: packRow.name,
				description: packRow.description,
				componentType: metadata.componentType,
				ninePatchMargins: metadata.ninePatchMargins || null,
				generationStrategy: metadata.generationStrategy,
				createdAt: packRow.created_at,
			};
		}),

	listUIComponents: protectedProcedure
		.input(z.object({ gameId: z.string() }))
		.query(async ({ input, ctx }) => {
			const result = await ctx.env.DB.prepare(
				`SELECT id, base_game_id, name, description, variable_overrides_json, created_at
         FROM remixes 
         WHERE variable_overrides_json IS NOT NULL AND deleted_at IS NULL
         ORDER BY created_at DESC`,
			)
				.bind()
				.all<{
					id: string;
					base_game_id: string;
					name: string;
					description: string | null;
					variable_overrides_json: string | null;
					created_at: number;
				}>();

			return result.results
				.map((row) => {
					const metadata = row.variable_overrides_json
						? JSON.parse(row.variable_overrides_json)
						: {};
					return {
						id: row.id,
						gameId: metadata.gameId || row.base_game_id,
						name: row.name,
						description: row.description,
						componentType: metadata.componentType,
						ninePatchMargins: metadata.ninePatchMargins || null,
						createdAt: row.created_at,
						metadata,
					};
				})
				.filter((item) => item.componentType && item.gameId === input.gameId);
		}),

	generateUITheme: protectedProcedure
		.input(
			z.object({
				gameId: z.string(),
				theme: z.union([
					z.string(),
					z.object({
						palette: z.array(z.string()).optional(),
						texture: z.string().optional(),
						era: z.string().optional(),
					}),
				]),
				controls: z.array(
					z.enum([
						"button",
						"checkbox",
						"panel",
						"progress_bar",
						"scroll_bar_h",
						"scroll_bar_v",
						"tab_bar",
					]),
				),
				outputDir: z.string().optional(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const { createNodeAdapters, createFileDebugSink } = await import(
				"@/ai/pipeline/adapters/node"
			);
			const { uiBaseStateStage, uiVariationStatesStage, uiUploadR2Stage } =
				await import("@/ai/pipeline/stages/ui-component");

			const gameRow = await ctx.env.DB.prepare(
				"SELECT id, base_game_id FROM games WHERE id = ? AND deleted_at IS NULL",
			)
				.bind(input.gameId)
				.first<{ id: string; base_game_id: string | null }>();

			if (!gameRow) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
			}

			const themeString =
				typeof input.theme === "string"
					? input.theme
					: [
							input.theme.era,
							input.theme.texture,
							input.theme.palette?.join(", "),
						]
							.filter(Boolean)
							.join(", ");

			const adapters = await createNodeAdapters({
				r2Bucket: "slopcade-assets-dev",
				wranglerCwd: process.cwd(),
				publicUrlBase: ctx.env.ASSET_HOST || "http://localhost:8787/assets",
			});

			const outputDir = input.outputDir || `/tmp/ui-theme-${Date.now()}`;
			const debugSink = createFileDebugSink(outputDir);

			const remixId = crypto.randomUUID();

			const results: Array<{
				control: string;
				success: boolean;
				publicUrls?: string[];
				r2Keys?: string[];
				error?: string;
			}> = [];

			for (const controlType of input.controls) {
				try {
					const config = getControlConfig(controlType);

					const spec: UIComponentSheetSpec = {
						type: "sheet",
						id: `${input.gameId}-${controlType}-${Date.now()}`,
						kind: "ui_component",
						componentType: controlType as UIComponentSheetSpec["componentType"],
						states: config.states as UIComponentSheetSpec["states"],
						ninePatchMargins: config.margins,
						width: config.dimensions.width,
						height: config.dimensions.height,
						layout: { type: "manual" },
					};

					const run: AssetRun<UIComponentSheetSpec> = {
						spec,
						artifacts: {},
						meta: {
							gameId: input.gameId,
							remixId,
							assetId: crypto.randomUUID(),
							gameTitle: `UI Theme - ${controlType}`,
							theme: themeString,
							style: "flat",
							r2Prefix: `generated/${input.gameId}/ui-theme`,
							startedAt: Date.now(),
							runId: crypto.randomUUID(),
						},
					};

					const afterBase = await uiBaseStateStage.run(
						run,
						adapters,
						debugSink,
					);
					const afterVariations = await uiVariationStatesStage.run(
						afterBase,
						adapters,
						debugSink,
					);
					const final = await uiUploadR2Stage.run(
						afterVariations,
						adapters,
						debugSink,
					);

					results.push({
						control: controlType,
						success: true,
						publicUrls: final.artifacts.publicUrls,
						r2Keys: final.artifacts.r2Keys,
					});
				} catch (error) {
					results.push({
						control: controlType,
						success: false,
						error: error instanceof Error ? error.message : String(error),
					});
				}
			}

			return {
				totalRequested: input.controls.length,
				successful: results.filter((r) => r.success).length,
				failed: results.filter((r) => !r.success).length,
				results,
				theme: themeString,
			};
		}),
});
