import { describe, it, expect } from 'vitest';
import { generatePuzzle, isPuzzleSolvable } from '../puzzleGenerator';
import { getPuzzleConfigForLevel } from '../game';

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
    it('should configure level 1 with 2 colors and 1 extra tube', () => {
      const config = getPuzzleConfigForLevel(1);

      expect(config.numColors).toBe(2);
      expect(config.extraTubes).toBe(1);
      expect(config.difficulty).toBe(1);
      expect(config.ballsPerColor).toBe(4);
      expect(config.seed).toBe(1000);
    });

    it('should configure level 2 with 3 colors', () => {
      const config = getPuzzleConfigForLevel(2);

      expect(config.numColors).toBe(3);
      expect(config.extraTubes).toBe(1);
      expect(config.difficulty).toBe(1);
    });

    it('should configure level 3 with 3 colors', () => {
      const config = getPuzzleConfigForLevel(3);

      expect(config.numColors).toBe(3);
      expect(config.extraTubes).toBe(1);
      expect(config.difficulty).toBe(1);
    });

    it('should increase difficulty every 5 levels', () => {
      const level1Config = getPuzzleConfigForLevel(1);
      const level6Config = getPuzzleConfigForLevel(6);
      const level11Config = getPuzzleConfigForLevel(11);

      expect(level1Config.difficulty).toBe(1);
      expect(level6Config.difficulty).toBe(2);
      expect(level11Config.difficulty).toBe(3);
    });

    it('should add extra tubes at level 4+', () => {
      const level3Config = getPuzzleConfigForLevel(3);
      const level4Config = getPuzzleConfigForLevel(4);

      expect(level3Config.extraTubes).toBe(1);
      expect(level4Config.extraTubes).toBe(2);
    });

    it('should scale colors with level progression', () => {
      const level4Config = getPuzzleConfigForLevel(4);
      const level14Config = getPuzzleConfigForLevel(14);
      const level24Config = getPuzzleConfigForLevel(24);

      expect(level4Config.numColors).toBe(4);
      expect(level14Config.numColors).toBe(5);
      expect(level24Config.numColors).toBe(6);
    });

    it('should cap colors at 8', () => {
      const level100Config = getPuzzleConfigForLevel(100);

      expect(level100Config.numColors).toBeLessThanOrEqual(8);
    });

    it('should cap difficulty at 10', () => {
      const level100Config = getPuzzleConfigForLevel(100);

      expect(level100Config.difficulty).toBeLessThanOrEqual(10);
    });

    it('should use deterministic seeds based on level', () => {
      const level1Config = getPuzzleConfigForLevel(1);
      const level2Config = getPuzzleConfigForLevel(2);

      expect(level1Config.seed).toBe(1000);
      expect(level2Config.seed).toBe(2000);
      expect(level2Config.seed).not.toBe(level1Config.seed);
    });
  });
});
