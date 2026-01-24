import type { GameDefinition } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

const ASSET_BASE = "https://slopcade-api.hassoncs.workers.dev/assets/generated/breakout-bouncer";

export const metadata: TestGameMeta = {
  title: "Breakout Bouncer",
  description: "Classic brick-breaker with sci-fi neon assets",
  titleHeroImageUrl: `${ASSET_BASE}/title_hero.png`,
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
  metadata: {
    id: "test-breakout-bouncer",
    title: "Breakout Bouncer",
    description: "Classic brick-breaker with sci-fi neon assets",
    instructions: "Drag the paddle left/right to bounce the ball. Destroy all bricks to win!",
    version: "1.0.0",
    titleHeroImageUrl: `${ASSET_BASE}/title_hero.png`,
  },
  background: {
    type: "static",
    imageUrl: `${ASSET_BASE}/background.png`,
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
    debugTapZones: true,
  },
  ui: {
    showScore: true,
    showLives: true,
    showTimer: false,
    backgroundColor: "#0a0a2e",
  },
  winCondition: {
    type: "destroy_all",
    tag: "brick",
  },
  loseCondition: {
    type: "lives_zero",
  },
  initialLives: 3,
  templates: {
    ball: {
      id: "ball",
      tags: ["ball"],
      sprite: {
        type: "image",
        imageUrl: `${ASSET_BASE}/ball.png`,
        imageWidth: BALL_RADIUS * 2,
        imageHeight: BALL_RADIUS * 2,
      },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: BALL_RADIUS,
        density: 1,
        friction: 0,
        restitution: 1,
        linearDamping: 0,
        initialVelocity: { x: 3, y: 6 },
        bullet: true,
      },
    },
    paddle: {
      id: "paddle",
      tags: ["paddle"],
      sprite: {
        type: "image",
        imageUrl: `${ASSET_BASE}/paddle.png`,
        imageWidth: PADDLE_WIDTH,
        imageHeight: PADDLE_HEIGHT,
      },
      physics: {
        bodyType: "dynamic",
        shape: "box",
        width: PADDLE_WIDTH,
        height: PADDLE_HEIGHT,
        density: 1,
        friction: 0,
        restitution: 1,
        linearDamping: 5,
        fixedRotation: true,
      },
      behaviors: [],
    },
    brickRed: {
      id: "brickRed",
      tags: ["brick"],
      sprite: {
        type: "image",
        imageUrl: `${ASSET_BASE}/brickRed.png`,
        imageWidth: BRICK_WIDTH,
        imageHeight: BRICK_HEIGHT,
      },
      physics: {
        bodyType: "static",
        shape: "box",
        width: BRICK_WIDTH,
        height: BRICK_HEIGHT,
        density: 0,
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
      sprite: {
        type: "image",
        imageUrl: `${ASSET_BASE}/brickBlue.png`,
        imageWidth: BRICK_WIDTH,
        imageHeight: BRICK_HEIGHT,
      },
      physics: {
        bodyType: "static",
        shape: "box",
        width: BRICK_WIDTH,
        height: BRICK_HEIGHT,
        density: 0,
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
      sprite: {
        type: "image",
        imageUrl: `${ASSET_BASE}/brickGreen.png`,
        imageWidth: BRICK_WIDTH,
        imageHeight: BRICK_HEIGHT,
      },
      physics: {
        bodyType: "static",
        shape: "box",
        width: BRICK_WIDTH,
        height: BRICK_HEIGHT,
        density: 0,
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
      sprite: {
        type: "image",
        imageUrl: `${ASSET_BASE}/brickYellow.png`,
        imageWidth: BRICK_WIDTH,
        imageHeight: BRICK_HEIGHT,
      },
      physics: {
        bodyType: "static",
        shape: "box",
        width: BRICK_WIDTH,
        height: BRICK_HEIGHT,
        density: 0,
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
      sprite: { type: "rect", width: WALL_THICKNESS, height: WORLD_HEIGHT, color: "#333366" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: WALL_THICKNESS,
        height: WORLD_HEIGHT,
        density: 0,
        friction: 0,
        restitution: 1,
      },
    },
    drain: {
      id: "drain",
      tags: ["drain"],
      sprite: { type: "rect", width: WORLD_WIDTH, height: 2, color: "#FF000033" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: WORLD_WIDTH,
        height: 2,
        density: 0,
        friction: 0,
        restitution: 0,
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
      sprite: { type: "rect", width: 10, height: 0.3, color: "#333366" },
      physics: { bodyType: "static", shape: "box", width: 10, height: 0.3, density: 0, friction: 0, restitution: 1 },
    },
    { id: "drain", name: "Drain Zone", template: "drain", transform: { x: cx(5), y: cy(21), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "paddle", name: "Paddle", template: "paddle", transform: { x: cx(5), y: cy(18), angle: 0, scaleX: 1, scaleY: 1 } },
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
      id: "spawn_ball",
      name: "Spawn ball when game starts",
      trigger: { type: "gameStart" },
      actions: [
        { type: "spawn", template: "ball", position: { type: "fixed", x: 0, y: 0 } },
      ],
    },
    {
      id: "ball_drain",
      name: "Ball falls through drain - lose a life and respawn",
      trigger: { type: "collision", entityATag: "ball", entityBTag: "drain" },
      actions: [
        { type: "lives", operation: "subtract", value: 1 },
        { type: "destroy", target: { type: "by_tag", tag: "ball" } },
        { type: "spawn", template: "ball", position: { type: "fixed", x: 0, y: 0 } },
      ],
    },
    {
      id: "paddle_left",
      name: "Move paddle left with Left Arrow",
      trigger: { type: "button", button: "left", state: "held" },
      actions: [
        {
          type: "move",
          target: { type: "by_tag", tag: "paddle" },
          direction: "left",
          speed: 15,
        },
      ],
    },
    {
      id: "paddle_right",
      name: "Move paddle right with Right Arrow",
      trigger: { type: "button", button: "right", state: "held" },
      actions: [
        {
          type: "move",
          target: { type: "by_tag", tag: "paddle" },
          direction: "right",
          speed: 15,
        },
      ],
    },
    {
      id: "tap_left",
      name: "Tap left half of screen to move paddle left",
      trigger: { type: "tap", xMinPercent: 0, xMaxPercent: 50 },
      actions: [
        {
          type: "move",
          target: { type: "by_tag", tag: "paddle" },
          direction: "left",
          speed: 10,
        },
      ],
    },
    {
      id: "tap_right",
      name: "Tap right half of screen to move paddle right",
      trigger: { type: "tap", xMinPercent: 50, xMaxPercent: 100 },
      actions: [
        {
          type: "move",
          target: { type: "by_tag", tag: "paddle" },
          direction: "right",
          speed: 10,
        },
      ],
    },
  ],
};

export default game;
