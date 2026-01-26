# Two-Player Multiplayer Architecture

**Status**: 📋 Design Document (Partially Implemented)  
**Created**: 2026-01-25  
**Purpose**: Comprehensive analysis of 2-player multiplayer for Slopcade, comparing current JSON system vs AI code generation, with focus on "super simple" BLE local play

---

## Executive Summary

Slopcade already has **significant networking infrastructure** in place:
- ✅ Full type system for multiplayer (`app/lib/networking/types.ts`)
- ✅ Host-authoritative model with state sync
- ✅ BLE transport (central/client mode)
- ✅ WebSocket transport (online relay)
- ✅ Box2D state synchronizer
- ✅ Entity ownership and registry
- ⚠️ BLE peripheral mode (stub - needs native implementation)

**The Primary Blocker**: BLE "Host Game" requires native module implementation for iOS (CoreBluetooth CBPeripheralManager) and Android (BluetoothGattServer).

**This document covers**:
1. Current system capabilities for 2-player
2. What AI code generation could add
3. BLE peripheral implementation options
4. Alternative transports (simpler paths)
5. Game-type specific multiplayer patterns
6. Implementation roadmap

---

## Table of Contents

1. [Current Infrastructure Analysis](#current-infrastructure-analysis)
2. [Multiplayer with Current JSON System](#multiplayer-with-current-json-system)
3. [Multiplayer with AI Code Generation](#multiplayer-with-ai-code-generation)
4. [Transport Options Analysis](#transport-options-analysis)
5. [BLE Peripheral Implementation](#ble-peripheral-implementation)
6. [Game-Type Specific Patterns](#game-type-specific-patterns)
7. [New Primitives Needed](#new-primitives-needed)
8. [Implementation Roadmap](#implementation-roadmap)
9. [Cost-Benefit Analysis](#cost-benefit-analysis)

---

## Current Infrastructure Analysis

### What's Already Built

```
app/lib/networking/
├── types.ts                      ✅ Full type definitions (302 lines)
├── GameSession.ts                ✅ High-level session API
├── index.ts                      ✅ Public exports
├── ble/
│   ├── constants.ts              ✅ BLE UUIDs and config
│   ├── chunking.ts               ✅ Message chunking for BLE MTU
│   ├── BLETransport.ts           ✅ BLE central mode (join game)
│   └── BLEPeripheralManager.ts   ⚠️ STUB (needs native module)
├── websocket/
│   └── WebSocketTransport.ts     ✅ WebSocket relay client
├── sync/
│   ├── Box2DSynchronizer.ts      ✅ Physics state sync
│   ├── NetEntityRegistry.ts      ✅ Entity-network mapping
│   └── NetworkGameLoop.ts        ✅ Game loop integration
├── integration/
│   └── GameRuntimeAdapter.ts     ✅ Bridge to game engine
├── hooks/
│   └── useMultiplayer.ts         ✅ React hook for UI
└── native/
    └── BLEPeripheralModule.ts    ⚠️ Native module interface (not impl)
```

### Architecture Already Designed

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
│   ✅ Client mode works   │    │   ✅ Full implementation │
│   ⚠️ Host needs native   │    │   Needs relay server     │
└──────────────────────────┘    └──────────────────────────┘
```

### Synchronization Strategy (Already Designed)

| Update Type | Frequency | Data Size | Purpose |
|-------------|-----------|-----------|---------|
| Snapshot | ~1Hz (every 60 frames) | ~500-2KB | Full state recovery |
| Delta | ~20Hz (every 3 frames) | ~50-200B | Incremental changes |
| Input | 60Hz (every frame) | ~20-50B | Player actions |

### Type System (Already Defined)

```typescript
// Core types already in types.ts:

// Session roles
enum SessionRole { HOST, CLIENT }

// Connection states
enum ConnectionState { DISCONNECTED, CONNECTING, ADVERTISING, SCANNING, CONNECTED, ... }

// Message types
enum MessageType {
  HANDSHAKE_REQUEST, HANDSHAKE_RESPONSE,
  STATE_SNAPSHOT, STATE_DELTA,
  INPUT_EVENT, INPUT_ACK,
  ENTITY_SPAWN, ENTITY_DESPAWN,
  GAME_EVENT, GAME_START, GAME_PAUSE, GAME_RESUME, GAME_END,
  PING, PONG
}

// Physics body state
interface BodyState {
  id: string;
  netEntityId: NetEntityId;
  position: { x: number; y: number };
  angle: number;
  linearVelocity: { x: number; y: number };
  angularVelocity: number;
  isAwake: boolean;
}

// Player input
interface PlayerInput {
  touches: Array<{ id, phase, position, worldPosition }>;
  movement?: { x, y };
  actions: Record<string, boolean>;
  accelerometer?: { x, y, z };
  tap?: { x, y, worldX, worldY };
  drag?: { startX, startY, currentX, currentY, ... };
}
```

---

## Multiplayer with Current JSON System

### What Works Today (If BLE Peripheral Was Implemented)

#### 1. Physics Games (Sling Shot, Ball Launcher, etc.)

**Host**: Runs authoritative physics, sends state
**Client**: Sends input, receives state, interpolates

```json
{
  "name": "2-Player Slingshot Battle",
  "gameType": "ballLauncher",
  "multiplayer": {
    "enabled": true,
    "maxPlayers": 2,
    "mode": "versus"
  },
  "rules": [
    {
      "name": "player_1_shoot",
      "trigger": { "type": "drag", "phase": "end", "target": { "tag": "launcher_p1" } },
      "conditions": [
        { "type": "is_local_player", "player": 1 }
      ],
      "actions": [
        { "action": "spawn", "template": "projectile", "owner": "player_1" },
        { "action": "apply_impulse", "use_drag_vector": true }
      ]
    },
    {
      "name": "player_2_shoot",
      "trigger": { "type": "drag", "phase": "end", "target": { "tag": "launcher_p2" } },
      "conditions": [
        { "type": "is_local_player", "player": 2 }
      ],
      "actions": [
        { "action": "spawn", "template": "projectile", "owner": "player_2" },
        { "action": "apply_impulse", "use_drag_vector": true }
      ]
    }
  ]
}
```

**What's Needed**: 
- New condition: `is_local_player`
- Entity ownership concept in rules

#### 2. Turn-Based Games (Card Games)

With the card game primitives from [ai-code-generation-architecture.md](./ai-code-generation-architecture.md):

```json
{
  "name": "2-Player Card Game",
  "gameType": "card_game",
  "multiplayer": {
    "enabled": true,
    "maxPlayers": 2,
    "turnBased": true
  },
  "behaviors": [
    {
      "type": "turn_controller",
      "playerCount": 2,
      "turnOrder": "alternating",
      "currentPlayerVariable": "current_player"
    }
  ],
  "rules": [
    {
      "name": "play_card",
      "trigger": { "type": "drag", "phase": "end", "target": { "tag": "card" } },
      "conditions": [
        { "type": "is_my_turn" },
        { "type": "card_in_my_hand", "card": "this" }
      ],
      "actions": [
        { "action": "play_card_to_zone", "zone": "discard_pile" },
        { "action": "end_turn" }
      ]
    }
  ]
}
```

**What's Needed**:
- Card game primitives (Appendix D of AI code gen doc)
- New condition: `is_my_turn`
- Turn sync over network

#### 3. Shared Control Games (Co-op)

```json
{
  "name": "2-Player Stacking",
  "gameType": "stackAttack",
  "multiplayer": {
    "enabled": true,
    "maxPlayers": 2,
    "mode": "coop"
  },
  "entities": [
    {
      "id": "dropper_p1",
      "template": "dropper",
      "owner": "player_1",
      "x": -3, "y": 8
    },
    {
      "id": "dropper_p2", 
      "template": "dropper",
      "owner": "player_2",
      "x": 3, "y": 8
    }
  ],
  "rules": [
    {
      "name": "drop_block",
      "trigger": { "type": "tap" },
      "conditions": [
        { "type": "tap_on_own_dropper" }
      ],
      "actions": [
        { "action": "spawn", "template": "block", "at": "dropper" }
      ]
    }
  ]
}
```

### Limitations of Current JSON System for Multiplayer

| Limitation | Impact | Workaround |
|------------|--------|------------|
| No `owner` field on entities | Can't distinguish who controls what | Add `owner` to GameEntity type |
| No `is_local_player` condition | Can't restrict actions to local player | Add new rule condition |
| No turn sync primitives | Turn-based games awkward | Add turn_controller behavior |
| No hidden information | Card games can't hide hands | Separate visible state per player |
| No AI opponent | Single-player practice needs AI | Requires AI code generation |

---

## Multiplayer with AI Code Generation

### What AI Code Generation Enables

#### 1. AI Opponent for Single-Player Practice

When no human opponent available, AI generates opponent logic:

```typescript
// AI-generated behavior: simple_ai_opponent.ts
// Runs on host when player 2 is AI

if (!entity.state.aiThinkTimer) {
  entity.state.aiThinkTimer = 0;
}

entity.state.aiThinkTimer += context.dt;

// AI makes decisions every 0.5 seconds
if (entity.state.aiThinkTimer > 0.5) {
  entity.state.aiThinkTimer = 0;
  
  // Find best target
  const targets = context.entityManager.getEntitiesByTag('target');
  const myPosition = { x: entity.x, y: entity.y };
  
  let bestTarget = null;
  let bestScore = -Infinity;
  
  for (const target of targets) {
    const distance = Math.sqrt(
      Math.pow(target.x - myPosition.x, 2) +
      Math.pow(target.y - myPosition.y, 2)
    );
    const score = target.state.points / distance;
    
    if (score > bestScore) {
      bestScore = score;
      bestTarget = target;
    }
  }
  
  if (bestTarget) {
    // Calculate launch vector
    const dx = bestTarget.x - myPosition.x;
    const dy = bestTarget.y - myPosition.y;
    const angle = Math.atan2(dy, dx);
    const power = Math.min(500, 200 + bestScore * 50);
    
    // Spawn projectile
    context.spawnEntity('projectile', entity.x, entity.y);
    context.applyForce(
      context.lastSpawnedEntityId,
      Math.cos(angle) * power,
      Math.sin(angle) * power
    );
  }
}
```

**Use Case**: User wants to practice a 2-player game alone → AI generates opponent.

#### 2. Dynamic Multiplayer Rules

AI generates custom rules for multiplayer variants:

```typescript
// AI-generated: hot_potato_mode.ts
// "Whoever holds the ball when timer hits zero loses"

// Initialize hot potato state
if (!context.gameState.hotPotatoTimer) {
  context.gameState.hotPotatoTimer = 10; // 10 seconds
  context.gameState.currentHolder = null;
}

// Countdown
context.gameState.hotPotatoTimer -= context.dt;

// Find who's holding the ball
const ball = context.entityManager.getEntityByTag('ball')[0];
if (ball) {
  const overlapping = context.physics.getOverlappingEntities(ball.id);
  for (const other of overlapping) {
    if (other.tags.has('player')) {
      context.gameState.currentHolder = other.state.playerId;
    }
  }
}

// Timer expired
if (context.gameState.hotPotatoTimer <= 0) {
  if (context.gameState.currentHolder === 'player_1') {
    context.triggerLose('player_1', 'Hot potato exploded!');
  } else if (context.gameState.currentHolder === 'player_2') {
    context.triggerLose('player_2', 'Hot potato exploded!');
  }
}
```

**Use Case**: User describes variant → AI generates custom multiplayer logic.

#### 3. Network Compensation Behaviors

AI generates latency compensation logic:

```typescript
// AI-generated: lag_compensation.ts
// Smooth remote player movement

if (entity.state.isRemotePlayer) {
  // Interpolate toward network position
  const networkPos = entity.state.networkPosition || { x: entity.x, y: entity.y };
  const lerpFactor = 0.2;
  
  entity.x = entity.x + (networkPos.x - entity.x) * lerpFactor;
  entity.y = entity.y + (networkPos.y - entity.y) * lerpFactor;
  
  // Predict ahead based on velocity
  if (entity.state.networkVelocity) {
    const prediction = context.dt * 3; // 3 frames ahead
    entity.x += entity.state.networkVelocity.x * prediction;
    entity.y += entity.state.networkVelocity.y * prediction;
  }
}
```

### Multiplayer-Specific AI Behaviors to Seed Library

| Behavior | Description | Complexity |
|----------|-------------|------------|
| `simple_ai_opponent` | Basic AI that shoots at targets | Simple |
| `follow_ai` | AI that follows player 1 | Simple |
| `competitive_ai` | AI that tries to score more | Medium |
| `lag_compensation` | Smooth remote player interpolation | Medium |
| `prediction_correction` | Client-side prediction + server reconciliation | Complex |
| `turn_based_ai` | AI for turn-based games (card, puzzle) | Complex |

---

## Transport Options Analysis

### Option 1: BLE (Bluetooth Low Energy)

**Current State**:
- ✅ Client mode works (`react-native-ble-plx`)
- ⚠️ Host mode needs native implementation

**Pros**:
- Works offline (no internet required)
- Very low latency (~10-30ms)
- Free (no server costs)
- Perfect for local 2-player

**Cons**:
- Range limited (~10 meters)
- Requires native module work (1-2 weeks)
- iOS/Android implementation differs
- BLE peripheral mode not in `react-native-ble-plx`

**Effort**: 1-2 weeks for native module

### Option 2: WebSocket Relay Server

**Current State**: ✅ Fully implemented client-side

**Pros**:
- Works over internet (global multiplayer)
- No native code needed
- Already implemented!

**Cons**:
- Requires server (cost + maintenance)
- Higher latency (~50-200ms)
- Requires internet connection
- Not "local" multiplayer

**Effort**: 1 day to deploy relay server (Cloudflare Workers)

### Option 3: Local Network (WiFi/LAN)

**Not Currently Implemented**

**Pros**:
- Works without internet
- Higher bandwidth than BLE
- Longer range than BLE (same WiFi network)
- Can use existing WebSocket transport code!

**Cons**:
- Requires both devices on same WiFi
- Need service discovery (Bonjour/mDNS)
- More complex than BLE for users

**Effort**: 3-5 days

**Implementation**:
```typescript
// New transport: LocalNetworkTransport
// Uses existing WebSocketTransport internally

import { NetworkInfo } from 'react-native-network-info';
import Zeroconf from 'react-native-zeroconf';

class LocalNetworkTransport implements NetworkTransport {
  private zeroconf = new Zeroconf();
  private wsTransport: WebSocketTransport;
  
  async startHosting(config: TransportConfig) {
    // Start local WebSocket server
    const localIP = await NetworkInfo.getIPV4Address();
    const port = 8765;
    
    // Advertise via Bonjour/mDNS
    this.zeroconf.publishService(
      config.gameId,
      'tcp',
      'local.',
      config.deviceName,
      port
    );
    
    // Start WS server (would need native module or use existing API)
    // Alternative: Use existing WebSocket relay but on local network
  }
  
  async joinSession(config: TransportConfig) {
    // Discover local games
    this.zeroconf.scan('tcp', 'local.');
    
    this.zeroconf.on('found', (service) => {
      if (service.name === config.gameId) {
        // Connect via WebSocket
        this.wsTransport.connect(`ws://${service.host}:${service.port}`);
      }
    });
  }
}
```

### Option 4: WebRTC (Peer-to-Peer)

**Not Currently Implemented**

**Pros**:
- True P2P (no server for data)
- Works over internet AND local
- NAT traversal built-in
- Low latency when direct connection possible

**Cons**:
- Signaling server still needed (but minimal)
- Complex setup
- `react-native-webrtc` can be finicky

**Effort**: 1-2 weeks

### BLE Bandwidth Feasibility Analysis

**Can BLE handle 2-player physics games?** Yes, comfortably.

#### Bandwidth Requirements (from Architecture)

| Sync Type | Frequency | Data Size | Bandwidth |
|-----------|-----------|-----------|-----------|
| Snapshot | ~1Hz | 500-2KB | 0.5-2 KB/sec |
| Delta | ~20Hz | 50-200B | 1-4 KB/sec |
| Input | 60Hz | 20-50B | 1-3 KB/sec |
| **Total** | - | - | **~3-9 KB/sec** |

#### BLE 4.2+ Capabilities

| Metric | Value | Notes |
|--------|-------|-------|
| Theoretical throughput | 1-2 Mbps | Marketing number |
| Practical throughput | 100-400 kbps | 12-50 KB/sec real-world |
| Latency | 10-30ms | Excellent for local play |
| Range | ~10 meters | Sufficient for couch co-op |

#### Verdict: ✅ BLE Easily Handles 2-Player

**Headroom**: ~10 KB/sec requirement vs ~50 KB/sec capacity = **5x safety margin**

#### Considerations

| Concern | Mitigation | Status |
|---------|------------|--------|
| **MTU fragmentation** | `chunking.ts` handles BLE's small MTU (23-512 bytes) | ✅ Implemented |
| **Packet loss** | Snapshots at 1Hz provide state recovery | ✅ Designed |
| **High entity count** | Cap synced entities at ~50 for safety | ⚠️ Recommendation |
| **Fast-paced games** | Bump delta from 20Hz → 30Hz (~15 KB/sec, still safe) | ⚠️ Optional |

#### Scaling Limits

| Scenario | Entity Count | Bandwidth | BLE Viable? |
|----------|--------------|-----------|-------------|
| Simple puzzle | 10-20 | ~3 KB/sec | ✅ Yes |
| Physics battle | 30-50 | ~8 KB/sec | ✅ Yes |
| Particle-heavy | 100+ | ~20+ KB/sec | ⚠️ Marginal |
| MMO-style | 200+ | ~50+ KB/sec | ❌ Use WiFi/WebSocket |

**Bottom Line**: BLE is perfect for 2-player local games with typical entity counts (<50). For games with many simultaneous physics objects, consider Local Network transport instead.

### Recommendation: "Super Simple" Path

For **"super duper simple 2-player over BLE"**, the fastest paths are:

| Path | Effort | Result |
|------|--------|--------|
| **WebSocket Relay** | 1 day | Works now, but needs internet |
| **Local Network + mDNS** | 3-5 days | Works offline, same WiFi |
| **BLE Peripheral Native** | 1-2 weeks | True BLE local play |

**My Recommendation**: 
1. **Phase 1**: Deploy WebSocket relay (1 day) → Multiplayer works over internet immediately
2. **Phase 2**: Add Local Network transport (3-5 days) → Offline local play
3. **Phase 3**: BLE Peripheral (1-2 weeks) → True BLE (optional, if local network isn't sufficient)

---

## BLE Peripheral Implementation

If you decide to implement BLE peripheral mode for true local BLE multiplayer:

### iOS Implementation (CoreBluetooth)

```swift
// ios/BLEPeripheralManager.swift

import CoreBluetooth

class BLEPeripheralManager: NSObject, CBPeripheralManagerDelegate {
  private var peripheralManager: CBPeripheralManager!
  private var gameService: CBMutableService!
  private var stateCharacteristic: CBMutableCharacteristic!
  private var inputCharacteristic: CBMutableCharacteristic!
  
  private let serviceUUID = CBUUID(string: "12345678-1234-1234-1234-123456789ABC")
  private let stateCharUUID = CBUUID(string: "12345678-1234-1234-1234-123456789001")
  private let inputCharUUID = CBUUID(string: "12345678-1234-1234-1234-123456789002")
  
  private var connectedCentrals: [CBCentral] = []
  
  func initialize() {
    peripheralManager = CBPeripheralManager(delegate: self, queue: nil)
  }
  
  func startAdvertising(deviceName: String, gameId: String) {
    // Create characteristics
    stateCharacteristic = CBMutableCharacteristic(
      type: stateCharUUID,
      properties: [.read, .notify],
      value: nil,
      permissions: [.readable]
    )
    
    inputCharacteristic = CBMutableCharacteristic(
      type: inputCharUUID,
      properties: [.write, .writeWithoutResponse],
      value: nil,
      permissions: [.writeable]
    )
    
    // Create service
    gameService = CBMutableService(type: serviceUUID, primary: true)
    gameService.characteristics = [stateCharacteristic, inputCharacteristic]
    
    peripheralManager.add(gameService)
    
    // Start advertising
    let advertisementData: [String: Any] = [
      CBAdvertisementDataServiceUUIDsKey: [serviceUUID],
      CBAdvertisementDataLocalNameKey: deviceName
    ]
    peripheralManager.startAdvertising(advertisementData)
  }
  
  func sendState(_ data: Data) {
    // Notify all connected centrals
    peripheralManager.updateValue(
      data,
      for: stateCharacteristic,
      onSubscribedCentrals: nil
    )
  }
  
  // CBPeripheralManagerDelegate
  func peripheralManager(_ peripheral: CBPeripheralManager, 
                         central: CBCentral, 
                         didSubscribeTo characteristic: CBCharacteristic) {
    connectedCentrals.append(central)
    // Notify React Native: onClientConnected
  }
  
  func peripheralManager(_ peripheral: CBPeripheralManager,
                         didReceiveWrite requests: [CBATTRequest]) {
    for request in requests {
      if request.characteristic.uuid == inputCharUUID {
        // Forward input to React Native: onDataReceived
        if let data = request.value {
          // Send to JS
        }
      }
      peripheral.respond(to: request, withResult: .success)
    }
  }
}
```

### Android Implementation (BluetoothGattServer)

```kotlin
// android/BLEPeripheralManager.kt

class BLEPeripheralManager(private val context: Context) {
  private var bluetoothManager: BluetoothManager
  private var gattServer: BluetoothGattServer? = null
  private var advertiser: BluetoothLeAdvertiser? = null
  
  private val serviceUUID = UUID.fromString("12345678-1234-1234-1234-123456789ABC")
  private val stateCharUUID = UUID.fromString("12345678-1234-1234-1234-123456789001")
  private val inputCharUUID = UUID.fromString("12345678-1234-1234-1234-123456789002")
  
  private val connectedDevices = mutableListOf<BluetoothDevice>()
  
  init {
    bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
  }
  
  fun startAdvertising(deviceName: String, gameId: String) {
    val adapter = bluetoothManager.adapter
    advertiser = adapter.bluetoothLeAdvertiser
    
    // Create GATT server
    gattServer = bluetoothManager.openGattServer(context, gattServerCallback)
    
    // Create service
    val service = BluetoothGattService(serviceUUID, BluetoothGattService.SERVICE_TYPE_PRIMARY)
    
    val stateChar = BluetoothGattCharacteristic(
      stateCharUUID,
      BluetoothGattCharacteristic.PROPERTY_READ or BluetoothGattCharacteristic.PROPERTY_NOTIFY,
      BluetoothGattCharacteristic.PERMISSION_READ
    )
    
    val inputChar = BluetoothGattCharacteristic(
      inputCharUUID,
      BluetoothGattCharacteristic.PROPERTY_WRITE,
      BluetoothGattCharacteristic.PERMISSION_WRITE
    )
    
    service.addCharacteristic(stateChar)
    service.addCharacteristic(inputChar)
    gattServer?.addService(service)
    
    // Start advertising
    val settings = AdvertiseSettings.Builder()
      .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
      .setConnectable(true)
      .build()
    
    val data = AdvertiseData.Builder()
      .setIncludeDeviceName(true)
      .addServiceUuid(ParcelUuid(serviceUUID))
      .build()
    
    advertiser?.startAdvertising(settings, data, advertiseCallback)
  }
  
  private val gattServerCallback = object : BluetoothGattServerCallback() {
    override fun onConnectionStateChange(device: BluetoothDevice, status: Int, newState: Int) {
      if (newState == BluetoothProfile.STATE_CONNECTED) {
        connectedDevices.add(device)
        // Notify React Native: onClientConnected
      } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
        connectedDevices.remove(device)
        // Notify React Native: onClientDisconnected
      }
    }
    
    override fun onCharacteristicWriteRequest(
      device: BluetoothDevice,
      requestId: Int,
      characteristic: BluetoothGattCharacteristic,
      preparedWrite: Boolean,
      responseNeeded: Boolean,
      offset: Int,
      value: ByteArray
    ) {
      if (characteristic.uuid == inputCharUUID) {
        // Forward to React Native: onDataReceived
      }
      if (responseNeeded) {
        gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, 0, null)
      }
    }
  }
  
  fun sendState(data: ByteArray) {
    val stateChar = gattServer?.getService(serviceUUID)?.getCharacteristic(stateCharUUID)
    stateChar?.value = data
    
    for (device in connectedDevices) {
      gattServer?.notifyCharacteristicChanged(device, stateChar, false)
    }
  }
}
```

### React Native Bridge

```typescript
// app/lib/networking/native/BLEPeripheralModule.ts

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { BLEPeripheralNative } = NativeModules;

export function isNativeBLEPeripheralAvailable(): boolean {
  return BLEPeripheralNative != null;
}

export function createNativeBLEPeripheralManager(): BLEPeripheralManager {
  const emitter = new NativeEventEmitter(BLEPeripheralNative);
  
  return {
    async initialize(config: PeripheralConfig) {
      emitter.addListener('onClientConnected', (event) => {
        config.onClientConnected(event.clientId, event.clientName);
      });
      
      emitter.addListener('onClientDisconnected', (event) => {
        config.onClientDisconnected(event.clientId);
      });
      
      emitter.addListener('onDataReceived', (event) => {
        const data = new Uint8Array(event.data);
        config.onDataReceived(event.clientId, data);
      });
      
      await BLEPeripheralNative.initialize({
        serviceUuid: config.serviceUuid,
        deviceName: config.deviceName,
      });
    },
    
    async startAdvertising() {
      await BLEPeripheralNative.startAdvertising();
    },
    
    async stopAdvertising() {
      await BLEPeripheralNative.stopAdvertising();
    },
    
    sendToPeer(peerId: PeerId, chunks: Uint8Array[]) {
      const data = mergeChunks(chunks);
      BLEPeripheralNative.sendToPeer(peerId, Array.from(data));
    },
    
    broadcastToAll(chunks: Uint8Array[]) {
      const data = mergeChunks(chunks);
      BLEPeripheralNative.broadcastToAll(Array.from(data));
    },
    
    async disconnectPeer(peerId: PeerId) {
      await BLEPeripheralNative.disconnectPeer(peerId);
    },
    
    async disconnectAll() {
      await BLEPeripheralNative.disconnectAll();
    },
    
    async destroy() {
      emitter.removeAllListeners('onClientConnected');
      emitter.removeAllListeners('onClientDisconnected');
      emitter.removeAllListeners('onDataReceived');
      await BLEPeripheralNative.destroy();
    },
  };
}
```

---

## Game-Type Specific Patterns

### Pattern 1: Physics Competitive (Slingshot Battle)

```
┌─────────────────────────────────────────────────────────────┐
│                     HOST (Player 1)                          │
│  - Runs authoritative physics                               │
│  - Processes all inputs                                     │
│  - Sends state at 20Hz                                      │
│  - Spawns projectiles for both players                      │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ STATE (20Hz)
                           │ INPUTS (60Hz)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Player 2)                         │
│  - Sends input to host                                      │
│  - Receives state updates                                   │
│  - Interpolates for smooth rendering                        │
│  - Can do client-side prediction (optional)                 │
└─────────────────────────────────────────────────────────────┘

Sync Data:
- Host → Client: { bodies: [...], score: { p1, p2 }, time }
- Client → Host: { tap, drag, actions }
```

### Pattern 2: Turn-Based (Card Games)

```
┌─────────────────────────────────────────────────────────────┐
│                     HOST (Player 1)                          │
│  - Validates moves                                          │
│  - Manages turn order                                       │
│  - Sends visible state (hides opponent hand)                │
│  - Determines win/lose                                      │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ GAME_EVENT (on turn)
                           │ ACTIONS (on move)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Player 2)                         │
│  - Sends moves when it's their turn                         │
│  - Receives game events (opponent played card X)            │
│  - Has own hand state (hidden from host display)            │
└─────────────────────────────────────────────────────────────┘

Sync Data:
- Host → Client: { currentPlayer, lastMove, scores, visibleCards }
- Client → Host: { action: 'play_card', cardId, targetZone }
```

### Pattern 3: Cooperative (Stacking Together)

```
┌─────────────────────────────────────────────────────────────┐
│                       SHARED WORLD                           │
│  - Both players affect same physics world                   │
│  - Host runs simulation                                     │
│  - Shared score/lives                                       │
└─────────────────────────────────────────────────────────────┘

┌────────────────┐                    ┌────────────────┐
│   HOST (P1)    │                    │  CLIENT (P2)   │
│ - Left dropper │ ◄──────────────────│ - Right dropper│
│ - Tap to drop  │    State sync      │ - Tap to drop  │
└────────────────┘                    └────────────────┘

Sync Data:
- Both: { blocks: [...], score, height }
- Inputs: Simple tap locations
```

### Pattern 4: Asymmetric (Hide and Seek / Tag)

```
┌─────────────────────────────────────────────────────────────┐
│                      HOST (Seeker)                           │
│  - Full map visibility                                      │
│  - Runs physics                                             │
│  - Sends limited visibility to hider                        │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ LIMITED_STATE
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT (Hider)                          │
│  - Can only see self + nearby area                          │
│  - Doesn't see seeker until close                           │
└─────────────────────────────────────────────────────────────┘

Requires: Interest management / visibility culling
```

---

## New Primitives Needed

### For JSON System (Behaviors + Conditions)

#### 1. Entity Ownership

```typescript
// Extend GameEntity
interface GameEntity {
  // ... existing fields
  owner?: 'player_1' | 'player_2' | 'shared' | 'ai';
  networkId?: string; // For sync
}
```

#### 2. Multiplayer Conditions

```typescript
// New rule conditions
interface MultiplayerConditions {
  'is_local_player': {
    player: 1 | 2 | 'any';
  };
  
  'is_my_turn': {};
  
  'is_entity_mine': {
    entity: 'this' | { tag: string };
  };
  
  'is_host': {};
  
  'is_client': {};
  
  'player_count': {
    compare: '=' | '>=' | '<=' | '>' | '<';
    value: number;
  };
}
```

#### 3. Multiplayer Actions

```typescript
// New rule actions
interface MultiplayerActions {
  'send_to_player': {
    player: 1 | 2 | 'all' | 'others';
    event: string;
    data?: Record<string, unknown>;
  };
  
  'transfer_ownership': {
    entity: 'this' | { id: string };
    to: 'player_1' | 'player_2' | 'shared';
  };
  
  'sync_variable': {
    variable: string;
    scope: 'global' | 'player_only';
  };
}
```

#### 4. Game Definition Extension

```typescript
// Extend GameDefinition
interface GameDefinition {
  // ... existing fields
  
  multiplayer?: {
    enabled: boolean;
    minPlayers: number;
    maxPlayers: number;
    mode: 'versus' | 'coop' | 'turn_based';
    turnBased?: {
      turnOrder: 'alternating' | 'random' | 'winner_first';
      turnTimeLimit?: number;
    };
    visibilityRules?: {
      hideOpponentHand?: boolean;
      fogOfWar?: boolean;
    };
  };
}
```

### For AI Code Generation

#### Multiplayer-Aware Context API

```typescript
// Extend sandbox context for multiplayer behaviors
interface MultiplayerSandboxContext extends SandboxContext {
  // Player info
  localPlayerId: 'player_1' | 'player_2';
  isHost: boolean;
  
  // Turn info (if turn-based)
  currentTurn?: 'player_1' | 'player_2';
  isMyTurn?: boolean;
  
  // Entity ownership
  getMyEntities(): RuntimeEntity[];
  getOpponentEntities(): RuntimeEntity[];
  
  // Communication
  sendToOpponent(event: string, data: unknown): void;
  
  // Visibility (for hidden info games)
  getVisibleEntities(): RuntimeEntity[];
  
  // AI helpers
  isAIControlled(playerId: string): boolean;
}
```

---

## Implementation Roadmap

### Phase 1: WebSocket Relay (1 day)

**Goal**: Multiplayer works over internet immediately

#### Tasks
- [ ] Deploy relay server to Cloudflare Workers
- [ ] Test existing `WebSocketTransport` with live server
- [ ] Add "Online Play" button to game UI
- [ ] Basic room creation/joining flow

**Deliverable**: 2 players can play over internet

---

### Phase 2: Multiplayer UI (2-3 days)

**Goal**: User-friendly multiplayer experience

#### Tasks
- [ ] Host game screen (show game code)
- [ ] Join game screen (enter code)
- [ ] Waiting room (show connected players)
- [ ] In-game player indicators
- [ ] Disconnection handling UI

**Deliverable**: Polished multiplayer UX

---

### Phase 3: Multiplayer Rules (3-5 days)

**Goal**: JSON system supports multiplayer games

#### Tasks
- [ ] Add `owner` field to `GameEntity`
- [ ] Implement `is_local_player` condition
- [ ] Implement `is_my_turn` condition
- [ ] Implement `send_to_player` action
- [ ] Add `multiplayer` config to `GameDefinition`
- [ ] Update AI generator to create multiplayer games

**Deliverable**: Can define multiplayer games in JSON

---

### Phase 4: Local Network Transport (3-5 days)

**Goal**: Offline local multiplayer (same WiFi)

#### Tasks
- [ ] Implement `LocalNetworkTransport`
- [ ] Add mDNS/Bonjour discovery (`react-native-zeroconf`)
- [ ] Transport auto-selection (BLE vs WiFi vs Online)
- [ ] Test on iOS + Android

**Deliverable**: Local multiplayer without internet

---

### Phase 5: BLE Peripheral (iOS: 30 min, Android: 1 week)

**Goal**: True BLE local multiplayer

#### Status Update (2026-01-25)

**iOS implementation is COMPLETE** - just needs Info.plist permissions:
- ✅ `BLEPeripheralModule.swift` (388 lines) - Full CoreBluetooth peripheral
- ✅ `BLEPeripheralModule.m` (32 lines) - Objective-C bridge
- ✅ `BLEPeripheralModule.ts` (143 lines) - TypeScript consumer
- ❌ `Info.plist` missing Bluetooth permission keys

#### Tasks

**iOS (30 minutes)** ✅ COMPLETE (2026-01-25):
- [x] Add `NSBluetoothAlwaysUsageDescription` to Info.plist
- [x] Add `NSBluetoothPeripheralUsageDescription` to Info.plist
- [x] Add `UIBackgroundModes` with `bluetooth-peripheral` and `bluetooth-central`
- [x] Run `pod install` and rebuild
- [ ] Test on real device (simulator has limited BLE)

**Android (1 week)**:
- [ ] Create `BLEPeripheralModule.kt` (BluetoothGattServer + BluetoothLeAdvertiser)
- [ ] Create `BLEPeripheralPackage.kt` to register module
- [ ] Add to `MainApplication.kt`
- [ ] Add permissions to `AndroidManifest.xml` (BLUETOOTH_ADVERTISE, BLUETOOTH_CONNECT, ACCESS_FINE_LOCATION)
- [ ] Test on real device

**Integration**:
- [ ] Test with existing BLETransport (client side)
- [ ] Verify chunking works for large payloads
- [ ] Test reconnection scenarios

**Deliverable**: BLE "Host Game" works on iOS immediately, Android after native work

---

### Phase 6: AI Opponent (1 week)

**Goal**: Single-player practice with AI

#### Tasks
- [ ] Define AI behavior contract
- [ ] Seed library with basic AI behaviors
- [ ] AI difficulty levels (easy/medium/hard)
- [ ] AI for physics games (aim, timing)
- [ ] AI for turn-based games (decision trees)

**Deliverable**: Play any 2-player game solo vs AI

---

### Phase 7: Advanced Features (2+ weeks)

**Goal**: Polish and advanced multiplayer

#### Tasks
- [ ] Client-side prediction for physics games
- [ ] Rollback/reconciliation
- [ ] Spectator mode
- [ ] Match history
- [ ] Leaderboards
- [ ] Friend system (optional)

**Deliverable**: Competitive multiplayer ready

---

## Cost-Benefit Analysis

### Implementation Effort Summary

| Feature | Effort | Value | Priority |
|---------|--------|-------|----------|
| WebSocket Relay | 1 day | High (immediate multiplayer) | 🔴 P0 |
| Multiplayer UI | 2-3 days | High (UX) | 🔴 P0 |
| Multiplayer Rules | 3-5 days | High (game variety) | 🟡 P1 |
| Local Network | 3-5 days | Medium (offline) | 🟡 P1 |
| BLE Peripheral (iOS) | **30 min** | Medium (true BLE) | 🟢 P2 |
| BLE Peripheral (Android) | 1 week | Medium (true BLE) | 🟢 P2 |
| AI Opponent | 1 week | High (single-player) | 🟡 P1 |
| Advanced (prediction) | 2+ weeks | Low (polish) | 🟢 P2 |

> **Note**: iOS BLE Peripheral effort is minimal because the native module already exists (`BLEPeripheralModule.swift`). Only needs Info.plist permissions added.

### "Super Simple" MVP Path

**Minimum for "2-player over BLE" dream**:

1. **Phase 1**: WebSocket relay (1 day) → Works over internet
2. **Phase 2**: Multiplayer UI (2-3 days) → Good UX
3. **Phase 4**: Local Network (3-5 days) → Works offline

**Total MVP**: ~1-2 weeks

**Adding BLE Peripheral** (true BLE): +1-2 weeks

### Technology Comparison

| Transport | Effort | Latency | Offline | Range | Setup |
|-----------|--------|---------|---------|-------|-------|
| **WebSocket** | 1 day | 50-200ms | ❌ | Global | Enter code |
| **Local Network** | 3-5 days | 10-50ms | ✅ (same WiFi) | WiFi range | Auto-discover |
| **BLE** | 1-2 weeks | 10-30ms | ✅ | ~10m | Pairing |

**Recommendation**: Start with WebSocket + Local Network. Add BLE only if truly needed.

---

## Conclusion

Slopcade already has **70%+ of multiplayer infrastructure built**:
- ✅ Full networking types
- ✅ Host/client model
- ✅ State synchronization
- ✅ WebSocket transport
- ✅ BLE client transport

**What's Missing**:
- ⚠️ BLE peripheral (host) mode - needs native module
- ⚠️ Multiplayer-specific rule conditions
- ⚠️ UI for host/join flow
- ⚠️ AI opponent system

**Fastest Path to 2-Player**:
1. Deploy WebSocket relay (1 day)
2. Build multiplayer UI (2-3 days)
3. Add local network transport (3-5 days)

**Total**: ~1-2 weeks for functional local multiplayer

**With AI Code Generation**:
- AI can generate opponent behaviors for single-player practice
- AI can generate custom multiplayer game modes
- AI can generate lag compensation behaviors

This complements the [AI Code Generation Architecture](./ai-code-generation-architecture.md) by providing the networking layer that AI-generated behaviors can interact with.

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-25  
**Related Documents**:
- [AI Code Generation Architecture](./ai-code-generation-architecture.md)
- [docs/networking/ARCHITECTURE.md](../../docs/networking/ARCHITECTURE.md)
- [docs/LAUNCH_ROADMAP.md](../../docs/LAUNCH_ROADMAP.md)
