import { useCallback, useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  type GestureResponderEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { ExampleMeta } from "@/lib/registry/types";
import type { GodotBridge } from "@/lib/godot/types";
import type { GameDefinition } from "@slopcade/shared";
import { FullScreenHeader } from "../../components/FullScreenHeader";

export const metadata: ExampleMeta = {
  title: "VFX Showcase",
  description: "Visual effects demo: sprite shaders, post-processing, camera effects, and particles.",
};

const WORLD_BOUNDS = { width: 14, height: 18 };
const PIXELS_PER_METER = 50;

const GAME_DEFINITION: GameDefinition = {
  metadata: {
    id: "vfx-showcase",
    title: "VFX Showcase",
    description: "Visual effects demonstration",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: -15 },
    pixelsPerMeter: PIXELS_PER_METER,
    bounds: WORLD_BOUNDS,
  },
  camera: { type: "fixed", zoom: 1 },
  ui: { backgroundColor: "#0f0f1a" },
  templates: {
    box: {
      id: "box",
      sprite: { type: "rect", width: 2, height: 2, color: "#4ECDC4" },
      physics: {
        bodyType: "dynamic",
        shape: "box",
        width: 2,
        height: 2,
        density: 1,
        friction: 0.3,
        restitution: 0.3,
      },
    },
    circle: {
      id: "circle",
      sprite: { type: "circle", radius: 1, color: "#FF6B6B" },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: 1,
        density: 1,
        friction: 0.3,
        restitution: 0.5,
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
    { id: "box1", name: "Box 1", template: "box", transform: { x: -2, y: -5, angle: 0.1, scaleX: 1, scaleY: 1 } },
    { id: "box2", name: "Box 2", template: "box", transform: { x: 2, y: -5, angle: -0.1, scaleX: 1, scaleY: 1 } },
    { id: "circle1", name: "Circle 1", template: "circle", transform: { x: 0, y: -1, angle: 0, scaleX: 1, scaleY: 1 } },
  ],
  rules: [],
};

const SPRITE_EFFECTS = [
  "none", "outline", "glow", "tint", "flash", "pixelate", "posterize",
  "silhouette", "rainbow", "dissolve", "holographic", "wave", "rim_light",
];

const POST_EFFECTS = [
  "none", "vignette", "scanlines", "chromatic_aberration", "blur", "crt",
  "color_grading", "glitch", "pixelate_screen", "shimmer",
];

const PARTICLE_PRESETS = [
  "fire", "smoke", "sparks", "magic", "explosion", "confetti", "dust", "stars",
];

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
  const worldX = (relativeX - offsetX) / (PIXELS_PER_METER * scale);
  const worldY = (relativeY - offsetY) / (PIXELS_PER_METER * scale);
  return { x: worldX, y: worldY };
}

type EffectCategory = "sprite" | "post" | "camera" | "particles";

