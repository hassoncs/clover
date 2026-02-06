import type { GameDefinition } from "@slopcade/shared";

export const metadata = {
  title: "Simple",
  description: "Minimal test game - background and a cube",
};

const WORLD_WIDTH = 12;
const WORLD_HEIGHT = 16;

const CUBE_SIZE = 1;

const game: GameDefinition = {
  metadata: {
    id: "02b87353-0c1f-45a3-8868-f75ea5362778",
    slug: "simple",
    title: "Simple",
    description: "Minimal test game - background and a cube",
    instructions: "Nothing to do here. Just a cube.",
    version: "1.0.0",
  },
  assetSystem: {
    activePackId: "a1b2c3d4-0001-4000-8000-000000000001",
    packIds: [
      "a1b2c3d4-0001-4000-8000-000000000001",
      "a1b2c3d4-0002-4000-8000-000000000002",
    ],
  },
  background: {
    type: "static",
    color: "#1a1a2e",
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: 50,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  camera: { type: "fixed", zoom: 1 },
  templates: {
    cube: {
      id: "cube",
      tags: ["cube"],
      visual: {
        type: "image",
        imageWidth: CUBE_SIZE,
        imageHeight: CUBE_SIZE,
      },
      physics: {
        bodyType: "kinematic",
        density: 0,
      },
      collider: {
        shape: "box",
        width: CUBE_SIZE,
        height: CUBE_SIZE,
      },
      behaviors: [
        { type: "draggable", mode: "kinematic", requireDirectHit: true },
      ],
    },
  },
  entities: [
    {
      id: "cube",
      name: "Cube",
      template: "cube",
      transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
    },
  ],
};

export default game;
