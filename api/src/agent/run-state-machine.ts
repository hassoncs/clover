import type { AgentRunStatus, ClarificationQuestion } from '@slopcade/shared/types/agent-run';
import type { AgentRunSnapshot, RunStepRequest, ClientMessage } from './types';

export interface RunState {
  runId: string;
  status: AgentRunStatus;
  stateVersion: number;
  currentStepIndex: number;
  totalSteps: number;
  lastSeq: number;
  totalCostMicros: number;
  heartbeatAt: number | null;
  leaseExpiresAt: number | null;
  recoveryAttempts: number;
  clarificationQuestions: ClarificationQuestion[];
  pendingQuestionId: string | null;
  pendingQuestionBatchId: string | null;
  pendingQuestionsJson: string | null;
  suspendedStepIndex: number | null;
  rawPrompt: string | null;
  threadId: string | null;
  gateValues: Record<string, string>;
  gateLoopIteration: number;
  gateAnswers: Array<{ question: string; answer: string }>;
  updatedAt: number;
}

export interface RunAnswerLedgerEntry {
  submissionId: string;
  questionId: string;
  result: 'accepted' | 'rejected';
  reason?: string;
  processedAt: number;
}

export interface RunExecutionContextRow {
  user_id: string;
  game_id: string;
  tier: 'free' | 'standard' | 'pro';
  planning_doc_json: string | null;
  game_title: string;
  game_description: string | null;
}

export interface WorkerCheckpointResponse {
  checkpointId: string | null;
  stepIndex: number | null;
  stateJson: string | null;
}

export interface UnsettledSucceededStepRow {
  step_id: string;
  step_index: number;
  cost_micros: number;
  finished_at: number | null;
}

export const STATE_KEY = 'run:state';
export const MAX_REPLAY_EVENTS = 1000;
export const EVENT_KEY_PREFIX = 'event:';
export const COMMAND_KEY_PREFIX = 'control:';
export const ANSWER_KEY_PREFIX = 'answer:';
export const LEASE_MS = 30_000;
export const MAX_RECOVERY_ATTEMPTS = 3;

export const PLANNING_STAGE_GATES_YAML = `stage: planning
gates:
  - id: core_game_loop
    label: Core Game Loop
    description: Describe the main gameplay loop - what does the player do repeatedly?
    required: true
    ai_extraction_hint: Look for descriptions of the main player action, game mechanics, or what happens on each turn/frame
  - id: win_lose_conditions
    label: Win/Lose Conditions
    description: Define how the player wins or loses the game
    required: true
    ai_extraction_hint: Look for win/loss conditions, scoring rules, victory requirements, or failure states
  - id: theme_style
    label: Theme & Style
    description: Describe the visual theme and art style
    required: true
    ai_extraction_hint: Look for visual descriptions, color schemes, art style preferences, or aesthetic references
  - id: game_type_category
    label: Game Type/Category
    description: What type of game is this?
    required: true
    ai_extraction_hint: Look for genre mentions, gameplay style references, or comparisons to existing games`;

export function transitionStatus(state: RunState, nextStatus: AgentRunStatus): void {
  if (state.status === nextStatus) {
    return;
  }
  state.status = nextStatus;
  state.stateVersion += 1;
}

export function getStage(stepIndex: number): RunStepRequest['stage'] {
  if (stepIndex === 0) {
    return 'chat';
  }
  const order: RunStepRequest['stage'][] = ['planning', 'build', 'refine', 'theme', 'asset'];
  return order[(stepIndex - 1) % order.length];
}

export function toSnapshot(state: RunState): AgentRunSnapshot {
  return {
    runId: state.runId,
    status: state.status,
    stateVersion: state.stateVersion,
    currentStepIndex: state.currentStepIndex,
    totalSteps: state.totalSteps,
    lastSeq: state.lastSeq,
    totalCostMicros: state.totalCostMicros,
    heartbeatAt: state.heartbeatAt,
    leaseExpiresAt: state.leaseExpiresAt,
    updatedAt: state.updatedAt,
  };
}

export function eventKey(seq: number): string {
  return `${EVENT_KEY_PREFIX}${seq.toString().padStart(12, '0')}`;
}

export function parseClientMessage(rawMessage: string | ArrayBuffer): ClientMessage | null {
  if (typeof rawMessage !== 'string') {
    return null;
  }
  try {
    const parsed = JSON.parse(rawMessage) as ClientMessage;
    if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function createInitialState(runId: string, totalSteps: number): RunState {
  return {
    runId,
    status: 'queued',
    stateVersion: 1,
    currentStepIndex: 0,
    totalSteps,
    lastSeq: 0,
    totalCostMicros: 0,
    heartbeatAt: null,
    leaseExpiresAt: null,
    recoveryAttempts: 0,
    clarificationQuestions: [],
    pendingQuestionId: null,
    pendingQuestionBatchId: null,
    pendingQuestionsJson: null,
    suspendedStepIndex: null,
    rawPrompt: null,
    threadId: null,
    gateValues: {},
    gateLoopIteration: 0,
    gateAnswers: [],
    updatedAt: Date.now(),
  };
}
