import { z } from 'zod';
import { UserQuestionSchema } from './user-question';

export const AgentRunStatusSchema = z.enum([
  'planning',
  'queued',
  'running',
  'waiting_for_input',
  'paused',
  'succeeded',
  'failed',
  'canceled',
]);
export type AgentRunStatus = z.infer<typeof AgentRunStatusSchema>;

export const AgentStepStageSchema = z.enum(['planning', 'build', 'shader', 'refine', 'theme', 'asset', 'chat']);
export type AgentStepStage = z.infer<typeof AgentStepStageSchema>;

export const AgentStepStatusSchema = z.enum(['queued', 'running', 'succeeded', 'failed', 'skipped']);
export type AgentStepStatus = z.infer<typeof AgentStepStatusSchema>;

export const AgentTierSchema = z.enum(['free', 'standard', 'pro']);
export type AgentTier = z.infer<typeof AgentTierSchema>;

export const AgentRunSourceSchema = z.enum(['scratch', 'fork']);
export type AgentRunSource = z.infer<typeof AgentRunSourceSchema>;

export const AgentEventTypeSchema = z.enum([
  'step_started',
  'step_completed',
  'step_failed',
  'gate_values_updated',
  'planning_complete',
  'patch_applied',
  'checkpoint_ready',
  'clarification_requested',
  'clarification_answered',
  'run_completed',
  'run_failed',
  'run_paused',
  'run_resumed',
  'run_canceled',
  'error',
  'cost_recorded',
  'user_question',
  'user_answer',
  'asset_preview',
]);
export type AgentEventType = z.infer<typeof AgentEventTypeSchema>;

export const AgentRunSchema = z.object({
  id: z.string(),
  userId: z.string(),
  gameId: z.string(),
  source: AgentRunSourceSchema,
  sourceGameId: z.string().optional().nullable(),
  tier: AgentTierSchema,
  status: AgentRunStatusSchema,
  planningDocJson: z.string().optional().nullable(),
  estimatedCostMicros: z.number().optional().nullable(),
  actualCostMicros: z.number(),
  reservedMicros: z.number(),
  currentStepIndex: z.number(),
  totalSteps: z.number(),
  errorMessage: z.string().optional().nullable(),
  createdAt: z.number(),
  startedAt: z.number().optional().nullable(),
  finishedAt: z.number().optional().nullable(),
  updatedAt: z.number(),
});

export type AgentRun = z.infer<typeof AgentRunSchema>;

export const AgentStepSchema = z.object({
  id: z.string(),
  runId: z.string(),
  stepIndex: z.number(),
  stage: AgentStepStageSchema,
  status: AgentStepStatusSchema,
  inputHash: z.string().optional().nullable(),
  outputArtifactKey: z.string().optional().nullable(),
  costMicros: z.number(),
  errorMessage: z.string().optional().nullable(),
  createdAt: z.number(),
  startedAt: z.number().optional().nullable(),
  finishedAt: z.number().optional().nullable(),
});

export type AgentStep = z.infer<typeof AgentStepSchema>;

export const ClarificationQuestionSchema = z.object({
  questionId: z.string(),
  question: z.string(),
  stage: z.string(),
  stepIndex: z.number(),
  context: z.string().optional(),
  answer: z.string().optional(),
  answeredAt: z.number().optional(),
});

export type ClarificationQuestion = z.infer<typeof ClarificationQuestionSchema>;

export const AgentEventPayloadSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('step_started'),
    stepId: z.string(),
    stepIndex: z.number(),
    stage: AgentStepStageSchema,
  }),
  z.object({
    type: z.literal('step_completed'),
    stepId: z.string(),
    stepIndex: z.number(),
    outputArtifactKey: z.string().optional(),
  }),
  z.object({
    type: z.literal('step_failed'),
    stepId: z.string(),
    stepIndex: z.number(),
    errorMessage: z.string(),
  }),
  z.object({
    type: z.literal('gate_values_updated'),
    stage: z.string(),
    gateValues: z.record(z.string(), z.string()),
    satisfiedFields: z.array(z.string()),
    unsatisfiedFields: z.array(z.string()),
  }),
  z.object({
    type: z.literal('planning_complete'),
    stage: z.string(),
    finalGateValues: z.record(z.string(), z.string()),
  }),
  z.object({
    type: z.literal('patch_applied'),
    stepId: z.string(),
    patchDescription: z.string(),
  }),
  z.object({
    type: z.literal('checkpoint_ready'),
    checkpointId: z.string(),
    stepIndex: z.number(),
  }),
  z.object({
    type: z.literal('clarification_requested'),
    questionId: z.string(),
    question: z.string(),
    stage: z.string(),
    stepIndex: z.number(),
    context: z.string().optional(),
  }),
  z.object({
    type: z.literal('clarification_answered'),
    questionId: z.string(),
    answer: z.string(),
  }),
  z.object({
    type: z.literal('run_completed'),
    totalSteps: z.number(),
    totalCostMicros: z.number(),
  }),
  z.object({
    type: z.literal('run_failed'),
    errorMessage: z.string(),
  }),
  z.object({
    type: z.literal('run_paused'),
    reason: z.string().optional(),
  }),
  z.object({
    type: z.literal('run_resumed'),
  }),
  z.object({
    type: z.literal('run_canceled'),
    reason: z.string().optional(),
  }),
  z.object({
    type: z.literal('error'),
    errorMessage: z.string(),
    errorContext: z.string().optional(),
  }),
  z.object({
    type: z.literal('cost_recorded'),
    costMicros: z.number(),
    provider: z.string(),
    model: z.string(),
  }),
  z.object({
    type: z.literal('user_question'),
    batchId: z.string(),
    questions: z.array(UserQuestionSchema),
    stage: z.string(),
    stepIndex: z.number(),
  }),
  z.object({
    type: z.literal('user_answer'),
    batchId: z.string(),
    answers: z.array(z.array(z.string())),
  }),
  z.object({
    type: z.literal('asset_preview'),
    assetId: z.string(),
    assetType: z.enum(['entity', 'background', 'title_hero', 'title_hero_no_bg', 'parallax', 'sheet', 'text_grid']),
    publicUrl: z.string(),
    thumbnailUrl: z.string().optional(),
  }),
]);

export type AgentEventPayload = z.infer<typeof AgentEventPayloadSchema>;

export const AgentEventSchema = z.object({
  id: z.string(),
  runId: z.string(),
  seq: z.number(),
  eventType: AgentEventTypeSchema,
  payloadJson: z.string().optional().nullable(),
  createdAt: z.number(),
});

export type AgentEvent = z.infer<typeof AgentEventSchema>;

export const AgentCheckpointSchema = z.object({
  id: z.string(),
  runId: z.string(),
  stepIndex: z.number(),
  stateJson: z.string(),
  artifactKeysJson: z.string().optional().nullable(),
  createdAt: z.number(),
});

export type AgentCheckpoint = z.infer<typeof AgentCheckpointSchema>;

export const AgentCostSchema = z.object({
  id: z.string(),
  runId: z.string(),
  stepId: z.string().optional().nullable(),
  provider: z.string(),
  model: z.string(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  costMicros: z.number(),
  idempotencyKey: z.string().optional().nullable(),
  createdAt: z.number(),
});

export type AgentCost = z.infer<typeof AgentCostSchema>;
