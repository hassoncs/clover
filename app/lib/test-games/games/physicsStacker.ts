import type { GameDefinition } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

const ASSET_BASE = "https://slopcade-api.hassoncs.workers.dev/assets/generated/item";

export const metadata: TestGameMeta = {
  title: "Block Stacker",
  description: "Stack blocks as high as you can! Higher stacks = more points!",
  titleHeroImageUrl: `${ASSET_BASE}/title_hero.jpg`,
};

const WORLD_WIDTH = 14;
const WORLD_HEIGHT = 18;
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;
const cx = (x: number) => x - HALF_W;
const cy = (y: number) => HALF_H - y;

const game: GameDefinition = {
  metadata: {
    id: "block-stacker",
    title: "Block Stacker",
    description: "Stack blocks as high as you can! Higher stacks = more points!",
    instructions: "Tap to drop blocks from the moving dropper. Land them on the platform to score. The higher your stack, the more points each block is worth! Reach 1000 points to win. Watch out - falling blocks cost you 100 points, and if your score goes below 0, you lose!",
    version: "1.0.0",
    titleHeroImageUrl: `${ASSET_BASE}/title_hero.jpg`,
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
    showTimer: false,
    backgroundColor: "#FFE4E1",
  },
  background: {
    type: "static",
    imageUrl: `${ASSET_BASE}/background.jpg`,
  },
  winCondition: {
    type: "score",
    score: 1000,
  },
  loseCondition: {
    type: "score_below",
    score: 0,
  },
  templates: {
    foundation: {
      id: "foundation",
      tags: ["ground"],
      sprite: {
        type: "image",
        imageUrl: `${ASSET_BASE}/foundation.png`,
        imageWidth: 4,
        imageHeight: 0.6,
      },
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
      sprite: {
        type: "image",
        imageUrl: `${ASSET_BASE}/dropper.png`,
        imageWidth: 2,
        imageHeight: 0.3,
      },
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
        { type: "spawn_on_event", event: "tap", entityTemplate: ["blockWide", "blockMedium", "blockSmall", "blockTall"], spawnPosition: "at_self", maxSpawns: 50, spawnEffect: "sparks" },
      ],
    },
    blockWide: {
      id: "blockWide",
      tags: ["block"],
      sprite: {
        type: "image",
        imageUrl: `${ASSET_BASE}/blockWide.png`,
        imageWidth: 1.8,
        imageHeight: 0.6,
      },
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
        { type: "score_on_collision", withTags: ["block", "ground"], points: { expr: "floor(50 * pow(1.3, max(0, self.transform.y + 7)))" }, once: true },
      ],
    },
    blockMedium: {
      id: "blockMedium",
      tags: ["block"],
      sprite: {
        type: "image",
        imageUrl: `${ASSET_BASE}/blockMedium.png`,
        imageWidth: 1.4,
        imageHeight: 0.6,
      },
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
        { type: "score_on_collision", withTags: ["block", "ground"], points: { expr: "floor(60 * pow(1.3, max(0, self.transform.y + 7)))" }, once: true },
      ],
    },
    blockSmall: {
      id: "blockSmall",
      tags: ["block"],
      sprite: {
        type: "image",
        imageUrl: `${ASSET_BASE}/blockSmall.png`,
        imageWidth: 1.0,
        imageHeight: 0.6,
      },
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
        { type: "score_on_collision", withTags: ["block", "ground"], points: { expr: "floor(70 * pow(1.3, max(0, self.transform.y + 7)))" }, once: true },
      ],
    },
    blockTall: {
      id: "blockTall",
      tags: ["block"],
      sprite: {
        type: "image",
        imageUrl: `${ASSET_BASE}/blockTall.png`,
        imageWidth: 0.6,
        imageHeight: 1.2,
      },
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
        { type: "score_on_collision", withTags: ["block", "ground"], points: { expr: "floor(80 * pow(1.3, max(0, self.transform.y + 7)))" }, once: true },
      ],
    },
    deathZone: {
      id: "deathZone",
      tags: ["death-zone"],
      sprite: { type: "rect", width: 20, height: 2, color: "transparent" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 20,
        height: 2,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
  },
  entities: [
    { id: "foundation", name: "Foundation", template: "foundation", transform: { x: cx(7), y: cy(16), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "dropper", name: "Block Dropper", template: "dropper", transform: { x: cx(7), y: cy(2), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "death-zone", name: "Death Zone", template: "deathZone", transform: { x: cx(7), y: cy(19), angle: 0, scaleX: 1, scaleY: 1 } },
  ],
  rules: [
    {
      id: "block-drop-sound",
      name: "Play thud when dropping block",
      trigger: { type: "tap" },
      actions: [{ type: "sound", soundId: "res://sounds/thud.mp3" }],
    },
    {
      id: "block-fell-penalty",
      name: "Penalize fallen blocks",
      trigger: { type: "collision", entityATag: "block", entityBTag: "death-zone" },
      actions: [
        { type: "score", operation: "subtract", value: 100 },
        { type: "destroy", target: { type: "collision_entities" } },
      ],
    },
    {
      id: "block-land-sound",
      name: "Play thud when block lands",
      trigger: { type: "collision", entityATag: "block", entityBTag: "ground" },
      actions: [{ type: "sound", soundId: "res://sounds/thud.mp3" }],
      cooldown: 0.1,
    },
    {
      id: "block-stack-sound",
      name: "Play thud when blocks stack",
      trigger: { type: "collision", entityATag: "block", entityBTag: "block" },
      actions: [{ type: "sound", soundId: "res://sounds/thud.mp3" }],
      cooldown: 0.1,
    },
  ],
};

export default game;
