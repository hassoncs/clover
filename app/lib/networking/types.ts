/**
 * Multiplayer Networking Types
 *
 * Core types and interfaces for the peer-to-peer multiplayer system.
 * Supports both BLE (offline) and WebSocket (online) transports.
 */

/**
 * Unique identifier for a connected peer
 */
export type PeerId = string;

/**
 * Unique identifier for a networked entity
 */
export type NetEntityId = string;

/**
 * Role in the game session
 */
export enum SessionRole {
  HOST = 'host',
  CLIENT = 'client',
}

/**
 * Connection state of the transport
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  ADVERTISING = 'advertising',
  SCANNING = 'scanning',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

/**
 * Message types for the game protocol
 */
export enum MessageType {
  HANDSHAKE_REQUEST = 'handshake_request',
  HANDSHAKE_RESPONSE = 'handshake_response',

  STATE_SNAPSHOT = 'state_snapshot',
  STATE_DELTA = 'state_delta',

  INPUT_EVENT = 'input_event',
  INPUT_ACK = 'input_ack',

  ENTITY_SPAWN = 'entity_spawn',
  ENTITY_DESPAWN = 'entity_despawn',

  GAME_EVENT = 'game_event',
  GAME_START = 'game_start',
  GAME_PAUSE = 'game_pause',
  GAME_RESUME = 'game_resume',
  GAME_END = 'game_end',

  PING = 'ping',
  PONG = 'pong',
}

/**
 * Base message structure - all messages extend this
 */
export interface NetworkMessage {
  type: MessageType;
  timestamp: number;
  sequence: number;
  senderId: PeerId;
}

/**
 * Physics body state for synchronization
 */
export interface BodyState {
  id: string;
  netEntityId: NetEntityId;
  position: { x: number; y: number };
  angle: number;
  linearVelocity: { x: number; y: number };
  angularVelocity: number;
  isAwake: boolean;
}

/**
 * Full game state snapshot (sent periodically)
 */
export interface StateSnapshot extends NetworkMessage {
  type: MessageType.STATE_SNAPSHOT;
  tickId: number;
  bodies: BodyState[];
  gameState: GameSyncState;
}

/**
 * Delta update - only changed bodies (sent frequently)
 */
export interface StateDelta extends NetworkMessage {
  type: MessageType.STATE_DELTA;
  tickId: number;
  baseTickId: number;
  changedBodies: BodyState[];
  removedBodyIds: string[];
  addedBodies: BodyState[];
  gameStateDelta?: Partial<GameSyncState>;
}

/**
 * Synchronized game state
 */
export interface GameSyncState {
  score: number;
  lives: number;
  time: number;
  state: 'loading' | 'ready' | 'playing' | 'paused' | 'won' | 'lost';
  variables?: Record<string, unknown>;
}

/**
 * Entity spawn message (host -> clients)
 */
export interface EntitySpawnMessage extends NetworkMessage {
  type: MessageType.ENTITY_SPAWN;
  netEntityId: NetEntityId;
  templateId: string;
  transform: {
    x: number;
    y: number;
    angle: number;
    scaleX: number;
    scaleY: number;
  };
  initialVelocity?: { x: number; y: number };
  ownerPeerId?: PeerId;
}

/**
 * Entity despawn message (host -> clients)
 */
export interface EntityDespawnMessage extends NetworkMessage {
  type: MessageType.ENTITY_DESPAWN;
  netEntityId: NetEntityId;
  reason?: 'destroyed' | 'pooled' | 'out_of_bounds';
}

/**
 * Player input event (client -> host)
 */
export interface InputEvent extends NetworkMessage {
  type: MessageType.INPUT_EVENT;
  tickId: number;
  playerId: PeerId;
  inputs: PlayerInput;
}

/**
 * Player input data structure
 */
export interface PlayerInput {
  touches: Array<{
    id: number;
    phase: 'began' | 'moved' | 'ended' | 'cancelled';
    position: { x: number; y: number };
    worldPosition?: { x: number; y: number };
  }>;

  movement?: { x: number; y: number };

  actions: Record<string, boolean>;

  accelerometer?: { x: number; y: number; z: number };

  tap?: {
    x: number;
    y: number;
    worldX: number;
    worldY: number;
  };

  drag?: {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    worldStartX: number;
    worldStartY: number;
    worldCurrentX: number;
    worldCurrentY: number;
  };
}

/**
 * Game event message (host -> clients) for authoritative events
 */
export interface GameEventMessage extends NetworkMessage {
  type: MessageType.GAME_EVENT;
  eventName: string;
  data: Record<string, unknown>;
}

/**
 * Handshake request (client -> host)
 */
export interface HandshakeRequest extends NetworkMessage {
  type: MessageType.HANDSHAKE_REQUEST;
  deviceName: string;
  gameVersion: string;
}

/**
 * Handshake response (host -> client)
 */
export interface HandshakeResponse extends NetworkMessage {
  type: MessageType.HANDSHAKE_RESPONSE;
  accepted: boolean;
  assignedPeerId: PeerId;
  hostName: string;
  gameState: GameSyncState;
  rejectReason?: string;
}

/**
 * Transport event handlers
 */
export interface TransportEventHandlers {
  onStateChange: (state: ConnectionState, error?: Error) => void;
  onPeerConnected: (peerId: PeerId, peerName: string) => void;
  onPeerDisconnected: (peerId: PeerId, reason: string) => void;
  onMessage: (message: NetworkMessage, fromPeerId: PeerId) => void;
  onError: (error: Error) => void;
}

/**
 * Configuration for transport initialization
 */
export interface TransportConfig {
  deviceName: string;
  gameId: string;
  gameVersion?: string;
  sessionId?: string;
}

/**
 * Peer information
 */
export interface PeerInfo {
  name: string;
  latency: number;
  lastSeen: number;
}

/**
 * Abstract transport interface - implemented by BLE and WebSocket
 */
export interface NetworkTransport {
  readonly state: ConnectionState;
  readonly role: SessionRole | null;
  readonly localPeerId: PeerId;
  readonly connectedPeers: Map<PeerId, PeerInfo>;

  initialize(handlers: TransportEventHandlers): Promise<void>;

  startHosting(config: TransportConfig): Promise<void>;

  joinSession(config: TransportConfig): Promise<void>;

  send(message: NetworkMessage, toPeerId: PeerId): void;

  broadcast(message: NetworkMessage): void;

  disconnect(): Promise<void>;

  destroy(): Promise<void>;

  getLatency(peerId: PeerId): number;
}

/**
 * Simulation clock for synchronized ticks
 */
export interface SimulationClock {
  tickId: number;
  accumulator: number;
  fixedTimestep: number;
  lastTime: number;
}

/**
 * Network statistics
 */
export interface NetworkStats {
  messagesSent: number;
  messagesReceived: number;
  bytesSent: number;
  bytesReceived: number;
  averageLatency: number;
  packetLoss: number;
}
