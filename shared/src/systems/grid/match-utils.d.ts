export interface CellPosition {
    row: number;
    col: number;
}
export interface LineMatch {
    cells: CellPosition[];
    direction: {
        dRow: number;
        dCol: number;
    };
}
/**
 * Get 4-directional neighbors (up, down, left, right) for rectangular grids.
 * Returns neighbor positions without bounds checking.
 */
export declare function getNeighbors(row: number, col: number): CellPosition[];
/**
 * Get 6-directional hex neighbors using offset coordinates.
 * Odd rows are shifted right by half a cell width.
 *
 * @param row - The row index
 * @param col - The column index
 * @param isOddRow - Whether this row is odd (determines offset direction)
 * @returns Array of 6 neighbor positions
 */
export declare function getHexNeighbors(row: number, col: number, isOddRow: boolean): CellPosition[];
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
export declare function floodFill<T>(grid: T[][], startRow: number, startCol: number, matchFn: (cell: T, startCell: T) => boolean, getNeighborsFn?: (row: number, col: number) => CellPosition[]): CellPosition[];
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
export declare function findConnectedGroups<T>(grid: T[][], minSize: number, matchFn: (cellA: T, cellB: T) => boolean, getNeighborsFn?: (row: number, col: number) => CellPosition[]): CellPosition[][];
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
export declare function findLineMatches<T>(grid: T[][], minLength: number, matchFn: (cell: T) => boolean, directions?: Array<{
    dRow: number;
    dCol: number;
}>): LineMatch[];
//# sourceMappingURL=match-utils.d.ts.map