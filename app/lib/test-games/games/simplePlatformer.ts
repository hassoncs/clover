import type { GameDefinition } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Simple Platformer",
  description: "Jump between platforms, collect coins, reach the goal flag",
};

const game: GameDefinition = {
  metadata: {
    id: "test-simple-platformer",
    title: "Simple Platformer",
    description: "Jump between platforms, collect coins, reach the goal flag",
    instructions: "Tap to jump, tilt to move. Collect coins and reach the green flag!",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: 12 },
    pixelsPerMeter: 50,
    bounds: { width: 25, height: 15 },
  },
  camera: { type: "fixed", zoom: 1 },
  ui: {
    showScore: true,
    showLives: false,
    showTimer: false,
    backgroundColor: "#87CEEB",
  },
  winCondition: {
    type: "reach_entity",
    tag: "goal",
  },
  loseCondition: {
    type: "entity_destroyed",
    tag: "player",
  },
  templates: {
    player: {
      id: "player",
      tags: ["player"],
      sprite: { type: "rect", width: 0.7, height: 1, color: "#4ECDC4" },
      physics: {
        bodyType: "dynamic",
        shape: "box",
        width: 0.7,
        height: 1,
        density: 1,
        friction: 0.3,
        restitution: 0,
        fixedRotation: true,
      },
      behaviors: [
        { type: "destroy_on_collision", withTags: ["enemy", "hazard"], effect: "fade" },
      ],
    },
    platform: {
      id: "platform",
      tags: ["platform", "ground"],
      sprite: { type: "rect", width: 3, height: 0.5, color: "#FFFFFF" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 3,
        height: 0.5,
        density: 0,
        friction: 0.9,
        restitution: 0,
      },
    },
    smallPlatform: {
      id: "smallPlatform",
      tags: ["platform"],
      sprite: { type: "rect", width: 2, height: 0.4, color: "#E0E0E0" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 2,
        height: 0.4,
        density: 0,
        friction: 0.9,
        restitution: 0,
      },
    },
    coin: {
      id: "coin",
      tags: ["collectible", "coin"],
      sprite: { type: "circle", radius: 0.3, color: "#FFD700" },
      physics: {
        bodyType: "static",
        shape: "circle",
        radius: 0.3,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
      behaviors: [
        { type: "score_on_collision", withTags: ["player"], points: 100, once: true, showPopup: true },
        { type: "destroy_on_collision", withTags: ["player"], effect: "fade" },
      ],
    },
    enemy: {
      id: "enemy",
      tags: ["enemy"],
      sprite: { type: "circle", radius: 0.4, color: "#e74c3c" },
      physics: {
        bodyType: "kinematic",
        shape: "circle",
        radius: 0.4,
        density: 0,
        friction: 0,
        restitution: 0,
      },
      behaviors: [
        { type: "oscillate", axis: "x", amplitude: 1.5, frequency: 0.5 },
      ],
    },
    goal: {
      id: "goal",
      tags: ["goal"],
      sprite: { type: "rect", width: 0.5, height: 2, color: "#27ae60" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 0.5,
        height: 2,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    deathZone: {
      id: "deathZone",
      tags: ["hazard"],
      sprite: { type: "rect", width: 30, height: 1, color: "#FF000022" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 30,
        height: 1,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
  },
  entities: [
    { id: "player", name: "Player", template: "player", transform: { x: 2, y: 11, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "death-zone", name: "Death Zone", template: "deathZone", transform: { x: 12.5, y: 15.5, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "ground", name: "Ground", template: "platform", transform: { x: 3, y: 13, angle: 0, scaleX: 2, scaleY: 1 } },
    { id: "plat-1", name: "Platform 1", template: "platform", transform: { x: 7, y: 11, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "plat-2", name: "Platform 2", template: "smallPlatform", transform: { x: 11, y: 9, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "plat-3", name: "Platform 3", template: "platform", transform: { x: 15, y: 10, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "plat-4", name: "Platform 4", template: "smallPlatform", transform: { x: 18, y: 8, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "plat-5", name: "Platform 5", template: "platform", transform: { x: 22, y: 9, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "plat-high-1", name: "High Platform 1", template: "smallPlatform", transform: { x: 9, y: 6, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "plat-high-2", name: "High Platform 2", template: "smallPlatform", transform: { x: 13, y: 5, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "coin-1", name: "Coin 1", template: "coin", transform: { x: 7, y: 10, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "coin-2", name: "Coin 2", template: "coin", transform: { x: 11, y: 8, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "coin-3", name: "Coin 3", template: "coin", transform: { x: 15, y: 9, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "coin-4", name: "Coin 4", template: "coin", transform: { x: 18, y: 7, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "coin-5", name: "Coin 5", template: "coin", transform: { x: 22, y: 8, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "coin-6", name: "Coin 6", template: "coin", transform: { x: 9, y: 5, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "coin-7", name: "Coin 7", template: "coin", transform: { x: 13, y: 4, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "enemy-1", name: "Enemy 1", template: "enemy", transform: { x: 12, y: 8.2, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "enemy-2", name: "Enemy 2", template: "enemy", transform: { x: 19, y: 7.2, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "goal", name: "Goal Flag", template: "goal", transform: { x: 23.5, y: 7.5, angle: 0, scaleX: 1, scaleY: 1 } },
  ],
  rules: [
    {
      id: "jump",
      name: "Jump",
      trigger: { type: "tap" },
      conditions: [{ type: "on_ground", value: true }],
      actions: [{ type: "apply_impulse", target: { type: "by_tag", tag: "player" }, y: -8 }],
    },
    {
      id: "move",
      name: "Tilt Move",
      trigger: { type: "tilt", threshold: 0.1 },
      actions: [{ type: "move", target: { type: "by_tag", tag: "player" }, direction: "tilt_direction", speed: 6 }],
    },
  ],
};

export default game;
