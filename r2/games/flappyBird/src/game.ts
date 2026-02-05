import type { GameDefinition, PersistenceConfig } from "@slopcade/shared";
import { FlappyBirdProgressSchema, type FlappyBirdProgress } from "@slopcade/shared";

export const metadata = {
  title: "Flappy Bird",
  description: "Tap to fly through the pipes without hitting them",
  status: "active",
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
const PIPE_GAP_MIN = 2.2;
const PIPE_GAP_HARD = 1.8;
const PIPE_SPEED = 15;
const GROUND_HEIGHT = 1.5;
const SPAWN_X = cx(WORLD_WIDTH + 2);
const MIN_PIPE_Y = 4.5;
const MAX_PIPE_Y = 10.5;

// Gap positioning constants
const MIN_GAP_Y = 4; // Minimum gap center height (from bottom)
const MAX_GAP_Y = 12; // Maximum gap center height (from bottom)
const GROUND_CLEARANCE = 2; // Minimum space from ground
const CEILING_CLEARANCE = 1; // Minimum space from ceiling

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
  assetSystem: { activePackId: "default" },
  metadata: {
    id: "b3f08df4-1a94-49ca-b080-6f157c953864",
    slug: "flappyBird",
    title: "Flappy Bird",
    description: "Tap to fly through the pipes without hitting them",
    instructions: "Tap anywhere to flap! Avoid the pipes and ground.",
    version: "1.1.0",
  },
  world: {
    gravity: { x: 0, y: -15 },
    pixelsPerMeter: 50,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  background: {
    type: "static",
  },
  camera: { type: "fixed", zoom: 1 },
  ui: {
    showTimer: false,
    backgroundColor: "#70c5ce",
    variableDisplays: [
      { name: 'score', label: 'Score' },
    ],
  },
  loseCondition: {
    type: "entity_destroyed",
    tag: "bird",
  },
  templates: {
    bird: {
      id: "bird",
      tags: ["bird"],
      visual: {
        type: "image",
        whatDescription: "a small yellow bird with wings",
        imageWidth: BIRD_RADIUS * 2,
        imageHeight: BIRD_RADIUS * 2,
      },
      physics: {
        bodyType: "dynamic",
        density: 1,
        fixedRotation: true,
      },
      collider: {
        shape: "circle",
        radius: BIRD_RADIUS,
        friction: 0,
        restitution: 0,
      },
      behaviors: [
        { type: "destroy_on_collision", withTags: ["pipe", "ground", "ceiling"], effect: "fade" },
      ],
    },
    pipeTop: {
      id: "pipeTop",
      tags: ["pipe", "pipe-top"],
      visual: {
        type: "image",
        whatDescription: "a green pipe obstacle pointing downward",
        imageWidth: PIPE_WIDTH,
        imageHeight: PIPE_HEIGHT,
      },
      physics: {
        bodyType: "kinematic",
        density: 0,
      },
      collider: {
        shape: "box",
        width: PIPE_WIDTH,
        height: PIPE_HEIGHT,
        friction: 0,
        restitution: 0,
      },
      // No behaviors - parent moves the group
    },
    pipeBottom: {
      id: "pipeBottom",
      tags: ["pipe", "pipe-bottom"],
      visual: {
        type: "image",
        whatDescription: "a green pipe obstacle pointing upward",
        imageWidth: PIPE_WIDTH,
        imageHeight: PIPE_HEIGHT,
      },
      physics: {
        bodyType: "kinematic",
        density: 0,
      },
      collider: {
        shape: "box",
        width: PIPE_WIDTH,
        height: PIPE_HEIGHT,
        friction: 0,
        restitution: 0,
      },
      // No behaviors - parent moves the group
    },
    scoreZone: {
      id: "scoreZone",
      tags: ["score-zone"],
      visual: { type: "rect", width: 0.3, height: PIPE_GAP, color: "#00000000" },
      collider: {
        shape: "box",
        width: 0.3,
        height: PIPE_GAP,
        isSensor: true,
      },
      behaviors: [
        { type: "score_on_collision", withTags: ["bird"], points: 1, once: true },
      ],
    },
    pipeGroup: {
      id: "pipeGroup",
      tags: ["pipe-group", "obstacle"],
      // Invisible parent that moves and positions children
      behaviors: [
        { type: "translate", direction: { type: "vector", x: -1, y: 0 }, speed: PIPE_SPEED },
        { type: "destroy_when_off_screen", edge: "left", buffer: 2, recursive: true },
        {
          type: "configure_children_at_spawn",
          configs: [
            {
              childName: "pipeTop",
              property: "localTransform.y",
              randomRange: [cy(MAX_PIPE_Y) + PIPE_HEIGHT / 2, cy(MIN_PIPE_Y) + PIPE_HEIGHT / 2],
            },
            {
              childName: "pipeBottom",
              property: "localTransform.y",
              offsetFrom: "pipeTop",
              offset: -(PIPE_GAP + PIPE_HEIGHT),
            },
            {
              childName: "scoreZone",
              property: "localTransform.y",
              offsetFrom: "pipeTop",
              offset: -(PIPE_GAP / 2 + PIPE_HEIGHT / 2),
            },
          ],
        },
      ],
      children: [
        {
          name: "pipeTop",
          template: "pipeTop",
          localTransform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        },
        {
          name: "pipeBottom",
          template: "pipeBottom",
          localTransform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        },
        {
          name: "scoreZone",
          template: "scoreZone",
          localTransform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        }
      ]
    },
    ground: {
      id: "ground",
      tags: ["ground"],
      visual: { 
        type: "image", 
        whatDescription: "a grassy ground floor",
        imageWidth: WORLD_WIDTH + 4,
        imageHeight: GROUND_HEIGHT,
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "box",
        width: WORLD_WIDTH + 4,
        height: GROUND_HEIGHT,
        friction: 0.5,
        restitution: 0,
      },
    },
    ceiling: {
      id: "ceiling",
      tags: ["ceiling"],
      visual: { 
        type: "image", 
        whatDescription: "a sky ceiling boundary",
        imageWidth: WORLD_WIDTH + 4,
        imageHeight: 0.5,
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "box",
        width: WORLD_WIDTH + 4,
        height: 0.5,
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
      id: "initial_pipe_group",
      name: "Initial Pipe Group",
      template: "pipeGroup",
      transform: { x: cx(8), y: 0, angle: 0, scaleX: 1, scaleY: 1 },
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
      id: "spawn_pipes",
      name: "Spawn pipe groups",
      trigger: { type: "timer", time: 2.5, repeat: true },
      actions: [
        {
          type: "spawn",
          template: "pipeGroup",
          position: { type: "fixed", x: SPAWN_X, y: 0 },
        },
      ],
    },
  ],
  persistence: flappyBirdPersistence,
};

export default game;
