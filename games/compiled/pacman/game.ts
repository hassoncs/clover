import type { GameDefinition, GameEntity } from "@slopcade/shared";

export const metadata = {
  title: "Pac-Man",
  description: "Classic arcade game. Eat all the dots while avoiding ghosts!",
};

const WORLD_WIDTH = 14;
const WORLD_HEIGHT = 18;
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;
const cx = (x: number) => x - HALF_W;
const cy = (y: number) => HALF_H - y;

const GRID_SIZE = 0.8;
const GRID_COLS = 14;
const GRID_ROWS = 18;

const MAZE_LAYOUT = [
  "##############",
  "#............#",
  "#.##.####.##.#",
  "#o##.####.##o#",
  "#............#",
  "#.##.##.##.##.#",
  "#....##......#",
  "####.## ####.#",
  "####.## ####.#",
  "#....##......#",
  "#.##.##.##.##.#",
  "#............#",
  "#o##.####.##o#",
  "#.##.####.##.#",
  "#............#",
  "#.##.##.##.##.#",
  "#....##......#",
  "##############",
];

function generateMazeEntities(): GameEntity[] {
  const entities: GameEntity[] = [];
  let dotCount = 0;

  for (let row = 0; row < MAZE_LAYOUT.length; row++) {
    for (let col = 0; col < MAZE_LAYOUT[row].length; col++) {
      const cell = MAZE_LAYOUT[row][col];
      const x = cx(col * GRID_SIZE + GRID_SIZE / 2);
      const y = cy(row * GRID_SIZE + GRID_SIZE / 2);

      if (cell === '#') {
        entities.push({
          id: `wall-${col}-${row}`,
          name: `Wall ${col},${row}`,
          template: "wall",
          transform: { x, y, angle: 0, scaleX: 1, scaleY: 1 },
        });
      } else if (cell === '.') {
        entities.push({
          id: `dot-${col}-${row}`,
          name: `Dot ${col},${row}`,
          template: "dot",
          transform: { x, y, angle: 0, scaleX: 1, scaleY: 1 },
        });
        dotCount++;
      } else if (cell === 'o') {
        entities.push({
          id: `power-${col}-${row}`,
          name: `Power Pellet ${col},${row}`,
          template: "powerPellet",
          transform: { x, y, angle: 0, scaleX: 1, scaleY: 1 },
        });
        dotCount++;
      }
    }
  }

  return entities;
}

