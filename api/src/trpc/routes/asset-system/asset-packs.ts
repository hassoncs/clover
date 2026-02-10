import { protectedProcedure, publicProcedure, router } from '../../index'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { type GameDefinition } from '@slopcade/shared'
import type {
  GameAssetRow,
  AssetPackRow,
  GameRowForAssets,
  PackEntryRow,
} from './types'
import { assetSourceSchema, placementSchema } from './types'
import {
  resolveAssetUrl,
  toClientAsset,
  toClientPack,
  toClientEntry,
} from './utils'

export const assetPacksRouter = router({
  getAsset: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const row = await ctx.env.DB.prepare(
        'SELECT * FROM assets WHERE id = ? AND deleted_at IS NULL'
      ).bind(input.id).first<GameAssetRow>();

      if (!row) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Asset not found' });
      }

      return toClientAsset(row, ctx.env.ASSET_HOST);
    }),

  listAssets: protectedProcedure
    .input(z.object({
      gameId: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      let query = 'SELECT * FROM assets WHERE deleted_at IS NULL';
      const params: (string | number)[] = [];

      if (input.gameId) {
        query += ' AND owner_game_id = ?';
        params.push(input.gameId);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(input.limit, input.offset);

      const result = await ctx.env.DB.prepare(query).bind(...params).all<GameAssetRow>();
      return result.results.map((row) => toClientAsset(row, ctx.env.ASSET_HOST));
    }),

  createAsset: protectedProcedure
    .input(z.object({
      ownerGameId: z.string().optional(),
      source: assetSourceSchema,
      r2Key: z.string(),
      width: z.number().optional(),
      height: z.number().optional(),
      themeId: z.string().optional(),
      compiledPrompt: z.string().optional(),
      modelId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = crypto.randomUUID();
      const now = Date.now();

      await ctx.env.DB.prepare(
        `INSERT INTO assets (id, owner_game_id, source, r2_key, width, height, theme_id, compiled_prompt, model_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id,
        input.ownerGameId ?? null,
        input.source,
        input.r2Key,
        input.width ?? null,
        input.height ?? null,
        input.themeId ?? null,
        input.compiledPrompt ?? null,
        input.modelId ?? null,
        now
      ).run();

      return { id, createdAt: now };
    }),

  deleteAsset: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const now = Date.now();
      await ctx.env.DB.prepare(
        'UPDATE assets SET deleted_at = ? WHERE id = ?'
      ).bind(now, input.id).run();
      return { success: true };
    }),

  getPack: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const packRow = await ctx.env.DB.prepare(
        'SELECT * FROM asset_packs WHERE id = ? AND deleted_at IS NULL'
      ).bind(input.id).first<AssetPackRow>();

      if (!packRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Asset pack not found' });
      }

      const entriesResult = await ctx.env.DB.prepare(
        `SELECT e.*, a.r2_key, a.width as asset_width, a.height as asset_height
         FROM pack_entries e
         LEFT JOIN assets a ON e.asset_id = a.id
         WHERE e.pack_id = ?`
      ).bind(input.id).all<PackEntryRow & { r2_key: string | null; asset_width: number | null; asset_height: number | null }>();

      return {
        ...toClientPack(packRow),
        entries: entriesResult.results.map(row => ({
          ...toClientEntry(row),
          r2Key: row.r2_key,
          imageUrl: row.r2_key ? resolveAssetUrl(row.r2_key, ctx.env.ASSET_HOST) : null,
          assetWidth: row.asset_width,
          assetHeight: row.asset_height,
        })),
      };
    }),

  getPackByName: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ ctx, input }) => {
      const packRow = await ctx.env.DB.prepare(
        'SELECT * FROM asset_packs WHERE name = ? AND deleted_at IS NULL'
      ).bind(input.name).first<AssetPackRow>();

      if (!packRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Asset pack not found' });
      }

      const entriesResult = await ctx.env.DB.prepare(
        `SELECT e.*, a.r2_key, a.width as asset_width, a.height as asset_height
         FROM pack_entries e
         LEFT JOIN assets a ON e.asset_id = a.id
         WHERE e.pack_id = ?`
      ).bind(packRow.id).all<PackEntryRow & { r2_key: string | null; asset_width: number | null; asset_height: number | null }>();

      return {
        ...toClientPack(packRow),
        entries: entriesResult.results.map(row => ({
          ...toClientEntry(row),
          r2Key: row.r2_key,
          imageUrl: row.r2_key ? resolveAssetUrl(row.r2_key, ctx.env.ASSET_HOST) : null,
          assetWidth: row.asset_width,
          assetHeight: row.asset_height,
        })),
      };
    }),

  listPacks: publicProcedure
    .input(z.object({ gameId: z.string() }))
    .query(async ({ ctx, input }) => {
      const gameRow = await ctx.env.DB.prepare(
        'SELECT id, base_game_id FROM games WHERE id = ? AND deleted_at IS NULL'
      ).bind(input.gameId).first<GameRowForAssets>();

      if (!gameRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }

      const baseGameId = gameRow.base_game_id ?? gameRow.id;

      const result = await ctx.env.DB.prepare(
        'SELECT * FROM asset_packs WHERE base_game_id = ? AND deleted_at IS NULL ORDER BY created_at DESC'
      ).bind(baseGameId).all<AssetPackRow>();

      return result.results.map(toClientPack);
    }),

  createPack: protectedProcedure
    .input(z.object({
      gameId: z.string(),
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      themeId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const gameRow = await ctx.env.DB.prepare(
        'SELECT id, base_game_id FROM games WHERE id = ? AND deleted_at IS NULL'
      ).bind(input.gameId).first<GameRowForAssets>();

      if (!gameRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }

      const baseGameId = gameRow.base_game_id ?? gameRow.id;

      const id = crypto.randomUUID();
      const now = Date.now();

      await ctx.env.DB.prepare(
        `INSERT INTO asset_packs (id, base_game_id, name, description, theme_id, creator_user_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id,
        baseGameId,
        input.name,
        input.description ?? null,
        input.themeId ?? null,
        ctx.user.id,
        now
      ).run();

      return { id, baseGameId, createdAt: now };
    }),

  updatePack: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      themeId: z.string().optional(),
      isComplete: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updates: string[] = [];
      const values: (string | number | null)[] = [];

      if (input.name !== undefined) {
        updates.push('name = ?');
        values.push(input.name);
      }
      if (input.description !== undefined) {
        updates.push('description = ?');
        values.push(input.description);
      }
      if (input.themeId !== undefined) {
        updates.push('theme_id = ?');
        values.push(input.themeId);
      }
      if (input.isComplete !== undefined) {
        updates.push('is_complete = ?');
        values.push(input.isComplete ? 1 : 0);
      }

      if (updates.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No fields to update' });
      }

      updates.push('updated_at = ?');
      values.push(Date.now());

      values.push(input.id);
      await ctx.env.DB.prepare(
        `UPDATE asset_packs SET ${updates.join(', ')} WHERE id = ?`
      ).bind(...values).run();

      return { success: true };
    }),

  deletePack: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const now = Date.now();
      await ctx.env.DB.prepare(
        'UPDATE asset_packs SET deleted_at = ? WHERE id = ?'
      ).bind(now, input.id).run();
      return { success: true };
    }),

  setPackEntry: protectedProcedure
    .input(z.object({
      packId: z.string(),
      templateId: z.string(),
      assetId: z.string(),
      placement: placementSchema.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = crypto.randomUUID();
      const placementJson = input.placement ? JSON.stringify(input.placement) : null;

      await ctx.env.DB.prepare(
        `INSERT INTO pack_entries (id, pack_id, template_id, asset_id, placement_json)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(pack_id, template_id) DO UPDATE SET
           asset_id = excluded.asset_id,
           placement_json = excluded.placement_json`
      ).bind(id, input.packId, input.templateId, input.assetId, placementJson).run();

      return { success: true };
    }),

  updateEntryPlacement: protectedProcedure
    .input(z.object({
      packId: z.string(),
      templateId: z.string(),
      placement: placementSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.env.DB.prepare(
        `UPDATE pack_entries SET placement_json = ? WHERE pack_id = ? AND template_id = ?`
      ).bind(JSON.stringify(input.placement), input.packId, input.templateId).run();

      return { success: true };
    }),

  removePackEntry: protectedProcedure
    .input(z.object({
      packId: z.string(),
      templateId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.env.DB.prepare(
        'DELETE FROM pack_entries WHERE pack_id = ? AND template_id = ?'
      ).bind(input.packId, input.templateId).run();

      return { success: true };
    }),

  setActivePackForGame: protectedProcedure
    .input(z.object({
      gameId: z.string(),
      packId: z.string().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const gameRow = await ctx.env.DB.prepare(
        'SELECT definition FROM games WHERE id = ? AND deleted_at IS NULL'
      ).bind(input.gameId).first<{ definition: string }>();

      if (!gameRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }

      let definition: Record<string, any>;
      try {
        definition = JSON.parse(gameRow.definition);
      } catch {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Invalid game definition' });
      }

      if (!definition.assetSystem) {
        definition.assetSystem = {};
      }
      definition.assetSystem.activePackId = input.packId;

      await ctx.env.DB.prepare(
        'UPDATE games SET definition = ?, updated_at = ? WHERE id = ?'
      ).bind(JSON.stringify(definition), Date.now(), input.gameId).run();

      return { success: true };
    }),

  getResolvedForGame: publicProcedure
    .input(z.object({
      gameId: z.string(),
      packId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const packRow = await ctx.env.DB.prepare(
        'SELECT * FROM asset_packs WHERE id = ? AND deleted_at IS NULL'
      ).bind(input.packId).first<AssetPackRow>();

      if (!packRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Asset pack not found' });
      }

      const entriesResult = await ctx.env.DB.prepare(
        `SELECT e.template_id, e.placement_json, a.r2_key
         FROM pack_entries e
         LEFT JOIN assets a ON e.asset_id = a.id
         WHERE e.pack_id = ?`
      ).bind(input.packId).all<{ template_id: string; placement_json: string | null; r2_key: string | null }>();

      const entriesByTemplateId: Record<string, { imageUrl: string | null; placement: { scale: number; offsetX: number; offsetY: number } | null }> = {};

      for (const entry of entriesResult.results) {
        entriesByTemplateId[entry.template_id] = {
          imageUrl: entry.r2_key ? resolveAssetUrl(entry.r2_key, ctx.env.ASSET_HOST) : null,
          placement: entry.placement_json ? JSON.parse(entry.placement_json) : null,
        };
      }

      return {
        pack: {
          id: packRow.id,
          name: packRow.name,
          description: packRow.description,
          baseGameId: packRow.base_game_id,
          createdAt: packRow.created_at,
        },
        entriesByTemplateId,
      };
    }),

  getCompatiblePacks: publicProcedure
    .input(z.object({ gameId: z.string() }))
    .query(async ({ ctx, input }) => {
      const gameRow = await ctx.env.DB.prepare(
        'SELECT id, base_game_id, r2_prefix FROM games WHERE id = ? AND deleted_at IS NULL'
      ).bind(input.gameId).first<{ id: string; base_game_id: string | null; r2_prefix: string }>();

      if (!gameRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }

      const defKey = `${gameRow.r2_prefix}/definition.json`;
      const defObj = await ctx.env.ASSETS.get(defKey);
      if (!defObj) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game definition not found' });
      }

      let definition: { templates?: Record<string, unknown> };
      try {
        definition = JSON.parse(await defObj.text());
      } catch {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Invalid game definition' });
      }

      const templateIds = Object.keys(definition.templates ?? {});
      const baseGameId = gameRow.base_game_id ?? gameRow.id;

      const packsResult = await ctx.env.DB.prepare(
        'SELECT * FROM asset_packs WHERE base_game_id = ? AND deleted_at IS NULL ORDER BY created_at DESC'
      ).bind(baseGameId).all<AssetPackRow>();

      const packsWithCompleteness = await Promise.all(
        packsResult.results.map(async (pack) => {
          const entriesResult = await ctx.env.DB.prepare(
            'SELECT template_id FROM pack_entries WHERE pack_id = ?'
          ).bind(pack.id).all<{ template_id: string }>();

          const coveredTemplates = new Set(entriesResult.results.map(e => e.template_id));
          const coveredCount = templateIds.filter(t => coveredTemplates.has(t)).length;
          const isComplete = coveredCount === templateIds.length && templateIds.length > 0;

          return {
            id: pack.id,
            name: pack.name,
            description: pack.description,
            baseGameId: pack.base_game_id,
            createdAt: pack.created_at,
            isComplete,
            coveredCount,
            totalTemplates: templateIds.length,
          };
        })
      );

      return {
        baseGameId,
        templateIds,
        packs: packsWithCompleteness,
      };
    }),

  offlineManifest: publicProcedure
    .input(z.object({
      gameId: z.string(),
      packId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const gameRow = await ctx.env.DB.prepare(
        'SELECT r2_prefix FROM games WHERE id = ? AND deleted_at IS NULL'
      ).bind(input.gameId).first<{ r2_prefix: string }>();

      if (!gameRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }

      const defKey = `${gameRow.r2_prefix}/definition.json`;
      const defObj = await ctx.env.ASSETS.get(defKey);
      if (!defObj) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game definition not found in R2' });
      }

      let definition: GameDefinition;
      try {
        definition = JSON.parse(await defObj.text());
      } catch {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Invalid game definition' });
      }

      const packId = input.packId || definition.assetSystem?.activePackId;
      if (!packId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No packId specified and no active pack for game' });
      }

      const entriesResult = await ctx.env.DB.prepare(
        `SELECT e.template_id, a.r2_key, a.width, a.height
         FROM pack_entries e
         JOIN assets a ON e.asset_id = a.id
         WHERE e.pack_id = ?`
      ).bind(packId).all<{ template_id: string; r2_key: string; width: number | null; height: number | null }>();

      const assets = entriesResult.results.map(row => ({
        r2Key: row.r2_key,
        url: resolveAssetUrl(row.r2_key, ctx.env.ASSET_HOST),
        width: row.width ?? 0,
        height: row.height ?? 0,
        templateId: row.template_id,
      }));

      const totalBytes = assets.length * 200 * 1024;

      return {
        gameId: input.gameId,
        packId,
        definition,
        assets,
        totalBytes,
      };
    }),

  listPacksForTheme: publicProcedure
    .input(z.object({ themeId: z.string() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.env.DB.prepare(
        'SELECT * FROM asset_packs WHERE theme_id = ? AND deleted_at IS NULL ORDER BY created_at DESC'
      ).bind(input.themeId).all<AssetPackRow>();

      return result.results.map(toClientPack);
    }),
});
