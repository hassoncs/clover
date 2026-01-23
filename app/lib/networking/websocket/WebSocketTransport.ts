import type {
  NetworkTransport,
  TransportConfig,
  TransportEventHandlers,
  NetworkMessage,
  PeerId,
  PeerInfo,
} from '../types';
import { ConnectionState, SessionRole, MessageType } from '../types';

interface ServerMessage {
  type:
    | 'room_created'
    | 'room_joined'
    | 'peer_joined'
    | 'peer_left'
    | 'relay'
    | 'broadcast'
    | 'error';
  roomId?: string;
  peerId?: string;
  peerName?: string;
  message?: NetworkMessage;
  error?: string;
  peers?: Array<{ peerId: string; name: string }>;
}

export interface WebSocketConfig {
  serverUrl: string;
}

const WS_CONSTANTS = {
  PING_INTERVAL_MS: 1000,
  CONNECTION_TIMEOUT_MS: 10000,
  RECONNECT_DELAY_MS: 1000,
  MAX_RECONNECT_ATTEMPTS: 5,
} as const;

export class WebSocketTransport implements NetworkTransport {
  private ws: WebSocket | null = null;
  private handlers: TransportEventHandlers | null = null;
  private config: TransportConfig | null = null;
  private serverConfig: WebSocketConfig;

  private _state: ConnectionState = ConnectionState.DISCONNECTED;
  private _role: SessionRole | null = null;
  private _localPeerId: PeerId;
  private _connectedPeers = new Map<PeerId, PeerInfo>();

  private sequenceCounter = 0;
  private roomId: string | null = null;
  private pingTimestamps = new Map<PeerId, number>();
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts = 0;

  constructor(serverConfig: WebSocketConfig) {
    this.serverConfig = serverConfig;
    this._localPeerId = this.generatePeerId();
  }

  get state(): ConnectionState {
    return this._state;
  }

  get role(): SessionRole | null {
    return this._role;
  }

  get localPeerId(): PeerId {
    return this._localPeerId;
  }

  get connectedPeers(): Map<PeerId, PeerInfo> {
    return new Map(this._connectedPeers);
  }

  getRoomCode(): string | null {
    return this.roomId;
  }

  async initialize(handlers: TransportEventHandlers): Promise<void> {
    this.handlers = handlers;
    this.setState(ConnectionState.DISCONNECTED);
  }

  async startHosting(config: TransportConfig): Promise<void> {
    this.config = config;
    this._role = SessionRole.HOST;
    this.setState(ConnectionState.CONNECTING);

    await this.connectToServer();

    this.sendServerMessage({
      type: 'create_room',
      gameId: config.gameId,
      deviceName: config.deviceName,
      peerId: this._localPeerId,
    });
  }

  async joinSession(config: TransportConfig): Promise<void> {
    if (!config.sessionId) {
      throw new Error('sessionId (room code) is required to join');
    }

    this.config = config;
    this._role = SessionRole.CLIENT;
    this.setState(ConnectionState.CONNECTING);

    await this.connectToServer();

    this.sendServerMessage({
      type: 'join_room',
      roomId: config.sessionId,
      deviceName: config.deviceName,
      peerId: this._localPeerId,
    });
  }

  async disconnect(): Promise<void> {
    this.stopPingInterval();

    if (this.ws) {
      this.sendServerMessage({ type: 'leave_room' });
      this.ws.close();
      this.ws = null;
    }

    this._connectedPeers.clear();
    this._role = null;
    this.roomId = null;
    this.setState(ConnectionState.DISCONNECTED);
  }

  async destroy(): Promise<void> {
    await this.disconnect();
  }

