import { useCallback, useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, StyleSheet, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ExampleMeta } from "@/lib/registry/types";
import type { GodotBridge } from "@/lib/godot/types";
import type { GameDefinition } from "@slopcade/shared";
import { TextureButton } from "@slopcade/ui";
import { FullScreenHeader } from "../../components/FullScreenHeader";

export const metadata: ExampleMeta = {
  title: "UI Texture System",
  description:
    "AI-generated tileable textures with dynamic styling (rounded corners, shadows, bevels). Demonstrates texture-based UI approach.",
};

const WORLD_BOUNDS = { width: 16, height: 10 };
const PIXELS_PER_METER = 50;

// Generated AI textures - seamless tileable materials
const TEXTURES = {
  paintedMetal: require("./ui_textures/arcade_painted_metal_v1.png"),
  wornMetal: require("./ui_textures/arcade_painted_metal_v2.png"),
  aluminum: require("./ui_textures/arcade_brushed_aluminum_v1.png"),
  neonBlue: require("./ui_textures/arcade_neon_plastic_v1.png"),
  neonPink: require("./ui_textures/arcade_neon_plastic_v2.png"),
};

const GAME_DEFINITION: GameDefinition = {
  metadata: {
    id: "ui-texture-demo",
    title: "UI Texture System Demo",
    description: "AI-generated textures with dynamic shader styling",
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
    showScore: false,
  },
  templates: {},
  entities: [],
  rules: [],
};

