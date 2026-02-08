import { useCallback, useRef, useState, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import type { ExampleMeta } from "@/lib/registry/types";
import type { GodotBridge, DrawCommand } from "@/lib/godot/types";
import type { GameDefinition, MultiPassEffectSpec } from "@slopcade/shared";

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
    COLOR = (c * 0.5 + l * 0.125 + r * 0.125 + u * 0.125 + d * 0.125);
}
`.trim();

const SIMPLE_BLUR_SPEC: MultiPassEffectSpec = {
  id: "simple-blur",
  buffers: {
    canvas: { initFrom: "entity" },
  },
  passes: [
    {
      id: "blur",
      shader: BLUR_SHADER,
      reads: { current_buffer: "canvas" },
      writes: "canvas",
    },
  ],
  displayBuffer: "canvas",
  lifecycle: { autoStart: false, stopMode: "freeze" },
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  ];
}

function worldToUV(wx: number, wy: number): [number, number] {
  const u = (wx + 12) / 24;
  const v = (16 - wy) / 32;
  return [Math.max(0, Math.min(1, u)), Math.max(0, Math.min(1, v))];
}

export default function PaintExample() {
  const [bridge, setBridge] = useState<GodotBridge | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [GodotView, setGodotView] = useState<React.ComponentType<{ style?: object }> | null>(null);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(3);
  const [fluidActive, setFluidActive] = useState(false);

  const gameLoadedRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const colorRef = useRef(selectedColor);
  const brushSizeRef = useRef(brushSize);
  const fluidActiveRef = useRef(false);

  colorRef.current = selectedColor;
  brushSizeRef.current = brushSize;
  fluidActiveRef.current = fluidActive;

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
        bridge.applyMultiPassEffect("canvas", SIMPLE_BLUR_SPEC);
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

  const worldToPixel = useCallback((wx: number, wy: number) => {
    const px = Math.max(0, Math.min(511, Math.round((wx + 12) / 24 * 511)));
    const py = Math.max(0, Math.min(511, Math.round((16 - wy) / 32 * 511)));
    return { x: px, y: py };
  }, []);

  useEffect(() => {
    if (!bridge || status !== "ready") return;

    const unsubscribe = bridge.onInputEvent((type, x, y) => {
      if (type === "drag_start") {
        lastPointRef.current = { x, y };
      } else if (type === "drag_move") {
        const start = lastPointRef.current;

        if (start) {
          const p1 = worldToPixel(start.x, start.y);
          const p2 = worldToPixel(x, y);

          const command: DrawCommand = {
            type: "line",
            x1: p1.x,
            y1: p1.y,
            x2: p2.x,
            y2: p2.y,
            color: colorRef.current,
            width: brushSizeRef.current,
          };

          bridge.pixelBufferDraw("canvas", [command]);
        }
        lastPointRef.current = { x, y };
      } else if (type === "drag_end") {
        lastPointRef.current = null;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [bridge, status, worldToPixel]);

  const handleClear = useCallback(() => {
    if (bridge && status === "ready") {
      bridge.stopMultiPassEffect();
      bridge.clearMultiPassEffect();
      bridge.pixelBufferClear("canvas", "#FFFFFF");
      bridge.applyMultiPassEffect("canvas", SIMPLE_BLUR_SPEC);
      setFluidActive(false);
    }
  }, [bridge, status]);

  const handleToggleFluid = useCallback(() => {
    if (!bridge || status !== "ready") {
      return;
    }

    if (fluidActive) {
      bridge.stopMultiPassEffect();
      setFluidActive(false);
    } else {
      bridge.startMultiPassEffect();
      setFluidActive(true);
    }
  }, [bridge, fluidActive, status]);

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

      <View style={{
        height: 100,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#ccc",
        padding: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
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

        <View style={{ flexDirection: "row", gap: 8, marginLeft: 16 }}>
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

        <View style={{ flexDirection: "row", gap: 8, marginLeft: 16 }}>
          <Pressable
            onPress={handleToggleFluid}
            style={({ pressed }) => ({
              paddingHorizontal: 16,
              paddingVertical: 8,
              backgroundColor: pressed
                ? (fluidActive ? "#b33" : "#3a3")
                : (fluidActive ? "#d44" : "#4c4"),
              borderRadius: 4,
              borderWidth: 1,
              borderColor: fluidActive ? "#a22" : "#393",
            })}
          >
            <Text style={{ fontWeight: "bold", color: "#fff" }}>
              {fluidActive ? "Stop" : "Start"}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleClear}
            style={({ pressed }) => ({
              paddingHorizontal: 16,
              paddingVertical: 8,
              backgroundColor: pressed ? "#ddd" : "#f0f0f0",
              borderRadius: 4,
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
