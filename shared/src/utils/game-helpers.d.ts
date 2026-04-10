import type { GameEntity } from '../types/entity';
export interface CoordinateHelpers {
    cx: (x: number) => number;
    cy: (y: number) => number;
}
export declare function createCoordinateHelpers(worldWidth: number, worldHeight: number): CoordinateHelpers;
export interface GridGeneratorOptions {
    rows: number;
    cols: number;
    startX: number;
    startY: number;
    cellSize: number;
    gap?: number;
    prefab: string;
    tags?: string[];
    idPrefix?: string;
    namePrefix?: string;
    coordinateHelpers: CoordinateHelpers;
}
export declare function generateGridEntities(options: GridGeneratorOptions): GameEntity[];
//# sourceMappingURL=game-helpers.d.ts.map