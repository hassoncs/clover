import React, { useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import { GameRuntime } from "@/lib/game-engine/GameRuntime.godot";
import type { GameDefinition } from "@slopcade/shared";
import type { ExampleMeta } from "@/lib/registry/types";

export const metadata: ExampleMeta = {
  title: "Custom Font Lab",
  description: "Validates dynamic TTF font loading from URLs in Godot.",
};

const BUBBLE_FONT = "https://github.com/google/fonts/raw/main/ofl/modak/Modak-Regular.ttf";
const PIXEL_FONT = "https://github.com/google/fonts/raw/main/ofl/pressstart2p/PressStart2P-Regular.ttf";
const RETRO_FONT = "https://github.com/google/fonts/raw/main/ofl/vt323/VT323-Regular.ttf";

const FONT_OPTIONS = [
  { name: "Default", url: "" },
  { name: "Bubble (Modak)", url: BUBBLE_FONT },
  { name: "Pixel (PressStart2P)", url: PIXEL_FONT },
  { name: "Retro (VT323)", url: RETRO_FONT },
];

export default function FontLab() {
  const [selectedFont, setSelectedFont] = useState(FONT_OPTIONS[0]);

  const game: GameDefinition = {
    id: "font-lab",
    name: "Font Lab",
    world: {
      bounds: { min: { x: -5, y: -9 }, max: { x: 5, y: 9 } },
      gravity: { x: 0, y: -9.8 },
    },
    entities: [
      {
        id: "title",
        template: "text",
        position: { x: 0, y: 5 },
        sprite: {
          type: "rect",
          width: 0,
          height: 0,
          text: "SLOPCADE",
          fontSize: 80,
          color: "#FFD700",
          fontUrl: selectedFont.url,
        } as any,
      },
      {
        id: "subtitle",
        template: "text",
        position: { x: 0, y: 2 },
        sprite: {
          type: "rect",
          width: 0,
          height: 0,
          text: "DYNAMIC FONT LOADING",
          fontSize: 30,
          color: "#FFFFFF",
          fontUrl: selectedFont.url,
        } as any,
      },
      {
        id: "status",
        template: "text",
        position: { x: 0, y: -2 },
        sprite: {
          type: "rect",
          width: 0,
          height: 0,
          text: selectedFont.name === "Default" ? "Using System Font" : `Using ${selectedFont.name}`,
          fontSize: 24,
          color: "#00FF00",
          fontUrl: selectedFont.url,
        } as any,
      },
    ],
  };

  return (
    <View style={styles.container}>
      <GameRuntime definition={game} style={styles.game} />
      
      <View style={styles.controls}>
        <Text style={styles.label}>Select Font:</Text>
        <View style={styles.buttonRow}>
          {FONT_OPTIONS.map((font) => (
            <TouchableOpacity
              key={font.name}
              style={[
                styles.button,
                selectedFont.name === font.name && styles.buttonActive,
              ]}
              onPress={() => setSelectedFont(font)}
            >
              <Text style={styles.buttonText}>{font.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  game: {
    flex: 1,
  },
  controls: {
    padding: 20,
    backgroundColor: "#111",
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  label: {
    color: "#fff",
    marginBottom: 10,
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#333",
  },
  buttonActive: {
    backgroundColor: "#FFD700",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
