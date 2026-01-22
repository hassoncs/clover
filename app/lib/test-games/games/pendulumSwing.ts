import type { GameDefinition } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Pendulum Swing",
  description: "Swing from rope to rope to reach the goal - don't fall on the spikes!",
};

const game: GameDefinition = {
  metadata: {
    id: "test-pendulum-swing",
    title: "Pendulum Swing",
    description: "Swing from rope to rope to reach the goal - don't fall on the spikes!",
    instructions: "Tap to jump onto swinging balls. Reach the green goal on the right!",
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
    showTimer: false,
    backgroundColor: "#1a1a2e",
  },
  winCondition: {
    type: "reach_entity",
    tag: "goal",
  },
  loseCondition: {
    type: "lives_zero",
  },
  initialLives: 3,
  templates: {
    player: {
      id: "player",
      tags: ["player"],
      sprite: { type: "circle", radius: 0.4, color: "#4ECDC4" },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: 0.4,
        density: 1,
        friction: 0.3,
        restitution: 0.2,
      },
      behaviors: [
        { type: "control", controlType: "tap_to_jump", force: 6 },
        { type: "destroy_on_collision", withTags: ["spikes"], effect: "fade" },
      ],
    },
    anchor: {
      id: "anchor",
      tags: ["anchor"],
      sprite: { type: "circle", radius: 0.25, color: "#6B7280" },
      physics: {
        bodyType: "static",
        shape: "circle",
        radius: 0.25,
        density: 0,
        friction: 0,
        restitution: 0,
      },
    },
    rope: {
      id: "rope",
      tags: ["rope"],
      sprite: { type: "rect", width: 0.1, height: 3, color: "#8B4513" },
      physics: {
        bodyType: "dynamic",
        shape: "box",
        width: 0.1,
        height: 3,
        density: 0.5,
        friction: 0.8,
        restitution: 0,
      },
    },
    platform: {
      id: "platform",
      tags: ["platform", "ground"],
      sprite: { type: "rect", width: 2, height: 0.4, color: "#374151" },
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
    spikes: {
      id: "spikes",
      tags: ["spikes", "hazard"],
      sprite: { type: "rect", width: 20, height: 0.5, color: "#EF4444" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 20,
        height: 0.5,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    goal: {
      id: "goal",
      tags: ["goal"],
      sprite: { type: "rect", width: 0.5, height: 2, color: "#10B981" },
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
    swingBall: {
      id: "swingBall",
      tags: ["swing"],
      sprite: { type: "circle", radius: 0.5, color: "#F59E0B" },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: 0.5,
        density: 2,
        friction: 0.8,
        restitution: 0.3,
      },
      behaviors: [
        { type: "score_on_collision", withTags: ["player"], points: 100, once: true },
      ],
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
        { type: "score_on_collision", withTags: ["player"], points: 50, once: true, showPopup: true },
        { type: "destroy_on_collision", withTags: ["player"], effect: "fade" },
      ],
    },
  },
  entities: [
    { id: "spikes", name: "Spike Pit", template: "spikes", transform: { x: 10, y: 11.5, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "start-platform", name: "Start Platform", template: "platform", transform: { x: 1.5, y: 9, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "end-platform", name: "End Platform", template: "platform", transform: { x: 18.5, y: 9, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "goal", name: "Goal", template: "goal", transform: { x: 19, y: 7.5, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "player", name: "Player", template: "player", transform: { x: 1.5, y: 8, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "anchor-1", name: "Anchor 1", template: "anchor", transform: { x: 5, y: 2, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "anchor-2", name: "Anchor 2", template: "anchor", transform: { x: 9, y: 2.5, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "anchor-3", name: "Anchor 3", template: "anchor", transform: { x: 13, y: 2, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "anchor-4", name: "Anchor 4", template: "anchor", transform: { x: 16, y: 3, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "swing-1", name: "Swing Ball 1", template: "swingBall", transform: { x: 5, y: 6, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "swing-2", name: "Swing Ball 2", template: "swingBall", transform: { x: 9, y: 6.5, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "swing-3", name: "Swing Ball 3", template: "swingBall", transform: { x: 13, y: 6, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "swing-4", name: "Swing Ball 4", template: "swingBall", transform: { x: 16, y: 7, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "coin-1", name: "Coin 1", template: "coin", transform: { x: 7, y: 5, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "coin-2", name: "Coin 2", template: "coin", transform: { x: 11, y: 4, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "coin-3", name: "Coin 3", template: "coin", transform: { x: 14.5, y: 5, angle: 0, scaleX: 1, scaleY: 1 } },
    {
      id: "ceiling",
      name: "Ceiling",
      tags: ["ceiling"],
      transform: { x: 10, y: 0.5, angle: 0, scaleX: 1, scaleY: 1 },
      sprite: { type: "rect", width: 20, height: 0.3, color: "#4B5563" },
      physics: { bodyType: "static", shape: "box", width: 20, height: 0.3, density: 0, friction: 0.5, restitution: 0.3 },
    },
  ],
  rules: [
    {
      id: "player_dies",
      name: "Player hits spikes",
      trigger: { type: "collision", entityATag: "player", entityBTag: "spikes" },
      actions: [
        { type: "destroy", target: { type: "by_tag", tag: "player" } },
      ],
    },
  ],
};

export default game;
