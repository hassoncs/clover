import {
  router,
  publicProcedure,
  protectedProcedure,
} from '../index';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  AssetService,
  type EntityType,
  type SpriteStyle,
} from '../../ai/assets';
import { GameDefinitionSchema, type GameDefinitionGenerated, type AssetPackSchema } from '../../ai/schemas';

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
  prompt: string | null;
  parent_asset_id: string | null;
  game_id: string | null;
  slot_id: string | null;
  shape: string | null;
  theme_id: string | null;
  deleted_at: number | null;
}

interface ThemeRow {
  id: string;
  name: string;
  prompt_modifier: string | null;
  creator_user_id: string | null;
  created_at: number;
  updated_at: number | null;
}

interface GameAssetSelectionRow {
  game_id: string;
  slot_id: string;
  asset_id: string;
  selected_at: number;
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
  generate: protectedProcedure
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

      await ctx.env.DB.prepare(
        `INSERT INTO assets (id, user_id, entity_type, description, style, r2_key, scenario_asset_id, width, height, is_animated, frame_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          id,
          ctx.user.id,
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

  generateBatch: protectedProcedure
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

  list: protectedProcedure
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
      
      const baseUrl = ctx.env.ASSET_HOST ?? 'https://assets.clover.app';
      const cleanBase = baseUrl.replace(/\/$/, '');

      let query = `SELECT * FROM assets WHERE user_id = ?`;
      const params: (string | number | null)[] = [ctx.user.id];

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
        assetUrl: `${cleanBase}/${row.r2_key}`,
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
      const baseUrl = ctx.env.ASSET_HOST ?? 'https://assets.clover.app';
      const cleanBase = baseUrl.replace(/\/$/, '');

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
        assetUrl: `${cleanBase}/${result.r2_key}`,
        r2Key: result.r2_key,
        width: result.width,
        height: result.height,
        isAnimated: Boolean(result.is_animated),
        frameCount: result.frame_count,
        createdAt: new Date(result.created_at),
      };
    }),

  status: publicProcedure.query(() => {
    return {
      configured: true,
      timestamp: Date.now(),
    };
  }),

  generateForGame: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        prompt: z.string().min(3).max(500),
        style: spriteStyleSchema.default('pixel'),
        themeId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const gameRow = await ctx.env.DB.prepare(
        'SELECT * FROM games WHERE id = ?'
      )
        .bind(input.gameId)
        .first<{ definition: string }>();

      if (!gameRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }

      let definition: GameDefinitionGenerated;
      try {
        definition = JSON.parse(gameRow.definition);
      } catch {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Invalid game definition',
        });
      }

      let themeModifier = '';
      if (input.themeId) {
        const theme = await ctx.env.DB.prepare(
          `SELECT prompt_modifier FROM themes WHERE id = ?`
        )
          .bind(input.themeId)
          .first<{ prompt_modifier: string | null }>();
        if (theme?.prompt_modifier) {
          themeModifier = theme.prompt_modifier;
        }
      }

      const templates = definition.templates || {};
      const templateIds = Object.keys(templates);
      const assetRequests = templateIds.map((tId) => {
        const template = templates[tId];
        let entityType: EntityType = 'item';
        const tags = template.tags || [];

        if (tags.includes('player') || tags.includes('character'))
          entityType = 'character';
        else if (tags.includes('enemy')) entityType = 'enemy';
        else if (
          tags.includes('platform') ||
          tags.includes('wall') ||
          tags.includes('ground')
        )
          entityType = 'platform';
        else if (tags.includes('background')) entityType = 'background';
        else if (tags.includes('ui')) entityType = 'ui';
        else if (tags.includes('projectile') || tags.includes('bullet'))
          entityType = 'item';

        const basePrompt = `${tId} designed as part of ${input.prompt}`;
        const description = themeModifier
          ? `${basePrompt}. ${themeModifier}`
          : basePrompt;

        return {
          entityType,
          description,
          style: input.style as SpriteStyle,
          size: { width: 512, height: 512 },
          slotId: tId,
        };
      });

      if (assetRequests.length === 0) {
        return { success: false, message: 'No templates found', generatedAssets: [] };
      }

      const assetService = new AssetService(ctx.env);
      const results = await assetService.generateBatch(assetRequests);

      const baseUrl = ctx.env.ASSET_HOST ?? 'https://assets.clover.app';
      const cleanBase = baseUrl.replace(/\/$/, '');
      const now = Date.now();

      const generatedAssets: Array<{
        id: string;
        slotId: string;
        url: string;
        prompt: string;
      }> = [];

      for (let idx = 0; idx < results.length; idx++) {
        const res = results[idx];
        const req = assetRequests[idx];
        const slotId = templateIds[idx];

        if (res.success && res.r2Key) {
          const assetId = crypto.randomUUID();
          const basePrompt = `${slotId} designed as part of ${input.prompt}`;

          await ctx.env.DB.prepare(
            `INSERT INTO assets (id, user_id, entity_type, description, style, r2_key, width, height, created_at,
             prompt, game_id, slot_id, theme_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
            .bind(
              assetId,
              ctx.user.id,
              req.entityType,
              basePrompt,
              input.style,
              res.r2Key,
              512,
              512,
              now,
              basePrompt,
              input.gameId,
              slotId,
              input.themeId ?? null
            )
            .run();

          await ctx.env.DB.prepare(
            `INSERT INTO game_asset_selections (game_id, slot_id, asset_id, selected_at)
             VALUES (?, ?, ?, ?)
             ON CONFLICT (game_id, slot_id) DO UPDATE SET asset_id = ?, selected_at = ?`
          )
            .bind(input.gameId, slotId, assetId, now, assetId, now)
            .run();

          generatedAssets.push({
            id: assetId,
            slotId,
            url: `${cleanBase}/${res.r2Key}`,
            prompt: basePrompt,
          });
        }
      }

