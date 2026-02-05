import type { GameDefinition } from "@slopcade/shared";

export const metadata = {
  title: "Pong",
  description: "Classic paddle-and-ball game. Don't let the ball pass your paddle!",
};

const WORLD_WIDTH = 12;
const WORLD_HEIGHT = 16;
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;
const cx = (x: number) => x - HALF_W;
const cy = (y: number) => HALF_H - y;

const PADDLE_WIDTH = 2.5;
const PADDLE_HEIGHT = 0.4;
const BALL_RADIUS = 0.25;
const WALL_THICKNESS = 0.3;
const BALL_SPEED = 8;

const game: GameDefinition = {
  metadata: {
    id: "test-pong",
    title: "Pong",
    description: "Classic paddle-and-ball game. Don't let the ball pass your paddle!",
    instructions: "Drag left/right to move your paddle. Keep the ball in play!",
    version: "1.0.0",
  },
  assetSystem: { activePackId: "default" },
  background: {
    type: "static",
    color: "#0a0a1a",
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: 50,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  camera: { type: "fixed", zoom: 1 },
  ui: {
    showTimer: false,
    backgroundColor: "#0a0a1a",
    variableDisplays: [
      { name: 'score', label: 'Score', position: 'top-center' },
      { name: 'lives', label: 'Lives', position: 'top-right' },
    ],
  },
  loseCondition: {
    type: "custom",
    expr: "lives <= 0",
  },
  variables: {
    score: 0,
    lives: 3,
    ballActive: 1,
  },
  templates: {
    paddle: {
      id: "paddle",
      tags: ["paddle", "player"],
      visual: {
        type: "rect",
        width: PADDLE_WIDTH,
        height: PADDLE_HEIGHT,
        color: "#00d2ff",
      },
      physics: {
        bodyType: "kinematic",
        density: 0,
        fixedRotation: true,
      },
      collider: {
        shape: "box",
        width: PADDLE_WIDTH,
        height: PADDLE_HEIGHT,
        friction: 0,
        restitution: 1,
      },
    },
    ball: {
      id: "ball",
      tags: ["ball"],
      visual: {
        type: "circle",
        radius: BALL_RADIUS,
        color: "#ff6b6b",
      },
      physics: {
        bodyType: "dynamic",
        density: 1,
        linearDamping: 0,
        angularDamping: 0,
        fixedRotation: true,
        ccd: true,
      },
      collider: {
        shape: "circle",
        radius: BALL_RADIUS,
        friction: 0,
        restitution: 1.02,
      },
    },
    wall: {
      id: "wall",
      tags: ["wall"],
      visual: {
        type: "rect",
        width: WALL_THICKNESS,
        height: WORLD_HEIGHT,
        color: "#2d3436",
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "box",
        width: WALL_THICKNESS,
        height: WORLD_HEIGHT,
        friction: 0,
        restitution: 1,
      },
    },
    topWall: {
      id: "topWall",
      tags: ["wall"],
      visual: {
        type: "rect",
        width: WORLD_WIDTH,
        height: WALL_THICKNESS,
        color: "#2d3436",
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "box",
        width: WORLD_WIDTH,
        height: WALL_THICKNESS,
        friction: 0,
        restitution: 1,
      },
    },
    deathZone: {
      id: "deathZone",
      tags: ["deathZone"],
      collider: {
        shape: "box",
        width: WORLD_WIDTH,
        height: 1,
        isSensor: true,
      },
    },
  },
  entities: [
    {
      id: "paddle",
      name: "Paddle",
      template: "paddle",
      transform: { x: 0, y: cy(14), angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "ball",
      name: "Ball",
      template: "ball",
      transform: { x: 0, y: cy(10), angle: 0, scaleX: 1, scaleY: 1 },
      behaviors: [
        { type: "maintain_speed", speed: BALL_SPEED, mode: "minimum" },
      ],
    },
    {
      id: "wall-left",
      name: "Left Wall",
      template: "wall",
      transform: { x: cx(-0.15), y: 0, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "wall-right",
      name: "Right Wall",
      template: "wall",
      transform: { x: cx(12.15), y: 0, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "wall-top",
      name: "Top Wall",
      template: "topWall",
      transform: { x: 0, y: cy(-0.15), angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "deathZone",
      name: "Death Zone",
      template: "deathZone",
      transform: { x: 0, y: cy(17), angle: 0, scaleX: 1, scaleY: 1 },
    },
  ],
  rules: [
    {
      id: "paddle_follow_drag",
      name: "Paddle follows drag",
      trigger: { type: "drag", phase: "move" },
      conditions: [
        { type: "expression", expr: "ballActive == 1" },
      ],
      actions: [
        { 
          type: "move", 
          target: { type: "by_tag", tag: "paddle" },
          direction: "toward_mouse_x",
          speed: 15,
        },
      ],
    },
    {
      id: "ball_hits_paddle",
      name: "Ball hits paddle",
      trigger: { 
        type: "collision",
        entityATag: "ball",
        entityBTag: "paddle",
      },
      actions: [
        { type: "set_variable", name: "score", operation: "add", value: 10 },
      ],
    },
    {
      id: "ball_death",
      name: "Ball death",
      trigger: {
        type: "collision",
        entityATag: "ball",
        entityBTag: "deathZone",
      },
      actions: [
        { type: "set_variable", name: "lives", operation: "add", value: -1 },
        { type: "destroy", target: { type: "by_tag", tag: "ball" } },
        { type: "set_variable", name: "ballActive", operation: "set", value: 0 },
        { 
          type: "spawn", 
          template: "ball", 
          position: { type: "fixed", x: 0, y: cy(10) },
          launch: {
            direction: { x: 0.5, y: -1 },
            force: BALL_SPEED,
          },
        },
        { type: "set_variable", name: "ballActive", operation: "set", value: 1 },
      ],
    },
    {
      id: "launch_ball",
      name: "Launch ball on tap",
      trigger: { type: "tap" },
      conditions: [
        { type: "expression", expr: "ballActive == 1" },
      ],
      actions: [
        { 
          type: "apply_impulse", 
          target: { type: "by_tag", tag: "ball" },
          x: 3,
          y: -6,
        },
      ],
    },
  ],
};

export default game;
