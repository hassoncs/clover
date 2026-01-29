/**
 * SlopcadeDebugBridge Types
 *
 * Unified debugging interface that coordinates React game logic and Godot physics.
 * This bridge is exposed on `window.SlopcadeDebugBridge` and is the primary
 * interface for MCP tools and future in-app debugging agents.
 */

export type GameStateValue = "loading" | "ready" | "playing" | "paused" | "won" | "lost";

export interface TimeState {
  paused: boolean;
  timeScale: number;
  frame: number;
  elapsed: number;
  gameState: GameStateValue;
  score: number;
  lives: number;
}

export interface ReactGameState {
  score: number;
  lives: number;
  state: GameStateValue;
  variables: Record<string, unknown>;
  frame: number;
  elapsed: number;
  timeScale: number;
}

export interface GameSnapshot {
  timeState: TimeState;
  react: ReactGameState;
  godot?: unknown;
}

export interface SnapshotOptions {
  detail?: "low" | "med" | "high";
  includeGodot?: boolean;
}

export interface StepResult {
  ok: boolean;
  framesAdvanced: number;
  startFrame: number;
  endFrame: number;
  timeState: TimeState;
}

export interface SlopcadeDebugBridgeCallbacks {
  pause: () => void;
  resume: () => void;
  step: (frames: number) => Promise<StepResult>;
  setTimeScale: (scale: number) => void;
  getTimeState: () => TimeState;
  getReactState: () => ReactGameState;
  getGodotSnapshot?: (options?: SnapshotOptions) => unknown;
}

export interface SlopcadeDebugBridgeInterface {
  readonly ready: boolean;
  readonly gameId: string;

  pause(): Promise<void> | void;
  resume(): Promise<void> | void;
  step(frames?: number): Promise<StepResult>;
  setTimeScale(scale: number): Promise<void> | void;

  getTimeState(): Promise<TimeState> | TimeState;
  getSnapshot(options?: SnapshotOptions): Promise<GameSnapshot> | GameSnapshot;

  readonly paused: boolean;
  readonly timeScale: number;
  readonly frame: number;
  readonly elapsed: number;
}

declare global {
  interface Window {
    SlopcadeDebugBridge?: SlopcadeDebugBridgeInterface;
    slopcadeGameReady?: boolean;
  }
}
