import { useCallback, useState, useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { ExampleMeta } from "@/lib/registry/types";
import type { GodotBridge } from "@/lib/godot/types";
import type { GameDefinition } from "@slopcade/shared";
import { TextureButton } from "@slopcade/ui";
import { FullScreenHeader } from "../../components/FullScreenHeader";

export const metadata: ExampleMeta = {
  title: "Texture Button",
  description:
    "Demonstrates TextureButton with normal/pressed images on both React Native and Godot.",
};

const WORLD_BOUNDS = { width: 16, height: 8 };
const PIXELS_PER_METER = 50;

const RN_NORMAL_IMAGE = "https://placehold.co/200x80/4CAF50/white?text=NORMAL";
const RN_PRESSED_IMAGE =
  "https://placehold.co/200x80/2E7D32/white?text=PRESSED";

const GODOT_NORMAL_COLOR = "#4CAF50";
const GODOT_PRESSED_COLOR = "#FF7D32";

const GAME_DEFINITION: GameDefinition = {
  metadata: {
    id: "texture-button-demo",
    title: "Texture Button Demo",
    description: "Demonstrates TextureButton implementations",
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

export default function TextureButtonExample() {
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
  const unsubRef = useRef<(() => void) | null>(null);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[TextureButton] ${message}`);
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

    addLog("Initializing bridge...");
    bridge
      .initialize()
      .then(() => {
        if (!mounted) return;
        addLog("Bridge initialized!");

        addLog("Loading game...");
        return bridge.loadGame(GAME_DEFINITION);
      })
      .then(() => {
        if (!mounted) return;
        addLog("Game loaded!");

        unsubRef.current = bridge.onUIButtonEvent((eventType, buttonId) => {
          addLog(`[Godot] ${eventType}: ${buttonId}`);
        });

        bridge.createUIButton(
          "godot-btn-1",
          GODOT_NORMAL_COLOR,
          GODOT_PRESSED_COLOR,
          50,
          40,
          200,
          60,
        );
        addLog("Created Godot UI button at (50, 40) size 200x60");

        setStatus("ready");
      })
      .catch((err) => {
        if (!mounted) return;
        setStatus("error");
        setErrorMsg(
          err instanceof Error ? err.message : "Failed to initialize",
        );
      });

    return () => {
      mounted = false;
      unsubRef.current?.();
      bridge.destroyUIButton("godot-btn-1");
    };
  }, [bridge, GodotView, addLog]);

  const handleRNPressIn = useCallback(() => {
    addLog("[React Native] onPressIn");
  }, [addLog]);

  const handleRNPressOut = useCallback(() => {
    addLog("[React Native] onPressOut");
  }, [addLog]);

  const handleRNPress = useCallback(() => {
    addLog("[React Native] onPress");
  }, [addLog]);

  if (status === "error") {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Error: {errorMsg}</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FullScreenHeader
        title="Texture Button Demo"
      />

      <View style={styles.content}>
        <View style={styles.demoSection}>
          <Text style={styles.sectionTitle}>React Native TextureButton</Text>
          <Text style={styles.sectionDesc}>Renders in RN layer (overlay)</Text>
          <View style={styles.buttonContainer}>
            <TextureButton
              normalImage={{ uri: RN_NORMAL_IMAGE }}
              pressedImage={{ uri: RN_PRESSED_IMAGE }}
              width={200}
              height={80}
              onPressIn={handleRNPressIn}
              onPressOut={handleRNPressOut}
              onPress={handleRNPress}
            />
          </View>
        </View>

        <View style={styles.demoSection}>
          <Text style={styles.sectionTitle}>Godot TextureButton</Text>
          <Text style={styles.sectionDesc}>
            Renders in Godot canvas (below)
          </Text>
          <View style={styles.godotContainer}>
            {GodotView ? (
              <GodotView style={styles.godotView} />
            ) : (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading Godot...</Text>
              </View>
            )}
            {status === "loading" && GodotView && (
              <View style={styles.loadingOverlay} pointerEvents="none">
                <Text style={styles.loadingText}>Initializing...</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.logSection}>
          <Text style={styles.logTitle}>Event Log:</Text>
          <View style={styles.logContainer}>
            {logs.map((log, index) => (
              <Text key={`${index}-${log}`} style={styles.logText}>
                {log}
              </Text>
            ))}
            {logs.length === 0 && (
              <Text style={styles.logPlaceholder}>
                Press buttons to see events...
              </Text>
            )}
          </View>
        </View>
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
    padding: 16,
  },
  demoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  sectionDesc: {
    color: "#888",
    fontSize: 12,
    marginBottom: 12,
  },
  buttonContainer: {
    alignItems: "center",
    padding: 16,
    backgroundColor: "#2a2a4e",
    borderRadius: 8,
  },
  godotContainer: {
    height: 150,
    backgroundColor: "#000",
    borderRadius: 8,
    overflow: "hidden",
  },
  godotView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  loadingText: {
    color: "#888",
    fontSize: 14,
  },
  logSection: {
    flex: 1,
  },
  logTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  logContainer: {
    flex: 1,
    backgroundColor: "#0a0a1e",
    borderRadius: 8,
    padding: 12,
  },
  logText: {
    color: "#0f0",
    fontSize: 11,
    fontFamily: "monospace",
    marginBottom: 2,
  },
  logPlaceholder: {
    color: "#444",
    fontSize: 12,
    fontStyle: "italic",
  },
  errorText: {
    color: "#f66",
    fontSize: 16,
    textAlign: "center",
    margin: 20,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#333",
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 14,
  },
});
