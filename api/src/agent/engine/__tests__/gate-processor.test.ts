import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GateProcessorInput, StageGateConfigLocal } from '../gate-processor';
import { processGates } from '../gate-processor';

vi.mock('ai', () => ({
  generateObject: vi.fn(),
}));

vi.mock('@/ai/agent/tier-config', () => ({
  resolveTierConfig: vi.fn(() => ({ model: 'test-model', provider: 'test' })),
  createModelForTier: vi.fn(() => ({})),
}));

import { generateObject } from 'ai';

const mockGenerateObject = generateObject as ReturnType<typeof vi.fn>;

describe('GateProcessor', () => {
  const testConfig: StageGateConfigLocal = {
    stage: 'planning',
    gates: [
      {
        id: 'core_game_loop',
        label: 'Core Game Loop',
        description: 'Describe the main gameplay loop',
        required: true,
        ai_extraction_hint: 'Look for main player action',
      },
      {
        id: 'win_lose_conditions',
        label: 'Win/Lose Conditions',
        description: 'Define win/lose conditions',
        required: true,
        ai_extraction_hint: 'Look for win/loss conditions',
      },
      {
        id: 'theme_style',
        label: 'Theme & Style',
        description: 'Describe visual theme',
        required: true,
        ai_extraction_hint: 'Look for visual descriptions',
      },
      {
        id: 'optional_field',
        label: 'Optional Field',
        description: 'An optional field',
        required: false,
        ai_extraction_hint: 'Look for optional info',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processGates', () => {
    it('extracts gate values from a clear prompt', async () => {
      mockGenerateObject.mockResolvedValue({
        object: {
          gateValues: {
            core_game_loop: 'Match 3 candies to clear them',
            win_lose_conditions: 'Win by reaching 1000 points',
            theme_style: 'Candy-themed with bright colors',
          },
          questions: [],
        },
      });

      const input: GateProcessorInput = {
        stageConfig: testConfig,
        userPrompt: 'I want to make a candy crush style game',
        previousAnswers: [],
        currentGateValues: {},
      };

      const result = await processGates(input, { model: {} as any });

      expect(result.gateValues).toEqual({
        core_game_loop: 'Match 3 candies to clear them',
        win_lose_conditions: 'Win by reaching 1000 points',
        theme_style: 'Candy-themed with bright colors',
      });
      expect(result.satisfiedFields).toEqual([
        'core_game_loop',
        'win_lose_conditions',
        'theme_style',
      ]);
      expect(result.unsatisfiedFields).toEqual([]);
      expect(result.questions).toEqual([]);
    });

    it('generates questions for missing fields', async () => {
      mockGenerateObject.mockResolvedValue({
        object: {
          gateValues: {
            core_game_loop: 'Match 3 candies',
          },
          questions: [
            {
              fieldId: 'win_lose_conditions',
              question: 'How does the player win or lose?',
              context: 'Need to know victory conditions',
            },
            {
              fieldId: 'theme_style',
              question: 'What visual style do you want?',
            },
          ],
        },
      });

      const input: GateProcessorInput = {
        stageConfig: testConfig,
        userPrompt: 'I want a matching game',
        previousAnswers: [],
        currentGateValues: {},
      };

      const result = await processGates(input, { model: {} as any });

      expect(result.satisfiedFields).toEqual(['core_game_loop']);
      expect(result.unsatisfiedFields).toEqual(['win_lose_conditions', 'theme_style']);
      expect(result.questions).toHaveLength(2);
      expect(result.questions[0].question).toBe('How does the player win or lose?');
      expect(result.questions[0].context).toBe('Need to know victory conditions');
      expect(result.questions[1].question).toBe('What visual style do you want?');
      expect(result.questions[1].context).toBeUndefined();
    });

    it('merges with existing gate values', async () => {
      mockGenerateObject.mockResolvedValue({
        object: {
          gateValues: {
            win_lose_conditions: 'Win by reaching 1000 points',
            theme_style: 'Bright and colorful',
          },
          questions: [],
        },
      });

      const input: GateProcessorInput = {
        stageConfig: testConfig,
        userPrompt: 'Add win conditions and theme',
        previousAnswers: [],
        currentGateValues: {
          core_game_loop: 'Match 3 candies',
        },
      };

      const result = await processGates(input, { model: {} as any });

      expect(result.gateValues).toEqual({
        core_game_loop: 'Match 3 candies',
        win_lose_conditions: 'Win by reaching 1000 points',
        theme_style: 'Bright and colorful',
      });
      expect(result.satisfiedFields).toEqual([
        'core_game_loop',
        'win_lose_conditions',
        'theme_style',
      ]);
      expect(result.unsatisfiedFields).toEqual([]);
    });

    it('filters questions to unsatisfied required fields only', async () => {
      mockGenerateObject.mockResolvedValue({
        object: {
          gateValues: {
            core_game_loop: 'Match 3 candies',
            win_lose_conditions: 'Win by reaching 1000 points',
          },
          questions: [
            {
              fieldId: 'core_game_loop',
              question: 'Can you clarify the game loop?',
            },
            {
              fieldId: 'theme_style',
              question: 'What visual style do you want?',
            },
            {
              fieldId: 'optional_field',
              question: 'Any optional details?',
            },
          ],
        },
      });

      const input: GateProcessorInput = {
        stageConfig: testConfig,
        userPrompt: 'Make a matching game',
        previousAnswers: [],
        currentGateValues: {},
      };

      const result = await processGates(input, { model: {} as any });

      expect(result.questions).toHaveLength(1);
      expect(result.questions[0].question).toBe('What visual style do you want?');
    });

    it('handles empty prompt gracefully', async () => {
      mockGenerateObject.mockResolvedValue({
        object: {
          gateValues: {},
          questions: [
            {
              fieldId: 'core_game_loop',
              question: 'What is the main gameplay?',
            },
            {
              fieldId: 'win_lose_conditions',
              question: 'How does the player win?',
            },
            {
              fieldId: 'theme_style',
              question: 'What visual style?',
            },
          ],
        },
      });

      const input: GateProcessorInput = {
        stageConfig: testConfig,
        userPrompt: '',
        previousAnswers: [],
        currentGateValues: {},
      };

      const result = await processGates(input, { model: {} as any });

      expect(result.satisfiedFields).toEqual([]);
      expect(result.unsatisfiedFields).toEqual([
        'core_game_loop',
        'win_lose_conditions',
        'theme_style',
      ]);
      expect(result.questions).toHaveLength(3);
    });

    it('includes previous answers in context', async () => {
      mockGenerateObject.mockResolvedValue({
        object: {
          gateValues: {
            core_game_loop: 'Match 3 candies',
            win_lose_conditions: 'Win by reaching 1000 points',
            theme_style: 'Candy-themed',
          },
          questions: [],
        },
      });

      const input: GateProcessorInput = {
        stageConfig: testConfig,
        userPrompt: 'Continue with the game',
        previousAnswers: [
          {
            question: 'What type of game?',
            answer: 'A matching puzzle game',
          },
          {
            question: 'What theme?',
            answer: 'Candy theme',
          },
        ],
        currentGateValues: {},
      };

      await processGates(input, { model: {} as any });

      expect(mockGenerateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('1. Q: What type of game?'),
        })
      );
      expect(mockGenerateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('A: A matching puzzle game'),
        })
      );
      expect(mockGenerateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('2. Q: What theme?'),
        })
      );
      expect(mockGenerateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('A: Candy theme'),
        })
      );
    });

    it('normalizes gate values by trimming whitespace', async () => {
      mockGenerateObject.mockResolvedValue({
        object: {
          gateValues: {
            core_game_loop: '  Match 3 candies  ',
            win_lose_conditions: '\n\nWin by reaching 1000 points\n\n',
            theme_style: '\tCandy-themed\t',
          },
          questions: [],
        },
      });

      const input: GateProcessorInput = {
        stageConfig: testConfig,
        userPrompt: 'Make a candy game',
        previousAnswers: [],
        currentGateValues: {},
      };

      const result = await processGates(input, { model: {} as any });

      expect(result.gateValues.core_game_loop).toBe('Match 3 candies');
      expect(result.gateValues.win_lose_conditions).toBe('Win by reaching 1000 points');
      expect(result.gateValues.theme_style).toBe('Candy-themed');
    });

    it('ignores unknown field IDs from LLM output', async () => {
      mockGenerateObject.mockResolvedValue({
        object: {
          gateValues: {
            core_game_loop: 'Match 3 candies',
            unknown_field: 'This should be ignored',
            another_unknown: 'Also ignored',
          },
          questions: [],
        },
      });

      const input: GateProcessorInput = {
        stageConfig: testConfig,
        userPrompt: 'Make a matching game',
        previousAnswers: [],
        currentGateValues: {},
      };

      const result = await processGates(input, { model: {} as any });

      expect(result.gateValues).toEqual({
        core_game_loop: 'Match 3 candies',
      });
      expect(Object.keys(result.gateValues)).not.toContain('unknown_field');
      expect(Object.keys(result.gateValues)).not.toContain('another_unknown');
    });

    it('treats empty string values as missing', async () => {
      mockGenerateObject.mockResolvedValue({
        object: {
          gateValues: {
            core_game_loop: 'Match 3 candies',
            win_lose_conditions: '',
            theme_style: '   ',
          },
          questions: [
            {
              fieldId: 'win_lose_conditions',
              question: 'How does the player win?',
            },
            {
              fieldId: 'theme_style',
              question: 'What visual style?',
            },
          ],
        },
      });

      const input: GateProcessorInput = {
        stageConfig: testConfig,
        userPrompt: 'Make a game',
        previousAnswers: [],
        currentGateValues: {},
      };

      const result = await processGates(input, { model: {} as any });

      expect(result.satisfiedFields).toEqual(['core_game_loop']);
      expect(result.unsatisfiedFields).toEqual(['win_lose_conditions', 'theme_style']);
      expect(result.gateValues.win_lose_conditions).toBeUndefined();
      expect(result.gateValues.theme_style).toBeUndefined();
    });

    it('preserves existing values when LLM returns empty', async () => {
      mockGenerateObject.mockResolvedValue({
        object: {
          gateValues: {
            win_lose_conditions: 'Win by reaching 1000 points',
          },
          questions: [],
        },
      });

      const input: GateProcessorInput = {
        stageConfig: testConfig,
        userPrompt: 'Add win conditions',
        previousAnswers: [],
        currentGateValues: {
          core_game_loop: 'Match 3 candies',
          theme_style: 'Candy-themed',
        },
      };

      const result = await processGates(input, { model: {} as any });

      expect(result.gateValues).toEqual({
        core_game_loop: 'Match 3 candies',
        win_lose_conditions: 'Win by reaching 1000 points',
        theme_style: 'Candy-themed',
      });
    });

    it('filters out questions with empty text', async () => {
      mockGenerateObject.mockResolvedValue({
        object: {
          gateValues: {},
          questions: [
            {
              fieldId: 'core_game_loop',
              question: 'What is the gameplay?',
            },
            {
              fieldId: 'win_lose_conditions',
              question: '',
            },
            {
              fieldId: 'theme_style',
              question: '   ',
            },
          ],
        },
      });

      const input: GateProcessorInput = {
        stageConfig: testConfig,
        userPrompt: 'Make a game',
        previousAnswers: [],
        currentGateValues: {},
      };

      const result = await processGates(input, { model: {} as any });

      expect(result.questions).toHaveLength(1);
      expect(result.questions[0].question).toBe('What is the gameplay?');
    });

    it('generates unique question IDs', async () => {
      mockGenerateObject.mockResolvedValue({
        object: {
          gateValues: {},
          questions: [
            {
              fieldId: 'core_game_loop',
              question: 'Question 1',
            },
            {
              fieldId: 'win_lose_conditions',
              question: 'Question 2',
            },
          ],
        },
      });

      const input: GateProcessorInput = {
        stageConfig: testConfig,
        userPrompt: 'Make a game',
        previousAnswers: [],
        currentGateValues: {},
      };

      const result = await processGates(input, { model: {} as any });

      expect(result.questions).toHaveLength(2);
      expect(result.questions[0].questionId).toBeTruthy();
      expect(result.questions[1].questionId).toBeTruthy();
      expect(result.questions[0].questionId).not.toBe(result.questions[1].questionId);
    });

    it('passes correct system prompt to generateObject', async () => {
      mockGenerateObject.mockResolvedValue({
        object: {
          gateValues: {},
          questions: [],
        },
      });

      const input: GateProcessorInput = {
        stageConfig: testConfig,
        userPrompt: 'Make a game',
        previousAnswers: [],
        currentGateValues: {},
      };

      await processGates(input, { model: {} as any });

      expect(mockGenerateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          system: 'You are analyzing a game description to extract specific information for building a game.',
        })
      );
    });

    it('includes current gate values in prompt', async () => {
      mockGenerateObject.mockResolvedValue({
        object: {
          gateValues: {},
          questions: [],
        },
      });

      const input: GateProcessorInput = {
        stageConfig: testConfig,
        userPrompt: 'Update the game',
        previousAnswers: [],
        currentGateValues: {
          core_game_loop: 'Match 3 candies',
          theme_style: 'Candy-themed',
        },
      };

      await processGates(input, { model: {} as any });

      expect(mockGenerateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('core_game_loop'),
        })
      );
      expect(mockGenerateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('Match 3 candies'),
        })
      );
    });

    it('handles config with only optional fields', async () => {
      const optionalConfig: StageGateConfigLocal = {
        stage: 'optional_test',
        gates: [
          {
            id: 'optional1',
            label: 'Optional 1',
            description: 'First optional field',
            required: false,
            ai_extraction_hint: 'Look for optional info',
          },
          {
            id: 'optional2',
            label: 'Optional 2',
            description: 'Second optional field',
            required: false,
            ai_extraction_hint: 'Look for more optional info',
          },
        ],
      };

      mockGenerateObject.mockResolvedValue({
        object: {
          gateValues: {},
          questions: [],
        },
      });

      const input: GateProcessorInput = {
        stageConfig: optionalConfig,
        userPrompt: 'Make a game',
        previousAnswers: [],
        currentGateValues: {},
      };

      const result = await processGates(input, { model: {} as any });

      expect(result.satisfiedFields).toEqual([]);
      expect(result.unsatisfiedFields).toEqual([]);
      expect(result.questions).toEqual([]);
    });
  });
});
