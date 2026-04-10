export function createGridConfig(rows, cols, cellSize) {
    const cellWidth = typeof cellSize === "number" ? cellSize : cellSize.width;
    const cellHeight = typeof cellSize === "number" ? cellSize : cellSize.height;
    return { rows, cols, cellWidth, cellHeight };
}
export function cellToWorld(grid, row, col) {
    const gridWidth = grid.cols * grid.cellWidth;
    const gridHeight = grid.rows * grid.cellHeight;
    const originX = -gridWidth / 2;
    const originY = gridHeight / 2;
    return {
        x: originX + col * grid.cellWidth + grid.cellWidth / 2,
        y: originY - row * grid.cellHeight - grid.cellHeight / 2,
    };
}
export function worldToCell(grid, worldX, worldY) {
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
export function isValidCell(grid, row, col) {
    return row >= 0 && row < grid.rows && col >= 0 && col < grid.cols;
}
export function isAdjacent(a, b) {
    const dr = Math.abs(a.row - b.row);
    const dc = Math.abs(a.col - b.col);
    return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}
export function cellKey(row, col) {
    return `${row},${col}`;
}
export function parseCellKey(key) {
    const parts = key.split(",");
    if (parts.length !== 2)
        return null;
    const row = parseInt(parts[0], 10);
    const col = parseInt(parts[1], 10);
    if (isNaN(row) || isNaN(col))
        return null;
    return { row, col };
}
export function gridConfigFromMatch3(config) {
    return {
        rows: config.rows,
        cols: config.cols,
        cellWidth: config.cellSize,
        cellHeight: config.cellSize,
    };
}
//# sourceMappingURL=helpers.js.map