export default function VFXShowcaseExample() {
  const router = useRouter();
  const [bridge, setBridge] = useState<GodotBridge | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [GodotView, setGodotView] = useState<React.ComponentType<{ style?: object }> | null>(null);
  
  const containerRef = useRef<View>(null);
  const containerLayoutRef = useRef<ContainerLayout | null>(null);

  const [activeCategory, setActiveCategory] = useState<EffectCategory>("sprite");
  const [selectedSpriteEffect, setSelectedSpriteEffect] = useState("none");
  const [selectedPostEffect, setSelectedPostEffect] = useState("none");
  const [selectedParticle, setSelectedParticle] = useState("fire");
  const [selectedEntity, setSelectedEntity] = useState("box1");

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

  const applySpriteEffect = useCallback((effectName: string) => {
    if (!bridge || status !== "ready") return;
    setSelectedSpriteEffect(effectName);
    
    if (effectName === "none") {
      bridge.clearSpriteEffect(selectedEntity);
    } else {
      const params: Record<string, unknown> = {};
      if (effectName === "outline") {
        params.outline_color = [1, 1, 0, 1];
        params.outline_width = 3.0;
      } else if (effectName === "glow") {
        params.glow_color = [0, 1, 1, 1];
        params.glow_intensity = 2.0;
      } else if (effectName === "tint") {
        params.tint_color = [1, 0.5, 0, 1];
        params.tint_strength = 0.5;
      } else if (effectName === "flash") {
        params.flash_color = [1, 1, 1, 1];
        params.flash_amount = 0.8;
      } else if (effectName === "dissolve") {
        params.dissolve_amount = 0.3;
        params.edge_color = [1, 0.5, 0, 1];
      }
      bridge.applySpriteEffect(selectedEntity, effectName, params);
    }
  }, [bridge, status, selectedEntity]);

  const applyPostEffect = useCallback((effectName: string) => {
    if (!bridge || status !== "ready") return;
    setSelectedPostEffect(effectName);
    
    if (effectName === "none") {
      bridge.clearPostEffect();
    } else {
      const params: Record<string, unknown> = {};
      if (effectName === "vignette") {
        params.vignette_intensity = 0.5;
        params.vignette_softness = 0.5;
      } else if (effectName === "chromatic_aberration") {
        params.aberration_amount = 2.0;
      } else if (effectName === "blur") {
        params.blur_amount = 2.0;
      } else if (effectName === "glitch") {
        params.glitch_intensity = 0.3;
      }
      bridge.setPostEffect(effectName, params);
    }
  }, [bridge, status]);

  const triggerCameraEffect = useCallback((effect: "shake" | "zoom" | "flash" | "shockwave") => {
    if (!bridge || status !== "ready") return;
    
    if (effect === "shake") {
      bridge.screenShake(0.8, 0.4);
    } else if (effect === "zoom") {
      bridge.zoomPunch(0.2, 0.25);
    } else if (effect === "flash") {
      bridge.flashScreen([1, 1, 1, 1], 0.15);
    } else if (effect === "shockwave") {
      bridge.triggerShockwave(7, 9, 3.0);
    }
  }, [bridge, status]);

  const handleTap = useCallback((event: GestureResponderEvent) => {
    if (!bridge || status !== "ready") return;
    
    const { pageX, pageY } = event.nativeEvent;
    const layout = containerLayoutRef.current;
    if (!layout) {
      console.log("[VFX] No layout available");
      return;
    }

    const world = screenToWorldCoords(pageX, pageY, layout);
    console.log("[VFX] Tap at screen:", pageX, pageY, "world:", world.x, world.y, "particle:", selectedParticle);
    
    if (activeCategory === "particles") {
      bridge.spawnParticlePreset(selectedParticle, world.x, world.y);
    }
  }, [bridge, status, activeCategory, selectedParticle]);

  const handleLayout = useCallback(() => {
    containerRef.current?.measureInWindow((x, y, width, height) => {
      containerLayoutRef.current = { x, y, width, height };
    });
  }, []);

  const renderCategoryTabs = () => (
    <View className="flex-row bg-black/60 px-2 py-1">
      {(["sprite", "post", "camera", "particles"] as EffectCategory[]).map((cat) => (
        <Pressable
          key={cat}
          onPress={() => setActiveCategory(cat)}
          className={`px-3 py-2 mr-1 rounded ${activeCategory === cat ? "bg-cyan-600" : "bg-gray-700"}`}
        >
          <Text className="text-white text-xs font-semibold capitalize">{cat}</Text>
        </Pressable>
      ))}
    </View>
  );

  const renderSpriteControls = () => (
    <View className="p-2">
      <View className="flex-row mb-2">
        <Text className="text-gray-400 text-xs mr-2">Entity:</Text>
        {["box1", "box2", "circle1"].map((ent) => (
          <Pressable
            key={ent}
            onPress={() => setSelectedEntity(ent)}
            className={`px-2 py-1 mr-1 rounded ${selectedEntity === ent ? "bg-cyan-600" : "bg-gray-700"}`}
          >
            <Text className="text-white text-xs">{ent}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {SPRITE_EFFECTS.map((effect) => (
          <Pressable
            key={effect}
            onPress={() => applySpriteEffect(effect)}
            className={`px-3 py-2 mr-1 rounded ${selectedSpriteEffect === effect ? "bg-green-600" : "bg-gray-700"}`}
          >
            <Text className="text-white text-xs">{effect}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  const renderPostControls = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="p-2">
      {POST_EFFECTS.map((effect) => (
        <Pressable
          key={effect}
          onPress={() => applyPostEffect(effect)}
          className={`px-3 py-2 mr-1 rounded ${selectedPostEffect === effect ? "bg-purple-600" : "bg-gray-700"}`}
        >
          <Text className="text-white text-xs">{effect}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );

  const renderCameraControls = () => (
    <View className="flex-row p-2">
      {(["shake", "zoom", "flash", "shockwave"] as const).map((effect) => (
        <Pressable
          key={effect}
          onPress={() => triggerCameraEffect(effect)}
          className="px-4 py-2 mr-2 rounded bg-orange-600"
        >
          <Text className="text-white text-xs font-semibold capitalize">{effect}</Text>
        </Pressable>
      ))}
    </View>
  );

  const renderParticleControls = () => (
    <View className="p-2">
      <Text className="text-gray-400 text-xs mb-2">Tap screen to spawn particles:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {PARTICLE_PRESETS.map((preset) => (
          <Pressable
            key={preset}
            onPress={() => setSelectedParticle(preset)}
            className={`px-3 py-2 mr-1 rounded ${selectedParticle === preset ? "bg-red-600" : "bg-gray-700"}`}
          >
            <Text className="text-white text-xs">{preset}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

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
        title="VFX Showcase"
        rightContent={
          status === "loading" ? (
            <Text className="text-yellow-400 text-xs">Loading...</Text>
          ) : null
        }
      />

      <View className="flex-1">
        <View
          ref={containerRef}
          className="flex-1"
          onLayout={handleLayout}
          onStartShouldSetResponder={() => status === "ready" && activeCategory === "particles"}
          onMoveShouldSetResponder={() => false}
          onResponderGrant={() => {}}
          onResponderRelease={handleTap}
          style={{ position: "relative" }}
        >
          {GodotView ? (
            <GodotView style={{ flex: 1, pointerEvents: activeCategory === "particles" ? "none" : "auto" }} />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-white">Loading Godot...</Text>
            </View>
          )}
        </View>

        <View className="bg-black/80">
          {renderCategoryTabs()}
          {activeCategory === "sprite" && renderSpriteControls()}
          {activeCategory === "post" && renderPostControls()}
          {activeCategory === "camera" && renderCameraControls()}
          {activeCategory === "particles" && renderParticleControls()}
        </View>
      </View>
    </SafeAreaView>
  );
}
