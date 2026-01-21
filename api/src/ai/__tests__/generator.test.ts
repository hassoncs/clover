import { describe, it, expect } from 'vitest';
import { validateGameDefinition } from '../validator';
import { classifyPrompt } from '../classifier';
import validProjectileGame from '../../__fixtures__/games/valid-projectile-game.json';
import type { GameDefinition } from '../../../../shared/src/types/GameDefinition';

describe('generateGame integration (using fixtures)', () => {
  describe('intent classification + validation pipeline', () => {
    it('should classify projectile game intent correctly', () => {
      const intent = classifyPrompt('A game where I launch balls at stacked blocks');
      
      expect(intent.gameType).toBe('projectile');
      expect(intent.controlType).toBe('drag_to_aim');
      expect(intent.winConditionType).toBe('destroy_all');
    });

    it('should validate a well-formed game definition', () => {
      const validation = validateGameDefinition(validProjectileGame as unknown as GameDefinition);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should have consistent pipeline: classify → generate fixture → validate', () => {
      const prompt = 'A game where I launch balls at stacked blocks';
      const intent = classifyPrompt(prompt);
      
      expect(intent.gameType).toBe('projectile');
      
      const game = validProjectileGame as unknown as GameDefinition;
      expect(game.winCondition?.type).toBe('destroy_all');
      expect(game.entities.some(e => e.behaviors?.some(b => b.type === 'control'))).toBe(true);
      
      const validation = validateGameDefinition(game);
      expect(validation.valid).toBe(true);
    });
  });

  describe('game definition structure', () => {
    const game = validProjectileGame as unknown as GameDefinition;

    it('should have required metadata', () => {
      expect(game.metadata.id).toBeDefined();
      expect(game.metadata.title).toBeDefined();
      expect(game.metadata.version).toBeDefined();
    });

    it('should have valid world config', () => {
      expect(game.world.gravity).toEqual({ x: 0, y: 10 });
      expect(game.world.pixelsPerMeter).toBe(50);
    });

    it('should have player-controlled entity', () => {
      const playerEntity = game.entities.find(e => 
        e.behaviors?.some(b => b.type === 'control')
      );
      expect(playerEntity).toBeDefined();
      expect(playerEntity!.tags).toContain('player');
    });

    it('should have target entities', () => {
      const targets = game.entities.filter(e => e.tags?.includes('target'));
      expect(targets.length).toBeGreaterThan(0);
    });

    it('should have templates for spawnable entities', () => {
      const spawner = game.entities.find(e => 
        e.behaviors?.some(b => b.type === 'spawn_on_event')
      );
      
      if (spawner) {
        const spawnBehavior = spawner.behaviors!.find(b => b.type === 'spawn_on_event') as any;
        expect(game.templates).toBeDefined();
        expect(game.templates![spawnBehavior.entityTemplate]).toBeDefined();
      }
    });

    it('should have win and lose conditions', () => {
      expect(game.winCondition).toBeDefined();
      expect(game.loseCondition).toBeDefined();
    });
  });

  describe('error cases', () => {
    it('should fail validation for game with no entities', () => {
      const invalidGame = {
        metadata: { id: 'test' },
        world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
        entities: [],
      };

      const validation = validateGameDefinition(invalidGame as unknown as GameDefinition);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.code === 'NO_ENTITIES')).toBe(true);
    });

    it('should fail validation for invalid physics', () => {
      const invalidGame = {
        metadata: { id: 'test' },
        world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
        entities: [{
          id: 'bad-entity',
          transform: { x: 0, y: 0 },
          physics: { bodyType: 'invalid', shape: 'invalid', density: -1, friction: 0.5, restitution: 0 },
          sprite: { type: 'rect', width: 1, height: 1, fill: '#000' },
        }],
      };

      const validation = validateGameDefinition(invalidGame as unknown as GameDefinition);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.code === 'INVALID_BODY_TYPE')).toBe(true);
    });
  });
});
