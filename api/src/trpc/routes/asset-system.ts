import { protectedProcedure, publicProcedure, router } from '../index'
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  AssetService,
  buildStructuredPrompt,
  buildStructuredNegativePrompt,
  type EntityType,
  type SpriteStyle,
} from '@/ai/assets'
import { buildR2Key, isR2Key, getAssetUrl, type GameDefinition } from '@slopcade/shared';
import { WalletService, InsufficientBalanceError } from '@/economy/wallet-service'
import { PROVIDER_COSTS, RATE_LIMITS, microsToSparks, USER_COSTS } from '@/economy/pricing'
import { createWorkersAdapters as createWorkersAdaptersImpl } from '@/ai/pipeline/adapters/workers'

import type { AssetRun, DebugEvent, UIComponentSheetSpec } from '@/ai/pipeline/types'
import { uiBaseStateStage, uiVariationStatesStage } from '@/ai/pipeline/stages/ui-component'
import { getControlBaseState, getControlConfig } from '@/ai/pipeline/ui-control-config'
import type { Env } from '../context'

const createWorkersAdapters = (env: Env) => createWorkersAdaptersImpl(env, env.ASSETS);

// Log level utility for production-safe debugging
const LOG_LEVEL = process.env.LOG_LEVEL || 'INFO';
const LOG_LEVELS: Record<string, number> = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

function shouldLog(level: string): boolean {
  return (LOG_LEVELS[level] ?? 1) >= (LOG_LEVELS[LOG_LEVEL] ?? 1);
}

function jobLog(level: string, jobId: string, taskId: string | null, message: string): void {
  if (shouldLog(level)) {
    const context = taskId ? `[job:${jobId.slice(0,8)}] [task:${taskId.slice(0,8)}]` : `[job:${jobId.slice(0,8)}]`;
    const formatted = `[AssetGen] [${level}] ${context} ${message}`;
    if (level === 'ERROR') console.error(formatted);
    else if (level === 'WARN') console.warn(formatted);
    else console.log(formatted);
  }
}

function resolveAssetUrl(r2Key: string, assetHost: string | undefined): string {
  if (!assetHost) {
    return `/assets/${r2Key}`;
  }
  return getAssetUrl(r2Key, assetHost);
}

interface ThemeRow {
  id: string;
  name: string;
  prompt_modifier: string;
  thumbnail_url: string | null;
  creator_user_id: string | null;
  is_public: number;
  created_at: number;
  updated_at: number | null;
  deleted_at: number | null;
}

interface GameAssetRow {
  id: string;
  owner_game_id: string | null;
  source: string;
  r2_key: string;
  width: number | null;
  height: number | null;
  theme_id: string | null;
  compiled_prompt: string | null;
  model_id: string | null;
  created_at: number;
  deleted_at: number | null;
}

interface AssetPackRow {
  id: string;
  base_game_id: string;
  name: string;
  description: string | null;
  theme_id: string | null;
  creator_user_id: string | null;
  is_complete: number;
  created_at: number;
  updated_at: number | null;
  deleted_at: number | null;
}

interface GameRowForAssets {
  id: string;
  base_game_id: string | null;
  definition: string;
}

interface PackEntryRow {
  id: string;
  pack_id: string;
  template_id: string;
  asset_id: string;
  placement_json: string | null;
}

interface GenerationJobRow {
  id: string;
  game_id: string;
  pack_id: string;
  theme_id: string | null;
  status: string;
  style: string | null;
  created_at: number;
  started_at: number | null;
  finished_at: number | null;
}

interface GenerationTaskRow {
  id: string;
  job_id: string;
  template_id: string;
  status: string;
  compiled_prompt: string | null;
  compiled_negative_prompt: string | null;
  model_id: string | null;
  target_width: number | null;
  target_height: number | null;
  asset_id: string | null;
  error_message: string | null;
  scenario_request_id: string | null;
  created_at: number;
  started_at: number | null;
  finished_at: number | null;
}

const assetSourceSchema = z.enum(['generated', 'uploaded']);



const placementSchema = z.object({
  scale: z.number().default(1),
  offsetX: z.number().default(0),
  offsetY: z.number().default(0),
  anchor: z.object({ x: z.number(), y: z.number() }).optional(),
});

const promptDefaultsSchema = z.object({
  themeId: z.string().optional(),
  themePrompt: z.string().optional(),
  styleOverride: z.string().optional(),
  modelId: z.string().optional(),
  negativePrompt: z.string().optional(),
  removeBackground: z.boolean().optional(),
  strength: z.number().min(0.1).max(0.99).optional(),
  guidance: z.number().min(2).max(12).optional(),
  seed: z.string().optional(),
  componentType: z.enum(['button', 'checkbox', 'radio', 'slider', 'panel', 'progress_bar', 'scroll_bar_h', 'scroll_bar_v', 'tab_bar', 'list_item', 'dropdown', 'toggle_switch']).optional(),
  states: z.array(z.enum(['normal', 'hover', 'pressed', 'disabled', 'focus', 'selected', 'unselected'])).optional(),
  baseResolution: z.number().min(64).max(1024).optional(),
});

