import { protectedProcedure, router } from '../index';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  AssetService,
  getImageGenerationConfig,
  buildStructuredPrompt,
  buildStructuredNegativePrompt,
  type EntityType,
  type SpriteStyle,
} from '../../ai/assets';
import { migrateAssetPacks, rollbackMigration } from '../../migrations/migrate-asset-packs';
import { isLegacyUrl } from '@slopcade/shared';
import { buildAssetPath, isStoredR2Key } from '@slopcade/shared/utils/asset-url';
import { WalletService, InsufficientBalanceError } from '../../economy/wallet-service';
import { PROVIDER_COSTS, RATE_LIMITS, microsToSparks, USER_COSTS } from '../../economy/pricing';
import { createWorkersAdapters as createWorkersAdaptersImpl } from '../../ai/pipeline/adapters/workers';

import type { AssetRun, DebugEvent, UIComponentSheetSpec } from '../../ai/pipeline/types';
import { uiBaseStateStage, uiVariationStatesStage } from '../../ai/pipeline/stages/ui-component';
import { getControlBaseState, getControlConfig } from '../../ai/pipeline/ui-control-config';
import type { Env } from '../context';

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

function resolveStoredAssetUrl(storedValue: string | null, assetHost: string | undefined): string | null {
  if (!storedValue) return null;

  // No configured asset host: preserve old behavior (API serves /assets/* locally)
  if (!assetHost) {
    if (isLegacyUrl(storedValue)) return storedValue;
    return `/assets/${storedValue}`;
  }

  const cleanBaseUrl = assetHost.endsWith('/') ? assetHost.slice(0, -1) : assetHost;

  if (isLegacyUrl(storedValue)) {
    // passthrough (http/https/data/res) OR relative /assets/*
    if (storedValue.startsWith('/assets/')) {
      return `${cleanBaseUrl}${storedValue}`;
    }
    return storedValue;
  }

  if (isStoredR2Key(storedValue)) {
    return `${cleanBaseUrl}/${storedValue}`;
  }

  // Fallback: treat as relative path under the asset host
  return `${cleanBaseUrl}/${storedValue}`;
}

interface GameAssetRow {
  id: string;
  owner_game_id: string | null;
  source: string;
  image_url: string;
  width: number | null;
  height: number | null;
  content_hash: string | null;
  created_at: number;
  deleted_at: number | null;
}

interface AssetPackRow {
  id: string;
  game_id: string;
  base_game_id: string | null;
  name: string;
  description: string | null;
  component_type?: UIComponentSheetSpec['componentType'] | null;
  nine_patch_margins_json?: string | null;
  prompt_defaults_json: string | null;
  created_at: number;
  deleted_at: number | null;
}

interface AssetPackUIInfoRow {
  component_type: UIComponentSheetSpec['componentType'] | null;
  nine_patch_margins_json: string | null;
  prompt_defaults_json: string | null;
}

interface GameRowForAssets {
  id: string;
  base_game_id: string | null;
  definition: string;
}

interface AssetPackEntryRow {
  id: string;
  pack_id: string;
  template_id: string;
  asset_id: string;
  placement_json: string | null;
  last_generation_json: string | null;
}

interface GenerationJobRow {
  id: string;
  game_id: string;
  pack_id: string | null;
  status: string;
  prompt_defaults_json: string | null;
  created_at: number;
  started_at: number | null;
  finished_at: number | null;
}

