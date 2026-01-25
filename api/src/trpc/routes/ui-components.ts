import { router, protectedProcedure } from '../index';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import type { UIComponentSheetSpec } from '../../ai/pipeline/types';

const componentTypeSchema = z.enum(['button', 'checkbox', 'radio', 'slider', 'panel', 'progress_bar', 'list_item', 'dropdown', 'toggle_switch']);
const stateSchema = z.enum(['normal', 'hover', 'pressed', 'disabled', 'focus']);

export const uiComponentsRouter = router({
  generateUIComponent: protectedProcedure
    .input(z.object({
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
      states: z.array(stateSchema).default(['normal', 'hover', 'pressed', 'disabled']),
      baseResolution: z.number().min(64).max(1024).default(256),
    }))
    .mutation(async ({ input, ctx }) => {
      const gameRow = await ctx.env.DB.prepare(
        'SELECT id, base_game_id FROM games WHERE id = ? AND deleted_at IS NULL'
      ).bind(input.gameId).first<{ id: string; base_game_id: string | null }>();

      if (!gameRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }

      const themeString = typeof input.theme === 'string' 
        ? input.theme 
        : [input.theme.era, input.theme.texture, input.theme.palette?.join(', ')].filter(Boolean).join(', ');

      const spec: UIComponentSheetSpec = {
        type: 'sheet',
        id: `ui-${input.componentType}-${Date.now()}`,
        kind: 'ui_component',
        componentType: input.componentType,
        states: input.states,
        ninePatchMargins: { left: 12, right: 12, top: 12, bottom: 12 },
        baseResolution: input.baseResolution,
        layout: { type: 'manual' },
      };

      const packId = crypto.randomUUID();
      const now = Date.now();
      const baseGameId = gameRow.base_game_id ?? gameRow.id;

      await ctx.env.DB.prepare(
        `INSERT INTO asset_packs (id, game_id, base_game_id, name, description, component_type, nine_patch_margins_json, generation_strategy, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        packId,
        input.gameId,
        baseGameId,
        `${input.componentType} UI Component`,
        `Theme: ${themeString}`,
        input.componentType,
        JSON.stringify(spec.ninePatchMargins),
        'sequential',
        now
      ).run();

      return {
        success: true,
        packId,
        spec,
        themeString,
        message: 'UI component pack created. Use processUIComponentJob to generate images.',
      };
    }),

  getUIComponentPack: protectedProcedure
    .input(z.object({ packId: z.string() }))
    .query(async ({ input, ctx }) => {
      const packRow = await ctx.env.DB.prepare(
        `SELECT id, game_id, name, description, component_type, nine_patch_margins_json, generation_strategy, created_at
         FROM asset_packs WHERE id = ? AND deleted_at IS NULL`
      ).bind(input.packId).first<{
        id: string;
        game_id: string;
        name: string;
        description: string | null;
        component_type: string | null;
        nine_patch_margins_json: string | null;
        generation_strategy: string | null;
        created_at: number;
      }>();

      if (!packRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'UI component pack not found' });
      }

      return {
        id: packRow.id,
        gameId: packRow.game_id,
        name: packRow.name,
        description: packRow.description,
        componentType: packRow.component_type,
        ninePatchMargins: packRow.nine_patch_margins_json ? JSON.parse(packRow.nine_patch_margins_json) : null,
        generationStrategy: packRow.generation_strategy,
        createdAt: packRow.created_at,
      };
    }),

  listUIComponentPacks: protectedProcedure
    .input(z.object({ gameId: z.string() }))
    .query(async ({ input, ctx }) => {
      const result = await ctx.env.DB.prepare(
        `SELECT id, game_id, name, description, component_type, nine_patch_margins_json, created_at
         FROM asset_packs 
         WHERE game_id = ? AND component_type IS NOT NULL AND deleted_at IS NULL
         ORDER BY created_at DESC`
      ).bind(input.gameId).all<{
        id: string;
        game_id: string;
        name: string;
        description: string | null;
        component_type: string | null;
        nine_patch_margins_json: string | null;
        created_at: number;
      }>();

      return result.results.map(row => ({
        id: row.id,
        gameId: row.game_id,
        name: row.name,
        description: row.description,
        componentType: row.component_type,
        ninePatchMargins: row.nine_patch_margins_json ? JSON.parse(row.nine_patch_margins_json) : null,
        createdAt: row.created_at,
      }));
    }),
});
