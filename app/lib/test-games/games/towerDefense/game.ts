import type { GameDefinition } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Tower Defense",
  description: "Defend your base from waves of enemies. Towers target nearest enemies and fire projectiles. Enemies follow a path to reach your base.",
  status: "archived",
};

const WORLD_WIDTH = 16;
const WORLD_HEIGHT = 10;

const TOWER_WIDTH = 0.8;
const TOWER_HEIGHT = 0.8;
const ENEMY_RADIUS = 0.4;
const PROJECTILE_RADIUS = 0.2;
const BASE_WIDTH = 1.2;
const BASE_HEIGHT = 1.2;

const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;

const cx = (x: number) => x - HALF_W;
const cy = (y: number) => HALF_H - y;

const game: GameDefinition = {
  metadata: {
    id: "test-tower-defense",
    title: "Tower Defense",
    description: "Defend your base from waves of enemies. Towers target nearest enemies and fire projectiles. Enemies follow a path to reach your base.",
    instructions: "Towers automatically target and fire at the nearest enemy. Survive 60 seconds to win!",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: 50,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  camera: { type: "fixed", zoom: 1 },
  ui: {
    showScore: true,
    showLives: true,
    showTimer: true,
    backgroundColor: "#1a3a2e",
  },
  winCondition: {
    type: "survive_time",
    time: 60,
  },
  loseCondition: {
    type: "lives_zero",
  },
  initialLives: 3,
  initialScore: 0,
  templates: {
    tower: {
      id: "tower",
      tags: ["tower"],
      sprite: { type: "rect", width: TOWER_WIDTH, height: TOWER_HEIGHT, color: "#4A90E2" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: TOWER_WIDTH,
        height: TOWER_HEIGHT,
        density: 0,
        friction: 0,
        restitution: 0,
      },
      behaviors: [],
    },
    enemy: {
      id: "enemy",
      tags: ["enemy"],
      sprite: { type: "circle", radius: ENEMY_RADIUS, color: "#E74C3C" },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: ENEMY_RADIUS,
        density: 1,
        friction: 0.5,
        restitution: 0.3,
        linearDamping: 2,
      },
      behaviors: [],
    },
    projectile: {
      id: "projectile",
      tags: ["projectile"],
      sprite: { type: "circle", radius: PROJECTILE_RADIUS, color: "#F1C40F" },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: PROJECTILE_RADIUS,
        density: 0.5,
        friction: 0,
        restitution: 0.8,
        bullet: true,
      },
      behaviors: [
        { type: "destroy_on_collision", withTags: ["enemy"], effect: "fade" },
        { type: "score_on_collision", withTags: ["enemy"], points: 10 },
        { type: "timer", duration: 5, action: "destroy" },
      ],
    },
    base: {
      id: "base",
      tags: ["base"],
      sprite: { type: "rect", width: BASE_WIDTH, height: BASE_HEIGHT, color: "#27AE60" },
      type: "zone",
      zone: {
        shape: { type: "box", width: BASE_WIDTH, height: BASE_HEIGHT },
      },
      behaviors: [],
    },
  },
  entities: [
    { id: "tower-1", name: "Tower 1", template: "tower", transform: { x: cx(2), y: cy(3), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "tower-2", name: "Tower 2", template: "tower", transform: { x: cx(8), y: cy(3), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "tower-3", name: "Tower 3", template: "tower", transform: { x: cx(5), y: cy(7), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "base", name: "Base", template: "base", transform: { x: cx(14), y: cy(5), angle: 0, scaleX: 1, scaleY: 1 } },
  ],
  rules: [
    {
      id: "start_waves",
      name: "Start enemy waves at game start",
      trigger: { type: "gameStart" },
      actions: [
        { type: "waves_start", waveDefId: "enemy_waves" },
      ],
    },
    {
      id: "spawn_next_wave",
      name: "Spawn next wave when all enemies destroyed",
      trigger: { type: "entity_count", tag: "enemy", count: 0, comparison: "zero" },
      actions: [
        { type: "waves_next", waveDefId: "enemy_waves" },
      ],
    },
    {
      id: "tower_target",
      name: "Towers find nearest enemy",
      trigger: { type: "timer", time: 0.5, repeat: true },
      actions: [
        {
          type: "target_nearest",
          source: { type: "by_tag", tag: "tower" },
          targetTags: ["enemy"],
          storeIn: "nearest_enemy",
        },
      ],
    },
    {
      id: "enemy_path_start",
      name: "Enemy follows path when spawned",
      trigger: { type: "collision", entityATag: "enemy", entityBTag: "spawn_zone" },
      actions: [
        {
          type: "path_start",
          pathId: "enemy_path",
          target: { type: "self" },
          speed: 3,
        },
      ],
    },
    {
      id: "enemy_reaches_base",
      name: "Enemy reaches base - lose a life",
      trigger: { type: "collision", entityATag: "enemy", entityBTag: "base" },
      actions: [
        { type: "lives", operation: "subtract", value: 1 },
        { type: "destroy", target: { type: "by_tag", tag: "enemy" } },
      ],
    },
    {
      id: "path_stop",
      name: "Stop path when enemy reaches base",
      trigger: { type: "collision", entityATag: "enemy", entityBTag: "base" },
      actions: [
        {
          type: "path_stop",
          target: { type: "self" },
        },
      ],
    },
  ],
};

export default game;
