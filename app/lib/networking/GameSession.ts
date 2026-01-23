import type {
  NetworkTransport,
  TransportEventHandlers,
  NetworkMessage,
  PeerId,
  PlayerInput,
  GameSyncState,
} from './types';
import { ConnectionState, SessionRole, MessageType } from './types';
import { BLETransport } from './ble/BLETransport';
import { WebSocketTransport } from './websocket/WebSocketTransport';
import {
  Box2DSynchronizer,
  type Box2DWorldAdapter,
  type SyncConfig,
} from './sync/Box2DSynchronizer';

export type TransportType = 'ble' | 'websocket';

export interface GameSessionConfig {
  transportType: TransportType;
  deviceName: string;
  gameId: string;
  sessionId?: string;
  serverUrl?: string;
  syncConfig?: Partial<SyncConfig>;
}

export interface GameSessionEventHandlers {
  onStateChange: (state: ConnectionState) => void;
  onPlayerJoined: (playerId: PeerId, playerName: string) => void;
  onPlayerLeft: (playerId: PeerId) => void;
  onGameStateUpdate: (gameState: GameSyncState) => void;
  onError: (error: Error) => void;
}

export class GameSession {
  private transport: NetworkTransport | null = null;
  private synchronizer: Box2DSynchronizer | null = null;
  private handlers: GameSessionEventHandlers;
  private config: GameSessionConfig | null = null;

  private _state: ConnectionState = ConnectionState.DISCONNECTED;
  private _role: SessionRole | null = null;

  constructor(handlers: GameSessionEventHandlers) {
    this.handlers = handlers;
  }

  get state(): ConnectionState {
    return this._state;
  }

  get role(): SessionRole | null {
    return this._role;
  }

  get isHost(): boolean {
    return this._role === SessionRole.HOST;
  }

  get isClient(): boolean {
    return this._role === SessionRole.CLIENT;
  }

  get roomCode(): string | null {
    if (this.transport instanceof WebSocketTransport) {
      return this.transport.getRoomCode();
    }
    return this.config?.sessionId ?? null;
  }

  get localPeerId(): PeerId | null {
    return this.transport?.localPeerId ?? null;
  }

  get connectedPlayers(): Array<{ id: PeerId; name: string }> {
    if (!this.transport) return [];
    return Array.from(this.transport.connectedPeers.entries()).map(
      ([id, info]) => ({
        id,
        name: info.name,
      })
    );
  }

  async host(
    config: GameSessionConfig,
    worldAdapter: Box2DWorldAdapter
  ): Promise<void> {
    this.config = config;

    this.transport = this.createTransport(config);
    await this.transport.initialize(this.createTransportHandlers());

    this.synchronizer = new Box2DSynchronizer(
      this.transport,
      worldAdapter,
      config.syncConfig
    );

    await this.transport.startHosting({
      deviceName: config.deviceName,
      gameId: config.gameId,
      sessionId: config.sessionId,
    });

    this._role = SessionRole.HOST;
  }

  async join(
    config: GameSessionConfig,
    worldAdapter: Box2DWorldAdapter
  ): Promise<void> {
    if (config.transportType === 'websocket' && !config.sessionId) {
      throw new Error('Room code (sessionId) required for online games');
    }

    this.config = config;

    this.transport = this.createTransport(config);
    await this.transport.initialize(this.createTransportHandlers());

    this.synchronizer = new Box2DSynchronizer(
      this.transport,
      worldAdapter,
      config.syncConfig
    );

    await this.transport.joinSession({
      deviceName: config.deviceName,
      gameId: config.gameId,
      sessionId: config.sessionId,
    });

    this._role = SessionRole.CLIENT;
  }

  update(localInput: PlayerInput): void {
    if (!this.synchronizer) return;

    if (this._role === SessionRole.HOST) {
      this.synchronizer.hostUpdate(localInput);
    } else {
      this.synchronizer.clientUpdate(localInput);
    }
  }

  setGameState(state: Partial<GameSyncState>): void {
    this.synchronizer?.setGameState(state);
  }

  getGameState(): GameSyncState {
    return (
      this.synchronizer?.getGameState() ?? {
        score: 0,
        lives: 3,
        time: 0,
        state: 'ready',
      }
    );
  }

  getLatency(peerId: PeerId): number {
    return this.transport?.getLatency(peerId) ?? 0;
  }

  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.disconnect();
      await this.transport.destroy();
      this.transport = null;
    }

    this.synchronizer = null;
    this._role = null;
    this._state = ConnectionState.DISCONNECTED;
  }

  private createTransport(config: GameSessionConfig): NetworkTransport {
    switch (config.transportType) {
      case 'ble':
        return new BLETransport();
      case 'websocket':
        if (!config.serverUrl) throw new Error('serverUrl required');
        return new WebSocketTransport({ serverUrl: config.serverUrl });
      default:
        throw new Error(`Unknown transport: ${config.transportType}`);
    }
  }

  private createTransportHandlers(): TransportEventHandlers {
    return {
      onStateChange: (state, error) => {
        this._state = state;
        this.handlers.onStateChange(state);
        if (error) this.handlers.onError(error);
      },
      onPeerConnected: (peerId, peerName) => {
        this.handlers.onPlayerJoined(peerId, peerName);
      },
      onPeerDisconnected: (peerId) => {
        this.handlers.onPlayerLeft(peerId);
      },
      onMessage: (message, fromPeerId) => {
        this.synchronizer?.onMessage(message, fromPeerId);

        if (
          message.type === MessageType.STATE_SNAPSHOT ||
          message.type === MessageType.STATE_DELTA
        ) {
          this.handlers.onGameStateUpdate(this.getGameState());
        }
      },
      onError: (error) => {
        this.handlers.onError(error);
      },
    };
  }
}