function toClientTheme(row: ThemeRow) {
  return {
    id: row.id,
    name: row.name,
    promptModifier: row.prompt_modifier,
    thumbnailUrl: row.thumbnail_url,
    creatorUserId: row.creator_user_id,
    isPublic: Boolean(row.is_public),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toClientAsset(row: GameAssetRow, assetHost: string | undefined) {
  return {
    id: row.id,
    ownerGameId: row.owner_game_id,
    source: row.source as 'generated' | 'uploaded',
    r2Key: row.r2_key,
    imageUrl: resolveAssetUrl(row.r2_key, assetHost),
    width: row.width,
    height: row.height,
    themeId: row.theme_id,
    compiledPrompt: row.compiled_prompt,
    modelId: row.model_id,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  };
}

function toClientPack(row: AssetPackRow) {
  return {
    id: row.id,
    baseGameId: row.base_game_id,
    name: row.name,
    description: row.description,
    themeId: row.theme_id,
    creatorUserId: row.creator_user_id,
    isComplete: row.is_complete === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function toClientEntry(row: PackEntryRow) {
  return {
    id: row.id,
    packId: row.pack_id,
    templateId: row.template_id,
    assetId: row.asset_id,
    placement: row.placement_json ? JSON.parse(row.placement_json) : undefined,
  };
}

function toClientJob(row: GenerationJobRow) {
  return {
    id: row.id,
    gameId: row.game_id,
    packId: row.pack_id,
    themeId: row.theme_id,
    status: row.status as 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled',
    style: row.style,
    createdAt: row.created_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
}

function toClientTask(row: GenerationTaskRow) {
  return {
    id: row.id,
    jobId: row.job_id,
    templateId: row.template_id,
    status: row.status as 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled',
    compiledPrompt: row.compiled_prompt,
    compiledNegativePrompt: row.compiled_negative_prompt,
    modelId: row.model_id,
    targetWidth: row.target_width,
    targetHeight: row.target_height,
    assetId: row.asset_id,
    errorMessage: row.error_message,
    scenarioRequestId: row.scenario_request_id,
    createdAt: row.created_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
}

function getTargetDimensions(physicsShape: string, width?: number, height?: number): {
  width: number;
  height: number;
  aspectRatio: string;
} {
  const BASE_SIZE = 512;
  let aspectRatio = 1;

  if (physicsShape === 'box' && width && height) {
    aspectRatio = width / height;
  } else if (physicsShape === 'circle') {
    aspectRatio = 1;
  }

  let targetWidth: number;
  let targetHeight: number;

  if (aspectRatio >= 1) {
    targetWidth = BASE_SIZE;
    targetHeight = Math.round(BASE_SIZE / aspectRatio / 64) * 64;
  } else {
    targetWidth = Math.round(BASE_SIZE * aspectRatio / 64) * 64;
    targetHeight = BASE_SIZE;
  }

  targetWidth = Math.max(64, targetWidth);
  targetHeight = Math.max(64, targetHeight);

  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(targetWidth, targetHeight);
  const ratioStr = `${targetWidth / divisor}:${targetHeight / divisor}`;

  return { width: targetWidth, height: targetHeight, aspectRatio: ratioStr };
}

export const assetSystemRouter = router({
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

  getJob: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const jobRow = await ctx.env.DB.prepare(
        'SELECT * FROM generation_jobs WHERE id = ?'
      ).bind(input.id).first<GenerationJobRow>();

      if (!jobRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Generation job not found' });
      }

      const tasksResult = await ctx.env.DB.prepare(
        'SELECT * FROM generation_tasks WHERE job_id = ? ORDER BY created_at'
      ).bind(input.id).all<GenerationTaskRow>();

      return {
        ...toClientJob(jobRow),
        tasks: tasksResult.results.map(toClientTask),
      };
    }),

  createGenerationJob: protectedProcedure
    .input(z.object({
      gameId: z.string(),
      packId: z.string().optional(),
      templateIds: z.array(z.string()).min(1),
      promptDefaults: promptDefaultsSchema,
      templateOverrides: z.record(z.string(), z.object({
        entityPrompt: z.string().optional(),
        styleOverride: z.string().optional(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const walletService = new WalletService(ctx.env.DB);

      const allowed = await walletService.checkRateLimit(
        ctx.user.id,
        'generation',
        RATE_LIMITS.GENERATIONS_PER_HOUR,
        60 * 60 * 1000
      );
      if (!allowed) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: `Rate limit exceeded. Max ${RATE_LIMITS.GENERATIONS_PER_HOUR} generations per hour.`,
        });
      }

      const estimatedCostMicros = input.templateIds.length * USER_COSTS.ASSET_ENTITY;
      const jobId = crypto.randomUUID();

      try {
        await walletService.debit({
          userId: ctx.user.id,
          type: 'generation_debit',
          amountMicros: -estimatedCostMicros,
          referenceType: 'generation_job',
          referenceId: jobId,
          idempotencyKey: `gen_debit_${jobId}`,
          description: `Asset generation for ${input.templateIds.length} templates`,
        });
      } catch (err) {
        if (err instanceof InsufficientBalanceError) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: `Insufficient balance. Need ${microsToSparks(estimatedCostMicros)} Sparks.`,
          });
        }
        throw err;
      }

      const gameRow = await ctx.env.DB.prepare(
        'SELECT definition FROM games WHERE id = ? AND deleted_at IS NULL'
      ).bind(input.gameId).first<{ definition: string }>();

      if (!gameRow) {
        await walletService.credit({
          userId: ctx.user.id,
          type: 'generation_refund',
          amountMicros: estimatedCostMicros,
          referenceType: 'generation_job',
          referenceId: jobId,
          idempotencyKey: `gen_refund_${jobId}`,
          description: `Refund: game not found`,
        });
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }

      let definition: { templates?: Record<string, { physics?: { shape: string; width?: number; height?: number; radius?: number }; tags?: string[] }> };
      try {
        definition = JSON.parse(gameRow.definition);
      } catch {
        await walletService.credit({
          userId: ctx.user.id,
          type: 'generation_refund',
          amountMicros: estimatedCostMicros,
          referenceType: 'generation_job',
          referenceId: jobId,
          idempotencyKey: `gen_refund_${jobId}`,
          description: `Refund: invalid game definition`,
        });
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Invalid game definition' });
      }

      const now = Date.now();

      try {
        await ctx.env.DB.prepare(
          `INSERT INTO generation_jobs (id, game_id, pack_id, theme_id, status, style, created_at)
           VALUES (?, ?, ?, ?, 'queued', ?, ?)`
        ).bind(
          jobId, 
          input.gameId, 
          input.packId ?? null, 
          input.promptDefaults.themeId ?? null,
          input.promptDefaults.styleOverride ?? null,
          now
        ).run();

        for (const templateId of input.templateIds) {
          const template = definition.templates?.[templateId];
          const physics = template?.physics;
          const tags = template?.tags ?? [];

          let entityType: EntityType = 'item';
          if (tags.includes('player') || tags.includes('character')) entityType = 'character';
          else if (tags.includes('enemy')) entityType = 'enemy';
          else if (tags.includes('platform') || tags.includes('wall') || tags.includes('ground')) entityType = 'platform';
          else if (tags.includes('background')) entityType = 'background';
          else if (tags.includes('ui')) entityType = 'ui';

          const physicsContext = physics ? {
            shape: physics.shape,
            width: physics.width,
            height: physics.height,
            radius: physics.radius,
          } : { shape: 'box' as const, width: 1, height: 1 };

          const dimensions = getTargetDimensions(
            physicsContext.shape,
            physicsContext.width,
            physicsContext.height
          );

          const overrides = input.templateOverrides?.[templateId];
          const styleOverride = (overrides?.styleOverride ?? input.promptDefaults.styleOverride ?? 'pixel') as SpriteStyle;

          const compiledPrompt = buildStructuredPrompt({
            templateId,
            physicsShape: physicsContext.shape as 'box' | 'circle' | 'polygon',
            physicsWidth: physicsContext.width,
            physicsHeight: physicsContext.height,
            physicsRadius: physicsContext.radius,
            entityType,
            themePrompt: input.promptDefaults.themePrompt,
            style: styleOverride,
            targetWidth: dimensions.width,
            targetHeight: dimensions.height,
          });

          const compiledNegativePrompt = buildStructuredNegativePrompt(styleOverride);

          const taskId = crypto.randomUUID();

          await ctx.env.DB.prepare(
            `INSERT INTO generation_tasks (id, job_id, template_id, status, compiled_prompt, compiled_negative_prompt, model_id, target_width, target_height, created_at)
             VALUES (?, ?, ?, 'queued', ?, ?, ?, ?, ?, ?)`
          ).bind(
            taskId,
            jobId,
            templateId,
            compiledPrompt,
            compiledNegativePrompt,
            input.promptDefaults.modelId ?? null,
            dimensions.width,
            dimensions.height,
            now
          ).run();
        }

        return { jobId, taskCount: input.templateIds.length };
      } catch (jobCreationError) {
        await walletService.credit({
          userId: ctx.user.id,
          type: 'generation_refund',
          amountMicros: estimatedCostMicros,
          referenceType: 'generation_job',
          referenceId: jobId,
          idempotencyKey: `gen_refund_${jobId}`,
          description: `Refund: job creation failed`,
        });
        throw jobCreationError;
      }
    }),

  regeneratePack: protectedProcedure
    .input(z.object({
      packId: z.string(),
      newTheme: z.string(),
      newStyle: z.enum(['pixel', 'cartoon', '3d', 'flat']),
    }))
    .mutation(async ({ ctx, input }) => {
      const walletService = new WalletService(ctx.env.DB);

      const allowed = await walletService.checkRateLimit(
        ctx.user.id,
        'generation',
        RATE_LIMITS.GENERATIONS_PER_HOUR,
        60 * 60 * 1000
      );
      if (!allowed) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: `Rate limit exceeded. Max ${RATE_LIMITS.GENERATIONS_PER_HOUR} generations per hour.`,
        });
      }

      const packRow = await ctx.env.DB.prepare(
        'SELECT * FROM asset_packs WHERE id = ? AND deleted_at IS NULL'
      ).bind(input.packId).first<AssetPackRow>();

      if (!packRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Asset pack not found' });
      }

      const entriesResult = await ctx.env.DB.prepare(
        'SELECT template_id FROM pack_entries WHERE pack_id = ?'
      ).bind(input.packId).all<{ template_id: string }>();

      const templateIds = entriesResult.results.map(e => e.template_id);

      if (templateIds.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Pack has no entries to regenerate' });
      }

      const estimatedCostMicros = templateIds.length * USER_COSTS.ASSET_ENTITY;
      const jobId = crypto.randomUUID();

      try {
        await walletService.debit({
          userId: ctx.user.id,
          type: 'generation_debit',
          amountMicros: -estimatedCostMicros,
          referenceType: 'generation_job',
          referenceId: jobId,
          idempotencyKey: `gen_debit_${jobId}`,
          description: `Asset regeneration for ${templateIds.length} templates`,
        });
      } catch (err) {
        if (err instanceof InsufficientBalanceError) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: `Insufficient balance. Need ${microsToSparks(estimatedCostMicros)} Sparks.`,
          });
        }
        throw err;
      }

      const gameRow = await ctx.env.DB.prepare(
        'SELECT definition FROM games WHERE id = ? AND deleted_at IS NULL'
      ).bind(packRow.base_game_id).first<{ definition: string }>();

      if (!gameRow) {
        await walletService.credit({
          userId: ctx.user.id,
          type: 'generation_refund',
          amountMicros: estimatedCostMicros,
          referenceType: 'generation_job',
          referenceId: jobId,
          idempotencyKey: `gen_refund_${jobId}`,
          description: `Refund: game not found`,
        });
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }

      let definition: { templates?: Record<string, { physics?: { shape: string; width?: number; height?: number; radius?: number }; tags?: string[] }> };
      try {
        definition = JSON.parse(gameRow.definition);
      } catch {
        await walletService.credit({
          userId: ctx.user.id,
          type: 'generation_refund',
          amountMicros: estimatedCostMicros,
          referenceType: 'generation_job',
          referenceId: jobId,
          idempotencyKey: `gen_refund_${jobId}`,
          description: `Refund: invalid game definition`,
        });
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Invalid game definition' });
      }

      const now = Date.now();

      await ctx.env.DB.prepare(
        `UPDATE asset_packs SET updated_at = ? WHERE id = ?`
      ).bind(now, input.packId).run();

      try {
        await ctx.env.DB.prepare(
          `INSERT INTO generation_jobs (id, game_id, pack_id, status, style, created_at)
           VALUES (?, ?, ?, 'queued', ?, ?)`
        ).bind(jobId, packRow.base_game_id, input.packId, input.newStyle, now).run();

        for (const templateId of templateIds) {
          const template = definition.templates?.[templateId];
          const physics = template?.physics;
          const tags = template?.tags ?? [];

          let entityType: EntityType = 'item';
          if (tags.includes('player') || tags.includes('character')) entityType = 'character';
          else if (tags.includes('enemy')) entityType = 'enemy';
          else if (tags.includes('platform') || tags.includes('wall') || tags.includes('ground')) entityType = 'platform';
          else if (tags.includes('background')) entityType = 'background';
          else if (tags.includes('ui')) entityType = 'ui';

          const physicsContext = physics ? {
            shape: physics.shape,
            width: physics.width,
            height: physics.height,
            radius: physics.radius,
          } : { shape: 'box' as const, width: 1, height: 1 };

          const dimensions = getTargetDimensions(
            physicsContext.shape,
            physicsContext.width,
            physicsContext.height
          );

          const styleOverride = input.newStyle as SpriteStyle;

          const compiledPrompt = buildStructuredPrompt({
            templateId,
            physicsShape: physicsContext.shape as 'box' | 'circle' | 'polygon',
            physicsWidth: physicsContext.width,
            physicsHeight: physicsContext.height,
            physicsRadius: physicsContext.radius,
            entityType,
            themePrompt: input.newTheme,
            style: styleOverride,
            targetWidth: dimensions.width,
            targetHeight: dimensions.height,
          });

          const compiledNegativePrompt = buildStructuredNegativePrompt(styleOverride);

          const taskId = crypto.randomUUID();

          await ctx.env.DB.prepare(
            `INSERT INTO generation_tasks (id, job_id, template_id, status, compiled_prompt, compiled_negative_prompt, target_width, target_height, created_at)
             VALUES (?, ?, ?, 'queued', ?, ?, ?, ?, ?)`
          ).bind(
            taskId,
            jobId,
            templateId,
            compiledPrompt,
            compiledNegativePrompt,
            dimensions.width,
            dimensions.height,
            now
          ).run();
        }

        return { jobId, taskCount: templateIds.length };
      } catch (jobCreationError) {
        await walletService.credit({
          userId: ctx.user.id,
          type: 'generation_refund',
          amountMicros: estimatedCostMicros,
          referenceType: 'generation_job',
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
        'SELECT * FROM generation_jobs WHERE id = ?'
      ).bind(input.jobId).first<GenerationJobRow>();

      if (!jobRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Job not found' });
      }

      const now = Date.now();
      await ctx.env.DB.prepare(
        `UPDATE generation_jobs SET status = 'running', started_at = ? WHERE id = ?`
      ).bind(now, input.jobId).run();

      const tasksResult = await ctx.env.DB.prepare(
        `SELECT * FROM generation_tasks WHERE job_id = ? AND status = 'queued'`
      ).bind(input.jobId).all<GenerationTaskRow>();

      jobLog('INFO', input.jobId, null, `Starting job with ${tasksResult.results.length} tasks`);

      const assetService = new AssetService(ctx.env);
      let successCount = 0;
      let failCount = 0;

      // Use defaults since these are no longer in the DB
      const shouldRemoveBackground = true; 

      for (const task of tasksResult.results) {
        jobLog('DEBUG', input.jobId, task.id, `Processing: ${task.template_id}`);
        jobLog('DEBUG', input.jobId, task.id, `Target dimensions: ${task.target_width}x${task.target_height}`);
        const taskNow = Date.now();
        await ctx.env.DB.prepare(
          `UPDATE generation_tasks SET status = 'running', started_at = ? WHERE id = ?`
        ).bind(taskNow, task.id).run();

        try {
          const entityType = 'item' as EntityType; // Default
          const style = (jobRow.style ?? 'pixel') as SpriteStyle;

          const assetContext = jobRow.pack_id ? { gameId: jobRow.game_id, packId: jobRow.pack_id } : undefined;
          
          let result = await assetService.generateDirect({
            prompt: task.compiled_prompt ?? '',
            negativePrompt: task.compiled_negative_prompt ?? buildStructuredNegativePrompt(style),
            entityType,
            style,
            width: task.target_width ?? 512,
            height: task.target_height ?? 512,
            context: assetContext,
          });

          if (result.success && result.r2Key && shouldRemoveBackground) {
            console.log(`[processGenerationJob] Removing background for ${task.template_id}`);
            try {
              const originalAsset = await ctx.env.ASSETS.get(result.r2Key);
              if (originalAsset) {
                const buffer = await originalAsset.arrayBuffer();
                const bgRemovedResult = await assetService.removeBackground(buffer, entityType, assetContext);
                if (bgRemovedResult.success && bgRemovedResult.assetUrl) {
                  result = bgRemovedResult;
                } else {
                  console.warn(`[processGenerationJob] Background removal failed, using original: ${bgRemovedResult.error}`);
                }
              }
            } catch (bgErr) {
              console.warn(`[processGenerationJob] Background removal error, using original:`, bgErr);
            }
          }

          if (result.success && result.r2Key) {
            const assetId = crypto.randomUUID();
            const assetNow = Date.now();

            await ctx.env.DB.prepare(
              `INSERT INTO assets (id, owner_game_id, source, r2_key, width, height, theme_id, compiled_prompt, model_id, created_at)
               VALUES (?, ?, 'generated', ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
              assetId, 
              jobRow.game_id, 
              result.r2Key, 
              task.target_width, 
              task.target_height, 
              jobRow.theme_id,
              task.compiled_prompt,
              task.model_id,
              assetNow
            ).run();

            await ctx.env.DB.prepare(
              `UPDATE generation_tasks SET status = 'succeeded', asset_id = ?, finished_at = ? WHERE id = ?`
            ).bind(assetId, Date.now(), task.id).run();

            const costId = crypto.randomUUID();
            const costMicros = USER_COSTS.ASSET_ENTITY;
            await ctx.env.DB.prepare(
              `INSERT INTO operation_costs (id, user_id, operation_type, estimated_cost_micros, charged_cost_micros, reference_type, reference_id, created_at)
               VALUES (?, ?, 'scenario_txt2img', ?, ?, 'generation_task', ?, ?)`
            ).bind(costId, ctx.user.id, costMicros, costMicros, task.id, assetNow).run();

            jobLog('INFO', input.jobId, task.id, `Task succeeded - Asset: ${assetId}`);

            if (jobRow.pack_id) {
              const entryId = crypto.randomUUID();

              await ctx.env.DB.prepare(
                `INSERT INTO pack_entries (id, pack_id, template_id, asset_id)
                 VALUES (?, ?, ?, ?)
                 ON CONFLICT(pack_id, template_id) DO UPDATE SET
                   asset_id = excluded.asset_id`
              ).bind(entryId, jobRow.pack_id, task.template_id, assetId).run();
            }

            successCount++;
          } else {
            throw new Error(result.error ?? 'Generation failed');
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          await ctx.env.DB.prepare(
            `UPDATE generation_tasks SET status = 'failed', error_message = ?, finished_at = ? WHERE id = ?`
          ).bind(errorMessage, Date.now(), task.id).run();
          jobLog('ERROR', input.jobId, task.id, `Task failed: ${errorMessage}`);
          failCount++;
        }
      }

      const finalStatus = failCount === 0 ? 'succeeded' : (successCount === 0 ? 'failed' : 'succeeded');
      await ctx.env.DB.prepare(
        `UPDATE generation_jobs SET status = ?, finished_at = ? WHERE id = ?`
      ).bind(finalStatus, Date.now(), input.jobId).run();

      jobLog('INFO', input.jobId, null, `Job finished: ${successCount} succeeded, ${failCount} failed`);

      return { successCount, failCount, status: finalStatus };
    }),

  cancelJob: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const now = Date.now();
      await ctx.env.DB.prepare(
        `UPDATE generation_jobs SET status = 'canceled', finished_at = ? WHERE id = ? AND status IN ('queued', 'running')`
      ).bind(now, input.jobId).run();

      await ctx.env.DB.prepare(
        `UPDATE generation_tasks SET status = 'canceled', finished_at = ? WHERE job_id = ? AND status IN ('queued', 'running')`
      ).bind(now, input.jobId).run();

      return { success: true };
    }),

  retryFailedTasks: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.env.DB.prepare(
        `UPDATE generation_tasks SET status = 'queued', error_message = NULL, started_at = NULL, finished_at = NULL WHERE job_id = ? AND status = 'failed'`
      ).bind(input.jobId).run();

      await ctx.env.DB.prepare(
        `UPDATE generation_jobs SET status = 'queued', started_at = NULL, finished_at = NULL WHERE id = ?`
      ).bind(input.jobId).run();

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

  getResolvedForGame: protectedProcedure
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

  getCompatiblePacks: protectedProcedure
    .input(z.object({ gameId: z.string() }))
    .query(async ({ ctx, input }) => {
      const gameRow = await ctx.env.DB.prepare(
        'SELECT id, base_game_id, definition FROM games WHERE id = ? AND deleted_at IS NULL'
      ).bind(input.gameId).first<GameRowForAssets>();

      if (!gameRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }

      let definition: { templates?: Record<string, unknown> };
      try {
        definition = JSON.parse(gameRow.definition);
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
        'SELECT definition FROM games WHERE id = ? AND deleted_at IS NULL'
      ).bind(input.gameId).first<{ definition: string }>();

      if (!gameRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }

      let definition: GameDefinition;
      try {
        definition = JSON.parse(gameRow.definition);
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

  createSheetGenerationJob: protectedProcedure
    .input(z.object({
      gameId: z.string(),
      packId: z.string(),
      sheetSpec: z.object({
        id: z.string(),
        kind: z.literal('variation'),
        layout: z.object({
          type: z.literal('grid'),
          columns: z.number(),
          rows: z.number(),
          cellWidth: z.number(),
          cellHeight: z.number(),
        }),
        promptConfig: z.object({
          basePrompt: z.string().optional(),
          negativePrompt: z.string().optional(),
          stylePreset: z.string().optional(),
        }).optional(),
        variants: z.array(z.object({
          key: z.string(),
          description: z.string().optional(),
          promptOverride: z.string().optional(),
          weight: z.number().optional(),
        })),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const { gameId, packId, sheetSpec } = input;
      const jobId = crypto.randomUUID();
      const taskId = crypto.randomUUID();
      const now = Date.now();

      await ctx.env.DB.prepare(`
        INSERT INTO generation_jobs (id, game_id, pack_id, status, created_at)
        VALUES (?, ?, ?, 'queued', ?)
      `).bind(jobId, gameId, packId, now).run();

      await ctx.env.DB.prepare(`
        INSERT INTO generation_tasks (id, job_id, template_id, status, created_at)
        VALUES (?, ?, ?, 'queued', ?)
      `).bind(taskId, jobId, sheetSpec.id, now).run();

      return { jobId };
    }),

  regenerateAssets: protectedProcedure
    .input(z.object({
      packId: z.string(),
      templateIds: z.array(z.string()).min(1),
      newTheme: z.string().optional(),
      newStyle: z.string().optional(),
      customPrompts: z.record(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const walletService = new WalletService(ctx.env.DB);

      const allowed = await walletService.checkRateLimit(
        ctx.user.id,
        'generation',
        RATE_LIMITS.GENERATIONS_PER_HOUR,
        60 * 60 * 1000
      );
      if (!allowed) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: `Rate limit exceeded. Max ${RATE_LIMITS.GENERATIONS_PER_HOUR} generations per hour.`,
        });
      }

      const packRow = await ctx.env.DB.prepare(
        'SELECT * FROM asset_packs WHERE id = ? AND deleted_at IS NULL'
      ).bind(input.packId).first<AssetPackRow>();

      if (!packRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Asset pack not found' });
      }

      const entriesResult = await ctx.env.DB.prepare(
        'SELECT template_id FROM pack_entries WHERE pack_id = ?'
      ).bind(input.packId).all<{ template_id: string }>();

      const validTemplateIds = new Set(entriesResult.results.map(e => e.template_id));
      const invalidTemplateIds = input.templateIds.filter(id => !validTemplateIds.has(id));
      if (invalidTemplateIds.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Invalid templateIds not in pack: ${invalidTemplateIds.join(', ')}`,
        });
      }

      const estimatedCostMicros = input.templateIds.length * USER_COSTS.ASSET_ENTITY;
      const jobId = crypto.randomUUID();

      try {
        await walletService.debit({
          userId: ctx.user.id,
          type: 'generation_debit',
          amountMicros: -estimatedCostMicros,
          referenceType: 'generation_job',
          referenceId: jobId,
          idempotencyKey: `gen_debit_${jobId}`,
          description: `Asset regeneration for ${input.templateIds.length} templates`,
        });
      } catch (err) {
        if (err instanceof InsufficientBalanceError) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: `Insufficient balance. Need ${microsToSparks(estimatedCostMicros)} Sparks.`,
          });
        }
        throw err;
      }

      const gameRow = await ctx.env.DB.prepare(
        'SELECT definition FROM games WHERE id = ? AND deleted_at IS NULL'
      ).bind(packRow.base_game_id).first<{ definition: string }>();

      if (!gameRow) {
        await walletService.credit({
          userId: ctx.user.id,
          type: 'generation_refund',
          amountMicros: estimatedCostMicros,
          referenceType: 'generation_job',
          referenceId: jobId,
          idempotencyKey: `gen_refund_${jobId}`,
          description: `Refund: game not found`,
        });
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }

      let definition: { templates?: Record<string, { physics?: { shape: string; width?: number; height?: number; radius?: number }; tags?: string[] }> };
      try {
        definition = JSON.parse(gameRow.definition);
      } catch {
        await walletService.credit({
          userId: ctx.user.id,
          type: 'generation_refund',
          amountMicros: estimatedCostMicros,
          referenceType: 'generation_job',
          referenceId: jobId,
          idempotencyKey: `gen_refund_${jobId}`,
          description: `Refund: invalid game definition`,
        });
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Invalid game definition' });
      }

      const now = Date.now();

      await ctx.env.DB.prepare(
        `UPDATE asset_packs SET updated_at = ? WHERE id = ?`
      ).bind(now, input.packId).run();

      try {
        await ctx.env.DB.prepare(
          `INSERT INTO generation_jobs (id, game_id, pack_id, status, style, created_at)
           VALUES (?, ?, ?, 'queued', ?, ?)`
        ).bind(jobId, packRow.base_game_id, input.packId, input.newStyle ?? null, now).run();

        for (const templateId of input.templateIds) {
          const template = definition.templates?.[templateId];
          const physics = template?.physics;
          const tags = template?.tags ?? [];

          let entityType: EntityType = 'item';
          if (tags.includes('player') || tags.includes('character')) entityType = 'character';
          else if (tags.includes('enemy')) entityType = 'enemy';
          else if (tags.includes('platform') || tags.includes('wall') || tags.includes('ground')) entityType = 'platform';
          else if (tags.includes('background')) entityType = 'background';
          else if (tags.includes('ui')) entityType = 'ui';

          const physicsContext = physics ? {
            shape: physics.shape,
            width: physics.width,
            height: physics.height,
            radius: physics.radius,
          } : { shape: 'box' as const, width: 1, height: 1 };

          const dimensions = getTargetDimensions(
            physicsContext.shape,
            physicsContext.width,
            physicsContext.height
          );

          const customPrompt = input.customPrompts?.[templateId];
          const themePrompt = input.newTheme;
          const styleOverride = (input.newStyle ?? 'pixel') as SpriteStyle;

          const compiledPrompt = customPrompt ?? buildStructuredPrompt({
            templateId,
            physicsShape: physicsContext.shape as 'box' | 'circle' | 'polygon',
            physicsWidth: physicsContext.width,
            physicsHeight: physicsContext.height,
            physicsRadius: physicsContext.radius,
            entityType,
            themePrompt,
            style: styleOverride,
            targetWidth: dimensions.width,
            targetHeight: dimensions.height,
          });

          const compiledNegativePrompt = buildStructuredNegativePrompt(styleOverride);

          const taskId = crypto.randomUUID();

          await ctx.env.DB.prepare(
            `INSERT INTO generation_tasks (id, job_id, template_id, status, compiled_prompt, compiled_negative_prompt, target_width, target_height, created_at)
             VALUES (?, ?, ?, 'queued', ?, ?, ?, ?, ?)`
          ).bind(
            taskId,
            jobId,
            templateId,
            compiledPrompt,
            compiledNegativePrompt,
            dimensions.width,
            dimensions.height,
            now
          ).run();
        }

        return { jobId, taskCount: input.templateIds.length };
      } catch (jobCreationError) {
        await walletService.credit({
          userId: ctx.user.id,
          type: 'generation_refund',
          amountMicros: estimatedCostMicros,
          referenceType: 'generation_job',
          referenceId: jobId,
          idempotencyKey: `gen_refund_${jobId}`,
          description: `Refund: job creation failed`,
        });
        throw jobCreationError;
      }
    }),

  // ============================================================================
  // Theme Management
  // ============================================================================

  themes: router({
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        promptModifier: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = crypto.randomUUID();
        const now = Date.now();

        await ctx.env.DB.prepare(
          `INSERT INTO themes (id, name, prompt_modifier, creator_user_id, is_public, created_at, updated_at)
           VALUES (?, ?, ?, ?, 0, ?, ?)`
        ).bind(id, input.name, input.promptModifier, ctx.user.id, now, now).run();

        return { id, createdAt: now };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        promptModifier: z.string().min(1).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const updates: string[] = [];
        const values: (string | number)[] = [];

        if (input.name !== undefined) {
          updates.push('name = ?');
          values.push(input.name);
        }
        if (input.promptModifier !== undefined) {
          updates.push('prompt_modifier = ?');
          values.push(input.promptModifier);
        }

        if (updates.length === 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'No fields to update' });
        }

        updates.push('updated_at = ?');
        values.push(Date.now());

        values.push(input.id);
        values.push(ctx.user.id);
        const result = await ctx.env.DB.prepare(
          `UPDATE themes SET ${updates.join(', ')} WHERE id = ? AND creator_user_id = ? AND deleted_at IS NULL`
        ).bind(...values).run();

        if (result.meta.changes === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Theme not found or not owned by you' });
        }

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const now = Date.now();
        const result = await ctx.env.DB.prepare(
          'UPDATE themes SET deleted_at = ? WHERE id = ? AND creator_user_id = ?'
        ).bind(now, input.id, ctx.user.id).run();

        if (result.meta.changes === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Theme not found or not owned by you' });
        }

        return { success: true };
      }),

    get: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const row = await ctx.env.DB.prepare(
          'SELECT * FROM themes WHERE id = ? AND deleted_at IS NULL'
        ).bind(input.id).first<ThemeRow>();

        if (!row) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Theme not found' });
        }

        return toClientTheme(row);
      }),

    getMine: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const row = await ctx.env.DB.prepare(
          'SELECT * FROM themes WHERE id = ? AND creator_user_id = ? AND deleted_at IS NULL'
        ).bind(input.id, ctx.user.id).first<ThemeRow>();

        if (!row) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Theme not found' });
        }

        return toClientTheme(row);
      }),

    list: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        query: z.string().optional()
      }).optional())
      .query(async ({ ctx, input }) => {
        const limit = input?.limit ?? 20;
        const offset = input?.offset ?? 0;
        const query = input?.query?.toLowerCase();

        let sql = 'SELECT * FROM themes WHERE creator_user_id = ? AND deleted_at IS NULL';
        const params: any[] = [ctx.user.id];

        if (query) {
          sql += ' AND (LOWER(name) LIKE ? OR LOWER(prompt_modifier) LIKE ?)';
          params.push(`%${query}%`, `%${query}%`);
        }

        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const result = await ctx.env.DB.prepare(sql).bind(...params).all<ThemeRow>();
        return result.results.map(toClientTheme);
      }),

    listPublic: publicProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        query: z.string().optional()
      }).optional())
      .query(async ({ ctx, input }) => {
        const limit = input?.limit ?? 20;
        const offset = input?.offset ?? 0;
        const query = input?.query?.toLowerCase();

        let sql = 'SELECT * FROM themes WHERE is_public = 1 AND deleted_at IS NULL';
        const params: any[] = [];

        if (query) {
          sql += ' AND (LOWER(name) LIKE ? OR LOWER(prompt_modifier) LIKE ?)';
          params.push(`%${query}%`, `%${query}%`);
        }

        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const result = await ctx.env.DB.prepare(sql).bind(...params).all<ThemeRow>();
        return result.results.map(toClientTheme);
      }),

    enhancePrompt: protectedProcedure
      .input(z.object({
        prompt: z.string().min(1).max(1000),
        name: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const openrouterKey = ctx.env.OPENROUTER_API_KEY;
        if (!openrouterKey) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'AI enhancement is not configured. Please contact support.',
          });
        }

        const systemPrompt = `You are a game art director. Given a brief theme description, expand it into a detailed, evocative prompt that would guide AI image generation for game assets.

The enhanced prompt should:
- Be 2-3 sentences
- Include specific visual details (colors, textures, lighting, mood)
- Reference art styles or eras if appropriate
- Be suitable for generating game UI elements, sprites, and backgrounds

Only output the enhanced prompt, nothing else.`;

        const userPrompt = input.name 
          ? `Theme name: "${input.name}"\nOriginal prompt: "${input.prompt}"`
          : `Original prompt: "${input.prompt}"`;

        try {
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openrouterKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'openai/gpt-4o-mini',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
              ],
              max_tokens: 300,
              temperature: 0.7,
            }),
          });

          if (!response.ok) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to enhance prompt. Please try again.',
            });
          }

          const data = await response.json() as { choices: Array<{ message: { content: string } }> };
          const enhancedPrompt = data.choices[0]?.message?.content?.trim();

          if (!enhancedPrompt) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'AI returned empty response. Please try again.',
            });
          }

          return { enhancedPrompt };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to enhance prompt. Please try again.',
          });
        }
      }),
  }),

  // ============================================================================
  // Pack Management Extensions
  // ============================================================================

  listPacksForTheme: publicProcedure
    .input(z.object({ themeId: z.string() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.env.DB.prepare(
        'SELECT * FROM asset_packs WHERE theme_id = ? AND deleted_at IS NULL ORDER BY created_at DESC'
      ).bind(input.themeId).all<AssetPackRow>();

      return result.results.map(toClientPack);
    }),

  // ============================================================================
  // Main Orchestration Endpoint
  // ============================================================================

  applyThemeToGame: protectedProcedure
    .input(z.object({
      gameId: z.string(),
      themeId: z.string().optional(),
      newTheme: z.object({
        name: z.string().min(1).max(100),
        promptModifier: z.string().min(1),
      }).optional(),
      setAsActive: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!input.themeId && !input.newTheme) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Must provide either themeId or newTheme' });
      }

      let themeId = input.themeId;

      if (input.newTheme) {
        const id = crypto.randomUUID();
        const now = Date.now();

        await ctx.env.DB.prepare(
          `INSERT INTO themes (id, name, prompt_modifier, creator_user_id, is_public, created_at, updated_at)
           VALUES (?, ?, ?, ?, 0, ?, ?)`
        ).bind(id, input.newTheme.name, input.newTheme.promptModifier, ctx.user.id, now, now).run();

        themeId = id;
      }

      if (!themeId) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to determine theme ID' });
      }

      // Get game info
      const gameRow = await ctx.env.DB.prepare(
        'SELECT id, base_game_id FROM games WHERE id = ? AND deleted_at IS NULL'
      ).bind(input.gameId).first<GameRowForAssets>();

      if (!gameRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }

      const baseGameId = gameRow.base_game_id ?? gameRow.id;

      // Create new pack
      const packId = crypto.randomUUID();
      const now = Date.now();

      const themeName = input.newTheme?.name ?? themeId;
      await ctx.env.DB.prepare(
        `INSERT INTO asset_packs (id, base_game_id, name, description, theme_id, creator_user_id, is_complete, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`
      ).bind(
        packId,
        baseGameId,
        `Theme: ${themeName}`,
        `Auto-generated pack for theme`,
        themeId,
        ctx.user.id,
        now,
        now
      ).run();

      // Create generation job
      const walletService = new WalletService(ctx.env.DB);

      const allowed = await walletService.checkRateLimit(
        ctx.user.id,
        'generation',
        RATE_LIMITS.GENERATIONS_PER_HOUR,
        60 * 60 * 1000
      );
      if (!allowed) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: `Rate limit exceeded. Max ${RATE_LIMITS.GENERATIONS_PER_HOUR} generations per hour.`,
        });
      }

      const gameDefRow = await ctx.env.DB.prepare(
        'SELECT definition FROM games WHERE id = ? AND deleted_at IS NULL'
      ).bind(input.gameId).first<{ definition: string }>();

      if (!gameDefRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }

      let definition: { templates?: Record<string, any>; assetSystem?: any };
      try {
        definition = JSON.parse(gameDefRow.definition);
      } catch {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Invalid game definition' });
      }

      const templateIds = Object.keys(definition.templates ?? {});

      if (templateIds.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Game has no templates to generate' });
      }

      const estimatedCostMicros = templateIds.length * USER_COSTS.ASSET_ENTITY;
      const jobId = crypto.randomUUID();

      try {
        await walletService.debit({
          userId: ctx.user.id,
          type: 'generation_debit',
          amountMicros: -estimatedCostMicros,
          referenceType: 'generation_job',
          referenceId: jobId,
          idempotencyKey: `gen_debit_${jobId}`,
          description: `Theme application for ${templateIds.length} templates`,
        });
      } catch (err) {
        if (err instanceof InsufficientBalanceError) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: `Insufficient balance. Need ${microsToSparks(estimatedCostMicros)} Sparks.`,
          });
        }
        throw err;
      }

      try {
        await ctx.env.DB.prepare(
          `INSERT INTO generation_jobs (id, game_id, pack_id, theme_id, status, style, created_at)
           VALUES (?, ?, ?, ?, 'queued', ?, ?)`
        ).bind(jobId, input.gameId, packId, themeId, 'pixel', now).run();

        for (const templateId of templateIds) {
          const template = definition.templates?.[templateId];
          const physics = template?.physics;
          const tags = template?.tags ?? [];

          let entityType: EntityType = 'item';
          if (tags.includes('player') || tags.includes('character')) entityType = 'character';
          else if (tags.includes('enemy')) entityType = 'enemy';
          else if (tags.includes('platform') || tags.includes('wall') || tags.includes('ground')) entityType = 'platform';
          else if (tags.includes('background')) entityType = 'background';
          else if (tags.includes('ui')) entityType = 'ui';

          const physicsContext = physics ? {
            shape: physics.shape,
            width: physics.width,
            height: physics.height,
            radius: physics.radius,
          } : { shape: 'box' as const, width: 1, height: 1 };

          const dimensions = getTargetDimensions(
            physicsContext.shape,
            physicsContext.width,
            physicsContext.height
          );

          const style: SpriteStyle = 'pixel';

          const compiledPrompt = buildStructuredPrompt({
            templateId,
            physicsShape: physicsContext.shape as 'box' | 'circle' | 'polygon',
            physicsWidth: physicsContext.width,
            physicsHeight: physicsContext.height,
            physicsRadius: physicsContext.radius,
            entityType,
            themePrompt: undefined,
            style,
            targetWidth: dimensions.width,
            targetHeight: dimensions.height,
          });

          const compiledNegativePrompt = buildStructuredNegativePrompt(style);

          const taskId = crypto.randomUUID();

          await ctx.env.DB.prepare(
            `INSERT INTO generation_tasks (id, job_id, template_id, status, compiled_prompt, compiled_negative_prompt, target_width, target_height, created_at)
             VALUES (?, ?, ?, 'queued', ?, ?, ?, ?, ?)`
          ).bind(
            taskId,
            jobId,
            templateId,
            compiledPrompt,
            compiledNegativePrompt,
            dimensions.width,
            dimensions.height,
            now
          ).run();
        }

        // Set as active pack if requested
        if (input.setAsActive) {
          definition.assetSystem = definition.assetSystem || {};
          definition.assetSystem.activePackId = packId;

          await ctx.env.DB.prepare(
            'UPDATE games SET definition = ?, updated_at = ? WHERE id = ?'
          ).bind(JSON.stringify(definition), now, input.gameId).run();
        }

        return { themeId, packId, jobId, taskCount: templateIds.length };
      } catch (jobCreationError) {
        await walletService.credit({
          userId: ctx.user.id,
          type: 'generation_refund',
          amountMicros: estimatedCostMicros,
          referenceType: 'generation_job',
          referenceId: jobId,
          idempotencyKey: `gen_refund_${jobId}`,
          description: `Refund: job creation failed`,
        });
        throw jobCreationError;
      }
    }),
});
