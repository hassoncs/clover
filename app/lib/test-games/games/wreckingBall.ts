import type { GameDefinition } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Wrecking Ball",
  description: "Swing a wrecking ball to destroy targets using physics joints",
};

const game: GameDefinition = {
  metadata: {
    id: "test-wrecking-ball",
    title: "Wrecking Ball",
    description: "Swing a wrecking ball to destroy targets using physics joints",
    instructions: "HOW TO PLAY: Tap and drag the wrecking ball to swing it. Destroy all the targets to win! The ball is connected to the anchor by a distance joint.",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: 9.8 },
    pixelsPerMeter: 50,
    bounds: { width: 20, height: 12 },
  },
  camera: { type: "fixed", zoom: 1 },
  ui: {
    showScore: true,
    showLives: false,
    showTimer: false,
    backgroundColor: "#1e3a5f",
  },
  winCondition: {
    type: "destroy_all",
    tag: "target",
  },
  templates: {
    anchor: {
      id: "anchor",
      tags: ["anchor"],
      sprite: { type: "circle", radius: 0.3, color: "#4B5563" },
      physics: {
        bodyType: "static",
        shape: "circle",
        radius: 0.3,
        density: 0,
        friction: 0,
        restitution: 0,
      },
    },
    wreckingBall: {
      id: "wreckingBall",
      tags: ["ball", "wrecking"],
      sprite: { type: "circle", radius: 0.8, color: "#374151" },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: 0.8,
        density: 5,
        friction: 0.3,
        restitution: 0.2,
        linearDamping: 0.1,
      },
      behaviors: [
        { type: "draggable", mode: "force", stiffness: 500, damping: 20 },
      ],
    },
    target: {
      id: "target",
      tags: ["target"],
      sprite: { type: "rect", width: 1, height: 1, color: "#EF4444" },
      physics: {
        bodyType: "dynamic",
        shape: "box",
        width: 1,
        height: 1,
        density: 0.5,
        friction: 0.5,
        restitution: 0.1,
      },
      behaviors: [
        { type: "destroy_on_collision", withTags: ["wrecking"], minImpactVelocity: 3 },
        { type: "score_on_destroy", points: 100 },
      ],
    },
    ground: {
      id: "ground",
      tags: ["ground"],
      sprite: { type: "rect", width: 20, height: 1, color: "#1F2937" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 20,
        height: 1,
        density: 0,
        friction: 0.8,
        restitution: 0.1,
      },
    },
    wall: {
      id: "wall",
      tags: ["wall"],
      sprite: { type: "rect", width: 0.5, height: 8, color: "#1F2937" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 0.5,
        height: 8,
        density: 0,
        friction: 0.5,
        restitution: 0.3,
      },
    },
  },
  entities: [
    { id: "ground", name: "Ground", template: "ground", transform: { x: 10, y: 11.5, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "wall-left", name: "Left Wall", template: "wall", transform: { x: 0.25, y: 7, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "wall-right", name: "Right Wall", template: "wall", transform: { x: 19.75, y: 7, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "anchor", name: "Anchor", template: "anchor", transform: { x: 5, y: 2, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "ball", name: "Wrecking Ball", template: "wreckingBall", transform: { x: 5, y: 6, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "target-1", name: "Target 1", template: "target", transform: { x: 14, y: 10.5, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "target-2", name: "Target 2", template: "target", transform: { x: 15, y: 10.5, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "target-3", name: "Target 3", template: "target", transform: { x: 16, y: 10.5, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "target-4", name: "Target 4", template: "target", transform: { x: 14.5, y: 9.5, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "target-5", name: "Target 5", template: "target", transform: { x: 15.5, y: 9.5, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "target-6", name: "Target 6", template: "target", transform: { x: 15, y: 8.5, angle: 0, scaleX: 1, scaleY: 1 } },
  ],
  joints: [
    {
      id: "pendulum-joint",
      type: "distance",
      entityA: "anchor",
      entityB: "ball",
      anchorA: { x: 5, y: 2 },
      anchorB: { x: 5, y: 6 },
      stiffness: 0,
      damping: 0,
    },
  ],
  rules: [],
};

export default game;
