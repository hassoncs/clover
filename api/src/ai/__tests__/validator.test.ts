import { describe, it, expect } from 'vitest';
import { validateGameDefinition, getValidationSummary } from '../validator';
import validProjectileGame from '../../__fixtures__/games/valid-projectile-game.json';
import invalidNoEntities from '../../__fixtures__/games/invalid-game-no-entities.json';
import invalidBadPhysics from '../../__fixtures__/games/invalid-game-bad-physics.json';

describe('validateGameDefinition', () => {
  describe('valid games', () => {
    it('should validate a complete projectile game', () => {
      const result = validateGameDefinition(validProjectileGame as any);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept game with warnings but no errors', () => {
      const game = {
        metadata: { id: 'test', title: 'Test' },
        world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
        entities: [
          {
            id: 'player',
            transform: { x: 5, y: 5 },
            physics: {
              bodyType: 'dynamic',
              shape: 'box',
              width: 1,
              height: 1,
              density: 1,
              friction: 0.5,
              restitution: 0.5,
            },
            sprite: { type: 'rect', width: 1, height: 1, fill: '#FF0000' },
          },
        ],
        rules: [
          { id: 'r1', trigger: { type: 'tap' }, actions: [] },
        ],
        winCondition: { type: 'score', score: 100 },
        loseCondition: { type: 'time_up', time: 60 },
      };

      const result = validateGameDefinition(game as any);
      expect(result.valid).toBe(true);
    });
  });

  describe('metadata validation', () => {
    it('should error on missing metadata', () => {
      const result = validateGameDefinition({} as any);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_METADATA')).toBe(true);
    });

    it('should error on missing game ID', () => {
      const game = {
        metadata: { title: 'No ID Game' },
        world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
        entities: [
          {
            id: 'e1',
            transform: { x: 0, y: 0 },
            physics: { bodyType: 'static', shape: 'box', width: 1, height: 1, density: 1, friction: 0.5, restitution: 0 },
            sprite: { type: 'rect', width: 1, height: 1, fill: '#000' },
          },
        ],
      };

      const result = validateGameDefinition(game as any);
      expect(result.errors.some(e => e.code === 'MISSING_ID')).toBe(true);
    });

    it('should warn on missing title', () => {
      const game = {
        metadata: { id: 'test-id' },
        world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
        entities: [
          {
            id: 'e1',
            transform: { x: 0, y: 0 },
            physics: { bodyType: 'static', shape: 'box', width: 1, height: 1, density: 1, friction: 0.5, restitution: 0 },
            sprite: { type: 'rect', width: 1, height: 1, fill: '#000' },
          },
        ],
      };

      const result = validateGameDefinition(game as any);
      expect(result.warnings.some(w => w.code === 'MISSING_TITLE')).toBe(true);
    });
  });

  describe('world validation', () => {
    it('should error on missing world config', () => {
      const game = {
        metadata: { id: 'test' },
        entities: [],
      };

      const result = validateGameDefinition(game as any);
      expect(result.errors.some(e => e.code === 'MISSING_WORLD')).toBe(true);
    });

    it('should error on missing gravity', () => {
      const game = {
        metadata: { id: 'test' },
        world: { pixelsPerMeter: 50 },
        entities: [
          {
            id: 'e1',
            transform: { x: 0, y: 0 },
            physics: { bodyType: 'static', shape: 'box', width: 1, height: 1, density: 1, friction: 0.5, restitution: 0 },
            sprite: { type: 'rect', width: 1, height: 1, fill: '#000' },
          },
        ],
      };

      const result = validateGameDefinition(game as any);
      expect(result.errors.some(e => e.code === 'MISSING_GRAVITY')).toBe(true);
    });
  });

  describe('entities validation', () => {
    it('should error on empty entities array', () => {
      const result = validateGameDefinition(invalidNoEntities as any);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'NO_ENTITIES')).toBe(true);
    });

    it('should error on missing entities array', () => {
      const game = {
        metadata: { id: 'test' },
        world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
      };

      const result = validateGameDefinition(game as any);
      expect(result.errors.some(e => e.code === 'MISSING_ENTITIES')).toBe(true);
    });

    it('should error on duplicate entity IDs', () => {
      const game = {
        metadata: { id: 'test' },
        world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
        entities: [
          {
            id: 'same-id',
            transform: { x: 0, y: 0 },
            physics: { bodyType: 'static', shape: 'box', width: 1, height: 1, density: 1, friction: 0.5, restitution: 0 },
            sprite: { type: 'rect', width: 1, height: 1, fill: '#000' },
          },
          {
            id: 'same-id',
            transform: { x: 5, y: 5 },
            physics: { bodyType: 'static', shape: 'box', width: 1, height: 1, density: 1, friction: 0.5, restitution: 0 },
            sprite: { type: 'rect', width: 1, height: 1, fill: '#000' },
          },
        ],
      };

      const result = validateGameDefinition(game as any);
      expect(result.errors.some(e => e.code === 'DUPLICATE_ENTITY_ID')).toBe(true);
    });

    it('should warn on too many entities', () => {
      const entities = Array.from({ length: 55 }, (_, i) => ({
        id: `entity-${i}`,
        transform: { x: i, y: 0 },
        physics: { bodyType: 'static', shape: 'box', width: 1, height: 1, density: 1, friction: 0.5, restitution: 0 },
        sprite: { type: 'rect', width: 1, height: 1, fill: '#000' },
      }));

      const game = {
        metadata: { id: 'test' },
        world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
        entities,
      };

      const result = validateGameDefinition(game as any);
      expect(result.warnings.some(w => w.code === 'TOO_MANY_ENTITIES')).toBe(true);
    });

     it('should error when no entity has control behavior', () => {
       const game = {
         metadata: { id: 'test' },
         world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
         entities: [
           {
             id: 'static-box',
             transform: { x: 0, y: 0 },
             physics: { bodyType: 'static', shape: 'box', width: 1, height: 1, density: 1, friction: 0.5, restitution: 0 },
             sprite: { type: 'rect', width: 1, height: 1, fill: '#000' },
           },
         ],
       };

       const result = validateGameDefinition(game as any);
       expect(result.errors.some(e => e.code === 'NO_PLAYER_CONTROL')).toBe(true);
     });
  });

  describe('physics validation', () => {
    it('should error on invalid body type', () => {
      const result = validateGameDefinition(invalidBadPhysics as any);
      expect(result.errors.some(e => e.code === 'INVALID_BODY_TYPE')).toBe(true);
    });

    it('should error on invalid shape', () => {
      const result = validateGameDefinition(invalidBadPhysics as any);
      expect(result.errors.some(e => e.code === 'INVALID_SHAPE')).toBe(true);
    });

    it('should error on negative density', () => {
      const result = validateGameDefinition(invalidBadPhysics as any);
      expect(result.errors.some(e => e.code === 'NEGATIVE_DENSITY')).toBe(true);
    });

    it('should error on negative restitution', () => {
      const result = validateGameDefinition(invalidBadPhysics as any);
      expect(result.errors.some(e => e.code === 'NEGATIVE_RESTITUTION')).toBe(true);
    });

    it('should warn on friction out of range', () => {
      const result = validateGameDefinition(invalidBadPhysics as any);
      expect(result.warnings.some(w => w.code === 'FRICTION_OUT_OF_RANGE')).toBe(true);
    });

    it('should error on box physics missing dimensions', () => {
      const game = {
        metadata: { id: 'test' },
        world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
        entities: [
          {
            id: 'bad-box',
            transform: { x: 0, y: 0 },
            physics: { bodyType: 'static', shape: 'box', density: 1, friction: 0.5, restitution: 0 },
            sprite: { type: 'rect', width: 1, height: 1, fill: '#000' },
          },
        ],
      };

      const result = validateGameDefinition(game as any);
      expect(result.errors.some(e => e.code === 'INVALID_BOX_WIDTH')).toBe(true);
      expect(result.errors.some(e => e.code === 'INVALID_BOX_HEIGHT')).toBe(true);
    });

    it('should error on circle physics missing radius', () => {
      const game = {
        metadata: { id: 'test' },
        world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
        entities: [
          {
            id: 'bad-circle',
            transform: { x: 0, y: 0 },
            physics: { bodyType: 'dynamic', shape: 'circle', density: 1, friction: 0.5, restitution: 0 },
            sprite: { type: 'circle', radius: 1, fill: '#000' },
          },
        ],
      };

      const result = validateGameDefinition(game as any);
      expect(result.errors.some(e => e.code === 'INVALID_CIRCLE_RADIUS')).toBe(true);
    });
  });

  describe('behavior validation', () => {
    it('should error on invalid behavior type', () => {
      const game = {
        metadata: { id: 'test' },
        world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
        entities: [
          {
            id: 'e1',
            transform: { x: 0, y: 0 },
            physics: { bodyType: 'static', shape: 'box', width: 1, height: 1, density: 1, friction: 0.5, restitution: 0 },
            sprite: { type: 'rect', width: 1, height: 1, fill: '#000' },
            behaviors: [{ type: 'invalid_behavior_type' }],
          },
        ],
      };

      const result = validateGameDefinition(game as any);
      expect(result.errors.some(e => e.code === 'INVALID_BEHAVIOR_TYPE')).toBe(true);
    });

     it('should error on control behavior type (no longer supported)', () => {
       const game = {
         metadata: { id: 'test' },
         world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
         entities: [
           {
             id: 'e1',
             transform: { x: 0, y: 0 },
             physics: { bodyType: 'static', shape: 'box', width: 1, height: 1, density: 1, friction: 0.5, restitution: 0 },
             sprite: { type: 'rect', width: 1, height: 1, fill: '#000' },
             behaviors: [{ type: 'control', controlType: 'tap_to_jump' }],
           },
         ],
       };

       const result = validateGameDefinition(game as any);
       expect(result.errors.some(e => e.code === 'INVALID_BEHAVIOR_TYPE')).toBe(true);
     });

    it('should error on spawn_on_event missing template', () => {
      const game = {
        metadata: { id: 'test' },
        world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
        entities: [
          {
            id: 'spawner',
            transform: { x: 0, y: 0 },
            physics: { bodyType: 'static', shape: 'box', width: 1, height: 1, density: 1, friction: 0.5, restitution: 0 },
            sprite: { type: 'rect', width: 1, height: 1, fill: '#000' },
            behaviors: [{ type: 'spawn_on_event', event: 'tap' }],
          },
        ],
      };

      const result = validateGameDefinition(game as any);
      expect(result.errors.some(e => e.code === 'MISSING_SPAWN_TEMPLATE')).toBe(true);
    });
  });

  describe('win/lose condition validation', () => {
     it('should error on missing win condition', () => {
       const game = {
         metadata: { id: 'test' },
         world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
         entities: [
           {
             id: 'player',
             transform: { x: 0, y: 0 },
             physics: { bodyType: 'dynamic', shape: 'box', width: 1, height: 1, density: 1, friction: 0.5, restitution: 0 },
             sprite: { type: 'rect', width: 1, height: 1, fill: '#000' },
           },
         ],
         rules: [
           { id: 'r1', trigger: { type: 'tap' }, actions: [] },
         ],
         loseCondition: { type: 'time_up', time: 60 },
       };

       const result = validateGameDefinition(game as any);
       expect(result.errors.some(e => e.code === 'MISSING_WIN_CONDITION')).toBe(true);
     });

     it('should error on missing lose condition', () => {
       const game = {
         metadata: { id: 'test' },
         world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
         entities: [
           {
             id: 'player',
             transform: { x: 0, y: 0 },
             physics: { bodyType: 'dynamic', shape: 'box', width: 1, height: 1, density: 1, friction: 0.5, restitution: 0 },
             sprite: { type: 'rect', width: 1, height: 1, fill: '#000' },
           },
         ],
         rules: [
           { id: 'r1', trigger: { type: 'tap' }, actions: [] },
         ],
         winCondition: { type: 'score', score: 100 },
       };

       const result = validateGameDefinition(game as any);
       expect(result.errors.some(e => e.code === 'MISSING_LOSE_CONDITION')).toBe(true);
     });
  });
});

