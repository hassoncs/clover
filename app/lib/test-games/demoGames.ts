import type { GameDefinition } from "@clover/shared";
import { fallingObjectsGame } from "./games/fallingObjects";
import { breakoutBouncerGame } from "./games/breakoutBouncer";
import { physicsStackerGame } from "./games/physicsStacker";
import { simplePlatformerGame } from "./games/simplePlatformer";
import { bouncingBallsGame } from "./games/bouncingBalls";
import { bumperArenaGame } from "./games/bumperArena";
import { slingshotDestructionGame } from "./games/slingshotDestruction";
import { dominoChainGame } from "./games/dominoChain";
import { pinballLiteGame } from "./games/pinballLite";
import { pendulumSwingGame } from "./games/pendulumSwing";

export type TestGameEntry = {
  id: string;
  title: string;
  description: string;
  definition: GameDefinition;
};

const baseWorld = {
  gravity: { x: 0, y: 0 },
  pixelsPerMeter: 50,
  bounds: { width: 20, height: 12 },
};

const gravityWorld = {
  gravity: { x: 0, y: 9.8 },
  pixelsPerMeter: 50,
  bounds: { width: 20, height: 12 },
};

const rectsGridGame: GameDefinition = {
  metadata: {
    id: "test-rects-grid",
    title: "Rects Grid",
    description: "Tests rectangle rendering with various sizes, colors, rotation, and scaling",
    version: "1.0.0",
  },
  world: baseWorld,
  camera: { type: "fixed", zoom: 1 },
  ui: {
    showScore: false,
    showLives: false,
    showTimer: false,
    backgroundColor: "#1a1a2e",
  },
  templates: {
    smallRect: {
      id: "smallRect",
      sprite: { type: "rect", width: 1, height: 0.5, color: "#22C55E" },
      physics: {
        bodyType: "dynamic",
        shape: "box",
        width: 1,
        height: 0.5,
        density: 1,
        friction: 0.4,
        restitution: 0.1,
      },
    },
    largeRect: {
      id: "largeRect",
      sprite: { type: "rect", width: 2, height: 1, color: "#3B82F6" },
      physics: {
        bodyType: "dynamic",
        shape: "box",
        width: 2,
        height: 1,
        density: 1,
        friction: 0.4,
        restitution: 0.1,
      },
    },
    border: {
      id: "border",
      sprite: { type: "rect", width: 20, height: 0.1, color: "#94A3B8" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 20,
        height: 0.1,
        density: 1,
        friction: 0.8,
        restitution: 0,
      },
    },
    vertBorder: {
      id: "vertBorder",
      sprite: { type: "rect", width: 0.1, height: 12, color: "#94A3B8" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 0.1,
        height: 12,
        density: 1,
        friction: 0.8,
        restitution: 0,
      },
    },
  },
  entities: [
    // Border markers for reference
    {
      id: "border-top",
      name: "Border Top",
      template: "border",
      transform: { x: 10, y: 0.05, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "border-bottom",
      name: "Border Bottom",
      template: "border",
      transform: { x: 10, y: 11.95, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "border-left",
      name: "Border Left",
      template: "vertBorder",
      transform: { x: 0.05, y: 6, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "border-right",
      name: "Border Right",
      template: "vertBorder",
      transform: { x: 19.95, y: 6, angle: 0, scaleX: 1, scaleY: 1 },
    },
    // Small rects in a row
    {
      id: "small-1",
      name: "Small Rect 1",
      template: "smallRect",
      transform: { x: 3, y: 3, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "small-2",
      name: "Small Rect 2",
      template: "smallRect",
      transform: { x: 6, y: 3, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "small-3",
      name: "Small Rect 3",
      template: "smallRect",
      transform: { x: 9, y: 3, angle: 0, scaleX: 1, scaleY: 1 },
    },
    // Large rects
    {
      id: "large-1",
      name: "Large Rect 1",
      template: "largeRect",
      transform: { x: 14, y: 3, angle: 0, scaleX: 1, scaleY: 1 },
    },
    // Rotated rect
    {
      id: "rotated-rect",
      name: "Rotated Rect",
      transform: { x: 5, y: 7, angle: Math.PI / 6, scaleX: 1, scaleY: 1 },
      sprite: { type: "rect", width: 2, height: 0.8, color: "#F59E0B" },
      physics: {
        bodyType: "dynamic",
        shape: "box",
        width: 2,
        height: 0.8,
        density: 1,
        friction: 0.4,
        restitution: 0.1,
      },
    },
    // Scaled rect
    {
      id: "scaled-rect",
      name: "Scaled Rect",
      transform: { x: 10, y: 7, angle: 0, scaleX: 1.5, scaleY: 0.7 },
      sprite: { type: "rect", width: 1.5, height: 1, color: "#EC4899" },
      physics: {
        bodyType: "dynamic",
        shape: "box",
        width: 1.5,
        height: 1,
        density: 1,
        friction: 0.4,
        restitution: 0.1,
      },
    },
    // Rotated + scaled rect
    {
      id: "rotated-scaled",
      name: "Rotated & Scaled",
      transform: { x: 15, y: 7, angle: -Math.PI / 4, scaleX: 1.2, scaleY: 0.8 },
      sprite: { type: "rect", width: 1.8, height: 0.9, color: "#8B5CF6" },
      physics: {
        bodyType: "dynamic",
        shape: "box",
        width: 1.8,
        height: 0.9,
        density: 1,
        friction: 0.4,
        restitution: 0.1,
      },
    },
    // Static rect (different color to indicate static)
    {
      id: "static-rect",
      name: "Static Rect",
      transform: { x: 10, y: 10, angle: 0, scaleX: 1, scaleY: 1 },
      sprite: { type: "rect", width: 4, height: 0.5, color: "#6B7280" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 4,
        height: 0.5,
        density: 1,
        friction: 0.8,
        restitution: 0,
      },
    },
  ],
};

const circlesPaletteGame: GameDefinition = {
  metadata: {
    id: "test-circles-palette",
    title: "Circles Palette",
    description: "Tests circle rendering with various radii, colors, strokes, shadows, and opacity",
    version: "1.0.0",
  },
  world: baseWorld,
  camera: { type: "fixed", zoom: 1 },
  ui: {
    showScore: false,
    showLives: false,
    showTimer: false,
    backgroundColor: "#1e293b",
  },
  templates: {
    smallCircle: {
      id: "smallCircle",
      sprite: { type: "circle", radius: 0.4, color: "#EF4444" },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: 0.4,
        density: 1,
        friction: 0.3,
        restitution: 0.5,
      },
    },
    mediumCircle: {
      id: "mediumCircle",
      sprite: { type: "circle", radius: 0.7, color: "#10B981" },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: 0.7,
        density: 1,
        friction: 0.3,
        restitution: 0.5,
      },
    },
    largeCircle: {
      id: "largeCircle",
      sprite: { type: "circle", radius: 1.0, color: "#6366F1" },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: 1.0,
        density: 1,
        friction: 0.3,
        restitution: 0.5,
      },
    },
  },
  entities: [
    // Row 1: Basic circles of different sizes
    {
      id: "circle-small-1",
      name: "Small Circle",
      template: "smallCircle",
      transform: { x: 3, y: 2.5, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "circle-medium-1",
      name: "Medium Circle",
      template: "mediumCircle",
      transform: { x: 6, y: 2.5, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "circle-large-1",
      name: "Large Circle",
      template: "largeCircle",
      transform: { x: 10, y: 2.5, angle: 0, scaleX: 1, scaleY: 1 },
    },
    // Row 2: Circles with strokes
    {
      id: "circle-stroke-1",
      name: "Circle with Stroke 1",
      transform: { x: 3, y: 5.5, angle: 0, scaleX: 1, scaleY: 1 },
      sprite: {
        type: "circle",
        radius: 0.6,
        color: "#FBBF24",
        strokeColor: "#78350F",
        strokeWidth: 3,
      },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: 0.6,
        density: 1,
        friction: 0.3,
        restitution: 0.5,
      },
    },
    {
      id: "circle-stroke-2",
      name: "Circle with Stroke 2",
      transform: { x: 6, y: 5.5, angle: 0, scaleX: 1, scaleY: 1 },
      sprite: {
        type: "circle",
        radius: 0.8,
        color: "#A855F7",
        strokeColor: "#3B0764",
        strokeWidth: 4,
      },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: 0.8,
        density: 1,
        friction: 0.3,
        restitution: 0.5,
      },
    },
    // Row 2: Circle with shadow
    {
      id: "circle-shadow",
      name: "Circle with Shadow",
      transform: { x: 10, y: 5.5, angle: 0, scaleX: 1, scaleY: 1 },
      sprite: {
        type: "circle",
        radius: 0.9,
        color: "#F43F5E",
        shadow: {
          color: "rgba(0,0,0,0.5)",
          offsetX: 4,
          offsetY: 4,
          blur: 8,
        },
      },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: 0.9,
        density: 1,
        friction: 0.3,
        restitution: 0.5,
      },
    },
    // Row 3: Opacity variations
    {
      id: "circle-opacity-full",
      name: "Full Opacity",
      transform: { x: 3, y: 8.5, angle: 0, scaleX: 1, scaleY: 1 },
      sprite: { type: "circle", radius: 0.6, color: "#14B8A6", opacity: 1 },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: 0.6,
        density: 1,
        friction: 0.3,
        restitution: 0.5,
      },
    },
    {
      id: "circle-opacity-75",
      name: "75% Opacity",
      transform: { x: 6, y: 8.5, angle: 0, scaleX: 1, scaleY: 1 },
      sprite: { type: "circle", radius: 0.6, color: "#14B8A6", opacity: 0.75 },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: 0.6,
        density: 1,
        friction: 0.3,
        restitution: 0.5,
      },
    },
    {
      id: "circle-opacity-50",
      name: "50% Opacity",
      transform: { x: 9, y: 8.5, angle: 0, scaleX: 1, scaleY: 1 },
      sprite: { type: "circle", radius: 0.6, color: "#14B8A6", opacity: 0.5 },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: 0.6,
        density: 1,
        friction: 0.3,
        restitution: 0.5,
      },
    },
    {
      id: "circle-opacity-25",
      name: "25% Opacity",
      transform: { x: 12, y: 8.5, angle: 0, scaleX: 1, scaleY: 1 },
      sprite: { type: "circle", radius: 0.6, color: "#14B8A6", opacity: 0.25 },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: 0.6,
        density: 1,
        friction: 0.3,
        restitution: 0.5,
      },
    },
    // Static circles on right side
    {
      id: "static-circle-1",
      name: "Static Circle 1",
      transform: { x: 16, y: 3, angle: 0, scaleX: 1, scaleY: 1 },
      sprite: { type: "circle", radius: 0.5, color: "#6B7280" },
      physics: {
        bodyType: "static",
        shape: "circle",
        radius: 0.5,
        density: 1,
        friction: 0.3,
        restitution: 0.5,
      },
    },
    {
      id: "static-circle-2",
      name: "Static Circle 2",
      transform: { x: 16, y: 6, angle: 0, scaleX: 1, scaleY: 1 },
      sprite: { type: "circle", radius: 0.7, color: "#4B5563" },
      physics: {
        bodyType: "static",
        shape: "circle",
        radius: 0.7,
        density: 1,
        friction: 0.3,
        restitution: 0.5,
      },
    },
    {
      id: "static-circle-3",
      name: "Static Circle 3",
      transform: { x: 16, y: 9, angle: 0, scaleX: 1, scaleY: 1 },
      sprite: { type: "circle", radius: 0.9, color: "#374151" },
      physics: {
        bodyType: "static",
        shape: "circle",
        radius: 0.9,
        density: 1,
        friction: 0.3,
        restitution: 0.5,
      },
    },
  ],
};

