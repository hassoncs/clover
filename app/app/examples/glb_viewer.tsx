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
    "Load and render a 3D GLB model in the Godot engine. Proves 3D rendering works via SubViewport.",
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

  const loadDuck = useCallback(() => {
    if (!bridge) return;
    console.log("[GLBViewer] Loading 3D duck model...");
    bridge.set3DViewportPosition(0, 0);
    bridge.set3DViewportSize(720, 720);
    bridge.show3DModelFromUrl(DUCK_URL);
    setModelLoaded(true);
  }, [bridge]);

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
          {!modelLoaded ? (
            <Pressable
              onPress={loadDuck}
              style={{
                flex: 1,
                backgroundColor: "#2563EB",
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
                Load 3D Duck
              </Text>
            </Pressable>
          ) : (
            <>
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
            </>
          )}
        </View>
      )}
    </View>
  );
}
