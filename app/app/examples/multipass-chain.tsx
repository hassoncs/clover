import { useCallback, useRef, useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Slider from "@react-native-community/slider";
import type { ExampleMeta } from "@/lib/registry/types";
import type { GodotBridge, NormalizedDrawCommand } from "@/lib/godot/types";
import type { GameDefinition } from "@slopcade/shared";
import { compileGraph } from "@slopcade/shared/effects";
import type { EffectGraphSpec, CompiledPlan } from "@slopcade/shared/effects";

export const metadata: ExampleMeta = {
  title: "Multi-Pass Chain",
  description: "Demonstrates named buffer chaining: Blur → Vignette → Scanlines",
};

const GAME_DEFINITION: GameDefinition = {
  metadata: {
    id: "multipass-chain",
    title: "Multi-Pass Chain",
    description: "Named buffer chain demonstration",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: 50,
    bounds: { width: 24, height: 32 },
  },
  camera: { type: "fixed", zoom: 1 },
  ui: { backgroundColor: "#FFFFFF" },
  templates: {
    canvas: {
      id: "canvas",
      visual: { type: "rect", width: 24, height: 32, color: "#FFFFFF" },
      physics: { bodyType: "static" },
      collider: { shape: "box", width: 24, height: 32, friction: 0, restitution: 0 },
    },
  },
  entities: [
    {
      id: "canvas",
      name: "Canvas",
      template: "canvas",
      transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
    },
  ],
  rules: [],
};

// ---------------------------------------------------------------------------
// Effect Graph Spec with Named Buffers
// ---------------------------------------------------------------------------

function createMultiPassChainSpec(
  blurRadius: number,
  vignetteIntensity: number,
  vignetteRadius: number,
  scanlinesHeight: number,
  scanlinesOpacity: number
): EffectGraphSpec {
  return {
    id: "multipass-chain",
    version: "1.0.0",
    engineApiVersion: "2.0.0",
    scope: "entity",
    externalInputs: [
      { name: "pixelBuffer", dataType: "texture", source: "entity" },
    ],
    nodes: [
      {
        id: "blur",
        type: "blur",
        family: "filter",
        inputSlots: [
          { name: "input", dataType: "texture", connectedTo: null },
        ],
        params: { radius: blurRadius },
        outputTarget: {
          bufferId: "buf-blur",
          format: "rgba8",
          resolution: "full",
        },
        outputs: [{ name: "output", bufferId: "blurred" }],
        flags: { stateful: false, fusible: "conditional" },
      },
      {
        id: "vignette",
        type: "vignette",
        family: "filter",
        inputSlots: [
          { name: "input", dataType: "texture", connectedTo: null },
        ],
        params: { intensity: vignetteIntensity, radius: vignetteRadius },
        outputTarget: {
          bufferId: "buf-vignette",
          format: "rgba8",
          resolution: "full",
        },
        outputs: [{ name: "output", bufferId: "vignetted" }],
        flags: { stateful: false, fusible: "conditional" },
      },
      {
        id: "scanlines",
        type: "scanlines",
        family: "filter",
        inputSlots: [
          { name: "input", dataType: "texture", connectedTo: null },
        ],
        params: { lineHeight: scanlinesHeight, opacity: scanlinesOpacity },
        outputTarget: {
          bufferId: "buf-scanlines",
          format: "rgba8",
          resolution: "full",
        },
        flags: { stateful: false, fusible: "conditional" },
      },
    ],
    connections: [
      { from: { nodeId: "external", output: "pixelBuffer" }, to: { nodeId: "blur", input: "input" } },
      { from: { nodeId: "blur", output: "blurred" }, to: { nodeId: "vignette", input: "input" } },
      { from: { nodeId: "vignette", output: "vignetted" }, to: { nodeId: "scanlines", input: "input" } },
    ],
    feedbackEdges: [],
    lifecycle: { autoStart: false, stopMode: "freeze" },
  };
}

export default function MultiPassChainExample() {
  const [bridge, setBridge] = useState<GodotBridge | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [GodotView, setGodotView] = useState<React.ComponentType<{ style?: object }> | null>(null);
  const [effectActive, setEffectActive] = useState(false);

  // Effect parameters
  const [blurRadius, setBlurRadius] = useState(2.0);
  const [vignetteIntensity, setVignetteIntensity] = useState(0.5);
  const [vignetteRadius, setVignetteRadius] = useState(0.8);
  const [scanlinesHeight, setScanlinesHeight] = useState(4);
  const [scanlinesOpacity, setScanlinesOpacity] = useState(0.3);

  const gameLoadedRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const effectActiveRef = useRef(false);

  effectActiveRef.current = effectActive;

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

        bridge.createPixelBuffer("canvas", 512, 512, "#FFFFFF", 24, 32);
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

  const worldToNormalized = useCallback((wx: number, wy: number) => {
    const entityLeft = -12;
    const entityTop = 16;
    const entityWidth = 24;
    const entityHeight = 32;
    
    const nx = (wx - entityLeft) / entityWidth;
    const ny = (entityTop - wy) / entityHeight;
    
    return { x: Math.max(0, Math.min(1, nx)), y: Math.max(0, Math.min(1, ny)) };
  }, []);

  useEffect(() => {
    if (!bridge || status !== "ready") return;

    const unsubscribe = bridge.onInputEvent((type, x, y) => {
      if (type === "drag_start") {
        lastPointRef.current = { x, y };
      } else if (type === "drag_move") {
        const start = lastPointRef.current;

        if (start) {
          const p1 = worldToNormalized(start.x, start.y);
          const p2 = worldToNormalized(x, y);

          const viewportHeight = 32;
          const normalizedWidth = 3 / viewportHeight;

          const command: NormalizedDrawCommand = {
            type: "line",
            x1: p1.x,
            y1: p1.y,
            x2: p2.x,
            y2: p2.y,
            color: "#000000",
            width: normalizedWidth,
          };

          bridge.drawToActiveBuffer("canvas", [command]);
        }
        lastPointRef.current = { x, y };
      } else if (type === "drag_end") {
        lastPointRef.current = null;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [bridge, status, worldToNormalized]);

  const handleClear = useCallback(async () => {
    if (bridge && status === "ready") {
      try {
        await bridge.stop();
        await bridge.clearGraph();
        bridge.pixelBufferClear("canvas", "#FFFFFF");
        setEffectActive(false);
      } catch (error) {
        console.error("Failed to clear canvas:", error);
      }
    }
  }, [bridge, status]);

  const handleToggleEffect = useCallback(async () => {
    if (!bridge || status !== "ready") return;

    try {
      if (effectActive) {
        await bridge.stop();
        await bridge.clearGraph();
        setEffectActive(false);
      } else {
        const spec = createMultiPassChainSpec(
          blurRadius,
          vignetteIntensity,
          vignetteRadius,
          scanlinesHeight,
          scanlinesOpacity
        );
        const result = compileGraph(spec);

        if (!result.success || !result.plan) {
          const details = result.errors.map((error) => error.message).join(", ");
          throw new Error(`Failed to compile effect graph: ${details}`);
        }

        await bridge.applyGraph(result.plan);
        await bridge.start();
        setEffectActive(true);
      }
    } catch (error) {
      console.error("Failed to toggle effect:", error);
    }
  }, [bridge, status, effectActive, blurRadius, vignetteIntensity, vignetteRadius, scanlinesHeight, scanlinesOpacity]);

  const handleUpdateParams = useCallback(async () => {
    if (!bridge || status !== "ready" || !effectActive) return;

    try {
      await bridge.stop();
      await bridge.clearGraph();

      const spec = createMultiPassChainSpec(
        blurRadius,
        vignetteIntensity,
        vignetteRadius,
        scanlinesHeight,
        scanlinesOpacity
      );
      const result = compileGraph(spec);

      if (!result.success || !result.plan) {
        const details = result.errors.map((error) => error.message).join(", ");
        throw new Error(`Failed to compile effect graph: ${details}`);
      }

      await bridge.applyGraph(result.plan);
      await bridge.start();
    } catch (error) {
      console.error("Failed to update params:", error);
    }
  }, [bridge, status, effectActive, blurRadius, vignetteIntensity, vignetteRadius, scanlinesHeight, scanlinesOpacity]);

  return (
    <View style={styles.container}>
      <View style={styles.canvasContainer}>
        {GodotView && <GodotView style={{ flex: 1 }} />}

        {status === "loading" && (
          <View style={styles.loadingOverlay}>
            <Text>Loading Godot...</Text>
          </View>
        )}
      </View>

      <View style={styles.controlPanel}>
        <Text style={styles.title}>Multi-Pass Chain Demo</Text>
        <Text style={styles.subtitle}>Blur → Vignette → Scanlines</Text>

        <View style={styles.paramSection}>
          <Text style={styles.paramLabel}>Blur Radius: {blurRadius.toFixed(1)}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={5}
            value={blurRadius}
            onValueChange={setBlurRadius}
            onSlidingComplete={handleUpdateParams}
            minimumTrackTintColor="#4c4"
            maximumTrackTintColor="#ddd"
          />
        </View>

        <View style={styles.paramSection}>
          <Text style={styles.paramLabel}>Vignette Intensity: {vignetteIntensity.toFixed(2)}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            value={vignetteIntensity}
            onValueChange={setVignetteIntensity}
            onSlidingComplete={handleUpdateParams}
            minimumTrackTintColor="#4c4"
            maximumTrackTintColor="#ddd"
          />
        </View>

        <View style={styles.paramSection}>
          <Text style={styles.paramLabel}>Vignette Radius: {vignetteRadius.toFixed(2)}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0.1}
            maximumValue={1.5}
            value={vignetteRadius}
            onValueChange={setVignetteRadius}
            onSlidingComplete={handleUpdateParams}
            minimumTrackTintColor="#4c4"
            maximumTrackTintColor="#ddd"
          />
        </View>

        <View style={styles.paramSection}>
          <Text style={styles.paramLabel}>Scanlines Height: {scanlinesHeight.toFixed(0)}</Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={10}
            step={1}
            value={scanlinesHeight}
            onValueChange={setScanlinesHeight}
            onSlidingComplete={handleUpdateParams}
            minimumTrackTintColor="#4c4"
            maximumTrackTintColor="#ddd"
          />
        </View>

        <View style={styles.paramSection}>
          <Text style={styles.paramLabel}>Scanlines Opacity: {scanlinesOpacity.toFixed(2)}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            value={scanlinesOpacity}
            onValueChange={setScanlinesOpacity}
            onSlidingComplete={handleUpdateParams}
            minimumTrackTintColor="#4c4"
            maximumTrackTintColor="#ddd"
          />
        </View>

        <View style={styles.buttonRow}>
          <Pressable
            onPress={handleToggleEffect}
            style={[
              styles.button,
              styles.toggleButton,
              effectActive ? styles.stopButton : styles.startButton,
            ]}
          >
            <Text style={styles.buttonText}>
              {effectActive ? "Stop" : "Start"}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleClear}
            style={[styles.button, styles.clearButton]}
          >
            <Text style={styles.buttonText}>Clear</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e0e0e0",
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
  },
  controlPanel: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#ccc",
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: "#666",
    marginBottom: 12,
  },
  paramSection: {
    marginBottom: 12,
  },
  paramLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleButton: {
    borderWidth: 1,
  },
  startButton: {
    backgroundColor: "#4c4",
    borderColor: "#393",
  },
  stopButton: {
    backgroundColor: "#d44",
    borderColor: "#a22",
  },
  clearButton: {
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#ccc",
  },
  buttonText: {
    fontWeight: "bold",
    color: "#fff",
  },
});
