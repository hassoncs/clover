import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { ArtifactManager } from '@/ai/agent/artifact-manager';
import { AgentRunReconciliationService } from '@/ai/agent/reconciliation';
import { estimateRunCost, resolveTierConfig } from '@/ai/agent/tier-config';
import { GameDefinitionSchema } from '@/ai/game/schemas';
import { validateGameDefinition } from '@/ai/game/validator';
import { validateGame, getValidationReportJson } from '@/validation/gameValidator';
import { AgentBillingService } from '@/economy/agent-billing-service';
import { WalletService } from '@/economy/wallet-service';
import { getAgentFeatureFlags } from '@/agent/feature-flags';
import { logAgentEvent } from '@/agent/observability';
import { loadGatesConfig, validatePlanningDoc } from '@/agent/planning-gates';

import { protectedProcedure, router } from '../index';
import {
  type AgentRunRow,
  type AgentStepRow,
  type AgentEventRow,
  type GameOwnerRow,
  toRun,
  toStep,
  toEvent,
  toSnapshot,
  getRunForUserOrThrow,
  getLastSeq,
  resumeRunFromCheckpoint,
} from './agent-runs-service';

export const agentRunsRouter = router({
  createRun: protectedProcedure
    .input(
      z
        .object({
          gameId: z.string().uuid(),
          threadId: z.string().uuid().optional(),
          source: z.enum(['scratch', 'fork']),
          sourceGameId: z.string().uuid().optional(),
          tier: z.enum(['free', 'standard', 'pro']),
        })
        .superRefine((value, issueCtx) => {
          if (value.source === 'fork' && !value.sourceGameId) {
            issueCtx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'sourceGameId is required when source is fork',
              path: ['sourceGameId'],
            });
          }
        })
    )
    .mutation(async ({ ctx, input }) => {
      const flags = getAgentFeatureFlags(ctx.env);
      const activeRunsResult = await ctx.env.DB
        .prepare(
          `SELECT COUNT(*) as count
           FROM agent_runs
           WHERE user_id = ? AND status IN ('planning', 'queued', 'running', 'waiting_for_input', 'paused')`
        )
        .bind(ctx.user.id)
        .first<{ count: number }>();

      const activeRunCount = activeRunsResult?.count ?? 0;
      if (activeRunCount >= flags.maxConcurrentRunsPerUser) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Maximum concurrent runs (${flags.maxConcurrentRunsPerUser}) reached. Please wait for existing runs to complete.`,
        });
      }

      const game = await ctx.env.DB
        .prepare('SELECT id, user_id FROM games WHERE id = ? AND deleted_at IS NULL')
        .bind(input.gameId)
        .first<GameOwnerRow>();

      if (!game) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }
      if (game.user_id !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot create run for game you do not own' });
      }

      resolveTierConfig(input.tier);
      const totalSteps = 1;
      const runStages: AgentStepRow['stage'][] = ['chat'];
      const estimatedCost = estimateRunCost(input.tier, totalSteps);
      const now = Date.now();
      const runId = crypto.randomUUID();

      await ctx.env.DB.prepare(
        `INSERT INTO agent_runs (
          id, user_id, thread_id, game_id, source, source_game_id, tier, status,
          planning_doc_json, estimated_cost_micros, actual_cost_micros, reserved_micros,
          current_step_index, total_steps, error_message, created_at, started_at, finished_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'planning', NULL, ?, 0, 0, 0, ?, NULL, ?, NULL, NULL, ?)`
      )
        .bind(
          runId,
          ctx.user.id,
          input.threadId ?? null,
          input.gameId,
          input.source,
          input.sourceGameId ?? null,
          input.tier,
          estimatedCost.totalMicros,
          totalSteps,
          now,
          now
        )
        .run();

      for (let stepIndex = 0; stepIndex < runStages.length; stepIndex += 1) {
        await ctx.env.DB.prepare(
          `INSERT INTO agent_steps (
            id, run_id, step_index, stage, status,
            input_hash, output_artifact_key, cost_micros, error_message, created_at, started_at, finished_at
          ) VALUES (?, ?, ?, ?, 'queued', NULL, NULL, 0, NULL, ?, NULL, NULL)`
        )
          .bind(crypto.randomUUID(), runId, stepIndex, runStages[stepIndex], now)
          .run();
      }

      logAgentEvent({
        event: 'agent_run.created',
        runId,
        userId: ctx.user.id,
        tier: input.tier,
        metadata: {
          source: input.source,
          gameId: input.gameId,
          estimatedCostMicros: estimatedCost.totalMicros,
        },
      });

      return {
        runId,
        estimatedCost,
      };
    }),

  getRun: protectedProcedure
    .input(z.object({ runId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const run = await getRunForUserOrThrow(ctx.env.DB, input.runId, ctx.user.id);
      const stepsResult = await ctx.env.DB
        .prepare('SELECT * FROM agent_steps WHERE run_id = ? ORDER BY step_index ASC')
        .bind(input.runId)
        .all<AgentStepRow>();

      const billing = new AgentBillingService(ctx.env.DB, new WalletService(ctx.env.DB));
      const costSummary = await billing.getRunCostSummary(input.runId);

      return {
        run: toRun(run),
        steps: stepsResult.results.map(toStep),
        costSummary,
      };
    }),

  listRuns: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      let query = 'SELECT * FROM agent_runs WHERE user_id = ?';
      const values: Array<string | number> = [ctx.user.id];

      if (input.gameId) {
        query += ' AND game_id = ?';
        values.push(input.gameId);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      values.push(input.limit, input.offset);

      const result = await ctx.env.DB.prepare(query).bind(...values).all<AgentRunRow>();

      return {
        runs: result.results.map(toRun),
        limit: input.limit,
        offset: input.offset,
      };
    }),

  updatePlanningDoc: protectedProcedure
    .input(
      z.object({
        runId: z.string().uuid(),
        planningDocJson: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const run = await getRunForUserOrThrow(ctx.env.DB, input.runId, ctx.user.id);
      if (run.status !== 'planning') {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Run must be in planning status' });
      }

      const now = Date.now();
      await ctx.env.DB
        .prepare('UPDATE agent_runs SET planning_doc_json = ?, updated_at = ? WHERE id = ? AND user_id = ?')
        .bind(input.planningDocJson, now, input.runId, ctx.user.id)
        .run();

      return {
        runId: input.runId,
        updatedAt: now,
      };
    }),

  startRun: protectedProcedure
    .input(z.object({ runId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const run = await getRunForUserOrThrow(ctx.env.DB, input.runId, ctx.user.id);
      if (run.status !== 'planning') {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Run must be in planning status to start' });
      }

      const totalSteps = 1;
      const gatesConfigYaml = `gates:
  - id: core_game_loop
    label: Core Game Loop
    description: Describe the main gameplay loop - what does the player do repeatedly? (e.g., "Match 3 candies to clear them and score points")
    required: true

  - id: win_lose_conditions
    label: Win/Lose Conditions
    description: Define how the player wins or loses the game (e.g., "Win by reaching 1000 points, lose if time runs out")
    required: true

  - id: theme_style
    label: Theme & Style
    description: Describe the visual theme and art style (e.g., "Candy-themed with bright colors and cartoon style")
    required: true

  - id: game_type_category
    label: Game Type/Category
    description: What type of game is this? (e.g., "Match-3 puzzle", "Physics platformer", "Endless runner")
    required: true`;

      if (totalSteps > 1) {
        const gatesConfig = loadGatesConfig(gatesConfigYaml);
        const validation = validatePlanningDoc(run.planning_doc_json, gatesConfig);

        if (!validation.valid) {
          console.log('[agent-runs] Gate validation failed', {
            runId: run.id,
            userId: ctx.user.id,
            missingFields: validation.missingFields.map((f) => f.id),
          });

          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Planning document is incomplete. Please fill in all required fields before starting.',
            cause: {
              missingFields: validation.missingFields,
            },
          });
        }
      }

      const estimatedCostMicros =
        run.estimated_cost_micros ?? estimateRunCost(run.tier, totalSteps).totalMicros;

      const billing = new AgentBillingService(ctx.env.DB, new WalletService(ctx.env.DB));
      const reservation = await billing.reserveBudget({
        userId: ctx.user.id,
        runId: run.id,
        estimatedCostMicros,
      });

      const now = Date.now();
      await ctx.env.DB
        .prepare("UPDATE agent_runs SET status = 'queued', updated_at = ? WHERE id = ? AND user_id = ?")
        .bind(now, run.id, ctx.user.id)
        .run();

      const coordinatorId = ctx.env.RUN_COORDINATOR.idFromName(run.id);
      const coordinator = ctx.env.RUN_COORDINATOR.get(coordinatorId);
      const startResponse = await coordinator.fetch(`https://run-coordinator/internal/start?runId=${encodeURIComponent(run.id)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          totalSteps,
          rawPrompt: run.planning_doc_json,
        }),
      });

      if (!startResponse.ok) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to trigger run coordinator start' });
      }

      logAgentEvent({
        event: 'agent_run.started',
        runId: run.id,
        userId: ctx.user.id,
        tier: run.tier,
        metadata: {
          reservedMicros: reservation.reservedMicros,
        },
      });

      return {
        runId: run.id,
        reservedMicros: reservation.reservedMicros,
      };
    }),

  pauseRun: protectedProcedure
    .input(z.object({ runId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const run = await getRunForUserOrThrow(ctx.env.DB, input.runId, ctx.user.id);
      const coordinatorId = ctx.env.RUN_COORDINATOR.idFromName(run.id);
      const coordinator = ctx.env.RUN_COORDINATOR.get(coordinatorId);

      const response = await coordinator.fetch('https://run-coordinator/internal/pause', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = (await response.json().catch(() => ({}))) as { reason?: string };
        throw new TRPCError({
          code: 'CONFLICT',
          message: error.reason || 'Failed to pause run',
        });
      }

      return { success: true };
    }),

  resumeRun: protectedProcedure
    .input(z.object({ runId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const run = await getRunForUserOrThrow(ctx.env.DB, input.runId, ctx.user.id);
      return resumeRunFromCheckpoint({
        db: ctx.env.DB,
        run,
        userId: ctx.user.id,
        runCoordinator: ctx.env.RUN_COORDINATOR,
      });
    }),

  submitAnswer: protectedProcedure
    .input(
      z.object({
        runId: z.string().uuid(),
        questionId: z.string().trim().min(1),
        answer: z.string().trim().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const run = await getRunForUserOrThrow(ctx.env.DB, input.runId, ctx.user.id);
      if (run.status !== 'waiting_for_input') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Run must be waiting_for_input to submit an answer',
        });
      }

      const coordinatorId = ctx.env.RUN_COORDINATOR.idFromName(run.id);
      const coordinator = ctx.env.RUN_COORDINATOR.get(coordinatorId);
      const response = await coordinator.fetch('https://run-coordinator/internal/submit-answer', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          questionId: input.questionId,
          answer: input.answer,
          submissionId: crypto.randomUUID(),
        }),
      });

      if (!response.ok) {
        const error = (await response.json().catch(() => ({}))) as { reason?: string };
        throw new TRPCError({
          code: 'CONFLICT',
          message: error.reason || 'Failed to submit clarification answer',
        });
      }

      return { success: true };
    }),

  submitUserAnswer: protectedProcedure
    .input(z.object({
      runId: z.string().uuid(),
      batchId: z.string(),
      answers: z.array(z.array(z.string())),
    }))
    .mutation(async ({ ctx, input }) => {
      const run = await getRunForUserOrThrow(ctx.env.DB, input.runId, ctx.user.id);
      if (run.status !== 'waiting_for_input') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Run must be waiting_for_input to submit user answer',
        });
      }

      const coordinatorId = ctx.env.RUN_COORDINATOR.idFromName(run.id);
      const coordinator = ctx.env.RUN_COORDINATOR.get(coordinatorId);
      const response = await coordinator.fetch(
        'https://run-coordinator/internal/submit-user-answer',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            batchId: input.batchId,
            answers: input.answers,
          }),
        }
      );

      if (!response.ok) {
        const error = (await response.json().catch(() => ({}))) as { reason?: string };
        throw new TRPCError({
          code: 'CONFLICT',
          message: error.reason || 'Failed to submit user answer',
        });
      }

      return { ok: true };
    }),

  reconcileRun: protectedProcedure
    .input(z.object({ runId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await getRunForUserOrThrow(ctx.env.DB, input.runId, ctx.user.id);
      const reconciliation = new AgentRunReconciliationService(ctx.env.DB);
      return reconciliation.reconcileRun(input.runId);
    }),

  cancelRun: protectedProcedure
    .input(z.object({ runId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const run = await getRunForUserOrThrow(ctx.env.DB, input.runId, ctx.user.id);
      const coordinatorId = ctx.env.RUN_COORDINATOR.idFromName(run.id);
      const coordinator = ctx.env.RUN_COORDINATOR.get(coordinatorId);

      const response = await coordinator.fetch('https://run-coordinator/internal/cancel', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = (await response.json().catch(() => ({}))) as { reason?: string };
        throw new TRPCError({
          code: 'CONFLICT',
          message: error.reason || 'Failed to cancel run',
        });
      }

      const billing = new AgentBillingService(ctx.env.DB, new WalletService(ctx.env.DB));
      try {
        await billing.finalizeRun({ userId: ctx.user.id, runId: input.runId });
      } catch (error) {
        console.error('[agent-runs] Failed to finalize run after cancel', {
          runId: input.runId,
          userId: ctx.user.id,
          error,
        });
      }

      logAgentEvent({
        event: 'agent_run.canceled',
        runId: run.id,
        userId: ctx.user.id,
        tier: run.tier,
      });

      return { success: true };
    }),

  pollRunStatus: protectedProcedure
    .input(
      z.object({
        runId: z.string().uuid(),
        lastSeq: z.number().int().min(0).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const run = await getRunForUserOrThrow(ctx.env.DB, input.runId, ctx.user.id);
      const fromSeq = input.lastSeq ?? 0;

      const eventsResult = await ctx.env.DB
        .prepare('SELECT id, seq, event_type, payload_json, created_at FROM agent_events WHERE run_id = ? AND seq > ? ORDER BY seq ASC')
        .bind(input.runId, fromSeq)
        .all<AgentEventRow>();

      const lastSeq = await getLastSeq(ctx.env.DB, input.runId);

      return {
        status: run.status,
        currentStepIndex: run.current_step_index,
        totalSteps: run.total_steps,
        lastSeq,
        actualCostMicros: run.actual_cost_micros,
        events: eventsResult.results.map(toEvent),
      };
    }),

  publish: protectedProcedure
    .input(z.object({ runId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const run = await getRunForUserOrThrow(ctx.env.DB, input.runId, ctx.user.id);

      if (run.status !== 'succeeded') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Run must be succeeded before publish',
        });
      }

      const game = await ctx.env.DB
        .prepare('SELECT id, user_id FROM games WHERE id = ? AND deleted_at IS NULL')
        .bind(run.game_id)
        .first<GameOwnerRow>();

      if (!game) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }

      if (game.user_id !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot publish to game you do not own' });
      }

      const artifactManager = new ArtifactManager(ctx.env.ASSETS);
      const finalDefinitionText = await artifactManager.readRunFinalDefinition(run.id);

      if (!finalDefinitionText) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Final run definition artifact not found',
        });
      }

      let finalDefinitionJson: unknown;
      try {
        finalDefinitionJson = JSON.parse(finalDefinitionText);
      } catch {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Final run definition artifact is invalid JSON',
        });
      }

      const schemaValidation = GameDefinitionSchema.safeParse(finalDefinitionJson);
      if (!schemaValidation.success) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: schemaValidation.error.issues[0]?.message ?? 'Final definition failed schema validation',
        });
      }

      const typedGameDefinition = schemaValidation.data as Parameters<typeof validateGameDefinition>[0];
      const semanticValidation = validateGameDefinition(typedGameDefinition);
      if (!semanticValidation.valid) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Final definition failed validation (${semanticValidation.errors.length} errors)`,
        });
      }

      const publishResult = await artifactManager.publishRunFinalDefinition({
        runId: run.id,
        gameId: run.game_id,
      });

      const validationReport = validateGame(typedGameDefinition as Parameters<typeof validateGame>[0]);
      const now = Date.now();

      await ctx.env.DB
        .prepare(
          `UPDATE games
           SET title = ?,
               description = ?,
               updated_at = ?,
               validation_report = ?,
               validation_score = ?,
               validation_critical_count = ?,
               validation_warning_count = ?,
               validation_valid = ?,
               validation_updated_at = ?,
               validator_version = ?
           WHERE id = ? AND user_id = ?`
        )
        .bind(
          schemaValidation.data.metadata.title,
          schemaValidation.data.metadata.description,
          now,
          getValidationReportJson(validationReport),
          validationReport.summary.score,
          validationReport.summary.criticalCount,
          validationReport.summary.warningCount,
          validationReport.valid ? 1 : 0,
          now,
          validationReport.validatorVersion,
          run.game_id,
          ctx.user.id
        )
        .run();

      logAgentEvent({
        event: 'agent_run.published',
        runId: run.id,
        userId: ctx.user.id,
        tier: run.tier,
        metadata: {
          gameId: run.game_id,
          activeDefinitionKey: publishResult.activeKey,
        },
      });

      return {
        runId: run.id,
        gameId: run.game_id,
        activeDefinitionKey: publishResult.activeKey,
        activeDefinitionUrl: artifactManager.getAssetUrl(ctx.env.APP_URL, publishResult.activeKey),
        archivedVersionId: publishResult.archivedVersion?.versionId ?? null,
      };
    }),

  getVersionHistory: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        limit: z.number().int().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const game = await ctx.env.DB
        .prepare('SELECT id, user_id FROM games WHERE id = ? AND deleted_at IS NULL')
        .bind(input.gameId)
        .first<GameOwnerRow>();

      if (!game) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }

      if (game.user_id !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot list versions for game you do not own' });
      }

      const artifactManager = new ArtifactManager(ctx.env.ASSETS);
      const versions = await artifactManager.listVersions(input.gameId, input.limit);

      return {
        gameId: input.gameId,
        versions: versions.map((version) => ({
          versionId: version.versionId,
          key: version.key,
          url: artifactManager.getAssetUrl(ctx.env.APP_URL, version.key),
          uploadedAt: version.uploadedAt,
          size: version.size,
        })),
      };
    }),

  rollbackPublishedDefinition: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        versionId: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const game = await ctx.env.DB
        .prepare('SELECT id, user_id FROM games WHERE id = ? AND deleted_at IS NULL')
        .bind(input.gameId)
        .first<GameOwnerRow>();

      if (!game) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }

      if (game.user_id !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot rollback game you do not own' });
      }

      const artifactManager = new ArtifactManager(ctx.env.ASSETS);
      const versionKey = artifactManager.getVersionDefinitionKey(input.gameId, input.versionId);
      const versionDefinitionText = await artifactManager.readDefinitionText(versionKey);

      if (!versionDefinitionText) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Requested version was not found' });
      }

      let versionDefinitionJson: unknown;
      try {
        versionDefinitionJson = JSON.parse(versionDefinitionText);
      } catch {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Requested version contains invalid JSON',
        });
      }

      const schemaValidation = GameDefinitionSchema.safeParse(versionDefinitionJson);
      if (!schemaValidation.success) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: schemaValidation.error.issues[0]?.message ?? 'Requested version failed schema validation',
        });
      }

      const typedGameDefinition = schemaValidation.data as Parameters<typeof validateGameDefinition>[0];
      const semanticValidation = validateGameDefinition(typedGameDefinition);
      if (!semanticValidation.valid) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Requested version failed validation (${semanticValidation.errors.length} errors)`,
        });
      }

      const rollbackResult = await artifactManager.rollbackToVersion({
        gameId: input.gameId,
        versionId: input.versionId,
      });

      const validationReport = validateGame(typedGameDefinition as Parameters<typeof validateGame>[0]);
      const now = Date.now();

      await ctx.env.DB
        .prepare(
          `UPDATE games
           SET title = ?,
               description = ?,
               updated_at = ?,
               validation_report = ?,
               validation_score = ?,
               validation_critical_count = ?,
               validation_warning_count = ?,
               validation_valid = ?,
               validation_updated_at = ?,
               validator_version = ?
           WHERE id = ? AND user_id = ?`
        )
        .bind(
          schemaValidation.data.metadata.title,
          schemaValidation.data.metadata.description,
          now,
          getValidationReportJson(validationReport),
          validationReport.summary.score,
          validationReport.summary.criticalCount,
          validationReport.summary.warningCount,
          validationReport.valid ? 1 : 0,
          now,
          validationReport.validatorVersion,
          input.gameId,
          ctx.user.id
        )
        .run();

      return {
        gameId: input.gameId,
        restoredVersionId: input.versionId,
        activeDefinitionKey: rollbackResult.activeKey,
        activeDefinitionUrl: artifactManager.getAssetUrl(ctx.env.APP_URL, rollbackResult.activeKey),
        archivedVersionId: rollbackResult.archivedVersion?.versionId ?? null,
      };
    }),

  getRunSnapshot: protectedProcedure
    .input(z.object({ runId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const run = await getRunForUserOrThrow(ctx.env.DB, input.runId, ctx.user.id);

      const [stepsResult, eventsResult, lastSeq] = await Promise.all([
        ctx.env.DB.prepare('SELECT * FROM agent_steps WHERE run_id = ? ORDER BY step_index ASC')
          .bind(input.runId)
          .all<AgentStepRow>(),
        ctx.env.DB.prepare('SELECT id, seq, event_type, payload_json, created_at FROM agent_events WHERE run_id = ? ORDER BY seq ASC')
          .bind(input.runId)
          .all<AgentEventRow>(),
        getLastSeq(ctx.env.DB, input.runId),
      ]);

      const billing = new AgentBillingService(ctx.env.DB, new WalletService(ctx.env.DB));
      const costSummary = await billing.getRunCostSummary(input.runId);

      return {
        run: toSnapshot(run, lastSeq),
        events: eventsResult.results.map(toEvent),
        steps: stepsResult.results.map(toStep),
        costSummary,
      };
    }),
});
