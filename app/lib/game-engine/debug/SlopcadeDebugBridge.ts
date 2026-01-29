import type {
  SlopcadeDebugBridgeInterface,
  TimeState,
  GameSnapshot,
  SnapshotOptions,
  StepResult,
  ReactGameState,
} from "./types";

interface GodotBridgeLike {
  stepPhysics(frames: number): Promise<{ ok: boolean; framesAdvanced: number; endFrame: number }>;
}

interface GameRuntimeAPI {
  pauseGameLoop: () => void;
  resumeGameLoop: () => void;
  stepGame: (dt: number) => void;
  setTimeScale: (scale: number) => void;
  getGameState: () => ReactGameState;
  getGodotBridge: () => GodotBridgeLike | null;
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
    const bridge = this.runtime.getGodotBridge();
    if (!bridge) {
      throw new Error("GodotBridge not available");
    }

    const gameState = this.runtime.getGameState();
    const startFrame = gameState.frame;

    const physicsResult = await bridge.stepPhysics(frames);
    
    const fixedDt = 1 / 60;
    for (let i = 0; i < frames; i++) {
      this.runtime.stepGame(fixedDt);
    }

    const endFrame = startFrame + frames;
    
    return {
      ok: physicsResult.ok,
      framesAdvanced: frames,
      startFrame,
      endFrame,
      timeState: this.getTimeState(),
    };
  }

  setTimeScale(scale: number): void {
    this.runtime.setTimeScale(scale);
  }

  getTimeState(): TimeState {
    const gameState = this.runtime.getGameState();
    return {
      paused: gameState.state === "paused",
      timeScale: gameState.timeScale,
      frame: gameState.frame,
      elapsed: gameState.elapsed,
      gameState: gameState.state,
      score: gameState.score,
      lives: gameState.lives,
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
    return this.runtime.getGameState().state === "paused";
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
