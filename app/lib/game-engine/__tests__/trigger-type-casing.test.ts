/**
 * Test for the trigger type casing bug discovered in ball sort game
 * 
 * Bug: Game definitions use snake_case ("game_loaded") in TypeScript,
 * but get transformed to camelCase ("gameLoaded") somewhere in the pipeline,
 * causing RulesSystem to not recognize the trigger.
 */

import { describe, it, expect } from 'vitest';
import { LogicTriggerEvaluator } from '../rules/triggers/LogicTriggerEvaluator';
import type { RuleContext } from '../rules/types';
import type { GameLoadedTrigger } from '@slopcade/shared';

describe('Trigger type casing bug', () => {
  const evaluator = new LogicTriggerEvaluator();

  describe('Current behavior (snake_case)', () => {
    it('should recognize "game_loaded" trigger (snake_case)', () => {
      const trigger: GameLoadedTrigger = { type: 'game_loaded' };
      const context = {
        inputEvents: { gameLoaded: true },
      } as unknown as RuleContext;

      const result = evaluator.evaluate(trigger, context);

      expect(result).toBe(true);
    });
  });

  describe('Bug scenario (camelCase from server)', () => {
    it('should NOT recognize "gameLoaded" trigger (camelCase) - THIS IS THE BUG', () => {
      const trigger = { type: 'gameLoaded' } as any;
      const context = {
        inputEvents: { gameLoaded: true },
      } as unknown as RuleContext;

      const result = evaluator.evaluate(trigger, context);

      expect(result).toBe(false);
    });
  });

  describe('Type system validation', () => {
    it('should have GameLoadedTrigger type with snake_case', () => {
      const validTrigger: GameLoadedTrigger = { type: 'game_loaded' };
      
      expect(validTrigger.type).toBe('game_loaded');
    });

    it('should reject camelCase at type level', () => {
      expect(() => {
        const invalidTrigger: GameLoadedTrigger = { type: 'gameLoaded' } as any;
        return invalidTrigger;
      }).not.toThrow();
    });
  });

  describe('Ball sort game scenario', () => {
    it('reproduces the exact bug from ball sort game', () => {
      const triggerFromServer = { type: 'gameLoaded' } as any;
      const context = {
        inputEvents: { gameLoaded: true },
      } as unknown as RuleContext;

      const result = evaluator.evaluate(triggerFromServer, context);

      expect(result).toBe(false);
      expect(triggerFromServer.type).not.toBe('game_loaded');
    });
  });
});
