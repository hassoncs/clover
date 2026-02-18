import { describe, it, expect } from 'vitest';
import { gameToGodot, godotToGame, gameToGodotVec, godotToGameVec } from '../coordinateUtils';
import type { Vec2 } from '../types';

describe('coordinateUtils', () => {
  describe('gameToGodot', () => {
    it('converts origin correctly with default ppm', () => {
      const result = gameToGodot({ x: 0, y: 0 }, 50);
      expect(result.x).toBe(0);
      expect(result.y).toBeCloseTo(0, 6);
    });

    it('converts positive position with ppm=50', () => {
      const result = gameToGodot({ x: 5, y: 10 }, 50);
      expect(result.x).toBe(250);
      expect(result.y).toBe(-500);
    });

    it('converts negative position with ppm=50', () => {
      const result = gameToGodot({ x: -3, y: -7 }, 50);
      expect(result.x).toBe(-150);
      expect(result.y).toBe(350);
    });

    it('converts fractional position with ppm=50', () => {
      const result = gameToGodot({ x: 1.5, y: 2.5 }, 50);
      expect(result.x).toBe(75);
      expect(result.y).toBe(-125);
    });

    it('scales correctly with ppm=100', () => {
      const result = gameToGodot({ x: 5, y: 10 }, 100);
      expect(result.x).toBe(500);
      expect(result.y).toBe(-1000);
    });

    it('handles large values', () => {
      const result = gameToGodot({ x: 1000, y: -1000 }, 50);
      expect(result.x).toBe(50000);
      expect(result.y).toBe(50000);
    });

    it('handles very small ppm', () => {
      const result = gameToGodot({ x: 10, y: 10 }, 0.1);
      expect(result.x).toBe(1);
      expect(result.y).toBe(-1);
    });
  });

  describe('godotToGame', () => {
    it('converts origin correctly with default ppm', () => {
      const result = godotToGame({ x: 0, y: 0 }, 50);
      expect(result.x).toBe(0);
      expect(result.y).toBeCloseTo(0, 6);
    });

    it('converts positive position with ppm=50', () => {
      const result = godotToGame({ x: 250, y: -500 }, 50);
      expect(result.x).toBe(5);
      expect(result.y).toBe(10);
    });

    it('converts negative position with ppm=50', () => {
      const result = godotToGame({ x: -150, y: 350 }, 50);
      expect(result.x).toBe(-3);
      expect(result.y).toBe(-7);
    });

    it('converts fractional position with ppm=50', () => {
      const result = godotToGame({ x: 75, y: -125 }, 50);
      expect(result.x).toBe(1.5);
      expect(result.y).toBe(2.5);
    });

    it('scales correctly with ppm=100', () => {
      const result = godotToGame({ x: 500, y: -1000 }, 100);
      expect(result.x).toBe(5);
      expect(result.y).toBe(10);
    });

    it('handles large values', () => {
      const result = godotToGame({ x: 50000, y: 50000 }, 50);
      expect(result.x).toBe(1000);
      expect(result.y).toBe(-1000);
    });

    it('handles very small ppm', () => {
      const result = godotToGame({ x: 1, y: -1 }, 0.1);
      expect(result.x).toBe(10);
      expect(result.y).toBe(10);
    });
  });

  describe('gameToGodotVec', () => {
    it('converts horizontal vector correctly', () => {
      const result = gameToGodotVec({ x: 10, y: 0 }, 50);
      expect(result.x).toBe(500);
      expect(result.y).toBeCloseTo(0, 6);
    });

    it('converts vertical vector correctly', () => {
      const result = gameToGodotVec({ x: 0, y: 10 }, 50);
      expect(result.x).toBe(0);
      expect(result.y).toBe(-500);
    });

    it('converts diagonal vector correctly', () => {
      const result = gameToGodotVec({ x: -5, y: -5 }, 50);
      expect(result.x).toBe(-250);
      expect(result.y).toBe(250);
    });

    it('scales correctly with ppm=100', () => {
      const result = gameToGodotVec({ x: 10, y: 0 }, 100);
      expect(result.x).toBe(1000);
      expect(result.y).toBeCloseTo(0, 6);
    });
  });

  describe('godotToGameVec', () => {
    it('converts horizontal vector correctly', () => {
      const result = godotToGameVec({ x: 500, y: 0 }, 50);
      expect(result.x).toBe(10);
      expect(result.y).toBeCloseTo(0, 6);
    });

    it('converts vertical vector correctly', () => {
      const result = godotToGameVec({ x: 0, y: -500 }, 50);
      expect(result.x).toBe(0);
      expect(result.y).toBe(10);
    });

    it('converts diagonal vector correctly', () => {
      const result = godotToGameVec({ x: -250, y: 250 }, 50);
      expect(result.x).toBe(-5);
      expect(result.y).toBe(-5);
    });

    it('scales correctly with ppm=100', () => {
      const result = godotToGameVec({ x: 1000, y: 0 }, 100);
      expect(result.x).toBe(10);
      expect(result.y).toBeCloseTo(0, 6);
    });
  });

  describe('round-trip verification', () => {
    it('gameToGodot -> godotToGame maintains position (ppm=50)', () => {
      const testCases: Vec2[] = [
        { x: 0, y: 0 },
        { x: 5, y: 10 },
        { x: -3, y: -7 },
        { x: 1.5, y: 2.5 },
        { x: 1000, y: -1000 },
        { x: -0.001, y: 0.001 },
      ];

      testCases.forEach(original => {
        const converted = gameToGodot(original, 50);
        const back = godotToGame(converted, 50);
        expect(back.x).toBeCloseTo(original.x, 6);
        expect(back.y).toBeCloseTo(original.y, 6);
      });
    });

    it('godotToGame -> gameToGodot maintains position (ppm=50)', () => {
      const testCases: Vec2[] = [
        { x: 0, y: 0 },
        { x: 250, y: -500 },
        { x: -150, y: 350 },
        { x: 75, y: -125 },
        { x: 50000, y: 50000 },
        { x: -0.05, y: 0.05 },
      ];

      testCases.forEach(original => {
        const converted = godotToGame(original, 50);
        const back = gameToGodot(converted, 50);
        expect(back.x).toBeCloseTo(original.x, 6);
        expect(back.y).toBeCloseTo(original.y, 6);
      });
    });

    it('gameToGodotVec -> godotToGameVec maintains vector (ppm=50)', () => {
      const testCases: Vec2[] = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 0, y: 10 },
        { x: -5, y: -5 },
        { x: 100, y: -100 },
      ];

      testCases.forEach(original => {
        const converted = gameToGodotVec(original, 50);
        const back = godotToGameVec(converted, 50);
        expect(back.x).toBeCloseTo(original.x, 6);
        expect(back.y).toBeCloseTo(original.y, 6);
      });
    });

    it('round-trip works with different ppm values', () => {
      const testCases: { pos: Vec2; ppm: number }[] = [
        { pos: { x: 5, y: 10 }, ppm: 50 },
        { pos: { x: 5, y: 10 }, ppm: 100 },
        { pos: { x: -3, y: 7 }, ppm: 25 },
        { pos: { x: 0.5, y: -0.5 }, ppm: 200 },
      ];

      testCases.forEach(({ pos, ppm }) => {
        const converted = gameToGodot(pos, ppm);
        const back = godotToGame(converted, ppm);
        expect(back.x).toBeCloseTo(pos.x, 6);
        expect(back.y).toBeCloseTo(pos.y, 6);
      });
    });
  });

  describe('position vs vector equivalence', () => {
    it('gameToGodot and gameToGodotVec produce same result for same input', () => {
      const pos = { x: 5, y: 10 };
      const resultPos = gameToGodot(pos, 50);
      const resultVec = gameToGodotVec(pos, 50);
      expect(resultPos.x).toBe(resultVec.x);
      expect(resultPos.y).toBe(resultVec.y);
    });

    it('godotToGame and godotToGameVec produce same result for same input', () => {
      const pos = { x: 250, y: -500 };
      const resultPos = godotToGame(pos, 50);
      const resultVec = godotToGameVec(pos, 50);
      expect(resultPos.x).toBe(resultVec.x);
      expect(resultPos.y).toBe(resultVec.y);
    });
  });
});
