import { useCallback, useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Slider from "@react-native-community/slider";
import type { ExampleMeta } from "@/lib/registry/types";
import type { GodotBridge } from "@/lib/godot/types";
import type { GameDefinition } from "@slopcade/shared";
import { EFFECT_METADATA, type EffectParamMeta, type EffectMetadata } from "@slopcade/shared/effects/metadata";
import type { EffectType } from "@slopcade/shared/effects/types";
import { FullScreenHeader } from "../../components/FullScreenHeader";

export const metadata: ExampleMeta = {
  title: "Effects V2 Test",
  description: "Comprehensive testbed for V2 effects system with auto-generated controls.",
};

const WORLD_BOUNDS = { width: 14, height: 18 };
const PIXELS_PER_METER = 50;

const GAME_DEFINITION: GameDefinition = {
  metadata: {
    id: "effects-test",
    title: "Effects Test",
    description: "Testbed for effects",
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
    box: {
      id: "box",
      visual: { type: "rect", width: 3, height: 3, color: "#4ECDC4" },
      physics: { bodyType: "dynamic", density: 1, fixedRotation: true },
      collider: { shape: "box", width: 3, height: 3 },
    },
    circle: {
      id: "circle",
      visual: { type: "circle", radius: 1.5, color: "#FF6B6B" },
      physics: { bodyType: "dynamic", density: 1, fixedRotation: true },
      collider: { shape: "circle", radius: 1.5 },
    },
    text: {
      id: "text",
      visual: { type: "text", text: "VFX", fontSize: 64, color: "#ffffff" },
      physics: { bodyType: "dynamic", density: 1 },
      collider: { shape: "box", width: 4, height: 2 },
    },
  },
  entities: [
    { id: "test-box", name: "Test Box", template: "box", transform: { x: -3, y: 0, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "test-circle", name: "Test Circle", template: "circle", transform: { x: 3, y: 0, angle: 0, scaleX: 1, scaleY: 1 } },
  ],
  rules: [],
};

type Tab = "sprite" | "post";

export default function EffectsTestExample() {
  const router = useRouter();
  const [bridge, setBridge] = useState<GodotBridge | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [GodotView, setGodotView] = useState<React.ComponentType<{ style?: object }> | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>("sprite");
  const [selectedSpriteEffect, setSelectedSpriteEffect] = useState<EffectType | "none">("none");
  const [selectedPostEffect, setSelectedPostEffect] = useState<EffectType | "none">("none");
  const [targetEntity, setTargetEntity] = useState("test-box");
  
  const [spriteParams, setSpriteParams] = useState<Record<string, any>>({});
  const [postParams, setPostParams] = useState<Record<string, any>>({});

  const spriteEffects = useMemo(() => {
    return Object.values(EFFECT_METADATA)
      .filter((m: EffectMetadata) => m.category !== 'postProcess')
      .map((m: EffectMetadata) => m.type);
  }, []);

  const postEffects = useMemo(() => {
    return Object.values(EFFECT_METADATA)
      .filter((m: EffectMetadata) => m.category === 'postProcess')
      .map((m: EffectMetadata) => m.type);
  }, []);

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

  useEffect(() => {
    if (!bridge || status !== "ready") return;

    for (const id of ["test-box", "test-circle"]) {
      bridge.clearSpriteEffect(id);
    }

    if (selectedSpriteEffect !== "none") {
      const metadata = EFFECT_METADATA[selectedSpriteEffect as EffectType];
      const params = { ...metadata.defaultValues, ...spriteParams };
      bridge.applySpriteEffect(targetEntity, selectedSpriteEffect, params);
    }
  }, [bridge, status, selectedSpriteEffect, targetEntity, spriteParams]);

  useEffect(() => {
    if (!bridge || status !== "ready") return;

    bridge.clearPostEffect();

    if (selectedPostEffect !== "none") {
      const metadata = EFFECT_METADATA[selectedPostEffect as EffectType];
      const params = { ...metadata.defaultValues, ...postParams };
      bridge.setPostEffect(selectedPostEffect, params);
    }
  }, [bridge, status, selectedPostEffect, postParams]);

  const handleSelectSpriteEffect = (effect: EffectType | "none") => {
    setSelectedSpriteEffect(effect);
    if (effect !== "none") {
      setSpriteParams(EFFECT_METADATA[effect as EffectType].defaultValues);
    } else {
      setSpriteParams({});
    }
  };

  const handleSelectPostEffect = (effect: EffectType | "none") => {
    setSelectedPostEffect(effect);
    if (effect !== "none") {
      setPostParams(EFFECT_METADATA[effect as EffectType].defaultValues);
    } else {
      setPostParams({});
    }
  };

  const updateParam = (key: string, value: any, isPost: boolean) => {
    if (isPost) {
      setPostParams(prev => ({ ...prev, [key]: value }));
    } else {
      setSpriteParams(prev => ({ ...prev, [key]: value }));
    }
  };

  const renderParamControl = (param: EffectParamMeta, isPost: boolean) => {
    const currentParams = isPost ? postParams : spriteParams;
    const value = currentParams[param.key] ?? param.defaultValue;

    if (param.type === 'number') {
      return (
        <View key={param.key} className="mb-4">
          <View className="flex-row justify-between mb-1">
            <Text className="text-gray-300 text-xs">{param.displayName}</Text>
            <Text className="text-cyan-400 text-xs font-mono">{Number(value).toFixed(2)}</Text>
          </View>
          <Slider
            style={{ width: '100%', height: 40 }}
            minimumValue={param.min ?? 0}
            maximumValue={param.max ?? 1}
            step={param.step ?? 0.1}
            value={Number(value)}
            onValueChange={(v) => updateParam(param.key, v, isPost)}
            minimumTrackTintColor="#22d3ee"
            maximumTrackTintColor="#4b5563"
            thumbTintColor="#22d3ee"
          />
        </View>
      );
    }

    if (param.type === 'boolean') {
      return (
        <View key={param.key} className="flex-row justify-between items-center mb-4">
          <Text className="text-gray-300 text-sm">{param.displayName}</Text>
          <Switch
            value={Boolean(value)}
            onValueChange={(v) => updateParam(param.key, v, isPost)}
            trackColor={{ false: "#4b5563", true: "#0e7490" }}
            thumbColor={value ? "#22d3ee" : "#f4f4f5"}
          />
        </View>
      );
    }

    if (param.type === 'color') {
      return (
        <View key={param.key} className="mb-4">
          <Text className="text-gray-300 text-xs mb-1">{param.displayName}</Text>
          <View className="flex-row items-center">
            <View 
              style={{ backgroundColor: String(value), width: 24, height: 24, borderRadius: 4, marginRight: 8, borderWidth: 1, borderColor: '#fff' }} 
            />
            <TextInput
              value={String(value)}
              onChangeText={(v) => updateParam(param.key, v, isPost)}
              className="flex-1 bg-gray-800 text-white px-2 py-1 rounded text-xs font-mono border border-gray-700"
              placeholder="#RRGGBB"
              placeholderTextColor="#666"
            />
          </View>
        </View>
      );
    }

    if (param.type === 'select' && param.options) {
      return (
        <View key={param.key} className="mb-4">
          <Text className="text-gray-300 text-xs mb-2">{param.displayName}</Text>
          <View className="flex-row flex-wrap gap-2">
            {param.options.map(opt => (
              <Pressable
                key={opt}
                onPress={() => updateParam(param.key, opt, isPost)}
                className={`px-3 py-1 rounded border ${value === opt ? 'bg-cyan-900 border-cyan-500' : 'bg-gray-800 border-gray-700'}`}
              >
                <Text className={`text-xs ${value === opt ? 'text-cyan-400' : 'text-gray-400'}`}>{opt}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      );
    }

    return null;
  };

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

  const activeEffect = activeTab === 'sprite' ? selectedSpriteEffect : selectedPostEffect;
  const activeMetadata = activeEffect !== 'none' ? EFFECT_METADATA[activeEffect as EffectType] : null;

  return (
    <SafeAreaView className="flex-1 bg-gray-900" edges={["top"]}>
      <FullScreenHeader title="Effects V2 Test" />

      <View className="flex-1 flex-row">
        <View className="w-80 bg-gray-900 border-r border-gray-800 flex-col">
          
          <View className="flex-row border-b border-gray-800">
            <Pressable 
              onPress={() => setActiveTab('sprite')}
              className={`flex-1 py-3 items-center ${activeTab === 'sprite' ? 'border-b-2 border-cyan-500 bg-gray-800' : ''}`}
            >
              <Text className={`font-bold ${activeTab === 'sprite' ? 'text-cyan-400' : 'text-gray-500'}`}>Sprite FX</Text>
            </Pressable>
            <Pressable 
              onPress={() => setActiveTab('post')}
              className={`flex-1 py-3 items-center ${activeTab === 'post' ? 'border-b-2 border-purple-500 bg-gray-800' : ''}`}
            >
              <Text className={`font-bold ${activeTab === 'post' ? 'text-purple-400' : 'text-gray-500'}`}>Post FX</Text>
            </Pressable>
          </View>

          <ScrollView className="flex-1 p-4">
            {activeTab === 'sprite' && (
              <View className="mb-6">
                <Text className="text-gray-500 text-xs font-bold uppercase mb-2">Target Entity</Text>
                <View className="flex-row gap-2">
                  {["test-box", "test-circle"].map(id => (
                    <Pressable
                      key={id}
                      onPress={() => setTargetEntity(id)}
                      className={`flex-1 py-2 rounded items-center border ${targetEntity === id ? 'bg-cyan-900/50 border-cyan-500' : 'bg-gray-800 border-gray-700'}`}
                    >
                      <Text className={`text-xs ${targetEntity === id ? 'text-cyan-400' : 'text-gray-400'}`}>{id}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            <View className="mb-6">
              <Text className="text-gray-500 text-xs font-bold uppercase mb-2">Select Effect</Text>
              <View className="flex-row flex-wrap gap-2">
                <Pressable
                  onPress={() => activeTab === 'sprite' ? handleSelectSpriteEffect('none') : handleSelectPostEffect('none')}
                  className={`px-3 py-2 rounded border ${activeEffect === 'none' ? 'bg-gray-700 border-gray-500' : 'bg-gray-800 border-gray-800'}`}
                >
                  <Text className="text-gray-300 text-xs">None</Text>
                </Pressable>
                {(activeTab === 'sprite' ? spriteEffects : postEffects).map(effect => (
                  <Pressable
                    key={effect}
                    onPress={() => activeTab === 'sprite' ? handleSelectSpriteEffect(effect) : handleSelectPostEffect(effect)}
                    className={`px-3 py-2 rounded border ${activeEffect === effect ? (activeTab === 'sprite' ? 'bg-cyan-900/50 border-cyan-500' : 'bg-purple-900/50 border-purple-500') : 'bg-gray-800 border-gray-800'}`}
                  >
                    <Text className={`text-xs ${activeEffect === effect ? 'text-white font-bold' : 'text-gray-400'}`}>
                      {EFFECT_METADATA[effect].displayName}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {activeMetadata && (
              <View>
                <Text className="text-gray-500 text-xs font-bold uppercase mb-4 border-t border-gray-800 pt-4">Parameters</Text>
                {activeMetadata.params.map(param => renderParamControl(param, activeTab === 'post'))}
              </View>
            )}
          </ScrollView>
        </View>

        <View className="flex-1 bg-black">
          {GodotView ? (
            <GodotView style={{ flex: 1 }} />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-white">Loading Godot...</Text>
            </View>
          )}
          
          <View className="absolute bottom-4 right-4 bg-black/50 p-2 rounded">
            <Text className="text-white/50 text-xs">
              {activeTab === 'sprite' ? `Target: ${targetEntity}` : 'Global Post-Process'}
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
