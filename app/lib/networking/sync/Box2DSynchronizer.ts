import type {
  NetworkTransport,
  NetworkMessage,
  StateSnapshot,
  StateDelta,
  InputEvent,
  BodyState,
  PlayerInput,
  PeerId,
  NetEntityId,
  GameSyncState,
} from '../types';
import { MessageType, SessionRole } from '../types';

export interface Box2DWorldAdapter {
  getDynamicBodies(): Array<{ id: string; netEntityId: NetEntityId }>;
  getBodyState(id: string): BodyState;
  setBodyState(id: string, state: BodyState): void;
  applyInput(playerId: PeerId, input: PlayerInput): void;
  step(deltaTime: number): void;
  getTickId(): number;
  incrementTickId(): void;
}

export interface SyncConfig {
  snapshotInterval: number;
  deltaInterval: number;
  fixedTimestep: number;
  interpolationDelay: number;
  inputBufferSize: number;
}

const DEFAULT_CONFIG: SyncConfig = {
  snapshotInterval: 60,
  deltaInterval: 3,
  fixedTimestep: 1 / 60,
  interpolationDelay: 3,
  inputBufferSize: 10,
};

interface StateBufferEntry {
  tickId: number;
  bodies: BodyState[];
  gameState?: GameSyncState;
}

export class Box2DSynchronizer {
  private transport: NetworkTransport;
  private worldAdapter: Box2DWorldAdapter;
  private config: SyncConfig;

  private inputBuffer = new Map<PeerId, PlayerInput[]>();
  private lastSnapshotTick = 0;
  private lastDeltaTick = 0;
  private previousBodyStates = new Map<string, BodyState>();

  private stateBuffer: StateBufferEntry[] = [];
  private lastReceivedTick = 0;

  private localPlayerId: PeerId;
  private gameState: GameSyncState = {
    score: 0,
    lives: 3,
    time: 0,
    state: 'ready',
  };

  constructor(
    transport: NetworkTransport,
    worldAdapter: Box2DWorldAdapter,
    config: Partial<SyncConfig> = {}
  ) {
    this.transport = transport;
    this.worldAdapter = worldAdapter;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.localPlayerId = transport.localPeerId;
  }

  hostUpdate(localInput: PlayerInput): void {
    const tickId = this.worldAdapter.getTickId();

    this.bufferInput(this.localPlayerId, localInput);
    this.applyBufferedInputs();

    this.worldAdapter.step(this.config.fixedTimestep);
    this.worldAdapter.incrementTickId();

    if (tickId - this.lastSnapshotTick >= this.config.snapshotInterval) {
      this.sendSnapshot();
      this.lastSnapshotTick = tickId;
      this.lastDeltaTick = tickId;
    } else if (tickId - this.lastDeltaTick >= this.config.deltaInterval) {
      this.sendDelta();
      this.lastDeltaTick = tickId;
    }
  }

  clientUpdate(localInput: PlayerInput): void {
    this.sendInput(localInput);
    this.interpolateState();
  }

  onMessage(message: NetworkMessage, fromPeerId: PeerId): void {
    switch (message.type) {
      case MessageType.STATE_SNAPSHOT:
        this.onSnapshot(message as StateSnapshot);
        break;
      case MessageType.STATE_DELTA:
        this.onDelta(message as StateDelta);
        break;
      case MessageType.INPUT_EVENT:
        this.onInput(message as InputEvent);
        break;
    }
  }

  setGameState(state: Partial<GameSyncState>): void {
    this.gameState = { ...this.gameState, ...state };
  }

  getGameState(): GameSyncState {
    return this.gameState;
  }

  private bufferInput(playerId: PeerId, input: PlayerInput): void {
    let buffer = this.inputBuffer.get(playerId);
    if (!buffer) {
      buffer = [];
      this.inputBuffer.set(playerId, buffer);
    }

    buffer.push(input);

    if (buffer.length > this.config.inputBufferSize) {
      buffer.shift();
    }
  }

  private applyBufferedInputs(): void {
    for (const [playerId, inputs] of this.inputBuffer) {
      const input = inputs[inputs.length - 1];
      if (input) {
        this.worldAdapter.applyInput(playerId, input);
      }
    }
  }

  private onInput(event: InputEvent): void {
    if (this.transport.role !== SessionRole.HOST) return;
    this.bufferInput(event.playerId, event.inputs);
  }

  private sendSnapshot(): void {
    const tickId = this.worldAdapter.getTickId();
    const bodies = this.getAllBodyStates();

    const snapshot: StateSnapshot = {
      type: MessageType.STATE_SNAPSHOT,
      timestamp: Date.now(),
      sequence: 0,
      senderId: this.localPlayerId,
      tickId,
      bodies,
      gameState: this.gameState,
    };

    this.transport.broadcast(snapshot);
    this.updatePreviousStates(bodies);
  }

  private sendDelta(): void {
    const tickId = this.worldAdapter.getTickId();
    const currentBodies = this.getAllBodyStates();

    const changedBodies: BodyState[] = [];
    const addedBodies: BodyState[] = [];
    const removedBodyIds: string[] = [];

    const currentIds = new Set(currentBodies.map((b) => b.id));
    const previousIds = new Set(this.previousBodyStates.keys());

    for (const body of currentBodies) {
      const previous = this.previousBodyStates.get(body.id);
      if (!previous) {
        addedBodies.push(body);
      } else if (this.hasBodyChanged(previous, body)) {
        changedBodies.push(body);
      }
    }

    for (const id of previousIds) {
      if (!currentIds.has(id)) {
        removedBodyIds.push(id);
      }
    }

    if (changedBodies.length || addedBodies.length || removedBodyIds.length) {
      const delta: StateDelta = {
        type: MessageType.STATE_DELTA,
        timestamp: Date.now(),
        sequence: 0,
        senderId: this.localPlayerId,
        tickId,
        baseTickId: this.lastSnapshotTick,
        changedBodies,
        addedBodies,
        removedBodyIds,
      };

      this.transport.broadcast(delta);
    }

    this.updatePreviousStates(currentBodies);
  }