      return {
        success: true,
        generatedAssets,
        totalGenerated: generatedAssets.length,
        totalTemplates: templateIds.length,
      };
    }),

  generateBackgroundLayer: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        layerId: z.string(),
        depth: z.enum(['sky', 'far', 'mid', 'near']),
        style: spriteStyleSchema.default('pixel'),
        promptHints: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const gameRow = await ctx.env.DB.prepare(
        'SELECT * FROM games WHERE id = ?'
      )
        .bind(input.gameId)
        .first<{ definition: string }>();

      if (!gameRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }

      let definition: GameDefinitionGenerated;
      try {
        definition = JSON.parse(gameRow.definition);
      } catch {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Invalid game definition',
        });
      }

      const depthDescriptions: Record<string, string> = {
        sky: 'sky with clouds, atmospheric, game background layer',
        far: 'distant mountains or buildings, silhouette style, game background layer',
        mid: 'trees or buildings at medium distance, game background layer',
        near: 'foreground elements, close to camera, game background layer',
      };

      const baseDescription = input.promptHints || definition.metadata.title;
      const layerDescription = `${baseDescription}, ${depthDescriptions[input.depth]}`;

      const assetService = new AssetService(ctx.env);
      const result = await assetService.generateAsset({
        entityType: 'background',
        description: layerDescription,
        style: input.style as SpriteStyle,
        size: { width: 1024, height: 512 },
      });

      if (!result.success || !result.assetUrl) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Background layer generation failed',
        });
      }

      const parallaxFactors: Record<string, number> = {
        sky: 0.1,
        far: 0.3,
        mid: 0.5,
        near: 0.8,
      };

      if (!definition.parallaxConfig) {
        definition.parallaxConfig = { enabled: true, layers: [] };
      }

      const existingLayerIndex = definition.parallaxConfig.layers.findIndex(
        (l) => l.id === input.layerId
      );

      const layer = {
        id: input.layerId,
        name: `${input.depth} layer`,
        imageUrl: result.assetUrl,
        depth: input.depth,
        parallaxFactor: parallaxFactors[input.depth],
        visible: true,
      };

      if (existingLayerIndex >= 0) {
        definition.parallaxConfig.layers[existingLayerIndex] = layer;
      } else {
        definition.parallaxConfig.layers.push(layer);
        definition.parallaxConfig.layers.sort((a, b) => {
          const order = ['sky', 'far', 'mid', 'near'];
          return order.indexOf(a.depth) - order.indexOf(b.depth);
        });
      }

      await ctx.env.DB.prepare(
        'UPDATE games SET definition = ?, updated_at = ? WHERE id = ?'
      )
        .bind(JSON.stringify(definition), Date.now(), input.gameId)
        .run();

      return {
        success: true,
        layer,
      };
    }),

  updateParallaxConfig: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        enabled: z.boolean().optional(),
        layers: z.array(z.object({
          id: z.string(),
          name: z.string(),
          imageUrl: z.string().optional(),
          depth: z.enum(['sky', 'far', 'mid', 'near']),
          parallaxFactor: z.number().min(0).max(1),
          scale: z.number().optional(),
          offsetX: z.number().optional(),
          offsetY: z.number().optional(),
          visible: z.boolean().optional(),
        })).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const gameRow = await ctx.env.DB.prepare(
        'SELECT * FROM games WHERE id = ?'
      )
        .bind(input.gameId)
        .first<{ definition: string }>();

      if (!gameRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }

      let definition: GameDefinitionGenerated;
      try {
        definition = JSON.parse(gameRow.definition);
      } catch {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Invalid game definition',
        });
      }

      if (!definition.parallaxConfig) {
        definition.parallaxConfig = { enabled: false, layers: [] };
      }

      if (input.enabled !== undefined) {
        definition.parallaxConfig.enabled = input.enabled;
      }

      if (input.layers !== undefined) {
        definition.parallaxConfig.layers = input.layers;
      }

      await ctx.env.DB.prepare(
        'UPDATE games SET definition = ?, updated_at = ? WHERE id = ?'
      )
        .bind(JSON.stringify(definition), Date.now(), input.gameId)
        .run();

      return { success: true, parallaxConfig: definition.parallaxConfig };
    }),

  createTheme: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        promptModifier: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = crypto.randomUUID();
      const now = Date.now();

      await ctx.env.DB.prepare(
        `INSERT INTO themes (id, name, prompt_modifier, creator_user_id, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
        .bind(id, input.name, input.promptModifier ?? null, ctx.user.id, now)
        .run();

      return { id, name: input.name, promptModifier: input.promptModifier };
    }),

  listThemes: protectedProcedure.query(async ({ ctx }) => {
    const result = await ctx.env.DB.prepare(
      `SELECT * FROM themes WHERE creator_user_id = ? ORDER BY created_at DESC`
    )
      .bind(ctx.user.id)
      .all<ThemeRow>();

    return result.results.map((row) => ({
      id: row.id,
      name: row.name,
      promptModifier: row.prompt_modifier,
      createdAt: new Date(row.created_at),
    }));
  }),

  getGameSelections: publicProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const baseUrl = ctx.env.ASSET_HOST ?? 'https://assets.clover.app';
      const cleanBase = baseUrl.replace(/\/$/, '');

      const result = await ctx.env.DB.prepare(
        `SELECT s.slot_id, s.selected_at, a.*
         FROM game_asset_selections s
         JOIN assets a ON s.asset_id = a.id
         WHERE s.game_id = ? AND a.deleted_at IS NULL`
      )
        .bind(input.gameId)
        .all<GameAssetSelectionRow & AssetRow>();

      return result.results.map((row) => ({
        slotId: row.slot_id,
        selectedAt: new Date(row.selected_at),
        asset: {
          id: row.id,
          url: `${cleanBase}/${row.r2_key}`,
          width: row.width,
          height: row.height,
          prompt: row.prompt,
          shape: row.shape,
        },
      }));
    }),

  selectAssetForSlot: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        slotId: z.string().min(1).max(100),
        assetId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = Date.now();

      await ctx.env.DB.prepare(
        `INSERT INTO game_asset_selections (game_id, slot_id, asset_id, selected_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (game_id, slot_id) DO UPDATE SET asset_id = ?, selected_at = ?`
      )
        .bind(input.gameId, input.slotId, input.assetId, now, input.assetId, now)
        .run();

      return { success: true };
    }),

  generateForSlot: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        slotId: z.string().min(1).max(100),
        prompt: z.string().min(3).max(500),
        style: spriteStyleSchema.default('pixel'),
        width: z.number().min(32).max(1024).optional(),
        height: z.number().min(32).max(1024).optional(),
        shape: z.enum(['box', 'circle', 'polygon']).optional(),
        themeId: z.string().uuid().optional(),
        parentAssetId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let themeModifier = '';
      if (input.themeId) {
        const theme = await ctx.env.DB.prepare(
          `SELECT prompt_modifier FROM themes WHERE id = ?`
        )
          .bind(input.themeId)
          .first<{ prompt_modifier: string | null }>();
        if (theme?.prompt_modifier) {
          themeModifier = theme.prompt_modifier;
        }
      }

      const fullPrompt = themeModifier
        ? `${input.prompt}. ${themeModifier}`
        : input.prompt;

      const assetService = new AssetService(ctx.env);
      const result = await assetService.generateAsset({
        entityType: 'item',
        description: fullPrompt,
        style: input.style as SpriteStyle,
        size: { width: input.width ?? 256, height: input.height ?? 256 },
      });

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error ?? 'Asset generation failed',
        });
      }

      const id = crypto.randomUUID();
      const now = Date.now();

      await ctx.env.DB.prepare(
        `INSERT INTO assets (id, user_id, entity_type, description, style, r2_key, width, height, created_at,
         prompt, parent_asset_id, game_id, slot_id, shape, theme_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          id,
          ctx.user.id,
          'item',
          input.prompt,
          input.style,
          result.r2Key ?? '',
          input.width ?? 256,
          input.height ?? 256,
          now,
          input.prompt,
          input.parentAssetId ?? null,
          input.gameId,
          input.slotId,
          input.shape ?? null,
          input.themeId ?? null
        )
        .run();

      await ctx.env.DB.prepare(
        `INSERT INTO game_asset_selections (game_id, slot_id, asset_id, selected_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (game_id, slot_id) DO UPDATE SET asset_id = ?, selected_at = ?`
      )
        .bind(input.gameId, input.slotId, id, now, id, now)
        .run();

      const baseUrl = ctx.env.ASSET_HOST ?? 'https://assets.clover.app';
      const cleanBase = baseUrl.replace(/\/$/, '');

      return {
        id,
        url: `${cleanBase}/${result.r2Key}`,
        prompt: input.prompt,
        slotId: input.slotId,
      };
    }),

  getSlotHistory: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        slotId: z.string().min(1).max(100),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const baseUrl = ctx.env.ASSET_HOST ?? 'https://assets.clover.app';
      const cleanBase = baseUrl.replace(/\/$/, '');

      const result = await ctx.env.DB.prepare(
        `SELECT * FROM assets
         WHERE game_id = ? AND slot_id = ? AND deleted_at IS NULL
         ORDER BY created_at DESC
         LIMIT ?`
      )
        .bind(input.gameId, input.slotId, input.limit)
        .all<AssetRow>();

      return result.results.map((row) => ({
        id: row.id,
        url: `${cleanBase}/${row.r2_key}`,
        prompt: row.prompt,
        width: row.width,
        height: row.height,
        shape: row.shape,
        parentAssetId: row.parent_asset_id,
        createdAt: new Date(row.created_at),
      }));
    }),
});
