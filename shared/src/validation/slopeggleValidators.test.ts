/**
 * @file slopeggleValidators.test.ts
 * @description Test validators with intentionally bad levels to verify error detection.
 */

import {
  validateBounds,
  validateForbiddenZones,
  validateSpacing,
  validateOrangeCount,
  validateOrangeAccessibility,
  validateSlopeggleLevel,
  createPegPositions,
  type PegPosition,
} from './slopeggleValidators';

/**
 * Generate a valid test level that should pass all validators
 */
function createValidLevel(): PegPosition[] {
  return [
    // Row 1 (y=4)
    { x: 2, y: 4, isOrange: false, pegId: 'blue-1' },
    { x: 3.5, y: 4, isOrange: true, pegId: 'orange-1' },
    { x: 5, y: 4, isOrange: false, pegId: 'blue-2' },
    { x: 6.5, y: 4, isOrange: false, pegId: 'blue-3' },
    { x: 8, y: 4, isOrange: true, pegId: 'orange-2' },
    { x: 9.5, y: 4, isOrange: false, pegId: 'blue-4' },
    // Row 2 (y=5)
    { x: 2.75, y: 5, isOrange: false, pegId: 'blue-5' },
    { x: 4.25, y: 5, isOrange: false, pegId: 'blue-6' },
    { x: 5.75, y: 5, isOrange: true, pegId: 'orange-3' },
    { x: 7.25, y: 5, isOrange: false, pegId: 'blue-7' },
    { x: 8.75, y: 5, isOrange: false, pegId: 'blue-8' },
    // Row 3 (y=6)
    { x: 2, y: 6, isOrange: true, pegId: 'orange-4' },
    { x: 3.5, y: 6, isOrange: false, pegId: 'blue-9' },
    { x: 5, y: 6, isOrange: false, pegId: 'blue-10' },
    { x: 6.5, y: 6, isOrange: false, pegId: 'blue-11' },
    { x: 8, y: 6, isOrange: true, pegId: 'orange-5' },
    { x: 9.5, y: 6, isOrange: false, pegId: 'blue-12' },
  ];
}

