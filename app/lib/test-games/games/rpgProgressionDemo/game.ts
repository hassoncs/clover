import type { GameDefinition } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "RPG Progression Demo",
  description: "Collect gems for XP and gold coins for resources. Level up to unlock abilities!",
};

const WORLD_WIDTH = 12;
const WORLD_HEIGHT = 8;

const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;

const cx = (x: number) => x - HALF_W;
const cy = (y: number) => HALF_H - y;

const game: GameDefinition = {
  metadata: {
    id: "test-rpg-progression-demo",
    title: "RPG Progression Demo",
    description: "Collect gems for XP and gold coins for resources. Level up to unlock abilities!",
    instructions: "Tap and drag the player to move. Collect yellow gems for XP and orange coins for gold. Reach level 2 to unlock double jump!",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: -9.8 },
    pixelsPerMeter: 50,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  camera: { type: "fixed", zoom: 1 },
  ui: {
    showScore: true,
    showLives: false,
    showTimer: true,
    backgroundColor: "#1a1a2e",
  },
  winCondition: {
    type: "score",
    score: 100,
  },
  loseCondition: {
    type: "time_up",
    time: 60,
  },
  initialScore: 0,
  templates: {
    player: {
      id: "player",
      tags: ["player"],
      sprite: {
        type: "rect",
        width: 0.6,
        height: 1,
        color: "#4A90E2",
      },
      physics: {
        bodyType: "dynamic",
        shape: "box",
        width: 0.6,
        height: 1,
        density: 1,
        friction: 0.3,
        restitution: 0.2,
        linearDamping: 2,
        fixedRotation: true,
      },
      behaviors: [],
    },
    xpGem: {
      id: "xpGem",
      tags: ["xp_gem"],
      sprite: {
        type: "circle",
        radius: 0.25,
        color: "#FFD700",
      },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: 0.25,
        density: 0.5,
        friction: 0.2,
        restitution: 0.6,
        linearDamping: 1,
      },
      behaviors: [
        {
          type: "destroy_on_collision",
          withTags: ["player"],
          effect: "fade",
        },
      ],
    },
    goldCoin: {
      id: "goldCoin",
      tags: ["gold_coin"],
      sprite: {
        type: "circle",
        radius: 0.2,
        color: "#FFA500",
      },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: 0.2,
        density: 0.4,
        friction: 0.2,
        restitution: 0.5,
        linearDamping: 1,
      },
      behaviors: [
        {
          type: "destroy_on_collision",
          withTags: ["player"],
          effect: "fade",
        },
      ],
    },
    ground: {
      id: "ground",
      tags: ["ground"],
      sprite: {
        type: "rect",
        width: WORLD_WIDTH,
        height: 0.5,
        color: "#8B4513",
      },
      physics: {
        bodyType: "static",
        shape: "box",
        width: WORLD_WIDTH,
        height: 0.5,
        density: 0,
        friction: 0.5,
        restitution: 0.1,
      },
    },
    platform: {
      id: "platform",
      tags: ["platform"],
      sprite: {
        type: "rect",
        width: 2,
        height: 0.4,
        color: "#6B4423",
      },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 2,
        height: 0.4,
        density: 0,
        friction: 0.5,
        restitution: 0.1,
      },
    },
  },
  entities: [
    {
      id: "player",
      name: "Player",
      template: "player",
      transform: { x: cx(6), y: cy(6), angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "ground",
      name: "Ground",
      template: "ground",
      transform: { x: cx(6), y: cy(7.75), angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "platform-1",
      name: "Platform 1",
      template: "platform",
      transform: { x: cx(2), y: cy(5.5), angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "platform-2",
      name: "Platform 2",
      template: "platform",
      transform: { x: cx(10), y: cy(5.5), angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "platform-3",
      name: "Platform 3",
      template: "platform",
      transform: { x: cx(6), y: cy(4), angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "xp-gem-1",
      name: "XP Gem 1",
      template: "xpGem",
      transform: { x: cx(1.5), y: cy(5), angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "xp-gem-2",
      name: "XP Gem 2",
      template: "xpGem",
      transform: { x: cx(4), y: cy(3.5), angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "xp-gem-3",
      name: "XP Gem 3",
      template: "xpGem",
      transform: { x: cx(8), y: cy(3.5), angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "xp-gem-4",
      name: "XP Gem 4",
      template: "xpGem",
      transform: { x: cx(10.5), y: cy(5), angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "xp-gem-5",
      name: "XP Gem 5",
      template: "xpGem",
      transform: { x: cx(6), y: cy(2.5), angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "gold-coin-1",
      name: "Gold Coin 1",
      template: "goldCoin",
      transform: { x: cx(2.5), y: cy(5), angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "gold-coin-2",
      name: "Gold Coin 2",
      template: "goldCoin",
      transform: { x: cx(3.5), y: cy(3.5), angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "gold-coin-3",
      name: "Gold Coin 3",
      template: "goldCoin",
      transform: { x: cx(8.5), y: cy(3.5), angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "gold-coin-4",
      name: "Gold Coin 4",
      template: "goldCoin",
      transform: { x: cx(9.5), y: cy(5), angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "gold-coin-5",
      name: "Gold Coin 5",
      template: "goldCoin",
      transform: { x: cx(6), y: cy(2), angle: 0, scaleX: 1, scaleY: 1 },
    },
  ],
  rules: [
    {
      id: "collect_xp_gem",
      name: "Collect XP gem - add XP and score",
      trigger: { type: "collision", entityATag: "player", entityBTag: "xp_gem" },
      actions: [
        {
          type: "progression_add_xp",
          progressionId: "player_progression",
          amount: 25,
        },
        {
          type: "score",
          operation: "add",
          value: 25,
        },
      ],
    },
    {
      id: "collect_gold_coin",
      name: "Collect gold coin - add resource",
      trigger: { type: "collision", entityATag: "player", entityBTag: "gold_coin" },
      actions: [
        {
          type: "resource_modify",
          resourceId: "gold",
          operation: "add",
          value: 10,
        },
        {
          type: "score",
          operation: "add",
          value: 10,
        },
      ],
    },
    {
      id: "level_up_unlock",
      name: "Unlock double jump at score 50 (level 2 equivalent)",
      trigger: { type: "score", threshold: 50, comparison: "gte" },
      actions: [
        {
          type: "progression_unlock",
          unlockId: "double_jump",
        },
      ],
      fireOnce: true,
    },
    {
      id: "player_move_left",
      name: "Move player left",
      trigger: { type: "tap", xMinPercent: 0, xMaxPercent: 33 },
      actions: [
        {
          type: "move",
          target: { type: "by_tag", tag: "player" },
          direction: "left",
          speed: 8,
        },
      ],
    },
    {
      id: "player_move_right",
      name: "Move player right",
      trigger: { type: "tap", xMinPercent: 67, xMaxPercent: 100 },
      actions: [
        {
          type: "move",
          target: { type: "by_tag", tag: "player" },
          direction: "right",
          speed: 8,
        },
      ],
    },
    {
      id: "player_jump",
      name: "Jump when tapping center",
      trigger: { type: "tap", xMinPercent: 33, xMaxPercent: 67 },
      actions: [
        {
          type: "apply_impulse",
          target: { type: "by_tag", tag: "player" },
          x: 0,
          y: -8,
        },
      ],
    },
  ],
};

export default game;
