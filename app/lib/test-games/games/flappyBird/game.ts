import type { GameDefinition, PersistenceConfig } from "@slopcade/shared";
import { FlappyBirdProgressSchema, type FlappyBirdProgress } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

const ASSET_BASE = "https://slopcade-api.hassoncs.workers.dev/assets/generated/flappyBird";

export const metadata: TestGameMeta = {
  title: "Flappy Bird",
  description: "Tap to fly through the pipes without hitting them",
  titleHeroImageUrl: `${ASSET_BASE}/title_hero.png`,
  status: "archived",
};

const WORLD_WIDTH = 12;
const WORLD_HEIGHT = 16;
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;
const cx = (x: number) => x - HALF_W;
const cy = (y: number) => HALF_H - y;

const BIRD_RADIUS = 0.3;
const PIPE_WIDTH = 1.2;
const PIPE_HEIGHT = 6;
const PIPE_GAP = 3.0;
const PIPE_SPEED = 15;
const GROUND_HEIGHT = 1.5;
const SPAWN_X = cx(WORLD_WIDTH + 2);

/**
 * Persistence configuration for Flappy Bird.
 * Tracks high score, games played, and unlockables.
 */
export const flappyBirdPersistence: PersistenceConfig<FlappyBirdProgress> = {
  storageKey: "flappy-bird-progress",
  schema: FlappyBirdProgressSchema as unknown as PersistenceConfig<FlappyBirdProgress>["schema"],
  version: 1,
  defaultProgress: {
    version: 1,
    highScore: 0,
    gamesPlayed: 0,
    totalPipesPassed: 0,
    bestStreak: 0,
    unlockedBirds: ["default"],
    totalPlayTime: 0,
    sessionsCompleted: 0,
  },
  autoSave: {
    onGameLose: true,
    onBackground: true,
  },
};

