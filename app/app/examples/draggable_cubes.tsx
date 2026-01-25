import { useCallback, useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  type GestureResponderEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { ExampleMeta } from "@/lib/registry/types";
import type { GodotBridge } from "@/lib/godot/types";
import type { GameDefinition } from "@slopcade/shared";

export const metadata: ExampleMeta = {
  title: "Draggable Cubes",
  description: "Drag physics bodies with mouse/touch. Tests Godot input handling.",
};

const WORLD_BOUNDS = { width: 14, height: 18 };
const PIXELS_PER_METER = 50;

const GAME_DEFINITION: GameDefinition = {
  metadata: {
    id: "draggable-cubes",
    title: "Draggable Cubes",
    description: "Drag the cubes around with your mouse or finger",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: -25 },
    pixelsPerMeter: PIXELS_PER_METER,
    bounds: WORLD_BOUNDS,
  },
  camera: { type: "fixed", zoom: 1 },
  ui: {
    backgroundColor: "#1a1a2e",
  },
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

interface DragState {
  entityId: string;
  jointId: number;
}

interface TouchDebugInfo {
  screenX: number;
  screenY: number;
  worldX: number;
  worldY: number;
  hitEntity: string | null;
  isDragging: boolean;
}

interface ContainerLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

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

export default function DraggableCubesExample() {
  const router = useRouter();
  const [bridge, setBridge] = useState<GodotBridge | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [GodotView, setGodotView] = useState<React.ComponentType<{ style?: object }> | null>(null);
  
  const dragStateRef = useRef<DragState | null>(null);
  const containerRef = useRef<View>(null);
  const containerLayoutRef = useRef<ContainerLayout | null>(null);
  
  const [debugInfo, setDebugInfo] = useState<TouchDebugInfo | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((message: string) => {
    console.log(`[DraggableCubes] ${message}`);
    setLogs((prev) => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
  }, []);

  useEffect(() => {
    let mounted = true;
    
    addLog("Loading Godot module...");
    
    import("@/lib/godot").then(async (mod) => {
      if (!mounted) return;
      
      addLog("Creating bridge...");
      const newBridge = await mod.createGodotBridge();
      
      if (!mounted) return;
      setBridge(newBridge);
      setGodotView(() => mod.GodotView);
      addLog("GodotView ready, waiting for WASM...");
    }).catch((err) => {
      if (!mounted) return;
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Failed to load Godot module");
    });

    return () => { mounted = false; };
  }, [addLog]);

  useEffect(() => {
    if (!bridge || !GodotView) return;
    
    let mounted = true;
    
    addLog("Initializing bridge (waiting for WASM)...");
    bridge.initialize().then(() => {
      if (!mounted) return;
      addLog("Bridge initialized!");
      
      addLog("Loading game definition...");
      return bridge.loadGame(GAME_DEFINITION);
    }).then(() => {
      if (!mounted) return;
      addLog("Game loaded successfully!");
      setStatus("ready");
    }).catch((err) => {
      if (!mounted) return;
      addLog(`Error: ${err.message}`);
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Failed to initialize");
    });

    return () => { mounted = false; };
  }, [bridge, GodotView, addLog]);

  const handleTouchStart = useCallback(
    async (event: GestureResponderEvent) => {
      if (!bridge || status !== "ready") return;
      
      const { pageX, pageY } = event.nativeEvent;
      const layout = containerLayoutRef.current;
      if (!layout) {
        addLog("No layout info available");
        return;
      }

      addLog(`Touch start at screen (${pageX.toFixed(0)}, ${pageY.toFixed(0)})`);

      const world = screenToWorldCoords(pageX, pageY, layout);
      addLog(`World coords: (${world.x.toFixed(2)}, ${world.y.toFixed(2)})`);

      const hitEntity = await bridge.queryPointEntity({ x: world.x, y: world.y });
      addLog(`Query result: ${hitEntity ?? "no hit"}`);

      setDebugInfo({
        screenX: pageX,
        screenY: pageY,
        worldX: world.x,
        worldY: world.y,
        hitEntity,
        isDragging: false,
      });

      if (hitEntity && hitEntity.startsWith("cube")) {
        addLog(`Creating mouse joint for ${hitEntity}`);
        const jointId = await bridge.createMouseJointAsync({
          type: "mouse",
          body: hitEntity,
          target: { x: world.x, y: world.y },
          maxForce: 50000,
          stiffness: 30,
          damping: 0.5,
        });
        addLog(`Joint created: ${jointId}`);

        dragStateRef.current = { entityId: hitEntity, jointId };
        setDebugInfo((prev) =>
          prev ? { ...prev, isDragging: true } : null
        );
      }
    },
    [bridge, status, addLog]
  );

  const handleTouchMove = useCallback(
    (event: GestureResponderEvent) => {
      if (!bridge || status !== "ready") return;
      
      const { pageX, pageY } = event.nativeEvent;
      const layout = containerLayoutRef.current;
      if (!layout) return;

      const world = screenToWorldCoords(pageX, pageY, layout);

      setDebugInfo((prev) =>
        prev
          ? {
              ...prev,
              screenX: pageX,
              screenY: pageY,
              worldX: world.x,
              worldY: world.y,
            }
          : null
      );

      const dragState = dragStateRef.current;
      if (dragState) {
        bridge.setMouseTarget(dragState.jointId, { x: world.x, y: world.y });
      }
    },
    [bridge, status]
  );

  const handleTouchEnd = useCallback(() => {
    if (!bridge) return;
    
    const dragState = dragStateRef.current;
    if (dragState) {
      addLog(`Destroying joint ${dragState.jointId}`);
      bridge.destroyJoint(dragState.jointId);
      dragStateRef.current = null;
    }
    setDebugInfo(null);
  }, [bridge, addLog]);

  const handleLayout = useCallback(() => {
    containerRef.current?.measureInWindow((x, y, width, height) => {
      containerLayoutRef.current = { x, y, width, height };
      addLog(`Container layout: ${width.toFixed(0)}x${height.toFixed(0)} at (${x.toFixed(0)}, ${y.toFixed(0)})`);
    });
  }, [addLog]);

  if (status === "error") {
    return (
      <SafeAreaView className="flex-1 bg-gray-900 items-center justify-center">
        <Text className="text-red-400 text-lg mb-4">{errorMsg}</Text>
        <Pressable onPress={() => router.back()} className="py-2 px-4 bg-gray-700 rounded-lg">
          <Text className="text-white font-semibold">← Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-900" edges={["top"]}>
      <View className="flex-1 bg-gray-900">
        <View className="flex-row items-center justify-between px-4 py-3 bg-black/50">
          <Pressable onPress={() => router.back()} className="py-2 px-4 bg-gray-700 rounded-lg">
            <Text className="text-white font-semibold">← Back</Text>
          </Pressable>
          <Text className="text-white text-lg font-bold">Draggable Cubes</Text>
          <View className="w-20">
            {status === "loading" && (
              <Text className="text-yellow-400 text-xs">Loading...</Text>
            )}
          </View>
        </View>

        <View
          ref={containerRef}
          className="flex-1"
          onLayout={handleLayout}
          onStartShouldSetResponder={() => status === "ready"}
          onMoveShouldSetResponder={() => status === "ready"}
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
                <Text className="text-white">Loading Godot...</Text>
              </View>
            )}
          </View>

          {debugInfo && (
            <View
              className="absolute w-8 h-8 rounded-full border-2 items-center justify-center"
              style={{
                left: debugInfo.screenX - (containerLayoutRef.current?.x ?? 0) - 16,
                top: debugInfo.screenY - (containerLayoutRef.current?.y ?? 0) - 16,
                borderColor: debugInfo.isDragging ? "#4ECDC4" : "#FF6B6B",
                backgroundColor: debugInfo.isDragging ? "rgba(78, 205, 196, 0.3)" : "rgba(255, 107, 107, 0.3)",
                pointerEvents: "none",
              }}
            >
              <View
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: debugInfo.isDragging ? "#4ECDC4" : "#FF6B6B",
                }}
              />
            </View>
          )}
        </View>

        <View className="bg-black/80 p-3 max-h-48">
          <Text className="text-green-400 font-mono text-xs mb-2">
            {status === "loading" 
              ? "Initializing..." 
              : debugInfo
                ? `Touch: (${debugInfo.worldX.toFixed(2)}, ${debugInfo.worldY.toFixed(2)}) | Hit: ${debugInfo.hitEntity ?? "none"} | Dragging: ${debugInfo.isDragging}`
                : "Touch to interact"
            }
          </Text>
          <View className="border-t border-gray-700 pt-2">
            {logs.map((log, idx) => (
              <Text key={`log-${idx}-${log.slice(0, 10)}`} className="text-gray-400 font-mono text-xs">
                {log}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
