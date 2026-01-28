import { useCallback, useRef, useState, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { ExampleMeta } from "@/lib/registry/types";
import type { GodotBridge } from "@/lib/godot/types";
import type { GameDefinition } from "@slopcade/shared";
import { FullScreenHeader } from "../../components/FullScreenHeader";

export const metadata: ExampleMeta = {
  title: "Spinning Wheel",
  description: "A physics-based spinning wheel with drag-to-spin and natural dampening.",
};

const WORLD_BOUNDS = { width: 14, height: 18 };
const PIXELS_PER_METER = 50;
const WHEEL_RADIUS = 4;
const WHEEL_CENTER = { x: 7, y: 9 };

const SEGMENT_COLORS = [
  "#E74C3C", "#F39C12", "#F1C40F", "#2ECC71",
  "#3498DB", "#9B59B6", "#E91E63", "#00BCD4",
];

const GAME_DEFINITION: GameDefinition = {
  metadata: {
    id: "spinning-wheel",
    title: "Spinning Wheel",
    description: "Spin the wheel and watch physics in action!",
    instructions: "Drag to spin the wheel. Release to let it spin freely with natural slowdown.",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: PIXELS_PER_METER,
    bounds: WORLD_BOUNDS,
  },
  camera: { type: "fixed", zoom: 1 },
  ui: {
    backgroundColor: "#1a1a2e",
  },
  templates: {
    wheel: {
      id: "wheel",
      tags: ["wheel", "spinnable"],
      sprite: { type: "circle", radius: WHEEL_RADIUS, color: "#2C3E50" },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: WHEEL_RADIUS,
        density: 2,
        friction: 0.3,
        restitution: 0.1,
        angularDamping: 0.3,
        fixedRotation: false,
      },
    },
    outerRing: {
      id: "outerRing",
      tags: ["decoration"],
      sprite: { type: "circle", radius: WHEEL_RADIUS + 0.2, color: "#D4AF37" },
      type: "zone",
      zone: {
        shape: { type: "circle", radius: WHEEL_RADIUS + 0.2 },
      },
    },
    anchor: {
      id: "anchor",
      tags: ["anchor"],
      sprite: { type: "circle", radius: 0.5, color: "#F1C40F" },
      physics: {
        bodyType: "static",
        shape: "circle",
        radius: 0.5,
        density: 0,
        friction: 0,
        restitution: 0,
      },
    },
    pointer: {
      id: "pointer",
      tags: ["pointer"],
      sprite: { type: "polygon", vertices: [{ x: 0, y: -0.9 }, { x: -0.4, y: 0.2 }, { x: 0.4, y: 0.2 }], color: "#F1C40F" },
      physics: {
        bodyType: "static",
        shape: "polygon",
        vertices: [{ x: 0, y: -0.9 }, { x: -0.4, y: 0.2 }, { x: 0.4, y: 0.2 }],
        density: 0,
        friction: 0,
        restitution: 0,
      },
    },
    wheelDivider: {
      id: "wheelDivider",
      tags: ["divider"],
      sprite: { type: "rect", width: 0.15, height: WHEEL_RADIUS * 0.95, color: "#FFFFFF" },
      type: "zone",
      zone: {
        shape: { type: "box", width: 0.15, height: WHEEL_RADIUS * 0.95 },
      },
    },
  },
  entities: [
    {
      id: "outerRing",
      name: "Outer Ring",
      template: "outerRing",
      transform: { x: WHEEL_CENTER.x, y: WHEEL_CENTER.y, angle: 0, scaleX: 1, scaleY: 1 },
      layer: -1,
    },
    {
      id: "wheel",
      name: "Spinning Wheel",
      template: "wheel",
      transform: { x: WHEEL_CENTER.x, y: WHEEL_CENTER.y, angle: 0, scaleX: 1, scaleY: 1 },
      layer: 0,
    },
    ...Array.from({ length: 8 }, (_, i) => ({
      id: `divider-${i}`,
      name: `Divider ${i + 1}`,
      template: "wheelDivider",
      transform: {
        x: WHEEL_CENTER.x + Math.cos((i * Math.PI) / 4) * (WHEEL_RADIUS * 0.475),
        y: WHEEL_CENTER.y + Math.sin((i * Math.PI) / 4) * (WHEEL_RADIUS * 0.475),
        angle: (i * Math.PI) / 4 + Math.PI / 2,
        scaleX: 1,
        scaleY: 1,
      },
      layer: 1,
    })),
    {
      id: "anchor",
      name: "Center Anchor",
      template: "anchor",
      transform: { x: WHEEL_CENTER.x, y: WHEEL_CENTER.y, angle: 0, scaleX: 1, scaleY: 1 },
      layer: 2,
    },
    {
      id: "pointer",
      name: "Pointer",
      template: "pointer",
      transform: { x: WHEEL_CENTER.x, y: WHEEL_CENTER.y - WHEEL_RADIUS - 0.7, angle: Math.PI, scaleX: 1, scaleY: 1 },
      layer: 3,
    },
  ],
  joints: [
    {
      id: "wheel-anchor-joint",
      type: "revolute",
      entityA: "anchor",
      entityB: "wheel",
      anchor: { x: WHEEL_CENTER.x, y: WHEEL_CENTER.y },
      collideConnected: false,
    },
    {
      id: "ring-wheel-joint",
      type: "weld",
      entityA: "wheel",
      entityB: "outerRing",
      anchor: { x: WHEEL_CENTER.x, y: WHEEL_CENTER.y },
    },
    ...Array.from({ length: 8 }, (_, i) => ({
      id: `divider-joint-${i}`,
      type: "weld" as const,
      entityA: "wheel",
      entityB: `divider-${i}`,
      anchor: { x: WHEEL_CENTER.x, y: WHEEL_CENTER.y },
    })),
  ],
  rules: [],
};

