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
    id: "simple",
    title: "Simple",
    description: "Minimal test game - background and a cube",
    instructions: "Nothing to do here. Just a cube.",
    version: "1.0.0",
  },
  assetSystem: { activePackId: "default" },
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
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "box",
        width: CUBE_SIZE,
        height: CUBE_SIZE,
      },
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