interface GenerationTaskRow {
  id: string;
  job_id: string;
  template_id: string;
  status: string;
  prompt_components_json: string | null;
  compiled_prompt: string | null;
  compiled_negative_prompt: string | null;
  model_id: string | null;
  target_width: number | null;
  target_height: number | null;
  aspect_ratio: string | null;
  physics_context_json: string | null;
  scenario_request_id: string | null;
  asset_id: string | null;
  error_code: string | null;
  error_message: string | null;
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



function toClientAsset(row: GameAssetRow, assetHost: string | undefined) {
  return {
    id: row.id,
    ownerGameId: row.owner_game_id,
    source: row.source as 'generated' | 'uploaded',
    imageUrl: resolveStoredAssetUrl(row.image_url, assetHost),
    width: row.width,
    height: row.height,
    contentHash: row.content_hash,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  };
}

function toClientPack(row: AssetPackRow) {
  return {
    id: row.id,
    gameId: row.game_id,
    baseGameId: row.base_game_id,
    name: row.name,
    description: row.description,
    promptDefaults: row.prompt_defaults_json ? JSON.parse(row.prompt_defaults_json) : undefined,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  };
}

function toClientEntry(row: AssetPackEntryRow) {
  return {
    id: row.id,
    packId: row.pack_id,
    templateId: row.template_id,
    assetId: row.asset_id,
    placement: row.placement_json ? JSON.parse(row.placement_json) : undefined,
    lastGeneration: row.last_generation_json ? JSON.parse(row.last_generation_json) : undefined,
  };
}

function toClientJob(row: GenerationJobRow) {
  return {
    id: row.id,
    gameId: row.game_id,
    packId: row.pack_id,
    status: row.status as 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled',
    promptDefaults: row.prompt_defaults_json ? JSON.parse(row.prompt_defaults_json) : {},
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
    promptComponents: row.prompt_components_json ? JSON.parse(row.prompt_components_json) : {},
    compiledPrompt: row.compiled_prompt,
    compiledNegativePrompt: row.compiled_negative_prompt,
    modelId: row.model_id,
    targetWidth: row.target_width,
    targetHeight: row.target_height,
    aspectRatio: row.aspect_ratio,
    physicsContext: row.physics_context_json ? JSON.parse(row.physics_context_json) : undefined,
    scenarioRequestId: row.scenario_request_id,
    assetId: row.asset_id,
    errorCode: row.error_code,
    errorMessage: row.error_message,
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
        'SELECT * FROM game_assets WHERE id = ? AND deleted_at IS NULL'
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
      let query = 'SELECT * FROM game_assets WHERE deleted_at IS NULL';
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
      imageUrl: z.string(),
      width: z.number().optional(),
      height: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = crypto.randomUUID();
      const now = Date.now();

      await ctx.env.DB.prepare(
        `INSERT INTO game_assets (id, owner_game_id, source, image_url, width, height, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(id, input.ownerGameId ?? null, input.source, input.imageUrl, input.width ?? null, input.height ?? null, now).run();

      return { id, createdAt: now };
    }),

  deleteAsset: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const now = Date.now();
      await ctx.env.DB.prepare(
        'UPDATE game_assets SET deleted_at = ? WHERE id = ?'
      ).bind(now, input.id).run();
      return { success: true };
    }),

  getPack: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const packRow = await ctx.env.DB.prepare(
        'SELECT * FROM asset_packs WHERE id = ? AND deleted_at IS NULL'
      ).bind(input.id).first<AssetPackRow>();

      if (!packRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Asset pack not found' });
      }

      const entriesResult = await ctx.env.DB.prepare(
        `SELECT e.*, a.image_url, a.width as asset_width, a.height as asset_height
         FROM asset_pack_entries e
         LEFT JOIN game_assets a ON e.asset_id = a.id
         WHERE e.pack_id = ?`
      ).bind(input.id).all<AssetPackEntryRow & { image_url: string | null; asset_width: number | null; asset_height: number | null }>();

      return {
        ...toClientPack(packRow),
        entries: entriesResult.results.map(row => ({
          ...toClientEntry(row),
          imageUrl: resolveStoredAssetUrl(row.image_url, ctx.env.ASSET_HOST),
          assetWidth: row.asset_width,
          assetHeight: row.asset_height,
        })),
      };
    }),

  listPacks: protectedProcedure
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
      promptDefaults: promptDefaultsSchema.optional(),
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
        `INSERT INTO asset_packs (id, game_id, base_game_id, name, description, prompt_defaults_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id,
        input.gameId,
        baseGameId,
        input.name,
        input.description ?? null,
        input.promptDefaults ? JSON.stringify(input.promptDefaults) : null,
        now
      ).run();

      return { id, baseGameId, createdAt: now };
    }),

  updatePack: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      promptDefaults: promptDefaultsSchema.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updates: string[] = [];
      const values: (string | null)[] = [];

      if (input.name !== undefined) {
        updates.push('name = ?');
        values.push(input.name);
      }
      if (input.description !== undefined) {
        updates.push('description = ?');
        values.push(input.description);
      }
      if (input.promptDefaults !== undefined) {
        updates.push('prompt_defaults_json = ?');
        values.push(JSON.stringify(input.promptDefaults));
      }

      if (updates.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No fields to update' });
      }

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
        `INSERT INTO asset_pack_entries (id, pack_id, template_id, asset_id, placement_json)
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
        `UPDATE asset_pack_entries SET placement_json = ? WHERE pack_id = ? AND template_id = ?`
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
        'DELETE FROM asset_pack_entries WHERE pack_id = ? AND template_id = ?'
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

      let packUiInfo: AssetPackUIInfoRow | null = null;
      if (input.packId) {
        packUiInfo = await ctx.env.DB.prepare(
          `SELECT component_type, nine_patch_margins_json, prompt_defaults_json 
           FROM asset_packs WHERE id = ? AND deleted_at IS NULL`
        ).bind(input.packId).first<AssetPackUIInfoRow>();
      }

      const isUiComponentPack = Boolean(packUiInfo?.component_type);

      const margin = USER_COSTS.ASSET_ENTITY / PROVIDER_COSTS.SCENARIO_IMG2IMG;
      const removeBgCostMicros = Math.ceil(PROVIDER_COSTS.SCENARIO_REMOVE_BG * margin);
      const uiBaseOpCostMicros = USER_COSTS.ASSET_ENTITY + removeBgCostMicros;

      const requestedStates = input.promptDefaults.states;
      const uiComponentType = packUiInfo?.component_type ?? null;
      const uiBaseState = uiComponentType ? getControlBaseState(uiComponentType) : 'normal';

      const uiStates = (requestedStates && requestedStates.length > 0)
        ? requestedStates
        : (uiComponentType ? getControlConfig(uiComponentType).states : ['normal']);

      const estimatedCostMicros = isUiComponentPack
        ? uiStates.reduce((sum, state) => sum + (state === uiBaseState ? uiBaseOpCostMicros : uiBaseOpCostMicros * 2), 0)
        : input.templateIds.length * USER_COSTS.ASSET_ENTITY;
      const jobId = crypto.randomUUID();

      try {
        await walletService.debit({
          userId: ctx.user.id,
          type: 'generation_debit',
          amountMicros: -estimatedCostMicros,
          referenceType: 'generation_job',
          referenceId: jobId,
          idempotencyKey: `gen_debit_${jobId}`,
          description: isUiComponentPack
            ? `UI component generation for ${uiStates.length} states`
            : `Asset generation for ${input.templateIds.length} templates`,
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
          `INSERT INTO generation_jobs (id, game_id, pack_id, status, prompt_defaults_json, created_at)
           VALUES (?, ?, ?, 'queued', ?, ?)`
        ).bind(jobId, input.gameId, input.packId ?? null, JSON.stringify(input.promptDefaults), now).run();

        if (isUiComponentPack && uiComponentType) {
          for (const state of uiStates) {
            const taskId = crypto.randomUUID();
            await ctx.env.DB.prepare(
              `INSERT INTO generation_tasks (id, job_id, template_id, status, prompt_components_json, created_at)
               VALUES (?, ?, ?, 'queued', ?, ?)`
            ).bind(
              taskId,
              jobId,
              state,
              JSON.stringify({ componentType: uiComponentType, state }),
              now
            ).run();
          }

          return { jobId, taskCount: uiStates.length };
        }

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

          const promptComponents = {
            themePrompt: input.promptDefaults.themePrompt,
            templateId,
            entityType,
            styleOverride,
            physicsShape: physicsContext.shape,
            physicsWidth: physicsContext.width,
            physicsHeight: physicsContext.height,
          };

          const taskId = crypto.randomUUID();

          await ctx.env.DB.prepare(
            `INSERT INTO generation_tasks (id, job_id, template_id, status, prompt_components_json, compiled_prompt, compiled_negative_prompt, model_id, target_width, target_height, aspect_ratio, physics_context_json, created_at)
             VALUES (?, ?, ?, 'queued', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            taskId,
            jobId,
            templateId,
            JSON.stringify(promptComponents),
            compiledPrompt,
            compiledNegativePrompt,
            input.promptDefaults.modelId ?? null,
            dimensions.width,
            dimensions.height,
            dimensions.aspectRatio,
            JSON.stringify(physicsContext),
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

      const packUiInfo = await ctx.env.DB.prepare(
        `SELECT component_type, nine_patch_margins_json, prompt_defaults_json
         FROM asset_packs WHERE id = ? AND deleted_at IS NULL`
      ).bind(input.packId).first<AssetPackUIInfoRow>();

      const isUiComponentPack = Boolean(packUiInfo?.component_type);

      const entriesResult = await ctx.env.DB.prepare(
        'SELECT template_id FROM asset_pack_entries WHERE pack_id = ?'
      ).bind(input.packId).all<{ template_id: string }>();

      const templateIds = entriesResult.results.map(e => e.template_id);

      if (templateIds.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Pack has no entries to regenerate' });
      }

      const margin = USER_COSTS.ASSET_ENTITY / PROVIDER_COSTS.SCENARIO_IMG2IMG;
      const removeBgCostMicros = Math.ceil(PROVIDER_COSTS.SCENARIO_REMOVE_BG * margin);
      const uiBaseOpCostMicros = USER_COSTS.ASSET_ENTITY + removeBgCostMicros;

      const uiStates = isUiComponentPack && packUiInfo?.component_type
        ? getControlConfig(packUiInfo.component_type).states
        : ['normal'];

      const estimatedCostMicros = isUiComponentPack
        ? uiStates.reduce((sum, state) => sum + (state === 'normal' ? uiBaseOpCostMicros : uiBaseOpCostMicros * 2), 0)
        : templateIds.length * USER_COSTS.ASSET_ENTITY;
      const jobId = crypto.randomUUID();

      try {
        await walletService.debit({
          userId: ctx.user.id,
          type: 'generation_debit',
          amountMicros: -estimatedCostMicros,
          referenceType: 'generation_job',
          referenceId: jobId,
          idempotencyKey: `gen_debit_${jobId}`,
          description: isUiComponentPack
            ? `UI component regeneration for ${uiStates.length} states`
            : `Asset regeneration for ${templateIds.length} templates`,
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
      ).bind(packRow.game_id).first<{ definition: string }>();

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
      const newPromptDefaults = {
        ...(packUiInfo?.prompt_defaults_json ? JSON.parse(packUiInfo.prompt_defaults_json) : {}),
        themePrompt: input.newTheme,
        styleOverride: input.newStyle,
      };

      await ctx.env.DB.prepare(
        `UPDATE asset_packs SET prompt_defaults_json = ? WHERE id = ?`
      ).bind(JSON.stringify(newPromptDefaults), input.packId).run();

      try {
        await ctx.env.DB.prepare(
          `INSERT INTO generation_jobs (id, game_id, pack_id, status, prompt_defaults_json, created_at)
           VALUES (?, ?, ?, 'queued', ?, ?)`
        ).bind(jobId, packRow.game_id, input.packId, JSON.stringify(newPromptDefaults), now).run();

        if (isUiComponentPack && packUiInfo?.component_type) {
          for (const state of uiStates) {
            const taskId = crypto.randomUUID();
            await ctx.env.DB.prepare(
              `INSERT INTO generation_tasks (id, job_id, template_id, status, prompt_components_json, created_at)
               VALUES (?, ?, ?, 'queued', ?, ?)`
            ).bind(
              taskId,
              jobId,
              state,
              JSON.stringify({ componentType: packUiInfo.component_type, state }),
              now
            ).run();
          }

          return { jobId, taskCount: uiStates.length };
        }

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

          const promptComponents = {
            themePrompt: input.newTheme,
            templateId,
            entityType,
            styleOverride,
            physicsShape: physicsContext.shape,
            physicsWidth: physicsContext.width,
            physicsHeight: physicsContext.height,
          };

          const taskId = crypto.randomUUID();

          await ctx.env.DB.prepare(
            `INSERT INTO generation_tasks (id, job_id, template_id, status, prompt_components_json, compiled_prompt, compiled_negative_prompt, model_id, target_width, target_height, aspect_ratio, physics_context_json, created_at)
             VALUES (?, ?, ?, 'queued', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            taskId,
            jobId,
            templateId,
            JSON.stringify(promptComponents),
            compiledPrompt,
            compiledNegativePrompt,
            newPromptDefaults.modelId ?? null,
            dimensions.width,
            dimensions.height,
            dimensions.aspectRatio,
            JSON.stringify(physicsContext),
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
      const providerConfig = getImageGenerationConfig(ctx.env);
      if (!providerConfig.configured) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: providerConfig.error ?? 'Image generation provider not configured',
        });
      }

      const jobRow = await ctx.env.DB.prepare(
        'SELECT * FROM generation_jobs WHERE id = ?'
      ).bind(input.jobId).first<GenerationJobRow>();

      if (!jobRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Job not found' });
      }

       let packUiInfo: AssetPackUIInfoRow | null = null;
       if (jobRow.pack_id) {
         packUiInfo = await ctx.env.DB.prepare(
           `SELECT component_type, nine_patch_margins_json, prompt_defaults_json 
            FROM asset_packs WHERE id = ? AND deleted_at IS NULL`
         ).bind(jobRow.pack_id).first<AssetPackUIInfoRow>();
       }

       const uiComponentType = packUiInfo?.component_type ?? null;
       const isUiComponentPack = Boolean(uiComponentType);

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

       const jobDefaults = jobRow.prompt_defaults_json ? JSON.parse(jobRow.prompt_defaults_json) : {};
       const shouldRemoveBackground = jobDefaults.removeBackground === true;

       const uiMargin = USER_COSTS.ASSET_ENTITY / PROVIDER_COSTS.SCENARIO_IMG2IMG;
       const uiRemoveBgCostMicros = Math.ceil(PROVIDER_COSTS.SCENARIO_REMOVE_BG * uiMargin);
       const uiOpCostMicros = USER_COSTS.ASSET_ENTITY + uiRemoveBgCostMicros;

        const uiAdapters = isUiComponentPack ? createWorkersAdapters(ctx.env) : null;

       const uiBaseState = uiComponentType ? getControlBaseState(uiComponentType) : 'normal';
       const uiConfig = uiComponentType ? getControlConfig(uiComponentType) : null;
       const uiNinePatchMargins = (() => {
         if (!uiComponentType) return null;
         if (packUiInfo?.nine_patch_margins_json) {
           try {
             return JSON.parse(packUiInfo.nine_patch_margins_json);
           } catch {
             return null;
           }
         }
         return uiConfig?.margins ?? null;
       })();

       const uiTheme = typeof jobDefaults.themePrompt === 'string' ? jobDefaults.themePrompt : '';
       const uiR2Prefix = `generated/${jobRow.game_id}/ui-theme`;

       for (const task of tasksResult.results) {
         const promptComponents = task.prompt_components_json ? JSON.parse(task.prompt_components_json) : {};
         const physicsContext = task.physics_context_json ? JSON.parse(task.physics_context_json) : {};
         jobLog('DEBUG', input.jobId, task.id, `Processing: ${task.template_id} (${promptComponents.entityType})`);
         jobLog('DEBUG', input.jobId, task.id, `Physics: shape=${physicsContext.shape}, width=${physicsContext.width}, height=${physicsContext.height}`);
         jobLog('DEBUG', input.jobId, task.id, `Target dimensions: ${task.target_width}x${task.target_height}`);
        const taskNow = Date.now();
        await ctx.env.DB.prepare(
          `UPDATE generation_tasks SET status = 'running', started_at = ? WHERE id = ?`
        ).bind(taskNow, task.id).run();

         try {
          const promptComponents = task.prompt_components_json ? JSON.parse(task.prompt_components_json) : {};

          if (isUiComponentPack && uiComponentType && uiAdapters && uiConfig && uiNinePatchMargins) {
            const state = task.template_id as UIComponentSheetSpec['states'][number];
            jobLog('DEBUG', input.jobId, task.id, `UI pack task: component=${uiComponentType}, state=${state}`);

            let capturedSilhouette: Uint8Array | null = null;
            const debugSink = async (event: DebugEvent) => {
              if (event.type !== 'artifact') return;
              if (event.stageId !== 'ui-base-state') return;
              if (event.name !== '1-silhouette.png') return;
              if (typeof event.data === 'string') return;
              capturedSilhouette = event.data;
            };

            const spec: UIComponentSheetSpec = {
              type: 'sheet',
              id: `${jobRow.pack_id ?? jobRow.game_id}-${uiComponentType}-${state}-${Date.now()}`,
              kind: 'ui_component',
              componentType: uiComponentType,
              states: [state],
              ninePatchMargins: uiNinePatchMargins,
              width: uiConfig.dimensions.width,
              height: uiConfig.dimensions.height,
              layout: { type: 'manual' },
              baseResolution: jobDefaults.baseResolution,
            };

            const runMeta = {
              gameId: jobRow.game_id,
              packId: jobRow.pack_id ?? crypto.randomUUID(),
              assetId: crypto.randomUUID(),
              gameTitle: `UI Pack - ${uiComponentType}`,
              theme: uiTheme,
              style: 'flat' as const,
              r2Prefix: uiR2Prefix,
              startedAt: Date.now(),
              runId: crypto.randomUUID(),
            };

            const run: AssetRun<UIComponentSheetSpec> = {
              spec,
              artifacts: {},
              meta: runMeta,
            };

            const afterBase = await uiBaseStateStage.run(run, uiAdapters, debugSink);
            const afterVariations = await uiVariationStatesStage.run(afterBase, uiAdapters, debugSink);

            if (!afterVariations.artifacts.stateImages?.[state]) {
              throw new Error(`UI pipeline did not produce image for state: ${state}`);
            }

            if (!jobRow.pack_id) {
              throw new Error('UI component generation requires pack_id');
            }

            const assetId = crypto.randomUUID();
            const stateR2Key = buildAssetPath(jobRow.game_id, jobRow.pack_id, assetId);
            const silhouetteR2Key = stateR2Key.replace(/\.png$/, '-silhouette.png');

            await uiAdapters.r2.put(stateR2Key, afterVariations.artifacts.stateImages[state], { contentType: 'image/png' });

            let silhouetteUrl: string | null = null;
            if (capturedSilhouette) {
              await uiAdapters.r2.put(silhouetteR2Key, capturedSilhouette, { contentType: 'image/png' });
              silhouetteUrl = resolveStoredAssetUrl(silhouetteR2Key, ctx.env.ASSET_HOST);
            }
            const assetNow = Date.now();

            await ctx.env.DB.prepare(
              `INSERT INTO game_assets (id, owner_game_id, source, image_url, width, height, created_at)
               VALUES (?, ?, 'generated', ?, ?, ?, ?)`
            ).bind(assetId, jobRow.game_id, stateR2Key, uiConfig.dimensions.width, uiConfig.dimensions.height, assetNow).run();

            await ctx.env.DB.prepare(
              `UPDATE generation_tasks SET status = 'succeeded', asset_id = ?, finished_at = ? WHERE id = ?`
            ).bind(assetId, Date.now(), task.id).run();

            const operationMultiplier = state === uiBaseState ? 1 : 2;
            const costMicros = uiOpCostMicros * operationMultiplier;
            const costId = crypto.randomUUID();
            await ctx.env.DB.prepare(
              `INSERT INTO operation_costs (id, user_id, operation_type, estimated_cost_micros, charged_cost_micros, reference_type, reference_id, created_at)
               VALUES (?, ?, 'scenario_txt2img', ?, ?, 'generation_task', ?, ?)`
            ).bind(costId, ctx.user.id, costMicros, costMicros, task.id, assetNow).run();

            if (jobRow.pack_id) {
              const entryId = crypto.randomUUID();
              const lastGenJson = JSON.stringify({
                jobId: input.jobId,
                taskId: task.id,
                componentType: uiComponentType,
                state,
                silhouetteUrl,
                r2Key: stateR2Key,
                publicUrl: resolveStoredAssetUrl(stateR2Key, ctx.env.ASSET_HOST),
                metadataUrl: null,
                r2Keys: capturedSilhouette ? [stateR2Key, silhouetteR2Key] : [stateR2Key],
                createdAt: assetNow,
              });

              await ctx.env.DB.prepare(
                `INSERT INTO asset_pack_entries (id, pack_id, template_id, asset_id, last_generation_json)
                 VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT(pack_id, template_id) DO UPDATE SET
                   asset_id = excluded.asset_id,
                   last_generation_json = excluded.last_generation_json`
              ).bind(entryId, jobRow.pack_id, state, assetId, lastGenJson).run();
            }

            jobLog('INFO', input.jobId, task.id, `UI task succeeded - Asset: ${assetId}`);
            successCount++;
            continue;
          }

          const entityType = (promptComponents.entityType ?? 'item') as EntityType;
          const style = (promptComponents.styleOverride ?? 'pixel') as SpriteStyle;

          const assetContext = jobRow.pack_id ? { gameId: jobRow.game_id, packId: jobRow.pack_id } : undefined;
          
          let result = await assetService.generateDirect({
            prompt: task.compiled_prompt ?? '',
            negativePrompt: task.compiled_negative_prompt ?? buildStructuredNegativePrompt(style),
            entityType,
            style,
            width: task.target_width ?? 512,
            height: task.target_height ?? 512,
            strength: jobDefaults.strength,
            guidance: jobDefaults.guidance,
            seed: jobDefaults.seed,
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
              `INSERT INTO game_assets (id, owner_game_id, source, image_url, width, height, created_at)
               VALUES (?, ?, 'generated', ?, ?, ?, ?)`
            ).bind(assetId, jobRow.game_id, result.r2Key, task.target_width, task.target_height, assetNow).run();

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
              const lastGenJson = JSON.stringify({
                jobId: input.jobId,
                taskId: task.id,
                compiledPrompt: task.compiled_prompt,
                backgroundRemoved: shouldRemoveBackground,
                silhouetteUrl: result.silhouetteUrl,
                strength: jobDefaults.strength,
                guidance: jobDefaults.guidance,
                seed: jobDefaults.seed,
                style: jobDefaults.styleOverride,
                createdAt: assetNow,
              });

              await ctx.env.DB.prepare(
                `INSERT INTO asset_pack_entries (id, pack_id, template_id, asset_id, last_generation_json)
                 VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT(pack_id, template_id) DO UPDATE SET
                   asset_id = excluded.asset_id,
                   last_generation_json = excluded.last_generation_json`
              ).bind(entryId, jobRow.pack_id, task.template_id, assetId, lastGenJson).run();
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
        `UPDATE generation_tasks SET status = 'queued', error_code = NULL, error_message = NULL, started_at = NULL, finished_at = NULL WHERE job_id = ? AND status = 'failed'`
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

      let definition: Record<string, unknown>;
      try {
        definition = JSON.parse(gameRow.definition);
      } catch {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Invalid game definition' });
      }

      if (!definition.assetSystem) {
        definition.assetSystem = {};
      }
      (definition.assetSystem as Record<string, unknown>).activeAssetPackId = input.packId;

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
        `SELECT e.template_id, e.placement_json, a.image_url
         FROM asset_pack_entries e
         LEFT JOIN game_assets a ON e.asset_id = a.id
         WHERE e.pack_id = ?`
      ).bind(input.packId).all<{ template_id: string; placement_json: string | null; image_url: string | null }>();

      const entriesByTemplateId: Record<string, { imageUrl: string | null; placement: { scale: number; offsetX: number; offsetY: number } | null }> = {};

      for (const entry of entriesResult.results) {
        entriesByTemplateId[entry.template_id] = {
          imageUrl: resolveStoredAssetUrl(entry.image_url, ctx.env.ASSET_HOST),
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
            'SELECT template_id FROM asset_pack_entries WHERE pack_id = ?'
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

  runMigration: protectedProcedure
    .mutation(async ({ ctx }) => {
      const result = await migrateAssetPacks(ctx.env.DB);
      return result;
    }),

  rollbackMigration: protectedProcedure
    .mutation(async ({ ctx }) => {
      const result = await rollbackMigration(ctx.env.DB);
      return result;
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
        INSERT INTO generation_jobs (id, game_id, pack_id, status, prompt_defaults_json, created_at)
        VALUES (?, ?, ?, 'queued', ?, ?)
      `).bind(jobId, gameId, packId, JSON.stringify({ sheetSpec }), now).run();

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

      const packUiInfo = await ctx.env.DB.prepare(
        `SELECT component_type, nine_patch_margins_json, prompt_defaults_json
         FROM asset_packs WHERE id = ? AND deleted_at IS NULL`
      ).bind(input.packId).first<AssetPackUIInfoRow>();

      const isUiComponentPack = Boolean(packUiInfo?.component_type);

      if (isUiComponentPack) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'regenerateAssets does not support UI component packs',
        });
      }

      const entriesResult = await ctx.env.DB.prepare(
        'SELECT template_id FROM asset_pack_entries WHERE pack_id = ?'
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
      ).bind(packRow.game_id).first<{ definition: string }>();

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
      const existingPromptDefaults = packUiInfo?.prompt_defaults_json
        ? JSON.parse(packUiInfo.prompt_defaults_json)
        : {};

      const mergedPromptDefaults = {
        ...existingPromptDefaults,
        themePrompt: input.newTheme ?? existingPromptDefaults.themePrompt,
        styleOverride: input.newStyle ?? existingPromptDefaults.styleOverride,
      };

      await ctx.env.DB.prepare(
        `UPDATE asset_packs SET prompt_defaults_json = ? WHERE id = ?`
      ).bind(JSON.stringify(mergedPromptDefaults), input.packId).run();

      try {
        await ctx.env.DB.prepare(
          `INSERT INTO generation_jobs (id, game_id, pack_id, status, prompt_defaults_json, created_at)
           VALUES (?, ?, ?, 'queued', ?, ?)`
        ).bind(jobId, packRow.game_id, input.packId, JSON.stringify(mergedPromptDefaults), now).run();

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
          const themePrompt = input.newTheme ?? mergedPromptDefaults.themePrompt;
          const styleOverride = (input.newStyle ?? mergedPromptDefaults.styleOverride ?? 'pixel') as SpriteStyle;

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

          const promptComponents = {
            themePrompt,
            templateId,
            entityType,
            styleOverride,
            physicsShape: physicsContext.shape,
            physicsWidth: physicsContext.width,
            physicsHeight: physicsContext.height,
          };

          const taskId = crypto.randomUUID();

          await ctx.env.DB.prepare(
            `INSERT INTO generation_tasks (id, job_id, template_id, status, prompt_components_json, compiled_prompt, compiled_negative_prompt, model_id, target_width, target_height, aspect_ratio, physics_context_json, created_at)
             VALUES (?, ?, ?, 'queued', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            taskId,
            jobId,
            templateId,
            JSON.stringify(promptComponents),
            compiledPrompt,
            compiledNegativePrompt,
            mergedPromptDefaults.modelId ?? null,
            dimensions.width,
            dimensions.height,
            dimensions.aspectRatio,
            JSON.stringify(physicsContext),
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
});
