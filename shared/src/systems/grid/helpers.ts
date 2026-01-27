import type { Vec2 } from "../../types/common";

export interface GridConfig {
  rows: number;
  cols: number;
  cellWidth: number;
  cellHeight: number;
}

export function createGridConfig(
  rows: number,
  cols: number,
  cellSize: number | { width: number; height: number },
): GridConfig {
  const cellWidth = typeof cellSize === "number" ? cellSize : cellSize.width;
  const cellHeight = typeof cellSize === "number" ? cellSize : cellSize.height;

  return { rows, cols, cellWidth, cellHeight };
}

export function cellToWorld(grid: GridConfig, row: number, col: number): Vec2 {
  const gridWidth = grid.cols * grid.cellWidth;
  const gridHeight = grid.rows * grid.cellHeight;
  const originX = -gridWidth / 2;
  const originY = gridHeight / 2;

  return {
    x: originX + col * grid.cellWidth + grid.cellWidth / 2,
    y: originY - row * grid.cellHeight - grid.cellHeight / 2,
  };
}

export function worldToCell(
  grid: GridConfig,
  worldX: number,
  worldY: number,
): { row: number; col: number } | null {
  const gridWidth = grid.cols * grid.cellWidth;
  const gridHeight = grid.rows * grid.cellHeight;

  const leftEdge = -gridWidth / 2;
  const rightEdge = gridWidth / 2;
  const topEdge = gridHeight / 2;
  const bottomEdge = -gridHeight / 2;

  const col = Math.floor((worldX - leftEdge) / grid.cellWidth);
  const row = Math.floor((topEdge - worldY) / grid.cellHeight);

  return { row, col };
}

export function isValidCell(
  grid: GridConfig,
  row: number,
  col: number,
): boolean {
  return row >= 0 && row < grid.rows && col >= 0 && col < grid.cols;
}

export function isAdjacent(
  a: { row: number; col: number },
  b: { row: number; col: number },
): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

export function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function parseCellKey(key: string): { row: number; col: number } | null {
  const parts = key.split(",");
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
}): GridConfig {
  return {
    rows: config.rows,
    cols: config.cols,
    cellWidth: config.cellSize,
    cellHeight: config.cellSize,
  };
}
