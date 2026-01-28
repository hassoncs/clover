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
export const SLOPEGGLE_CONSTANTS = {
  WORLD_WIDTH: 12,
  WORLD_HEIGHT: 16,
  PEG_RADIUS: 0.125,
  PEG_DIAMETER: 0.25,
  /** Launcher zone: top portion where ball spawns - y < 2.5 */
  LAUNCHER_ZONE_Y_MAX: 2.5,
  /** Bucket zone: bottom portion where free-ball bucket moves - y > 14 */
  BUCKET_ZONE_Y_MIN: 14,
  /** Minimum distance between peg centers (2 * radius + small buffer) */
  MIN_PEG_SPACING: 0.3,
  /** Corner regions where oranges should not be placed (x < 1.5 or x > 10.5) */
  CORNER_X_THRESHOLD: 1.5,
  /** Corner regions where oranges should not be placed (y < 4 or y > 13) */
  CORNER_Y_THRESHOLD: { min: 4, max: 13 },
} as const;

/**
 * Convert center-origin coordinates to top-left origin used by LevelGenerator
 * @param cx X in center-origin (0 = center of world)
 * @param cy Y in center-origin (0 = center of world)
 * @returns Position in top-left origin (0,0 = top-left)
 */
function fromCenterOrigin(cx: number, cy: number): { x: number; y: number } {
  const halfW = SLOPEGGLE_CONSTANTS.WORLD_WIDTH / 2;
  const halfH = SLOPEGGLE_CONSTANTS.WORLD_HEIGHT / 2;
  return {
    x: cx + halfW,
    y: halfH - cy,
  };
}

/**
 * Validate that all pegs are within world bounds.
 * Bounds are inclusive - pegs can touch the edges.
 */
