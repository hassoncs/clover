import type { GameDefinition } from "@clover/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Falling Objects",
  description: "Tests gravity physics with various shapes falling and colliding",
};

const game: GameDefinition = {
  metadata: {
    id: "test-falling-objects",
    title: "Falling Objects",
    description: "Tests gravity physics with various shapes falling and colliding",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: 9.8 },
    pixelsPerMeter: 50,
    bounds: { width: 20, height: 12 },
  },
  camera: { type: "fixed", zoom: 1 },
  ui: {
    showScore: false,
    showLives: false,
    showTimer: false,
    backgroundColor: "#1a1a2e",
  },
  templates: {
    ground: {
      id: "ground",
      sprite: { type: "rect", width: 18, height: 0.5, color: "#4A5568" },
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
    smallBox: {
      id: "smallBox",
      sprite: { type: "rect", width: 0.8, height: 0.8, color: "#EF4444" },
      physics: {
        bodyType: "dynamic",
        shape: "box",
        width: 0.8,
        height: 0.8,
        density: 1,
        friction: 0.5,
        restitution: 0.3,
      },
    },
    mediumBox: {
      id: "mediumBox",
      sprite: { type: "rect", width: 1.2, height: 1.2, color: "#3B82F6" },
      physics: {
        bodyType: "dynamic",
        shape: "box",
        width: 1.2,
        height: 1.2,
        density: 1,
        friction: 0.5,
        restitution: 0.2,
      },
    },
    ball: {
      id: "ball",
      sprite: { type: "circle", radius: 0.5, color: "#10B981" },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: 0.5,
        density: 1,
        friction: 0.3,
        restitution: 0.6,
      },
    },
    heavyBall: {
      id: "heavyBall",
      sprite: { type: "circle", radius: 0.7, color: "#F59E0B" },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: 0.7,
        density: 3,
        friction: 0.4,
        restitution: 0.4,
      },
    },
  },
  entities: [
    {
      id: "ground",
      name: "Ground",
      template: "ground",
      transform: { x: 10, y: 11, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "ramp-left",
      name: "Left Ramp",
      transform: { x: 4, y: 8, angle: Math.PI / 8, scaleX: 1, scaleY: 1 },
      sprite: { type: "rect", width: 5, height: 0.3, color: "#6B7280" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 5,
        height: 0.3,
        density: 1,
        friction: 0.6,
        restitution: 0.1,
      },
    },
    {
      id: "ramp-right",
      name: "Right Ramp",
      transform: { x: 16, y: 8, angle: -Math.PI / 8, scaleX: 1, scaleY: 1 },
      sprite: { type: "rect", width: 5, height: 0.3, color: "#6B7280" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 5,
        height: 0.3,
        density: 1,
        friction: 0.6,
        restitution: 0.1,
      },
    },
    {
      id: "platform-center",
      name: "Center Platform",
      transform: { x: 10, y: 5, angle: 0, scaleX: 1, scaleY: 1 },
      sprite: { type: "rect", width: 4, height: 0.3, color: "#6B7280" },
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
    { id: "box-1", name: "Box 1", template: "smallBox", transform: { x: 3, y: 1, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "box-2", name: "Box 2", template: "smallBox", transform: { x: 5, y: 1.5, angle: 0.2, scaleX: 1, scaleY: 1 } },
    { id: "box-3", name: "Box 3", template: "mediumBox", transform: { x: 7, y: 1, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "box-4", name: "Box 4", template: "smallBox", transform: { x: 9, y: 2, angle: 0.1, scaleX: 1, scaleY: 1 } },
    { id: "box-5", name: "Box 5", template: "mediumBox", transform: { x: 11, y: 1, angle: -0.1, scaleX: 1, scaleY: 1 } },
    { id: "box-6", name: "Box 6", template: "smallBox", transform: { x: 13, y: 1.5, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "box-7", name: "Box 7", template: "smallBox", transform: { x: 15, y: 1, angle: 0.3, scaleX: 1, scaleY: 1 } },
    { id: "ball-1", name: "Ball 1", template: "ball", transform: { x: 4, y: 0.5, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "ball-2", name: "Ball 2", template: "ball", transform: { x: 8, y: 0.5, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "ball-3", name: "Ball 3", template: "heavyBall", transform: { x: 10, y: 0.5, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "ball-4", name: "Ball 4", template: "ball", transform: { x: 12, y: 0.5, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "ball-5", name: "Ball 5", template: "heavyBall", transform: { x: 16, y: 0.5, angle: 0, scaleX: 1, scaleY: 1 } },
  ],
};

export default game;
