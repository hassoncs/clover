import type { GameDefinition } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Monster Builder",
  description: "Build a monster by attaching parts to slots on the body",
};

const game: GameDefinition = {
  metadata: {
    id: "test-monster-builder",
    title: "Monster Builder",
    description: "Build a monster by attaching parts to slots on the body",
    instructions: "HOW TO PLAY: Tap to spawn random monster parts that attach to the monster body. The monster body oscillates - watch the parts follow! Spawn 5 parts to win.",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: 50,
    bounds: { width: 20, height: 12 },
  },
  camera: { type: "fixed", zoom: 1 },
  ui: {
    showScore: true,
    showLives: false,
    showTimer: false,
    backgroundColor: "#1a1a2e",
  },
  winCondition: {
    type: "score",
    score: 5,
  },
  templates: {
    monsterBody: {
      id: "monsterBody",
      tags: ["body", "monster"],
      sprite: { type: "rect", width: 3, height: 2, color: "#6B21A8" },
      physics: {
        bodyType: "kinematic",
        shape: "box",
        width: 3,
        height: 2,
        density: 0,
        friction: 0,
        restitution: 0,
      },
      slots: {
        head: { x: 0, y: -1.5, layer: 1 },
        leftArm: { x: -2, y: 0, layer: 0 },
        rightArm: { x: 2, y: 0, layer: 0 },
        leftLeg: { x: -0.8, y: 1.5, layer: -1 },
        rightLeg: { x: 0.8, y: 1.5, layer: -1 },
      },
      behaviors: [
        { type: "oscillate", axis: "x", amplitude: 3, frequency: 0.3 },
      ],
    },
    monsterHead: {
      id: "monsterHead",
      tags: ["part", "head"],
      sprite: { type: "circle", radius: 0.8, color: "#A855F7" },
      behaviors: [
        { type: "attach_to", parentTag: "body", slotName: "head", inheritRotation: true },
      ],
    },
    monsterArmLeft: {
      id: "monsterArmLeft",
      tags: ["part", "arm"],
      sprite: { type: "rect", width: 1.2, height: 0.4, color: "#7C3AED" },
      behaviors: [
        { type: "attach_to", parentTag: "body", slotName: "leftArm", inheritRotation: true },
      ],
    },
    monsterArmRight: {
      id: "monsterArmRight",
      tags: ["part", "arm"],
      sprite: { type: "rect", width: 1.2, height: 0.4, color: "#7C3AED" },
      behaviors: [
        { type: "attach_to", parentTag: "body", slotName: "rightArm", inheritRotation: true },
      ],
    },
    monsterLegLeft: {
      id: "monsterLegLeft",
      tags: ["part", "leg"],
      sprite: { type: "rect", width: 0.5, height: 1, color: "#5B21B6" },
      behaviors: [
        { type: "attach_to", parentTag: "body", slotName: "leftLeg", inheritRotation: true },
      ],
    },
    monsterLegRight: {
      id: "monsterLegRight",
      tags: ["part", "leg"],
      sprite: { type: "rect", width: 0.5, height: 1, color: "#5B21B6" },
      behaviors: [
        { type: "attach_to", parentTag: "body", slotName: "rightLeg", inheritRotation: true },
      ],
    },
    partSpawner: {
      id: "partSpawner",
      tags: ["spawner"],
      sprite: { type: "rect", width: 0.1, height: 0.1, color: "transparent" },
      behaviors: [
        {
          type: "spawn_on_event",
          event: "tap",
          entityTemplate: ["monsterHead", "monsterArmLeft", "monsterArmRight", "monsterLegLeft", "monsterLegRight"],
          spawnPosition: "at_self",
          maxSpawns: 5,
        },
      ],
    },
  },
  entities: [
    { id: "monster-body", name: "Monster Body", template: "monsterBody", transform: { x: 10, y: 6, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "spawner", name: "Part Spawner", template: "partSpawner", transform: { x: 10, y: 6, angle: 0, scaleX: 1, scaleY: 1 } },
  ],
  rules: [
    {
      id: "score_on_first_part",
      name: "Score when first part spawns",
      trigger: { type: "entity_count", tag: "part", count: 1, comparison: "eq" },
      actions: [{ type: "score", operation: "set", value: 1 }],
      fireOnce: true,
    },
    {
      id: "score_on_second_part",
      name: "Score when second part spawns",
      trigger: { type: "entity_count", tag: "part", count: 2, comparison: "eq" },
      actions: [{ type: "score", operation: "set", value: 2 }],
      fireOnce: true,
    },
    {
      id: "score_on_third_part",
      name: "Score when third part spawns",
      trigger: { type: "entity_count", tag: "part", count: 3, comparison: "eq" },
      actions: [{ type: "score", operation: "set", value: 3 }],
      fireOnce: true,
    },
    {
      id: "score_on_fourth_part",
      name: "Score when fourth part spawns",
      trigger: { type: "entity_count", tag: "part", count: 4, comparison: "eq" },
      actions: [{ type: "score", operation: "set", value: 4 }],
      fireOnce: true,
    },
    {
      id: "score_on_fifth_part",
      name: "Score when fifth part spawns",
      trigger: { type: "entity_count", tag: "part", count: 5, comparison: "eq" },
      actions: [{ type: "score", operation: "set", value: 5 }],
      fireOnce: true,
    },
  ],
};

export default game;
