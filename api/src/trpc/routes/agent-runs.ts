import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { ArtifactManager } from '@/ai/agent/artifact-manager';
import { isAIEditingEnabled } from '@/ai/agent/feature-flags';
import { AgentRunReconciliationService } from '@/ai/agent/reconciliation';
import { estimateRunCost, resolveTierConfig } from '@/ai/agent/tier-config';
import { GameDefinitionSchema } from '@/ai/game/schemas';
import { validateGameDefinition } from '@/ai/game/validator';
import { validateGame, getValidationReportJson } from '@/validation/gameValidator';
import type { AgentEvent, AgentRunSnapshot } from '@/agent/types';
import { RecoveryService } from '@/agent/recovery-service';
import { AgentBillingService } from '@/economy/agent-billing-service';
import { WalletService } from '@/economy/wallet-service';
import { AgentEventPayloadSchema } from '@slopcade/shared/types/agent-run';
import { getAgentFeatureFlags } from '@/agent/feature-flags';
import { logAgentEvent } from '@/agent/observability';
import { loadGatesConfig, validatePlanningDoc } from '@/agent/planning-gates';

import { protectedProcedure, router } from '../index';

type D1Database = import('@cloudflare/workers-types').D1Database;
type DurableObjectNamespace = import('@cloudflare/workers-types').DurableObjectNamespace;

interface AgentRunRow {
  id: string;
  user_id: string;
  game_id: string;
  source: 'scratch' | 'fork';
  source_game_id: string | null;
  tier: 'free' | 'standard' | 'pro';
  status: 'planning' | 'queued' | 'running' | 'waiting_for_input' | 'paused' | 'succeeded' | 'failed' | 'canceled';
  planning_doc_json: string | null;
  estimated_cost_micros: number | null;
  actual_cost_micros: number;
  reserved_micros: number;
  current_step_index: number;
  total_steps: number;
  error_message: string | null;
  created_at: number;
  started_at: number | null;
  finished_at: number | null;
  updated_at: number;
}

interface AgentStepRow {
  id: string;
  run_id: string;
  step_index: number;
  stage: 'planning' | 'build' | 'refine' | 'theme' | 'asset';
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'skipped';
  input_hash: string | null;
  output_artifact_key: string | null;
  cost_micros: number;
  error_message: string | null;
  created_at: number;
  started_at: number | null;
  finished_at: number | null;
}

interface AgentEventRow {
  id: string;
  seq: number;
  event_type: AgentEvent['eventType'];
  payload_json: string | null;
  created_at: number;
}

interface GameOwnerRow {
  id: string;
  user_id: string | null;
}

const STAGES: AgentStepRow['stage'][] = ['planning', 'build', 'refine', 'theme', 'asset'];

function toRun(row: AgentRunRow) {
  return {
    id: row.id,
    userId: row.user_id,
    gameId: row.game_id,
    source: row.source,
    sourceGameId: row.source_game_id,
    tier: row.tier,
    status: row.status,
    planningDocJson: row.planning_doc_json,
    estimatedCostMicros: row.estimated_cost_micros,
    actualCostMicros: row.actual_cost_micros,
    reservedMicros: row.reserved_micros,
    currentStepIndex: row.current_step_index,
    totalSteps: row.total_steps,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    updatedAt: row.updated_at,
  };
}

function toStep(row: AgentStepRow) {
  return {
    id: row.id,
    runId: row.run_id,
    stepIndex: row.step_index,
    stage: row.stage,
    status: row.status,
    inputHash: row.input_hash,
    outputArtifactKey: row.output_artifact_key,
    costMicros: row.cost_micros,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
}

function toEvent(row: AgentEventRow): AgentEvent {
  let payload: AgentEvent['payload'] = {
    type: 'error',
    errorMessage: 'Invalid event payload',
    errorContext: `event:${row.id}`,
  };

  if (row.payload_json) {
    try {
      const parsed = AgentEventPayloadSchema.safeParse(JSON.parse(row.payload_json));
      if (parsed.success) {
        payload = parsed.data;
      }
    } catch {
      payload = {
        type: 'error',
        errorMessage: 'Invalid event payload',
        errorContext: `event:${row.id}`,
      };
    }
  }

  return {
    seq: row.seq,
    eventType: row.event_type,
    payload,
    timestamp: row.created_at,
  };
}

function toSnapshot(run: AgentRunRow, lastSeq: number): AgentRunSnapshot {
  return {
    runId: run.id,
    status: run.status,
    currentStepIndex: run.current_step_index,
    totalSteps: run.total_steps,
    lastSeq,
    totalCostMicros: run.actual_cost_micros,
    heartbeatAt: null,
    leaseExpiresAt: null,
    updatedAt: run.updated_at,
  };
}

async function getRunForUserOrThrow(db: D1Database, runId: string, userId: string): Promise<AgentRunRow> {
  const run = await db
    .prepare('SELECT * FROM agent_runs WHERE id = ? AND user_id = ?')
    .bind(runId, userId)
    .first<AgentRunRow>();

  if (!run) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Agent run not found' });
  }

  return run;
}

