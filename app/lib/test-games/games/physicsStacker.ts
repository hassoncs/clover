import type { GameDefinition } from "@clover/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Physics Stacker",
  description: "Stack blocks as high as possible - tests balance and friction",
};

const game: GameDefinition = {
  metadata: {
    id: "test-physics-stacker",
    title: "Physics Stacker",
    description: "Stack blocks as high as possible - tests balance and friction",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: 9.8 },
    pixelsPerMeter: 50,
    bounds: { width: 14, height: 18 },
  },
  camera: { type: "fixed", zoom: 1 },
  ui: {
    showScore: false,
    showLives: false,
    showTimer: false,
    backgroundColor: "#FFE4E1",
  },
  templates: {
    foundation: {
      id: "foundation",
      sprite: { type: "rect", width: 4, height: 0.6, color: "#8B4513" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 4,
        height: 0.6,
        density: 0,
        friction: 0.9,
        restitution: 0,
      },
    },
    blockWide: {
      id: "blockWide",
      sprite: { type: "rect", width: 1.8, height: 0.6, color: "#FF69B4" },
      physics: {
        bodyType: "dynamic",
        shape: "box",
        width: 1.8,
        height: 0.6,
        density: 1,
        friction: 0.8,
        restitution: 0.1,
      },
    },
    blockMedium: {
      id: "blockMedium",
      sprite: { type: "rect", width: 1.4, height: 0.6, color: "#FF1493" },
      physics: {
        bodyType: "dynamic",
        shape: "box",
        width: 1.4,
        height: 0.6,
        density: 1,
        friction: 0.8,
        restitution: 0.1,
      },
    },
    blockSmall: {
      id: "blockSmall",
      sprite: { type: "rect", width: 1.0, height: 0.6, color: "#DB7093" },
      physics: {
        bodyType: "dynamic",
        shape: "box",
        width: 1.0,
        height: 0.6,
        density: 1,
        friction: 0.8,
        restitution: 0.1,
      },
    },
    blockTall: {
      id: "blockTall",
      sprite: { type: "rect", width: 0.6, height: 1.2, color: "#C71585" },
      physics: {
        bodyType: "dynamic",
        shape: "box",
        width: 0.6,
        height: 1.2,
        density: 1,
        friction: 0.8,
        restitution: 0.1,
      },
    },
  },
  entities: [
    { id: "foundation", name: "Foundation", template: "foundation", transform: { x: 7, y: 16, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "block-1", name: "Block 1", template: "blockWide", transform: { x: 7, y: 15.1, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "block-2", name: "Block 2", template: "blockWide", transform: { x: 7, y: 14.4, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "block-3", name: "Block 3", template: "blockMedium", transform: { x: 7, y: 13.7, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "block-4", name: "Block 4", template: "blockMedium", transform: { x: 7.1, y: 13, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "block-5", name: "Block 5", template: "blockSmall", transform: { x: 6.9, y: 12.3, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "block-6", name: "Block 6", template: "blockSmall", transform: { x: 7.1, y: 11.6, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "block-7", name: "Block 7", template: "blockTall", transform: { x: 6.5, y: 10.5, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "block-8", name: "Block 8", template: "blockTall", transform: { x: 7.5, y: 10.5, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "block-9", name: "Block 9", template: "blockSmall", transform: { x: 7, y: 9.5, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "block-10", name: "Block 10", template: "blockMedium", transform: { x: 7, y: 8.8, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "falling-1", name: "Falling 1", template: "blockWide", transform: { x: 4, y: 2, angle: 0.1, scaleX: 1, scaleY: 1 } },
    { id: "falling-2", name: "Falling 2", template: "blockMedium", transform: { x: 10, y: 3, angle: -0.1, scaleX: 1, scaleY: 1 } },
    { id: "falling-3", name: "Falling 3", template: "blockSmall", transform: { x: 6, y: 1, angle: 0.2, scaleX: 1, scaleY: 1 } },
    { id: "falling-4", name: "Falling 4", template: "blockTall", transform: { x: 8, y: 2, angle: -0.15, scaleX: 1, scaleY: 1 } },
  ],
};

export default game;
