import { describe, it, expect } from 'vitest';
import { generatePuzzle, isPuzzleSolvable } from '../puzzleGenerator';
import { getPuzzleConfigForLevel } from '../generateLevels';

describe('puzzleGenerator', () => {
  describe('generatePuzzle', () => {
    it('should generate a valid puzzle', () => {
      const puzzle = generatePuzzle({
        numColors: 4,
        ballsPerColor: 4,
        extraTubes: 2,
        difficulty: 5,
        seed: 12345,
      });

      expect(puzzle.tubes).toBeDefined();
      expect(puzzle.tubes.length).toBe(6);
      expect(puzzle.minMoves).toBeGreaterThan(0);
      expect(puzzle.difficulty).toBe(5);
    });

    it('should generate deterministic puzzles with same seed', () => {
      const puzzle1 = generatePuzzle({
        numColors: 3,
        ballsPerColor: 4,
        extraTubes: 1,
        difficulty: 3,
        seed: 42,
      });

      const puzzle2 = generatePuzzle({
        numColors: 3,
        ballsPerColor: 4,
        extraTubes: 1,
        difficulty: 3,
        seed: 42,
      });

      expect(puzzle1.tubes).toEqual(puzzle2.tubes);
      expect(puzzle1.minMoves).toBe(puzzle2.minMoves);
    });

    it('should generate different puzzles with different seeds', () => {
      const puzzle1 = generatePuzzle({
        numColors: 3,
        ballsPerColor: 4,
        extraTubes: 1,
        difficulty: 3,
        seed: 100,
      });

      const puzzle2 = generatePuzzle({
        numColors: 3,
        ballsPerColor: 4,
        extraTubes: 1,
        difficulty: 3,
        seed: 200,
      });

      expect(puzzle1.tubes).not.toEqual(puzzle2.tubes);
    });

    it('should respect ball count constraints', () => {
      const puzzle = generatePuzzle({
        numColors: 4,
        ballsPerColor: 4,
        extraTubes: 2,
        difficulty: 5,
        seed: 999,
      });

      const totalBalls = puzzle.tubes.reduce((sum, tube) => sum + tube.length, 0);
      expect(totalBalls).toBe(4 * 4);
    });

    it('should create empty tubes for extra tubes', () => {
      const puzzle = generatePuzzle({
        numColors: 3,
        ballsPerColor: 4,
        extraTubes: 2,
        difficulty: 3,
        seed: 555,
      });

      const emptyTubes = puzzle.tubes.filter(tube => tube.length === 0);
      expect(emptyTubes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('isPuzzleSolvable', () => {
    it('should verify solvable puzzles', () => {
      const puzzle = generatePuzzle({
        numColors: 2,
        ballsPerColor: 4,
        extraTubes: 1,
        difficulty: 1,
        seed: 777,
      });

      const result = isPuzzleSolvable(puzzle.tubes, 4);
      expect(result.solvable).toBe(true);
      expect(result.movesRequired).toBeGreaterThan(0);
    });

    it('should detect already solved puzzles', () => {
      const solvedTubes = [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [],
      ];

      const result = isPuzzleSolvable(solvedTubes, 4);
      expect(result.solvable).toBe(true);
      expect(result.movesRequired).toBe(0);
    });
  });

  describe('getPuzzleConfigForLevel', () => {
    it('should return a valid config for any level', () => {
      for (const level of [1, 5, 10, 50, 100, 255]) {
        const config = getPuzzleConfigForLevel(level);

        expect(config.numColors).toBeGreaterThanOrEqual(2);
        expect(config.numColors).toBeLessThanOrEqual(8);
        expect(config.ballsPerColor).toBe(4);
        expect(config.extraTubes).toBeGreaterThanOrEqual(1);
        expect(config.difficulty).toBeGreaterThanOrEqual(1);
        expect(config.difficulty).toBeLessThanOrEqual(10);
        expect(config.seed).toBeDefined();
      }
    });

    it('should increase colors monotonically', () => {
      let prevColors = 0;
      for (let level = 1; level <= 255; level++) {
        const config = getPuzzleConfigForLevel(level);
        expect(config.numColors).toBeGreaterThanOrEqual(prevColors);
        prevColors = config.numColors;
      }
    });
  });
});
