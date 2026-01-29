import type { GameDefinition } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Zone Test",
  description: "Minimal test: zone sensor (collider with isSensor)",
  status: "stable",
};

/**
 * SCENARIO 3: Zone with NO sprite and NO physics response
 * 
 * NEW FORMAT: collider with isSensor: true
 * Expected: Invisible zone detects when box enters/exits
 */
const game: GameDefinition = {
  metadata: {
    id: "zone-test",
    title: "Zone Test",
    description: "Tests zone detection with new collider component",
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
    // Zone template using new collider with isSensor
    detectionZone: {
      id: "detectionZone",
      tags: ["zone"],
      // NEW FORMAT: collider with isSensor creates a sensor zone
      collider: {
        shape: "box",
        width: 2,
        height: 2,
        isSensor: true,  // Detects collisions but doesn't respond
      },
      // Optional visual for debugging
      visual: {
        type: "rect",
        color: "#0000FF",
        opacity: 0.3,
      },
    },
    fallingBox: {
      id: "fallingBox",
      tags: ["falling-box"],
      physics: {
        bodyType: "dynamic",
        density: 1,
      },
      collider: {
        shape: "box",
        width: 0.5,
        height: 0.5,
      },
      visual: {
        type: "image",
        imageUrl: "https://via.placeholder.com/50/FFFF00/000000?text=BOX",
      },
    },
    floor: {
      id: "floor",
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
        type: "rect",
        color: "#00FF00",
      },
    },
  },
  entities: [
    {
      id: "the-zone",
      template: "detectionZone",
      transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "falling-box",
      template: "fallingBox",
      transform: { x: 0, y: 3, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "floor",
      template: "floor",
      transform: { x: 0, y: -3, angle: 0, scaleX: 1, scaleY: 1 },
    },
  ],
  rules: [
    {
      trigger: {
        type: "sensor_enter",
        sensorTag: "zone",
        entityTag: "falling-box",
      },
      actions: [
        {
          type: "event",
          eventName: "box_entered_zone",
        },
      ],
    },
    {
      trigger: {
        type: "sensor_exit",
        sensorTag: "zone",
        entityTag: "falling-box",
      },
      actions: [
        {
          type: "event",
          eventName: "box_exited_zone",
        },
      ],
    },
  ],
};

export default game;
