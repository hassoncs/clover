import type { GameDefinition } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Image With Physics Test",
  description: "Minimal test: image WITH physics (RigidBody2D + Collider + Visual)",
  status: "stable",
};

/**
 * SCENARIO 2: Image WITH physics
 * 
 * NEW FORMAT: physics + collider + visual (separate components)
 * Expected: Red box falls under gravity, bounces on green floor
 */
const game: GameDefinition = {
  metadata: {
    id: "image-with-physics-test",
    title: "Image With Physics Test",
    description: "Tests image rendering with physics",
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
    backgroundColor: "#222222",
  },
  templates: {
    physicsImage: {
      id: "physicsImage",
      tags: ["physics-image"],
      // NEW FORMAT: physics component (body properties only)
      physics: {
        bodyType: "dynamic",
        density: 1,
        restitution: 0.5,
      },
      // NEW FORMAT: collider component (shape + material)
      collider: {
        shape: "box",
        width: 1,
        height: 1,
        friction: 0.3,
        restitution: 0.5,
      },
      // NEW FORMAT: visual component (what you see)
      visual: {
        type: "image",
        imageUrl: "https://via.placeholder.com/100/FF0000/FFFFFF?text=PHYSICS",
        // width/height inherited from collider automatically!
      },
    },
    staticFloor: {
      id: "staticFloor",
      tags: ["floor"],
      physics: {
        bodyType: "static",
      },
      collider: {
        shape: "box",
        width: 6,
        height: 0.5,
      },
      visual: {
        type: "image",
        imageUrl: "https://via.placeholder.com/300/00FF00/000000?text=FLOOR",
      },
    },
  },
  entities: [
    {
      id: "falling-box",
      template: "physicsImage",
      transform: { x: 0, y: 3, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "floor",
      template: "staticFloor",
      transform: { x: 0, y: -3, angle: 0, scaleX: 1, scaleY: 1 },
    },
  ],
  rules: [],
};

export default game;