describe('getValidationSummary', () => {
  it('should return success message for valid game with no warnings', () => {
    const result = { valid: true, errors: [], warnings: [] };
    const summary = getValidationSummary(result);
    expect(summary).toBe('Game definition is valid with no issues.');
  });

  it('should list errors in summary', () => {
    const result = {
      valid: false,
      errors: [
        { code: 'MISSING_ID', message: 'Game must have an ID' },
        { code: 'NO_ENTITIES', message: 'Game must have entities' },
      ],
      warnings: [],
    };
    const summary = getValidationSummary(result);
    expect(summary).toContain('2 error(s)');
    expect(summary).toContain('Game must have an ID');
    expect(summary).toContain('Game must have entities');
  });

  it('should list warnings in summary', () => {
    const result = {
      valid: true,
      errors: [],
      warnings: [{ code: 'MISSING_TITLE', message: 'Game should have a title' }],
    };
    const summary = getValidationSummary(result);
    expect(summary).toContain('1 warning(s)');
    expect(summary).toContain('Game should have a title');
  });

  it('should list both errors and warnings', () => {
    const result = {
      valid: false,
      errors: [{ code: 'MISSING_ID', message: 'Missing ID' }],
      warnings: [{ code: 'MISSING_TITLE', message: 'Missing title' }],
    };
    const summary = getValidationSummary(result);
    expect(summary).toContain('1 error(s)');
    expect(summary).toContain('1 warning(s)');
  });
});
