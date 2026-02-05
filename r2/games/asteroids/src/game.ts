import type { GameDefinition } from "@slopcade/shared";

export const metadata = {
  title: "Asteroids",
  description: "Destroy asteroids while avoiding collisions",
  status: "active",
};

const WORLD_WIDTH = 16;
const WORLD_HEIGHT = 16;
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;

const cx = (x: number) => x - HALF_W;
const cy = (y: number) => HALF_H - y;

const SHIP_SIZE = 0.6;
const ASTEROID_LARGE_RADIUS = 1.2;
const ASTEROID_MEDIUM_RADIUS = 0.8;
const ASTEROID_SMALL_RADIUS = 0.5;
const BULLET_RADIUS = 0.15;
const SHIP_THRUST = 12;
const SHIP_ROTATION_SPEED = 300;
const BULLET_SPEED = 12;
const BULLET_LIFETIME = 1.5;

const game: GameDefinition = {
  metadata: {
    id: "c8e1d5af-c7b3-4fa2-b174-eb7080dd4aee",
    slug: "asteroids",
    title: "Asteroids",
    description: "Destroy asteroids while avoiding collisions",
    instructions: "Arrow keys to rotate. Up arrow to thrust. Space to shoot.",
    version: "1.0.0",
  },
  assetSystem: { activePackId: "default" },
  background: {
    type: "static",
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: 50,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  camera: { type: "fixed", zoom: 1 },
  input: {},
  ui: {
    showTimer: false,
    backgroundColor: "#000000",
    variableDisplays: [
      { name: "score", label: "Score", position: "top-left" },
      { name: "lives", label: "Lives", position: "top-right" },
    ],
  },
  loseCondition: {
    type: "custom",
    expr: "lives <= 0",
  },
  variables: { 
    lives: 3,
    canShoot: true,
    shipInvuln: false,
  },
  constants: {
    WORLD_WIDTH,
    WORLD_HEIGHT,
    HALF_W,
    HALF_H,
    SHIP_THRUST,
    BULLET_SPEED,
    BULLET_LIFETIME,
    ASTEROID_LARGE_RADIUS,
    ASTEROID_MEDIUM_RADIUS,
    ASTEROID_SMALL_RADIUS,
  },
  script: `
let respawnTimer = 0;
let shipRespawning = false;
let shootCooldown = 0;
const SHOOT_COOLDOWN = 0.2;
const RESPAWN_DELAY = 2.0;
const RESPAWN_INVULN = 3.0;
let invulnTimer = 0;

exports.onStart = function(ctx) {
  spawnInitialAsteroids(ctx);
  respawnTimer = 0;
  shipRespawning = false;
  shootCooldown = 0;
  invulnTimer = 0;
  ctx.setVariable('shipInvuln', false);
};

exports.onUpdate = function(ctx, dt) {
  const ships = ctx.queryEntities({ tag: 'ship' });
  const ship = ships[0];
  
  if (shootCooldown > 0) {
    shootCooldown -= dt;
    if (shootCooldown <= 0) {
      ctx.setVariable('canShoot', true);
    }
  }
  
  if (invulnTimer > 0) {
    invulnTimer -= dt;
    if (invulnTimer <= 0) {
      ctx.setVariable('shipInvuln', false);
    }
  }
  
  if (shipRespawning) {
    respawnTimer -= dt;
    if (respawnTimer <= 0) {
      respawnShip(ctx);
      shipRespawning = false;
      invulnTimer = RESPAWN_INVULN;
      ctx.setVariable('shipInvuln', true);
    }
    return;
  }
  
  if (!ship) return;
  
  wrapEntity(ctx, ship);
  
  const bullets = ctx.queryEntities({ tag: 'bullet' });
  bullets.forEach(bulletId => {
    wrapEntity(ctx, bulletId);
  });
  
  const asteroids = ctx.queryEntities({ tag: 'asteroid' });
  asteroids.forEach(asteroidId => {
    wrapEntity(ctx, asteroidId);
  });
  
  if (asteroids.length === 0) {
    spawnInitialAsteroids(ctx);
  }
};

exports.onInput = function(ctx, event) {
  if (event.type === 'key_down' && event.key === ' ') {
    const ships = ctx.queryEntities({ tag: 'ship' });
    const ship = ships[0];
    
    if (ship && ctx.getVariable('canShoot') && shootCooldown <= 0) {
      const pos = ctx.getEntityPosition(ship);
      const angle = ctx.getEntityAngle(ship);
      
      const bulletX = pos.x + Math.cos(angle) * 0.5;
      const bulletY = pos.y + Math.sin(angle) * 0.5;
      
      const bullet = ctx.spawnEntity('bullet', { x: bulletX, y: bulletY });
      ctx.setEntityAngle(bullet, angle);
      
      const bulletVx = Math.cos(angle) * ctx.getConstant('BULLET_SPEED');
      const bulletVy = Math.sin(angle) * ctx.getConstant('BULLET_SPEED');
      ctx.setEntityVelocity(bullet, { x: bulletVx, y: bulletVy });
      
      shootCooldown = SHOOT_COOLDOWN;
      ctx.setVariable('canShoot', false);
    }
  }
  
  if (event.type === 'key_down' && event.key === 'ArrowUp') {
    const ships = ctx.queryEntities({ tag: 'ship' });
    const ship = ships[0];
    if (ship) {
      const angle = ctx.getEntityAngle(ship);
      const thrust = ctx.getConstant('SHIP_THRUST');
      const fx = Math.cos(angle) * thrust;
      const fy = Math.sin(angle) * thrust;
      ctx.applyForce(ship, { x: fx, y: fy });
    }
  }
  
  if (event.type === 'key_down' && event.key === 'ArrowLeft') {
    const ships = ctx.queryEntities({ tag: 'ship' });
    const ship = ships[0];
    if (ship) {
      ctx.setEntityAngularVelocity(ship, 3);
    }
  }
  
  if (event.type === 'key_down' && event.key === 'ArrowRight') {
    const ships = ctx.queryEntities({ tag: 'ship' });
    const ship = ships[0];
    if (ship) {
      ctx.setEntityAngularVelocity(ship, -3);
    }
  }
  
  if (event.type === 'key_up' && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
    const ships = ctx.queryEntities({ tag: 'ship' });
    const ship = ships[0];
    if (ship) {
      ctx.setEntityAngularVelocity(ship, 0);
    }
  }
};

exports.onCollision = function(ctx, collision) {
  const entityA = collision.entityA;
  const entityB = collision.entityB;
  
  const bullet = ctx.hasTag(entityA, 'bullet') ? entityA : 
                 ctx.hasTag(entityB, 'bullet') ? entityB : null;
  const asteroid = ctx.hasTag(entityA, 'asteroid') ? entityA :
                   ctx.hasTag(entityB, 'asteroid') ? entityB : null;
  
  if (bullet && asteroid) {
    const size = ctx.getEntityProperty(asteroid, 'asteroidSize');
    const pos = ctx.getEntityPosition(asteroid);
    
    ctx.destroyEntity(bullet);
    ctx.destroyEntity(asteroid);
    
    if (size === 'large') {
      ctx.addScore(20);
      spawnAsteroidFragment(ctx, pos, 'medium');
      spawnAsteroidFragment(ctx, pos, 'medium');
    } else if (size === 'medium') {
      ctx.addScore(50);
      spawnAsteroidFragment(ctx, pos, 'small');
      spawnAsteroidFragment(ctx, pos, 'small');
    } else if (size === 'small') {
      ctx.addScore(100);
    }
    return;
  }
  
  const ship = ctx.hasTag(entityA, 'ship') ? entityA :
               ctx.hasTag(entityB, 'ship') ? entityB : null;
  const hitAsteroid = ctx.hasTag(entityA, 'asteroid') ? entityA :
                      ctx.hasTag(entityB, 'asteroid') ? entityB : null;
  
  if (ship && hitAsteroid) {
    const invuln = ctx.getVariable('shipInvuln');
    if (!invuln) {
      ctx.destroyEntity(ship);
      ctx.addLives(-1);
      
      if (ctx.getVariable('lives') > 0) {
        shipRespawning = true;
        respawnTimer = RESPAWN_DELAY;
      }
    }
  }
};

function wrapEntity(ctx, entityId) {
  const pos = ctx.getEntityPosition(entityId);
  if (!pos) return;
  
  const halfW = ctx.getConstant('HALF_W');
  const halfH = ctx.getConstant('HALF_H');
  
  let wrapped = false;
  let newX = pos.x;
  let newY = pos.y;
  
  if (pos.x < -halfW) {
    newX = halfW;
    wrapped = true;
  } else if (pos.x > halfW) {
    newX = -halfW;
    wrapped = true;
  }
  
  if (pos.y < -halfH) {
    newY = halfH;
    wrapped = true;
  } else if (pos.y > halfH) {
    newY = -halfH;
    wrapped = true;
  }
  
  if (wrapped) {
    ctx.setEntityPosition(entityId, { x: newX, y: newY });
  }
}

function spawnInitialAsteroids(ctx) {
  const halfW = ctx.getConstant('HALF_W');
  const halfH = ctx.getConstant('HALF_H');
  
  for (let i = 0; i < 4; i++) {
    let x, y;
    do {
      x = ctx.randomFloat(-halfW + 2, halfW - 2);
      y = ctx.randomFloat(-halfH + 2, halfH - 2);
    } while (Math.abs(x) < 3 && Math.abs(y) < 3);
    
    spawnAsteroidFragment(ctx, { x, y }, 'large');
  }
}

function spawnAsteroidFragment(ctx, pos, size) {
  const asteroid = ctx.spawnEntity('asteroid-' + size, pos);
  
  const angle = ctx.randomFloat(0, Math.PI * 2);
  const speed = ctx.randomFloat(1, 3);
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;
  
  ctx.setEntityVelocity(asteroid, { x: vx, y: vy });
  ctx.setEntityProperty(asteroid, 'asteroidSize', size);
  
  const angularVel = ctx.randomFloat(-2, 2);
  ctx.setEntityAngularVelocity(asteroid, angularVel);
}

function respawnShip(ctx) {
  ctx.spawnEntity('ship', { x: 0, y: 0 });
}
`,
  templates: {
    ship: {
      id: "ship",
      tags: ["ship"],
      visual: {
        type: "image",
        whatDescription: "a triangular spaceship pointing upward",
        imageWidth: SHIP_SIZE,
        imageHeight: SHIP_SIZE,
      },
      physics: {
        bodyType: "dynamic",
        density: 1,
        linearDamping: 0.5,
        angularDamping: 2,
        fixedRotation: false,
      },
      collider: {
        shape: "circle",
        radius: SHIP_SIZE / 2,
        friction: 0,
        restitution: 0,
      },
      behaviors: [],
    },
    "asteroid-large": {
      id: "asteroid-large",
      tags: ["asteroid"],
      visual: {
        type: "image",
        whatDescription: "a large jagged gray asteroid",
        imageWidth: ASTEROID_LARGE_RADIUS * 2,
        imageHeight: ASTEROID_LARGE_RADIUS * 2,
      },
      physics: {
        bodyType: "dynamic",
        density: 1,
        linearDamping: 0,
        angularDamping: 0,
        fixedRotation: false,
      },
      collider: {
        shape: "circle",
        radius: ASTEROID_LARGE_RADIUS,
        friction: 0,
        restitution: 0.8,
      },
    },
    "asteroid-medium": {
      id: "asteroid-medium",
      tags: ["asteroid"],
      visual: {
        type: "image",
        whatDescription: "a medium jagged gray asteroid",
        imageWidth: ASTEROID_MEDIUM_RADIUS * 2,
        imageHeight: ASTEROID_MEDIUM_RADIUS * 2,
      },
      physics: {
        bodyType: "dynamic",
        density: 1,
        linearDamping: 0,
        angularDamping: 0,
        fixedRotation: false,
      },
      collider: {
        shape: "circle",
        radius: ASTEROID_MEDIUM_RADIUS,
        friction: 0,
        restitution: 0.8,
      },
    },
    "asteroid-small": {
      id: "asteroid-small",
      tags: ["asteroid"],
      visual: {
        type: "image",
        whatDescription: "a small jagged gray asteroid",
        imageWidth: ASTEROID_SMALL_RADIUS * 2,
        imageHeight: ASTEROID_SMALL_RADIUS * 2,
      },
      physics: {
        bodyType: "dynamic",
        density: 1,
        linearDamping: 0,
        angularDamping: 0,
        fixedRotation: false,
      },
      collider: {
        shape: "circle",
        radius: ASTEROID_SMALL_RADIUS,
        friction: 0,
        restitution: 0.8,
      },
    },
    bullet: {
      id: "bullet",
      tags: ["bullet"],
      visual: {
        type: "circle",
        radius: BULLET_RADIUS,
        color: "#FFFFFF",
      },
      physics: {
        bodyType: "dynamic",
        density: 0.1,
        linearDamping: 0,
        fixedRotation: true,
      },
      collider: {
        shape: "circle",
        radius: BULLET_RADIUS,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
      behaviors: [],
    },
  },
  entities: [
    {
      id: "ship",
      name: "Ship",
      template: "ship",
      transform: { x: 0, y: 0, angle: Math.PI / 2, scaleX: 1, scaleY: 1 },
    },
  ],
  rules: [],
};

export default game;
