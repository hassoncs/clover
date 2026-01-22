import type { GameDefinition } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Physics Stacker",
  description: "Stack blocks as high as you can! Higher stacks = more points!",
};

const game: GameDefinition = {
  metadata: {
    id: "test-physics-stacker",
    title: "Physics Stacker",
    description: "Stack blocks as high as you can! Higher stacks = more points!",
    instructions: "Tap to drop blocks from the moving dropper. Land them on the platform to score. The higher your stack, the more points each block is worth! Reach 1000 points to win - but don't let any blocks fall off!",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: 9.8 },
    pixelsPerMeter: 50,
    bounds: { width: 14, height: 18 },
  },
  camera: { type: "fixed", zoom: 1 },
  ui: {
    showScore: true,
    showLives: false,
    showTimer: false,
    backgroundColor: "#FFE4E1",
  },
  winCondition: {
    type: "score",
    score: 1000,
  },
  loseCondition: {
    type: "entity_exits_screen",
    tag: "block",
  },
  templates: {
    foundation: {
      id: "foundation",
      tags: ["ground"],
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
    dropper: {
      id: "dropper",
      tags: ["dropper"],
      sprite: { type: "rect", width: 2, height: 0.3, color: "#666666" },
      physics: {
        bodyType: "kinematic",
        shape: "box",
        width: 2,
        height: 0.3,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
      behaviors: [
        { type: "oscillate", axis: "x", amplitude: 4, frequency: 0.3 },
        { type: "spawn_on_event", event: "tap", entityTemplate: "blockWide", spawnPosition: "at_self", maxSpawns: 50, spawnEffect: "sparks" },
      ],
    },
    blockWide: {
      id: "blockWide",
      tags: ["block"],
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
      behaviors: [
        { type: "score_on_collision", withTags: ["block", "ground"], points: { expr: "floor(50 * pow(1.3, max(0, 16 - self.transform.y)))" }, once: true },
      ],
    },
    blockMedium: {
      id: "blockMedium",
      tags: ["block"],
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
      behaviors: [
        { type: "score_on_collision", withTags: ["block", "ground"], points: { expr: "floor(60 * pow(1.3, max(0, 16 - self.transform.y)))" }, once: true },
      ],
    },
    blockSmall: {
      id: "blockSmall",
      tags: ["block"],
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
      behaviors: [
        { type: "score_on_collision", withTags: ["block", "ground"], points: { expr: "floor(70 * pow(1.3, max(0, 16 - self.transform.y)))" }, once: true },
      ],
    },
    blockTall: {
      id: "blockTall",
      tags: ["block"],
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
      behaviors: [
        { type: "score_on_collision", withTags: ["block", "ground"], points: { expr: "floor(80 * pow(1.3, max(0, 16 - self.transform.y)))" }, once: true },
      ],
    },
  },
  entities: [
    { id: "foundation", name: "Foundation", template: "foundation", transform: { x: 7, y: 16, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "dropper", name: "Block Dropper", template: "dropper", transform: { x: 7, y: 2, angle: 0, scaleX: 1, scaleY: 1 } },
  ],
};

export default game;
