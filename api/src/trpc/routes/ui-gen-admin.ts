import { router, publicProcedure } from '../index';
import { z } from 'zod';
import { UI_CONTROL_CONFIG, getControlConfig, getControlStates } from '../../ai/pipeline/ui-control-config';
import type { UIComponentSheetSpec } from '../../ai/pipeline/types';
import { buildUIComponentPrompt } from '../../ai/pipeline/prompt-builder';

const componentTypeSchema = z.enum([
  'button', 'checkbox', 'radio', 'slider', 'panel', 'progress_bar',
  'scroll_bar_h', 'scroll_bar_v', 'tab_bar', 'list_item', 'dropdown', 'toggle_switch'
]);

export interface UIGenResult {
  id: string;
  timestamp: string;
  params: {
    controlType: string;
    theme: string;
    strength: number;
    state: string;
    promptModifier: string;
  };
  files: {
    silhouette: string;
    generated: string;
  };
  prompts: {
    positive: string;
    negative: string;
  };
  timing: {
    silhouetteMs: number;
    generationMs: number;
    totalMs: number;
  };
}

interface UIGenResultRow {
  id: string;
  control_type: string;
  state: string;
  theme: string;
  strength: number;
  prompt_modifier: string | null;
  prompt_positive: string;
  prompt_negative: string;
  silhouette_ms: number;
  generation_ms: number;
  total_ms: number;
  silhouette_r2_key: string;
  generated_r2_key: string;
  created_at: number;
  deleted_at: number | null;
}

function rowToResult(row: UIGenResultRow, assetHost: string): UIGenResult {
  const cleanBase = assetHost.replace(/\/$/, '');
  return {
    id: row.id,
    timestamp: new Date(row.created_at).toISOString(),
    params: {
      controlType: row.control_type,
      theme: row.theme,
      strength: row.strength,
      state: row.state,
      promptModifier: row.prompt_modifier || '',
    },
    files: {
      silhouette: `${cleanBase}/${row.silhouette_r2_key}`,
      generated: `${cleanBase}/${row.generated_r2_key}`,
    },
    prompts: {
      positive: row.prompt_positive,
      negative: row.prompt_negative,
    },
    timing: {
      silhouetteMs: row.silhouette_ms,
      generationMs: row.generation_ms,
      totalMs: row.total_ms,
    },
  };
}

