export interface CheckpointDefinition {
  id: string;
  position: { x: number; y: number };
  active?: boolean;
}

export interface CheckpointState {
  activeCheckpointId: string | null;
  savedState: SavedGameState | null;
}

export interface SavedGameState {
  score: number;
  lives: number;
  time: number;
  variables: Record<string, unknown>;
  entityStates: Record<string, EntitySaveState>;
  timestamp: number;
}

export interface EntitySaveState {
  id: string;
  x: number;
  y: number;
  angle: number;
  active: boolean;
}

export interface ActivateCheckpointAction {
  type: 'checkpoint_activate';
  checkpointId: string;
}

export interface SaveCheckpointAction {
  type: 'checkpoint_save';
}

export interface RestoreCheckpointAction {
  type: 'checkpoint_restore';
}

export type CheckpointAction = ActivateCheckpointAction | SaveCheckpointAction | RestoreCheckpointAction;