export default function UITextureDemo() {
  const router = useRouter();
  const [bridge, setBridge] = useState<GodotBridge | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [GodotView, setGodotView] = useState<React.ComponentType<{
    style?: object;
  }> | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [pressedButton, setPressedButton] = useState<string | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[UITexture] ${message}`);
    setLogs((prev) => [...prev.slice(-9), `${timestamp}: ${message}`]);
  }, []);

  useEffect(() => {
    let mounted = true;

    addLog("Loading Godot module...");

    import("@/lib/godot")
      .then(async (mod) => {
        if (!mounted) return;

        addLog("Creating bridge...");
        const newBridge = await mod.createGodotBridge();

        if (!mounted) return;
        setBridge(newBridge);
        setGodotView(() => mod.GodotView);
        addLog("GodotView ready");
      })
      .catch((err) => {
        if (!mounted) return;
        setStatus("error");
        setErrorMsg(
          err instanceof Error ? err.message : "Failed to load Godot module",
        );
      });

    return () => {
      mounted = false;
    };
  }, [addLog]);

  useEffect(() => {
    if (!bridge || !GodotView) return;

    let mounted = true;

    const initGame = async () => {
      try {
        addLog("Initializing bridge...");
        await bridge.initialize();
        if (!mounted) return;

        addLog("Loading game definition...");
        await bridge.loadGame(GAME_DEFINITION);
        if (!mounted) return;

        addLog("Subscribing to events...");
        // Note: onUIButtonEvent is available if using Godot UI buttons
        // For this demo, we just track React Native button events
        
        if (mounted) {
          setStatus("ready");
          addLog("Ready!");
        }
      } catch (err) {
        if (!mounted) return;
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "Init failed");
      }
    };

    initGame();

    return () => {
      mounted = false;
      if (unsubRef.current) {
        unsubRef.current();
      }
    };
  }, [bridge, GodotView, addLog]);

  // Button configurations with different styles
  const buttons = [
    {
      id: "metal1",
      label: "Painted Metal",
      texture: TEXTURES.paintedMetal,
      style: {
        cornerRadius: 24,
        shadowOffset: { x: 0, y: 6 },
        shadowSize: 12,
        borderSize: 3,
        bevelStrength: 0.3,
      },
    },
    {
      id: "metal2",
      label: "Worn Metal",
      texture: TEXTURES.wornMetal,
      style: {
        cornerRadius: 20,
        shadowOffset: { x: 0, y: 4 },
        shadowSize: 10,
        borderSize: 2,
        bevelStrength: 0.25,
      },
    },
    {
      id: "aluminum",
      label: "Brushed Aluminum",
      texture: TEXTURES.aluminum,
      style: {
        cornerRadius: 12,
        shadowOffset: { x: 0, y: 8 },
        shadowSize: 15,
        borderSize: 2,
        bevelStrength: 0.35,
      },
    },
    {
      id: "plastic1",
      label: "Neon Blue",
      texture: TEXTURES.neonBlue,
      style: {
        cornerRadius: 30,
        shadowOffset: { x: 0, y: 5 },
        shadowSize: 20,
        borderSize: 4,
        bevelStrength: 0.2,
      },
    },
    {
      id: "plastic2",
      label: "Neon Pink",
      texture: TEXTURES.neonPink,
      style: {
        cornerRadius: 30,
        shadowOffset: { x: 0, y: 5 },
        shadowSize: 20,
        borderSize: 4,
        bevelStrength: 0.2,
      },
    },
  ];

  if (status === "error") {
    return (
      <SafeAreaView style={styles.container}>
        <FullScreenHeader title="UI Texture System" />
        <View style={styles.center}>
          <Text style={styles.errorText}>Error: {errorMsg}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FullScreenHeader title="UI Texture System" />

      <View style={styles.content}>
        {/* Godot View */}
        <View style={styles.godotContainer}>
          {GodotView && (
            <GodotView
              style={[
                styles.godotView,
                status !== "ready" && styles.godotViewHidden,
              ]}
            />
          )}
          {status !== "ready" && (
            <View style={styles.loadingOverlay}>
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          )}
        </View>

        {/* UI Demo Panel */}
        <ScrollView style={styles.demoPanel}>
          <Text style={styles.title}>AI-Generated Textures + Dynamic Styling</Text>
          <Text style={styles.subtitle}>
            Each button uses a different seamless tileable texture
          </Text>

          {/* Styled Buttons */}
          <View style={styles.buttonList}>
            {buttons.map((btn, index) => (
              <View key={btn.id} style={{ marginVertical: 8, alignItems: 'center' }}>
                <TextureButton
                  normalImage={btn.texture}
                  pressedImage={btn.texture}
                  width={280}
                  height={60}
                  onPressIn={() => {
                    setPressedButton(btn.id);
                    addLog(`Pressed: ${btn.label}`);
                  }}
                  onPressOut={() => setPressedButton(null)}
                  onPress={() => addLog(`Clicked: ${btn.label}`)}
                  style={{
                    borderRadius: btn.style.cornerRadius,
                    shadowColor: "#000",
                    shadowOffset: { width: btn.style.shadowOffset.x, height: btn.style.shadowOffset.y },
                    shadowOpacity: 0.4,
                    shadowRadius: btn.style.shadowSize / 2,
                    elevation: 5,
                  }}
                />
                <Text style={{
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: "bold",
                  marginTop: 4,
                  textShadowColor: "rgba(0,0,0,0.5)",
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2,
                }}>
                  {btn.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Info Panel */}
          <View style={styles.infoPanel}>
            <Text style={styles.infoTitle}>How It Works</Text>
            <Text style={styles.infoText}>
              1. Generate seamless tileable textures via AI{"\n"}
              2. Apply dynamic styling (rounded corners, shadows, bevels){"\n"}
              3. State changes handled via tint + bevel direction{"\n"}
              4. Text rendered separately for perfect placement
            </Text>
          </View>

          {/* Logs */}
          <View style={styles.logsPanel}>
            <Text style={styles.logsTitle}>Event Log</Text>
            {logs.map((log, i) => (
              <Text key={i} style={styles.logLine}>
                {log}
              </Text>
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  content: {
    flex: 1,
    flexDirection: "row",
  },
  godotContainer: {
    flex: 1,
    position: "relative",
  },
  godotView: {
    flex: 1,
  },
  godotViewHidden: {
    opacity: 0,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#1a1a2e",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#0ff",
    fontSize: 18,
  },
  demoPanel: {
    width: 320,
    backgroundColor: "#252540",
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0ff",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: "#888",
    marginBottom: 16,
  },
  buttonList: {
    alignItems: "center",
    marginBottom: 16,
  },
  infoPanel: {
    backgroundColor: "#1a1a2e",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0ff",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 11,
    color: "#aaa",
    lineHeight: 16,
  },
  logsPanel: {
    backgroundColor: "#1a1a2e",
    padding: 12,
    borderRadius: 8,
    maxHeight: 150,
  },
  logsTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0ff",
    marginBottom: 8,
  },
  logLine: {
    fontSize: 10,
    color: "#888",
    fontFamily: "monospace",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#f44",
    fontSize: 16,
  },
});
