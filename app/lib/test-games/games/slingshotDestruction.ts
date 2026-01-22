import type { GameDefinition } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Slingshot Destruction",
  description: "Angry Birds-style physics - destroy all targets with limited shots",
};

const game: GameDefinition = {
  metadata: {
    id: "test-slingshot-destruction",
    title: "Slingshot Destruction",
    description: "Angry Birds-style physics - destroy all targets with limited shots",
    instructions: "Drag back on the ball to aim, release to launch. Destroy all green targets!",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: 9.8 },
    pixelsPerMeter: 50,
    bounds: { width: 25, height: 12 },
  },
  camera: { type: "fixed", zoom: 1 },
  ui: {
    showScore: true,
    showLives: true,
    showTimer: false,
    backgroundColor: "#1a1a2e",
  },
  winCondition: {
    type: "destroy_all",
    tag: "target",
  },
  loseCondition: {
    type: "lives_zero",
  },
  initialLives: 3,
  templates: {
    projectile: {
      id: "projectile",
      tags: ["projectile"],
      sprite: { type: "circle", radius: 0.4, color: "#FF6B6B" },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: 0.4,
        density: 2,
        friction: 0.3,
        restitution: 0.3,
      },
      behaviors: [],
    },
    woodBlock: {
      id: "woodBlock",
      tags: ["structure", "wood"],
      sprite: { type: "rect", width: 1, height: 0.3, color: "#8B4513" },
      physics: {
        bodyType: "dynamic",
        shape: "box",
        width: 1,
        height: 0.3,
        density: 0.5,
        friction: 0.6,
        restitution: 0.1,
      },
      behaviors: [
        { type: "destroy_on_collision", withTags: ["projectile"], effect: "explode", minImpactVelocity: 5 },
        { type: "score_on_collision", withTags: ["projectile"], points: 50 },
      ],
    },
    stoneBlock: {
      id: "stoneBlock",
      tags: ["structure", "stone"],
      sprite: { type: "rect", width: 1, height: 0.3, color: "#708090" },
      physics: {
        bodyType: "dynamic",
        shape: "box",
        width: 1,
        height: 0.3,
        density: 2,
        friction: 0.6,
        restitution: 0.1,
      },
      behaviors: [
        { type: "score_on_collision", withTags: ["projectile"], points: 25 },
      ],
    },
    tallWood: {
      id: "tallWood",
      tags: ["structure", "wood"],
      sprite: { type: "rect", width: 0.3, height: 1.2, color: "#A0522D" },
      physics: {
        bodyType: "dynamic",
        shape: "box",
        width: 0.3,
        height: 1.2,
        density: 0.5,
        friction: 0.6,
        restitution: 0.1,
      },
      behaviors: [
        { type: "destroy_on_collision", withTags: ["projectile"], effect: "explode", minImpactVelocity: 6 },
        { type: "score_on_collision", withTags: ["projectile"], points: 50 },
      ],
    },
    target: {
      id: "target",
      tags: ["target"],
      sprite: { type: "circle", radius: 0.5, color: "#90EE90" },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: 0.5,
        density: 1,
        friction: 0.5,
        restitution: 0.2,
      },
      behaviors: [
        { type: "destroy_on_collision", withTags: ["projectile"], effect: "explode" },
        { type: "score_on_collision", withTags: ["projectile"], points: 500 },
      ],
    },
    ground: {
      id: "ground",
      tags: ["ground"],
      sprite: { type: "rect", width: 25, height: 1, color: "#2d3436" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 25,
        height: 1,
        density: 0,
        friction: 0.8,
        restitution: 0.1,
      },
    },
  },
  entities: [
    { id: "ground", name: "Ground", template: "ground", transform: { x: 12.5, y: 11, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "projectile", name: "Projectile", template: "projectile", transform: { x: 2, y: 9.5, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "tall-1", name: "Tall Wood 1", template: "tallWood", transform: { x: 14, y: 9.65, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "tall-2", name: "Tall Wood 2", template: "tallWood", transform: { x: 16, y: 9.65, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "wood-1", name: "Wood Block 1", template: "woodBlock", transform: { x: 15, y: 8.85, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "tall-3", name: "Tall Wood 3", template: "tallWood", transform: { x: 14.5, y: 7.65, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "tall-4", name: "Tall Wood 4", template: "tallWood", transform: { x: 15.5, y: 7.65, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "wood-2", name: "Wood Block 2", template: "woodBlock", transform: { x: 15, y: 6.85, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "target-1", name: "Target 1", template: "target", transform: { x: 15, y: 6.1, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "tall-5", name: "Tall Wood 5", template: "tallWood", transform: { x: 19, y: 9.65, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "tall-6", name: "Tall Wood 6", template: "tallWood", transform: { x: 21, y: 9.65, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "stone-1", name: "Stone Block 1", template: "stoneBlock", transform: { x: 20, y: 8.85, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "tall-7", name: "Tall Wood 7", template: "tallWood", transform: { x: 20, y: 7.65, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "stone-2", name: "Stone Block 2", template: "stoneBlock", transform: { x: 20, y: 6.85, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "target-2", name: "Target 2", template: "target", transform: { x: 20, y: 9.1, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "target-3", name: "Target 3", template: "target", transform: { x: 20, y: 6.1, angle: 0, scaleX: 1, scaleY: 1 } },
  ],
  rules: [
    {
      id: "launch",
      name: "Launch",
      trigger: { type: "drag", phase: "end", target: "projectile" },
      actions: [
        { type: "apply_impulse", target: { type: "by_id", entityId: "projectile" }, direction: "drag_direction", force: 20 },
      ],
    },
  ],
};

export default game;
