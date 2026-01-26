import type { GameDefinition } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Flappy Bird",
  description: "Tap to fly through the pipes without hitting them",
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
const PIPE_GAP = 3.5;
const PIPE_SPEED = 3;
const GROUND_HEIGHT = 1.5;
const SPAWN_X = cx(WORLD_WIDTH + 2);

const PIPE_POSITIONS = [
  { bottomY: cy(12), topY: cy(12 - PIPE_GAP - PIPE_HEIGHT), gapY: cy(12 - PIPE_GAP / 2) },
  { bottomY: cy(10), topY: cy(10 - PIPE_GAP - PIPE_HEIGHT), gapY: cy(10 - PIPE_GAP / 2) },
  { bottomY: cy(8), topY: cy(8 - PIPE_GAP - PIPE_HEIGHT), gapY: cy(8 - PIPE_GAP / 2) },
  { bottomY: cy(11), topY: cy(11 - PIPE_GAP - PIPE_HEIGHT), gapY: cy(11 - PIPE_GAP / 2) },
  { bottomY: cy(9), topY: cy(9 - PIPE_GAP - PIPE_HEIGHT), gapY: cy(9 - PIPE_GAP / 2) },
];

const game: GameDefinition = {
  metadata: {
    id: "test-flappy-bird",
    title: "Flappy Bird",
    description: "Tap to fly through the pipes without hitting them",
    instructions: "Tap anywhere to flap! Avoid the pipes and ground.",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: -15 },
    pixelsPerMeter: 50,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
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
      sprite: { type: "circle", radius: BIRD_RADIUS, color: "#f7dc6f" },
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
      sprite: { type: "rect", width: PIPE_WIDTH, height: PIPE_HEIGHT, color: "#2ecc71" },
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
      sprite: { type: "rect", width: PIPE_WIDTH, height: PIPE_HEIGHT, color: "#27ae60" },
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
      physics: {
        bodyType: "kinematic",
        shape: "box",
        width: 0.3,
        height: PIPE_GAP,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
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
      sprite: { type: "rect", width: WORLD_WIDTH + 4, height: GROUND_HEIGHT, color: "#c4a35a" },
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
      sprite: { type: "rect", width: WORLD_WIDTH + 4, height: 0.5, color: "#70c5ce" },
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
    ...Object.fromEntries(
      PIPE_POSITIONS.map((pos, i) => [
        `pipeSet${i}`,
        {
          id: `pipeSet${i}`,
          tags: ["pipe-set"],
          sprite: { type: "rect", width: 0.1, height: 0.1, color: "#00000000" },
          physics: {
            bodyType: "kinematic",
            shape: "box",
            width: 0.1,
            height: 0.1,
            density: 0,
            friction: 0,
            restitution: 0,
            isSensor: true,
          },
          behaviors: [
            { type: "spawn_on_event", event: "spawn", entityTemplate: "pipeBottom", spawnPosition: "at_self", offset: { x: 0, y: pos.bottomY - cy(WORLD_HEIGHT / 2) } },
            { type: "spawn_on_event", event: "spawn", entityTemplate: "pipeTop", spawnPosition: "at_self", offset: { x: 0, y: pos.topY - cy(WORLD_HEIGHT / 2) } },
            { type: "spawn_on_event", event: "spawn", entityTemplate: "scoreZone", spawnPosition: "at_self", offset: { x: 0, y: pos.gapY - cy(WORLD_HEIGHT / 2) } },
            { type: "timer", duration: 0.1, action: "destroy" },
          ],
        },
      ])
    ),
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
      name: "Spawn pipe pairs periodically",
      trigger: { type: "timer", time: 2, repeat: true },
      actions: [
        {
          type: "spawn",
          template: ["pipeSet0", "pipeSet1", "pipeSet2", "pipeSet3", "pipeSet4"],
          position: { type: "fixed", x: SPAWN_X, y: cy(WORLD_HEIGHT / 2) },
        },
      ],
    },
  ],
};

export default game;
