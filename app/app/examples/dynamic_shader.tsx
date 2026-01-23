import { useCallback, useRef, useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import type { ExampleMeta } from "@/lib/registry/types";
import type { GodotBridge, DynamicShaderResult } from "@/lib/godot/types";
import type { GameDefinition } from "@slopcade/shared";

export const metadata: ExampleMeta = {
  title: "Dynamic Shader",
  description: "Test AI-generated shaders from JavaScript strings with error reporting",
};

const WORLD_BOUNDS = { width: 10, height: 10 };
const PIXELS_PER_METER = 50;

const GAME_DEFINITION: GameDefinition = {
  metadata: {
    id: "dynamic-shader-test",
    title: "Dynamic Shader Test",
    description: "Test dynamic shader generation",
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

const VALID_SHADER = `shader_type canvas_item;

uniform vec4 color_shift : source_color = vec4(1.0, 0.5, 0.0, 1.0);
uniform float intensity : hint_range(0.0, 1.0) = 0.5;

void fragment() {
    vec4 tex = texture(TEXTURE, UV);
    COLOR = mix(tex, color_shift * tex.a, intensity);
}`;

const INVALID_SHADER_MISSING_TYPE = `uniform vec4 color : source_color = vec4(1.0, 0.0, 0.0, 1.0);

void fragment() {
    COLOR = color;
}`;

const INVALID_SHADER_MISSING_FRAGMENT = `shader_type canvas_item;

uniform vec4 color : source_color = vec4(1.0, 0.0, 0.0, 1.0);
`;

const INVALID_SHADER_SYNTAX_ERROR = `shader_type canvas_item;

void fragment() {
    COLOR = vec4(1.0 0.0, 0.0, 1.0); // Missing comma
}`;

const PRESET_SHADERS = [
  { name: "Valid: Color Shift", code: VALID_SHADER, valid: true },
  { name: "Invalid: Missing shader_type", code: INVALID_SHADER_MISSING_TYPE, valid: false },
  { name: "Invalid: Missing fragment()", code: INVALID_SHADER_MISSING_FRAGMENT, valid: false },
  { name: "Invalid: Syntax Error", code: INVALID_SHADER_SYNTAX_ERROR, valid: false },
];

export default function DynamicShaderExample() {
  const [bridge, setBridge] = useState<GodotBridge | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [GodotView, setGodotView] = useState<React.ComponentType<{ style?: object }> | null>(null);
  const [shaderCode, setShaderCode] = useState(VALID_SHADER);
  const [lastResult, setLastResult] = useState<DynamicShaderResult | null>(null);
  const [appliedShaderId, setAppliedShaderId] = useState<string | null>(null);
  const gameLoadedRef = useRef(false);
  const shaderCountRef = useRef(0);

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
      console.error("Failed to load Godot module:", err);
    });
    
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!bridge || gameLoadedRef.current) return;
    
    const initGame = async () => {
      try {
        await bridge.initialize();
        await bridge.loadGame(GAME_DEFINITION);
        gameLoadedRef.current = true;
        setStatus("ready");
      } catch (err) {
        setStatus("error");
        console.error("Failed to init game:", err);
      }
    };
    
    initGame();
    
    return () => {
      bridge.dispose();
    };
  }, [bridge]);

  const handleCompileAndApply = useCallback(async () => {
    if (!bridge || status !== "ready") return;
    
    shaderCountRef.current += 1;
    const shaderId = `dynamic_shader_${shaderCountRef.current}`;
    
    console.log(`[DynamicShader] Compiling shader: ${shaderId}`);
    const result = await bridge.createDynamicShader(shaderId, shaderCode);
    console.log(`[DynamicShader] Result:`, result);
    setLastResult(result);
    
    if (result.success) {
      bridge.applyDynamicShader("test-entity", shaderId, {
        color_shift: [1, 0.5, 0, 1],
        intensity: 0.5,
      });
      setAppliedShaderId(shaderId);
    } else {
      setAppliedShaderId(null);
    }
  }, [bridge, status, shaderCode]);

  const handleClearEffect = useCallback(() => {
    if (!bridge || status !== "ready") return;
    bridge.clearSpriteEffect("test-entity");
    setAppliedShaderId(null);
    setLastResult(null);
  }, [bridge, status]);

  const handleSelectPreset = useCallback((preset: typeof PRESET_SHADERS[number]) => {
    setShaderCode(preset.code);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#0f0f23" }}>
      <Text style={{ color: "#fff", fontSize: 20, fontWeight: "bold", padding: 12 }}>
        examples/dynamic_shader
      </Text>
      
      <View style={{ flex: 1, flexDirection: "row" }}>
        <View style={{ flex: 1, padding: 8 }}>
          <View style={{ backgroundColor: "#1a1a2e", borderRadius: 8, padding: 8, marginBottom: 8 }}>
            <Text style={{ color: "#aaa", fontSize: 12 }}>Status: {status.toUpperCase()}</Text>
            {appliedShaderId && (
              <Text style={{ color: "#4ECDC4", fontSize: 12 }}>Applied: {appliedShaderId}</Text>
            )}
          </View>
          
          {lastResult && (
            <View style={{ 
              backgroundColor: lastResult.success ? "#1a4a1a" : "#4a1a1a", 
              borderRadius: 8, 
              padding: 8, 
              marginBottom: 8 
            }}>
              <Text style={{ color: lastResult.success ? "#4f4" : "#f44", fontWeight: "bold" }}>
                {lastResult.success ? "✓ Shader compiled successfully" : "✗ Shader compilation failed"}
              </Text>
              {lastResult.error && (
                <Text style={{ color: "#faa", fontSize: 12, marginTop: 4 }}>
                  Error: {lastResult.error}
                </Text>
              )}
            </View>
          )}
          
          {GodotView && (
            <View style={{ flex: 1, borderRadius: 8, overflow: "hidden" }}>
              <GodotView style={{ flex: 1 }} />
            </View>
          )}
        </View>
        
        <View style={{ width: 350, padding: 8 }}>
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "bold", marginBottom: 8 }}>
            Shader Presets
          </Text>
          
          <ScrollView style={{ maxHeight: 100, marginBottom: 8 }}>
            {PRESET_SHADERS.map((preset) => (
              <Pressable
                key={preset.name}
                onPress={() => handleSelectPreset(preset)}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? "#333" : "#222",
                  padding: 8,
                  borderRadius: 4,
                  marginBottom: 4,
                  borderLeftWidth: 3,
                  borderLeftColor: preset.valid ? "#4f4" : "#f44",
                })}
              >
                <Text style={{ color: "#fff", fontSize: 12 }}>{preset.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "bold", marginBottom: 8 }}>
            Shader Code
          </Text>
          
          <TextInput
            value={shaderCode}
            onChangeText={setShaderCode}
            multiline
            style={{
              flex: 1,
              backgroundColor: "#1a1a2e",
              color: "#fff",
              fontFamily: "monospace",
              fontSize: 11,
              padding: 8,
              borderRadius: 8,
              textAlignVertical: "top",
            }}
          />
          
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <Pressable
              onPress={handleCompileAndApply}
              disabled={status !== "ready"}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: pressed ? "#3a8" : "#4ECDC4",
                padding: 12,
                borderRadius: 8,
                alignItems: "center",
                opacity: status === "ready" ? 1 : 0.5,
              })}
            >
              <Text style={{ color: "#000", fontWeight: "bold" }}>Compile & Apply</Text>
            </Pressable>
            
            <Pressable
              onPress={handleClearEffect}
              disabled={status !== "ready"}
              style={({ pressed }) => ({
                backgroundColor: pressed ? "#555" : "#666",
                padding: 12,
                borderRadius: 8,
                alignItems: "center",
                opacity: status === "ready" ? 1 : 0.5,
              })}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Clear</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
