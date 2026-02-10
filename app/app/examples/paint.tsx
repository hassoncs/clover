import { useCallback, useRef, useState, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import type { ExampleMeta } from "@/lib/registry/types";
import type { GodotBridge, NormalizedDrawCommand } from "@/lib/godot/types";
import type { GameDefinition } from "@slopcade/shared";
import { compileGraph } from "@slopcade/shared/effects";
import type { EffectGraphSpec, CompiledPlan } from "@slopcade/shared/effects";

export const metadata: ExampleMeta = {
  title: "Finger Paint",
  description: "Draw on a pixel buffer canvas with color selection and fluid simulation",
};

const GAME_DEFINITION: GameDefinition = {
  metadata: {
    id: "paint",
    title: "Finger Paint",
    description: "Draw on a pixel buffer canvas",
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

const COLORS = [
  "#000000",
  "#FF0000",
  "#FF8800",
  "#00AA00",
  "#0066FF",
  "#AA00FF",
];

const BRUSH_SIZES = [
  { label: "S", size: 1 },
  { label: "M", size: 3 },
  { label: "L", size: 6 },
];

const INK_SPREAD_SHADER = `
shader_type canvas_item;

uniform sampler2D current_buffer : filter_linear;
uniform vec2 texel_size;
uniform float dt;

void fragment() {
    vec4 c = texture(current_buffer, UV);
    vec4 l = texture(current_buffer, UV + vec2(-texel_size.x, 0.0));
    vec4 r = texture(current_buffer, UV + vec2( texel_size.x, 0.0));
    vec4 u = texture(current_buffer, UV + vec2(0.0, -texel_size.y));
    vec4 d = texture(current_buffer, UV + vec2(0.0,  texel_size.y));
    vec4 tl = texture(current_buffer, UV + vec2(-texel_size.x, -texel_size.y));
    vec4 tr = texture(current_buffer, UV + vec2( texel_size.x, -texel_size.y));
    vec4 bl = texture(current_buffer, UV + vec2(-texel_size.x,  texel_size.y));
    vec4 br = texture(current_buffer, UV + vec2( texel_size.x,  texel_size.y));
    vec4 blurred = c * 0.25 + (l + r + u + d) * 0.125 + (tl + tr + bl + br) * 0.0625;
    blurred.a = 1.0;
    COLOR = blurred;
}
`.trim();

const MELT_SHADER = `
shader_type canvas_item;

uniform sampler2D current_buffer : filter_linear;
uniform vec2 texel_size;
uniform float dt;

void fragment() {
    vec4 c = texture(current_buffer, UV);
    vec4 below = texture(current_buffer, UV + vec2(0.0, texel_size.y * 2.0));
    vec4 bl_s = texture(current_buffer, UV + vec2(-texel_size.x, texel_size.y));
    vec4 br_s = texture(current_buffer, UV + vec2( texel_size.x, texel_size.y));

    float gravity = 0.15;
    vec4 melted = mix(c, (c * 0.4 + below * 0.3 + bl_s * 0.15 + br_s * 0.15), gravity);
    melted.a = 1.0;
    COLOR = melted;
}
`.trim();

const SWIRL_SHADER = `
shader_type canvas_item;

uniform sampler2D current_buffer : filter_linear;
uniform vec2 texel_size;
uniform float dt;

void fragment() {
    vec2 center = vec2(0.5, 0.5);
    vec2 delta = UV - center;
    float dist = length(delta);
    float angle = 0.006 * smoothstep(0.5, 0.0, dist);
    float cs = cos(angle);
    float sn = sin(angle);
    vec2 rotated = center + vec2(delta.x * cs - delta.y * sn, delta.x * sn + delta.y * cs);
    vec4 c = texture(current_buffer, rotated);
    c.a = 1.0;
    COLOR = c;
}
`.trim();

const RAINBOW_SHADER = `
shader_type canvas_item;

uniform sampler2D current_buffer : filter_linear;
uniform vec2 texel_size;
uniform float dt;

vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void fragment() {
    vec4 c = texture(current_buffer, UV);
    vec4 l = texture(current_buffer, UV + vec2(-texel_size.x, 0.0));
    vec4 r = texture(current_buffer, UV + vec2( texel_size.x, 0.0));
    vec4 u = texture(current_buffer, UV + vec2(0.0, -texel_size.y));
    vec4 d = texture(current_buffer, UV + vec2(0.0,  texel_size.y));
    vec4 blurred = c * 0.5 + (l + r + u + d) * 0.125;

    float brightness = (blurred.r + blurred.g + blurred.b) / 3.0;
    if (brightness < 0.95) {
        vec3 hsv = rgb2hsv(blurred.rgb);
        hsv.x = fract(hsv.x + 0.008);
        hsv.y = min(hsv.y + 0.01, 1.0);
        blurred.rgb = hsv2rgb(hsv);
    }

    blurred.a = 1.0;
    COLOR = blurred;
}
`.trim();

interface ShaderOption {
  label: string;
  spec: EffectGraphSpec;
}

type ShaderNode = EffectGraphSpec["nodes"][number] & { shader?: string };

function makeSpec(id: string, shader: string): EffectGraphSpec {
  const node: ShaderNode = {
    id: "fx",
    type: "custom",
    shader,
    family: "filter",
    inputSlots: [
      { name: "current_buffer", dataType: "texture", connectedTo: null },
    ],
    params: {},
    outputTarget: {
      bufferId: "canvas",
      format: "rgba8",
      resolution: "full",
    },
    flags: { stateful: true, fusible: "never" },
  };

  return {
    id,
    version: "1.0.0",
    engineApiVersion: "2.0.0",
    scope: "entity",
    nodes: [node],
    connections: [],
    feedbackEdges: [
      {
        from: { nodeId: "fx", output: "canvas" },
        to: { nodeId: "fx", input: "current_buffer" },
        policy: {
          initMode: "seedFromInput",
          swapPolicy: "pingPong",
          stopBehavior: "freeze",
          bufferFormat: "rgba8",
        },
      },
    ],
    lifecycle: { autoStart: false, stopMode: "freeze" },
  };
}

function compileShaderPlan(option: ShaderOption): CompiledPlan {
  const compileResult = compileGraph(option.spec);
  if (!compileResult.success || !compileResult.plan) {
    const details = compileResult.errors.map((error) => error.message).join(", ");
    throw new Error(`Failed to compile ${option.label} shader graph: ${details}`);
  }

  const nodeShaders = new Map(
    option.spec.nodes.map((node) => [node.id, (node as ShaderNode).shader ?? ""]),
  );

  const passes = compileResult.plan.passes.map((pass) => {
    const glsl = nodeShaders.get(pass.id);
    if (!glsl) {
      return pass;
    }

    return {
      ...pass,
      shaderSource: { type: "custom" as const, glsl },
    };
  });

  return {
    ...compileResult.plan,
    passes,
  };
}

const SHADER_OPTIONS: ShaderOption[] = [
  { label: "Spread", spec: makeSpec("ink-spread", INK_SPREAD_SHADER) },
  { label: "Melt", spec: makeSpec("melt", MELT_SHADER) },
  { label: "Swirl", spec: makeSpec("swirl", SWIRL_SHADER) },
  { label: "Rainbow", spec: makeSpec("rainbow", RAINBOW_SHADER) },
];

export default function PaintExample() {
  const [bridge, setBridge] = useState<GodotBridge | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [GodotView, setGodotView] = useState<React.ComponentType<{ style?: object }> | null>(null);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(3);
  const [fluidActive, setFluidActive] = useState(false);
  const [selectedShader, setSelectedShader] = useState(0);

  const gameLoadedRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const colorRef = useRef(selectedColor);
  const brushSizeRef = useRef(brushSize);
  const fluidActiveRef = useRef(false);
  const selectedShaderRef = useRef(selectedShader);

  colorRef.current = selectedColor;
  brushSizeRef.current = brushSize;
  fluidActiveRef.current = fluidActive;
  selectedShaderRef.current = selectedShader;

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
        console.log("[Paint] Initializing bridge...");
        await bridge.initialize();
        console.log("[Paint] Loading game...");
        await bridge.loadGame(GAME_DEFINITION);
        gameLoadedRef.current = true;
        setStatus("ready");
        console.log("[Paint] Creating pixel buffer...");
        bridge.createPixelBuffer("canvas", 512, 512, "#FFFFFF", 24, 32);
        const defaultPlan = compileShaderPlan(SHADER_OPTIONS[selectedShaderRef.current]);
        await bridge.applyGraph(defaultPlan);
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
          const normalizedWidth = brushSizeRef.current / viewportHeight;

          const command: NormalizedDrawCommand = {
            type: "line",
            x1: p1.x,
            y1: p1.y,
            x2: p2.x,
            y2: p2.y,
            color: colorRef.current,
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
        const plan = compileShaderPlan(SHADER_OPTIONS[selectedShaderRef.current]);
        await bridge.applyGraph(plan);
        setFluidActive(false);
      } catch (error) {
        console.error("Failed to clear paint canvas:", error);
      }
    }
  }, [bridge, status]);

  const handleShaderChange = useCallback(async (index: number) => {
    if (!bridge || status !== "ready") return;
    try {
      const wasActive = fluidActiveRef.current;
      await bridge.stop();
      await bridge.clearGraph();
      selectedShaderRef.current = index;
      setSelectedShader(index);
      const plan = compileShaderPlan(SHADER_OPTIONS[index]);
      await bridge.applyGraph(plan);
      if (wasActive) {
        await bridge.start();
      }
    } catch (error) {
      console.error("Failed to switch shader:", error);
    }
  }, [bridge, status]);

  const handleToggleFluid = useCallback(() => {
    if (!bridge || status !== "ready") {
      return;
    }

    if (fluidActive) {
      bridge.stop();
      setFluidActive(false);
    } else {
      bridge.start();
      setFluidActive(true);
    }
  }, [bridge, fluidActive, status]);

  return (
    <View style={{ flex: 1, backgroundColor: "#e0e0e0" }}>
      <View style={{ flex: 1, flexShrink: 1 }}>
        {GodotView && <GodotView style={{ flex: 1 }} />}

        {status === "loading" && (
          <View style={{ position: "absolute", inset: 0, justifyContent: "center", alignItems: "center" }}>
            <Text>Loading Godot...</Text>
          </View>
        )}
      </View>

      <View
        style={{
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#ccc",
          paddingTop: 10,
          paddingHorizontal: 10,
          paddingBottom: 10,
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
        }}
      >
        <View style={{ flexDirection: "row", gap: 8 }}>
          {COLORS.map(color => (
            <Pressable
              key={color}
              onPress={() => setSelectedColor(color)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: color,
                borderWidth: selectedColor === color ? 3 : 1,
                borderColor: selectedColor === color ? "#888" : "#ddd",
              }}
            />
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          {BRUSH_SIZES.map(size => (
            <Pressable
              key={size.label}
              onPress={() => setBrushSize(size.size)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 4,
                backgroundColor: brushSize === size.size ? "#333" : "#eee",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{
                color: brushSize === size.size ? "#fff" : "#000",
                fontWeight: "bold"
              }}>
                {size.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: 4 }}>
          {SHADER_OPTIONS.map((opt, i) => (
            <Pressable
              key={opt.label}
              onPress={() => handleShaderChange(i)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                backgroundColor: selectedShader === i ? "#555" : "#eee",
                borderRadius: 4,
                borderWidth: 1,
                borderColor: selectedShader === i ? "#333" : "#ccc",
              }}
            >
              <Text style={{
                fontSize: 12,
                fontWeight: "bold",
                color: selectedShader === i ? "#fff" : "#333",
              }}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={handleToggleFluid}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              backgroundColor: fluidActive ? "#d44" : "#4c4",
              borderRadius: 4,
              borderWidth: 1,
              borderColor: fluidActive ? "#a22" : "#393",
            }}
          >
            <Text style={{ fontWeight: "bold", color: "#fff" }}>
              {fluidActive ? "Stop" : "Start"}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleClear}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              backgroundColor: "#f0f0f0",
              borderRadius: 4,
              borderWidth: 1,
              borderColor: "#ccc",
            }}
          >
            <Text style={{ fontWeight: "bold" }}>Clear</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
