import type { GameSystemDefinition } from '../types';
import type { GridDefinition, GridState } from './types';
export declare const GRID_SYSTEM_ID = "grid";
export declare const GRID_VERSION: {
    major: number;
    minor: number;
    patch: number;
};
export declare const gridSystem: GameSystemDefinition<Record<string, GridDefinition>, Record<string, GridState>>;
export * from './types';
export * from './helpers';
export * from './match-utils';
//# sourceMappingURL=index.d.ts.map