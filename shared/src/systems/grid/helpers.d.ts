import type { Vec2 } from "../../types/common";
export interface GridConfig {
    rows: number;
    cols: number;
    cellWidth: number;
    cellHeight: number;
}
export declare function createGridConfig(rows: number, cols: number, cellSize: number | {
    width: number;
    height: number;
}): GridConfig;
export declare function cellToWorld(grid: GridConfig, row: number, col: number): Vec2;
export declare function worldToCell(grid: GridConfig, worldX: number, worldY: number): {
    row: number;
    col: number;
} | null;
export declare function isValidCell(grid: GridConfig, row: number, col: number): boolean;
export declare function isAdjacent(a: {
    row: number;
    col: number;
}, b: {
    row: number;
    col: number;
}): boolean;
export declare function cellKey(row: number, col: number): string;
export declare function parseCellKey(key: string): {
    row: number;
    col: number;
} | null;
export declare function gridConfigFromMatch3(config: {
    rows: number;
    cols: number;
    cellSize: number;
}): GridConfig;
//# sourceMappingURL=helpers.d.ts.map