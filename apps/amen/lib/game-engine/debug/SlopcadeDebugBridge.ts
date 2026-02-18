import type {
  SlopcadeDebugBridgeInterface,
  TimeState,
  GameSnapshot,
  SnapshotOptions,
  StepResult,
  ReactGameState,
  TimeControl,
} from "./types";

interface GodotBridgeLike {
  stepPhysics(frames: number): Promise<{ ok: boolean; framesAdvanced: number; endFrame: number }>;
}

interface GameRuntimeAPI {
  pauseGameLoop: () => void;
  resumeGameLoop: () => void;
  stepGame: (dt: number) => void;
  manualStep: (frames: number) => Promise<{ ok: boolean; framesAdvanced: number; startFrame: number; endFrame: number }>;
  setTimeScale: (scale: number) => void;
  getGameState: () => ReactGameState;
  getGodotBridge: () => GodotBridgeLike | null;
  getTimeControl: () => TimeControl;
}

export class SlopcadeDebugBridge implements SlopcadeDebugBridgeInterface {
  private _ready = false;
  private _gameId: string;
  private runtime: GameRuntimeAPI;

  constructor(gameId: string, runtime: GameRuntimeAPI) {
    this._gameId = gameId;
    this.runtime = runtime;
  }

  get ready(): boolean {
    return this._ready;
  }

  get gameId(): string {
    return this._gameId;
  }

  setReady(ready: boolean): void {
    this._ready = ready;
  }

  pause(): void {
    this.runtime.pauseGameLoop();
  }

  resume(): void {
    this.runtime.resumeGameLoop();
  }

  async step(frames = 1): Promise<StepResult> {
    const result = await this.runtime.manualStep(frames);
    
    return {
      ...result,
      timeState: this.getTimeState(),
    };
  }

  setTimeScale(scale: number): void {
    this.runtime.setTimeScale(scale);
  }

  getTimeState(): TimeState {
    const gameState = this.runtime.getGameState();
    const timeControl = this.runtime.getTimeControl();
    return {
      state: gameState.state,
      paused: timeControl?.paused ?? gameState.state !== 'playing',
      pendingSteps: timeControl?.pendingSteps ?? 0,
    };
  }

  getSnapshot(options?: SnapshotOptions): GameSnapshot {
    const timeState = this.getTimeState();
    const reactState = this.runtime.getGameState();

    return {
      timeState,
      react: reactState,
    };
  }

  get paused(): boolean {
    return this.runtime.getTimeControl().paused;
  }

  get timeScale(): number {
    return this.runtime.getGameState().timeScale;
  }

  get frame(): number {
    return this.runtime.getGameState().frame;
  }

  get elapsed(): number {
    return this.runtime.getGameState().elapsed;
  }
}
