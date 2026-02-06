import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getDefaultGatesConfig, loadGatesConfig, validatePlanningDoc } from '../planning-gates';

describe('Planning Gates', () => {
  describe('getDefaultGatesConfig', () => {
    it('returns config with 4 required gates', () => {
      const config = getDefaultGatesConfig();

      expect(config.gates).toHaveLength(4);
      expect(config.gates.every((g) => g.required)).toBe(true);
      expect(config.gates.map((g) => g.id)).toEqual([
        'core_game_loop',
        'win_lose_conditions',
        'theme_style',
        'game_type_category',
      ]);
    });

    it('returns cached config on subsequent calls', () => {
      const config1 = getDefaultGatesConfig();
      const config2 = getDefaultGatesConfig();

      expect(config1).toBe(config2);
    });

    it('parses YAML with comments and empty lines', () => {
      const config = getDefaultGatesConfig();

      expect(config.gates[0]).toEqual({
        id: 'core_game_loop',
        label: 'Core Game Loop',
        description: 'Describe the main gameplay loop - what does the player do repeatedly?',
        required: true,
      });
    });
  });

  describe('validatePlanningDoc', () => {
    const config = getDefaultGatesConfig();

    it('returns valid when all required fields are present', () => {
      const planningDoc = JSON.stringify({
        core_game_loop: 'Match 3 candies to clear them',
        win_lose_conditions: 'Win by reaching 1000 points',
        theme_style: 'Candy-themed with bright colors',
        game_type_category: 'Match-3 puzzle',
      });

      const result = validatePlanningDoc(planningDoc, config);

      expect(result.valid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it('returns invalid when required fields are missing', () => {
      const planningDoc = JSON.stringify({
        core_game_loop: 'Match 3 candies',
        theme_style: 'Candy-themed',
      });

      const result = validatePlanningDoc(planningDoc, config);

      expect(result.valid).toBe(false);
      expect(result.missingFields).toHaveLength(2);
      expect(result.missingFields.map((f) => f.id)).toContain('win_lose_conditions');
      expect(result.missingFields.map((f) => f.id)).toContain('game_type_category');
    });

    it('treats empty strings as missing', () => {
      const planningDoc = JSON.stringify({
        core_game_loop: 'Match 3 candies',
        win_lose_conditions: '',
        theme_style: '   ',
        game_type_category: 'Match-3 puzzle',
      });

      const result = validatePlanningDoc(planningDoc, config);

      expect(result.valid).toBe(false);
      expect(result.missingFields).toHaveLength(2);
      expect(result.missingFields.map((f) => f.id)).toContain('win_lose_conditions');
      expect(result.missingFields.map((f) => f.id)).toContain('theme_style');
    });

    it('returns all required fields as missing when planningDocJson is null', () => {
      const result = validatePlanningDoc(null, config);

      expect(result.valid).toBe(false);
      expect(result.missingFields).toHaveLength(4);
      expect(result.missingFields.map((f) => f.id)).toEqual([
        'core_game_loop',
        'win_lose_conditions',
        'theme_style',
        'game_type_category',
      ]);
    });

    it('returns all required fields as missing when planningDocJson is undefined', () => {
      const result = validatePlanningDoc(undefined, config);

      expect(result.valid).toBe(false);
      expect(result.missingFields).toHaveLength(4);
    });

    it('handles invalid JSON gracefully', () => {
      const result = validatePlanningDoc('not valid json', config);

      expect(result.valid).toBe(false);
      expect(result.missingFields).toHaveLength(4);
    });

    it('handles malformed JSON objects', () => {
      const planningDoc = JSON.stringify({
        core_game_loop: null,
        win_lose_conditions: undefined,
        theme_style: 123,
        game_type_category: {},
      });

      const result = validatePlanningDoc(planningDoc, config);

      expect(result.valid).toBe(false);
      expect(result.missingFields.length).toBeGreaterThan(0);
    });
  });

});