async function getLastSeq(db: D1Database, runId: string): Promise<number> {
  const result = await db
    .prepare('SELECT COALESCE(MAX(seq), 0) as last_seq FROM agent_events WHERE run_id = ?')
    .bind(runId)
    .first<{ last_seq: number }>();

  return result?.last_seq ?? 0;
}

async function resumeRunFromCheckpoint(params: {
  db: D1Database;
  run: AgentRunRow;
  userId: string;
  runCoordinator: DurableObjectNamespace;
}): Promise<{
  runId: string;
  resumedFromStepIndex: number;
  settledStepIndexes: number[];
  unsettledStepIndexes: number[];
}> {
  const { db, run, userId, runCoordinator } = params;

  if (run.status !== 'paused' && run.status !== 'failed' && run.status !== 'waiting_for_input') {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Run must be paused, failed, or waiting_for_input to resume from checkpoint',
    });
  }

  const recoveryService = new RecoveryService(db, new AgentBillingService(db, new WalletService(db)));
  const resumePlan = await recoveryService.prepareResume(run.id);
  const resumedFromStepIndex = Math.min(resumePlan.resumeFromStepIndex, run.total_steps);
  const now = Date.now();

  const unsettledSet = new Set(resumePlan.unsettledStepIndexes);

  await db.batch([
    db
      .prepare(
        `UPDATE agent_runs
         SET status = 'queued',
             current_step_index = ?,
             error_message = NULL,
             finished_at = NULL,
             updated_at = ?
         WHERE id = ? AND user_id = ?`
      )
      .bind(resumedFromStepIndex, now, run.id, userId),
    db
      .prepare(
        `UPDATE agent_steps
         SET status = 'queued',
              error_message = NULL,
              started_at = NULL,
              finished_at = NULL
          WHERE run_id = ?
            AND step_index >= ?
            AND status != 'succeeded'
            AND step_index IN (${resumePlan.unsettledStepIndexes.map(() => '?').join(',') || 'NULL'})`
      )
      .bind(run.id, resumedFromStepIndex, ...Array.from(unsettledSet.values())),
  ]);

  const coordinatorId = runCoordinator.idFromName(run.id);
  const coordinator = runCoordinator.get(coordinatorId);
  const startResponse = await coordinator.fetch('https://run-coordinator/internal/resume-from-checkpoint', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      resumeFromStepIndex: resumedFromStepIndex,
      allowStatuses: ['paused', 'failed', 'waiting_for_input'],
    }),
  });

  if (!startResponse.ok) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to restart coordinator from checkpoint',
    });
  }

  return {
    runId: run.id,
    resumedFromStepIndex,
    settledStepIndexes: resumePlan.settledStepIndexes,
    unsettledStepIndexes: resumePlan.unsettledStepIndexes,
  };
}

export const agentRunsRouter = router({
  createRun: protectedProcedure
    .input(
      z
        .object({
          gameId: z.string().uuid(),
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
      if (!isAIEditingEnabled(ctx.user.id, ctx.env)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'AI editing is not enabled for your account',
        });
      }

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
      const estimatedCost = estimateRunCost(input.tier, STAGES.length);
      const now = Date.now();
      const runId = crypto.randomUUID();

      await ctx.env.DB.prepare(
        `INSERT INTO agent_runs (
          id, user_id, game_id, source, source_game_id, tier, status,
          planning_doc_json, estimated_cost_micros, actual_cost_micros, reserved_micros,
          current_step_index, total_steps, error_message, created_at, started_at, finished_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'planning', NULL, ?, 0, 0, 0, ?, NULL, ?, NULL, NULL, ?)`
      )
        .bind(
          runId,
          ctx.user.id,
          input.gameId,
          input.source,
          input.sourceGameId ?? null,
          input.tier,
          estimatedCost.totalMicros,
          STAGES.length,
          now,
          now
        )
        .run();

      for (let stepIndex = 0; stepIndex < STAGES.length; stepIndex += 1) {
        await ctx.env.DB.prepare(
          `INSERT INTO agent_steps (
            id, run_id, step_index, stage, status,
            input_hash, output_artifact_key, cost_micros, error_message, created_at, started_at, finished_at
          ) VALUES (?, ?, ?, ?, 'queued', NULL, NULL, 0, NULL, ?, NULL, NULL)`
        )
          .bind(crypto.randomUUID(), runId, stepIndex, STAGES[stepIndex], now)
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

      const estimatedCostMicros =
        run.estimated_cost_micros ?? estimateRunCost(run.tier, run.total_steps || STAGES.length).totalMicros;

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
      const startResponse = await coordinator.fetch('https://run-coordinator/internal/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          totalSteps: run.total_steps || STAGES.length,
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

  resume: protectedProcedure
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