export function validateBounds(pegs: PegPosition[]): SlopeggleValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const { WORLD_WIDTH, WORLD_HEIGHT, PEG_RADIUS } = SLOPEGGLE_CONSTANTS;

  for (const peg of pegs) {
    // Check left bound (with radius buffer to keep peg fully in bounds)
    if (peg.x - PEG_RADIUS < 0) {
      errors.push(
        `Peg "${peg.pegId}" at x=${peg.x.toFixed(3)} extends beyond left bound ` +
          `(x - radius = ${(peg.x - PEG_RADIUS).toFixed(3)} < 0)`
      );
    }

    // Check right bound
    if (peg.x + PEG_RADIUS > WORLD_WIDTH) {
      errors.push(
        `Peg "${peg.pegId}" at x=${peg.x.toFixed(3)} extends beyond right bound ` +
          `(x + radius = ${(peg.x + PEG_RADIUS).toFixed(3)} > ${WORLD_WIDTH})`
      );
    }

    // Check top bound
    if (peg.y - PEG_RADIUS < 0) {
      errors.push(
        `Peg "${peg.pegId}" at y=${peg.y.toFixed(3)} extends beyond top bound ` +
          `(y - radius = ${(peg.y - PEG_RADIUS).toFixed(3)} < 0)`
      );
    }

    // Check bottom bound
    if (peg.y + PEG_RADIUS > WORLD_HEIGHT) {
      errors.push(
        `Peg "${peg.pegId}" at y=${peg.y.toFixed(3)} extends beyond bottom bound ` +
          `(y + radius = ${(peg.y + PEG_RADIUS).toFixed(3)} > ${WORLD_HEIGHT})`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate that no pegs are in forbidden zones:
 * - Launcher zone: top ~2.5 units where ball spawns
 * - Bucket zone: bottom ~2 units where free-ball bucket moves
 */
export function validateForbiddenZones(pegs: PegPosition[]): SlopeggleValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const { LAUNCHER_ZONE_Y_MAX, BUCKET_ZONE_Y_MIN, PEG_RADIUS } = SLOPEGGLE_CONSTANTS;

  for (const peg of pegs) {
    // Check launcher zone (top of board)
    if (peg.y < LAUNCHER_ZONE_Y_MAX) {
      const distance = LAUNCHER_ZONE_Y_MAX - peg.y;
      errors.push(
        `Peg "${peg.pegId}" at y=${peg.y.toFixed(3)} is in launcher zone ` +
          `(${distance.toFixed(3)} units above safe area). ` +
          `Launcher zone: y < ${LAUNCHER_ZONE_Y_MAX}`
      );
    }

    // Check bucket zone (bottom of board)
    if (peg.y > BUCKET_ZONE_Y_MIN) {
      const distance = peg.y - BUCKET_ZONE_Y_MIN;
      errors.push(
        `Peg "${peg.pegId}" at y=${peg.y.toFixed(3)} is in bucket zone ` +
          `(${distance.toFixed(3)} units below safe area). ` +
          `Bucket zone: y > ${BUCKET_ZONE_Y_MIN}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate minimum spacing between all pegs.
 * Prevents overlapping pegs that would cause physics issues.
 */
export function validateSpacing(pegs: PegPosition[]): SlopeggleValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const { MIN_PEG_SPACING } = SLOPEGGLE_CONSTANTS;
  const minSpacingSq = MIN_PEG_SPACING * MIN_PEG_SPACING;

  for (let i = 0; i < pegs.length; i++) {
    for (let j = i + 1; j < pegs.length; j++) {
      const pegA = pegs[i];
      const pegB = pegs[j];

      const dx = pegA.x - pegB.x;
      const dy = pegA.y - pegB.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < minSpacingSq) {
        const dist = Math.sqrt(distSq);
        const overlap = MIN_PEG_SPACING - dist;
        errors.push(
          `Pegs "${pegA.pegId}" and "${pegB.pegId}" are too close: ` +
            `distance = ${dist.toFixed(3)}, minimum = ${MIN_PEG_SPACING.toFixed(3)} ` +
            `(overlap = ${overlap.toFixed(3)})`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate that orange peg count matches the requested amount.
 */
export function validateOrangeCount(
  pegs: PegPosition[],
  requestedCount: number | undefined
): SlopeggleValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const actualOrangeCount = pegs.filter((p) => p.isOrange).length;

  if (requestedCount !== undefined) {
    if (actualOrangeCount !== requestedCount) {
      errors.push(
        `Orange peg count mismatch: requested ${requestedCount}, found ${actualOrangeCount}`
      );
    }
  }

  if (actualOrangeCount === 0) {
    warnings.push('Level has no orange pegs - win condition cannot be met');
  }

  if (actualOrangeCount > 50) {
    warnings.push(
      `High orange peg count (${actualOrangeCount}) may make level too easy or chaotic`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

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
export function validateOrangeAccessibility(pegs: PegPosition[]): SlopeggleValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const { CORNER_X_THRESHOLD, CORNER_Y_THRESHOLD, WORLD_WIDTH } = SLOPEGGLE_CONSTANTS;

  const oranges = pegs.filter((p) => p.isOrange);

  if (oranges.length === 0) {
    return {
      valid: true,
      errors,
      warnings: ['No orange pegs to check accessibility'],
    };
  }

  // Count oranges in each corner region
  const corners = {
    topLeft: 0,
    topRight: 0,
    bottomLeft: 0,
    bottomRight: 0,
    total: 0,
  };

  for (const orange of oranges) {
    const inLeftCorner = orange.x < CORNER_X_THRESHOLD;
    const inRightCorner = orange.x > WORLD_WIDTH - CORNER_X_THRESHOLD;
    const inTopCorner = orange.y < CORNER_Y_THRESHOLD.min;
    const inBottomCorner = orange.y > CORNER_Y_THRESHOLD.max;

    if (inLeftCorner && inTopCorner) corners.topLeft++;
    if (inRightCorner && inTopCorner) corners.topRight++;
    if (inLeftCorner && inBottomCorner) corners.bottomLeft++;
    if (inRightCorner && inBottomCorner) corners.bottomRight++;
  }

  corners.total = corners.topLeft + corners.topRight + corners.bottomLeft + corners.bottomRight;

  // Warn if too many oranges are in corners
  const totalOranges = oranges.length;
  const cornerRatio = corners.total / totalOranges;

  if (cornerRatio > 0.5) {
    warnings.push(
      `${corners.total}/${totalOranges} orange pegs (${(cornerRatio * 100).toFixed(0)}%) ` +
        `are in corner regions and may be difficult to hit. ` +
        `Consider placing more oranges in the center play area.`
    );
  }

  // Specific corner warnings
  if (corners.topLeft > 0) {
    warnings.push(
      `${corners.topLeft} orange(s) in top-left corner - may be unreachable with some angles`
    );
  }
  if (corners.topRight > 0) {
    warnings.push(
      `${corners.topRight} orange(s) in top-right corner - may be unreachable with some angles`
    );
  }
  if (corners.bottomLeft > 0) {
    warnings.push(
      `${corners.bottomLeft} orange(s) in bottom-left corner - bucket zone proximity may reduce accessibility`
    );
  }
  if (corners.bottomRight > 0) {
    warnings.push(
      `${corners.bottomRight} orange(s) in bottom-right corner - bucket zone proximity may reduce accessibility`
    );
  }

  // If all oranges are in corners, that's a serious issue
  if (corners.total === totalOranges && totalOranges > 3) {
    errors.push(
      `All ${totalOranges} orange pegs are in corner regions - layout likely inaccessible. ` +
        `Move oranges to center play area (x: ${CORNER_X_THRESHOLD}-${WORLD_WIDTH - CORNER_X_THRESHOLD}, ` +
        `y: ${CORNER_Y_THRESHOLD.min}-${CORNER_Y_THRESHOLD.max})`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a complete Slopeggle level layout.
 * Runs all validators and returns combined results.
 */
export function validateSlopeggleLevel(
  pegs: PegPosition[],
  overrides?: SlopeggleLevelOverrides
): SlopeggleValidation {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  // Run all validators
  const boundsResult = validateBounds(pegs);
  const forbiddenResult = validateForbiddenZones(pegs);
  const spacingResult = validateSpacing(pegs);
  const orangeCountResult = validateOrangeCount(pegs, overrides?.orangePegCount);
  const accessibilityResult = validateOrangeAccessibility(pegs);

  // Combine results
  allErrors.push(
    ...boundsResult.errors,
    ...forbiddenResult.errors,
    ...spacingResult.errors,
    ...orangeCountResult.errors,
    ...accessibilityResult.errors
  );

  allWarnings.push(
    ...boundsResult.warnings,
    ...forbiddenResult.warnings,
    ...spacingResult.warnings,
    ...orangeCountResult.warnings,
    ...accessibilityResult.warnings
  );

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

/**
 * Create a PegPosition array from generator output format.
 * Handles both center-origin and top-left origin coordinates.
 */
export function createPegPositions(
  pegs: Array<{ x: number; y: number; isOrange: boolean; id?: string }>,
  useCenterOrigin: boolean = false
): PegPosition[] {
  return pegs.map((peg, index) => {
    let { x, y } = peg;

    // Convert from center-origin if needed
    if (useCenterOrigin) {
      const converted = fromCenterOrigin(x, y);
      x = converted.x;
      y = converted.y;
    }

    return {
      x,
      y,
      isOrange: peg.isOrange,
      pegId: peg.id ?? `peg-${index}`,
    };
  });
}
