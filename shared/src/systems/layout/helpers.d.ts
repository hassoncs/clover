import type { RowLayoutConfig, ColumnLayoutConfig, GridLayoutConfig, CircularLayoutConfig, LayoutPosition, GridPosition } from "./types";
export declare function distributeRow(config: RowLayoutConfig): LayoutPosition[];
export declare function distributeColumn(config: ColumnLayoutConfig): LayoutPosition[];
export declare function distributeGrid(config: GridLayoutConfig): GridPosition[];
export declare function distributeCircular(config: CircularLayoutConfig): LayoutPosition[];
export declare function getRowX(config: RowLayoutConfig, index: number): number;
export declare function getColumnY(config: ColumnLayoutConfig, index: number): number;
export declare function getGridPosition(config: GridLayoutConfig, row: number, col: number): {
    x: number;
    y: number;
} | null;
//# sourceMappingURL=helpers.d.ts.map