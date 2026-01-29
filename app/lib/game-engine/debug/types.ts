/**
 * SlopcadeDebugBridge Types
 *
 * Unified debugging interface that coordinates React game logic and Godot physics.
 * This bridge is exposed on `window.SlopcadeDebugBridge` and is the primary
 * interface for MCP tools and future in-app debugging agents.
 */

export type GameStateValue = "loading" | "ready" | "playing" | "paused" | "won" | "lost";

/**
 * Player Phase - what the player sees
 * This is the high-level game state that players interact with.
 */
export type PlayerPhase = GameStateValue;

/**
 * Time Mode - whether simulation advances normally or is controlled by inspector
 */
export type TimeMode = "normal" | "inspect";

/**
 * Time Control - controls whether the simulation advances
 *
 * This is ORTHOGONAL to player phase:
 * - In normal mode: paused is derived from playerPhase !== "playing"
 * - In inspect mode: playerPhase can be "playing" while paused is true
 *   (inspector holds the clock while game logic continues)
 */
export interface TimeControl {
  mode: TimeMode;
  paused: boolean;
  pendingSteps: number;
}

/**
 * @deprecated No longer used - game loop now checks timeControl.mode directly
 */
export function framesToAdvance(
  isReady: boolean,
  playerPhase: PlayerPhase,
  timeControl: TimeControl,
): number {
  if (!isReady) return 0;
  if (timeControl.mode === "inspect") return 0;
  if (playerPhase !== "playing") return 0;
  return timeControl.paused ? 0 : 1;
}

export interface TimeState {
  timeControl: TimeControl;
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
