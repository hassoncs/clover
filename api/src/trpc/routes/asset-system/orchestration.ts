import { protectedProcedure, router } from '../../index'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import {
  buildStructuredPrompt,
  type EntityType,
} from '@/ai/assets'
import { WalletService, InsufficientBalanceError } from '@/economy/wallet-service'
import { RATE_LIMITS, USER_COSTS, microsToSparks } from '@/economy/pricing'
import { generateThemePlan } from '@/ai/pipeline/theme-planner'
import type { ThemePlan } from '@/ai/pipeline/theme-plan'
import type { GameRowForAssets } from './types'
import { getTargetDimensions, buildPlannerInput } from './utils'

export const orchestrationRouter = router({
  applyThemeToGame: protectedProcedure
    .input(z.object({
      gameId: z.string(),
      themeId: z.string().optional(),
      newTheme: z.object({
        name: z.string().min(1).max(100),
        promptModifier: z.string().min(1),
      }).optional(),
      styleOverride: z.string().optional(),
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

      const gameRow = await ctx.env.DB.prepare(
        'SELECT id, base_game_id FROM games WHERE id = ? AND deleted_at IS NULL'
      ).bind(input.gameId).first<GameRowForAssets>();

      if (!gameRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }

      const baseGameId = gameRow.base_game_id ?? gameRow.id;

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
        ).bind(jobId, input.gameId, packId, themeId, input.styleOverride ?? null, now).run();

        let themePlan: ThemePlan | null = null;
        const plannerEnabled = ctx.env.THEME_PLANNER_ENABLED !== 'false';
        if (!plannerEnabled) {
          console.log('[AssetSystem] Theme planner: disabled via THEME_PLANNER_ENABLED=false');
        }
        if (plannerEnabled && ctx.env.OPENROUTER_API_KEY) {
          const themeRow = await ctx.env.DB.prepare(
            'SELECT prompt_modifier FROM themes WHERE id = ? AND deleted_at IS NULL'
          ).bind(themeId).first<{ prompt_modifier: string }>();

          if (themeRow) {
            console.log('[AssetSystem] Theme planner: generating plan for applyThemeToGame');
            const plannerInput = buildPlannerInput(
              definition,
              templateIds,
              themeRow.prompt_modifier,
              input.styleOverride,
            );
            themePlan = await generateThemePlan(plannerInput, ctx.env.OPENROUTER_API_KEY);

            if (themePlan) {
              console.log('[AssetSystem] Theme planner: plan generated successfully');
              await ctx.env.DB.prepare(
                `UPDATE generation_jobs SET theme_plan_json = ? WHERE id = ?`
              ).bind(JSON.stringify(themePlan), jobId).run();
            } else {
              console.log('[AssetSystem] Theme planner: plan generation failed, falling back to buildStructuredPrompt');
            }
          }
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

          let compiledPrompt: string;
          if (themePlan && themePlan.templatePlans[templateId]) {
            compiledPrompt = themePlan.templatePlans[templateId].prompt;
          } else {
            compiledPrompt = buildStructuredPrompt({
              templateId,
              physicsShape: physicsContext.shape as 'box' | 'circle' | 'polygon',
              physicsWidth: physicsContext.width,
              physicsHeight: physicsContext.height,
              physicsRadius: physicsContext.radius,
              entityType,
              themePrompt: undefined,
              style: input.styleOverride,
              targetWidth: dimensions.width,
              targetHeight: dimensions.height,
            });
          }

          const taskId = crypto.randomUUID();

          await ctx.env.DB.prepare(
            `INSERT INTO generation_tasks (id, job_id, template_id, status, compiled_prompt, target_width, target_height, created_at)
             VALUES (?, ?, ?, 'queued', ?, ?, ?, ?)`
          ).bind(
            taskId,
            jobId,
            templateId,
            compiledPrompt,
            dimensions.width,
            dimensions.height,
            now
          ).run();
        }

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
