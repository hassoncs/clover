import type { GameDefinition, GameEntity } from "@slopcade/shared";

export const metadata = {
  title: "Sokoban",
  description: "Push boxes onto target spots to win!",
};

const WORLD_WIDTH = 12;
const WORLD_HEIGHT = 12;
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;
const cx = (x: number) => x - HALF_W;
const cy = (y: number) => HALF_H - y;

const TILE_SIZE = 1.2;
const GRID_SIZE = 8;
const GRID_OFFSET_X = 0.6;
const GRID_OFFSET_Y = 2.4;

function generateLevel(): GameEntity[] {
  const entities: GameEntity[] = [];
  
  // Level layout (8x8 grid):
  // # = wall, . = floor, @ = player start, $ = box, * = target
  const level = [
    "########",
    "#......#",
    "#..$..*#",
    "#......#",
    "#......#",
    "#..*$..#",
    "#..@...#",
    "########",
  ];
  
  let playerRow = 0;
  let playerCol = 0;
  
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const char = level[row][col];
      const x = cx(col * TILE_SIZE + GRID_OFFSET_X);
      const y = cy(row * TILE_SIZE + GRID_OFFSET_Y);
      
      if (char === "#") {
        entities.push({
          id: `wall-${row}-${col}`,
          name: `Wall ${row},${col}`,
          template: "wall",
          transform: { x, y, angle: 0, scaleX: 1, scaleY: 1 },
        });
      } else {
        // Add floor tile
        entities.push({
          id: `floor-${row}-${col}`,
          name: `Floor ${row},${col}`,
          template: "floor",
          transform: { x, y, angle: 0, scaleX: 1, scaleY: 1 },
        });
        
        if (char === "*") {
          // Target spot
          entities.push({
            id: `target-${row}-${col}`,
            name: `Target ${row},${col}`,
            template: "target",
            transform: { x, y, angle: 0, scaleX: 1, scaleY: 1 },
          });
        } else if (char === "$") {
          // Box
          entities.push({
            id: `box-${row}-${col}`,
            name: `Box ${row},${col}`,
            template: "box",
            transform: { x, y, angle: 0, scaleX: 1, scaleY: 1 },
          });
        } else if (char === "@") {
          // Player
          playerRow = row;
          playerCol = col;
        }
      }
    }
  }
  
  // Add player
  const playerX = cx(playerCol * TILE_SIZE + GRID_OFFSET_X);
  const playerY = cy(playerRow * TILE_SIZE + GRID_OFFSET_Y);
  entities.push({
    id: "player",
    name: "Player",
    template: "player",
    transform: { x: playerX, y: playerY, angle: 0, scaleX: 1, scaleY: 1 },
  });
  
  return entities;
}