const mixedSceneGame: GameDefinition = {
  metadata: {
    id: "test-mixed-scene",
    title: "Mixed Scene",
    description: "Tests mixed rendering with rects, circles, static ground, and various physics body types",
    version: "1.0.0",
  },
  world: baseWorld,
  camera: { type: "fixed", zoom: 1 },
  ui: {
    showScore: false,
    showLives: false,
    showTimer: false,
    backgroundColor: "#0f172a",
  },
  templates: {
    ground: {
      id: "ground",
      sprite: { type: "rect", width: 18, height: 0.5, color: "#65A30D" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 18,
        height: 0.5,
        density: 1,
        friction: 0.8,
        restitution: 0.1,
      },
    },
    platform: {
      id: "platform",
      sprite: { type: "rect", width: 4, height: 0.3, color: "#7C3AED" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 4,
        height: 0.3,
        density: 1,
        friction: 0.6,
        restitution: 0.1,
      },
    },
    dynamicBox: {
      id: "dynamicBox",
      sprite: { type: "rect", width: 1, height: 1, color: "#0EA5E9" },
      physics: {
        bodyType: "dynamic",
        shape: "box",
        width: 1,
        height: 1,
        density: 1,
        friction: 0.5,
        restitution: 0.2,
      },
    },
    dynamicBall: {
      id: "dynamicBall",
      sprite: { type: "circle", radius: 0.5, color: "#F97316" },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: 0.5,
        density: 1,
        friction: 0.3,
        restitution: 0.6,
      },
    },
  },
  entities: [
    // Ground
    {
      id: "ground",
      name: "Ground",
      template: "ground",
      transform: { x: 10, y: 11, angle: 0, scaleX: 1, scaleY: 1 },
    },
    // Platforms at different heights
    {
      id: "platform-1",
      name: "Platform 1",
      template: "platform",
      transform: { x: 5, y: 8, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "platform-2",
      name: "Platform 2",
      template: "platform",
      transform: { x: 15, y: 6, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "platform-3",
      name: "Platform 3",
      template: "platform",
      transform: { x: 10, y: 4, angle: 0, scaleX: 1, scaleY: 1 },
    },
    // Dynamic boxes
    {
      id: "box-1",
      name: "Box 1",
      template: "dynamicBox",
      transform: { x: 4, y: 6.5, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "box-2",
      name: "Box 2",
      template: "dynamicBox",
      transform: { x: 6, y: 6.5, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "box-3",
      name: "Box 3",
      template: "dynamicBox",
      transform: { x: 14, y: 4.5, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "box-4",
      name: "Box 4",
      template: "dynamicBox",
      transform: { x: 16, y: 4.5, angle: 0, scaleX: 1, scaleY: 1 },
    },
    // Dynamic balls
    {
      id: "ball-1",
      name: "Ball 1",
      template: "dynamicBall",
      transform: { x: 9, y: 2.5, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "ball-2",
      name: "Ball 2",
      template: "dynamicBall",
      transform: { x: 11, y: 2.5, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "ball-3",
      name: "Ball 3",
      template: "dynamicBall",
      transform: { x: 3, y: 9.5, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "ball-4",
      name: "Ball 4",
      template: "dynamicBall",
      transform: { x: 17, y: 9.5, angle: 0, scaleX: 1, scaleY: 1 },
    },
    // Kinematic body (for testing kinematic type)
    {
      id: "kinematic-platform",
      name: "Kinematic Platform",
      transform: { x: 10, y: 7, angle: 0, scaleX: 1, scaleY: 1 },
      sprite: { type: "rect", width: 3, height: 0.25, color: "#EAB308" },
      physics: {
        bodyType: "kinematic",
        shape: "box",
        width: 3,
        height: 0.25,
        density: 1,
        friction: 0.5,
        restitution: 0.1,
      },
    },
    // Large feature entities for visual reference
    {
      id: "big-circle",
      name: "Big Circle",
      transform: { x: 3, y: 3, angle: 0, scaleX: 1, scaleY: 1 },
      sprite: {
        type: "circle",
        radius: 1.2,
        color: "#DC2626",
        strokeColor: "#7F1D1D",
        strokeWidth: 3,
      },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: 1.2,
        density: 0.8,
        friction: 0.3,
        restitution: 0.5,
      },
    },
    {
      id: "big-rect",
      name: "Big Rect",
      transform: { x: 17, y: 2, angle: Math.PI / 12, scaleX: 1, scaleY: 1 },
      sprite: {
        type: "rect",
        width: 2,
        height: 1.5,
        color: "#2563EB",
        strokeColor: "#1E3A8A",
        strokeWidth: 3,
      },
      physics: {
        bodyType: "dynamic",
        shape: "box",
        width: 2,
        height: 1.5,
        density: 0.8,
        friction: 0.5,
        restitution: 0.2,
      },
    },
  ],
};

export const TEST_GAMES: TestGameEntry[] = [
  {
    id: "test-rects-grid",
    title: "Rects Grid",
    description: "Rectangle rendering: sizes, colors, rotation, scaling, static vs dynamic",
    definition: rectsGridGame,
  },
  {
    id: "test-circles-palette",
    title: "Circles Palette",
    description: "Circle rendering: radii, colors, strokes, shadows, opacity variations",
    definition: circlesPaletteGame,
  },
  {
    id: "test-mixed-scene",
    title: "Mixed Scene",
    description: "Mixed shapes: rects + circles, platforms, all physics body types",
    definition: mixedSceneGame,
  },
  {
    id: fallingObjectsGame.metadata.id,
    title: fallingObjectsGame.metadata.title,
    description: fallingObjectsGame.metadata.description ?? "",
    definition: fallingObjectsGame,
  },
  {
    id: bouncingBallsGame.metadata.id,
    title: bouncingBallsGame.metadata.title,
    description: bouncingBallsGame.metadata.description ?? "",
    definition: bouncingBallsGame,
  },
  {
    id: breakoutBouncerGame.metadata.id,
    title: breakoutBouncerGame.metadata.title,
    description: breakoutBouncerGame.metadata.description ?? "",
    definition: breakoutBouncerGame,
  },
  {
    id: physicsStackerGame.metadata.id,
    title: physicsStackerGame.metadata.title,
    description: physicsStackerGame.metadata.description ?? "",
    definition: physicsStackerGame,
  },
  {
    id: simplePlatformerGame.metadata.id,
    title: simplePlatformerGame.metadata.title,
    description: simplePlatformerGame.metadata.description ?? "",
    definition: simplePlatformerGame,
  },
  {
    id: bumperArenaGame.metadata.id,
    title: bumperArenaGame.metadata.title,
    description: bumperArenaGame.metadata.description ?? "",
    definition: bumperArenaGame,
  },
  {
    id: slingshotDestructionGame.metadata.id,
    title: slingshotDestructionGame.metadata.title,
    description: slingshotDestructionGame.metadata.description ?? "",
    definition: slingshotDestructionGame,
  },
  {
    id: dominoChainGame.metadata.id,
    title: dominoChainGame.metadata.title,
    description: dominoChainGame.metadata.description ?? "",
    definition: dominoChainGame,
  },
  {
    id: pinballLiteGame.metadata.id,
    title: pinballLiteGame.metadata.title,
    description: pinballLiteGame.metadata.description ?? "",
    definition: pinballLiteGame,
  },
  {
    id: pendulumSwingGame.metadata.id,
    title: pendulumSwingGame.metadata.title,
    description: pendulumSwingGame.metadata.description ?? "",
    definition: pendulumSwingGame,
  },
];

export function getTestGame(id: string): TestGameEntry | undefined {
  return TEST_GAMES.find((g) => g.id === id);
}
