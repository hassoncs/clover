
const GRID_SIZE = 8;
const CELL_SIZE = 1.3;
const MINE_COUNT = 10;
const GRID_OFFSET_X = 0.65;
const GRID_OFFSET_Y = 0.65;
const WORLD_WIDTH = 12;
const WORLD_HEIGHT = 12;
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;
const cx = (x) => x - HALF_W;
const cy = (y) => HALF_H - y;

let grid = [];
let tapStartTime = 0;
let tapStartPos = null;
const LONG_PRESS_DURATION = 500;

function createGrid() {
  grid = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    grid[row] = [];
    for (let col = 0; col < GRID_SIZE; col++) {
      grid[row][col] = {
        isMine: false,
        isRevealed: false,
        isFlagged: false,
        adjacentMines: 0,
      };
    }
  }
}

function placeMines(ctx, excludeRow, excludeCol) {
  const positions = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (row !== excludeRow || col !== excludeCol) {
        positions.push({ row, col });
      }
    }
  }

  for (let i = 0; i < MINE_COUNT; i++) {
    const idx = Math.floor(Math.random() * positions.length);
    const pos = positions[idx];
    grid[pos.row][pos.col].isMine = true;
    positions.splice(idx, 1);
  }

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (!grid[row][col].isMine) {
        grid[row][col].adjacentMines = countAdjacentMines(row, col);
      }
    }
  }
}

function countAdjacentMines(row, col) {
  let count = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
        if (grid[r][c].isMine) count++;
      }
    }
  }
  return count;
}

function getPosition(row, col) {
  return {
    x: cx(col * CELL_SIZE + GRID_OFFSET_X),
    y: cy(row * CELL_SIZE + GRID_OFFSET_Y),
  };
}

function worldToGrid(worldX, worldY) {
  const localX = worldX + HALF_W - GRID_OFFSET_X;
  const localY = HALF_H - worldY - GRID_OFFSET_Y;
  
  const col = Math.floor(localX / CELL_SIZE);
  const row = Math.floor(localY / CELL_SIZE);
  
  if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
    return { row, col };
  }
  return null;
}

function revealCell(ctx, row, col) {
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return;
  if (grid[row][col].isRevealed || grid[row][col].isFlagged) return;

  const cell = grid[row][col];
  cell.isRevealed = true;

  const cellId = 'cell-' + row + '-' + col;
  ctx.destroyEntity(cellId);

  const pos = getPosition(row, col);

  if (cell.isMine) {
    ctx.spawnEntity('mine', { x: pos.x, y: pos.y }, {
      id: cellId,
    });
    ctx.setVariable('hasLost', 1);
    revealAllMines(ctx);
  } else {
    ctx.spawnEntity('revealedCell', { x: pos.x, y: pos.y }, {
      id: cellId,
    });

    const remaining = ctx.getVariable('cellsRemaining') || 0;
    ctx.setVariable('cellsRemaining', remaining - 1);

    if (remaining - 1 === 0) {
      ctx.setVariable('hasWon', 1);
    }

    if (cell.adjacentMines === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          revealCell(ctx, row + dr, col + dc);
        }
      }
    }
  }
}

function toggleFlag(ctx, row, col) {
  if (grid[row][col].isRevealed) return;

  const cell = grid[row][col];
  const flagId = 'flag-' + row + '-' + col;
  const pos = getPosition(row, col);

  if (cell.isFlagged) {
    ctx.destroyEntity(flagId);
    cell.isFlagged = false;
    const flags = ctx.getVariable('flagsRemaining') || 0;
    ctx.setVariable('flagsRemaining', flags + 1);
  } else {
    const flags = ctx.getVariable('flagsRemaining') || 0;
    if (flags > 0) {
      ctx.spawnEntity('flag', { x: pos.x, y: pos.y }, {
        id: flagId,
      });
      cell.isFlagged = true;
      ctx.setVariable('flagsRemaining', flags - 1);
    }
  }
}

function revealAllMines(ctx) {
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (grid[row][col].isMine && !grid[row][col].isRevealed) {
        grid[row][col].isRevealed = true;
        const cellId = 'cell-' + row + '-' + col;
        ctx.destroyEntity(cellId);
        const pos = getPosition(row, col);
        ctx.spawnEntity('mine', { x: pos.x, y: pos.y }, {
          id: cellId,
        });
      }
    }
  }
}

exports.onStart = function(ctx) {
  createGrid();
  ctx.setVariable('hasWon', 0);
  ctx.setVariable('hasLost', 0);
  ctx.setVariable('flagsRemaining', MINE_COUNT);
  ctx.setVariable('cellsRemaining', GRID_SIZE * GRID_SIZE - MINE_COUNT);
  ctx.setVariable('firstTap', 1);
};

exports.onInput = function(ctx, event) {
  if (ctx.getVariable('hasWon') === 1 || ctx.getVariable('hasLost') === 1) {
    return;
  }

  if (event.type === 'tap') {
    const gridPos = worldToGrid(event.worldX, event.worldY);
    if (!gridPos) return;

    const { row, col } = gridPos;

    if (ctx.getVariable('firstTap') === 1) {
      placeMines(ctx, row, col);
      ctx.setVariable('firstTap', 0);
    }

    tapStartTime = Date.now();
    tapStartPos = { row, col };
  } else if (event.type === 'tap_release') {
    if (!tapStartPos) return;

    const duration = Date.now() - tapStartTime;
    const { row, col } = tapStartPos;

    if (duration >= LONG_PRESS_DURATION) {
      toggleFlag(ctx, row, col);
    } else {
      revealCell(ctx, row, col);
    }

    tapStartPos = null;
  }
};