const game: GameDefinition = {
  metadata: {
    id: "sokoban",
    title: "Sokoban",
    description: "Push boxes onto target spots to win!",
    instructions: "Swipe up/down/left/right to move. Push all boxes onto the glowing targets!",
    version: "1.0.0",
  },
  assetSystem: { activePackId: "default" },
  background: {
    type: "static",
    color: "#2c3e50",
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: 50,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  camera: { type: "fixed", zoom: 1 },
  ui: {
    showTimer: false,
    backgroundColor: "#2c3e50",
    variableDisplays: [
      { name: 'moves', label: 'Moves', position: 'top-center' },
    ],
  },
  winCondition: {
    expr: "allBoxesOnTargets == 1",
  },
  variables: {
    moves: 0,
    allBoxesOnTargets: 0,
  },
  templates: {
    floor: {
      id: "floor",
      tags: ["floor"],
      visual: {
        type: "rect",
        width: TILE_SIZE,
        height: TILE_SIZE,
        color: "#34495e",
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
    },
    wall: {
      id: "wall",
      tags: ["wall"],
      visual: {
        type: "rect",
        width: TILE_SIZE,
        height: TILE_SIZE,
        color: "#1a252f",
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "box",
        width: TILE_SIZE,
        height: TILE_SIZE,
        isSensor: true,
      },
    },
    target: {
      id: "target",
      tags: ["target"],
      visual: {
        type: "circle",
        radius: TILE_SIZE * 0.35,
        color: "#f39c12",
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
    },
    box: {
      id: "box",
      tags: ["box"],
      visual: {
        type: "rect",
        width: TILE_SIZE * 0.8,
        height: TILE_SIZE * 0.8,
        color: "#8b4513",
      },
      physics: {
        bodyType: "kinematic",
        density: 0,
      },
      collider: {
        shape: "box",
        width: TILE_SIZE * 0.8,
        height: TILE_SIZE * 0.8,
        isSensor: true,
      },
    },
    player: {
      id: "player",
      tags: ["player"],
      visual: {
        type: "circle",
        radius: TILE_SIZE * 0.4,
        color: "#3498db",
      },
      physics: {
        bodyType: "kinematic",
        density: 0,
      },
      collider: {
        shape: "circle",
        radius: TILE_SIZE * 0.4,
        isSensor: true,
      },
    },
  },
  entities: generateLevel(),
  rules: [
    {
      id: "swipe_up",
      name: "Swipe up",
      trigger: { type: "swipe", direction: "up" },
      conditions: [{ type: "expression", expr: "allBoxesOnTargets == 0" }],
      actions: [{ type: "event", eventName: "move_up" }],
    },
    {
      id: "swipe_down",
      name: "Swipe down",
      trigger: { type: "swipe", direction: "down" },
      conditions: [{ type: "expression", expr: "allBoxesOnTargets == 0" }],
      actions: [{ type: "event", eventName: "move_down" }],
    },
    {
      id: "swipe_left",
      name: "Swipe left",
      trigger: { type: "swipe", direction: "left" },
      conditions: [{ type: "expression", expr: "allBoxesOnTargets == 0" }],
      actions: [{ type: "event", eventName: "move_left" }],
    },
    {
      id: "swipe_right",
      name: "Swipe right",
      trigger: { type: "swipe", direction: "right" },
      conditions: [{ type: "expression", expr: "allBoxesOnTargets == 0" }],
      actions: [{ type: "event", eventName: "move_right" }],
    },
  ],
  script: `
const TILE_SIZE = 1.2;
const GRID_SIZE = 8;
const GRID_OFFSET_X = 0.6;
const GRID_OFFSET_Y = 2.4;
const WORLD_WIDTH = 12;
const WORLD_HEIGHT = 12;
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;
const cx = (x) => x - HALF_W;
const cy = (y) => HALF_H - y;

// Grid state: 0 = empty, 1 = wall, 2 = box
let grid = [];
let playerRow = 6;
let playerCol = 3;
let targetPositions = [];

function initGrid() {
  // Initialize grid
  grid = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    grid[row] = [];
    for (let col = 0; col < GRID_SIZE; col++) {
      grid[row][col] = 0;
    }
  }
  
  // Set walls (border)
  for (let i = 0; i < GRID_SIZE; i++) {
    grid[0][i] = 1;
    grid[7][i] = 1;
    grid[i][0] = 1;
    grid[i][7] = 1;
  }
  
  // Set initial boxes
  grid[2][3] = 2;
  grid[5][4] = 2;
  
  // Set target positions
  targetPositions = [
    { row: 2, col: 6 },
    { row: 5, col: 2 },
  ];
  
  // Player position
  playerRow = 6;
  playerCol = 3;
}

function getPosition(row, col) {
  return {
    x: cx(col * TILE_SIZE + GRID_OFFSET_X),
    y: cy(row * TILE_SIZE + GRID_OFFSET_Y),
  };
}

function isWall(row, col) {
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
    return true;
  }
  return grid[row][col] === 1;
}

function isBox(row, col) {
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
    return false;
  }
  return grid[row][col] === 2;
}

function movePlayer(ctx, deltaRow, deltaCol) {
  const newRow = playerRow + deltaRow;
  const newCol = playerCol + deltaCol;
  
  // Check if moving into a wall
  if (isWall(newRow, newCol)) {
    return false;
  }
  
  // Check if pushing a box
  if (isBox(newRow, newCol)) {
    const boxNewRow = newRow + deltaRow;
    const boxNewCol = newCol + deltaCol;
    
    // Can't push box into wall or another box
    if (isWall(boxNewRow, boxNewCol) || isBox(boxNewRow, boxNewCol)) {
      return false;
    }
    
    // Move the box
    grid[newRow][newCol] = 0;
    grid[boxNewRow][boxNewCol] = 2;
    
    // Find and move the box entity
    const boxId = findBoxAtPosition(ctx, newRow, newCol);
    if (boxId) {
      const boxPos = getPosition(boxNewRow, boxNewCol);
      ctx.setEntityPosition(boxId, { x: boxPos.x, y: boxPos.y });
    }
  }
  
  // Move player
  playerRow = newRow;
  playerCol = newCol;
  
  const playerPos = getPosition(playerRow, playerCol);
  const playerEntity = ctx.queryEntities({ tag: 'player' })[0];
  if (playerEntity) {
    ctx.setEntityPosition(playerEntity, { x: playerPos.x, y: playerPos.y });
  }
  
  // Increment moves
  const currentMoves = ctx.getVariable('moves') || 0;
  ctx.setVariable('moves', currentMoves + 1);
  
  // Check win condition
  checkWinCondition(ctx);
  
  return true;
}

function findBoxAtPosition(ctx, row, col) {
  const pos = getPosition(row, col);
  const boxes = ctx.queryEntities({ tag: 'box' });
  
  for (const box of boxes) {
    const boxPos = ctx.getEntityPosition(box);
    if (boxPos && Math.abs(boxPos.x - pos.x) < 0.1 && Math.abs(boxPos.y - pos.y) < 0.1) {
      return box;
    }
  }
  
  return null;
}

function checkWinCondition(ctx) {
  let allOnTargets = true;
  
  for (const target of targetPositions) {
    if (!isBox(target.row, target.col)) {
      allOnTargets = false;
      break;
    }
  }
  
  ctx.setVariable('allBoxesOnTargets', allOnTargets ? 1 : 0);
}

exports.onStart = function(ctx) {
  initGrid();
  ctx.setVariable('moves', 0);
  ctx.setVariable('allBoxesOnTargets', 0);
};

exports.onInput = function(ctx, event) {
  if (ctx.getVariable('allBoxesOnTargets') === 1) {
    return;
  }
  
  if (event.type !== 'swipe') return;
  
  if (event.direction === 'up') {
    movePlayer(ctx, -1, 0);
  } else if (event.direction === 'down') {
    movePlayer(ctx, 1, 0);
  } else if (event.direction === 'left') {
    movePlayer(ctx, 0, -1);
  } else if (event.direction === 'right') {
    movePlayer(ctx, 0, 1);
  }
};
`,
};

export default game;
