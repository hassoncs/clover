import type { GameDefinition } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Image No Physics Test",
  description: "Minimal test: image with NO physics/collider (Node2D + Visual only)",
  status: "stable",
};

/**
 * SCENARIO 1: Image with NO physics
 * 
 * NEW FORMAT: visual component only (no physics, no collider)
 * Expected: Static image rendered at position (-2, 0)
 */
const game: GameDefinition = {
  metadata: {
    id: "image-no-physics-test",
    title: "Image No Physics Test",
    description: "Tests image rendering without physics",
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
    imageOnly: {
      id: "imageOnly",
      tags: ["image-only"],
      // NEW FORMAT: visual component (replaces sprite)
      visual: {
        type: "image",
        imageUrl: "https://via.placeholder.com/100/FF0000/FFFFFF?text=NO+PHYSICS",
        width: 2,
        height: 2,
      },
      // No physics = static visual only
      // No collider = no collision detection
    },
  },
  entities: [
    {
      id: "image-no-physics",
      template: "imageOnly",
      transform: { x: -2, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
    },
  ],
  rules: [],
};

export default game;
