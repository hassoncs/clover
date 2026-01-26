import { useCallback, useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
  Alert,
  type GestureResponderEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { ExampleMeta } from "@/lib/registry/types";
import type { GodotBridge } from "@/lib/godot/types";
import type { GameDefinition } from "@slopcade/shared";
import { FullScreenHeader } from "../../components/FullScreenHeader";
import { BLETransport } from "@/lib/networking/ble/BLETransport";
import { isBLEPeripheralSupported } from "@/lib/networking/ble/BLEPeripheralManager";
import type {
  PeerId,
  NetworkMessage,
  TransportEventHandlers,
} from "@/lib/networking/types";
import { ConnectionState, MessageType } from "@/lib/networking/types";

export const metadata: ExampleMeta = {
  title: "Bluetooth Sync",
  description: "Two-player synced physics via BLE. Drag cubes together!",
};

type Mode = "menu" | "hosting" | "joining" | "connected";

interface LogEntry {
  time: string;
  message: string;
  type: "info" | "success" | "error" | "peer" | "sync";
}

interface DragState {
  entityId: string;
  jointId: number;
}

interface ContainerLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CubePosition {
  id: string;
  x: number;
  y: number;
  angle: number;
}

interface SyncMessage extends NetworkMessage {
  eventName: string;
  data: {
    cubes?: CubePosition[];
    dragStart?: { entityId: string; x: number; y: number };
    dragMove?: { entityId: string; x: number; y: number };
    dragEnd?: { entityId: string };
  };
}

const WORLD_BOUNDS = { width: 14, height: 18 };
const PIXELS_PER_METER = 50;
const GAME_ID = "ble-sync-cubes";
const DEVICE_NAME = `Slopcade-${Platform.OS}-${Math.random().toString(36).slice(2, 6)}`;

const GAME_DEFINITION: GameDefinition = {
  metadata: {
    id: "ble-sync-cubes",
    title: "BLE Synced Cubes",
    description: "Drag cubes synced over Bluetooth",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: -25 },
    pixelsPerMeter: PIXELS_PER_METER,
    bounds: WORLD_BOUNDS,
  },
  camera: { type: "fixed", zoom: 1 },
  ui: { backgroundColor: "#1a1a2e" },
  templates: {
    cube: {
      id: "cube",
      tags: ["draggable"],
      sprite: { type: "rect", width: 1.5, height: 1.5, color: "#4ECDC4" },
      physics: {
        bodyType: "dynamic",
        shape: "box",
        width: 1.5,
        height: 1.5,
        density: 1,
        friction: 0.3,
        restitution: 0.2,
      },
    },
    ground: {
      id: "ground",
      sprite: { type: "rect", width: 14, height: 1, color: "#2C3E50" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 14,
        height: 1,
        density: 0,
        friction: 0.5,
        restitution: 0,
      },
    },
    wall: {
      id: "wall",
      sprite: { type: "rect", width: 0.5, height: 18, color: "#2C3E50" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 0.5,
        height: 18,
        density: 0,
        friction: 0.5,
        restitution: 0.3,
      },
    },
  },
  entities: [
    { id: "ground", name: "Ground", template: "ground", transform: { x: 0, y: -8.5, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "wall-left", name: "Left Wall", template: "wall", transform: { x: -6.75, y: 0, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "wall-right", name: "Right Wall", template: "wall", transform: { x: 6.75, y: 0, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "cube1", name: "Cube 1", template: "cube", transform: { x: -3, y: -7, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "cube2", name: "Cube 2", template: "cube", transform: { x: 0, y: -7, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "cube3", name: "Cube 3", template: "cube", transform: { x: 3, y: -7, angle: 0, scaleX: 1, scaleY: 1 } },
  ],
  rules: [],
};

function screenToWorldCoords(
  screenX: number,
  screenY: number,
  layout: ContainerLayout
): { x: number; y: number } {
  const viewWidth = layout.width;
  const viewHeight = layout.height;
  const scaleX = viewWidth / (WORLD_BOUNDS.width * PIXELS_PER_METER);
  const scaleY = viewHeight / (WORLD_BOUNDS.height * PIXELS_PER_METER);
  const scale = Math.min(scaleX, scaleY);
  const offsetX = (viewWidth - WORLD_BOUNDS.width * PIXELS_PER_METER * scale) / 2;
  const offsetY = (viewHeight - WORLD_BOUNDS.height * PIXELS_PER_METER * scale) / 2;
  const relativeX = screenX - layout.x;
  const relativeY = screenY - layout.y;
  const viewportX = (relativeX - offsetX) / (PIXELS_PER_METER * scale);
  const viewportY = (relativeY - offsetY) / (PIXELS_PER_METER * scale);
  const worldX = viewportX - WORLD_BOUNDS.width / 2;
  const worldY = WORLD_BOUNDS.height / 2 - viewportY;
  return { x: worldX, y: worldY };
}

export default function BluetoothSyncExample() {
  const router = useRouter();
  const transportRef = useRef<BLETransport | null>(null);
  const bridgeRef = useRef<GodotBridge | null>(null);

  const [mode, setMode] = useState<Mode>("menu");
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [isHost, setIsHost] = useState(false);
  const [peers, setPeers] = useState<Map<PeerId, { name: string; latency: number }>>(new Map());
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  const [gameStatus, setGameStatus] = useState<"loading" | "ready" | "error">("loading");
  const [GodotView, setGodotView] = useState<React.ComponentType<{ style?: object }> | null>(null);
  
  const dragStateRef = useRef<DragState | null>(null);
  const remoteDragJointsRef = useRef<Map<string, number>>(new Map());
  const containerRef = useRef<View>(null);
  const containerLayoutRef = useRef<ContainerLayout | null>(null);
  const sequenceRef = useRef(0);

  const peripheralSupported = isBLEPeripheralSupported();

  const addLog = useCallback((message: string, type: LogEntry["type"] = "info") => {
    const time = new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    console.log(`[BLE-Sync ${type.toUpperCase()}] ${message}`);
    setLogs((prev) => [...prev.slice(-29), { time, message, type }]);
  }, []);

  const sendSyncMessage = useCallback((eventName: string, data: SyncMessage["data"]) => {
    const transport = transportRef.current;
    if (!transport || peers.size === 0) return;

    const message: SyncMessage = {
      type: MessageType.GAME_EVENT,
      timestamp: Date.now(),
      sequence: sequenceRef.current++,
      senderId: transport.localPeerId,
      eventName,
      data,
    };

    transport.broadcast(message);
  }, [peers.size]);

  const handleRemoteDragStart = useCallback(async (entityId: string, x: number, y: number) => {
    const bridge = bridgeRef.current;
    if (!bridge || gameStatus !== "ready") return;

    addLog(`Remote drag start: ${entityId} at (${x.toFixed(2)}, ${y.toFixed(2)})`, "sync");

    const jointId = await bridge.createMouseJointAsync({
      type: "mouse",
      body: entityId,
      target: { x, y },
      maxForce: 50000,
      stiffness: 30,
      damping: 0.5,
    });

    remoteDragJointsRef.current.set(entityId, jointId);
  }, [gameStatus, addLog]);

  const handleRemoteDragMove = useCallback((entityId: string, x: number, y: number) => {
    const bridge = bridgeRef.current;
    if (!bridge) return;

    const jointId = remoteDragJointsRef.current.get(entityId);
    if (jointId !== undefined) {
      bridge.setMouseTarget(jointId, { x, y });
    }
  }, []);

  const handleRemoteDragEnd = useCallback((entityId: string) => {
    const bridge = bridgeRef.current;
    if (!bridge) return;

    const jointId = remoteDragJointsRef.current.get(entityId);
    if (jointId !== undefined) {
      bridge.destroyJoint(jointId);
      remoteDragJointsRef.current.delete(entityId);
      addLog(`Remote drag end: ${entityId}`, "sync");
    }
  }, [addLog]);

  const createTransportHandlers = useCallback((): TransportEventHandlers => ({
    onStateChange: (state, error) => {
      setConnectionState(state);
      addLog(`State: ${state}${error ? ` (${error.message})` : ""}`, error ? "error" : "info");
      
      if (state === ConnectionState.CONNECTED) {
        setMode("connected");
      } else if (state === ConnectionState.DISCONNECTED) {
        setMode("menu");
        setPeers(new Map());
      }
    },
    onPeerConnected: (peerId, peerName) => {
      addLog(`Peer joined: ${peerName}`, "peer");
      setPeers((prev) => {
        const next = new Map(prev);
        next.set(peerId, { name: peerName, latency: 0 });
        return next;
      });
    },
    onPeerDisconnected: (peerId, reason) => {
      addLog(`Peer left: ${peerId.slice(0, 8)}... (${reason})`, "peer");
      setPeers((prev) => {
        const next = new Map(prev);
        next.delete(peerId);
        return next;
      });
    },
    onMessage: (message, fromPeerId) => {
      if (message.type === MessageType.GAME_EVENT) {
        const syncMsg = message as SyncMessage;
        
        if (syncMsg.eventName === "drag_start" && syncMsg.data.dragStart) {
          const { entityId, x, y } = syncMsg.data.dragStart;
          handleRemoteDragStart(entityId, x, y);
        } else if (syncMsg.eventName === "drag_move" && syncMsg.data.dragMove) {
          const { entityId, x, y } = syncMsg.data.dragMove;
          handleRemoteDragMove(entityId, x, y);
        } else if (syncMsg.eventName === "drag_end" && syncMsg.data.dragEnd) {
          const { entityId } = syncMsg.data.dragEnd;
          handleRemoteDragEnd(entityId);
        }
      }
    },
    onError: (error) => {
      addLog(`Error: ${error.message}`, "error");
    },
  }), [addLog, handleRemoteDragStart, handleRemoteDragMove, handleRemoteDragEnd]);

  useEffect(() => {
    let mounted = true;

    import("@/lib/godot").then(async (mod) => {
      if (!mounted) return;
      const newBridge = await mod.createGodotBridge();
      if (!mounted) return;
      bridgeRef.current = newBridge;
      setGodotView(() => mod.GodotView);
    }).catch((err) => {
      if (!mounted) return;
      setGameStatus("error");
      addLog(`Godot load error: ${err.message}`, "error");
    });

    return () => { mounted = false; };
  }, [addLog]);

  useEffect(() => {
    const bridge = bridgeRef.current;
    if (!bridge || !GodotView) return;

    let mounted = true;

    bridge.initialize().then(() => {
      if (!mounted) return;
      return bridge.loadGame(GAME_DEFINITION);
    }).then(() => {
      if (!mounted) return;
      setGameStatus("ready");
      addLog("Physics ready", "success");
    }).catch((err) => {
      if (!mounted) return;
      setGameStatus("error");
      addLog(`Init error: ${err.message}`, "error");
    });

    return () => { mounted = false; };
  }, [GodotView, addLog]);

  const handleHost = useCallback(async () => {
    if (!peripheralSupported) {
      Alert.alert("Not Supported", "BLE hosting requires iOS with the native module.");
      return;
    }

    try {
      addLog("Starting host...");
      setMode("hosting");
      setIsHost(true);

      const transport = new BLETransport();
      transportRef.current = transport;

      await transport.initialize(createTransportHandlers());
      await transport.startHosting({ deviceName: DEVICE_NAME, gameId: GAME_ID });

      addLog("Hosting - waiting for players", "success");
    } catch (error) {
      addLog(`Host failed: ${error instanceof Error ? error.message : "Unknown"}`, "error");
      setMode("menu");
      setIsHost(false);
    }
  }, [peripheralSupported, addLog, createTransportHandlers]);

  const handleJoin = useCallback(async () => {
    try {
      addLog("Scanning for host...");
      setMode("joining");
      setIsHost(false);

      const transport = new BLETransport();
      transportRef.current = transport;

      await transport.initialize(createTransportHandlers());
      await transport.joinSession({ deviceName: DEVICE_NAME, gameId: GAME_ID });

      addLog("Connected!", "success");
    } catch (error) {
      addLog(`Join failed: ${error instanceof Error ? error.message : "Unknown"}`, "error");
      setMode("menu");
    }
  }, [addLog, createTransportHandlers]);

  const handleDisconnect = useCallback(async () => {
    try {
      if (transportRef.current) {
        await transportRef.current.disconnect();
        await transportRef.current.destroy();
        transportRef.current = null;
      }
      setMode("menu");
      setIsHost(false);
      setPeers(new Map());
      addLog("Disconnected", "info");
    } catch (error) {
      addLog(`Disconnect error: ${error instanceof Error ? error.message : "Unknown"}`, "error");
    }
  }, [addLog]);

  const handleTouchStart = useCallback(async (event: GestureResponderEvent) => {
    const bridge = bridgeRef.current;
    if (!bridge || gameStatus !== "ready") return;
    
    const { pageX, pageY } = event.nativeEvent;
    const layout = containerLayoutRef.current;
    if (!layout) return;

    const world = screenToWorldCoords(pageX, pageY, layout);
    const hitEntity = await bridge.queryPointEntity({ x: world.x, y: world.y });

    if (hitEntity && hitEntity.startsWith("cube")) {
      const jointId = await bridge.createMouseJointAsync({
        type: "mouse",
        body: hitEntity,
        target: { x: world.x, y: world.y },
        maxForce: 50000,
        stiffness: 30,
        damping: 0.5,
      });

      dragStateRef.current = { entityId: hitEntity, jointId };
      
      sendSyncMessage("drag_start", {
        dragStart: { entityId: hitEntity, x: world.x, y: world.y }
      });
      
      addLog(`Drag: ${hitEntity}`, "info");
    }
  }, [gameStatus, sendSyncMessage, addLog]);

  const handleTouchMove = useCallback((event: GestureResponderEvent) => {
    const bridge = bridgeRef.current;
    if (!bridge || gameStatus !== "ready") return;
    
    const { pageX, pageY } = event.nativeEvent;
    const layout = containerLayoutRef.current;
    if (!layout) return;

    const world = screenToWorldCoords(pageX, pageY, layout);
    const dragState = dragStateRef.current;
    
    if (dragState) {
      bridge.setMouseTarget(dragState.jointId, { x: world.x, y: world.y });
      
      sendSyncMessage("drag_move", {
        dragMove: { entityId: dragState.entityId, x: world.x, y: world.y }
      });
    }
  }, [gameStatus, sendSyncMessage]);

  const handleTouchEnd = useCallback(() => {
    const bridge = bridgeRef.current;
    if (!bridge) return;
    
    const dragState = dragStateRef.current;
    if (dragState) {
      bridge.destroyJoint(dragState.jointId);
      
      sendSyncMessage("drag_end", {
        dragEnd: { entityId: dragState.entityId }
      });
      
      dragStateRef.current = null;
    }
  }, [sendSyncMessage]);

  const handleLayout = useCallback(() => {
    containerRef.current?.measureInWindow((x, y, width, height) => {
      containerLayoutRef.current = { x, y, width, height };
    });
  }, []);

  useEffect(() => {
    return () => {
      if (transportRef.current) {
        transportRef.current.disconnect().catch(() => {});
        transportRef.current.destroy().catch(() => {});
      }
    };
  }, []);

  const getLogColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "success": return "text-green-400";
      case "error": return "text-red-400";
      case "peer": return "text-blue-400";
      case "sync": return "text-purple-400";
      default: return "text-gray-400";
    }
  };

  if (mode === "menu") {
    return (
      <SafeAreaView className="flex-1 bg-gray-900" edges={["top", "bottom"]}>
        <FullScreenHeader
          onBack={() => router.back()}
          title="BLE Sync Demo"
        />

        <View className="flex-1 justify-center p-6">
          <Text className="text-white text-center text-xl mb-2">Two-Player Physics</Text>
          <Text className="text-gray-400 text-center mb-8">
            Both players can drag the cubes at the same time!{"\n"}
            One device hosts, the other joins.
          </Text>

          <Pressable
            onPress={handleHost}
            className={`py-4 px-6 rounded-xl mb-4 ${peripheralSupported ? "bg-green-600" : "bg-gray-600"}`}
          >
            <Text className="text-white text-center text-lg font-semibold">Host Game</Text>
            <Text className="text-white/70 text-center text-sm mt-1">
              {peripheralSupported ? "Start hosting and wait for player" : "Not supported on this device"}
            </Text>
          </Pressable>

          <Pressable onPress={handleJoin} className="py-4 px-6 bg-blue-600 rounded-xl">
            <Text className="text-white text-center text-lg font-semibold">Join Game</Text>
            <Text className="text-white/70 text-center text-sm mt-1">Scan and connect to host</Text>
          </Pressable>

          {Platform.OS === "android" && (
            <Text className="text-yellow-400 text-center text-sm mt-6">
              Android can only join games (not host yet)
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-900" edges={["top"]}>
      <FullScreenHeader
        onBack={handleDisconnect}
        title={isHost ? "Host" : "Client"}
        rightContent={
          <View className="flex-row items-center">
            <View className={`w-2 h-2 rounded-full mr-2 ${
              connectionState === ConnectionState.CONNECTED ? "bg-green-500" :
              connectionState === ConnectionState.ADVERTISING || connectionState === ConnectionState.SCANNING ? "bg-yellow-500" :
              "bg-gray-500"
            }`} />
            <Text className="text-white text-sm">
              {peers.size} peer{peers.size !== 1 ? "s" : ""}
            </Text>
          </View>
        }
      />

      <View className="flex-1">
        <View
          ref={containerRef}
          className="flex-1"
          onLayout={handleLayout}
          onStartShouldSetResponder={() => gameStatus === "ready" && mode === "connected"}
          onMoveShouldSetResponder={() => gameStatus === "ready" && mode === "connected"}
          onResponderGrant={handleTouchStart}
          onResponderMove={handleTouchMove}
          onResponderRelease={handleTouchEnd}
          onResponderTerminate={handleTouchEnd}
        >
          <View className="flex-1" style={{ pointerEvents: "none" }}>
            {GodotView ? (
              <GodotView style={{ flex: 1 }} />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Text className="text-white">Loading physics...</Text>
              </View>
            )}
          </View>

          {mode !== "connected" && (
            <View className="absolute inset-0 bg-black/70 items-center justify-center">
              <Text className="text-white text-xl mb-2">
                {mode === "hosting" ? "Waiting for player..." : "Connecting..."}
              </Text>
              <Text className="text-gray-400">
                {mode === "hosting" ? "Another device should Join" : "Looking for host"}
              </Text>
            </View>
          )}
        </View>

        <View className="bg-black/80 max-h-32">
          <ScrollView className="px-3 py-2">
            {logs.slice(-8).map((log, idx) => (
              <View key={`${log.time}-${idx}`} className="flex-row mb-0.5">
                <Text className="text-gray-600 font-mono text-xs w-16">{log.time}</Text>
                <Text className={`font-mono text-xs flex-1 ${getLogColor(log.type)}`}>{log.message}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}
