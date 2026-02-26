import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { AssetRun, UIComponentSheetSpec } from "@/ai/pipeline/types";
import { getControlConfig } from "@/ai/pipeline/ui-control-config";
import { protectedProcedure, router } from "../index";

export const uiComponentsRouter = router({
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
				publicUrlBase:
					ctx.env.ASSET_HOST || "http://api.slopcade.localhost:1355/assets",
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
