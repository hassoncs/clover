import { useCallback, useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { ExampleMeta } from "@/lib/registry/types";
import type { GodotBridge } from "@/lib/godot/types";
import { FullScreenHeader } from "../../components/FullScreenHeader";

export const metadata: ExampleMeta = {
  title: "Themed UI Components",
  description:
    "AI-generated themed buttons and checkboxes with nine-patch scaling and state management in Godot.",
};

export default function UIComponentsExample() {
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
  const sceneLoadedRef = useRef(false);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[UIComponents] ${message}`);
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

      addLog("Godot initialized - scene should load automatically");
      sceneLoadedRef.current = true;
      setStatus("ready");
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [bridge, GodotView, addLog]);

  if (status === "error") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorMessage}>{errorMsg}</Text>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back to Examples</Text>
          </Pressable>
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
      <FullScreenHeader
        title="Themed UI Components"
      />

      <View style={styles.godotContainer}>
        <GodotView style={styles.godot} />
      </View>

      <View style={styles.logsContainer}>
        <Text style={styles.logsTitle}>Status:</Text>
        {logs.map((log) => (
          <Text key={`${log}-${Math.random()}`} style={styles.logText}>
            {log}
          </Text>
        ))}
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          ✨ Cyberpunk-themed UI components generated with AI
        </Text>
        <Text style={styles.infoText}>
          • Click checkboxes to toggle state
        </Text>
        <Text style={styles.infoText}>
          • Press buttons to see pressed state
        </Text>
        <Text style={styles.infoText}>
          • Hover effects on both (web/desktop only)
        </Text>
        <Text style={styles.infoText}>
          • Nine-patch backgrounds scale perfectly
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
    padding: 16,
    backgroundColor: "#16213e",
    maxHeight: 150,
  },
  logsTitle: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  logText: {
    color: "#64748b",
    fontSize: 12,
    fontFamily: "monospace",
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
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#374151",
    borderRadius: 8,
  },
  backButtonText: {
    color: "#60a5fa",
    fontSize: 16,
    fontWeight: "600",
  },
});