  private getAllBodyStates(): BodyState[] {
    return this.worldAdapter.getDynamicBodies().map(({ id }) =>
      this.worldAdapter.getBodyState(id)
    );
  }

  private updatePreviousStates(bodies: BodyState[]): void {
    this.previousBodyStates.clear();
    for (const body of bodies) {
      this.previousBodyStates.set(body.id, { ...body });
    }
  }

  private hasBodyChanged(previous: BodyState, current: BodyState): boolean {
    const POS = 0.001;
    const ANG = 0.001;
    const VEL = 0.01;
    return (
      Math.abs(previous.position.x - current.position.x) > POS ||
      Math.abs(previous.position.y - current.position.y) > POS ||
      Math.abs(previous.angle - current.angle) > ANG ||
      Math.abs(previous.linearVelocity.x - current.linearVelocity.x) > VEL ||
      Math.abs(previous.linearVelocity.y - current.linearVelocity.y) > VEL ||
      previous.isAwake !== current.isAwake
    );
  }

  private sendInput(input: PlayerInput): void {
    const event: InputEvent = {
      type: MessageType.INPUT_EVENT,
      timestamp: Date.now(),
      sequence: 0,
      senderId: this.localPlayerId,
      tickId: this.lastReceivedTick + this.config.interpolationDelay,
      playerId: this.localPlayerId,
      inputs: input,
    };

    for (const [peerId] of this.transport.connectedPeers) {
      this.transport.send(event, peerId);
    }
  }

  private onSnapshot(snapshot: StateSnapshot): void {
    if (this.transport.role !== SessionRole.CLIENT) return;

    this.stateBuffer.push({
      tickId: snapshot.tickId,
      bodies: snapshot.bodies,
      gameState: snapshot.gameState,
    });

    this.gameState = snapshot.gameState;
    this.lastReceivedTick = snapshot.tickId;

    if (this.stateBuffer.length > 30) {
      this.stateBuffer = this.stateBuffer.slice(-20);
    }
  }

  private onDelta(delta: StateDelta): void {
    if (this.transport.role !== SessionRole.CLIENT) return;

    const baseState = this.stateBuffer.find((s) => s.tickId === delta.baseTickId);
    if (!baseState) return;

    const newBodies = new Map<string, BodyState>();

    for (const body of baseState.bodies) {
      newBodies.set(body.id, body);
    }

    for (const body of delta.changedBodies) {
      newBodies.set(body.id, body);
    }

    for (const body of delta.addedBodies) {
      newBodies.set(body.id, body);
    }

    for (const id of delta.removedBodyIds) {
      newBodies.delete(id);
    }

    this.stateBuffer.push({
      tickId: delta.tickId,
      bodies: Array.from(newBodies.values()),
      gameState: delta.gameStateDelta
        ? { ...this.gameState, ...delta.gameStateDelta }
        : this.gameState,
    });

    this.lastReceivedTick = delta.tickId;
  }

  private interpolateState(): void {
    if (this.stateBuffer.length < 2) {
      if (this.stateBuffer.length === 1) {
        this.applyState(this.stateBuffer[0].bodies);
      }
      return;
    }

    const targetTick = this.lastReceivedTick - this.config.interpolationDelay;

    let before: StateBufferEntry | null = null;
    let after: StateBufferEntry | null = null;

    for (const state of this.stateBuffer) {
      if (state.tickId <= targetTick) before = state;
      if (state.tickId >= targetTick && !after) after = state;
    }

    if (!before && after) {
      this.applyState(after.bodies);
      return;
    }

    if (before && !after) {
      this.applyState(before.bodies);
      return;
    }

    if (before && after && before !== after) {
      const t = (targetTick - before.tickId) / (after.tickId - before.tickId);
      const interpolated = this.interpolateBodies(before.bodies, after.bodies, t);
      this.applyState(interpolated);
    } else if (before) {
      this.applyState(before.bodies);
    }
  }

  private interpolateBodies(
    from: BodyState[],
    to: BodyState[],
    t: number
  ): BodyState[] {
    const fromMap = new Map(from.map((b) => [b.id, b]));
    const result: BodyState[] = [];

    for (const toBody of to) {
      const fromBody = fromMap.get(toBody.id);

      if (fromBody) {
        result.push({
          id: toBody.id,
          netEntityId: toBody.netEntityId,
          position: {
            x: this.lerp(fromBody.position.x, toBody.position.x, t),
            y: this.lerp(fromBody.position.y, toBody.position.y, t),
          },
          angle: this.lerpAngle(fromBody.angle, toBody.angle, t),
          linearVelocity: {
            x: this.lerp(fromBody.linearVelocity.x, toBody.linearVelocity.x, t),
            y: this.lerp(fromBody.linearVelocity.y, toBody.linearVelocity.y, t),
          },
          angularVelocity: this.lerp(
            fromBody.angularVelocity,
            toBody.angularVelocity,
            t
          ),
          isAwake: toBody.isAwake,
        });
      } else {
        result.push(toBody);
      }
    }

    return result;
  }

  private applyState(bodies: BodyState[]): void {
    for (const state of bodies) {
      this.worldAdapter.setBodyState(state.id, state);
    }
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private lerpAngle(a: number, b: number, t: number): number {
    let diff = b - a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
  }
}
