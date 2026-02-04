import type { GameDefinition } from "@slopcade/shared";

export const metadata = {
  title: "2048",
  description: "Merge tiles to reach 2048",
};

const WORLD_WIDTH = 12;
const WORLD_HEIGHT = 16;
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;
const cx = (x: number) => x - HALF_W;
const cy = (y: number) => HALF_H - y;

const TILE_SIZE = 2.4;
const GRID_SIZE = 4;
const GRID_OFFSET_X = 0.6;
const GRID_OFFSET_Y = 4;

const game: GameDefinition = {
  metadata: {
    id: "game-2048",
    title: "2048",
    description: "Merge tiles to reach 2048",
    instructions: "Swipe up/down/left/right to slide tiles. Merge matching numbers to reach 2048!",
    version: "1.0.0",
  },
  assetSystem: { activePackId: "2048-default" },
  background: {
    type: "static",
    color: "#faf8ef",
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: 40,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  camera: { type: "fixed", zoom: 1 },
  ui: {
    showTimer: false,
    backgroundColor: "#faf8ef",
    variableDisplays: [
      { name: 'score', label: 'Score', position: 'top-center' },
    ],
  },
  winCondition: {
    expr: "hasWon == 1",
  },
  loseCondition: {
    type: "custom",
    expr: "hasLost == 1",
  },
  variables: {
    score: 0,
    hasWon: 0,
    hasLost: 0,
  },
  templates: {
    gridCell: {
      id: "gridCell",
      tags: ["gridCell"],
      visual: {
        type: "rect",
        width: TILE_SIZE,
        height: TILE_SIZE,
        color: "#cdc1b4",
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
    },
    tile: {
      id: "tile",
      tags: ["tile"],
      visual: {
        type: "rect",
        width: TILE_SIZE,
        height: TILE_SIZE,
        color: "#eee4da",
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
    },
  },
  entities: [
    ...Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => {
      const row = Math.floor(i / GRID_SIZE);
      const col = i % GRID_SIZE;
      return {
        id: `cell-${row}-${col}`,
        name: `Cell ${row},${col}`,
        template: "gridCell",
        transform: {
          x: cx(col * TILE_SIZE + GRID_OFFSET_X),
          y: cy(row * TILE_SIZE + GRID_OFFSET_Y),
          angle: 0,
          scaleX: 1,
          scaleY: 1,
        },
      };
    }),
  ],
  rules: [
    {
      id: "swipe_up",
      name: "Swipe up",
      trigger: { type: "swipe", direction: "up" },
      conditions: [
        { type: "expression", expr: "hasWon == 0 && hasLost == 0" }
      ],
      actions: [
        { type: "event", eventName: "move_up" },
      ],
    },
    {
      id: "swipe_down",
      name: "Swipe down",
      trigger: { type: "swipe", direction: "down" },
      conditions: [
        { type: "expression", expr: "hasWon == 0 && hasLost == 0" }
      ],
      actions: [
        { type: "event", eventName: "move_down" },
      ],
    },
    {
      id: "swipe_left",
      name: "Swipe left",
      trigger: { type: "swipe", direction: "left" },
      conditions: [
        { type: "expression", expr: "hasWon == 0 && hasLost == 0" }
      ],
      actions: [
        { type: "event", eventName: "move_left" },
      ],
    },
    {
      id: "swipe_right",
      name: "Swipe right",
      trigger: { type: "swipe", direction: "right" },
      conditions: [
        { type: "expression", expr: "hasWon == 0 && hasLost == 0" }
      ],
      actions: [
        { type: "event", eventName: "move_right" },
      ],
    },
  ],
  script: `
const GRID_SIZE = 4;
const TILE_SIZE = 2.4;
const GRID_OFFSET_X = 0.6;
const GRID_OFFSET_Y = 4;
const WORLD_WIDTH = 12;
const WORLD_HEIGHT = 16;
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;
const cx = (x) => x - HALF_W;
const cy = (y) => HALF_H - y;

const TILE_COLORS = {
  2: '#eee4da',
  4: '#ede0c8',
  8: '#f2b179',
  16: '#f59563',
  32: '#f67c5f',
  64: '#f65e3b',
  128: '#edcf72',
  256: '#edcc61',
  512: '#edc850',
  1024: '#edc53f',
  2048: '#edc22e',
};

let grid = [];

function createGrid() {
  grid = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    grid[row] = [];
    for (let col = 0; col < GRID_SIZE; col++) {
      grid[row][col] = 0;
    }
  }
}

function getPosition(row, col) {
  return {
    x: cx(col * TILE_SIZE + GRID_OFFSET_X),
    y: cy(row * TILE_SIZE + GRID_OFFSET_Y),
  };
}

function spawnRandomTile(ctx) {
  const emptyCells = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (grid[row][col] === 0) {
        emptyCells.push({ row, col });
      }
    }
  }

  if (emptyCells.length === 0) return false;

  const cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  const value = Math.random() < 0.9 ? 2 : 4;
  grid[cell.row][cell.col] = value;

  const pos = getPosition(cell.row, cell.col);
  const tileId = 'tile-' + cell.row + '-' + cell.col;
  
  ctx.spawnEntity('tile', { x: pos.x, y: pos.y }, {
    id: tileId,
    visual: { color: TILE_COLORS[value] || '#3c3a32' },
  });

  return true;
}

function updateTileVisual(ctx, row, col, value) {
  const tileId = 'tile-' + row + '-' + col;
  const color = TILE_COLORS[value] || '#3c3a32';
  
  ctx.destroyEntity(tileId);
  
  const pos = getPosition(row, col);
  ctx.spawnEntity('tile', { x: pos.x, y: pos.y }, {
    id: tileId,
    visual: { color: color },
  });
}

function clearTile(ctx, row, col) {
  const tileId = 'tile-' + row + '-' + col;
  ctx.destroyEntity(tileId);
}

function moveLeft(ctx) {
  let moved = false;
  let scoreGain = 0;

  for (let row = 0; row < GRID_SIZE; row++) {
    const line = [];
    const merged = [];
    
    // Collect non-zero values
    for (let col = 0; col < GRID_SIZE; col++) {
      if (grid[row][col] !== 0) {
        line.push(grid[row][col]);
        merged.push(false);
      }
    }

    // Merge adjacent equal values
    for (let i = 0; i < line.length - 1; i++) {
      if (line[i] === line[i + 1] && !merged[i] && !merged[i + 1]) {
        line[i] *= 2;
        scoreGain += line[i];
        line.splice(i + 1, 1);
        merged[i] = true;
        merged.splice(i + 1, 1);
        
        if (line[i] === 2048) {
          ctx.setVariable('hasWon', 1);
        }
      }
    }

    // Update grid and check for changes
    for (let col = 0; col < GRID_SIZE; col++) {
      const newValue = col < line.length ? line[col] : 0;
      if (grid[row][col] !== newValue) {
        moved = true;
      }
      
      clearTile(ctx, row, col);
      grid[row][col] = newValue;
      
      if (newValue !== 0) {
        updateTileVisual(ctx, row, col, newValue);
      }
    }
  }

  if (scoreGain > 0) {
    const currentScore = ctx.getVariable('score') || 0;
    ctx.setVariable('score', currentScore + scoreGain);
  }

  return moved;
}

function moveRight(ctx) {
  let moved = false;
  let scoreGain = 0;

  for (let row = 0; row < GRID_SIZE; row++) {
    const line = [];
    const merged = [];
    
    for (let col = GRID_SIZE - 1; col >= 0; col--) {
      if (grid[row][col] !== 0) {
        line.push(grid[row][col]);
        merged.push(false);
      }
    }

    for (let i = 0; i < line.length - 1; i++) {
      if (line[i] === line[i + 1] && !merged[i] && !merged[i + 1]) {
        line[i] *= 2;
        scoreGain += line[i];
        line.splice(i + 1, 1);
        merged[i] = true;
        merged.splice(i + 1, 1);
        
        if (line[i] === 2048) {
          ctx.setVariable('hasWon', 1);
        }
      }
    }

    for (let col = GRID_SIZE - 1; col >= 0; col--) {
      const index = GRID_SIZE - 1 - col;
      const newValue = index < line.length ? line[index] : 0;
      if (grid[row][col] !== newValue) {
        moved = true;
      }
      
      clearTile(ctx, row, col);
      grid[row][col] = newValue;
      
      if (newValue !== 0) {
        updateTileVisual(ctx, row, col, newValue);
      }
    }
  }

  if (scoreGain > 0) {
    const currentScore = ctx.getVariable('score') || 0;
    ctx.setVariable('score', currentScore + scoreGain);
  }

  return moved;
}

function moveUp(ctx) {
  let moved = false;
  let scoreGain = 0;

  for (let col = 0; col < GRID_SIZE; col++) {
    const line = [];
    const merged = [];
    
    for (let row = 0; row < GRID_SIZE; row++) {
      if (grid[row][col] !== 0) {
        line.push(grid[row][col]);
        merged.push(false);
      }
    }

    for (let i = 0; i < line.length - 1; i++) {
      if (line[i] === line[i + 1] && !merged[i] && !merged[i + 1]) {
        line[i] *= 2;
        scoreGain += line[i];
        line.splice(i + 1, 1);
        merged[i] = true;
        merged.splice(i + 1, 1);
        
        if (line[i] === 2048) {
          ctx.setVariable('hasWon', 1);
        }
      }
    }

    for (let row = 0; row < GRID_SIZE; row++) {
      const newValue = row < line.length ? line[row] : 0;
      if (grid[row][col] !== newValue) {
        moved = true;
      }
      
      clearTile(ctx, row, col);
      grid[row][col] = newValue;
      
      if (newValue !== 0) {
        updateTileVisual(ctx, row, col, newValue);
      }
    }
  }

  if (scoreGain > 0) {
    const currentScore = ctx.getVariable('score') || 0;
    ctx.setVariable('score', currentScore + scoreGain);
  }

  return moved;
}

function moveDown(ctx) {
  let moved = false;
  let scoreGain = 0;

  for (let col = 0; col < GRID_SIZE; col++) {
    const line = [];
    const merged = [];
    
    for (let row = GRID_SIZE - 1; row >= 0; row--) {
      if (grid[row][col] !== 0) {
        line.push(grid[row][col]);
        merged.push(false);
      }
    }

    for (let i = 0; i < line.length - 1; i++) {
      if (line[i] === line[i + 1] && !merged[i] && !merged[i + 1]) {
        line[i] *= 2;
        scoreGain += line[i];
        line.splice(i + 1, 1);
        merged[i] = true;
        merged.splice(i + 1, 1);
        
        if (line[i] === 2048) {
          ctx.setVariable('hasWon', 1);
        }
      }
    }

    for (let row = GRID_SIZE - 1; row >= 0; row--) {
      const index = GRID_SIZE - 1 - row;
      const newValue = index < line.length ? line[index] : 0;
      if (grid[row][col] !== newValue) {
        moved = true;
      }
      
      clearTile(ctx, row, col);
      grid[row][col] = newValue;
      
      if (newValue !== 0) {
        updateTileVisual(ctx, row, col, newValue);
      }
    }
  }

  if (scoreGain > 0) {
    const currentScore = ctx.getVariable('score') || 0;
    ctx.setVariable('score', currentScore + scoreGain);
  }

  return moved;
}

function canMove() {
  // Check for empty cells
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (grid[row][col] === 0) return true;
    }
  }

  // Check for possible merges
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const current = grid[row][col];
      
      if (col < GRID_SIZE - 1 && grid[row][col + 1] === current) return true;
      if (row < GRID_SIZE - 1 && grid[row + 1][col] === current) return true;
    }
  }

  return false;
}

exports.onStart = function(ctx) {
  createGrid();
  ctx.setVariable('score', 0);
  ctx.setVariable('hasWon', 0);
  ctx.setVariable('hasLost', 0);
  
  spawnRandomTile(ctx);
  spawnRandomTile(ctx);
};

exports.onInput = function(ctx, event) {
  if (ctx.getVariable('hasWon') === 1 || ctx.getVariable('hasLost') === 1) {
    return;
  }

  if (event.type !== 'swipe') return;

  let moved = false;

  if (event.direction === 'left') {
    moved = moveLeft(ctx);
  } else if (event.direction === 'right') {
    moved = moveRight(ctx);
  } else if (event.direction === 'up') {
    moved = moveUp(ctx);
  } else if (event.direction === 'down') {
    moved = moveDown(ctx);
  }

  if (moved) {
    spawnRandomTile(ctx);
    
    if (!canMove()) {
      ctx.setVariable('hasLost', 1);
    }
  }
};
`,
};

export default game;
