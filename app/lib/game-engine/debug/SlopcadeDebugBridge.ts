import type {
  SlopcadeDebugBridgeInterface,
  SlopcadeDebugBridgeCallbacks,
  TimeState,
  GameSnapshot,
  SnapshotOptions,
  StepResult,
} from "./types";

export class SlopcadeDebugBridge implements SlopcadeDebugBridgeInterface {
  private _ready = false;
  private _gameId: string;
  private callbacks: SlopcadeDebugBridgeCallbacks;

  constructor(gameId: string, callbacks: SlopcadeDebugBridgeCallbacks) {
    this._gameId = gameId;
    this.callbacks = callbacks;
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
    this.callbacks.pause();
  }

  resume(): void {
    this.callbacks.resume();
  }

  async step(frames = 1): Promise<StepResult> {
    return this.callbacks.step(frames);
  }

  setTimeScale(scale: number): void {
    this.callbacks.setTimeScale(scale);
  }

  getTimeState(): TimeState {
    return this.callbacks.getTimeState();
  }

  getSnapshot(options?: SnapshotOptions): GameSnapshot {
    const timeState = this.callbacks.getTimeState();
    const reactState = this.callbacks.getReactState();

    const snapshot: GameSnapshot = {
      timeState,
      react: reactState,
    };

    if (options?.includeGodot !== false && this.callbacks.getGodotSnapshot) {
      snapshot.godot = this.callbacks.getGodotSnapshot(options);
    }

    return snapshot;
  }

  get paused(): boolean {
    return this.callbacks.getTimeState().paused;
  }

  get timeScale(): number {
    return this.callbacks.getTimeState().timeScale;
  }

  get frame(): number {
    return this.callbacks.getTimeState().frame;
  }

  get elapsed(): number {
    return this.callbacks.getTimeState().elapsed;
  }
}