export const uiGenAdminRouter = router({
  getControlTypes: publicProcedure.query(() => {
    return Object.entries(UI_CONTROL_CONFIG).map(([id, config]) => ({
      id,
      label: id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      dimensions: config.dimensions,
      description: config.description,
    }));
  }),

  getStates: publicProcedure
    .input(z.object({ controlType: componentTypeSchema }))
    .query(({ input }) => {
      return getControlStates(input.controlType);
    }),

  generate: publicProcedure
    .input(z.object({
      controlType: componentTypeSchema,
      theme: z.string().min(1),
      strength: z.number().min(0).max(1),
      state: z.string(),
      promptModifier: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const config = getControlConfig(input.controlType);
      const id = crypto.randomUUID();
      const startTime = Date.now();

      const { prompt: basePrompt, negativePrompt } = buildUIComponentPrompt({
        componentType: input.controlType,
        state: input.state as UIComponentSheetSpec['states'][number],
        theme: input.theme,
        baseResolution: config.dimensions.width,
      });
      const positivePrompt = input.promptModifier 
        ? `${basePrompt} ${input.promptModifier}`
        : basePrompt;

      let silhouetteBuffer: Uint8Array | null = null;
      let generatedBuffer: Uint8Array | null = null;
      let silhouetteMs = 0;
      let generationMs = 0;

      const apiKey = ctx.env.SCENARIO_API_KEY;
      const apiSecret = ctx.env.SCENARIO_SECRET_API_KEY;
      const assetHost = ctx.env.ASSET_HOST || '';

      if (!apiKey || !apiSecret) {
        return {
          success: false,
          result: null,
          message: 'Scenario API credentials not configured. Set SCENARIO_API_KEY and SCENARIO_SECRET_API_KEY.',
        };
      }

      try {
        const { createWorkersScenarioAdapter } = await import('../../ai/pipeline/adapters/workers');
        const { ScenarioClient } = await import('../../ai/scenario');
        const { createSilhouettePng } = await import('../../ai/assets');

        const scenarioClient = new ScenarioClient({ apiKey, apiSecret });
        const scenario = createWorkersScenarioAdapter(scenarioClient);

        const { width, height } = config.dimensions;

        const silhouetteStart = Date.now();
        const silhouettePng = createSilhouettePng('box', width, height, width);
        silhouetteBuffer = silhouettePng;
        silhouetteMs = Date.now() - silhouetteStart;

        const generationStart = Date.now();

        const silhouetteAssetId = await scenario.uploadImage(silhouettePng);
        console.log(`  [UI-GEN] Uploaded silhouette: ${silhouetteAssetId}`);

        const img2imgResult = await scenario.img2img({
          imageAssetId: silhouetteAssetId,
          prompt: positivePrompt,
          strength: input.strength,
        });
        console.log(`  [UI-GEN] img2img complete: ${img2imgResult.assetId}`);

        const bgRemoveResult = await scenario.removeBackground(img2imgResult.assetId);
        console.log(`  [UI-GEN] Background removed: ${bgRemoveResult.assetId}`);

        const { buffer: finalBuffer } = await scenario.downloadImage(bgRemoveResult.assetId);
        generatedBuffer = new Uint8Array(finalBuffer);
        generationMs = Date.now() - generationStart;

        console.log(`  [UI-GEN] Complete: ${id} (silhouette: ${silhouetteMs}ms, generation: ${generationMs}ms)`);
      } catch (error) {
        console.error('[UI-GEN] Generation failed:', error);
        return {
          success: false,
          result: null,
          message: error instanceof Error ? error.message : String(error),
        };
      }

      const totalMs = Date.now() - startTime;

      const silhouetteR2Key = `ui-gen-admin/${id}/silhouette.png`;
      const generatedR2Key = `ui-gen-admin/${id}/generated.png`;

      try {
        await ctx.env.ASSETS.put(silhouetteR2Key, silhouetteBuffer!, {
          httpMetadata: { contentType: 'image/png' },
        });
        await ctx.env.ASSETS.put(generatedR2Key, generatedBuffer!, {
          httpMetadata: { contentType: 'image/png' },
        });
        console.log(`  [UI-GEN] Uploaded to R2: ${silhouetteR2Key}, ${generatedR2Key}`);
      } catch (error) {
        console.error('[UI-GEN] R2 upload failed:', error);
        return {
          success: false,
          result: null,
          message: `R2 upload failed: ${error instanceof Error ? error.message : String(error)}`,
        };
      }

      try {
        await ctx.env.DB.prepare(`
          INSERT INTO ui_gen_results (
            id, control_type, state, theme, strength, prompt_modifier,
            prompt_positive, prompt_negative,
            silhouette_ms, generation_ms, total_ms,
            silhouette_r2_key, generated_r2_key,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id,
          input.controlType,
          input.state,
          input.theme,
          input.strength,
          input.promptModifier || null,
          positivePrompt,
          negativePrompt,
          silhouetteMs,
          generationMs,
          totalMs,
          silhouetteR2Key,
          generatedR2Key,
          Date.now()
        ).run();
        console.log(`  [UI-GEN] Inserted into D1: ${id}`);
      } catch (error) {
        console.error('[UI-GEN] D1 insert failed:', error);
        return {
          success: false,
          result: null,
          message: `D1 insert failed: ${error instanceof Error ? error.message : String(error)}`,
        };
      }

      const result: UIGenResult = {
        id,
        timestamp: new Date().toISOString(),
        params: {
          controlType: input.controlType,
          theme: input.theme,
          strength: input.strength,
          state: input.state,
          promptModifier: input.promptModifier || '',
        },
        files: {
          silhouette: `${assetHost.replace(/\/$/, '')}/${silhouetteR2Key}`,
          generated: `${assetHost.replace(/\/$/, '')}/${generatedR2Key}`,
        },
        prompts: {
          positive: positivePrompt,
          negative: negativePrompt,
        },
        timing: {
          silhouetteMs,
          generationMs,
          totalMs,
        },
      };

      return {
        success: true,
        result,
        message: 'Generation complete',
      };
    }),

  listResults: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const assetHost = ctx.env.ASSET_HOST || '';

      const result = await ctx.env.DB.prepare(`
        SELECT * FROM ui_gen_results
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `).bind(limit, offset).all<UIGenResultRow>();

      return (result.results || []).map(row => rowToResult(row, assetHost));
    }),

  deleteResult: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.env.DB.prepare(`
        SELECT silhouette_r2_key, generated_r2_key FROM ui_gen_results
        WHERE id = ? AND deleted_at IS NULL
      `).bind(input.id).first<Pick<UIGenResultRow, 'silhouette_r2_key' | 'generated_r2_key'>>();

      if (!row) {
        return { success: false, message: 'Result not found or already deleted' };
      }

      await ctx.env.DB.prepare(`
        UPDATE ui_gen_results SET deleted_at = ? WHERE id = ?
      `).bind(Date.now(), input.id).run();

      try {
        await ctx.env.ASSETS.delete(row.silhouette_r2_key);
        await ctx.env.ASSETS.delete(row.generated_r2_key);
      } catch (error) {
        console.warn(`[UI-GEN] Failed to delete R2 objects for ${input.id}:`, error);
      }

      return { success: true, message: 'Deleted' };
    }),
});
