import { useCallback, useRef, useState, useEffect } from "react";
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet } from "react-native";
import type { ExampleMeta } from "@/lib/registry/types";
import type { GodotBridge } from "@/lib/godot/types";
import type { GameDefinition } from "@slopcade/shared";

export const metadata: ExampleMeta = {
  title: "Shader Live Edit",
  description: "Edit GLSL shaders in real-time with hot-swapping",
};

const GAME_DEFINITION: GameDefinition = {
  metadata: {
    id: "shader-live-edit",
    title: "Shader Live Edit",
    description: "Live shader editing demo",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: 50,
    bounds: { width: 12, height: 16 },
  },
  camera: { type: "fixed", zoom: 1 },
  ui: { backgroundColor: "#1a1a2e" },
  templates: {
    box: {
      id: "box",
      visual: { type: "rect", width: 4, height: 4, color: "#ff6b6b" },
      physics: { bodyType: "static" },
      collider: { shape: "box", width: 4, height: 4, friction: 0, restitution: 0 },
    },
  },
  entities: [
    {
      id: "box1",
      name: "Box",
      template: "box",
      transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
    },
  ],
  rules: [],
};

const DEFAULT_SHADER = `shader_type canvas_item;

uniform float tint_strength : hint_range(0.0, 1.0) = 0.5;
uniform vec3 tint_color : source_color = vec3(1.0, 0.5, 0.0);

void fragment() {
    vec4 tex = texture(TEXTURE, UV);
    vec3 tinted = mix(tex.rgb, tint_color, tint_strength);
    COLOR = vec4(tinted, tex.a);
}`;

export default function ShaderLiveEditExample() {
  const [bridge, setBridge] = useState<GodotBridge | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [GodotView, setGodotView] = useState<React.ComponentType<{ style?: object }> | null>(null);
  const [shaderCode, setShaderCode] = useState(DEFAULT_SHADER);
  const [error, setError] = useState<string | null>(null);
  const [shaderApplied, setShaderApplied] = useState(false);

  const gameLoadedRef = useRef(false);

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

  const handleApplyShader = useCallback(async () => {
    if (!bridge || status !== "ready") return;

    setError(null);

    try {
      bridge.applySpriteEffect("box1", "custom", { shader: shaderCode });
      setShaderApplied(true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      console.error("Failed to apply shader:", err);
    }
  }, [bridge, status, shaderCode]);

  const handleClearShader = useCallback(() => {
    if (!bridge || status !== "ready") return;

    try {
      bridge.clearSpriteEffect("box1");
      setShaderApplied(false);
      setError(null);
    } catch (err) {
      console.error("Failed to clear shader:", err);
    }
  }, [bridge, status]);

  const handleReset = useCallback(() => {
    setShaderCode(DEFAULT_SHADER);
    setError(null);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.canvasContainer}>
        {GodotView && <GodotView style={{ flex: 1 }} />}

        {status === "loading" && (
          <View style={styles.loadingOverlay}>
            <Text style={styles.loadingText}>Loading Godot...</Text>
          </View>
        )}
      </View>

      <View style={styles.controlPanel}>
        <Text style={styles.title}>Shader Live Edit</Text>
        <Text style={styles.subtitle}>Edit GLSL and apply in real-time</Text>

        <ScrollView style={styles.editorContainer} nestedScrollEnabled>
          <TextInput
            style={styles.editor}
            value={shaderCode}
            onChangeText={setShaderCode}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            placeholder="Enter GLSL shader code..."
            placeholderTextColor="#666"
          />
        </ScrollView>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.buttonRow}>
          <Pressable
            onPress={handleApplyShader}
            style={[styles.button, styles.applyButton]}
          >
            <Text style={styles.buttonText}>Apply Shader</Text>
          </Pressable>

          {shaderApplied && (
            <Pressable
              onPress={handleClearShader}
              style={[styles.button, styles.clearButton]}
            >
              <Text style={styles.buttonText}>Clear</Text>
            </Pressable>
          )}

          <Pressable
            onPress={handleReset}
            style={[styles.button, styles.resetButton]}
          >
            <Text style={styles.buttonText}>Reset</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  canvasContainer: {
    flex: 1,
    flexShrink: 1,
  },
  loadingOverlay: {
    position: "absolute",
    inset: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
  },
  controlPanel: {
    backgroundColor: "#2a2a3e",
    borderTopWidth: 1,
    borderTopColor: "#444",
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    maxHeight: "50%",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: "#aaa",
    marginBottom: 12,
  },
  editorContainer: {
    backgroundColor: "#1e1e2e",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#444",
    maxHeight: 200,
    marginBottom: 12,
  },
  editor: {
    fontFamily: "monospace",
    fontSize: 12,
    color: "#f8f8f2",
    padding: 12,
    minHeight: 150,
  },
  errorContainer: {
    backgroundColor: "#d44",
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
  },
  errorText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "monospace",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  applyButton: {
    backgroundColor: "#4c4",
    borderWidth: 1,
    borderColor: "#393",
  },
  clearButton: {
    backgroundColor: "#d44",
    borderWidth: 1,
    borderColor: "#a22",
  },
  resetButton: {
    backgroundColor: "#666",
    borderWidth: 1,
    borderColor: "#444",
  },
  buttonText: {
    fontWeight: "bold",
    color: "#fff",
    fontSize: 14,
  },
});
