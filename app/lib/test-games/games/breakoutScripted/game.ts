import type { GameDefinition } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

const ASSET_BASE = "https://slopcade-api.hassoncs.workers.dev/assets/generated/breakout-bouncer";

export const metadata: TestGameMeta = {
  title: "Breakout (Scripted)",
  description: "Breakout using direct script control - mouse follows paddle",
};

const BRICK_WIDTH = 1.15;
const BRICK_HEIGHT = 0.48;
const BRICK_GAP = 0.05;
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

const PADDLE_Y = cy(18);

const game: GameDefinition = {
  metadata: {
    id: "test-breakout-scripted",
    title: "Breakout (Scripted)",
    description: "Breakout using direct script control - paddle follows mouse",
    instructions: "Move mouse/finger to control paddle. Tap to launch ball.",
    version: "1.0.0",
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
  input: {},
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
  constants: {
    PADDLE_Y,
    BALL_SPEED: 6,
    HALF_W,
    HALF_H,
    PADDLE_HALF_WIDTH: PADDLE_WIDTH / 2,
    WALL_X_MIN: cx(WALL_THICKNESS) + PADDLE_WIDTH / 2,
    WALL_X_MAX: cx(WORLD_WIDTH - WALL_THICKNESS) - PADDLE_WIDTH / 2,
  },
  script: `
let launched = false;

exports.onStart = function(ctx) {
  launched = false;
  ctx.setVariable('launched', false);
};

exports.onUpdate = function(ctx, dt) {
  const mouse = ctx.getMouse();
  const paddleId = ctx.queryEntities({ tag: 'paddle' })[0];
  const ballId = ctx.queryEntities({ tag: 'ball' })[0];
  
  if (!paddleId) return;
  
  if (mouse) {
    const clampedX = ctx.clamp(
      mouse.x,
      ctx.getConstant('WALL_X_MIN'),
      ctx.getConstant('WALL_X_MAX')
    );
    ctx.setEntityPosition(paddleId, { x: clampedX, y: ctx.getConstant('PADDLE_Y') });
  }
  
  if (!launched && ballId) {
    const paddlePos = ctx.getEntityPosition(paddleId);
    if (paddlePos) {
      ctx.setEntityPosition(ballId, { x: paddlePos.x, y: paddlePos.y + 0.5 });
      ctx.setEntityVelocity(ballId, { x: 0, y: 0 });
    }
  }
};

exports.onInput = function(ctx, event) {
  if (event.type === 'tap' && !launched) {
    const ballId = ctx.queryEntities({ tag: 'ball' })[0];
    if (ballId) {
      const angle = ctx.randomInt(45, 135) * Math.PI / 180;
      const speed = ctx.getConstant('BALL_SPEED');
      ctx.setEntityVelocity(ballId, {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed
      });
      launched = true;
      ctx.setVariable('launched', true);
    }
  }
};

exports.onCollision = function(ctx, collision) {
  if (ctx.hasTag(collision.entityA, 'drain') || ctx.hasTag(collision.entityB, 'drain')) {
    const drainedBall = ctx.hasTag(collision.entityA, 'ball') ? collision.entityA : 
                        ctx.hasTag(collision.entityB, 'ball') ? collision.entityB : null;
    if (drainedBall) {
      ctx.addLives(-1);
      
      const paddleId = ctx.queryEntities({ tag: 'paddle' })[0];
      if (paddleId) {
        const paddlePos = ctx.getEntityPosition(paddleId);
        ctx.destroyEntity(drainedBall);
        ctx.spawnEntity('ball', { x: paddlePos.x, y: paddlePos.y + 0.5 });
        launched = false;
        ctx.setVariable('launched', false);
      }
    }
  }
  
  const brickA = ctx.hasTag(collision.entityA, 'brick') ? collision.entityA : null;
  const brickB = ctx.hasTag(collision.entityB, 'brick') ? collision.entityB : null;
  const hitBrick = brickA || brickB;
  
  if (hitBrick) {
    ctx.addScore(10);
    ctx.destroyEntity(hitBrick);
  }
};
`,
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
        fixedRotation: true,
        ccd: true,
      },
      collider: {
        shape: "circle",
        radius: BALL_RADIUS,
        friction: 0,
        restitution: 1,
      },
    },
    paddle: {
      id: "paddle",
      tags: ["paddle"],
      visual: {
        type: "image",
        imageUrl: `${ASSET_BASE}/paddle.png`,
        imageWidth: PADDLE_WIDTH,
        imageHeight: PADDLE_HEIGHT,
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
    brick: {
      id: "brick",
      tags: ["brick"],
      visual: {
        type: "image",
        imageUrl: `${ASSET_BASE}/brickBlue.png`,
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
    { id: "paddle", name: "Paddle", template: "paddle", transform: { x: cx(5), y: PADDLE_Y, angle: 0, scaleX: 1, scaleY: 1 } },
    { 
      id: "ball", 
      name: "Ball", 
      template: "ball", 
      transform: { x: cx(5), y: PADDLE_Y + 0.5, angle: 0, scaleX: 1, scaleY: 1 },
      collider: {
        shape: "circle",
        radius: BALL_RADIUS,
        friction: 0,
        restitution: 1,
      },
    },
    { id: "brick-1-1", name: "Brick 1-1", template: "brick", transform: { x: cx(0.8), y: cy(2), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-1-2", name: "Brick 1-2", template: "brick", transform: { x: cx(2.2), y: cy(2), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-1-3", name: "Brick 1-3", template: "brick", transform: { x: cx(3.6), y: cy(2), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-1-4", name: "Brick 1-4", template: "brick", transform: { x: cx(5.0), y: cy(2), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-1-5", name: "Brick 1-5", template: "brick", transform: { x: cx(6.4), y: cy(2), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-1-6", name: "Brick 1-6", template: "brick", transform: { x: cx(7.8), y: cy(2), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-1-7", name: "Brick 1-7", template: "brick", transform: { x: cx(9.2), y: cy(2), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-2-1", name: "Brick 2-1", template: "brick", transform: { x: cx(0.8), y: cy(2.7), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-2-2", name: "Brick 2-2", template: "brick", transform: { x: cx(2.2), y: cy(2.7), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-2-3", name: "Brick 2-3", template: "brick", transform: { x: cx(3.6), y: cy(2.7), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-2-4", name: "Brick 2-4", template: "brick", transform: { x: cx(5.0), y: cy(2.7), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-2-5", name: "Brick 2-5", template: "brick", transform: { x: cx(6.4), y: cy(2.7), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-2-6", name: "Brick 2-6", template: "brick", transform: { x: cx(7.8), y: cy(2.7), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-2-7", name: "Brick 2-7", template: "brick", transform: { x: cx(9.2), y: cy(2.7), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-3-1", name: "Brick 3-1", template: "brick", transform: { x: cx(0.8), y: cy(3.4), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-3-2", name: "Brick 3-2", template: "brick", transform: { x: cx(2.2), y: cy(3.4), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-3-3", name: "Brick 3-3", template: "brick", transform: { x: cx(3.6), y: cy(3.4), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-3-4", name: "Brick 3-4", template: "brick", transform: { x: cx(5.0), y: cy(3.4), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-3-5", name: "Brick 3-5", template: "brick", transform: { x: cx(6.4), y: cy(3.4), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-3-6", name: "Brick 3-6", template: "brick", transform: { x: cx(7.8), y: cy(3.4), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-3-7", name: "Brick 3-7", template: "brick", transform: { x: cx(9.2), y: cy(3.4), angle: 0, scaleX: 1, scaleY: 1 } },
  ],
  rules: [],
};

export default game;
