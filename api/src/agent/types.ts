import type {
  AgentEventPayload,
  AgentEventType,
  AgentRunStatus,
  AgentStepStage,
  AgentTier,
} from '@slopcade/shared/types/agent-run';

export type ControlCommandType = 'pause' | 'resume' | 'cancel';

export type ClientMessage =
  | { type: 'connect'; runId: string; lastSeq?: number }
  | { type: 'pause'; commandId: string }
  | { type: 'resume'; commandId: string }
  | { type: 'cancel'; commandId: string }
  | { type: 'request_snapshot' }
  | { type: 'pong' };

export interface AgentEventMessage {
  type: 'event';
  seq: number;
  stateVersion?: number;
  eventType: AgentEventType;
  payload: AgentEventPayload;
  timestamp: number;
}

export interface AgentRunSnapshot {
  runId: string;
  status: AgentRunStatus;
  stateVersion?: number;
  currentStepIndex: number;
  totalSteps: number;
  lastSeq: number;
  totalCostMicros: number;
  heartbeatAt: number | null;
  leaseExpiresAt: number | null;
  updatedAt: number;
}

export interface AgentEvent {
  seq: number;
  stateVersion?: number;
  eventType: AgentEventType;
  payload: AgentEventPayload;
  timestamp: number;
}

export type ServerMessage =
  | { type: 'connected'; runId: string; status: AgentRunStatus; lastSeq: number; stateVersion?: number }
  | AgentEventMessage
  | { type: 'snapshot'; run: AgentRunSnapshot; events: AgentEvent[] }
  | { type: 'control_ack'; commandId: string; result: 'accepted' | 'rejected'; reason?: string }
  | { type: 'ping' }
  | { type: 'error'; message: string; code?: string };

export interface RunStepRequest {
  type: 'execute_step';
  runId: string;
  stepId: string;
  stepIndex: number;
  stage: AgentStepStage;
  startedAt: number;
  tier: AgentTier;
  gameId: string;
  gameTitle: string;
  gameDescription: string | null;
  planningDocJson: string | null;
}

export interface RunStepResult {
  type: 'step_result';
  runId: string;
  stepId: string;
  stepIndex: number;
  stage: AgentStepStage;
  status: 'succeeded' | 'failed' | 'suspended';
  costMicros: number;
  checkpointId: string;
  checkpointStateJson?: string;
  checkpointArtifactKeysJson?: string | null;
  suspendedConversationJson?: string;
  questionsJson?: string;
  outputArtifactKey?: string;
  errorMessage?: string;
  failureReason?:
    | 'MISSING_PREREQUISITE'
    | 'VALIDATION_FAILED'
    | 'MODEL_ERROR'
    | 'ASSET_PIPELINE_FAILED'
    | 'PERSISTENCE_ERROR'
    | 'UNKNOWN';
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  completedAt: number;
}

export interface RunControlLedgerEntry {
  commandId: string;
  type: ControlCommandType;
  result: 'accepted' | 'rejected';
  reason?: string;
  processedAt: number;
}