interface DragTracker {
  startAngle: number;
  lastAngle: number;
  lastTime: number;
  angularVelocity: number;
}

function getAngleFromCenter(x: number, y: number): number {
  return Math.atan2(y - WHEEL_CENTER.y, x - WHEEL_CENTER.x);
}

function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

export default function SpinningWheelExample() {
  const router = useRouter();
  const [bridge, setBridge] = useState<GodotBridge | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [GodotView, setGodotView] = useState<React.ComponentType<{ style?: object }> | null>(null);

  const dragTrackerRef = useRef<DragTracker | null>(null);

  const [debugInfo, setDebugInfo] = useState<{
    isDragging: boolean;
    angularVelocity: number;
    currentAngle: number;
  } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((message: string) => {
    console.log(`[SpinningWheel] ${message}`);
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

  useEffect(() => {
    if (!bridge || status !== "ready") return;

    const unsubscribe = bridge.onInputEvent((type, x, y, _entityId) => {
      if (type === "drag_start") {
        const distFromCenter = Math.sqrt(
          Math.pow(x - WHEEL_CENTER.x, 2) + Math.pow(y - WHEEL_CENTER.y, 2)
        );

        if (distFromCenter <= WHEEL_RADIUS + 0.5) {
          const currentAngle = getAngleFromCenter(x, y);
          dragTrackerRef.current = {
            startAngle: currentAngle,
            lastAngle: currentAngle,
            lastTime: Date.now(),
            angularVelocity: 0,
          };

          addLog(`Drag started at angle ${(currentAngle * 180 / Math.PI).toFixed(1)}°`);
          setDebugInfo({
            isDragging: true,
            angularVelocity: 0,
            currentAngle: currentAngle,
          });
        }
      } else if (type === "drag_move") {
        const tracker = dragTrackerRef.current;
        if (!tracker) return;

        const currentAngle = getAngleFromCenter(x, y);
        const now = Date.now();
        const deltaTime = (now - tracker.lastTime) / 1000;

        if (deltaTime > 0.001) {
          const angleDelta = normalizeAngle(currentAngle - tracker.lastAngle);
          tracker.angularVelocity = angleDelta / deltaTime;
          tracker.lastAngle = currentAngle;
          tracker.lastTime = now;

          bridge.setAngularVelocity("wheel", tracker.angularVelocity);

          setDebugInfo({
            isDragging: true,
            angularVelocity: tracker.angularVelocity,
            currentAngle: currentAngle,
          });
        }
      } else if (type === "drag_end") {
        const tracker = dragTrackerRef.current;
        if (tracker) {
          addLog(`Released with angular velocity ${(tracker.angularVelocity * 180 / Math.PI).toFixed(1)}°/s`);
          bridge.setAngularVelocity("wheel", tracker.angularVelocity * 1.5);
          dragTrackerRef.current = null;
          setDebugInfo(null);
        }
      }
    });

    return unsubscribe;
  }, [bridge, status, addLog]);

  const handleReset = useCallback(() => {
    if (!bridge || status !== "ready") return;

    addLog("Resetting wheel...");
    bridge.setAngularVelocity("wheel", 0);
    bridge.setTransform("wheel", WHEEL_CENTER.x, WHEEL_CENTER.y, 0);
  }, [bridge, status, addLog]);

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
      <FullScreenHeader
        title="Spinning Wheel"
        rightContent={
          <View className="flex-row gap-2">
            <Pressable
              onPress={handleReset}
              className="py-2 px-4 bg-amber-600 rounded-lg"
              disabled={status !== "ready"}
            >
              <Text className="text-white font-semibold">Reset</Text>
            </Pressable>
          </View>
        }
      />

      <View className="flex-1 bg-gray-900">
        {GodotView ? (
          <GodotView style={{ flex: 1 }} />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-white">Loading Godot...</Text>
          </View>
        )}
      </View>

      <View className="bg-black/80 p-3 max-h-40">
        <Text className="text-green-400 font-mono text-xs mb-2">
          {status === "loading"
            ? "Initializing..."
            : debugInfo
              ? `Dragging | Velocity: ${(debugInfo.angularVelocity * 180 / Math.PI).toFixed(1)}°/s`
              : "Drag the wheel to spin it!"
          }
        </Text>
        <View className="border-t border-gray-700 pt-2">
          {logs.slice(-5).map((log, idx) => (
            <Text key={`log-${idx}-${log.slice(0, 10)}`} className="text-gray-400 font-mono text-xs">
              {log}
            </Text>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
