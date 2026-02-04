import type { GameDefinition } from "@slopcade/shared";

export const metadata = {
  title: "Space Invaders",
  description: "Defend Earth from the invading alien fleet",
};

const WORLD_WIDTH = 12;
const WORLD_HEIGHT = 16;
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;
const cx = (x: number) => x - HALF_W;
const cy = (y: number) => HALF_H - y;

const PLAYER_WIDTH = 0.8;
const PLAYER_HEIGHT = 0.6;
const PLAYER_SPEED = 6;
const PLAYER_Y = cy(14.5);

const INVADER_SIZE = 0.6;
const INVADER_ROWS = 5;
const INVADER_COLS = 11;
const INVADER_SPACING_X = 0.8;
const INVADER_SPACING_Y = 0.8;
const INVADER_START_Y = cy(2);

const BULLET_WIDTH = 0.15;
const BULLET_HEIGHT = 0.4;
const BULLET_SPEED = 10;

const game: GameDefinition = {
  metadata: {
    id: "space-invaders",
    title: "Space Invaders",
    description: "Defend Earth from the invading alien fleet",
    instructions: "Move with arrow keys or tap sides. Space/tap center to shoot. Don't let invaders reach the bottom!",
    version: "1.0.0",
  },
  assetSystem: { activePackId: "spaceInvaders-default" },
  background: {
    type: "static",
    color: "#000000",
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: 50,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  camera: { type: "fixed", zoom: 1 },
  input: {
    tapZones: [
      { id: "left", edge: "left", size: 0.33, button: "left" },
      { id: "right", edge: "right", size: 0.33, button: "right" },
      { id: "shoot", edge: "bottom", size: 0.5, button: "action" },
    ],
  },
  ui: {
    showTimer: false,
    backgroundColor: "#000000",
    variableDisplays: [
      { name: 'score', label: 'Score', position: 'top-left' },
      { name: 'lives', label: 'Lives', position: 'top-right' },
    ],
  },
  winCondition: { expr: "entityCount('invader') == 0" },
  loseCondition: {
    type: "custom",
    expr: "lives <= 0 || invadersReachedBottom",
  },
  variables: { 
    lives: 3,
    invadersReachedBottom: false,
    canShoot: true,
  },
  constants: {
    PLAYER_Y,
    BULLET_SPEED,
    INVADER_SPACING_X,
    INVADER_SPACING_Y,
    INVADER_START_Y,
    PLAYER_MIN_X: cx(0.5),
    PLAYER_MAX_X: cx(WORLD_WIDTH - 0.5),
  },
  script: `
let invaderDirection = 1; // 1 for right, -1 for left
let invaderSpeed = 1.5;
let lastShootTime = 0;
let shootCooldown = 500; // ms

exports.onStart = function(ctx) {
  invaderDirection = 1;
  invaderSpeed = 1.5;
  lastShootTime = 0;
  ctx.setVariable('canShoot', true);
  ctx.setVariable('invadersReachedBottom', false);
};

exports.onUpdate = function(ctx, dt) {
  const player = ctx.queryEntities({ tag: 'player' })[0];
  const invaders = ctx.queryEntities({ tag: 'invader' });
  
  // Player movement
  if (player) {
    const input = ctx.getInput();
    const pos = ctx.getEntityPosition(player);
    let newX = pos.x;
    
    if (input.left) {
      newX = Math.max(ctx.getConstant('PLAYER_MIN_X'), pos.x - PLAYER_SPEED * dt);
    } else if (input.right) {
      newX = Math.min(ctx.getConstant('PLAYER_MAX_X'), pos.x + PLAYER_SPEED * dt);
    }
    
    if (newX !== pos.x) {
      ctx.setEntityPosition(player, { x: newX, y: pos.y });
    }
  }
  
  // Invader formation movement
  if (invaders.length > 0) {
    let shouldDescend = false;
    let leftmost = Infinity;
    let rightmost = -Infinity;
    let lowest = -Infinity;
    
    // Find bounds
    for (let i = 0; i < invaders.length; i++) {
      const pos = ctx.getEntityPosition(invaders[i]);
      if (pos.x < leftmost) leftmost = pos.x;
      if (pos.x > rightmost) rightmost = pos.x;
      if (pos.y < lowest) lowest = pos.y;
    }
    
    // Check if we need to change direction
    if (invaderDirection > 0 && rightmost >= ctx.getConstant('PLAYER_MAX_X')) {
      shouldDescend = true;
      invaderDirection = -1;
    } else if (invaderDirection < 0 && leftmost <= ctx.getConstant('PLAYER_MIN_X')) {
      shouldDescend = true;
      invaderDirection = 1;
    }
    
    // Move all invaders
    const moveX = invaderDirection * invaderSpeed * dt;
    const moveY = shouldDescend ? -0.5 : 0;
    
    for (let i = 0; i < invaders.length; i++) {
      const pos = ctx.getEntityPosition(invaders[i]);
      ctx.setEntityPosition(invaders[i], { 
        x: pos.x + moveX, 
        y: pos.y + moveY 
      });
    }
    
    // Check if invaders reached the bottom
    if (lowest <= ctx.getConstant('PLAYER_Y') + 1) {
      ctx.setVariable('invadersReachedBottom', true);
    }
    
    // Speed up as invaders are destroyed
    const speedMultiplier = 1 + (1 - invaders.length / 55) * 2;
    invaderSpeed = 1.5 * speedMultiplier;
  }
  
  // Random invader shooting
  if (invaders.length > 0 && ctx.randomFloat(0, 1) < 0.005) {
    const randomInvader = invaders[ctx.randomInt(0, invaders.length - 1)];
    const pos = ctx.getEntityPosition(randomInvader);
    ctx.spawnEntity('enemyBullet', { x: pos.x, y: pos.y - 0.5 });
  }
  
  // Update shoot cooldown
  const now = Date.now();
  if (!ctx.getVariable('canShoot') && now - lastShootTime > shootCooldown) {
    ctx.setVariable('canShoot', true);
  }
};

exports.onInput = function(ctx, event) {
  if ((event.type === 'key_down' && event.key === 'action') || 
      (event.type === 'tap' && ctx.getVariable('canShoot'))) {
    const player = ctx.queryEntities({ tag: 'player' })[0];
    if (player) {
      const pos = ctx.getEntityPosition(player);
      ctx.spawnEntity('playerBullet', { x: pos.x, y: pos.y + 0.5 });
      ctx.setVariable('canShoot', false);
      lastShootTime = Date.now();
    }
  }
};

exports.onCollision = function(ctx, collision) {
  const entityA = collision.entityA;
  const entityB = collision.entityB;
  
  // Player bullet hits invader
  const playerBullet = ctx.hasTag(entityA, 'player-bullet') ? entityA : 
                       ctx.hasTag(entityB, 'player-bullet') ? entityB : null;
  const invader = ctx.hasTag(entityA, 'invader') ? entityA : 
                  ctx.hasTag(entityB, 'invader') ? entityB : null;
  
  if (playerBullet && invader) {
    ctx.addScore(10);
    ctx.destroyEntity(playerBullet);
    ctx.destroyEntity(invader);
  }
  
  // Enemy bullet hits player
  const enemyBullet = ctx.hasTag(entityA, 'enemy-bullet') ? entityA : 
                      ctx.hasTag(entityB, 'enemy-bullet') ? entityB : null;
  const player = ctx.hasTag(entityA, 'player') ? entityA : 
                 ctx.hasTag(entityB, 'player') ? entityB : null;
  
  if (enemyBullet && player) {
    ctx.destroyEntity(enemyBullet);
    ctx.addLives(-1);
    
    // Respawn player if lives remain
    if (ctx.getVariable('lives') > 0) {
      const pos = ctx.getEntityPosition(player);
      ctx.setEntityPosition(player, { x: 0, y: ctx.getConstant('PLAYER_Y') });
    } else {
      ctx.destroyEntity(player);
    }
  }
};
`,
  templates: {
    player: {
      id: "player",
      tags: ["player"],
      whatDescription: "a spaceship with a triangular shape pointing upward",
      visual: {
        type: "image",
        imageWidth: PLAYER_WIDTH,
        imageHeight: PLAYER_HEIGHT,
      },
      physics: {
        bodyType: "kinematic",
        density: 0,
        fixedRotation: true,
      },
      collider: {
        shape: "box",
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        isSensor: true,
      },
    },
    invader: {
      id: "invader",
      tags: ["invader"],
      whatDescription: "a pixelated alien invader with tentacles",
      visual: {
        type: "image",
        imageWidth: INVADER_SIZE,
        imageHeight: INVADER_SIZE,
      },
      collider: {
        shape: "box",
        width: INVADER_SIZE,
        height: INVADER_SIZE,
        isSensor: true,
      },
    },
    playerBullet: {
      id: "playerBullet",
      tags: ["player-bullet", "bullet"],
      visual: {
        type: "rect",
        width: BULLET_WIDTH,
        height: BULLET_HEIGHT,
        color: "#00FF00",
      },
      collider: {
        shape: "box",
        width: BULLET_WIDTH,
        height: BULLET_HEIGHT,
        isSensor: true,
      },
      behaviors: [
        { type: "translate", direction: { type: "vector", x: 0, y: 1 }, speed: BULLET_SPEED },
        { type: "destroy_when_off_screen", edge: "top", buffer: 1 },
      ],
    },
    enemyBullet: {
      id: "enemyBullet",
      tags: ["enemy-bullet", "bullet"],
      visual: {
        type: "rect",
        width: BULLET_WIDTH,
        height: BULLET_HEIGHT,
        color: "#FF0000",
      },
      collider: {
        shape: "box",
        width: BULLET_WIDTH,
        height: BULLET_HEIGHT,
        isSensor: true,
      },
      behaviors: [
        { type: "translate", direction: { type: "vector", x: 0, y: -1 }, speed: BULLET_SPEED },
        { type: "destroy_when_off_screen", edge: "bottom", buffer: 1 },
      ],
    },
  },
  entities: [
    {
      id: "player",
      name: "Player Ship",
      template: "player",
      transform: { x: 0, y: PLAYER_Y, angle: 0, scaleX: 1, scaleY: 1 },
    },
    // Generate invader grid
    ...Array.from({ length: INVADER_ROWS }, (_, row) =>
      Array.from({ length: INVADER_COLS }, (_, col) => ({
        id: `invader-${row}-${col}`,
        name: `Invader ${row}-${col}`,
        template: "invader",
        transform: {
          x: cx((col * INVADER_SPACING_X) + 0.8),
          y: INVADER_START_Y + (row * INVADER_SPACING_Y),
          angle: 0,
          scaleX: 1,
          scaleY: 1,
        },
      }))
    ).flat(),
  ],
  rules: [],
};

export default game;
