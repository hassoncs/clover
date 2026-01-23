# Multiplayer Networking Architecture

## Overview

The networking system provides peer-to-peer multiplayer for the game engine, supporting both offline (BLE) and online (WebSocket) play.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Game Layer                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    GameSession                           │   │
│  │  - Host/client role management                          │   │
│  │  - High-level API for multiplayer                       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Synchronization Layer                        │
│  ┌───────────────────────┐  ┌───────────────────────────────┐  │
│  │   Box2DSynchronizer   │  │     NetEntityRegistry         │  │
│  │   - State snapshots   │  │   - Entity-network mapping    │  │
│  │   - Delta updates     │  │   - Ownership tracking        │  │
│  │   - Interpolation     │  │                               │  │
│  └───────────────────────┘  └───────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Network Abstraction Layer                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 NetworkTransport (Interface)             │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│   BLETransport           │    │   WebSocketTransport     │
│   - Offline local play   │    │   - Online room-based    │
│   - react-native-ble-plx │    │   - Relay server         │
└──────────────────────────┘    └──────────────────────────┘
```

## Key Design Decisions

### 1. Host-Authoritative Model

The host runs the authoritative physics simulation. Clients are primarily renderers that:
- Send inputs to the host
- Receive state updates
- Interpolate between states for smooth rendering

This simplifies conflict resolution and prevents cheating.

### 2. Network Integration Points

The networking system integrates with the game loop at two points:

```typescript
stepGame(dt) {
  netAdapter.preStep(tickId)     // Apply remote state/inputs
  physics.step(dt)
  entityManager.syncTransformsFromPhysics()
  camera.update()
  behaviorExecutor.executeAll()
  rulesEvaluator.update()
  netAdapter.postStep(tickId)    // Send state updates
}
```

### 3. State Synchronization Strategy

| Update Type | Frequency | Purpose |
|-------------|-----------|---------|
| Snapshot | Every 60 frames (~1Hz) | Full state recovery |
| Delta | Every 3 frames (~20Hz) | Incremental updates |
| Input | Every frame | Player actions |

### 4. Client Interpolation

Clients maintain a state buffer and interpolate with a 3-frame delay to smooth network jitter.

## File Structure

```
app/lib/networking/
├── types.ts                    # Core types and interfaces
├── GameSession.ts              # High-level session API
├── index.ts                    # Public exports
├── ble/
│   ├── constants.ts            # BLE UUIDs and config
│   ├── chunking.ts             # Message chunking for BLE MTU
│   ├── BLETransport.ts         # BLE central mode
│   └── BLEPeripheralManager.ts # BLE peripheral (stub)
├── websocket/
│   └── WebSocketTransport.ts   # WebSocket relay
└── sync/
    ├── Box2DSynchronizer.ts    # Physics state sync
    ├── NetEntityRegistry.ts    # Entity-network mapping
    └── NetworkGameLoop.ts      # Game loop integration
```

## Usage Example

```typescript
import { GameSession, createNetworkedPhysicsAdapter, NetEntityRegistry } from '@/lib/networking';

// Create registry and adapter
const registry = new NetEntityRegistry(localPeerId);
const adapter = createNetworkedPhysicsAdapter(physics, entityManager, registry, {
  onApplyInput: (playerId, input) => {
    // Apply input to player's controlled entities
  },
});

// Create session
const session = new GameSession({
  onStateChange: (state) => console.log('Connection:', state),
  onPlayerJoined: (id, name) => console.log(`${name} joined`),
  onPlayerLeft: (id) => console.log('Player left'),
  onGameStateUpdate: (state) => updateUI(state),
  onError: console.error,
});

// Host a game
await session.host({
  transportType: 'ble',
  deviceName: 'Player 1',
  gameId: 'my-game-v1',
}, adapter);

// Or join a game
await session.join({
  transportType: 'websocket',
  deviceName: 'Player 2',
  gameId: 'my-game-v1',
  sessionId: 'ABC123',
  serverUrl: 'wss://game-server.com',
}, adapter);

// Game loop
function gameLoop(dt: number) {
  const localInput = collectInput();
  session.update(localInput);
}
```

## BLE Implementation Notes

### Central Mode (Client)
Implemented using `react-native-ble-plx`. Scans for hosts advertising the game service UUID.

### Peripheral Mode (Host)
Requires native module implementation:
- **iOS**: `CBPeripheralManager` from CoreBluetooth
- **Android**: `BluetoothGattServer` + `BluetoothLeAdvertiser`

The `BLEPeripheralManager` interface provides a stub that throws helpful errors until native modules are implemented.

## WebSocket Server Protocol

The WebSocket transport expects a relay server with the following message types:

```typescript
// Client -> Server
{ type: 'create_room', gameId, deviceName, peerId }
{ type: 'join_room', roomId, deviceName, peerId }
{ type: 'relay', toPeerId, message }
{ type: 'broadcast', message }
{ type: 'leave_room' }

// Server -> Client
{ type: 'room_created', roomId }
{ type: 'room_joined', roomId, peers }
{ type: 'peer_joined', peerId, peerName }
{ type: 'peer_left', peerId }
{ type: 'relay', peerId, message }
{ type: 'broadcast', peerId, message }
{ type: 'error', error }
```

## Future Enhancements

1. **Client-side prediction** for local player entities
2. **Rollback/reconciliation** for competitive play
3. **Interest management** for large worlds
4. **NAT traversal** for direct P2P over internet
