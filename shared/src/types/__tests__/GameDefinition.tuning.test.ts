import { describe, it, expect } from 'vitest';
import {
  isVariableWithTuning,
  isTunable,
  getValue,
  getLabel,
  type GameVariable,
  type VariableWithTuning,
} from '../GameDefinition';

describe('Variable Tuning Type Guards', () => {
  describe('isVariableWithTuning', () => {
    it('should return false for primitive number', () => {
      expect(isVariableWithTuning(42)).toBe(false);
    });

    it('should return false for primitive boolean', () => {
      expect(isVariableWithTuning(true)).toBe(false);
    });

    it('should return false for primitive string', () => {
      expect(isVariableWithTuning('test')).toBe(false);
    });

    it('should return false for Vec2', () => {
      expect(isVariableWithTuning({ x: 1, y: 2 })).toBe(false);
    });

    it('should return false for expression', () => {
      expect(isVariableWithTuning({ expr: 'score * 2' })).toBe(false);
    });

    it('should return true for VariableWithTuning object', () => {
      const variable: VariableWithTuning = {
        value: 10,
        tuning: { min: 0, max: 20, step: 1 },
      };
      expect(isVariableWithTuning(variable)).toBe(true);
    });

    it('should return true for VariableWithTuning without tuning', () => {
      const variable: VariableWithTuning = {
        value: 10,
        label: 'Test Variable',
      };
      expect(isVariableWithTuning(variable)).toBe(true);
    });
  });

  describe('isTunable', () => {
    it('should return false for primitive', () => {
      expect(isTunable(42)).toBe(false);
    });

    it('should return false for VariableWithTuning without tuning field', () => {
      const variable: VariableWithTuning = {
        value: 10,
        label: 'Test',
      };
      expect(isTunable(variable)).toBe(false);
    });

    it('should return true for VariableWithTuning with tuning field', () => {
      const variable: VariableWithTuning = {
        value: 10,
        tuning: { min: 0, max: 20, step: 1 },
      };
      expect(isTunable(variable)).toBe(true);
    });
  });

  describe('getValue', () => {
    it('should return primitive number as-is', () => {
      expect(getValue(42)).toBe(42);
    });

    it('should return primitive boolean as-is', () => {
      expect(getValue(true)).toBe(true);
    });

    it('should return primitive string as-is', () => {
      expect(getValue('test')).toBe('test');
    });

    it('should return Vec2 as-is', () => {
      const vec = { x: 1, y: 2 };
      expect(getValue(vec)).toEqual(vec);
    });

    it('should return expression as-is', () => {
      const expr = { expr: 'score * 2' };
      expect(getValue(expr)).toEqual(expr);
    });

    it('should extract value from VariableWithTuning', () => {
      const variable: VariableWithTuning = {
        value: 10,
        tuning: { min: 0, max: 20, step: 1 },
      };
      expect(getValue(variable)).toBe(10);
    });

    it('should extract string value from VariableWithTuning', () => {
      const variable: VariableWithTuning = {
        value: 'hello',
        category: 'gameplay',
      };
      expect(getValue(variable)).toBe('hello');
    });

    it('should extract expression value from VariableWithTuning', () => {
      const variable: VariableWithTuning = {
        value: { expr: 'level * 10' },
        label: 'Difficulty',
      };
      expect(getValue(variable)).toEqual({ expr: 'level * 10' });
    });
  });

  describe('getLabel', () => {
    it('should auto-generate label from camelCase key', () => {
      expect(getLabel('jumpForce', 42)).toBe('Jump Force');
    });

    it('should auto-generate label from single word key', () => {
      expect(getLabel('gravity', 10)).toBe('Gravity');
    });

    it('should use provided label from VariableWithTuning', () => {
      const variable: VariableWithTuning = {
        value: 15,
        label: 'Player Jump Height',
      };
      expect(getLabel('jumpForce', variable)).toBe('Player Jump Height');
    });

    it('should fall back to auto-generated label if no label provided', () => {
      const variable: VariableWithTuning = {
        value: 15,
        tuning: { min: 5, max: 25, step: 1 },
      };
      expect(getLabel('playerSpeed', variable)).toBe('Player Speed');
    });
  });
});

describe('Variable Tuning Integration', () => {
  it('should work with mixed variable types', () => {
    const variables: Record<string, GameVariable> = {
      // Simple primitives
      score: 0,
      lives: 3,
      playerName: 'Player1',
      
      // Vec2
      spawnPoint: { x: 5, y: 10 },
      
      // Expression
      difficulty: { expr: 'level * 0.5' },
      
      // Tunable variables
      jumpForce: {
        value: 15,
        tuning: { min: 5, max: 25, step: 0.5 },
        category: 'gameplay',
        label: 'Jump Height',
      },
      gravity: {
        value: 10,
        tuning: { min: 5, max: 20, step: 1 },
        category: 'physics',
      },
      
      // Non-tunable rich variable
      theme: {
        value: 'dark',
        label: 'Visual Theme',
      },
    };

    // Filter tunable variables
    const tunables = Object.entries(variables)
      .filter(([_, v]) => isTunable(v));
    
    expect(tunables).toHaveLength(2);
    expect(tunables.map(([k]) => k)).toContain('jumpForce');
    expect(tunables.map(([k]) => k)).toContain('gravity');

    // Get values for all variables
    const values = Object.fromEntries(
      Object.entries(variables).map(([k, v]) => [k, getValue(v)])
    );
    
    expect(values.score).toBe(0);
    expect(values.jumpForce).toBe(15);
    expect(values.gravity).toBe(10);
    expect(values.theme).toBe('dark');
    expect(values.difficulty).toEqual({ expr: 'level * 0.5' });
  });
});
