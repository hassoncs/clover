import type { GameDefinition } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Render Test",
  description: "Minimal test: sprite-only, zone, and physics entities",
  status: "wip",
};

const game: GameDefinition = {
  metadata: {
    id: "render-test",
    title: "Render Test",
    description: "Testing sprite rendering with and without physics",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: -10 },
    pixelsPerMeter: 50,
    bounds: { width: 10, height: 10 },
  },
  camera: { type: "fixed", zoom: 1 },
  ui: {
    showScore: false,
    showLives: false,
    showTimer: false,
    backgroundColor: "#333333",
  },
  templates: {
    spriteOnly: {
      id: "spriteOnly",
      tags: ["sprite-only"],
      visual: {
        type: "rect",
        width: 1,
        height: 1,
        color: "#FF0000",
      },
    },
    physicsBox: {
      id: "physicsBox",
      tags: ["physics-box"],
      visual: {
        type: "rect",
        width: 1,
        height: 1,
        color: "#00FF00",
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "box",
        width: 1,
        height: 1,
      },
    },
    zoneBox: {
      id: "zoneBox",
      tags: ["zone-box"],
      visual: {
        type: "rect",
        width: 1,
        height: 1,
        color: "#0000FF",
      },
      collider: {
        shape: "box",
        width: 1,
        height: 1,
        isSensor: true,
      },
    },
    spriteOnlyCircle: {
      id: "spriteOnlyCircle",
      tags: ["sprite-only-circle"],
      visual: {
        type: "circle",
        radius: 0.5,
        color: "#FFFF00",
      },
    },
    physicsCircle: {
      id: "physicsCircle",
      tags: ["physics-circle"],
      visual: {
        type: "circle",
        radius: 0.5,
        color: "#FF00FF",
      },
      physics: {
        bodyType: "dynamic",
        density: 0,
      },
      collider: {
        shape: "circle",
        radius: 0.5,
      },
    },
  },
  entities: [
    {
      id: "sprite-only-1",
      template: "spriteOnly",
      transform: { x: -3, y: 2, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "physics-box-1",
      template: "physicsBox",
      transform: { x: 0, y: 2, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "zone-box-1",
      template: "zoneBox",
      transform: { x: 3, y: 2, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "sprite-only-circle-1",
      template: "spriteOnlyCircle",
      transform: { x: -3, y: -2, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "physics-circle-1",
      template: "physicsCircle",
      transform: { x: 0, y: -2, angle: 0, scaleX: 1, scaleY: 1 },
    },
  ],
  rules: [],
};

export default game;
