import { useCallback, useRef, useState, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import type { ExampleMeta } from "@/lib/registry/types";
import type { GodotBridge, DrawCommand } from "@/lib/godot/types";
import type { GameDefinition } from "@slopcade/shared";

export const metadata: ExampleMeta = {
  title: "Finger Paint",
  description: "Draw on a pixel buffer canvas with color selection and brush sizes",
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
    bounds: { width: 12, height: 16 },
  },
  camera: { type: "fixed", zoom: 1 },
  ui: { backgroundColor: "#f5f5f5" },
  templates: {
    canvas: {
      id: "canvas",
      visual: { type: "rect", width: 10, height: 14, color: "#FFFFFF" },
      physics: { bodyType: "static" },
      collider: { shape: "box", width: 10, height: 14, friction: 0, restitution: 0 },
    },
  },
  entities: [
    {
      id: "canvas",
      name: "Canvas",
      template: "canvas",
      transform: { x: 6, y: 8, angle: 0, scaleX: 1, scaleY: 1 },
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

export default function PaintExample() {
  const [bridge, setBridge] = useState<GodotBridge | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [GodotView, setGodotView] = useState<React.ComponentType<{ style?: object }> | null>(null);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(3);

  const gameLoadedRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const colorRef = useRef(selectedColor);
  const brushSizeRef = useRef(brushSize);

  colorRef.current = selectedColor;
  brushSizeRef.current = brushSize;

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
        
        bridge.createPixelBuffer("canvas", 256, 256, "#FFFFFF");
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
    const px = Math.max(0, Math.min(255, Math.round((wx - 1) / 10 * 255)));
    const py = Math.max(0, Math.min(255, Math.round((15 - wy) / 14 * 255)));
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
          lastPointRef.current = { x, y };
        } else {
          lastPointRef.current = { x, y };
        }
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
      bridge.pixelBufferClear("canvas", "#FFFFFF");
    }
  }, [bridge, status]);

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

        <Pressable
          onPress={handleClear}
          style={({ pressed }) => ({
            paddingHorizontal: 16,
            paddingVertical: 8,
            backgroundColor: pressed ? "#ddd" : "#f0f0f0",
            borderRadius: 4,
            borderWidth: 1,
            borderColor: "#ccc",
            marginLeft: 16
          })}
        >
          <Text style={{ fontWeight: "bold" }}>Clear</Text>
        </Pressable>
      </View>
    </View>
  );
}
