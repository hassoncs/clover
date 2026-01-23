import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import {
  Canvas,
  Circle,
  Rect,
  Fill,
  RoundedRect,
} from "@shopify/react-native-skia";

import {
  createPhysics2D,
  type Physics2D,
  type BodyId,
  vec2,
  useSimplePhysicsLoop,
  useForceDrag,
} from "../../lib/physics2d";
import { ViewportRoot, useViewport } from "../../lib/viewport";
import type {
  NetworkTransport,
  PeerId,
  PlayerInput,
  BodyState,
  NetEntityId,
  NetworkMessage,
  StateSnapshot,
  StateDelta,
  InputEvent,
  GameSyncState,
} from "../../lib/networking/types";
import { ConnectionState, SessionRole, MessageType } from "../../lib/networking/types";
import { BLETransport } from "../../lib/networking/ble/BLETransport";
import { chunkMessage, ChunkReassembler } from "../../lib/networking/ble/chunking";

const PIXELS_PER_METER = 50;
const GROUND_HEIGHT = 0.5;
const GAME_ID = "ble-physics-sync-demo";

const COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
  "#A29BFE",
  "#FD79A8",
];

interface BodyRecord {
  id: BodyId;
  netEntityId: NetEntityId;
  radius: number;
  color: string;
}

interface RenderableBody {
  id: BodyId;
  netEntityId: NetEntityId;
  x: number;
  y: number;
  radius: number;
  color: string;
  isDragging: boolean;
}

type AppMode = "menu" | "hosting" | "joining" | "connected";

interface ConnectionStatus {
  mode: AppMode;
  isHost: boolean;
  connectionState: ConnectionState;
  peerCount: number;
  error: string | null;
}

