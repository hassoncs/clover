import type { GameDefinition } from "@slopcade/shared";

export const metadata = {
  title: "Tetris",
  description: "Classic falling blocks puzzle game",
};

const WORLD_WIDTH = 10;
const WORLD_HEIGHT = 20;
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;
const cx = (x: number) => x - HALF_W;
const cy = (y: number) => HALF_H - y;

const BLOCK_SIZE = 0.9;
const GRID_WIDTH = 10;
const GRID_HEIGHT = 20;

const game: GameDefinition = {
  metadata: {
    id: "test-tetris",
    title: "Tetris",
    description: "Classic falling blocks puzzle game",
    instructions: "Swipe left/right to move, tap to rotate, swipe down to drop faster",
    version: "1.0.0",
  },
  assetSystem: { activePackId: "default" },
  background: {
    type: "static",
    color: "#1a1a2e",
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: 40,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  camera: { type: "fixed", zoom: 1 },
  ui: {
    showTimer: false,
    backgroundColor: "#1a1a2e",
    variableDisplays: [
      { name: 'score', label: 'Score', position: 'top-center' },
      { name: 'lines', label: 'Lines', position: 'top-right' },
      { name: 'level', label: 'Level', position: 'top-left' },
    ],
  },
  loseCondition: {
    type: "custom",
    expr: "gameOver == 1",
  },
  variables: {
    score: 0,
    lines: 0,
    level: 1,
    gameOver: 0,
    pieceX: 3,
    pieceY: 0,
    pieceRotation: 0,
    pieceType: 0,
    dropTimer: 0,
  },
  templates: {
    block: {
      id: "block",
      tags: ["block", "placed"],
      visual: {
        type: "rect",
        width: BLOCK_SIZE,
        height: BLOCK_SIZE,
        color: "#888888",
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "box",
        width: BLOCK_SIZE,
        height: BLOCK_SIZE,
        isSensor: true,
      },
    },
    wall: {
      id: "wall",
      tags: ["wall"],
      visual: {
        type: "rect",
        width: 0.2,
        height: WORLD_HEIGHT,
        color: "#374151",
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "box",
        width: 0.2,
        height: WORLD_HEIGHT,
        isSensor: true,
      },
    },
    floor: {
      id: "floor",
      tags: ["floor"],
      visual: {
        type: "rect",
        width: WORLD_WIDTH,
        height: 0.2,
        color: "#374151",
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "box",
        width: WORLD_WIDTH,
        height: 0.2,
        isSensor: true,
      },
    },
  },
  entities: [
    {
      id: "wall-left",
      name: "Left Wall",
      template: "wall",
      transform: { x: cx(-0.1), y: 0, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "wall-right",
      name: "Right Wall",
      template: "wall",
      transform: { x: cx(10.1), y: 0, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "floor",
      name: "Floor",
      template: "floor",
      transform: { x: 0, y: cy(20.1), angle: 0, scaleX: 1, scaleY: 1 },
    },
  ],
  rules: [
    {
      id: "move_left",
      name: "Move piece left",
      trigger: { type: "swipe", direction: "left" },
      conditions: [{ type: "expression", expr: "gameOver == 0" }],
      actions: [
        { type: "set_variable", name: "pieceX", operation: "add", value: -1 },
        { type: "event", eventName: "piece_moved" },
      ],
    },
    {
      id: "move_right",
      name: "Move piece right",
      trigger: { type: "swipe", direction: "right" },
      conditions: [{ type: "expression", expr: "gameOver == 0" }],
      actions: [
        { type: "set_variable", name: "pieceX", operation: "add", value: 1 },
        { type: "event", eventName: "piece_moved" },
      ],
    },
    {
      id: "rotate",
      name: "Rotate piece",
      trigger: { type: "tap" },
      conditions: [{ type: "expression", expr: "gameOver == 0" }],
      actions: [
        { type: "set_variable", name: "pieceRotation", operation: "add", value: 1 },
        { type: "event", eventName: "piece_rotated" },
      ],
    },
    {
      id: "soft_drop",
      name: "Soft drop",
      trigger: { type: "swipe", direction: "down" },
      conditions: [{ type: "expression", expr: "gameOver == 0" }],
      actions: [
        { type: "set_variable", name: "score", operation: "add", value: 1 },
        { type: "event", eventName: "force_drop" },
      ],
    },
  ],
  script: `
const GRID_WIDTH = 10;
const GRID_HEIGHT = 20;
const BLOCK_SIZE = 0.9;
const WORLD_WIDTH = 10;
const WORLD_HEIGHT = 20;
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;
const cx = (x) => x - HALF_W;
const cy = (y) => HALF_H - y;

const PIECES = [
  { name: "I", color: "#00f0f0", blocks: [[0, 0], [1, 0], [2, 0], [3, 0]] },
  { name: "O", color: "#f0f000", blocks: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  { name: "T", color: "#a000f0", blocks: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  { name: "S", color: "#00f000", blocks: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  { name: "Z", color: "#f00000", blocks: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  { name: "J", color: "#0000f0", blocks: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  { name: "L", color: "#f0a000", blocks: [[2, 0], [0, 1], [1, 1], [2, 1]] },
];

let grid = [];
let activePiece = null;
let dropAccumulator = 0;

function createGrid() {
  grid = [];
  for (let y = 0; y < GRID_HEIGHT; y++) {
    grid[y] = [];
    for (let x = 0; x < GRID_WIDTH; x++) {
      grid[y][x] = 0;
    }
  }
}

function spawnPiece(ctx) {
  const type = Math.floor(Math.random() * PIECES.length);
  ctx.setVariable('pieceType', type);
  ctx.setVariable('pieceX', 3);
  ctx.setVariable('pieceY', 0);
  ctx.setVariable('pieceRotation', 0);
  
  activePiece = {
    type: type,
    x: 3,
    y: 0,
    rotation: 0,
  };
  
  if (checkCollision(activePiece)) {
    ctx.setVariable('gameOver', 1);
  }
}

function getRotatedBlocks(piece) {
  const pieceDef = PIECES[piece.type];
  const rotation = piece.rotation % 4;
  let blocks = pieceDef.blocks.map(b => [...b]);
  
  for (let r = 0; r < rotation; r++) {
    blocks = blocks.map(b => [3 - b[1], b[0]]);
  }
  
  return blocks;
}

function checkCollision(piece) {
  const blocks = getRotatedBlocks(piece);
  
  for (const block of blocks) {
    const x = piece.x + block[0];
    const y = piece.y + block[1];
    
    if (x < 0 || x >= GRID_WIDTH || y >= GRID_HEIGHT) return true;
    if (y >= 0 && grid[y][x]) return true;
  }
  
  return false;
}

function lockPiece(ctx) {
  const blocks = getRotatedBlocks(activePiece);
  const pieceDef = PIECES[activePiece.type];
  
  for (const block of blocks) {
    const x = activePiece.x + block[0];
    const y = activePiece.y + block[1];
    
    if (y >= 0) {
      grid[y][x] = 1;
      
      const blockId = 'block-' + x + '-' + y;
      ctx.spawnEntity('block', { x: cx(x * BLOCK_SIZE + 0.5), y: cy(y * BLOCK_SIZE + 0.5) }, {
        id: blockId,
        visual: { color: pieceDef.color },
      });
    }
  }
  
  clearLines(ctx);
  spawnPiece(ctx);
}

function clearLines(ctx) {
  let linesCleared = 0;
  
  for (let y = GRID_HEIGHT - 1; y >= 0; y--) {
    if (grid[y].every(cell => cell === 1)) {
      linesCleared++;
      
      for (let x = 0; x < GRID_WIDTH; x++) {
        const blockId = 'block-' + x + '-' + y;
        ctx.destroyEntity(blockId);
      }
      
      for (let moveY = y; moveY > 0; moveY--) {
        grid[moveY] = [...grid[moveY - 1]];
      }
      grid[0] = new Array(GRID_WIDTH).fill(0);
      
      y++;
    }
  }
  
  if (linesCleared > 0) {
    const currentLines = ctx.getVariable('lines') || 0;
    const currentScore = ctx.getVariable('score') || 0;
    const currentLevel = ctx.getVariable('level') || 1;
    
    const points = [0, 40, 100, 300, 1200][linesCleared] * currentLevel;
    ctx.setVariable('score', currentScore + points);
    ctx.setVariable('lines', currentLines + linesCleared);
    ctx.setVariable('level', Math.floor((currentLines + linesCleared) / 10) + 1);
  }
}

exports.onStart = function(ctx) {
  createGrid();
  spawnPiece(ctx);
  ctx.setVariable('score', 0);
  ctx.setVariable('lines', 0);
  ctx.setVariable('level', 1);
  ctx.setVariable('gameOver', 0);
  dropAccumulator = 0;
};

exports.onUpdate = function(ctx, dt) {
  if (ctx.getVariable('gameOver') === 1) return;
  
  const level = ctx.getVariable('level') || 1;
  const dropInterval = Math.max(0.1, 1.0 - (level - 1) * 0.1);
  
  dropAccumulator += dt;
  
  if (dropAccumulator >= dropInterval) {
    dropAccumulator = 0;
    
    activePiece.y += 1;
    
    if (checkCollision(activePiece)) {
      activePiece.y -= 1;
      lockPiece(ctx);
    } else {
      ctx.setVariable('pieceY', activePiece.y);
    }
  }
};

exports.onInput = function(ctx, event) {
  if (ctx.getVariable('gameOver') === 1) return;
  
  if (event.type === 'swipe') {
    const pieceType = ctx.getVariable('pieceType');
    const pieceX = ctx.getVariable('pieceX');
    const pieceY = ctx.getVariable('pieceY');
    const pieceRotation = ctx.getVariable('pieceRotation');
    
    activePiece = {
      type: pieceType,
      x: pieceX,
      y: pieceY,
      rotation: pieceRotation,
    };
    
    if (event.direction === 'left') {
      activePiece.x -= 1;
      if (!checkCollision(activePiece)) {
        ctx.setVariable('pieceX', activePiece.x);
      } else {
        activePiece.x += 1;
      }
    } else if (event.direction === 'right') {
      activePiece.x += 1;
      if (!checkCollision(activePiece)) {
        ctx.setVariable('pieceX', activePiece.x);
      } else {
        activePiece.x -= 1;
      }
    } else if (event.direction === 'down') {
      while (!checkCollision(activePiece)) {
        activePiece.y += 1;
      }
      activePiece.y -= 1;
      ctx.setVariable('pieceY', activePiece.y);
      lockPiece(ctx);
    }
  } else if (event.type === 'tap') {
    const pieceType = ctx.getVariable('pieceType');
    const pieceX = ctx.getVariable('pieceX');
    const pieceY = ctx.getVariable('pieceY');
    const pieceRotation = ctx.getVariable('pieceRotation');
    
    activePiece = {
      type: pieceType,
      x: pieceX,
      y: pieceY,
      rotation: pieceRotation,
    };
    
    activePiece.rotation += 1;
    if (!checkCollision(activePiece)) {
      ctx.setVariable('pieceRotation', activePiece.rotation);
    } else {
      activePiece.rotation -= 1;
    }
  }
};
`,
};

export default game;
