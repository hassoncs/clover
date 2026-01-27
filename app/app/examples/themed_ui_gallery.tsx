import { useCallback, useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { ExampleMeta } from "@/lib/registry/types";
import type { GodotBridge } from "@/lib/godot/types";
import { FullScreenHeader } from "../../components/FullScreenHeader";

export const metadata: ExampleMeta = {
  title: "Themed UI Gallery",
  description:
    "Complete showcase of all 7 AI-generated themed UI controls: Button, CheckBox, Panel, ProgressBar, ScrollBar H/V, TabBar with medieval fantasy theme.",
};

const ASSET_BASE = "http://localhost:8789/assets/generated/ui-cli";

const UI_CONTROLS = [
  { id: "button", type: 0, name: "Button", path: "button/button", width: 200, height: 60 },
  { id: "checkbox", type: 1, name: "CheckBox", path: "checkbox/checkbox", width: 200, height: 60 },
  { id: "panel", type: 2, name: "Panel", path: "panel/panel", width: 300, height: 200 },
  { id: "progress_bar", type: 3, name: "ProgressBar", path: "progress_bar/progress_bar", width: 300, height: 40 },
  { id: "scroll_bar_h", type: 4, name: "ScrollBar H", path: "scroll_bar_h/scroll_bar_h", width: 300, height: 24 },
  { id: "scroll_bar_v", type: 5, name: "ScrollBar V", path: "scroll_bar_v/scroll_bar_v", width: 24, height: 200 },
  { id: "tab_bar", type: 6, name: "TabBar", path: "tab_bar/tab_bar", width: 400, height: 50 },
] as const;

export default function ThemedUIGalleryExample() {
  const router = useRouter();
  const [bridge, setBridge] = useState<GodotBridge | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [GodotView, setGodotView] = useState<React.ComponentType<{ style?: object }> | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const sceneLoadedRef = useRef(false);
  const controlsCreatedRef = useRef(false);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[ThemedUIGallery] ${message}`);
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
        setErrorMsg(err instanceof Error ? err.message : "Failed to load Godot module");
        addLog(`Error: ${errorMsg}`);
      });

    return () => {
      mounted = false;
    };
  }, [addLog, errorMsg]);

  useEffect(() => {
    if (!bridge || !GodotView || sceneLoadedRef.current) return;

    const timeoutId = setTimeout(() => {
      if (sceneLoadedRef.current) return;

      addLog("Initializing Godot bridge...");
      bridge.initialize().then(() => {
        addLog("Bridge initialized");
        sceneLoadedRef.current = true;
        setStatus("ready");
      }).catch((err) => {
        addLog(`Init error: ${err.message}`);
        setStatus("error");
        setErrorMsg(err.message);
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [bridge, GodotView, addLog]);

  useEffect(() => {
    if (!bridge || status !== "ready" || controlsCreatedRef.current) return;

    addLog("Creating themed UI controls...");
    
    let yOffset = 50;
    const xBase = 50;
    const spacing = 30;

    UI_CONTROLS.forEach((control, idx) => {
      const metadataUrl = `${ASSET_BASE}/${control.path}/metadata.json`;
      const xPos = control.id === 'scroll_bar_v' ? xBase + 350 : xBase;
      
      addLog(`Creating ${control.name}...`);
      
      bridge.createThemedUIComponent(
        control.id,
        control.type,
        metadataUrl,
        xPos,
        yOffset,
        control.width,
        control.height,
        control.name
      );

      if (control.id === 'scroll_bar_v') {
        yOffset -= control.height;
      }
      
      yOffset += control.height + spacing;
    });

    addLog(`All ${UI_CONTROLS.length} controls created!`);
    controlsCreatedRef.current = true;
  }, [bridge, status, addLog]);

  if (status === "error") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorMessage}>{errorMsg}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!GodotView) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading Godot...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FullScreenHeader title="Themed UI Gallery" />

      <View style={styles.godotContainer}>
        <GodotView style={styles.godot} />
      </View>

      <ScrollView style={styles.logsContainer} contentContainerStyle={styles.logsContent}>
        <Text style={styles.logsTitle}>Generation Log:</Text>
        {logs.map((log) => (
          <Text key={`${log}-${Math.random()}`} style={styles.logText}>
            {log}
          </Text>
        ))}
      </ScrollView>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          🏰 Medieval Fantasy Theme - All 7 Controls
        </Text>
        <Text style={styles.infoText}>
          • Button (4 states: normal, hover, pressed, disabled)
        </Text>
        <Text style={styles.infoText}>
          • CheckBox (4 states: normal, hover, pressed, disabled)
        </Text>
        <Text style={styles.infoText}>
          • Panel (1 state: hollow frame)
        </Text>
        <Text style={styles.infoText}>
          • ProgressBar (2 states: normal, disabled)
        </Text>
        <Text style={styles.infoText}>
          • ScrollBar H/V (3 states: normal, hover, pressed)
        </Text>
        <Text style={styles.infoText}>
          • TabBar (3 states: unselected, selected, hover)
        </Text>
        <Text style={styles.infoText}>
          ✨ All assets AI-generated with nine-patch scaling
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0f",
  },
  godotContainer: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    margin: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  godot: {
    flex: 1,
  },
  logsContainer: {
    maxHeight: 180,
    backgroundColor: "#16213e",
  },
  logsContent: {
    padding: 16,
  },
  logsTitle: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  logText: {
    color: "#64748b",
    fontSize: 11,
    fontFamily: "monospace",
    lineHeight: 16,
  },
  infoContainer: {
    padding: 16,
    backgroundColor: "#0f172a",
    gap: 6,
  },
  infoText: {
    color: "#94a3b8",
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#e0e0e0",
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorTitle: {
    color: "#ef4444",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  errorMessage: {
    color: "#e0e0e0",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
  },
});
