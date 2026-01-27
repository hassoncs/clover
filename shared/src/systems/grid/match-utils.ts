import { cellKey } from "./helpers";

export interface CellPosition {
  row: number;
  col: number;
}

export interface LineMatch {
  cells: CellPosition[];
  direction: { dRow: number; dCol: number };
}

/**
 * Get 4-directional neighbors (up, down, left, right) for rectangular grids.
 * Returns neighbor positions without bounds checking.
 */
export function getNeighbors(row: number, col: number): CellPosition[] {
  return [
    { row: row - 1, col },
    { row: row + 1, col },
    { row, col: col - 1 },
    { row, col: col + 1 },
  ];
}

/**
 * Get 6-directional hex neighbors using offset coordinates.
 * Odd rows are shifted right by half a cell width.
 *
 * @param row - The row index
 * @param col - The column index
 * @param isOddRow - Whether this row is odd (determines offset direction)
 * @returns Array of 6 neighbor positions
 */
export function getHexNeighbors(
  row: number,
  col: number,
  isOddRow: boolean
): CellPosition[] {
  if (isOddRow) {
    return [
      { row: row - 1, col },
      { row: row - 1, col: col + 1 },
      { row, col: col - 1 },
      { row, col: col + 1 },
      { row: row + 1, col },
      { row: row + 1, col: col + 1 },
    ];
  }
  return [
    { row: row - 1, col: col - 1 },
    { row: row - 1, col },
    { row, col: col - 1 },
    { row, col: col + 1 },
    { row: row + 1, col: col - 1 },
    { row: row + 1, col },
  ];
}

/**
 * Generic flood-fill that finds all connected cells matching a predicate.
 * Uses BFS to explore connected cells starting from a given position.
 *
 * @param grid - 2D array of cells
 * @param startRow - Starting row index
 * @param startCol - Starting column index
 * @param matchFn - Predicate that returns true if a cell matches the start cell
 * @param getNeighborsFn - Optional function to get neighbors (defaults to 4-directional)
 * @returns Array of matching cell positions
 *
 * @example
 * // Find all connected cells of the same color
 * const matches = floodFill(grid, 0, 0, (cell, start) => cell.color === start.color);
 *
 * @example
 * // Find connected cells in a hex grid
 * const matches = floodFill(grid, 0, 0, matchFn, (r, c) => getHexNeighbors(r, c, r % 2 === 1));
 */
export function floodFill<T>(
  grid: T[][],
  startRow: number,
  startCol: number,
  matchFn: (cell: T, startCell: T) => boolean,
  getNeighborsFn: (row: number, col: number) => CellPosition[] = getNeighbors
): CellPosition[] {
  const rows = grid.length;
  if (rows === 0) return [];

  const startCell = grid[startRow]?.[startCol];
  if (startCell === undefined) return [];

  const matched: CellPosition[] = [];
  const visited = new Set<string>();
  const queue: CellPosition[] = [{ row: startRow, col: startCol }];

  while (queue.length > 0) {
    const { row, col } = queue.shift()!;
    const key = cellKey(row, col);

    if (visited.has(key)) continue;
    visited.add(key);

    if (row < 0 || row >= rows) continue;
    const rowCells = grid[row];
    if (!rowCells || col < 0 || col >= rowCells.length) continue;

    const cell = rowCells[col];
    if (cell === undefined || !matchFn(cell, startCell)) continue;

    matched.push({ row, col });

    const neighbors = getNeighborsFn(row, col);
    for (const neighbor of neighbors) {
      const neighborKey = cellKey(neighbor.row, neighbor.col);
      if (!visited.has(neighborKey)) {
        queue.push(neighbor);
      }
    }
  }

  return matched;
}

/**
 * Find all groups of connected cells meeting a minimum size requirement.
 * Scans the entire grid and returns groups of connected matching cells.
 *
 * @param grid - 2D array of cells
 * @param minSize - Minimum group size to include in results
 * @param matchFn - Predicate that returns true if two cells should be grouped together
 * @param getNeighborsFn - Optional function to get neighbors (defaults to 4-directional)
 * @returns Array of cell position arrays, each representing a connected group
 *
 * @example
 * // Find all groups of 3+ connected same-color cells
 * const groups = findConnectedGroups(grid, 3, (a, b) => a.color === b.color);
 */
