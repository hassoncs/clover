import type { GameDefinition } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Falling Objects",
  description: "Catch the green balls, dodge the red boxes - survive 45 seconds!",
};

const game: GameDefinition = {
  metadata: {
    id: "test-falling-objects",
    title: "Falling Objects",
    description: "Catch the green balls, dodge the red boxes - survive 45 seconds!",
    instructions: "Drag the paddle to catch green balls (+50 pts). Avoid red boxes!",
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
    showLives: true,
    showTimer: true,
    timerCountdown: true,
    backgroundColor: "#1a1a2e",
  },
  winCondition: {
    type: "survive_time",
    time: 45,
  },
  loseCondition: {
    type: "lives_zero",
  },
  initialLives: 3,
  templates: {
    player: {
      id: "player",
      tags: ["player"],
      sprite: { type: "rect", width: 1.5, height: 0.5, color: "#4ECDC4" },
      physics: {
        bodyType: "kinematic",
        shape: "box",
        width: 1.5,
        height: 0.5,
        density: 0,
        friction: 0.5,
        restitution: 0.3,
      },
      behaviors: [],
    },
    ground: {
      id: "ground",
      tags: ["ground"],
      sprite: { type: "rect", width: 20, height: 0.5, color: "#4A5568" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 20,
        height: 0.5,
        density: 1,
        friction: 0.8,
        restitution: 0.1,
      },
    },
    goodBall: {
      id: "goodBall",
      tags: ["good", "collectible"],
      sprite: { type: "circle", radius: 0.4, color: "#10B981" },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: 0.4,
        density: 1,
        friction: 0.3,
        restitution: 0.6,
      },
      behaviors: [
        { type: "score_on_collision", withTags: ["player"], points: 50, once: true, showPopup: true },
        { type: "destroy_on_collision", withTags: ["player", "ground"], effect: "fade" },
      ],
    },
    badBox: {
      id: "badBox",
      tags: ["bad", "hazard"],
      sprite: { type: "rect", width: 0.8, height: 0.8, color: "#EF4444" },
      physics: {
        bodyType: "dynamic",
        shape: "box",
        width: 0.8,
        height: 0.8,
        density: 1,
        friction: 0.5,
        restitution: 0.3,
      },
      behaviors: [
        { type: "destroy_on_collision", withTags: ["ground"], effect: "fade" },
      ],
    },
    bonusBall: {
      id: "bonusBall",
      tags: ["bonus", "collectible"],
      sprite: { type: "circle", radius: 0.5, color: "#FFD700" },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: 0.5,
        density: 0.5,
        friction: 0.3,
        restitution: 0.8,
      },
      behaviors: [
        { type: "score_on_collision", withTags: ["player"], points: 200, once: true, showPopup: true },
        { type: "destroy_on_collision", withTags: ["player", "ground"], effect: "explode" },
      ],
    },
    spawnerGood: {
      id: "spawnerGood",
      tags: ["spawner"],
      sprite: { type: "rect", width: 0.1, height: 0.1, color: "#00000000" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 0.1,
        height: 0.1,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
      behaviors: [
        { type: "spawn_on_event", event: "timer", entityTemplate: "goodBall", spawnPosition: "random_in_bounds", bounds: { minX: 2, maxX: 18, minY: 0, maxY: 1 }, interval: 1.5, maxSpawns: 100 },
      ],
    },
    spawnerBad: {
      id: "spawnerBad",
      tags: ["spawner"],
      sprite: { type: "rect", width: 0.1, height: 0.1, color: "#00000000" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 0.1,
        height: 0.1,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
      behaviors: [
        { type: "spawn_on_event", event: "timer", entityTemplate: "badBox", spawnPosition: "random_in_bounds", bounds: { minX: 2, maxX: 18, minY: 0, maxY: 1 }, interval: 2, maxSpawns: 100 },
      ],
    },
    spawnerBonus: {
      id: "spawnerBonus",
      tags: ["spawner"],
      sprite: { type: "rect", width: 0.1, height: 0.1, color: "#00000000" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 0.1,
        height: 0.1,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
      behaviors: [
        { type: "spawn_on_event", event: "timer", entityTemplate: "bonusBall", spawnPosition: "random_in_bounds", bounds: { minX: 4, maxX: 16, minY: 0, maxY: 1 }, interval: 8, maxSpawns: 20 },
      ],
    },
  },
  entities: [
    { id: "ground", name: "Ground", template: "ground", transform: { x: 10, y: 11.5, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "player", name: "Player", template: "player", transform: { x: 10, y: 10.5, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "spawner-good", name: "Good Spawner", template: "spawnerGood", transform: { x: 10, y: 0.5, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "spawner-bad", name: "Bad Spawner", template: "spawnerBad", transform: { x: 10, y: 0.5, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "spawner-bonus", name: "Bonus Spawner", template: "spawnerBonus", transform: { x: 10, y: 0.5, angle: 0, scaleX: 1, scaleY: 1 } },
    {
      id: "wall-left",
      name: "Left Wall",
      tags: ["wall"],
      transform: { x: 0.25, y: 6, angle: 0, scaleX: 1, scaleY: 1 },
      sprite: { type: "rect", width: 0.5, height: 12, color: "#4A5568" },
      physics: { bodyType: "static", shape: "box", width: 0.5, height: 12, density: 0, friction: 0.5, restitution: 0.3 },
    },
    {
      id: "wall-right",
      name: "Right Wall",
      tags: ["wall"],
      transform: { x: 19.75, y: 6, angle: 0, scaleX: 1, scaleY: 1 },
      sprite: { type: "rect", width: 0.5, height: 12, color: "#4A5568" },
      physics: { bodyType: "static", shape: "box", width: 0.5, height: 12, density: 0, friction: 0.5, restitution: 0.3 },
    },
  ],
  rules: [
    {
      id: "move_player",
      name: "Drag Player",
      trigger: { type: "drag", phase: "move" },
      actions: [
        { type: "move", target: { type: "by_tag", tag: "player" }, direction: "toward_touch_x", speed: 20 },
      ],
    },
    {
      id: "player_hit_bad",
      name: "Player hit by hazard",
      trigger: { type: "collision", entityATag: "player", entityBTag: "bad" },
      actions: [
        { type: "destroy", target: { type: "by_tag", tag: "bad", count: 1 } },
      ],
    },
  ],
};

export default game;
