import { describe, it, expect, beforeEach } from 'vitest';
import { GameSystemRegistry } from '../GameSystemRegistry';
import { SystemPhase } from '../types';

describe('GameSystemRegistry', () => {
  let registry: GameSystemRegistry;

  beforeEach(() => {
    registry = new GameSystemRegistry();
  });

  describe('getSystemsByPhase', () => {
    it('should return empty arrays for all phases when no systems registered', () => {
      const byPhase = registry.getSystemsByPhase();
      
      expect(byPhase.get(SystemPhase.PRE_UPDATE)).toEqual([]);
      expect(byPhase.get(SystemPhase.GAME_LOGIC)).toEqual([]);
      expect(byPhase.get(SystemPhase.PHYSICS)).toEqual([]);
      expect(byPhase.get(SystemPhase.POST_PHYSICS)).toEqual([]);
      expect(byPhase.get(SystemPhase.VISUAL)).toEqual([]);
      expect(byPhase.get(SystemPhase.CLEANUP)).toEqual([]);
    });

    it('should default to GAME_LOGIC phase when not specified', () => {
      registry.register({
        id: 'test-system',
        version: { major: 1, minor: 0, patch: 0 },
      });

      const byPhase = registry.getSystemsByPhase();
      expect(byPhase.get(SystemPhase.GAME_LOGIC)).toHaveLength(1);
      expect(byPhase.get(SystemPhase.GAME_LOGIC)![0].id).toBe('test-system');
    });

    it('should group systems by their execution phase', () => {
      registry.register({
        id: 'pre-update-system',
        version: { major: 1, minor: 0, patch: 0 },
        executionPhase: SystemPhase.PRE_UPDATE,
      });
      registry.register({
        id: 'visual-system',
        version: { major: 1, minor: 0, patch: 0 },
        executionPhase: SystemPhase.VISUAL,
      });

      const byPhase = registry.getSystemsByPhase();
      expect(byPhase.get(SystemPhase.PRE_UPDATE)).toHaveLength(1);
      expect(byPhase.get(SystemPhase.VISUAL)).toHaveLength(1);
      expect(byPhase.get(SystemPhase.GAME_LOGIC)).toHaveLength(0);
    });

    it('should sort systems by priority within phase (higher first)', () => {
      registry.register({
        id: 'low-priority',
        version: { major: 1, minor: 0, patch: 0 },
        executionPhase: SystemPhase.GAME_LOGIC,
        priority: 1,
      });
      registry.register({
        id: 'high-priority',
        version: { major: 1, minor: 0, patch: 0 },
        executionPhase: SystemPhase.GAME_LOGIC,
        priority: 10,
      });
      registry.register({
        id: 'default-priority',
        version: { major: 1, minor: 0, patch: 0 },
        executionPhase: SystemPhase.GAME_LOGIC,
      });

      const byPhase = registry.getSystemsByPhase();
      const gameLogicSystems = byPhase.get(SystemPhase.GAME_LOGIC)!;
      
      expect(gameLogicSystems[0].id).toBe('high-priority');
      expect(gameLogicSystems[1].id).toBe('low-priority');
      expect(gameLogicSystems[2].id).toBe('default-priority');
    });
  });

  describe('getSystemsInExecutionOrder', () => {
    it('should return systems in phase order, then priority order', () => {
      registry.register({
        id: 'visual-system',
        version: { major: 1, minor: 0, patch: 0 },
        executionPhase: SystemPhase.VISUAL,
      });
      registry.register({
        id: 'pre-update-system',
        version: { major: 1, minor: 0, patch: 0 },
        executionPhase: SystemPhase.PRE_UPDATE,
      });
      registry.register({
        id: 'game-logic-high',
        version: { major: 1, minor: 0, patch: 0 },
        executionPhase: SystemPhase.GAME_LOGIC,
        priority: 10,
      });
      registry.register({
        id: 'game-logic-low',
        version: { major: 1, minor: 0, patch: 0 },
        executionPhase: SystemPhase.GAME_LOGIC,
        priority: 1,
      });

      const ordered = registry.getSystemsInExecutionOrder();
      
      expect(ordered.map(s => s.id)).toEqual([
        'pre-update-system',
        'game-logic-high',
        'game-logic-low',
        'visual-system',
      ]);
    });

    it('should return empty array when no systems registered', () => {
      expect(registry.getSystemsInExecutionOrder()).toEqual([]);
    });
  });

  describe('validateSystemCompatibility', () => {
    it('should return valid for compatible systems', () => {
      const systems = [
        {
          id: 'physics',
          version: { major: 1, minor: 0, patch: 0 },
          provides: { capabilities: ['physics.2d'] },
        },
        {
          id: 'match3',
          version: { major: 1, minor: 0, patch: 0 },
          requires: { capabilities: ['physics.2d'] },
        },
      ];

      const result = registry.validateSystemCompatibility(systems);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect mutual conflicts between systems', () => {
      const systems = [
        {
          id: 'system-a',
          version: { major: 1, minor: 0, patch: 0 },
          conflicts: ['system-b'],
        },
        {
          id: 'system-b',
          version: { major: 1, minor: 0, patch: 0 },
        },
      ];

      const result = registry.validateSystemCompatibility(systems);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Conflict: system-a conflicts with system-b');
    });

    it('should detect missing required capabilities', () => {
      const systems = [
        {
          id: 'match3',
          version: { major: 1, minor: 0, patch: 0 },
          requires: { capabilities: ['physics.2d', 'entity.manager'] },
        },
      ];

      const result = registry.validateSystemCompatibility(systems);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing capability: match3 requires 'physics.2d'");
      expect(result.errors).toContain("Missing capability: match3 requires 'entity.manager'");
    });

    it('should handle systems with no provides/requires/conflicts', () => {
      const systems = [
        {
          id: 'simple-system',
          version: { major: 1, minor: 0, patch: 0 },
        },
      ];

      const result = registry.validateSystemCompatibility(systems);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect bidirectional conflicts', () => {
      const systems = [
        {
          id: 'system-a',
          version: { major: 1, minor: 0, patch: 0 },
          conflicts: ['system-b'],
        },
        {
          id: 'system-b',
          version: { major: 1, minor: 0, patch: 0 },
          conflicts: ['system-a'],
        },
      ];

      const result = registry.validateSystemCompatibility(systems);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContain('Conflict: system-a conflicts with system-b');
      expect(result.errors).toContain('Conflict: system-b conflicts with system-a');
    });

    it('should allow conflicts with systems not in the list', () => {
      const systems = [
        {
          id: 'system-a',
          version: { major: 1, minor: 0, patch: 0 },
          conflicts: ['system-not-present'],
        },
      ];

      const result = registry.validateSystemCompatibility(systems);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect Match3 and Tetris mutual conflicts', () => {
      const systems = [
        {
          id: 'match3',
          version: { major: 1, minor: 0, patch: 0 },
          provides: { capabilities: ['grid.match3'] },
          conflicts: ['tetris'],
        },
        {
          id: 'tetris',
          version: { major: 1, minor: 0, patch: 0 },
          provides: { capabilities: ['grid.tetris'] },
          conflicts: ['match3'],
        },
      ];

      const result = registry.validateSystemCompatibility(systems);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContain('Conflict: match3 conflicts with tetris');
      expect(result.errors).toContain('Conflict: tetris conflicts with match3');
    });
  });
});