export function findConnectedGroups<T>(
  grid: T[][],
  minSize: number,
  matchFn: (cellA: T, cellB: T) => boolean,
  getNeighborsFn: (row: number, col: number) => CellPosition[] = getNeighbors
): CellPosition[][] {
  const rows = grid.length;
  if (rows === 0) return [];

  const visited = new Set<string>();
  const groups: CellPosition[][] = [];

  for (let row = 0; row < rows; row++) {
    const rowCells = grid[row];
    if (!rowCells) continue;

    for (let col = 0; col < rowCells.length; col++) {
      const key = cellKey(row, col);
      if (visited.has(key)) continue;

      const cell = rowCells[col];
      if (cell === undefined) continue;

      const group = floodFill(
        grid,
        row,
        col,
        (c, start) => matchFn(c, start),
        getNeighborsFn
      );

      for (const pos of group) {
        visited.add(cellKey(pos.row, pos.col));
      }

      if (group.length >= minSize) {
        groups.push(group);
      }
    }
  }

  return groups;
}

const DEFAULT_LINE_DIRECTIONS: Array<{ dRow: number; dCol: number }> = [
  { dRow: 0, dCol: 1 },
  { dRow: 1, dCol: 0 },
  { dRow: 1, dCol: 1 },
  { dRow: 1, dCol: -1 },
];

/**
 * Find line matches in a grid (for Connect4-style games).
 * Searches for consecutive cells in specified directions that match a predicate.
 *
 * @param grid - 2D array of cells
 * @param minLength - Minimum line length to match
 * @param matchFn - Predicate that returns true if a cell should be included in a line
 * @param directions - Optional array of direction vectors (defaults to horizontal, vertical, and both diagonals)
 * @returns Array of line matches with cells and direction
 *
 * @example
 * // Find all lines of 4+ player pieces
 * const lines = findLineMatches(grid, 4, (cell) => cell === 1);
 *
 * @example
 * // Find only horizontal lines
 * const lines = findLineMatches(grid, 4, matchFn, [{ dRow: 0, dCol: 1 }]);
 */
export function findLineMatches<T>(
  grid: T[][],
  minLength: number,
  matchFn: (cell: T) => boolean,
  directions: Array<{ dRow: number; dCol: number }> = DEFAULT_LINE_DIRECTIONS
): LineMatch[] {
  const rows = grid.length;
  if (rows === 0) return [];

  const matches: LineMatch[] = [];
  const foundLines = new Set<string>();

  for (let row = 0; row < rows; row++) {
    const rowCells = grid[row];
    if (!rowCells) continue;

    for (let col = 0; col < rowCells.length; col++) {
      const cell = rowCells[col];
      if (cell === undefined || !matchFn(cell)) continue;

      for (const dir of directions) {
        const line = checkLineFromPosition(
          grid,
          row,
          col,
          dir.dRow,
          dir.dCol,
          minLength,
          matchFn
        );

        if (line) {
          const lineKey = line.cells
            .map((c) => cellKey(c.row, c.col))
            .sort()
            .join("|");

          if (!foundLines.has(lineKey)) {
            foundLines.add(lineKey);
            matches.push({ cells: line.cells, direction: dir });
          }
        }
      }
    }
  }

  return matches;
}

function checkLineFromPosition<T>(
  grid: T[][],
  startRow: number,
  startCol: number,
  dRow: number,
  dCol: number,
  minLength: number,
  matchFn: (cell: T) => boolean
): { cells: CellPosition[] } | null {
  const rows = grid.length;
  const cells: CellPosition[] = [{ row: startRow, col: startCol }];

  for (let i = 1; i < minLength; i++) {
    const row = startRow + dRow * i;
    const col = startCol + dCol * i;

    if (row < 0 || row >= rows) return null;
    const rowCells = grid[row];
    if (!rowCells || col < 0 || col >= rowCells.length) return null;

    const cell = rowCells[col];
    if (cell === undefined || !matchFn(cell)) return null;

    cells.push({ row, col });
  }

  let extendRow = startRow + dRow * minLength;
  let extendCol = startCol + dCol * minLength;

  while (
    extendRow >= 0 &&
    extendRow < rows &&
    grid[extendRow] &&
    extendCol >= 0 &&
    extendCol < grid[extendRow]!.length
  ) {
    const cell = grid[extendRow]![extendCol];
    if (cell === undefined || !matchFn(cell)) break;

    cells.push({ row: extendRow, col: extendCol });
    extendRow += dRow;
    extendCol += dCol;
  }

  return { cells };
}
