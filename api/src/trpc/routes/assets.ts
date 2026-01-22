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
      
      const baseUrl = ctx.env.ASSET_HOST ?? 'https://assets.clover.app';
      const cleanBase = baseUrl.replace(/\/$/, '');

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

  status: publicProcedure.query(({ ctx }) => {
    const config = getScenarioConfigFromEnv(ctx.env);
    return {
      configured: config.configured,
      timestamp: Date.now(),
    };
  }),

  generateForGame: installedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        prompt: z.string().min(3).max(500),
        style: spriteStyleSchema.default('pixel'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const scenarioConfig = getScenarioConfigFromEnv(ctx.env);
      if (!scenarioConfig.configured) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Scenario.com not configured',
        });
      }

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

        const description = `${tId} designed as part of ${input.prompt}`;

        return {
          entityType,
          description,
          style: input.style as SpriteStyle,
          size: { width: 512, height: 512 },
        };
      });

      if (assetRequests.length === 0) {
        return { success: false, message: 'No templates found' };
      }

      const assetService = new AssetService(ctx.env);
      const results = await assetService.generateBatch(assetRequests);

      const packId = crypto.randomUUID();
      const assetPack = {
        id: packId,
        name: input.prompt,
        assets: {} as Record<string, { imageUrl: string; scale?: number }>,
      };

      results.forEach((res, idx) => {
        if (res.success && res.assetUrl) {
          const tId = templateIds[idx];
          assetPack.assets[tId] = {
            imageUrl: res.assetUrl,
            scale: 1,
          };
        }
      });

      if (!definition.assetPacks) {
        definition.assetPacks = {};
      }
      definition.assetPacks[packId] = assetPack;
      definition.activeAssetPackId = packId;

      await ctx.env.DB.prepare(
        'UPDATE games SET definition = ?, updated_at = ? WHERE id = ?'
      )
        .bind(JSON.stringify(definition), Date.now(), input.gameId)
        .run();

      return {
        success: true,
        packId,
        assetPack,
      };
    }),

  updatePackMetadata: installedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        packId: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        style: spriteStyleSchema.optional(),
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

      if (!definition.assetPacks?.[input.packId]) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Asset pack not found' });
      }

      const pack = definition.assetPacks[input.packId];
      if (input.name !== undefined) pack.name = input.name;
      if (input.description !== undefined) pack.description = input.description;
      if (input.style !== undefined) pack.style = input.style;

      await ctx.env.DB.prepare(
        'UPDATE games SET definition = ?, updated_at = ? WHERE id = ?'
      )
        .bind(JSON.stringify(definition), Date.now(), input.gameId)
        .run();

      return { success: true, pack };
    }),

  setTemplateAsset: installedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        packId: z.string(),
        templateId: z.string(),
        imageUrl: z.string().optional(),
        source: z.enum(['generated', 'uploaded', 'none']).optional(),
        scale: z.number().min(0.1).max(10).optional(),
        offsetX: z.number().optional(),
        offsetY: z.number().optional(),
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

      if (!definition.assetPacks?.[input.packId]) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Asset pack not found' });
      }

      const pack = definition.assetPacks[input.packId];
      
      if (!pack.assets[input.templateId]) {
        pack.assets[input.templateId] = {};
      }

      const asset = pack.assets[input.templateId];
      if (input.imageUrl !== undefined) asset.imageUrl = input.imageUrl;
      if (input.source !== undefined) asset.source = input.source;
      if (input.scale !== undefined) asset.scale = input.scale;
      if (input.offsetX !== undefined) asset.offsetX = input.offsetX;
      if (input.offsetY !== undefined) asset.offsetY = input.offsetY;

      if (input.source === 'none') {
        delete asset.imageUrl;
      }

      await ctx.env.DB.prepare(
        'UPDATE games SET definition = ?, updated_at = ? WHERE id = ?'
      )
        .bind(JSON.stringify(definition), Date.now(), input.gameId)
        .run();

      return { success: true, asset };
    }),

  regenerateTemplateAsset: installedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        packId: z.string(),
        templateId: z.string(),
        style: spriteStyleSchema.default('pixel'),
        customPrompt: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const scenarioConfig = getScenarioConfigFromEnv(ctx.env);
      if (!scenarioConfig.configured) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Scenario.com not configured',
        });
      }

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

      if (!definition.assetPacks?.[input.packId]) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Asset pack not found' });
      }

      const template = definition.templates?.[input.templateId];
      if (!template) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Template not found' });
      }

      const tags = template.tags || [];
      let entityType: EntityType = 'item';
      if (tags.includes('player') || tags.includes('character')) entityType = 'character';
      else if (tags.includes('enemy')) entityType = 'enemy';
      else if (tags.includes('platform') || tags.includes('wall') || tags.includes('ground')) entityType = 'platform';
      else if (tags.includes('background')) entityType = 'background';
      else if (tags.includes('ui')) entityType = 'ui';

      const description = input.customPrompt || `${input.templateId} for game: ${definition.metadata.title}`;

      const assetService = new AssetService(ctx.env);
      const result = await assetService.generateAsset({
        entityType,
        description,
        style: input.style as SpriteStyle,
        size: { width: 512, height: 512 },
      });

      if (!result.success || !result.assetUrl) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Asset generation failed',
        });
      }

      const pack = definition.assetPacks[input.packId];
      pack.assets[input.templateId] = {
        imageUrl: result.assetUrl,
        source: 'generated',
        scale: pack.assets[input.templateId]?.scale ?? 1,
      };

      await ctx.env.DB.prepare(
        'UPDATE games SET definition = ?, updated_at = ? WHERE id = ?'
      )
        .bind(JSON.stringify(definition), Date.now(), input.gameId)
        .run();

      return {
        success: true,
        asset: pack.assets[input.templateId],
      };
    }),

  generateBackgroundLayer: installedProcedure
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
      const scenarioConfig = getScenarioConfigFromEnv(ctx.env);
      if (!scenarioConfig.configured) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Scenario.com not configured',
        });
      }

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

  updateParallaxConfig: installedProcedure
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

  deletePack: installedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        packId: z.string(),
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

      if (!definition.assetPacks?.[input.packId]) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Asset pack not found' });
      }

      delete definition.assetPacks[input.packId];

      if (definition.activeAssetPackId === input.packId) {
        definition.activeAssetPackId = undefined;
      }

      await ctx.env.DB.prepare(
        'UPDATE games SET definition = ?, updated_at = ? WHERE id = ?'
      )
        .bind(JSON.stringify(definition), Date.now(), input.gameId)
        .run();

      return { success: true };
    }),
});
