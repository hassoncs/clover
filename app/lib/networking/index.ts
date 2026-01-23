export * from './types';
export { GameSession, type GameSessionConfig, type GameSessionEventHandlers, type TransportType } from './GameSession';
export { BLETransport } from './ble/BLETransport';
export { WebSocketTransport, type WebSocketConfig } from './websocket/WebSocketTransport';
export { Box2DSynchronizer, type Box2DWorldAdapter, type SyncConfig } from './sync/Box2DSynchronizer';
export { NetEntityRegistry, type NetEntityRecord } from './sync/NetEntityRegistry';
export { createNetworkedPhysicsAdapter, createInitialMultiplayerState, type NetworkedPhysicsAdapter, type MultiplayerGameState } from './sync/NetworkGameLoop';
export { BLE_CONSTANTS } from './ble/constants';
export { chunkMessage, ChunkReassembler } from './ble/chunking';
export { createBLEPeripheralManager, type BLEPeripheralManager, type PeripheralConfig, type SessionInfo } from './ble/BLEPeripheralManager';

export { useMultiplayer, type UseMultiplayerOptions, type UseMultiplayerReturn, type MultiplayerState } from './hooks/useMultiplayer';
export { MultiplayerLobby, type MultiplayerLobbyProps } from './ui/MultiplayerLobby';
export { ConnectionStatusOverlay, MinimalConnectionIndicator, type ConnectionStatusOverlayProps } from './ui/ConnectionStatusOverlay';
export { PlayerListPanel, CompactPlayerList, type PlayerListPanelProps, type Player } from './ui/PlayerListPanel';
export { GameRuntimeAdapter, createNetworkAdapter, type GameRuntimeAdapterConfig, type EntityManagerLike } from './integration/GameRuntimeAdapter';
