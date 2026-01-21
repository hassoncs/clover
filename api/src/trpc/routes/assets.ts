import {
  router,
  publicProcedure,
  installedProcedure,
} from '../index';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  AssetService,
  getScenarioConfigFromEnv,
  type EntityType,
  type SpriteStyle,
} from '../../ai/assets';

interface AssetRow {
  id: string;
  user_id: string | null;
  install_id: string | null;
  entity_type: string;
  description: string;
  style: string;
  r2_key: string;
  scenario_job_id: string | null;
  scenario_asset_id: string | null;
  width: number | null;
  height: number | null;
  is_animated: number;
  frame_count: number | null;
  created_at: number;
}

const entityTypeSchema = z.enum([
  'character',
  'enemy',
  'item',
  'platform',
  'background',
  'ui',
]);

const spriteStyleSchema = z.enum(['pixel', 'cartoon', '3d', 'flat']);

export const assetsRouter = router({
  generate: installedProcedure
    .input(
      z.object({
        entityType: entityTypeSchema,
        description: z.string().min(3).max(200),
        style: spriteStyleSchema.default('pixel'),
        size: z
          .object({
            width: z.number().min(32).max(1024),
            height: z.number().min(32).max(1024),
          })
          .optional(),
        animated: z.boolean().default(false),
        frameCount: z.number().min(2).max(12).optional(),
        seed: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const scenarioConfig = getScenarioConfigFromEnv(ctx.env);

      if (!scenarioConfig.configured) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message:
            'Scenario.com not configured. Set SCENARIO_API_KEY and SCENARIO_SECRET_API_KEY.',
        });
      }

      const assetService = new AssetService(ctx.env);
      const result = await assetService.generateAsset({
        entityType: input.entityType as EntityType,
        description: input.description,
        style: input.style as SpriteStyle,
        size: input.size,
        animated: input.animated,
        frameCount: input.frameCount,
        seed: input.seed,
      });

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error ?? 'Asset generation failed',
        });
      }

      const id = crypto.randomUUID();
      const now = Date.now();
      const userId =
        (ctx as unknown as { user?: { id: string } }).user?.id ?? null;

      await ctx.env.DB.prepare(
        `INSERT INTO assets (id, user_id, install_id, entity_type, description, style, r2_key, scenario_asset_id, width, height, is_animated, frame_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          id,
          userId,
          ctx.installId,
          input.entityType,
          input.description,
          input.style,
          result.r2Key ?? '',
          result.scenarioAssetId ?? null,
          input.size?.width ?? 256,
          input.size?.height ?? 256,
          input.animated ? 1 : 0,
          input.frameCount ?? null,
          now
        )
        .run();

      return {
        id,
        assetUrl: result.assetUrl,
        r2Key: result.r2Key,
        entityType: input.entityType,
        createdAt: new Date(now),
      };
    }),

  generateBatch: installedProcedure
    .input(
      z.object({
        assets: z
          .array(
            z.object({
              entityType: entityTypeSchema,
              description: z.string().min(3).max(200),
              style: spriteStyleSchema.default('pixel'),
              size: z
                .object({
                  width: z.number().min(32).max(1024),
                  height: z.number().min(32).max(1024),
                })
                .optional(),
              animated: z.boolean().default(false),
              frameCount: z.number().min(2).max(12).optional(),
              seed: z.string().optional(),
            })
          )
          .min(1)
          .max(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const scenarioConfig = getScenarioConfigFromEnv(ctx.env);

      if (!scenarioConfig.configured) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message:
            'Scenario.com not configured. Set SCENARIO_API_KEY and SCENARIO_SECRET_API_KEY.',
        });
      }

      const assetService = new AssetService(ctx.env);
      const results = await assetService.generateBatch(
        input.assets.map((a) => ({
          entityType: a.entityType as EntityType,
          description: a.description,
          style: a.style as SpriteStyle,
          size: a.size,
          animated: a.animated,
          frameCount: a.frameCount,
          seed: a.seed,
        }))
      );

      return results.map((result, i) => ({
        success: result.success,
        assetUrl: result.assetUrl,
        r2Key: result.r2Key,
        error: result.error,
        entityType: input.assets[i].entityType,
      }));
    }),

  list: installedProcedure
    .input(
      z
        .object({
          entityType: entityTypeSchema.optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const userId =
        (ctx as unknown as { user?: { id: string } }).user?.id ?? null;

      let query = `SELECT * FROM assets WHERE (user_id = ? OR install_id = ?)`;
      const params: (string | number | null)[] = [userId, ctx.installId];

      if (input?.entityType) {
        query += ` AND entity_type = ?`;
        params.push(input.entityType);
      }

      query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const result = await ctx.env.DB.prepare(query)
        .bind(...params)
        .all<AssetRow>();

      return result.results.map((row) => ({
        id: row.id,
        entityType: row.entity_type,
        description: row.description,
        style: row.style,
        assetUrl: `https://assets.clover.app/${row.r2_key}`,
        r2Key: row.r2_key,
        width: row.width,
        height: row.height,
        isAnimated: Boolean(row.is_animated),
        frameCount: row.frame_count,
        createdAt: new Date(row.created_at),
      }));
    }),

  get: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.env.DB.prepare(
        `SELECT * FROM assets WHERE id = ?`
      )
        .bind(input.id)
        .first<AssetRow>();

      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Asset not found' });
      }

      return {
        id: result.id,
        entityType: result.entity_type,
        description: result.description,
        style: result.style,
        assetUrl: `https://assets.clover.app/${result.r2_key}`,
        r2Key: result.r2_key,
        width: result.width,
        height: result.height,
        isAnimated: Boolean(result.is_animated),
        frameCount: result.frame_count,
        createdAt: new Date(result.created_at),
      };
    }),

  status: publicProcedure.query(({ ctx }) => {
    const config = getScenarioConfigFromEnv(ctx.env);
    return {
      configured: config.configured,
      timestamp: Date.now(),
    };
  }),
});
