import { describe, it, expect } from 'vitest';
import { validateMatch3Playability, validateTetrisPlayability, validatePlayable } from '../playable';
import type { Match3Config, TetrisConfig, GameDefinition } from '../../types/GameDefinition';

describe('validateMatch3Playability', () => {
  const validConfig: Match3Config = {
    gridId: 'test-grid',
    rows: 8,
    cols: 8,
    cellSize: 1,
    piecePrefabs: ['red', 'blue', 'green', 'yellow'],
    minMatch: 3,
  };

  it('should pass for valid config', () => {
    const result = validateMatch3Playability(validConfig);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  describe('piecePrefabs validation', () => {
    it('should error when piecePrefabs has fewer than 3 items', () => {
      const config: Match3Config = { ...validConfig, piecePrefabs: ['red', 'blue'] };
      const result = validateMatch3Playability(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Match3: At least 3 piece prefabs required, got 2');
    });

    it('should error when piecePrefabs is empty', () => {
      const config: Match3Config = { ...validConfig, piecePrefabs: [] };
      const result = validateMatch3Playability(config);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('At least 3 piece prefabs required');
    });

    it('should warn when piecePrefabs has more than 6 items', () => {
      const config: Match3Config = {
        ...validConfig,
        piecePrefabs: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
      };
      const result = validateMatch3Playability(config);
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Match3: More than 6 piece prefabs may reduce match frequency');
    });

    it('should pass with exactly 3 piece prefabs', () => {
      const config: Match3Config = { ...validConfig, piecePrefabs: ['a', 'b', 'c'] };
      const result = validateMatch3Playability(config);
      expect(result.valid).toBe(true);
    });

    it('should pass with exactly 6 piece prefabs', () => {
      const config: Match3Config = {
        ...validConfig,
        piecePrefabs: ['a', 'b', 'c', 'd', 'e', 'f'],
      };
      const result = validateMatch3Playability(config);
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('rows validation', () => {
    it('should error when rows is less than 4', () => {
      const config: Match3Config = { ...validConfig, rows: 3 };
      const result = validateMatch3Playability(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Match3: rows must be between 4 and 12, got 3');
    });

    it('should error when rows is greater than 12', () => {
      const config: Match3Config = { ...validConfig, rows: 13 };
      const result = validateMatch3Playability(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Match3: rows must be between 4 and 12, got 13');
    });

    it('should pass with rows at minimum boundary (4)', () => {
      const config: Match3Config = { ...validConfig, rows: 4 };
      const result = validateMatch3Playability(config);
      expect(result.valid).toBe(true);
    });

    it('should pass with rows at maximum boundary (12)', () => {
      const config: Match3Config = { ...validConfig, rows: 12 };
      const result = validateMatch3Playability(config);
      expect(result.valid).toBe(true);
    });
  });

  describe('cols validation', () => {
    it('should error when cols is less than 4', () => {
      const config: Match3Config = { ...validConfig, cols: 3 };
      const result = validateMatch3Playability(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Match3: cols must be between 4 and 12, got 3');
    });

    it('should error when cols is greater than 12', () => {
      const config: Match3Config = { ...validConfig, cols: 13 };
      const result = validateMatch3Playability(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Match3: cols must be between 4 and 12, got 13');
    });

    it('should pass with cols at minimum boundary (4)', () => {
      const config: Match3Config = { ...validConfig, cols: 4 };
      const result = validateMatch3Playability(config);
      expect(result.valid).toBe(true);
    });

    it('should pass with cols at maximum boundary (12)', () => {
      const config: Match3Config = { ...validConfig, cols: 12 };
      const result = validateMatch3Playability(config);
      expect(result.valid).toBe(true);
    });
  });

  describe('minMatch validation', () => {
    it('should error when minMatch is less than 3', () => {
      const config: Match3Config = { ...validConfig, minMatch: 2 };
      const result = validateMatch3Playability(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Match3: minMatch must be between 3 and 5, got 2');
    });

    it('should error when minMatch is greater than 5', () => {
      const config: Match3Config = { ...validConfig, minMatch: 6 };
      const result = validateMatch3Playability(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Match3: minMatch must be between 3 and 5, got 6');
    });

    it('should pass when minMatch is undefined (uses default)', () => {
      const config: Match3Config = { ...validConfig, minMatch: undefined };
      const result = validateMatch3Playability(config);
      expect(result.valid).toBe(true);
    });

    it('should pass with minMatch at minimum boundary (3)', () => {
      const config: Match3Config = { ...validConfig, minMatch: 3 };
      const result = validateMatch3Playability(config);
      expect(result.valid).toBe(true);
    });

    it('should pass with minMatch at maximum boundary (5)', () => {
      const config: Match3Config = { ...validConfig, minMatch: 5 };
      const result = validateMatch3Playability(config);
      expect(result.valid).toBe(true);
    });
  });

  describe('cellSize validation', () => {
    it('should error when cellSize is zero', () => {
      const config: Match3Config = { ...validConfig, cellSize: 0 };
      const result = validateMatch3Playability(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Match3: cellSize must be positive, got 0');
    });

    it('should error when cellSize is negative', () => {
      const config: Match3Config = { ...validConfig, cellSize: -1 };
      const result = validateMatch3Playability(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Match3: cellSize must be positive, got -1');
    });

    it('should pass with positive cellSize', () => {
      const config: Match3Config = { ...validConfig, cellSize: 0.5 };
      const result = validateMatch3Playability(config);
      expect(result.valid).toBe(true);
    });
  });

  describe('multiple errors', () => {
    it('should collect all errors', () => {
      const config: Match3Config = {
        gridId: 'test',
        rows: 2,
        cols: 15,
        cellSize: -1,
        piecePrefabs: ['a'],
        minMatch: 1,
      };
      const result = validateMatch3Playability(config);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
    });
  });
});

describe('validateTetrisPlayability', () => {
  const validConfig: TetrisConfig = {
    gridId: 'test-grid',
    boardWidth: 10,
    boardHeight: 20,
    piecePrefabs: ['I', 'O', 'T', 'S', 'Z', 'J', 'L'],
    initialDropSpeed: 1,
  };

  it('should pass for valid config', () => {
    const result = validateTetrisPlayability(validConfig);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  describe('boardWidth validation', () => {
    it('should error when boardWidth is less than 10', () => {
      const config: TetrisConfig = { ...validConfig, boardWidth: 9 };
      const result = validateTetrisPlayability(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Tetris: boardWidth must be at least 10, got 9');
    });

    it('should error when boardWidth is greater than 20', () => {
      const config: TetrisConfig = { ...validConfig, boardWidth: 21 };
      const result = validateTetrisPlayability(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Tetris: boardWidth must be at most 20, got 21');
    });

    it('should pass with boardWidth at minimum boundary (10)', () => {
      const config: TetrisConfig = { ...validConfig, boardWidth: 10 };
      const result = validateTetrisPlayability(config);
      expect(result.valid).toBe(true);
    });

    it('should pass with boardWidth at maximum boundary (20)', () => {
      const config: TetrisConfig = { ...validConfig, boardWidth: 20 };
      const result = validateTetrisPlayability(config);
      expect(result.valid).toBe(true);
    });
  });

  describe('boardHeight validation', () => {
    it('should error when boardHeight is less than 15', () => {
      const config: TetrisConfig = { ...validConfig, boardHeight: 14 };
      const result = validateTetrisPlayability(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Tetris: boardHeight must be at least 15, got 14');
    });

    it('should error when boardHeight is greater than 25', () => {
      const config: TetrisConfig = { ...validConfig, boardHeight: 26 };
      const result = validateTetrisPlayability(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Tetris: boardHeight must be at most 25, got 26');
    });

    it('should pass with boardHeight at minimum boundary (15)', () => {
      const config: TetrisConfig = { ...validConfig, boardHeight: 15 };
      const result = validateTetrisPlayability(config);
      expect(result.valid).toBe(true);
    });

    it('should pass with boardHeight at maximum boundary (25)', () => {
      const config: TetrisConfig = { ...validConfig, boardHeight: 25 };
      const result = validateTetrisPlayability(config);
      expect(result.valid).toBe(true);
    });
  });

  describe('piecePrefabs validation', () => {
    it('should error when piecePrefabs has fewer than 7 items', () => {
      const config: TetrisConfig = { ...validConfig, piecePrefabs: ['I', 'O', 'T', 'S', 'Z', 'J'] };
      const result = validateTetrisPlayability(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Tetris: piecePrefabs must have exactly 7 items (I, O, T, S, Z, J, L), got 6');
    });

    it('should error when piecePrefabs has more than 7 items', () => {
      const config: TetrisConfig = { ...validConfig, piecePrefabs: ['I', 'O', 'T', 'S', 'Z', 'J', 'L', 'X'] };
      const result = validateTetrisPlayability(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Tetris: piecePrefabs must have exactly 7 items (I, O, T, S, Z, J, L), got 8');
    });

    it('should error when piecePrefabs is empty', () => {
      const config: TetrisConfig = { ...validConfig, piecePrefabs: [] };
      const result = validateTetrisPlayability(config);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('piecePrefabs must have exactly 7 items');
    });

    it('should pass with exactly 7 piece prefabs', () => {
      const config: TetrisConfig = { ...validConfig, piecePrefabs: ['I', 'O', 'T', 'S', 'Z', 'J', 'L'] };
      const result = validateTetrisPlayability(config);
      expect(result.valid).toBe(true);
    });
  });

  describe('initialDropSpeed validation', () => {
    it('should error when initialDropSpeed is zero', () => {
      const config: TetrisConfig = { ...validConfig, initialDropSpeed: 0 };
      const result = validateTetrisPlayability(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Tetris: initialDropSpeed must be at least 0.1, got 0');
    });

    it('should error when initialDropSpeed is negative', () => {
      const config: TetrisConfig = { ...validConfig, initialDropSpeed: -1 };
      const result = validateTetrisPlayability(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Tetris: initialDropSpeed must be at least 0.1, got -1');
    });

    it('should pass when initialDropSpeed is undefined (uses default)', () => {
      const config: TetrisConfig = { ...validConfig, initialDropSpeed: undefined };
      const result = validateTetrisPlayability(config);
      expect(result.valid).toBe(true);
    });

    it('should pass with positive initialDropSpeed', () => {
      const config: TetrisConfig = { ...validConfig, initialDropSpeed: 0.5 };
      const result = validateTetrisPlayability(config);
      expect(result.valid).toBe(true);
    });

    it('should pass with initialDropSpeed at minimum boundary (0.1)', () => {
      const config: TetrisConfig = { ...validConfig, initialDropSpeed: 0.1 };
      const result = validateTetrisPlayability(config);
      expect(result.valid).toBe(true);
    });
  });

  describe('multiple errors', () => {
    it('should collect all errors', () => {
      const config: TetrisConfig = {
        gridId: 'test',
        boardWidth: 5,
        boardHeight: 10,
        piecePrefabs: ['I', 'O'],
        initialDropSpeed: 0,
      };
      const result = validateTetrisPlayability(config);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
    });
  });
});

describe('validatePlayable', () => {
  it('should pass for game without match3 config', () => {
    const gameDef = {
      metadata: { id: 'test', title: 'Test', version: '1.0.0' },
      world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
      prefabs: {},
      entities: [],
    } as GameDefinition;

    const result = validatePlayable(gameDef);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate match3 config when present', () => {
    const gameDef = {
      metadata: { id: 'test', title: 'Test', version: '1.0.0' },
      world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
      prefabs: {},
      entities: [],
      match3: {
        gridId: 'grid',
        rows: 2,
        cols: 8,
        cellSize: 1,
        piecePrefabs: ['a', 'b', 'c'],
      },
    } as GameDefinition;

    const result = validatePlayable(gameDef);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Match3: rows must be between 4 and 12, got 2');
  });

  it('should pass for valid match3 game', () => {
    const gameDef = {
      metadata: { id: 'test', title: 'Test', version: '1.0.0' },
      world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
      prefabs: {},
      entities: [],
      match3: {
        gridId: 'grid',
        rows: 8,
        cols: 8,
        cellSize: 1,
        piecePrefabs: ['red', 'blue', 'green'],
      },
    } as GameDefinition;

    const result = validatePlayable(gameDef);
    expect(result.valid).toBe(true);
  });

  it('should validate tetris config when present', () => {
    const gameDef = {
      metadata: { id: 'test', title: 'Test', version: '1.0.0' },
      world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
      prefabs: {},
      entities: [],
      tetris: {
        gridId: 'grid',
        boardWidth: 5,
        boardHeight: 20,
        piecePrefabs: ['I', 'O', 'T', 'S', 'Z', 'J', 'L'],
      },
    } as GameDefinition;

    const result = validatePlayable(gameDef);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Tetris: boardWidth must be at least 10, got 5');
  });

  it('should pass for valid tetris game', () => {
    const gameDef = {
      metadata: { id: 'test', title: 'Test', version: '1.0.0' },
      world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
      prefabs: {},
      entities: [],
      tetris: {
        gridId: 'grid',
        boardWidth: 10,
        boardHeight: 20,
        piecePrefabs: ['I', 'O', 'T', 'S', 'Z', 'J', 'L'],
      },
    } as GameDefinition;

    const result = validatePlayable(gameDef);
    expect(result.valid).toBe(true);
  });

  it('should validate both match3 and tetris when both present', () => {
    const gameDef = {
      metadata: { id: 'test', title: 'Test', version: '1.0.0' },
      world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
      prefabs: {},
      entities: [],
      match3: {
        gridId: 'grid1',
        rows: 2,
        cols: 8,
        cellSize: 1,
        piecePrefabs: ['a', 'b', 'c'],
      },
      tetris: {
        gridId: 'grid2',
        boardWidth: 5,
        boardHeight: 20,
        piecePrefabs: ['I', 'O', 'T', 'S', 'Z', 'J', 'L'],
      },
    } as GameDefinition;

    const result = validatePlayable(gameDef);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Match3: rows must be between 4 and 12, got 2');
    expect(result.errors).toContain('Tetris: boardWidth must be at least 10, got 5');
  });
});