const game: GameDefinition = {
  metadata: {
    id: "test-flappy-bird",
    title: "Flappy Bird",
    description: "Tap to fly through the pipes without hitting them",
    instructions: "Tap anywhere to flap! Avoid the pipes and ground.",
    version: "1.1.0",
    titleHeroImageUrl: `${ASSET_BASE}/title_hero.png`,
  },
  world: {
    gravity: { x: 0, y: -15 },
    pixelsPerMeter: 50,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  background: {
    type: "static",
    imageUrl: `${ASSET_BASE}/background.png`,
  },
  camera: { type: "fixed", zoom: 1 },
  ui: {
    showScore: true,
    showLives: false,
    showTimer: false,
    backgroundColor: "#70c5ce",
  },
  loseCondition: {
    type: "entity_destroyed",
    tag: "bird",
  },
  templates: {
    bird: {
      id: "bird",
      tags: ["bird"],
      sprite: { 
        type: "image", 
        imageUrl: `${ASSET_BASE}/bird.png`,
        imageWidth: BIRD_RADIUS * 2,
        imageHeight: BIRD_RADIUS * 2,
      },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: BIRD_RADIUS,
        density: 1,
        friction: 0,
        restitution: 0,
        fixedRotation: true,
      },
      behaviors: [
        { type: "destroy_on_collision", withTags: ["pipe", "ground", "ceiling"], effect: "fade" },
      ],
    },
    pipeTop: {
      id: "pipeTop",
      tags: ["pipe", "pipe-top"],
      sprite: { 
        type: "image", 
        imageUrl: `${ASSET_BASE}/pipeTop.png`,
        imageWidth: PIPE_WIDTH,
        imageHeight: PIPE_HEIGHT,
      },
      physics: {
        bodyType: "kinematic",
        shape: "box",
        width: PIPE_WIDTH,
        height: PIPE_HEIGHT,
        density: 0,
        friction: 0,
        restitution: 0,
      },
      behaviors: [
        { type: "move", direction: "left", speed: PIPE_SPEED },
        { type: "timer", duration: 8, action: "destroy" },
      ],
    },
    pipeBottom: {
      id: "pipeBottom",
      tags: ["pipe", "pipe-bottom"],
      sprite: { 
        type: "image", 
        imageUrl: `${ASSET_BASE}/pipeBottom.png`,
        imageWidth: PIPE_WIDTH,
        imageHeight: PIPE_HEIGHT,
      },
      physics: {
        bodyType: "kinematic",
        shape: "box",
        width: PIPE_WIDTH,
        height: PIPE_HEIGHT,
        density: 0,
        friction: 0,
        restitution: 0,
      },
      behaviors: [
        { type: "move", direction: "left", speed: PIPE_SPEED },
        { type: "timer", duration: 8, action: "destroy" },
      ],
    },
    scoreZone: {
      id: "scoreZone",
      tags: ["score-zone"],
      sprite: { type: "rect", width: 0.3, height: PIPE_GAP, color: "#00000000" },
      type: "zone",
      zone: {
        shape: { type: "box", width: 0.3, height: PIPE_GAP },
        movement: "kinematic",
      },
      behaviors: [
        { type: "move", direction: "left", speed: PIPE_SPEED },
        { type: "score_on_collision", withTags: ["bird"], points: 1, once: true },
        { type: "timer", duration: 8, action: "destroy" },
      ],
    },
    ground: {
      id: "ground",
      tags: ["ground"],
      sprite: { 
        type: "image", 
        imageUrl: `${ASSET_BASE}/ground.png`,
        imageWidth: WORLD_WIDTH + 4,
        imageHeight: GROUND_HEIGHT,
      },
      physics: {
        bodyType: "static",
        shape: "box",
        width: WORLD_WIDTH + 4,
        height: GROUND_HEIGHT,
        density: 0,
        friction: 0.5,
        restitution: 0,
      },
    },
    ceiling: {
      id: "ceiling",
      tags: ["ceiling"],
      sprite: { 
        type: "image", 
        imageUrl: `${ASSET_BASE}/ceiling.png`,
        imageWidth: WORLD_WIDTH + 4,
        imageHeight: 0.5,
      },
      physics: {
        bodyType: "static",
        shape: "box",
        width: WORLD_WIDTH + 4,
        height: 0.5,
        density: 0,
        friction: 0,
        restitution: 0,
      },
    },
  },
  entities: [
    {
      id: "bird",
      name: "Bird",
      template: "bird",
      transform: { x: cx(3), y: cy(WORLD_HEIGHT / 2), angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "ground",
      name: "Ground",
      template: "ground",
      transform: { x: 0, y: cy(WORLD_HEIGHT - GROUND_HEIGHT / 2), angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "ceiling",
      name: "Ceiling",
      template: "ceiling",
      transform: { x: 0, y: cy(0.25), angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "initial_pipe_bottom",
      name: "Initial Pipe Bottom",
      template: "pipeBottom",
      transform: { x: cx(8), y: cy(10) - PIPE_HEIGHT / 2, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "initial_pipe_top",
      name: "Initial Pipe Top",
      template: "pipeTop",
      transform: { x: cx(8), y: cy(10 - PIPE_GAP - PIPE_HEIGHT) + PIPE_HEIGHT / 2, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "initial_score_zone",
      name: "Initial Score Zone",
      template: "scoreZone",
      transform: { x: cx(8), y: cy(10 - PIPE_GAP / 2), angle: 0, scaleX: 1, scaleY: 1 },
    },
  ],
  rules: [
    {
      id: "tap_to_flap",
      name: "Tap to flap upward",
      trigger: { type: "tap" },
      actions: [
        { type: "set_velocity", target: { type: "by_tag", tag: "bird" }, y: 7 },
      ],
    },
    {
      id: "spawn_pipes_easy",
      name: "Spawn easy pipes (score 0-4)",
      trigger: { type: "timer", time: 2.5, repeat: true },
      conditions: [
        { type: "score", max: 4 },
      ],
      actions: [
        {
          type: "spawn",
          template: "pipeBottom",
          position: { type: "fixed", x: SPAWN_X, y: cy(10) - PIPE_HEIGHT / 2 },
        },
        {
          type: "spawn",
          template: "pipeTop",
          position: { type: "fixed", x: SPAWN_X, y: cy(10 - PIPE_GAP - PIPE_HEIGHT) + PIPE_HEIGHT / 2 },
        },
        {
          type: "spawn",
          template: "scoreZone",
          position: { type: "fixed", x: SPAWN_X, y: cy(10 - PIPE_GAP / 2) },
        },
      ],
    },
    {
      id: "spawn_pipes_medium",
      name: "Spawn medium pipes (score 5-9)",
      trigger: { type: "timer", time: 2.5, repeat: true },
      conditions: [
        { type: "score", min: 5, max: 9 },
      ],
      actions: [
        {
          type: "spawn",
          template: "pipeBottom",
          position: { type: "fixed", x: SPAWN_X, y: cy(9) - PIPE_HEIGHT / 2 },
        },
        {
          type: "spawn",
          template: "pipeTop",
          position: { type: "fixed", x: SPAWN_X, y: cy(9 - 2.6 - PIPE_HEIGHT) + PIPE_HEIGHT / 2 },
        },
        {
          type: "spawn",
          template: "scoreZone",
          position: { type: "fixed", x: SPAWN_X, y: cy(9 - 2.6 / 2) },
        },
      ],
    },
    {
      id: "spawn_pipes_hard",
      name: "Spawn hard pipes (score 10+)",
      trigger: { type: "timer", time: 2.5, repeat: true },
      conditions: [
        { type: "score", min: 10 },
      ],
      actions: [
        {
          type: "spawn",
          template: "pipeBottom",
          position: { type: "fixed", x: SPAWN_X, y: cy(8.5) - PIPE_HEIGHT / 2 },
        },
        {
          type: "spawn",
          template: "pipeTop",
          position: { type: "fixed", x: SPAWN_X, y: cy(8.5 - 2.2 - PIPE_HEIGHT) + PIPE_HEIGHT / 2 },
        },
        {
          type: "spawn",
          template: "scoreZone",
          position: { type: "fixed", x: SPAWN_X, y: cy(8.5 - 2.2 / 2) },
        },
      ],
    },
  ],
  persistence: flappyBirdPersistence,
};

export default game;
