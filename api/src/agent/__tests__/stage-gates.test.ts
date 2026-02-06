import { beforeEach, describe, expect, it } from 'vitest';

import {
  getStageGateConfig,
  parseStageGateConfig,
  validateGateValues,
  type StageGateConfig,
} from '../stage-gates';

describe('Stage Gates', () => {
  describe('parseStageGateConfig', () => {
    it('parses a valid planning stage YAML with ai_extraction_hint', () => {
      const yamlContent = `
stage: planning
gates:
  - id: core_game_loop
    label: Core Game Loop
    description: Describe the main gameplay loop - what does the player do repeatedly?
    required: true
    ai_extraction_hint: Look for descriptions of the main player action, game mechanics, or what happens on each turn/frame
  - id: win_lose_conditions
    label: Win/Lose Conditions
    description: Define how the player wins or loses the game
    required: true
    ai_extraction_hint: Look for win/loss conditions, scoring rules, victory requirements, or failure states
  - id: theme_style
    label: Theme & Style
    description: Describe the visual theme and art style
    required: true
    ai_extraction_hint: Look for visual descriptions, color schemes, art style preferences, or aesthetic references
  - id: game_type_category
    label: Game Type/Category
    description: What type of game is this?
    required: true
    ai_extraction_hint: Look for genre mentions, gameplay style references, or comparisons to existing games
`;

      const config = parseStageGateConfig(yamlContent);

      expect(config.stage).toBe('planning');
      expect(config.gates).toHaveLength(4);
      expect(config.gates[0]).toEqual({
        id: 'core_game_loop',
        label: 'Core Game Loop',
        description: 'Describe the main gameplay loop - what does the player do repeatedly?',
        required: true,
        ai_extraction_hint: 'Look for descriptions of the main player action, game mechanics, or what happens on each turn/frame',
      });
      expect(config.gates.every((g) => g.ai_extraction_hint)).toBe(true);
    });

    it('handles empty YAML gracefully', () => {
      const yamlContent = `
stage: empty
gates:
`;

      const config = parseStageGateConfig(yamlContent);

      expect(config.stage).toBe('empty');
      expect(config.gates).toHaveLength(0);
    });

    it('parses YAML with comments and empty lines', () => {
      const yamlContent = `
# This is a comment
stage: test

# Another comment
gates:
  # Gate comment
  - id: test_gate
    label: Test Gate
    description: A test gate
    required: false
    ai_extraction_hint: Test hint

  # Empty line above
`;

      const config = parseStageGateConfig(yamlContent);

      expect(config.stage).toBe('test');
      expect(config.gates).toHaveLength(1);
      expect(config.gates[0].id).toBe('test_gate');
    });

    it('throws when ai_extraction_hint is missing (zod validation)', () => {
      const yamlContent = `
stage: invalid
gates:
  - id: missing_hint
    label: Missing Hint
    description: This gate has no ai_extraction_hint
    required: true
`;

      expect(() => parseStageGateConfig(yamlContent)).toThrow();
    });

    it('throws when required field is missing', () => {
      const yamlContent = `
stage: invalid
gates:
  - id: incomplete_gate
    label: Incomplete Gate
    # missing description, required, ai_extraction_hint
`;

      expect(() => parseStageGateConfig(yamlContent)).toThrow();
    });

    it('parses gates with optional fields correctly', () => {
      const yamlContent = `
stage: optional_test
gates:
  - id: optional_gate
    label: Optional Gate
    description: This gate is not required
    required: false
    ai_extraction_hint: Look for optional information
`;

      const config = parseStageGateConfig(yamlContent);

      expect(config.gates[0].required).toBe(false);
    });
  });

  describe('getStageGateConfig', () => {
    // Clear cache before each test to ensure isolation
    beforeEach(() => {
      // Access the internal cache via a fresh call with new stage names
      // or rely on test isolation (each test uses unique stage names)
    });

    it('returns cached config on subsequent calls', () => {
      const yamlContent = `
stage: cached_test
gates:
  - id: test_gate
    label: Test Gate
    description: Test description
    required: true
    ai_extraction_hint: Test hint
`;

      const config1 = getStageGateConfig('cached_test', yamlContent);
      const config2 = getStageGateConfig('cached_test');

      expect(config1).toBe(config2); // Same reference
      expect(config1.stage).toBe('cached_test');
    });

    it('throws when no YAML content provided and not cached', () => {
      expect(() => getStageGateConfig('uncached_stage')).toThrow(
        'No YAML content provided for stage: uncached_stage and it is not cached.'
      );
    });

    it('caches different stages independently', () => {
      const yaml1 = `
stage: stage1
gates:
  - id: gate1
    label: Gate 1
    description: First gate
    required: true
    ai_extraction_hint: Hint 1
`;

      const yaml2 = `
stage: stage2
gates:
  - id: gate2
    label: Gate 2
    description: Second gate
    required: true
    ai_extraction_hint: Hint 2
`;

      const config1 = getStageGateConfig('stage1', yaml1);
      const config2 = getStageGateConfig('stage2', yaml2);

      expect(config1.stage).toBe('stage1');
      expect(config2.stage).toBe('stage2');
      expect(config1.gates[0].id).toBe('gate1');
      expect(config2.gates[0].id).toBe('gate2');
    });
  });

  describe('validateGateValues', () => {
    const config: StageGateConfig = {
      stage: 'test',
      gates: [
        {
          id: 'required1',
          label: 'Required 1',
          description: 'First required field',
          required: true,
          ai_extraction_hint: 'Hint 1',
        },
        {
          id: 'required2',
          label: 'Required 2',
          description: 'Second required field',
          required: true,
          ai_extraction_hint: 'Hint 2',
        },
        {
          id: 'optional1',
          label: 'Optional 1',
          description: 'First optional field',
          required: false,
          ai_extraction_hint: 'Hint 3',
        },
        {
          id: 'required3',
          label: 'Required 3',
          description: 'Third required field',
          required: true,
          ai_extraction_hint: 'Hint 4',
        },
      ],
    };

    it('returns valid when all required fields are present', () => {
      const values = {
        required1: 'Value 1',
        required2: 'Value 2',
        required3: 'Value 3',
      };

      const result = validateGateValues(values, config);

      expect(result.valid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it('returns invalid when required fields are missing', () => {
      const values = {
        required1: 'Value 1',
        // required2 missing
        // required3 missing
      };

      const result = validateGateValues(values, config);

      expect(result.valid).toBe(false);
      expect(result.missingFields).toHaveLength(2);
      expect(result.missingFields.map((f) => f.id)).toContain('required2');
      expect(result.missingFields.map((f) => f.id)).toContain('required3');
      expect(result.missingFields.map((f) => f.label)).toContain('Required 2');
      expect(result.missingFields.map((f) => f.label)).toContain('Required 3');
    });

    it('treats empty strings as missing', () => {
      const values = {
        required1: 'Value 1',
        required2: '',
        required3: '   ',
      };

      const result = validateGateValues(values, config);

      expect(result.valid).toBe(false);
      expect(result.missingFields).toHaveLength(2);
      expect(result.missingFields.map((f) => f.id)).toContain('required2');
      expect(result.missingFields.map((f) => f.id)).toContain('required3');
    });

    it('treats null and undefined as missing', () => {
      const values = {
        required1: 'Value 1',
        required2: null,
        required3: undefined,
      };

      const result = validateGateValues(values, config);

      expect(result.valid).toBe(false);
      expect(result.missingFields).toHaveLength(2);
      expect(result.missingFields.map((f) => f.id)).toContain('required2');
      expect(result.missingFields.map((f) => f.id)).toContain('required3');
    });

    it('ignores non-required fields', () => {
      const values = {
        required1: 'Value 1',
        required2: 'Value 2',
        required3: 'Value 3',
        // optional1 missing - should not affect validation
      };

      const result = validateGateValues(values, config);

      expect(result.valid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it('validates correctly when optional fields are present', () => {
      const values = {
        required1: 'Value 1',
        required2: 'Value 2',
        required3: 'Value 3',
        optional1: 'Optional value',
      };

      const result = validateGateValues(values, config);

      expect(result.valid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it('returns all required fields as missing when values is empty', () => {
      const values = {};

      const result = validateGateValues(values, config);

      expect(result.valid).toBe(false);
      expect(result.missingFields).toHaveLength(3);
      expect(result.missingFields.map((f) => f.id)).toEqual([
        'required1',
        'required2',
        'required3',
      ]);
    });

    it('handles config with no required fields', () => {
      const allOptionalConfig: StageGateConfig = {
        stage: 'optional_test',
        gates: [
          {
            id: 'opt1',
            label: 'Optional 1',
            description: 'Optional field',
            required: false,
            ai_extraction_hint: 'Hint',
          },
        ],
      };

      const result = validateGateValues({}, allOptionalConfig);

      expect(result.valid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });
  });
});
