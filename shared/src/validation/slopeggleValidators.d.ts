/**
 * @file slopeggleValidators.ts
 * @description Heuristic validators for Peggle-style boards.
 *
 * These validators perform fast, non-physics-based checks to ensure
 * generated levels are structurally sound and playable.
 *
 * ## Validator Design Principles
 *
 * 1. **Fast & Deterministic**: No physics simulation or iteration limits
 * 2. **Actionable Errors**: Each error message should guide generator fixes
 * 3. **Heuristic Nature**: Accessibility checks are approximations, not guarantees
 * 4. **Composable**: Individual validators can be used independently
 */
import type { SlopeggleLevelOverrides } from '../types/LevelDefinition';
/**
 * Validation result structure matching existing patterns in playable.ts
 */
export interface SlopeggleValidation {
    valid: boolean;
    errors: string[];
    warnings: string[];
}
/**
 * Peg position with metadata for validation
 */
export interface PegPosition {
    x: number;
    y: number;
    isOrange: boolean;
    pegId: string;
}
/**
 * Slopeggle world constants derived from game.ts
 */
export declare const SLOPEGGLE_CONSTANTS: {
    readonly WORLD_WIDTH: 12;
    readonly WORLD_HEIGHT: 16;
    readonly PEG_RADIUS: 0.125;
    readonly PEG_DIAMETER: 0.25;
    /** Launcher zone: top portion where ball spawns - y < 2.5 */
    readonly LAUNCHER_ZONE_Y_MAX: 2.5;
    /** Bucket zone: bottom portion where free-ball bucket moves - y > 14 */
    readonly BUCKET_ZONE_Y_MIN: 14;
    /** Minimum distance between peg centers (2 * radius + small buffer) */
    readonly MIN_PEG_SPACING: 0.3;
    /** Corner regions where oranges should not be placed (x < 1.5 or x > 10.5) */
    readonly CORNER_X_THRESHOLD: 1.5;
    /** Corner regions where oranges should not be placed (y < 4 or y > 13) */
    readonly CORNER_Y_THRESHOLD: {
        readonly min: 4;
        readonly max: 13;
    };
};
/**
 * Validate that all pegs are within world bounds.
 * Bounds are inclusive - pegs can touch the edges.
 */
export declare function validateBounds(pegs: PegPosition[]): SlopeggleValidation;
/**
 * Validate that no pegs are in forbidden zones:
 * - Launcher zone: top ~2.5 units where ball spawns
 * - Bucket zone: bottom ~2 units where free-ball bucket moves
 */
export declare function validateForbiddenZones(pegs: PegPosition[]): SlopeggleValidation;
/**
 * Validate minimum spacing between all pegs.
 * Prevents overlapping pegs that would cause physics issues.
 */
export declare function validateSpacing(pegs: PegPosition[]): SlopeggleValidation;
/**
 * Validate that orange peg count matches the requested amount.
 */
export declare function validateOrangeCount(pegs: PegPosition[], requestedCount: number | undefined): SlopeggleValidation;
/**
 * Validate orange peg accessibility using corner heuristic.
 *
 * This heuristic flags orange pegs that are likely hard to hit:
 * - Corners (x near edges, y near top or bottom)
 * - Very shallow angles that barely change trajectory
 *
 * This is a rough approximation - actual accessibility depends on
 * ball physics and trajectory, but catching corner oranges helps
 * prevent obviously problematic layouts.
 */
export declare function validateOrangeAccessibility(pegs: PegPosition[]): SlopeggleValidation;
/**
 * Validate a complete Slopeggle level layout.
 * Runs all validators and returns combined results.
 */
export declare function validateSlopeggleLevel(pegs: PegPosition[], overrides?: SlopeggleLevelOverrides): SlopeggleValidation;
/**
 * Create a PegPosition array from generator output format.
 * Handles both center-origin and top-left origin coordinates.
 */
export declare function createPegPositions(pegs: Array<{
    x: number;
    y: number;
    isOrange: boolean;
    id?: string;
}>, useCenterOrigin?: boolean): PegPosition[];
//# sourceMappingURL=slopeggleValidators.d.ts.map