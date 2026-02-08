// ---------------------------------------------------------------------------
// Snapshot types for the composable GPU effects pipeline
// ---------------------------------------------------------------------------

export interface PassSnapshot {
  passId: string;
  params: Record<string, unknown>;
  hasFeedbackState: boolean;
}

export interface PipelineSnapshot {
  pipelineId: string;
  passes: PassSnapshot[];
  lifecycleState: string;
  timestamp: number;
}

export interface SnapshotRequest {
  pipelineId: string;
  passIds?: string[];
}

export interface SnapshotValidationResult {
  valid: boolean;
  errors: string[];
}
