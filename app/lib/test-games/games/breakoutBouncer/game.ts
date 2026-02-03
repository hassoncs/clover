import type { GameDefinition } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Breakout Bouncer",
  description: "Classic brick-breaker with sci-fi neon assets",
};

const BRICK_WIDTH = 1.2;
const BRICK_HEIGHT = 0.5;
const BALL_RADIUS = 0.25;
const PADDLE_WIDTH = 2;
const PADDLE_HEIGHT = 0.4;
const WALL_THICKNESS = 0.3;
const WORLD_WIDTH = 10;
const WORLD_HEIGHT = 20;

const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;

const cx = (x: number) => x - HALF_W;
const cy = (y: number) => HALF_H - y;

const game: GameDefinition = {
  activeAssetPackId: "breakoutBouncer-default",
  metadata: {
    id: "test-breakout-bouncer",
    title: "Breakout Bouncer",
    description: "Classic brick-breaker with sci-fi neon assets",
    instructions: "Drag the paddle left/right to bounce the ball. Destroy all bricks to win!",
    version: "1.0.0",
  },
  background: {
    type: "static",
    whatDescription: "a dark neon arcade game background",
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: 50,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  camera: { type: "fixed", zoom: 1 },
  input: {
    tapZones: [
      { id: "left-zone", edge: "left", size: 0.5, button: "left" },
      { id: "right-zone", edge: "right", size: 0.5, button: "right" },
    ],
    debugTapZones: false,
    tilt: {
      enabled: true,
      sensitivity: 2,
      updateInterval: 16,
    },
  },
  ui: {
    showTimer: false,
    backgroundColor: "#0a0a2e",
    variableDisplays: [
      { name: 'score', label: 'Score', position: 'top-right' },
      { name: 'lives', label: 'Lives', position: 'top-right' },
    ],
  },
  winCondition: { expr: "entityCount('brick') == 0" },
  loseCondition: {
    type: "custom",
    expr: "lives <= 0",
  },
  variables: {
    lives: 3,
    paddleForce: {
      value: 120,
      tuning: { min: 50, max: 200, step: 10 },
      category: 'physics',
      label: 'Paddle Push Force',
    },
    tapImpulse: {
      value: 25,
      tuning: { min: 10, max: 50, step: 5 },
      category: 'physics',
      label: 'Tap Impulse Strength',
    },
    tiltForce: {
      value: 60,
      tuning: { min: 20, max: 100, step: 5 },
      category: 'physics',
      label: 'Tilt Push Force',
    },
  },
  templates: {
    ball: {
      id: "ball",
      tags: ["ball"],
      visual: {
        type: "circle",
        radius: BALL_RADIUS,
        color: "#FF00FF",
      },
      physics: {
        bodyType: "dynamic",
        density: 1,
        linearDamping: 0,
        fixedRotation: false,
        ccd: true,
      },
      collider: {
        shape: "circle",
        radius: BALL_RADIUS,
        friction: 0,
        restitution: 1,
      },
      behaviors: [
        { type: 'stick_to_entity', targetTag: 'paddle', offset: { x: 0, y: -0.5 } },
        { type: 'launch_on_input', speed: 8, minAngle: 45, maxAngle: 135, enableBehaviorAfterLaunch: 2 },
        { type: 'maintain_speed', speed: 8, enabled: false },
      ],
    },
    paddle: {
      id: "paddle",
      tags: ["paddle"],
      whatDescription: "a horizontal neon paddle that bounces the ball",
      visual: {
        type: "image",
        imageWidth: PADDLE_WIDTH,
        imageHeight: PADDLE_HEIGHT,
      },
      physics: {
        bodyType: "dynamic",
        density: 5,
        linearDamping: 8,
        fixedRotation: true,
      },
      collider: {
        shape: "box",
        width: PADDLE_WIDTH,
        height: PADDLE_HEIGHT,
        friction: 0.1,
        restitution: 1,
      },
      behaviors: [],
    },
    brickRed: {
      id: "brickRed",
      tags: ["brick"],
      whatDescription: "a glowing red breakable brick",
      visual: {
        type: "image",
        imageWidth: BRICK_WIDTH,
        imageHeight: BRICK_HEIGHT,
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "box",
        width: BRICK_WIDTH,
        height: BRICK_HEIGHT,
        friction: 0,
        restitution: 1,
      },
      behaviors: [
        { type: "destroy_on_collision", withTags: ["ball"], effect: "fade" },
        { type: "score_on_collision", withTags: ["ball"], points: 40 },
      ],
    },
    brickBlue: {
      id: "brickBlue",
      tags: ["brick"],
      whatDescription: "a glowing blue breakable brick",
      visual: {
        type: "image",
        imageWidth: BRICK_WIDTH,
        imageHeight: BRICK_HEIGHT,
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "box",
        width: BRICK_WIDTH,
        height: BRICK_HEIGHT,
        friction: 0,
        restitution: 1,
      },
      behaviors: [
        { type: "destroy_on_collision", withTags: ["ball"], effect: "fade" },
        { type: "score_on_collision", withTags: ["ball"], points: 10 },
      ],
    },
    brickGreen: {
      id: "brickGreen",
      tags: ["brick"],
      whatDescription: "a glowing green breakable brick",
      visual: {
        type: "image",
        imageWidth: BRICK_WIDTH,
        imageHeight: BRICK_HEIGHT,
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "box",
        width: BRICK_WIDTH,
        height: BRICK_HEIGHT,
        friction: 0,
        restitution: 1,
      },
      behaviors: [
        { type: "destroy_on_collision", withTags: ["ball"], effect: "fade" },
        { type: "score_on_collision", withTags: ["ball"], points: 20 },
      ],
    },
    brickYellow: {
      id: "brickYellow",
      tags: ["brick"],
      whatDescription: "a glowing yellow breakable brick",
      visual: {
        type: "image",
        imageWidth: BRICK_WIDTH,
        imageHeight: BRICK_HEIGHT,
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "box",
        width: BRICK_WIDTH,
        height: BRICK_HEIGHT,
        friction: 0,
        restitution: 1,
      },
      behaviors: [
        { type: "destroy_on_collision", withTags: ["ball"], effect: "fade" },
        { type: "score_on_collision", withTags: ["ball"], points: 30 },
      ],
    },
    wall: {
      id: "wall",
      tags: ["wall"],
      visual: { type: "rect", width: WALL_THICKNESS, height: WORLD_HEIGHT, color: "#333366" },
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
    drain: {
      id: "drain",
      tags: ["drain"],
      collider: {
        shape: "box",
        width: WORLD_WIDTH,
        height: 2,
        isSensor: true,
      },
    },
  },
  entities: [
    { id: "wall-left", name: "Left Wall", template: "wall", transform: { x: cx(0.15), y: cy(10), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "wall-right", name: "Right Wall", template: "wall", transform: { x: cx(9.85), y: cy(10), angle: 0, scaleX: 1, scaleY: 1 } },
    {
      id: "wall-top",
      name: "Top Wall",
      tags: ["wall"],
      transform: { x: cx(5), y: cy(0.15), angle: 0, scaleX: 1, scaleY: 1 },
      visual: { type: "rect", width: 10, height: 0.3, color: "#333366" },
      physics: { bodyType: "static", density: 0 },
      collider: { shape: "box", width: 10, height: 0.3, friction: 0, restitution: 1 },
    },
    { id: "drain", name: "Drain Zone", template: "drain", transform: { x: cx(5), y: cy(21), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "paddle", name: "Paddle", template: "paddle", transform: { x: cx(5), y: cy(18), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "ball", name: "Ball", template: "ball", transform: { x: cx(5), y: cy(17), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-1-1", name: "Brick 1-1", template: "brickRed", transform: { x: cx(0.8), y: cy(2), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-1-2", name: "Brick 1-2", template: "brickRed", transform: { x: cx(2.2), y: cy(2), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-1-3", name: "Brick 1-3", template: "brickRed", transform: { x: cx(3.6), y: cy(2), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-1-4", name: "Brick 1-4", template: "brickRed", transform: { x: cx(5.0), y: cy(2), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-1-5", name: "Brick 1-5", template: "brickRed", transform: { x: cx(6.4), y: cy(2), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-1-6", name: "Brick 1-6", template: "brickRed", transform: { x: cx(7.8), y: cy(2), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-1-7", name: "Brick 1-7", template: "brickRed", transform: { x: cx(9.2), y: cy(2), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-2-1", name: "Brick 2-1", template: "brickYellow", transform: { x: cx(0.8), y: cy(2.7), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-2-2", name: "Brick 2-2", template: "brickYellow", transform: { x: cx(2.2), y: cy(2.7), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-2-3", name: "Brick 2-3", template: "brickYellow", transform: { x: cx(3.6), y: cy(2.7), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-2-4", name: "Brick 2-4", template: "brickYellow", transform: { x: cx(5.0), y: cy(2.7), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-2-5", name: "Brick 2-5", template: "brickYellow", transform: { x: cx(6.4), y: cy(2.7), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-2-6", name: "Brick 2-6", template: "brickYellow", transform: { x: cx(7.8), y: cy(2.7), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-2-7", name: "Brick 2-7", template: "brickYellow", transform: { x: cx(9.2), y: cy(2.7), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-3-1", name: "Brick 3-1", template: "brickGreen", transform: { x: cx(0.8), y: cy(3.4), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-3-2", name: "Brick 3-2", template: "brickGreen", transform: { x: cx(2.2), y: cy(3.4), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-3-3", name: "Brick 3-3", template: "brickGreen", transform: { x: cx(3.6), y: cy(3.4), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-3-4", name: "Brick 3-4", template: "brickGreen", transform: { x: cx(5.0), y: cy(3.4), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-3-5", name: "Brick 3-5", template: "brickGreen", transform: { x: cx(6.4), y: cy(3.4), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-3-6", name: "Brick 3-6", template: "brickGreen", transform: { x: cx(7.8), y: cy(3.4), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-3-7", name: "Brick 3-7", template: "brickGreen", transform: { x: cx(9.2), y: cy(3.4), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-4-1", name: "Brick 4-1", template: "brickBlue", transform: { x: cx(0.8), y: cy(4.1), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-4-2", name: "Brick 4-2", template: "brickBlue", transform: { x: cx(2.2), y: cy(4.1), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-4-3", name: "Brick 4-3", template: "brickBlue", transform: { x: cx(3.6), y: cy(4.1), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-4-4", name: "Brick 4-4", template: "brickBlue", transform: { x: cx(5.0), y: cy(4.1), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-4-5", name: "Brick 4-5", template: "brickBlue", transform: { x: cx(6.4), y: cy(4.1), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-4-6", name: "Brick 4-6", template: "brickBlue", transform: { x: cx(7.8), y: cy(4.1), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-4-7", name: "Brick 4-7", template: "brickBlue", transform: { x: cx(9.2), y: cy(4.1), angle: 0, scaleX: 1, scaleY: 1 } },
  ],
  rules: [
    {
      id: "ball_drain",
      name: "Ball falls through drain - lose a life and respawn",
      trigger: { type: "collision", entityATag: "ball", entityBTag: "drain" },
      actions: [
        { type: "set_variable", name: "lives", operation: "subtract", value: 1 },
        { type: "destroy", target: { type: "by_tag", tag: "ball" } },
        { type: "spawn", template: "ball", position: { type: "fixed", x: 0, y: -7 } },
      ],
    },
    {
      id: "paddle_left",
      name: "Push paddle left with Left Arrow",
      trigger: { type: "button", button: "left", state: "held" },
      actions: [
        {
          type: "apply_force",
          target: { type: "by_tag", tag: "paddle" },
          x: { expr: "-variables.paddleForce" },
        },
      ],
    },
    {
      id: "paddle_right",
      name: "Push paddle right with Right Arrow",
      trigger: { type: "button", button: "right", state: "held" },
      actions: [
        {
          type: "apply_force",
          target: { type: "by_tag", tag: "paddle" },
          x: { expr: "variables.paddleForce" },
        },
      ],
    },
    {
      id: "tap_left",
      name: "Tap left half to push paddle left",
      trigger: { type: "tap", xMinPercent: 0, xMaxPercent: 50 },
      actions: [
        {
          type: "apply_impulse",
          target: { type: "by_tag", tag: "paddle" },
          x: { expr: "-variables.tapImpulse" },
        },
      ],
    },
    {
      id: "tap_right",
      name: "Tap right half to push paddle right",
      trigger: { type: "tap", xMinPercent: 50, xMaxPercent: 100 },
      actions: [
        {
          type: "apply_impulse",
          target: { type: "by_tag", tag: "paddle" },
          x: { expr: "variables.tapImpulse" },
        },
      ],
    },
    {
      id: "tilt_control",
      name: "Tilt device to push paddle",
      trigger: { type: "tilt", axis: "x", threshold: 0.1 },
      actions: [
        {
          type: "apply_force",
          target: { type: "by_tag", tag: "paddle" },
          direction: "tilt_direction",
          force: { expr: "variables.tiltForce" },
        },
      ],
    },

    {
      id: "lock_paddle_y",
      name: "Lock paddle Y position",
      trigger: { type: "frame" },
      actions: [
        {
          type: "modify",
          target: { type: "by_id", entityId: "paddle" },
          property: "y",
          operation: "set",
          value: cy(18),
        },
      ],
    },
  ],
};

export default game;