describe('Slopeggle Validators', () => {
  describe('validateBounds', () => {
    it('should pass for valid level', () => {
      const level = createValidLevel();
      const result = validateBounds(level);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect peg extending beyond left bound', () => {
      const level = createValidLevel();
      level.push({ x: -0.2, y: 6, isOrange: false, pegId: 'out-of-bounds' });
      const result = validateBounds(level);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('left bound'))).toBe(true);
    });

    it('should detect peg extending beyond right bound', () => {
      const level = createValidLevel();
      level.push({ x: 12.3, y: 6, isOrange: false, pegId: 'out-of-bounds' });
      const result = validateBounds(level);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('right bound'))).toBe(true);
    });

    it('should detect peg extending beyond top bound', () => {
      const level = createValidLevel();
      level.push({ x: 6, y: -0.2, isOrange: false, pegId: 'out-of-bounds' });
      const result = validateBounds(level);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('top bound'))).toBe(true);
    });

    it('should detect peg extending beyond bottom bound', () => {
      const level = createValidLevel();
      level.push({ x: 6, y: 16.3, isOrange: false, pegId: 'out-of-bounds' });
      const result = validateBounds(level);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('bottom bound'))).toBe(true);
    });
  });

  describe('validateForbiddenZones', () => {
    it('should pass for valid level', () => {
      const level = createValidLevel();
      const result = validateForbiddenZones(level);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect peg in launcher zone', () => {
      const level = createValidLevel();
      level.push({ x: 6, y: 1.5, isOrange: false, pegId: 'launcher-zone' });
      const result = validateForbiddenZones(level);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('launcher zone'))).toBe(true);
    });

    it('should detect peg in bucket zone', () => {
      const level = createValidLevel();
      level.push({ x: 6, y: 14.5, isOrange: false, pegId: 'bucket-zone' });
      const result = validateForbiddenZones(level);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('bucket zone'))).toBe(true);
    });

    it('should detect multiple forbidden zone violations', () => {
      const level = [
        { x: 5, y: 1.0, isOrange: false, pegId: 'launcher-1' },
        { x: 7, y: 0.5, isOrange: false, pegId: 'launcher-2' },
        { x: 5, y: 15.0, isOrange: false, pegId: 'bucket-1' },
      ];
      const result = validateForbiddenZones(level);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('validateSpacing', () => {
    it('should pass for valid level with proper spacing', () => {
      const level = createValidLevel();
      const result = validateSpacing(level);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect overlapping pegs', () => {
      const level = [
        { x: 5, y: 5, isOrange: false, pegId: 'peg-1' },
        { x: 5.1, y: 5, isOrange: false, pegId: 'peg-2' }, // Too close!
      ];
      const result = validateSpacing(level);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('too close'))).toBe(true);
    });

    it('should detect diagonal overlap', () => {
      const level = [
        { x: 5, y: 5, isOrange: false, pegId: 'peg-1' },
        { x: 5.2, y: 5.2, isOrange: false, pegId: 'peg-2' }, // Too close diagonally!
      ];
      const result = validateSpacing(level);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('too close'))).toBe(true);
    });

    it('should handle multiple spacing violations', () => {
      const level = [
        { x: 5, y: 5, isOrange: false, pegId: 'peg-1' },
        { x: 5.15, y: 5.1, isOrange: false, pegId: 'peg-2' },
        { x: 5.3, y: 5.2, isOrange: false, pegId: 'peg-3' },
      ];
      const result = validateSpacing(level);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('validateOrangeCount', () => {
    it('should pass when orange count matches requested', () => {
      const level = createValidLevel();
      const result = validateOrangeCount(level, 5);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when orange count does not match', () => {
      const level = createValidLevel();
      const result = validateOrangeCount(level, 10); // Requested 10, have 5
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Orange peg count mismatch'))).toBe(true);
    });

    it('should warn when no orange pegs exist', () => {
      const level = [
        { x: 5, y: 5, isOrange: false, pegId: 'blue-only' },
      ];
      const result = validateOrangeCount(level, 0);
      expect(result.warnings.some(w => w.includes('no orange pegs'))).toBe(true);
    });

    it('should warn when too many orange pegs', () => {
      const level = Array.from({ length: 60 }, (_, i) => ({
        x: 2 + (i % 10) * 0.8,
        y: 4 + Math.floor(i / 10) * 0.8,
        isOrange: true,
        pegId: `orange-${i}`,
      }));
      const result = validateOrangeCount(level, 60);
      expect(result.warnings.some(w => w.includes('High orange peg count'))).toBe(true);
    });
  });

  describe('validateOrangeAccessibility', () => {
    it('should pass for level with accessible oranges', () => {
      const level = createValidLevel();
      const result = validateOrangeAccessibility(level);
      expect(result.valid).toBe(true);
    });

    it('should warn about oranges in corners', () => {
      const level = [
        { x: 0.5, y: 1, isOrange: true, pegId: 'corner-top-left' }, // Corner
        { x: 11.5, y: 1, isOrange: true, pegId: 'corner-top-right' }, // Corner
        { x: 6, y: 8, isOrange: false, pegId: 'center-blue' },
      ];
      const result = validateOrangeAccessibility(level);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should error when all oranges are in corners', () => {
      const level = [
        { x: 0.5, y: 1, isOrange: true, pegId: 'corner-1' },
        { x: 11.5, y: 1, isOrange: true, pegId: 'corner-2' },
        { x: 0.5, y: 15, isOrange: true, pegId: 'corner-3' },
        { x: 11.5, y: 15, isOrange: true, pegId: 'corner-4' },
      ];
      const result = validateOrangeAccessibility(level);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('inaccessible'))).toBe(true);
    });
  });

  describe('validateSlopeggleLevel (combined)', () => {
    it('should pass valid level', () => {
      const level = createValidLevel();
      const result = validateSlopeggleLevel(level, { orangePegCount: 5 });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accumulate multiple errors', () => {
      const level = [
        { x: -0.5, y: 1, isOrange: true, pegId: 'bad-1' }, // Out of bounds + launcher zone
        { x: 5.05, y: 5, isOrange: false, pegId: 'bad-2' }, // Too close to next
        { x: 5.1, y: 5, isOrange: false, pegId: 'bad-3' }, // Overlapping
      ];
      const result = validateSlopeggleLevel(level);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('createPegPositions', () => {
    it('should convert center-origin to top-left', () => {
      const input = [
        { x: -6, y: 8, isOrange: false, id: 'test' }, // Center origin
      ];
      const result = createPegPositions(input, true);
      expect(result[0].x).toBeCloseTo(0, 2);
      expect(result[0].y).toBeCloseTo(0, 2);
    });

    it('should pass through top-left coordinates', () => {
      const input = [
        { x: 5, y: 8, isOrange: false, id: 'test' },
      ];
      const result = createPegPositions(input, false);
      expect(result[0].x).toBe(5);
      expect(result[0].y).toBe(8);
    });

    it('should generate IDs for pegs without them', () => {
      const input = [
        { x: 5, y: 8, isOrange: false },
        { x: 6, y: 8, isOrange: true },
      ];
      const result = createPegPositions(input);
      expect(result[0].pegId).toBe('peg-0');
      expect(result[1].pegId).toBe('peg-1');
    });
  });
});

// Test level creators for manual testing (do not export from test file)
const testLevels = {
  valid: createValidLevel,

  /** Level with peg out of bounds */
  outOfBounds: (): PegPosition[] => [
    { x: -0.5, y: 6, isOrange: false, pegId: 'out-of-bounds' },
    { x: 5, y: 8, isOrange: true, pegId: 'orange-center' },
  ],

  /** Level with peg in launcher zone */
  inLauncherZone: (): PegPosition[] => [
    { x: 6, y: 1.5, isOrange: false, pegId: 'launcher-zone' },
    { x: 5, y: 8, isOrange: true, pegId: 'orange-center' },
  ],

  /** Level with peg in bucket zone */
  inBucketZone: (): PegPosition[] => [
    { x: 6, y: 14.5, isOrange: false, pegId: 'bucket-zone' },
    { x: 5, y: 8, isOrange: true, pegId: 'orange-center' },
  ],

  /** Level with overlapping pegs */
  overlapping: (): PegPosition[] => [
    { x: 5, y: 5, isOrange: false, pegId: 'peg-1' },
    { x: 5.1, y: 5, isOrange: false, pegId: 'peg-2' },
  ],

  /** Level with wrong orange count */
  wrongOrangeCount: (): PegPosition[] => {
    const pegs = createValidLevel();
    return pegs.map(p => ({ ...p, isOrange: p.isOrange }));
  },

  /** Level with all oranges in corners (should fail accessibility) */
  orangesInCorners: (): PegPosition[] => [
    { x: 0.5, y: 1, isOrange: true, pegId: 'corner-1' },
    { x: 11.5, y: 1, isOrange: true, pegId: 'corner-2' },
    { x: 0.5, y: 15, isOrange: true, pegId: 'corner-3' },
    { x: 11.5, y: 15, isOrange: true, pegId: 'corner-4' },
  ],
};
