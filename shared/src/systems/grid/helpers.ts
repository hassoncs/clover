import type { Vec2 } from '../../types/common';

export interface GridConfig {
  rows: number;
  cols: number;
  cellWidth: number;
  cellHeight: number;
  originX: number;
  originY: number;
}

export function createGridConfig(
  rows: number,
  cols: number,
  cellSize: number | { width: number; height: number },
  origin: 'center' | { x: number; y: number } = 'center'
): GridConfig {
  const cellWidth = typeof cellSize === 'number' ? cellSize : cellSize.width;
  const cellHeight = typeof cellSize === 'number' ? cellSize : cellSize.height;
  const gridWidth = cols * cellWidth;
  const gridHeight = rows * cellHeight;
  
  let originX: number;
  let originY: number;
  
  if (origin === 'center') {
    originX = -gridWidth / 2;
    originY = gridHeight / 2;
  } else {
    originX = origin.x;
    originY = origin.y;
  }
  
  return { rows, cols, cellWidth, cellHeight, originX, originY };
}

export function cellToWorld(grid: GridConfig, row: number, col: number): Vec2 {
  return {
    x: grid.originX + col * grid.cellWidth + grid.cellWidth / 2,
    y: grid.originY - row * grid.cellHeight - grid.cellHeight / 2,
  };
}

export function worldToCell(grid: GridConfig, worldX: number, worldY: number): { row: number; col: number } | null {
  const col = Math.floor((worldX - grid.originX) / grid.cellWidth);
  const row = Math.floor((grid.originY - worldY) / grid.cellHeight);

  if (row < 0 || row >= grid.rows || col < 0 || col >= grid.cols) {
    return null;
  }

  return { row, col };
}

export function isValidCell(grid: GridConfig, row: number, col: number): boolean {
  return row >= 0 && row < grid.rows && col >= 0 && col < grid.cols;
}

export function isAdjacent(a: { row: number; col: number }, b: { row: number; col: number }): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

export function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function parseCellKey(key: string): { row: number; col: number } | null {
  const parts = key.split(',');
  if (parts.length !== 2) return null;
  const row = parseInt(parts[0], 10);
  const col = parseInt(parts[1], 10);
  if (isNaN(row) || isNaN(col)) return null;
  return { row, col };
}

export function gridConfigFromMatch3(config: {
  rows: number;
  cols: number;
  cellSize: number;
  originX: number;
  originY: number;
}): GridConfig {
  return {
    rows: config.rows,
    cols: config.cols,
    cellWidth: config.cellSize,
    cellHeight: config.cellSize,
    originX: config.originX,
    originY: config.originY,
  };
}
