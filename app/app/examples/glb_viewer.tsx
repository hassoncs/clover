import { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { ExampleMeta } from "@/lib/registry/types";
import type { GodotBridge } from "@/lib/godot/types";
import { FullScreenHeader } from "../../components/FullScreenHeader";

export const metadata: ExampleMeta = {
  title: "3D GLB Viewer",
  description: "Load and display 3D GLB models in Godot.",
};

export default function GLBViewerExample() {
  const router = useRouter();
  const [bridge, setBridge] = useState<GodotBridge | null>(null);
  const [GodotView, setGodotView] = useState<React.ComponentType<{ style?: object }> | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let mounted = true;

    import("@/lib/godot").then(async (mod) => {
      if (!mounted) return;

      const newBridge = await mod.createGodotBridge();
      setBridge(newBridge);
      setGodotView(() => mod.GodotView);
    }).catch((err) => {
      if (!mounted) return;
      console.error("[GLBViewer] Failed to load module:", err);
      setStatus("error");
    });

    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!bridge || !GodotView) return;

    let mounted = true;

    bridge.initialize().then(() => {
      if (!mounted) return;
      setStatus("ready");
    }).catch((err) => {
      if (!mounted) return;
      console.error("[GLBViewer] Failed to initialize:", err);
      setStatus("error");
    });

    return () => { mounted = false; };
  }, [bridge, GodotView]);

  const loadTestModel = useCallback(() => {
    if (!bridge) {
      console.log("[GLBViewer] No bridge available for 3D");
      return;
    }
    console.log("[GLBViewer] Loading 3D duck model...");
    bridge.show3DModelFromUrl("https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb");
    console.log("[GLBViewer] 3D model request sent");
  }, [bridge]);

  const loadBackground = useCallback(async () => {
    if (!bridge) {
      console.log("[GLBViewer] No bridge available");
      return;
    }
    console.log("[GLBViewer] Loading 2D background...");
    
    const bgDef = {
      metadata: { id: "bg-test", title: "BG Test", description: "", version: "1.0.0" },
      world: { gravity: { x: 0, y: -20 }, pixelsPerMeter: 50, bounds: { width: 14, height: 18 } },
      camera: { type: "fixed" as const, zoom: 1 },
      ui: { backgroundColor: "#1a1a2e" },
      templates: {
        bg: {
          id: "bg",
          sprite: { type: "rect" as const, width: 14, height: 10, color: "#3498db" },
          physics: { bodyType: "static" as const, shape: "box" as const, width: 14, height: 10, density: 0, friction: 0, restitution: 0 }
        },
        box: {
          id: "box",
          sprite: { type: "rect" as const, width: 2, height: 2, color: "#e74c3c" },
          physics: { bodyType: "dynamic" as const, shape: "box" as const, width: 2, height: 2, density: 1, friction: 0.3, restitution: 0.5 }
        }
      },
      entities: [
        { id: "background", name: "Background", template: "bg", transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 } },
        { id: "box1", name: "Box 1", template: "box", transform: { x: -3, y: -3, angle: 0, scaleX: 1, scaleY: 1 } },
        { id: "box2", name: "Box 2", template: "box", transform: { x: 3, y: -5, angle: 0.5, scaleX: 1, scaleY: 1 } }
      ],
      rules: []
    };
    
    try {
      await bridge.loadGame(bgDef);
      console.log("[GLBViewer] 2D background loaded successfully");
    } catch (err) {
      console.error("[GLBViewer] Failed to load background:", err);
    }
  }, [bridge]);

  return (
    <SafeAreaView className="flex-1 bg-gray-900" edges={["top"]}>
      <FullScreenHeader
        title="3D GLB Viewer"
        rightContent={
          status === "loading" ? (
            <Text className="text-yellow-400 text-xs">Loading...</Text>
          ) : null
        }
      />

      <View className="flex-1">
        {status === "error" ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-red-400 text-lg">Failed to load Godot</Text>
          </View>
        ) : (
          <View className="flex-1">
            {GodotView ? (
              <GodotView style={{ flex: 1 }} />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Text className="text-white">Loading Godot...</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {status === "ready" && (
        <View className="bg-black/80 p-3 flex-row gap-3">
          <Pressable
            onPress={loadBackground}
            className="flex-1 bg-green-600 rounded-lg py-3 px-4"
          >
            <Text className="text-white text-center font-semibold">Load 2D Background</Text>
          </Pressable>
          <Pressable
            onPress={loadTestModel}
            className="flex-1 bg-blue-600 rounded-lg py-3 px-4"
          >
            <Text className="text-white text-center font-semibold">Load 3D Duck</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}