  send(message: NetworkMessage, toPeerId: PeerId): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected');
      return;
    }

    message.senderId = this._localPeerId;
    message.sequence = this.sequenceCounter++;

    this.sendServerMessage({
      type: 'relay',
      toPeerId,
      message,
    });
  }

  broadcast(message: NetworkMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected');
      return;
    }

    message.senderId = this._localPeerId;
    message.sequence = this.sequenceCounter++;

    this.sendServerMessage({
      type: 'broadcast',
      message,
    });
  }

  getLatency(peerId: PeerId): number {
    return this._connectedPeers.get(peerId)?.latency ?? 0;
  }

  private async connectToServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.serverConfig.serverUrl);

      const timeout = setTimeout(
        () => reject(new Error('Connection timeout')),
        WS_CONSTANTS.CONNECTION_TIMEOUT_MS
      );

      this.ws.onopen = () => {
        clearTimeout(timeout);
        this.reconnectAttempts = 0;
        this.startPingInterval();
        resolve();
      };

      this.ws.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('WebSocket connection failed'));
      };

      this.ws.onclose = (event) => this.handleDisconnection(event.reason);

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ServerMessage;
          this.onServerMessage(data);
        } catch (e) {
          console.error('Failed to parse server message:', e);
        }
      };
    });
  }

  private handleDisconnection(reason: string): void {
    if (this._state === ConnectionState.DISCONNECTED) return;

    this.stopPingInterval();

    if (this.reconnectAttempts < WS_CONSTANTS.MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
      this.setState(ConnectionState.RECONNECTING);

      setTimeout(async () => {
        try {
          await this.connectToServer();
          if (this.roomId && this.config) {
            this.sendServerMessage({
              type: 'rejoin_room',
              roomId: this.roomId,
              peerId: this._localPeerId,
              deviceName: this.config.deviceName,
            });
          }
        } catch {
          this.handleDisconnection('Reconnection failed');
        }
      }, WS_CONSTANTS.RECONNECT_DELAY_MS * this.reconnectAttempts);
    } else {
      this.setState(ConnectionState.DISCONNECTED);
      this.handlers?.onError(new Error(`Connection lost: ${reason}`));
    }
  }

  private sendServerMessage(data: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private onServerMessage(data: ServerMessage): void {
    switch (data.type) {
      case 'room_created':
        this.roomId = data.roomId!;
        this.setState(ConnectionState.ADVERTISING);
        break;

      case 'room_joined':
        this.roomId = data.roomId!;
        if (data.peers) {
          for (const peer of data.peers) {
            this._connectedPeers.set(peer.peerId, {
              name: peer.name,
              latency: 0,
              lastSeen: Date.now(),
            });
            this.handlers?.onPeerConnected(peer.peerId, peer.name);
          }
        }
        this.setState(ConnectionState.CONNECTED);
        break;

      case 'peer_joined':
        this._connectedPeers.set(data.peerId!, {
          name: data.peerName!,
          latency: 0,
          lastSeen: Date.now(),
        });
        this.handlers?.onPeerConnected(data.peerId!, data.peerName!);
        if (this._state === ConnectionState.ADVERTISING) {
          this.setState(ConnectionState.CONNECTED);
        }
        break;

      case 'peer_left':
        this._connectedPeers.delete(data.peerId!);
        this.handlers?.onPeerDisconnected(data.peerId!, 'left');
        break;

      case 'relay':
      case 'broadcast':
        if (data.message && data.peerId) {
          this.handleGameMessage(data.message, data.peerId);
        }
        break;

      case 'error':
        this.handlers?.onError(new Error(data.error || 'Unknown server error'));
        break;
    }
  }

  private handleGameMessage(message: NetworkMessage, fromPeerId: PeerId): void {
    const peerData = this._connectedPeers.get(fromPeerId);
    if (peerData) {
      peerData.lastSeen = Date.now();
    }

    if (message.type === MessageType.PING) {
      this.send({ ...message, type: MessageType.PONG }, fromPeerId);
      return;
    }

    if (message.type === MessageType.PONG) {
      const sentAt = this.pingTimestamps.get(fromPeerId);
      if (sentAt && peerData) {
        const latency = Date.now() - sentAt;
        peerData.latency = peerData.latency * 0.8 + latency * 0.2;
      }
      return;
    }

    this.handlers?.onMessage(message, fromPeerId);
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      for (const peerId of this._connectedPeers.keys()) {
        this.pingTimestamps.set(peerId, Date.now());
        this.send(
          {
            type: MessageType.PING,
            timestamp: Date.now(),
            sequence: 0,
            senderId: this._localPeerId,
          },
          peerId
        );
      }
    }, WS_CONSTANTS.PING_INTERVAL_MS);
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private setState(state: ConnectionState): void {
    this._state = state;
    this.handlers?.onStateChange(state);
  }

  private generatePeerId(): PeerId {
    return `ws-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
  }
}
