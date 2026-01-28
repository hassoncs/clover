import type { GameDefinition } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

const ASSET_BASE = "https://slopcade-api.hassoncs.workers.dev/assets/generated/flappyBird";

export const metadata: TestGameMeta = {
  title: "Endless Scroll Playground",
  description: "Debug endless scrolling mechanics - pipes and background",
  titleHeroImageUrl: `${ASSET_BASE}/title_hero.png`,
  status: "active",
};

const WORLD_WIDTH = 12;
const WORLD_HEIGHT = 16;
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;
const cx = (x: number) => x - HALF_W;
const cy = (y: number) => HALF_H - y;

const PIPE_WIDTH = 1.2;
const PIPE_HEIGHT = 6;
const PIPE_GAP = 3.0;
const PIPE_SPEED = 15;
const GROUND_HEIGHT = 1.5;
const SPAWN_X = cx(WORLD_WIDTH + 2);

const game: GameDefinition = {
  metadata: {
    id: "endless-scroll-playground",
    title: "Endless Scroll Playground",
    description: "Debug endless scrolling mechanics - pipes and background",
    instructions: "Watch pipes scroll endlessly. Debug scrolling mechanics.",
    version: "1.0.0",
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
    showScore: false,
    showLives: false,
    showTimer: false,
    backgroundColor: "#70c5ce",
  },
  templates: {
    pipeTop: {
      id: "pipeTop",
      tags: ["pipe", "pipe-top"],
      visual: {
        type: "image",
        imageUrl: `${ASSET_BASE}/pipeTop.png`,
        imageWidth: PIPE_WIDTH,
        imageHeight: PIPE_HEIGHT,
      },
      physics: { bodyType: "kinematic", density: 0 },
      collider: { shape: "box", width: PIPE_WIDTH, height: PIPE_HEIGHT, friction: 0, restitution: 0 },
      behaviors: [
        { type: "move", direction: "left", speed: PIPE_SPEED },
        { type: "timer", duration: 2, action: "destroy" },
      ],
    },
    pipeBottom: {
      id: "pipeBottom",
      tags: ["pipe", "pipe-bottom"],
      visual: {
        type: "image",
        imageUrl: `${ASSET_BASE}/pipeBottom.png`,
        imageWidth: PIPE_WIDTH,
        imageHeight: PIPE_HEIGHT,
      },
      physics: { bodyType: "kinematic", density: 0 },
      collider: { shape: "box", width: PIPE_WIDTH, height: PIPE_HEIGHT, friction: 0, restitution: 0 },
      behaviors: [
        { type: "move", direction: "left", speed: PIPE_SPEED },
        { type: "timer", duration: 2, action: "destroy" },
      ],
    },
    ground: {
      id: "ground",
      tags: ["ground"],
      visual: {
        type: "image",
        imageUrl: `${ASSET_BASE}/ground.png`,
        imageWidth: WORLD_WIDTH + 4,
        imageHeight: GROUND_HEIGHT,
      },
      physics: { bodyType: "static", density: 0 },
      collider: { shape: "box", width: WORLD_WIDTH + 4, height: GROUND_HEIGHT, friction: 0.5, restitution: 0 },
    },
    ceiling: {
      id: "ceiling",
      tags: ["ceiling"],
      visual: {
        type: "image",
        imageUrl: `${ASSET_BASE}/ceiling.png`,
        imageWidth: WORLD_WIDTH + 4,
        imageHeight: 0.5,
      },
      physics: { bodyType: "static", density: 0 },
      collider: { shape: "box", width: WORLD_WIDTH + 4, height: 0.5, friction: 0, restitution: 0 },
    },
  },
  entities: [
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
  ],
  rules: [
    {
      id: "spawn_pipes",
      name: "Spawn pipe pairs",
      trigger: { type: "timer", time: 2.5, repeat: true },
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
      ],
    },
  ],
};

export default game;