const game: GameDefinition = {
  metadata: {
    id: "test-pacman",
    title: "Pac-Man",
    description: "Classic arcade game. Eat all the dots while avoiding ghosts!",
    instructions: "Swipe to move Pac-Man. Eat all dots to win. Avoid ghosts! Power pellets make ghosts vulnerable.",
    version: "1.0.0",
  },
  assetSystem: { activePackId: "pacman-default" },
  background: {
    type: "static",
    color: "#000000",
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: 60,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  camera: { type: "fixed", zoom: 1 },
  ui: {
    showTimer: false,
    backgroundColor: "#000000",
    variableDisplays: [
      { name: 'score', label: 'Score', position: 'top-center' },
      { name: 'lives', label: 'Lives', position: 'top-left' },
    ],
  },
  winCondition: {
    expr: "dotsRemaining == 0",
  },
  loseCondition: {
    type: "custom",
    expr: "lives <= 0",
  },
  variables: {
    score: 0,
    lives: 3,
    dotsRemaining: 0,
    pacmanX: 7,
    pacmanY: 13,
    direction: 0,
    nextDirection: 0,
    powerMode: 0,
    powerTimer: 0,
    ghostsEaten: 0,
  },
  templates: {
    pacman: {
      id: "pacman",
      tags: ["pacman", "player"],
      visual: {
        type: "circle",
        radius: GRID_SIZE * 0.35,
        color: "#FFFF00",
      },
      physics: {
        bodyType: "kinematic",
        density: 0,
      },
      collider: {
        shape: "circle",
        radius: GRID_SIZE * 0.35,
        isSensor: true,
      },
    },
    ghost: {
      id: "ghost",
      tags: ["ghost"],
      visual: {
        type: "circle",
        radius: GRID_SIZE * 0.35,
        color: "#FF0000",
      },
      physics: {
        bodyType: "kinematic",
        density: 0,
      },
      collider: {
        shape: "circle",
        radius: GRID_SIZE * 0.35,
        isSensor: true,
      },
    },
    dot: {
      id: "dot",
      tags: ["dot", "collectible"],
      visual: {
        type: "circle",
        radius: GRID_SIZE * 0.1,
        color: "#FFB897",
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "circle",
        radius: GRID_SIZE * 0.1,
        isSensor: true,
      },
    },
    powerPellet: {
      id: "powerPellet",
      tags: ["power", "collectible"],
      visual: {
        type: "circle",
        radius: GRID_SIZE * 0.25,
        color: "#FFFFFF",
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "circle",
        radius: GRID_SIZE * 0.25,
        isSensor: true,
      },
    },
    wall: {
      id: "wall",
      tags: ["wall"],
      visual: {
        type: "rect",
        width: GRID_SIZE,
        height: GRID_SIZE,
        color: "#2121DE",
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "box",
        width: GRID_SIZE,
        height: GRID_SIZE,
        isSensor: true,
      },
    },
  },
  entities: [
    {
      id: "pacman",
      name: "Pac-Man",
      template: "pacman",
      transform: { x: cx(7 * GRID_SIZE + GRID_SIZE / 2), y: cy(13 * GRID_SIZE + GRID_SIZE / 2), angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "ghost-red",
      name: "Red Ghost",
      template: "ghost",
      transform: { x: cx(6 * GRID_SIZE + GRID_SIZE / 2), y: cy(8 * GRID_SIZE + GRID_SIZE / 2), angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "ghost-pink",
      name: "Pink Ghost",
      template: "ghost",
      transform: { x: cx(7 * GRID_SIZE + GRID_SIZE / 2), y: cy(8 * GRID_SIZE + GRID_SIZE / 2), angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "ghost-cyan",
      name: "Cyan Ghost",
      template: "ghost",
      transform: { x: cx(6 * GRID_SIZE + GRID_SIZE / 2), y: cy(9 * GRID_SIZE + GRID_SIZE / 2), angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "ghost-orange",
      name: "Orange Ghost",
      template: "ghost",
      transform: { x: cx(7 * GRID_SIZE + GRID_SIZE / 2), y: cy(9 * GRID_SIZE + GRID_SIZE / 2), angle: 0, scaleX: 1, scaleY: 1 },
    },
    ...generateMazeEntities(),
  ],
  rules: [
    {
      id: "swipe_up",
      name: "Swipe up",
      trigger: { type: "swipe", direction: "up" },
      actions: [{ type: "set_variable", name: "nextDirection", operation: "set", value: 0 }],
    },
    {
      id: "swipe_right",
      name: "Swipe right",
      trigger: { type: "swipe", direction: "right" },
      actions: [{ type: "set_variable", name: "nextDirection", operation: "set", value: 1 }],
    },
    {
      id: "swipe_down",
      name: "Swipe down",
      trigger: { type: "swipe", direction: "down" },
      actions: [{ type: "set_variable", name: "nextDirection", operation: "set", value: 2 }],
    },
    {
      id: "swipe_left",
      name: "Swipe left",
      trigger: { type: "swipe", direction: "left" },
      actions: [{ type: "set_variable", name: "nextDirection", operation: "set", value: 3 }],
    },
    {
      id: "eat_dot",
      name: "Eat dot",
      trigger: {
        type: "collision",
        entityATag: "pacman",
        entityBTag: "dot",
      },
      actions: [
        { type: "set_variable", name: "score", operation: "add", value: 10 },
        { type: "set_variable", name: "dotsRemaining", operation: "add", value: -1 },
        { type: "destroy", target: { type: "collision_entities" } },
      ],
    },
    {
      id: "eat_power",
      name: "Eat power pellet",
      trigger: {
        type: "collision",
        entityATag: "pacman",
        entityBTag: "power",
      },
      actions: [
        { type: "set_variable", name: "score", operation: "add", value: 50 },
        { type: "set_variable", name: "dotsRemaining", operation: "add", value: -1 },
        { type: "set_variable", name: "powerMode", operation: "set", value: 1 },
        { type: "set_variable", name: "powerTimer", operation: "set", value: 8 },
        { type: "set_variable", name: "ghostsEaten", operation: "set", value: 0 },
        { type: "destroy", target: { type: "collision_entities" } },
      ],
    },
  ],
  script: `
const GRID_SIZE = 0.8;
const GRID_COLS = 14;
const GRID_ROWS = 18;
const WORLD_WIDTH = 14;
const WORLD_HEIGHT = 18;
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;
const cx = (x) => x - HALF_W;
const cy = (y) => HALF_H - y;
const MOVE_DELAY = 0.15;

const MAZE_LAYOUT = [
  "##############",
  "#............#",
  "#.##.####.##.#",
  "#o##.####.##o#",
  "#............#",
  "#.##.##.##.##.#",
  "#....##......#",
  "####.## ####.#",
  "####.## ####.#",
  "#....##......#",
  "#.##.##.##.##.#",
  "#............#",
  "#o##.####.##o#",
  "#.##.####.##.#",
  "#............#",
  "#.##.##.##.##.#",
  "#....##......#",
  "##############",
];

const GHOST_COLORS = {
  'ghost-red': '#FF0000',
  'ghost-pink': '#FFB8FF',
  'ghost-cyan': '#00FFFF',
  'ghost-orange': '#FFB852',
};

const VULNERABLE_COLOR = '#2121FF';
const EATEN_COLOR = '#888888';

let ghosts = [
  { id: 'ghost-red', x: 6, y: 8, direction: 1, respawnTimer: 0 },
  { id: 'ghost-pink', x: 7, y: 8, direction: 3, respawnTimer: 0 },
  { id: 'ghost-cyan', x: 6, y: 9, direction: 0, respawnTimer: 0 },
  { id: 'ghost-orange', x: 7, y: 9, direction: 2, respawnTimer: 0 },
];

let pacman = { x: 7, y: 13 };
let moveAccumulator = 0;

function isWall(x, y) {
  if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) return true;
  return MAZE_LAYOUT[y][x] === '#';
}

function canMove(x, y, dir) {
  let newX = x;
  let newY = y;
  
  if (dir === 0) newY -= 1;
  else if (dir === 1) newX += 1;
  else if (dir === 2) newY += 1;
  else if (dir === 3) newX -= 1;
  
  return !isWall(newX, newY);
}

function movePacman(ctx) {
  const nextDir = ctx.getVariable('nextDirection');
  const currentDir = ctx.getVariable('direction');
  
  if (canMove(pacman.x, pacman.y, nextDir)) {
    ctx.setVariable('direction', nextDir);
  }
  
  const dir = ctx.getVariable('direction');
  
  if (canMove(pacman.x, pacman.y, dir)) {
    if (dir === 0) pacman.y -= 1;
    else if (dir === 1) pacman.x += 1;
    else if (dir === 2) pacman.y += 1;
    else if (dir === 3) pacman.x -= 1;
    
    ctx.setVariable('pacmanX', pacman.x);
    ctx.setVariable('pacmanY', pacman.y);
    
    const worldX = cx(pacman.x * GRID_SIZE + GRID_SIZE / 2);
    const worldY = cy(pacman.y * GRID_SIZE + GRID_SIZE / 2);
    ctx.setEntityPosition('pacman', { x: worldX, y: worldY });
  }
}

function getDistance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function moveGhost(ctx, ghost) {
  if (ghost.respawnTimer > 0) {
    ghost.respawnTimer -= MOVE_DELAY;
    return;
  }
  
  const powerMode = ctx.getVariable('powerMode');
  const validDirs = [];
  
  for (let dir = 0; dir < 4; dir++) {
    if (dir === (ghost.direction + 2) % 4) continue;
    if (canMove(ghost.x, ghost.y, dir)) {
      validDirs.push(dir);
    }
  }
  
  if (validDirs.length === 0) {
    ghost.direction = (ghost.direction + 2) % 4;
    return;
  }
  
  let bestDir = validDirs[0];
  let bestDist = powerMode ? -Infinity : Infinity;
  
  for (const dir of validDirs) {
    let newX = ghost.x;
    let newY = ghost.y;
    
    if (dir === 0) newY -= 1;
    else if (dir === 1) newX += 1;
    else if (dir === 2) newY += 1;
    else if (dir === 3) newX -= 1;
    
    const dist = getDistance(newX, newY, pacman.x, pacman.y);
    
    if (powerMode) {
      if (dist > bestDist) {
        bestDist = dist;
        bestDir = dir;
      }
    } else {
      if (dist < bestDist) {
        bestDist = dist;
        bestDir = dir;
      }
    }
  }
  
  ghost.direction = bestDir;
  
  if (ghost.direction === 0) ghost.y -= 1;
  else if (ghost.direction === 1) ghost.x += 1;
  else if (ghost.direction === 2) ghost.y += 1;
  else if (ghost.direction === 3) ghost.x -= 1;
  
  const worldX = cx(ghost.x * GRID_SIZE + GRID_SIZE / 2);
  const worldY = cy(ghost.y * GRID_SIZE + GRID_SIZE / 2);
  ctx.setEntityPosition(ghost.id, { x: worldX, y: worldY });
}

function checkGhostCollisions(ctx) {
  const powerMode = ctx.getVariable('powerMode');
  
  for (const ghost of ghosts) {
    if (ghost.respawnTimer > 0) continue;
    
    if (ghost.x === pacman.x && ghost.y === pacman.y) {
      if (powerMode) {
        const ghostsEaten = ctx.getVariable('ghostsEaten') || 0;
        const points = 200 * Math.pow(2, ghostsEaten);
        ctx.setVariable('score', ctx.getVariable('score') + points);
        ctx.setVariable('ghostsEaten', ghostsEaten + 1);
        
        ghost.x = 6 + (ghosts.indexOf(ghost) % 2);
        ghost.y = 8 + Math.floor(ghosts.indexOf(ghost) / 2);
        ghost.respawnTimer = 3;
        
        const worldX = cx(ghost.x * GRID_SIZE + GRID_SIZE / 2);
        const worldY = cy(ghost.y * GRID_SIZE + GRID_SIZE / 2);
        ctx.setEntityPosition(ghost.id, { x: worldX, y: worldY });
      } else {
        const lives = ctx.getVariable('lives');
        ctx.setVariable('lives', lives - 1);
        
        pacman.x = 7;
        pacman.y = 13;
        ctx.setVariable('pacmanX', 7);
        ctx.setVariable('pacmanY', 13);
        ctx.setVariable('direction', 0);
        ctx.setVariable('nextDirection', 0);
        
        const worldX = cx(pacman.x * GRID_SIZE + GRID_SIZE / 2);
        const worldY = cy(pacman.y * GRID_SIZE + GRID_SIZE / 2);
        ctx.setEntityPosition('pacman', { x: worldX, y: worldY });
        
        for (let i = 0; i < ghosts.length; i++) {
          ghosts[i].x = 6 + (i % 2);
          ghosts[i].y = 8 + Math.floor(i / 2);
          ghosts[i].respawnTimer = 0;
          const gx = cx(ghosts[i].x * GRID_SIZE + GRID_SIZE / 2);
          const gy = cy(ghosts[i].y * GRID_SIZE + GRID_SIZE / 2);
          ctx.setEntityPosition(ghosts[i].id, { x: gx, y: gy });
        }
      }
    }
  }
}

function updateGhostColors(ctx) {
  const powerMode = ctx.getVariable('powerMode');
  
  for (const ghost of ghosts) {
    let color;
    if (ghost.respawnTimer > 0) {
      color = EATEN_COLOR;
    } else if (powerMode) {
      color = VULNERABLE_COLOR;
    } else {
      color = GHOST_COLORS[ghost.id] || '#FF0000';
    }
    
    ctx.setEntityProperty(ghost.id, 'visual.color', color);
  }
}

exports.onStart = function(ctx) {
  pacman = { x: 7, y: 13 };
  ghosts = [
    { id: 'ghost-red', x: 6, y: 8, direction: 1, respawnTimer: 0 },
    { id: 'ghost-pink', x: 7, y: 8, direction: 3, respawnTimer: 0 },
    { id: 'ghost-cyan', x: 6, y: 9, direction: 0, respawnTimer: 0 },
    { id: 'ghost-orange', x: 7, y: 9, direction: 2, respawnTimer: 0 },
  ];
  
  let dotCount = 0;
  for (let row = 0; row < MAZE_LAYOUT.length; row++) {
    for (let col = 0; col < MAZE_LAYOUT[row].length; col++) {
      const cell = MAZE_LAYOUT[row][col];
      if (cell === '.' || cell === 'o') {
        dotCount++;
      }
    }
  }
  
  ctx.setVariable('score', 0);
  ctx.setVariable('lives', 3);
  ctx.setVariable('dotsRemaining', dotCount);
  ctx.setVariable('direction', 0);
  ctx.setVariable('nextDirection', 0);
  ctx.setVariable('powerMode', 0);
  ctx.setVariable('powerTimer', 0);
  ctx.setVariable('ghostsEaten', 0);
  moveAccumulator = 0;
  
  updateGhostColors(ctx);
};

exports.onUpdate = function(ctx, dt) {
  moveAccumulator += dt;
  
  if (moveAccumulator >= MOVE_DELAY) {
    moveAccumulator = 0;
    
    movePacman(ctx);
    
    for (const ghost of ghosts) {
      moveGhost(ctx, ghost);
    }
    
    checkGhostCollisions(ctx);
  }
  
  const powerMode = ctx.getVariable('powerMode');
  if (powerMode) {
    const powerTimer = ctx.getVariable('powerTimer');
    const newTimer = powerTimer - dt;
    
    if (newTimer <= 0) {
      ctx.setVariable('powerMode', 0);
      ctx.setVariable('powerTimer', 0);
    } else {
      ctx.setVariable('powerTimer', newTimer);
    }
  }
  
  updateGhostColors(ctx);
};
`,
};

export default game;
