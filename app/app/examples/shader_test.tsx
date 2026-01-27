import { useCallback, useRef, useState, useEffect } from "react";
import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import type { ExampleMeta } from "@/lib/registry/types";
import type { GodotBridge } from "@/lib/godot/types";
import type { GameDefinition } from "@slopcade/shared";

export const metadata: ExampleMeta = {
  title: "Shader Test",
  description: "Automated shader effect testing with URL parameters. Use ?effect=outline",
};

const WORLD_BOUNDS = { width: 10, height: 10 };
const PIXELS_PER_METER = 50;

const GAME_DEFINITION: GameDefinition = {
  metadata: {
    id: "shader-test",
    title: "Shader Test",
    description: "Shader effect testing",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: PIXELS_PER_METER,
    bounds: WORLD_BOUNDS,
  },
  camera: { type: "fixed", zoom: 1 },
  ui: { backgroundColor: "#1a1a2e" },
  templates: {
    testBox: {
      id: "testBox",
      sprite: { type: "rect", width: 4, height: 4, color: "#4ECDC4" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 4,
        height: 4,
        density: 0,
        friction: 0,
        restitution: 0,
      },
    },
  },
  entities: [
    { 
      id: "test-entity", 
      name: "Test Entity", 
      template: "testBox", 
      transform: { x: 5, y: 5, angle: 0, scaleX: 1, scaleY: 1 } 
    },
  ],
  rules: [],
};

const SPRITE_EFFECTS = [
  "none", "outline", "glow", "tint", "flash", "pixelate", "posterize",
  "silhouette", "rainbow", "dissolve", "holographic", "wave", "rim_light",
] as const;

type SpriteEffect = typeof SPRITE_EFFECTS[number];

const EFFECT_PARAMS: Record<string, Record<string, unknown>> = {
  outline: { outline_color: [1, 1, 0, 1], outline_width: 4.0 },
  glow: { glow_color: [0, 1, 1, 1], glow_intensity: 2.0 },
  tint: { tint_color: [1, 0.5, 0, 1], tint_strength: 0.5 },
  flash: { flash_color: [1, 1, 1, 1], flash_amount: 0.8 },
  dissolve: { dissolve_amount: 0.3, edge_color: [1, 0.5, 0, 1] },
  pixelate: { pixel_size: 8.0 },
  posterize: { levels: 4.0 },
  silhouette: { silhouette_color: [0, 0, 0, 1] },
  rainbow: {},
  holographic: {},
  wave: { wave_amplitude: 0.1, wave_frequency: 10.0 },
  rim_light: { rim_color: [1, 1, 1, 1], rim_power: 2.0 },
};

export default function ShaderTestExample() {
  const params = useLocalSearchParams<{ effect?: string }>();
  const requestedEffect = (params.effect || "none") as SpriteEffect;
  
  const [bridge, setBridge] = useState<GodotBridge | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [GodotView, setGodotView] = useState<React.ComponentType<{ style?: object }> | null>(null);
  const [appliedEffect, setAppliedEffect] = useState<string>("none");
  const effectAppliedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    
    import("@/lib/godot").then(async (mod) => {
      if (!mounted) return;
      const newBridge = await mod.createGodotBridge();
      if (!mounted) return;
      setBridge(newBridge);
      setGodotView(() => mod.GodotView);
    }).catch((err) => {
      if (!mounted) return;
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Failed to load Godot module");
    });

    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!bridge || !GodotView) return;
    
    let mounted = true;
    
    bridge.initialize().then(() => {
      if (!mounted) return;
      return bridge.loadGame(GAME_DEFINITION);
    }).then(() => {
      if (!mounted) return;
      setStatus("ready");
    }).catch((err) => {
      if (!mounted) return;
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Failed to initialize");
    });

    return () => { mounted = false; };
  }, [bridge, GodotView]);

  const applyEffect = useCallback((effectName: SpriteEffect) => {
    if (!bridge || status !== "ready") return;
    
    if (effectName === "none") {
      bridge.clearSpriteEffect("test-entity");
    } else {
      const params = EFFECT_PARAMS[effectName] || {};
      bridge.applySpriteEffect("test-entity", effectName, params);
    }
    setAppliedEffect(effectName);
  }, [bridge, status]);

  useEffect(() => {
    if (status === "ready" && !effectAppliedRef.current) {
      effectAppliedRef.current = true;
      const validEffect = SPRITE_EFFECTS.includes(requestedEffect as SpriteEffect) 
        ? requestedEffect 
        : "none";
      setTimeout(() => applyEffect(validEffect as SpriteEffect), 100);
    }
  }, [status, requestedEffect, applyEffect]);

  if (status === "error") {
    return (
      <View 
        className="flex-1 bg-red-900 items-center justify-center"
        testID="shader-test-error"
      >
        <Text className="text-red-400 text-lg">{errorMsg}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-900" testID="shader-test-container">
      <View className="absolute top-4 left-4 right-4 z-10 bg-black/80 p-4 rounded-lg">
        <Text 
          className="text-white text-2xl font-bold text-center"
          testID="shader-effect-name"
        >
          Effect: {appliedEffect.toUpperCase()}
        </Text>
        <Text className="text-gray-400 text-center mt-1">
          Status: {status}
        </Text>
        {status === "ready" && (
          <Text 
            className="text-green-400 text-center mt-1"
            testID="shader-test-ready"
          >
            ✓ Ready - Effect Applied
          </Text>
        )}
      </View>

      <View className="flex-1" testID="godot-canvas-container">
        {GodotView ? (
          <GodotView style={{ flex: 1 }} />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-white">Loading Godot...</Text>
          </View>
        )}
      </View>

      <View className="absolute bottom-4 left-4 right-4 bg-black/80 p-3 rounded-lg">
        <Text className="text-gray-400 text-xs text-center">
          URL: /examples/shader_test?effect={appliedEffect}
        </Text>
        <Text className="text-gray-500 text-xs text-center mt-1">
          Available: {SPRITE_EFFECTS.join(", ")}
        </Text>
      </View>
    </View>
  );
}
