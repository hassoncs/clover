import { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import type { ExampleMeta } from "@/lib/registry/types";
import type { GodotBridge } from "@/lib/godot/types";
import type { GameDefinition } from "@slopcade/shared";
import { FullScreenHeader } from "../../components/FullScreenHeader";

export const metadata: ExampleMeta = {
  title: "3D GLB Viewer",
  description:
    "Load and render a 3D GLB model in the Godot engine with voxel animal scene.",
};

const DUCK_URL =
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb";

const MINIMAL_GAME: GameDefinition = {
  metadata: {
    id: "glb-viewer",
    title: "3D GLB Viewer",
    description: "Minimal scene for 3D model viewing",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: 50,
    bounds: { width: 14, height: 18 },
  },
  camera: { type: "fixed", zoom: 1 },
  ui: { backgroundColor: "#111827" },
  templates: {},
  entities: [],
  rules: [],
};

// Random colorful cubes scattered around the duck
// Each entry: [x, y, z, size, colorHex] - smaller cubes so duck is visible
const RANDOM_CUBES: Array<[number, number, number, number, string]> = [
  // A few cubes around the duck - smaller and spread out
  [1.2, 0, 0.5, 0.35, "#FF0000"],
  [-1.2, 0.2, -0.3, 0.4, "#00FF00"],
  [0, 0.8, 1.0, 0.45, "#0000FF"],
  [-0.5, -0.4, 0.8, 0.3, "#FFFF00"],
  [0.8, -0.3, -0.8, 0.35, "#FF00FF"],
];

export default function GLBViewerExample() {
  const router = useRouter();
  const [bridge, setBridge] = useState<GodotBridge | null>(null);
  const [GodotView, setGodotView] = useState<React.ComponentType<{
    style?: object;
  }> | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [modelLoaded, setModelLoaded] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [spinning, setSpinning] = useState(true);
  const spinRef = useRef(true);
  const rotationRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;

    import("@/lib/godot")
      .then(async (mod) => {
        if (!mounted) return;
        const newBridge = await mod.createGodotBridge();
        if (!mounted) return;
        setBridge(newBridge);
        setGodotView(() => mod.GodotView);
      })
      .catch((err) => {
        if (!mounted) return;
        console.error("[GLBViewer] Failed to load module:", err);
        setStatus("error");
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!bridge || !GodotView) return;

    let mounted = true;

    bridge
      .initialize()
      .then(() => {
        if (!mounted) return;
        return bridge.loadGame(MINIMAL_GAME);
      })
      .then(() => {
        if (!mounted) return;
        setStatus("ready");
      })
      .catch((err) => {
        if (!mounted) return;
        console.error("[GLBViewer] Failed to initialize:", err);
        setStatus("error");
      });

    return () => {
      mounted = false;
    };
  }, [bridge, GodotView]);

  // Auto-load scene when ready
  useEffect(() => {
    if (status !== "ready" || !bridge || sceneReady) return;

    console.log("[GLBViewer] Setting up 3D scene...");

    // Setup viewport
    bridge.set3DViewportPosition(0, 0);
    bridge.set3DViewportSize(720, 720);

    // Create floor - gray infinite grid
    console.log("[GLBViewer] Creating floor...");
    bridge.create3DFloor(100, "6B7280", "grid");

    // Create random colorful cubes around the duck
    console.log("[GLBViewer] Creating cubes... count:", RANDOM_CUBES.length);
    RANDOM_CUBES.forEach(([x, y, z, size, color], index) => {
      const colorHex = color.replace("#", "");
      console.log(`[GLBViewer] Creating cube ${index}: pos=(${x},${y},${z}) size=${size} color=${colorHex}`);
      bridge?.create3DCube(x, y, z, size, colorHex);
    });
    console.log("[GLBViewer] Done creating cubes");

    // Load the duck
    console.log("[GLBViewer] Loading 3D duck model...");
    bridge.show3DModelFromUrl(DUCK_URL);

    // Position camera to see the duck, floor, and cubes
    // Camera is at an angle looking down at the scene
    bridge.set3DCameraPosition(3, 5, 5);
    bridge.set3DCameraLookAt(0, 0, 0);
    // Increase camera size so we see more of the scene
    bridge.set3DCameraSize(8);

    bridge.setOrbitControls(true);

    setModelLoaded(true);
    setSceneReady(true);
  }, [status, bridge, sceneReady]);

  useEffect(() => {
    spinRef.current = spinning;
  }, [spinning]);

  useEffect(() => {
    if (!bridge || !modelLoaded) return;

    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (spinRef.current) {
        rotationRef.current += dt * 45;
      }
      bridge.rotate3DModel(0, rotationRef.current, 0);
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [bridge, modelLoaded]);

  const handleBack = useCallback(() => router.back(), [router]);

  return (
    <View style={{ flex: 1, backgroundColor: "#111827" }}>
      <FullScreenHeader title="3D GLB Viewer" showBackground />

      <View style={{ flex: 1 }}>
        {status === "error" ? (
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ color: "#F87171", fontSize: 18 }}>
              Failed to load Godot
            </Text>
            <Pressable
              onPress={handleBack}
              style={{
                marginTop: 16,
                paddingVertical: 8,
                paddingHorizontal: 16,
                backgroundColor: "#374151",
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>
                Go Back
              </Text>
            </Pressable>
          </View>
        ) : GodotView ? (
          <GodotView style={{ flex: 1 }} />
        ) : (
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ color: "#FFFFFF" }}>Loading Godot...</Text>
          </View>
        )}
      </View>

      {status === "ready" && (
        <View
          style={{
            backgroundColor: "rgba(0,0,0,0.85)",
            padding: 12,
            flexDirection: "row",
            gap: 8,
          }}
        >
          <Pressable
            onPress={() => setSpinning((s) => !s)}
            style={{
              flex: 1,
              backgroundColor: spinning ? "#DC2626" : "#16A34A",
              borderRadius: 8,
              paddingVertical: 12,
              paddingHorizontal: 16,
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                textAlign: "center",
                fontWeight: "600",
              }}
            >
              {spinning ? "Stop Spin" : "Start Spin"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => bridge?.set3DCameraSize(2)}
            style={{
              flex: 1,
              backgroundColor: "#7C3AED",
              borderRadius: 8,
              paddingVertical: 12,
              paddingHorizontal: 16,
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                textAlign: "center",
                fontWeight: "600",
              }}
            >
              Zoom In
            </Text>
          </Pressable>
          <Pressable
            onPress={() => bridge?.set3DCameraSize(8)}
            style={{
              flex: 1,
              backgroundColor: "#7C3AED",
              borderRadius: 8,
              paddingVertical: 12,
              paddingHorizontal: 16,
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                textAlign: "center",
                fontWeight: "600",
              }}
            >
              Zoom Out
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (!bridge) return;
              bridge.clear3DModels();
              bridge.clear3DCubes();
              setSceneReady(false);
              setModelLoaded(false);
            }}
            style={{
              flex: 1,
              backgroundColor: "#F59E0B",
              borderRadius: 8,
              paddingVertical: 12,
              paddingHorizontal: 16,
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                textAlign: "center",
                fontWeight: "600",
              }}
            >
              Reset
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
