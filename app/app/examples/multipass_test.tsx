import { useCallback, useRef, useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import type { ExampleMeta } from "@/lib/registry/types";
import type { GodotBridge, DrawCommand } from "@/lib/godot/types";
import type { GameDefinition, MultiPassEffectSpec } from "@slopcade/shared";

export const metadata: ExampleMeta = {
  title: "MultiPass Test",
  description: "Progressive test suite for the multi-pass effect system",
};

const GAME_DEFINITION: GameDefinition = {
  metadata: {
    id: "multipass-test",
    title: "MultiPass Test",
    description: "Test multi-pass effects",
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
// Shaders
// ---------------------------------------------------------------------------

const RED_FILL_SHADER = `
shader_type canvas_item;
uniform vec2 texel_size;
uniform float dt;
void fragment() {
    COLOR = vec4(1.0, 0.0, 0.0, 1.0);
}
`.trim();

const COPY_SHADER = `
shader_type canvas_item;
uniform sampler2D src;
uniform vec2 texel_size;
uniform float dt;
void fragment() {
    COLOR = texture(src, UV);
}
`.trim();

const TINT_SHADER = `
shader_type canvas_item;
uniform sampler2D src;
uniform vec2 texel_size;
uniform float dt;
void fragment() {
    COLOR = texture(src, UV) * vec4(1.0, 0.5, 0.5, 1.0);
}
`.trim();

const BLUR_SHADER = `
shader_type canvas_item;
uniform sampler2D current_buffer;
uniform vec2 texel_size;
uniform float dt;
void fragment() {
    vec4 c = texture(current_buffer, UV);
    vec4 l = texture(current_buffer, UV + vec2(-texel_size.x, 0.0));
    vec4 r = texture(current_buffer, UV + vec2(texel_size.x, 0.0));
    vec4 u = texture(current_buffer, UV + vec2(0.0, -texel_size.y));
    vec4 d = texture(current_buffer, UV + vec2(0.0, texel_size.y));
    COLOR = c * 0.5 + l * 0.125 + r * 0.125 + u * 0.125 + d * 0.125;
}
`.trim();

const DOT_SHADER = `
shader_type canvas_item;
uniform sampler2D current_buffer;
uniform vec2 texel_size;
uniform float dt;
uniform vec2 dot_pos;
uniform vec4 dot_color;
void fragment() {
    vec4 prev = texture(current_buffer, UV);
    float dist = length(UV - dot_pos);
    float spot = smoothstep(0.02, 0.005, dist);
    COLOR = mix(prev, dot_color, spot);
}
`.trim();

// ---------------------------------------------------------------------------
// Test Specs
// ---------------------------------------------------------------------------

interface TestCase {
  label: string;
  description: string;
  expect: string;
  spec: MultiPassEffectSpec;
  needsDraw: boolean;
  needsInput: boolean;
}

const TESTS: TestCase[] = [
  {
    label: "T1: Fill",
    description: "Solid red fill — tests basic viewport display",
    expect: "Solid red rectangle",
    needsDraw: false,
    needsInput: false,
    spec: {
      id: "t1-fill",
      buffers: { out: { initFrom: "clear" } },
      passes: [
        { id: "fill", shader: RED_FILL_SHADER, reads: {}, writes: "out" },
      ],
      displayBuffer: "out",
      lifecycle: { autoStart: false, stopMode: "freeze" },
    },
  },
  {
    label: "T2: Copy",
    description: "Passthrough copy — tests entity seeding",
    expect: "Drawing persists unchanged",
    needsDraw: true,
    needsInput: false,
    spec: {
      id: "t2-copy",
      buffers: { img: { initFrom: "entity" } },
      passes: [
        { id: "copy", shader: COPY_SHADER, reads: { src: "img" }, writes: "img" },
      ],
      displayBuffer: "img",
      lifecycle: { autoStart: false, stopMode: "freeze" },
    },
  },
  {
    label: "T3: Tint",
    description: "Red tint with feedback — compounds each frame",
    expect: "Drawing shifts toward red, then saturates",
    needsDraw: true,
    needsInput: false,
    spec: {
      id: "t3-tint",
      buffers: { img: { initFrom: "entity" } },
      passes: [
        { id: "tint", shader: TINT_SHADER, reads: { src: "img" }, writes: "img" },
      ],
      displayBuffer: "img",
      lifecycle: { autoStart: false, stopMode: "freeze" },
    },
  },
  {
    label: "T4: Blur",
    description: "Gaussian blur with feedback — the failing case",
    expect: "Drawing gradually blurs/smears",
    needsDraw: true,
    needsInput: false,
    spec: {
      id: "t4-blur",
      buffers: { canvas: { initFrom: "entity" } },
      passes: [
        { id: "blur", shader: BLUR_SHADER, reads: { current_buffer: "canvas" }, writes: "canvas" },
      ],
      displayBuffer: "canvas",
      lifecycle: { autoStart: false, stopMode: "freeze" },
    },
  },
  {
    label: "T5: 2-Buf",
    description: "Two buffers: copy A→B then tint B",
    expect: "Drawing appears with red tint",
    needsDraw: true,
    needsInput: false,
    spec: {
      id: "t5-twobuf",
      buffers: {
        a: { initFrom: "entity" },
        b: { initFrom: "clear" },
      },
      passes: [
        { id: "a-to-b", shader: COPY_SHADER, reads: { src: "a" }, writes: "b" },
        { id: "tint-b", shader: TINT_SHADER, reads: { src: "b" }, writes: "b" },
      ],
      displayBuffer: "b",
      lifecycle: { autoStart: false, stopMode: "freeze" },
    },
  },
  {
    label: "T6: Input",
    description: "Dynamic inputs — drag to draw dots",
    expect: "Colored dots appear where you drag",
    needsDraw: false,
    needsInput: true,
    spec: {
      id: "t6-input",
      buffers: { out: { initFrom: "clear" } },
      passes: [
        {
          id: "dot",
          shader: DOT_SHADER,
          reads: { current_buffer: "out" },
          writes: "out",
          inputs: ["dot_pos", "dot_color"],
        },
      ],
      displayBuffer: "out",
      lifecycle: { autoStart: false, stopMode: "freeze" },
    },
  },
];

function worldToUV(wx: number, wy: number): [number, number] {
  const u = (wx + 12) / 24;
  const v = (16 - wy) / 32;
  return [Math.max(0, Math.min(1, u)), Math.max(0, Math.min(1, v))];
}

export default function MultiPassTest() {
  const [bridge, setBridge] = useState<GodotBridge | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [GodotView, setGodotView] = useState<React.ComponentType<{ style?: object }> | null>(null);
  const [activeTest, setActiveTest] = useState<number>(0);
  const [running, setRunning] = useState(false);

  const gameLoadedRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const bridgeRef = useRef<GodotBridge | null>(null);
  const activeTestRef = useRef(0);
  const runningRef = useRef(false);

  bridgeRef.current = bridge;
  activeTestRef.current = activeTest;
  runningRef.current = running;

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
        bridge.createPixelBuffer("canvas", 256, 256, "#FFFFFF", 24, 32);
        bridge.applyMultiPassEffect("canvas", TESTS[0].spec);
      } catch (err) {
        setStatus("error");
        console.error("Failed to init game:", err);
      }
    };
    initGame();
    return () => { bridge.dispose(); };
  }, [bridge]);

  const worldToPixel = useCallback((wx: number, wy: number) => {
    const px = Math.max(0, Math.min(255, Math.round((wx + 12) / 24 * 255)));
    const py = Math.max(0, Math.min(255, Math.round((16 - wy) / 32 * 255)));
    return { x: px, y: py };
  }, []);

  useEffect(() => {
    if (!bridge || status !== "ready") return;

    const unsubscribe = bridge.onInputEvent((type, x, y) => {
      const test = TESTS[activeTestRef.current];

      if (type === "drag_start") {
        lastPointRef.current = { x, y };
      } else if (type === "drag_move") {
        const start = lastPointRef.current;
        if (!start) {
          lastPointRef.current = { x, y };
          return;
        }

        if (test.needsInput && runningRef.current) {
          const [u, v] = worldToUV(x, y);
          bridge.setMultiPassInput("dot", {
            dot_pos: [u, v],
            dot_color: [1.0, 0.3, 0.1, 1.0],
          });
        } else {
          const p1 = worldToPixel(start.x, start.y);
          const p2 = worldToPixel(x, y);
          const command: DrawCommand = {
            type: "line",
            x1: p1.x, y1: p1.y,
            x2: p2.x, y2: p2.y,
            color: "#000000",
            width: 4,
          };
          bridge.pixelBufferDraw("canvas", [command]);
        }
        lastPointRef.current = { x, y };
      } else if (type === "drag_end") {
        lastPointRef.current = null;
      }
    });

    return () => { unsubscribe(); };
  }, [bridge, status, worldToPixel]);

  const selectTest = useCallback((index: number) => {
    if (!bridge || status !== "ready") return;
    bridge.stopMultiPassEffect();
    bridge.clearMultiPassEffect();
    bridge.pixelBufferClear("canvas", "#FFFFFF");
    setRunning(false);
    setActiveTest(index);

    if (TESTS[index].needsDraw) {
      const cmds: DrawCommand[] = [
        { type: "line", x1: 40, y1: 40, x2: 200, y2: 40, color: "#FF0000", width: 6 },
        { type: "line", x1: 40, y1: 80, x2: 200, y2: 80, color: "#00AA00", width: 6 },
        { type: "line", x1: 40, y1: 120, x2: 200, y2: 120, color: "#0066FF", width: 6 },
        { type: "line", x1: 120, y1: 20, x2: 120, y2: 240, color: "#000000", width: 4 },
      ];
      bridge.pixelBufferDraw("canvas", cmds);
    }

    bridge.applyMultiPassEffect("canvas", TESTS[index].spec);
  }, [bridge, status]);

  const handleStart = useCallback(() => {
    if (!bridge || status !== "ready") return;
    bridge.startMultiPassEffect();
    setRunning(true);
  }, [bridge, status]);

  const handleStop = useCallback(() => {
    if (!bridge || status !== "ready") return;
    bridge.stopMultiPassEffect();
    setRunning(false);
  }, [bridge, status]);

  const handleClear = useCallback(() => {
    if (!bridge || status !== "ready") return;
    bridge.stopMultiPassEffect();
    bridge.clearMultiPassEffect();
    bridge.pixelBufferClear("canvas", "#FFFFFF");
    setRunning(false);
    bridge.applyMultiPassEffect("canvas", TESTS[activeTest].spec);
  }, [bridge, status, activeTest]);

  const test = TESTS[activeTest];

  return (
    <View style={{ flex: 1, backgroundColor: "#e0e0e0" }}>
      <View style={{ flex: 1 }}>
        {GodotView && <GodotView style={{ flex: 1 }} />}
        {status === "loading" && (
          <View style={{ position: "absolute", inset: 0, justifyContent: "center", alignItems: "center" }}>
            <Text>Loading Godot...</Text>
          </View>
        )}
      </View>

      <View style={{ backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#ccc", padding: 8 }}>
        <View style={{ marginBottom: 6, paddingHorizontal: 4 }}>
          <Text style={{ fontWeight: "bold", fontSize: 13 }}>
            {test.label}: {test.description}
          </Text>
          <Text style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
            Expect: {test.expect} {running ? " [RUNNING]" : " [STOPPED]"}
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
          <View style={{ flexDirection: "row", gap: 4 }}>
            {TESTS.map((t, i) => (
              <Pressable
                key={t.label}
                onPress={() => selectTest(i)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  backgroundColor: activeTest === i ? "#333" : "#eee",
                  borderRadius: 4,
                }}
              >
                <Text style={{
                  color: activeTest === i ? "#fff" : "#000",
                  fontWeight: "bold",
                  fontSize: 12,
                }}>
                  {t.label.split(":")[0]}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={running ? handleStop : handleStart}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 10,
              backgroundColor: pressed
                ? (running ? "#b33" : "#3a3")
                : (running ? "#d44" : "#4c4"),
              borderRadius: 4,
              alignItems: "center",
            })}
          >
            <Text style={{ fontWeight: "bold", color: "#fff" }}>
              {running ? "Stop" : "Start"}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleClear}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 10,
              backgroundColor: pressed ? "#ddd" : "#f0f0f0",
              borderRadius: 4,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#ccc",
            })}
          >
            <Text style={{ fontWeight: "bold" }}>Clear</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
