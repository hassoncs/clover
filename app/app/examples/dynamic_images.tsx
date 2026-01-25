import { useCallback, useState, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { ExampleMeta } from "@/lib/registry/types";
import type { GodotBridge } from "@/lib/godot/types";
import type { GameDefinition } from "@slopcade/shared";

export const metadata: ExampleMeta = {
  title: "Dynamic Images",
  description: "Swap entity images at runtime. Tests dynamic texture loading.",
};

const WORLD_BOUNDS = { width: 14, height: 18 };
const PIXELS_PER_METER = 50;

const IMAGE_URLS = [
  "https://dummyimage.com/200x200/000/fff.png&text=1",
  "https://dummyimage.com/200x200/ff0/000.png&text=2",
  "https://dummyimage.com/200x200/00f/fff.png&text=3",
];

const GAME_DEFINITION: GameDefinition = {
  metadata: {
    id: "dynamic-images",
    title: "Dynamic Images",
    description: "Swap entity images at runtime",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: -9.8 },
    pixelsPerMeter: PIXELS_PER_METER,
    bounds: WORLD_BOUNDS,
  },
  camera: { type: "fixed", zoom: 1 },
  ui: {
    backgroundColor: "#1a1a2e",
  },
  templates: {
    imageBox: {
      id: "imageBox",
      tags: ["image-entity"],
      sprite: {
        type: "image",
        imageUrl: IMAGE_URLS[0],
        imageWidth: 2,
        imageHeight: 2,
      },
      physics: {
        bodyType: "dynamic",
        shape: "box",
        width: 2,
        height: 2,
        density: 1,
        friction: 0.3,
        restitution: 0.4,
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
    { id: "box1", name: "Box 1", template: "imageBox", transform: { x: -2, y: 1, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "box2", name: "Box 2", template: "imageBox", transform: { x: 2, y: 1, angle: 0, scaleX: 1, scaleY: 1 } },
  ],
  rules: [],
};

export default function DynamicImagesExample() {
  const router = useRouter();
  const [bridge, setBridge] = useState<GodotBridge | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [GodotView, setGodotView] = useState<React.ComponentType<{ style?: object }> | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((message: string) => {
    console.log(`[DynamicImages] ${message}`);
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
      
      const ENTITY_SPAWN_DELAY_MS = 500;
      setTimeout(() => {
        if (!mounted) return;
        addLog("Auto-loading images...");
        bridge.setEntityImage("box1", IMAGE_URLS[0], 2, 2);
        bridge.setEntityImage("box2", IMAGE_URLS[1], 2, 2);
        addLog("Images loaded!");
      }, ENTITY_SPAWN_DELAY_MS);
    }).catch((err) => {
      if (!mounted) return;
      addLog(`Error: ${err.message}`);
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Failed to initialize");
    });

    return () => { mounted = false; };
  }, [bridge, GodotView, addLog]);

  const handleSwapImages = useCallback(() => {
    if (!bridge || status !== "ready") return;
    
    const nextIndex = (currentImageIndex + 1) % IMAGE_URLS.length;
    const url = IMAGE_URLS[nextIndex];
    
    addLog(`Swapping images to: ${url.split('/').pop()}`);
    
    bridge.setEntityImage("box1", url, 2, 2);
    bridge.setEntityImage("box2", url, 2, 2);
    
    setCurrentImageIndex(nextIndex);
  }, [bridge, status, currentImageIndex, addLog]);

  const handleClearCache = useCallback(() => {
    if (!bridge || status !== "ready") return;
    
    addLog("Clearing texture cache...");
    bridge.clearTextureCache();
    addLog("Cache cleared!");
  }, [bridge, status, addLog]);

  const handleSetBox1Image = useCallback((index: number) => {
    if (!bridge || status !== "ready") return;
    
    const url = IMAGE_URLS[index];
    addLog(`Setting Box 1 to image ${index + 1}`);
    bridge.setEntityImage("box1", url, 2, 2);
  }, [bridge, status, addLog]);

  const handleSetBox2Image = useCallback((index: number) => {
    if (!bridge || status !== "ready") return;
    
    const url = IMAGE_URLS[index];
    addLog(`Setting Box 2 to image ${index + 1}`);
    bridge.setEntityImage("box2", url, 2, 2);
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
      <View className="flex-1 bg-gray-900">
        <View className="flex-row items-center justify-between px-4 py-3 bg-black/50">
          <Pressable onPress={() => router.back()} className="py-2 px-4 bg-gray-700 rounded-lg">
            <Text className="text-white font-semibold">← Back</Text>
          </Pressable>
          <Text className="text-white text-lg font-bold">Dynamic Images</Text>
          <View className="w-20">
            {status === "loading" && (
              <Text className="text-yellow-400 text-xs">Loading...</Text>
            )}
          </View>
        </View>

        <View className="flex-1">
          {GodotView ? (
            <GodotView style={{ flex: 1 }} />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-white">Loading Godot...</Text>
            </View>
          )}
        </View>

        <View className="bg-black/80 p-3">
          <View className="flex-row justify-center gap-2 mb-3">
            <Pressable
              onPress={handleSwapImages}
              disabled={status !== "ready"}
              className={`py-2 px-4 rounded-lg ${status === "ready" ? "bg-blue-600" : "bg-gray-600"}`}
            >
              <Text className="text-white font-semibold">Swap Both</Text>
            </Pressable>
            <Pressable
              onPress={handleClearCache}
              disabled={status !== "ready"}
              className={`py-2 px-4 rounded-lg ${status === "ready" ? "bg-red-600" : "bg-gray-600"}`}
            >
              <Text className="text-white font-semibold">Clear Cache</Text>
            </Pressable>
          </View>

          <View className="flex-row justify-center gap-4 mb-3">
            <View className="items-center">
              <Text className="text-gray-400 text-xs mb-1">Box 1</Text>
              <View className="flex-row gap-1">
                {IMAGE_URLS.map((url, idx) => (
                  <Pressable
                    key={`box1-${url}`}
                    onPress={() => handleSetBox1Image(idx)}
                    disabled={status !== "ready"}
                    className={`py-1 px-3 rounded ${status === "ready" ? "bg-green-600" : "bg-gray-600"}`}
                  >
                    <Text className="text-white text-xs">{idx + 1}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View className="items-center">
              <Text className="text-gray-400 text-xs mb-1">Box 2</Text>
              <View className="flex-row gap-1">
                {IMAGE_URLS.map((url, idx) => (
                  <Pressable
                    key={`box2-${url}`}
                    onPress={() => handleSetBox2Image(idx)}
                    disabled={status !== "ready"}
                    className={`py-1 px-3 rounded ${status === "ready" ? "bg-purple-600" : "bg-gray-600"}`}
                  >
                    <Text className="text-white text-xs">{idx + 1}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

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