function BLEPhysicsSyncCanvas() {
  const physicsRef = useRef<Physics2D | null>(null);
  const transportRef = useRef<BLETransport | null>(null);
  const bodyRecordsRef = useRef<BodyRecord[]>([]);
  const tickIdRef = useRef(0);
  const lastSnapshotTickRef = useRef(0);
  const lastDeltaTickRef = useRef(0);
  const previousBodyStatesRef = useRef<Map<string, BodyState>>(new Map());
  const stateBufferRef = useRef<Array<{ tickId: number; bodies: BodyState[] }>>([]);
  const lastReceivedTickRef = useRef(0);
  const reassemblersRef = useRef<Map<PeerId, ChunkReassembler>>(new Map());

  const [bodies, setBodies] = useState<RenderableBody[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>({
    mode: "menu",
    isHost: false,
    connectionState: ConnectionState.DISCONNECTED,
    peerCount: 0,
    error: null,
  });

  const vp = useViewport();

  const localPeerIdRef = useRef<PeerId>(`peer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);

  const getAllBodyStates = useCallback((): BodyState[] => {
    const physics = physicsRef.current;
    if (!physics) return [];

    return bodyRecordsRef.current.map((record) => {
      const transform = physics.getTransform(record.id);
      const velocity = physics.getLinearVelocity(record.id);
      const angularVelocity = physics.getAngularVelocity(record.id);

      return {
        id: record.id.value.toString(),
        netEntityId: record.netEntityId,
        position: { x: transform.position.x, y: transform.position.y },
        angle: transform.angle,
        linearVelocity: { x: velocity.x, y: velocity.y },
        angularVelocity,
        isAwake: true,
      };
    });
  }, []);

  const applyBodyStates = useCallback((states: BodyState[]) => {
    const physics = physicsRef.current;
    if (!physics) return;

    const stateMap = new Map(states.map((s) => [s.netEntityId, s]));

    for (const record of bodyRecordsRef.current) {
      const state = stateMap.get(record.netEntityId);
      if (state) {
        physics.setTransform(record.id, {
          position: vec2(state.position.x, state.position.y),
          angle: state.angle,
        });
        physics.setLinearVelocity(record.id, vec2(state.linearVelocity.x, state.linearVelocity.y));
        physics.setAngularVelocity(record.id, state.angularVelocity);
      }
    }
  }, []);

  const sendSnapshot = useCallback(() => {
    const transport = transportRef.current;
    if (!transport || transport.role !== SessionRole.HOST) return;

    const bodies = getAllBodyStates();
    const tickId = tickIdRef.current;

    const snapshot: StateSnapshot = {
      type: MessageType.STATE_SNAPSHOT,
      timestamp: Date.now(),
      sequence: 0,
      senderId: localPeerIdRef.current,
      tickId,
      bodies,
      gameState: { score: 0, lives: 3, time: 0, state: "playing" },
    };

    transport.broadcast(snapshot);

    previousBodyStatesRef.current.clear();
    for (const body of bodies) {
      previousBodyStatesRef.current.set(body.id, { ...body });
    }

    lastSnapshotTickRef.current = tickId;
    lastDeltaTickRef.current = tickId;
  }, [getAllBodyStates]);

  const sendDelta = useCallback(() => {
    const transport = transportRef.current;
    if (!transport || transport.role !== SessionRole.HOST) return;

    const currentBodies = getAllBodyStates();
    const tickId = tickIdRef.current;

    const changedBodies: BodyState[] = [];
    const addedBodies: BodyState[] = [];
    const removedBodyIds: string[] = [];

    const currentIds = new Set(currentBodies.map((b) => b.id));
    const previousIds = new Set(previousBodyStatesRef.current.keys());

    for (const body of currentBodies) {
      const previous = previousBodyStatesRef.current.get(body.id);
      if (!previous) {
        addedBodies.push(body);
      } else {
        const POS = 0.001;
        const ANG = 0.001;
        const VEL = 0.01;
        const changed =
          Math.abs(previous.position.x - body.position.x) > POS ||
          Math.abs(previous.position.y - body.position.y) > POS ||
          Math.abs(previous.angle - body.angle) > ANG ||
          Math.abs(previous.linearVelocity.x - body.linearVelocity.x) > VEL ||
          Math.abs(previous.linearVelocity.y - body.linearVelocity.y) > VEL ||
          previous.isAwake !== body.isAwake;

        if (changed) {
          changedBodies.push(body);
        }
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
        senderId: localPeerIdRef.current,
        tickId,
        baseTickId: lastSnapshotTickRef.current,
        changedBodies,
        addedBodies,
        removedBodyIds,
      };

      transport.broadcast(delta);
    }

    previousBodyStatesRef.current.clear();
    for (const body of currentBodies) {
      previousBodyStatesRef.current.set(body.id, { ...body });
    }

    lastDeltaTickRef.current = tickId;
  }, [getAllBodyStates]);

  const onMessage = useCallback(
    (message: NetworkMessage, fromPeerId: PeerId) => {
      const transport = transportRef.current;
      if (!transport) return;

      if (message.type === MessageType.STATE_SNAPSHOT) {
        if (transport.role === SessionRole.CLIENT) {
          const snapshot = message as StateSnapshot;
          stateBufferRef.current.push({
            tickId: snapshot.tickId,
            bodies: snapshot.bodies,
          });
          lastReceivedTickRef.current = snapshot.tickId;

          if (stateBufferRef.current.length > 30) {
            stateBufferRef.current = stateBufferRef.current.slice(-20);
          }
        }
      } else if (message.type === MessageType.STATE_DELTA) {
        if (transport.role === SessionRole.CLIENT) {
          const delta = message as StateDelta;
          const baseState = stateBufferRef.current.find(
            (s) => s.tickId === delta.baseTickId
          );
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

          stateBufferRef.current.push({
            tickId: delta.tickId,
            bodies: Array.from(newBodies.values()),
          });
          lastReceivedTickRef.current = delta.tickId;
        }
      } else if (message.type === MessageType.INPUT_EVENT) {
        if (transport.role === SessionRole.HOST) {
          const inputEvent = message as InputEvent;
          const physics = physicsRef.current;
          if (!physics) return;

          if (inputEvent.inputs.drag) {
            const drag = inputEvent.inputs.drag;
            const hitBody = physics.queryPoint(
              vec2(drag.worldStartX, drag.worldStartY)
            );
            if (hitBody) {
              const targetX = drag.worldCurrentX;
              const targetY = drag.worldCurrentY;
              const transform = physics.getTransform(hitBody);
              const dx = targetX - transform.position.x;
              const dy = targetY - transform.position.y;
              const stiffness = 50;
              physics.applyForce(hitBody, vec2(dx * stiffness, dy * stiffness));
            }
          }
        }
      }
    },
    []
  );

  const interpolateClientState = useCallback(() => {
    const buffer = stateBufferRef.current;
    if (buffer.length < 2) {
      if (buffer.length === 1) {
        applyBodyStates(buffer[0].bodies);
      }
      return;
    }

    const interpolationDelay = 3;
    const targetTick = lastReceivedTickRef.current - interpolationDelay;

    let before: { tickId: number; bodies: BodyState[] } | null = null;
    let after: { tickId: number; bodies: BodyState[] } | null = null;

    for (const state of buffer) {
      if (state.tickId <= targetTick) before = state;
      if (state.tickId >= targetTick && !after) after = state;
    }

    if (!before && after) {
      applyBodyStates(after.bodies);
      return;
    }

    if (before && !after) {
      applyBodyStates(before.bodies);
      return;
    }

    if (before && after && before !== after) {
      const t = (targetTick - before.tickId) / (after.tickId - before.tickId);
      const fromMap = new Map(before.bodies.map((b) => [b.id, b]));
      const interpolated: BodyState[] = [];

      for (const toBody of after.bodies) {
        const fromBody = fromMap.get(toBody.id);
        if (fromBody) {
          interpolated.push({
            id: toBody.id,
            netEntityId: toBody.netEntityId,
            position: {
              x: fromBody.position.x + (toBody.position.x - fromBody.position.x) * t,
              y: fromBody.position.y + (toBody.position.y - fromBody.position.y) * t,
            },
            angle: fromBody.angle + (toBody.angle - fromBody.angle) * t,
            linearVelocity: {
              x: fromBody.linearVelocity.x + (toBody.linearVelocity.x - fromBody.linearVelocity.x) * t,
              y: fromBody.linearVelocity.y + (toBody.linearVelocity.y - fromBody.linearVelocity.y) * t,
            },
            angularVelocity: fromBody.angularVelocity + (toBody.angularVelocity - fromBody.angularVelocity) * t,
            isAwake: toBody.isAwake,
          });
        } else {
          interpolated.push(toBody);
        }
      }

      applyBodyStates(interpolated);
    } else if (before) {
      applyBodyStates(before.bodies);
    }
  }, [applyBodyStates]);

  useEffect(() => {
    if (!vp.isReady) return;

    const worldWidth = vp.world.size.width;
    const worldHeight = vp.world.size.height;
    const groundY = worldHeight * 0.75;
    let isMounted = true;

    const setupPhysics = async () => {
      try {
        if (physicsRef.current) {
          physicsRef.current.destroyWorld();
        }

        const physics = await createPhysics2D();
        if (!isMounted) return;

        physics.createWorld(vec2(0, 9.8));
        physicsRef.current = physics;

        const groundId = physics.createBody({
          type: "static",
          position: vec2(worldWidth / 2, groundY),
        });
        physics.addFixture(groundId, {
          shape: { type: "box", halfWidth: worldWidth / 2, halfHeight: GROUND_HEIGHT / 2 },
          density: 0,
          friction: 0.6,
        });

        const leftWallId = physics.createBody({
          type: "static",
          position: vec2(-0.5, worldHeight / 2),
        });
        physics.addFixture(leftWallId, {
          shape: { type: "box", halfWidth: 0.5, halfHeight: worldHeight / 2 },
          density: 0,
        });

        const rightWallId = physics.createBody({
          type: "static",
          position: vec2(worldWidth + 0.5, worldHeight / 2),
        });
        physics.addFixture(rightWallId, {
          shape: { type: "box", halfWidth: 0.5, halfHeight: worldHeight / 2 },
          density: 0,
        });

        for (let i = 0; i < 8; i++) {
          const radius = 0.4 + Math.random() * 0.3;
          const color = COLORS[i % COLORS.length];
          const x = 1 + (i % 4) * ((worldWidth - 2) / 4) + Math.random() * 0.5;
          const y = 2 + Math.floor(i / 4) * 2 + Math.random() * 0.5;

          const bodyId = physics.createBody({
            type: "dynamic",
            position: vec2(x, y),
          });

          physics.addFixture(bodyId, {
            shape: { type: "circle", radius },
            density: 1.0,
            friction: 0.3,
            restitution: 0.5,
          });

          bodyRecordsRef.current.push({
            id: bodyId,
            netEntityId: `ball-${i}`,
            radius,
            color,
          });
        }

        setIsReady(true);
      } catch (error) {
        console.error("Failed to initialize Physics2D:", error);
        setStatus((prev) => ({ ...prev, error: String(error) }));
      }
    };

    setupPhysics();

    return () => {
      isMounted = false;
      if (physicsRef.current) {
        physicsRef.current.destroyWorld();
        physicsRef.current = null;
      }
      bodyRecordsRef.current = [];
      setIsReady(false);
    };
  }, [vp.world.size.width, vp.world.size.height, vp.isReady]);

  const startHosting = useCallback(async () => {
    try {
      setStatus((prev) => ({ ...prev, mode: "hosting", error: null }));

      const transport = new BLETransport();
      transportRef.current = transport;

      await transport.initialize({
        onStateChange: (state) => {
          setStatus((prev) => ({
            ...prev,
            connectionState: state,
            mode: state === ConnectionState.CONNECTED ? "connected" : prev.mode,
          }));
        },
        onPeerConnected: (peerId, peerName) => {
          console.log(`[BLE Host] Peer connected: ${peerName} (${peerId})`);
          setStatus((prev) => ({ ...prev, peerCount: prev.peerCount + 1 }));
        },
        onPeerDisconnected: (peerId, reason) => {
          console.log(`[BLE Host] Peer disconnected: ${peerId} - ${reason}`);
          setStatus((prev) => ({ ...prev, peerCount: Math.max(0, prev.peerCount - 1) }));
        },
        onMessage: onMessage,
        onError: (error) => {
          console.error("[BLE Host] Error:", error);
          setStatus((prev) => ({ ...prev, error: error.message }));
        },
      });

      await transport.startHosting({
        deviceName: Platform.OS === "ios" ? "iOS Host" : "Android Host",
        gameId: GAME_ID,
      });

      setStatus((prev) => ({
        ...prev,
        isHost: true,
        connectionState: ConnectionState.ADVERTISING,
      }));
    } catch (error) {
      console.error("[BLE Host] Failed to start:", error);
      setStatus((prev) => ({
        ...prev,
        mode: "menu",
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }, [onMessage]);

  const joinSession = useCallback(async () => {
    try {
      setStatus((prev) => ({ ...prev, mode: "joining", error: null }));

      const transport = new BLETransport();
      transportRef.current = transport;

      await transport.initialize({
        onStateChange: (state) => {
          setStatus((prev) => ({
            ...prev,
            connectionState: state,
            mode: state === ConnectionState.CONNECTED ? "connected" : prev.mode,
          }));
        },
        onPeerConnected: (peerId, peerName) => {
          console.log(`[BLE Client] Connected to host: ${peerName} (${peerId})`);
          setStatus((prev) => ({ ...prev, peerCount: 1, mode: "connected" }));
        },
        onPeerDisconnected: (peerId, reason) => {
          console.log(`[BLE Client] Disconnected: ${reason}`);
          setStatus((prev) => ({ ...prev, peerCount: 0, mode: "menu" }));
        },
        onMessage: onMessage,
        onError: (error) => {
          console.error("[BLE Client] Error:", error);
          setStatus((prev) => ({ ...prev, error: error.message }));
        },
      });

      await transport.joinSession({
        deviceName: Platform.OS === "ios" ? "iOS Client" : "Android Client",
        gameId: GAME_ID,
      });

      setStatus((prev) => ({
        ...prev,
        isHost: false,
      }));
    } catch (error) {
      console.error("[BLE Client] Failed to join:", error);
      setStatus((prev) => ({
        ...prev,
        mode: "menu",
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }, [onMessage]);

  const disconnect = useCallback(async () => {
    const transport = transportRef.current;
    if (transport) {
      await transport.disconnect();
      await transport.destroy();
      transportRef.current = null;
    }

    stateBufferRef.current = [];
    previousBodyStatesRef.current.clear();
    tickIdRef.current = 0;
    lastSnapshotTickRef.current = 0;
    lastDeltaTickRef.current = 0;

    setStatus({
      mode: "menu",
      isHost: false,
      connectionState: ConnectionState.DISCONNECTED,
      peerCount: 0,
      error: null,
    });
  }, []);

  const sendClientInput = useCallback((input: PlayerInput) => {
    const transport = transportRef.current;
    if (!transport || transport.role !== SessionRole.CLIENT) return;

    const inputEvent: InputEvent = {
      type: MessageType.INPUT_EVENT,
      timestamp: Date.now(),
      sequence: 0,
      senderId: localPeerIdRef.current,
      tickId: lastReceivedTickRef.current,
      playerId: localPeerIdRef.current,
      inputs: input,
    };

    for (const [peerId] of transport.connectedPeers) {
      transport.send(inputEvent, peerId);
    }
  }, []);

  const dragHandlers = useForceDrag(physicsRef, {
    pixelsPerMeter: PIXELS_PER_METER,
    stiffness: 50,
    damping: 5,
    onDragStart: (bodyId, worldPoint) => {
      if (!status.isHost && status.mode === "connected") {
        sendClientInput({
          touches: [],
          actions: {},
          drag: {
            startX: worldPoint.x * PIXELS_PER_METER,
            startY: worldPoint.y * PIXELS_PER_METER,
            currentX: worldPoint.x * PIXELS_PER_METER,
            currentY: worldPoint.y * PIXELS_PER_METER,
            worldStartX: worldPoint.x,
            worldStartY: worldPoint.y,
            worldCurrentX: worldPoint.x,
            worldCurrentY: worldPoint.y,
          },
        });
      }
    },
    onDragMove: (bodyId, worldPoint) => {
      if (!status.isHost && status.mode === "connected") {
        const controllerState = dragHandlers.getController().getState();
        if (controllerState.active) {
          sendClientInput({
            touches: [],
            actions: {},
            drag: {
              startX: controllerState.startWorldPos.x * PIXELS_PER_METER,
              startY: controllerState.startWorldPos.y * PIXELS_PER_METER,
              currentX: worldPoint.x * PIXELS_PER_METER,
              currentY: worldPoint.y * PIXELS_PER_METER,
              worldStartX: controllerState.startWorldPos.x,
              worldStartY: controllerState.startWorldPos.y,
              worldCurrentX: worldPoint.x,
              worldCurrentY: worldPoint.y,
            },
          });
        }
      }
    },
    onDragEnd: () => {
      if (!status.isHost && status.mode === "connected") {
        sendClientInput({
          touches: [],
          actions: {},
        });
      }
    },
  });

  const stepPhysics = useCallback(
    (dt: number) => {
      const physics = physicsRef.current;
      const transport = transportRef.current;
      if (!physics) return;

      if (status.isHost || status.mode === "menu") {
        dragHandlers.applyDragForces();
        physics.step(dt, 8, 3);
        tickIdRef.current++;

        if (transport && status.isHost && transport.connectedPeers.size > 0) {
          const tickId = tickIdRef.current;
          const snapshotInterval = 60;
          const deltaInterval = 3;

          if (tickId - lastSnapshotTickRef.current >= snapshotInterval) {
            sendSnapshot();
          } else if (tickId - lastDeltaTickRef.current >= deltaInterval) {
            sendDelta();
          }
        }
      } else if (status.mode === "connected" && !status.isHost) {
        interpolateClientState();
      }

      const draggedBodyId = dragHandlers.getDraggedBody()?.value ?? null;
      const updatedBodies = bodyRecordsRef.current.map((record) => {
        const transform = physics.getTransform(record.id);
        return {
          id: record.id,
          netEntityId: record.netEntityId,
          x: transform.position.x * PIXELS_PER_METER,
          y: transform.position.y * PIXELS_PER_METER,
          radius: record.radius * PIXELS_PER_METER,
          color: record.color,
          isDragging: record.id.value === draggedBodyId,
        };
      });

      setBodies(updatedBodies);
    },
    [status, dragHandlers, sendSnapshot, sendDelta, interpolateClientState]
  );

  useSimplePhysicsLoop(stepPhysics, isReady);

  if (!vp.isReady) return null;

  const groundY = vp.size.height * 0.75;

  return (
    <View style={styles.container}>
      <GestureDetector gesture={dragHandlers.gesture}>
        <View style={styles.canvasContainer}>
          <Canvas style={styles.canvas} pointerEvents="none">
            <Fill color="#1a1a2e" />

            <Rect
              x={0}
              y={groundY - (GROUND_HEIGHT * PIXELS_PER_METER) / 2}
              width={vp.size.width}
              height={GROUND_HEIGHT * PIXELS_PER_METER}
              color="#2d3436"
            />

            {bodies.map((body) => (
              <Circle
                key={`ball-${body.id.value}`}
                cx={body.x}
                cy={body.y}
                r={body.radius}
                color={body.isDragging ? "#00ff00" : body.color}
              />
            ))}
          </Canvas>
        </View>
      </GestureDetector>

      <View style={styles.overlay}>
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>
            {status.mode === "menu" && "Not Connected"}
            {status.mode === "hosting" && `Hosting... (${status.connectionState})`}
            {status.mode === "joining" && `Scanning... (${status.connectionState})`}
            {status.mode === "connected" && (status.isHost ? `Host - ${status.peerCount} client(s)` : "Connected to Host")}
          </Text>
          {status.error && <Text style={styles.errorText}>{status.error}</Text>}
        </View>

        {status.mode === "menu" && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.primaryButton} onPress={startHosting}>
              <Text style={styles.buttonText}>Host Game</Text>
              <Text style={styles.buttonSubtext}>Broadcast physics to clients</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={joinSession}>
              <Text style={styles.buttonText}>Join Game</Text>
              <Text style={styles.buttonSubtext}>Scan for nearby host</Text>
            </TouchableOpacity>
          </View>
        )}

        {(status.mode === "hosting" || status.mode === "joining") && (
          <View style={styles.buttonContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.waitingText}>
              {status.mode === "hosting" ? "Waiting for clients..." : "Searching for host..."}
            </Text>
            <TouchableOpacity style={styles.cancelButton} onPress={disconnect}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {status.mode === "connected" && (
          <View style={styles.connectedContainer}>
            <View style={styles.connectedBadge}>
              <Text style={styles.connectedBadgeText}>
                {status.isHost ? "HOST" : "CLIENT"}
              </Text>
            </View>
            <Text style={styles.instructionText}>
              {status.isHost
                ? "Drag balls to move them. Clients see your changes!"
                : "Drag balls to send input to host!"}
            </Text>
            <TouchableOpacity style={styles.disconnectButton} onPress={disconnect}>
              <Text style={styles.disconnectButtonText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvasContainer: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  statusBar: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  statusText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  errorText: {
    color: "#f44336",
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  buttonContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    width: "100%",
    alignItems: "center",
  },
  secondaryButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  buttonSubtext: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
    marginTop: 4,
  },
  waitingText: {
    color: "#888",
    fontSize: 14,
    marginVertical: 16,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    color: "#888",
    fontSize: 16,
  },
  connectedContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  connectedBadge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  connectedBadgeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  instructionText: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 12,
  },
  disconnectButton: {
    backgroundColor: "#f44336",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  disconnectButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default function BLEPhysicsSync() {
  return (
    <ViewportRoot pixelsPerMeter={PIXELS_PER_METER}>
      <BLEPhysicsSyncCanvas />
    </ViewportRoot>
  );
}
