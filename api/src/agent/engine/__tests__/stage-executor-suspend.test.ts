import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('ai', () => ({
  generateText: vi.fn(),
  stepCountIs: vi.fn(() => () => false),
  tool: vi.fn((config: unknown) => config),
}));

import { generateText } from 'ai';

import { StageExecutor } from '../stage-executor';
import type { StageExecutionContext } from '../tools';

const mockGenerateText = vi.mocked(generateText);

function createTestContext(overrides: Partial<StageExecutionContext> = {}): StageExecutionContext {
  return {
    runId: 'test-run-id',
    stepId: 'test-step-id',
    stepIndex: 1,
    stage: 'planning',
    planningDoc: 'A solid planning document with content.',
    gameDefinition: null,
    templates: [],
    existingGames: [],
    previousOutputs: {},
    ...overrides,
  };
}

function createAskUserResult(toolCallId: string, questions: unknown) {
  return {
    steps: [
      {
        toolCalls: [
          {
            toolCallId,
            toolName: 'askUser',
            args: questions,
          },
        ],
        toolResults: [],
      },
    ],
    response: {
      messages: [
        { role: 'assistant', content: 'I need to ask the user some questions.' },
      ],
    },
    usage: {
      promptTokens: 100,
      completionTokens: 50,
    },
    text: '',
  };
}

function createNormalResult() {
  return {
    steps: [
      {
        toolCalls: [
          {
            toolCallId: 'tc-normal-1',
            toolName: 'updatePlanningDoc',
            args: { mode: 'replace', content: 'Updated plan' },
          },
        ],
        toolResults: [
          { toolCallId: 'tc-normal-1', result: { ok: true } },
        ],
      },
    ],
    response: {
      messages: [
        { role: 'assistant', content: 'Done updating the plan.' },
      ],
    },
    usage: {
      promptTokens: 80,
      completionTokens: 40,
    },
    text: 'Done updating the plan.',
  };
}

const mockModel = {} as Parameters<typeof StageExecutor.prototype.executeStage extends (
  ...args: infer _P
) => unknown
  ? never
  : never>;

function createExecutor() {
  return new StageExecutor(
    {} as any,
    'test-provider',
    'test-model',
    { costPer1kTokensMicros: 1000 },
  );
}

describe('StageExecutor suspend/resume', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('executeStage suspension', () => {
    it('returns suspended when askUser tool is called', async () => {
      const questions = {
        questions: [
          {
            question: 'What theme do you want?',
            header: 'Theme',
            options: [
              { label: 'Space', description: 'Sci-fi space theme' },
              { label: 'Fantasy', description: 'Medieval fantasy' },
            ],
          },
        ],
      };

      mockGenerateText.mockResolvedValue(
        createAskUserResult('tc-ask-1', questions) as any,
      );

      const executor = createExecutor();
      const context = createTestContext();
      const result = await executor.executeStage('planning', context);

      expect(result.status).toBe('suspended');
      expect(result.stage).toBe('planning');
      expect(result.attempts).toBe(1);
      expect(result.suspendedConversation).toBeDefined();
      expect(result.suspendedConversation!.pendingToolCallId).toBe('tc-ask-1');
      expect(result.suspendedConversation!.pendingToolName).toBe('askUser');
      expect(result.suspendedConversation!.messagesJson).toBeTruthy();
      expect(result.suspendedConversation!.pendingQuestionsJson).toBeTruthy();

      const parsedQuestions = JSON.parse(result.suspendedConversation!.pendingQuestionsJson);
      expect(parsedQuestions.questions[0].question).toBe('What theme do you want?');
    });

    it('includes usage and cost in suspended result', async () => {
      mockGenerateText.mockResolvedValue(
        createAskUserResult('tc-ask-2', { questions: [] }) as any,
      );

      const executor = createExecutor();
      const result = await executor.executeStage('planning', createTestContext());

      expect(result.usage.promptTokens).toBe(100);
      expect(result.usage.completionTokens).toBe(50);
      expect(result.costMicros).toBeGreaterThan(0);
    });

    it('sets validation to invalid with suspension message', async () => {
      mockGenerateText.mockResolvedValue(
        createAskUserResult('tc-ask-3', { questions: [] }) as any,
      );

      const executor = createExecutor();
      const result = await executor.executeStage('planning', createTestContext());

      expect(result.validation.valid).toBe(false);
      expect(result.validation.errors).toContain('Suspended for user input');
    });

    it('serializes conversation messages as JSON', async () => {
      const messages = [
        { role: 'assistant', content: 'I need to ask the user some questions.' },
      ];
      mockGenerateText.mockResolvedValue(
        createAskUserResult('tc-ask-4', { questions: [] }) as any,
      );

      const executor = createExecutor();
      const result = await executor.executeStage('planning', createTestContext());

      const parsedMessages = JSON.parse(result.suspendedConversation!.messagesJson);
      expect(parsedMessages).toEqual(messages);
    });
  });

  describe('executeStage without askUser', () => {
    it('returns succeeded for normal stages when validation passes', async () => {
      mockGenerateText.mockResolvedValue(createNormalResult() as any);

      const executor = createExecutor();
      const context = createTestContext({ planningDoc: 'Non-empty planning doc' });
      const result = await executor.executeStage('planning', context);

      expect(result.status).toBe('succeeded');
      expect(result.stage).toBe('planning');
      expect(result.validation.valid).toBe(true);
      expect(result.suspendedConversation).toBeUndefined();
    });

    it('returns failed when validation fails', async () => {
      mockGenerateText.mockResolvedValue(createNormalResult() as any);

      const executor = createExecutor();
      const context = createTestContext({ planningDoc: '' });
      const result = await executor.executeStage('planning', context);

      expect(result.status).toBe('failed');
      expect(result.validation.valid).toBe(false);
      expect(result.suspendedConversation).toBeUndefined();
    });

    it('detects askUser only on the last step', async () => {
      const multiStepResult = {
        steps: [
          {
            toolCalls: [
              {
                toolCallId: 'tc-ask-early',
                toolName: 'askUser',
                args: { questions: [] },
              },
            ],
            toolResults: [],
          },
          {
            toolCalls: [
              {
                toolCallId: 'tc-normal-last',
                toolName: 'updatePlanningDoc',
                args: { mode: 'replace', content: 'Updated' },
              },
            ],
            toolResults: [
              { toolCallId: 'tc-normal-last', result: { ok: true } },
            ],
          },
        ],
        response: {
          messages: [
            { role: 'assistant', content: 'Finished.' },
          ],
        },
        usage: { promptTokens: 100, completionTokens: 50 },
        text: 'Finished.',
      };

      mockGenerateText.mockResolvedValue(multiStepResult as any);

      const executor = createExecutor();
      const context = createTestContext({ planningDoc: 'Non-empty' });
      const result = await executor.executeStage('planning', context);

      expect(result.status).toBe('succeeded');
      expect(result.suspendedConversation).toBeUndefined();
    });
  });

  describe('resumeStage', () => {
    it('reconstructs conversation and continues', async () => {
      mockGenerateText.mockResolvedValue(createNormalResult() as any);

      const executor = createExecutor();
      const context = createTestContext({ planningDoc: 'Non-empty planning doc' });
      const checkpoint = {
        messagesJson: JSON.stringify([
          { role: 'assistant', content: 'I need to ask the user some questions.' },
        ]),
        pendingToolCallId: 'tc-ask-resume-1',
        answerText: 'Space theme',
      };

      const result = await executor.resumeStage('planning', context, checkpoint);

      expect(result.status).toBe('succeeded');
      expect(result.stage).toBe('planning');
      expect(result.attempts).toBe(1);

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            { role: 'assistant', content: 'I need to ask the user some questions.' },
            expect.objectContaining({
              role: 'tool',
              content: expect.arrayContaining([
                expect.objectContaining({
                  type: 'tool-result',
                  toolCallId: 'tc-ask-resume-1',
                  toolName: 'askUser',
                  output: {
                    type: 'text',
                    value: 'Space theme',
                  },
                }),
              ]),
            }),
          ]),
        }),
      );

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.not.objectContaining({ prompt: expect.anything() }),
      );
    });

    it('uses messages instead of prompt when resuming', async () => {
      mockGenerateText.mockResolvedValue(createNormalResult() as any);

      const executor = createExecutor();
      const context = createTestContext({ planningDoc: 'Non-empty' });
      const checkpoint = {
        messagesJson: JSON.stringify([
          { role: 'assistant', content: 'Question time.' },
        ]),
        pendingToolCallId: 'tc-ask-resume-2',
        answerText: 'Yes',
      };

      await executor.resumeStage('planning', context, checkpoint);

      const callArgs = mockGenerateText.mock.calls[0][0] as Record<string, unknown>;
      expect(callArgs.messages).toBeDefined();
      expect(callArgs).not.toHaveProperty('prompt');
    });

    it('includes answer text in tool result', async () => {
      mockGenerateText.mockResolvedValue(createNormalResult() as any);

      const executor = createExecutor();
      const context = createTestContext({ planningDoc: 'Non-empty' });
      const checkpoint = {
        messagesJson: JSON.stringify([
          { role: 'assistant', content: 'Asking.' },
        ]),
        pendingToolCallId: 'tc-ask-resume-3',
        answerText: 'Fantasy theme with dragons',
      };

      await executor.resumeStage('planning', context, checkpoint);

      const callArgs = mockGenerateText.mock.calls[0][0] as Record<string, unknown>;
      const messages = callArgs.messages as Array<Record<string, unknown>>;
      const toolMessage = messages.find(m => m.role === 'tool') as Record<string, unknown>;
      expect(toolMessage).toBeDefined();

      const content = toolMessage.content as Array<Record<string, unknown>>;
      expect(content[0].output).toEqual({
        type: 'text',
        value: 'Fantasy theme with dragons',
      });
    });

    it('fails when messagesJson is not a valid array', async () => {
      const executor = createExecutor();
      const context = createTestContext();
      const checkpoint = {
        messagesJson: '"not an array"',
        pendingToolCallId: 'tc-bad',
        answerText: 'Answer',
      };

      const result = await executor.resumeStage('planning', context, checkpoint);

      expect(result.status).toBe('failed');
      expect(result.failureReason).toBe('STAGE_GENERATION_ERROR');
      expect(result.validation.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('messages must be an array'),
        ]),
      );
    });

    it('fails when messagesJson is invalid JSON', async () => {
      const executor = createExecutor();
      const context = createTestContext();
      const checkpoint = {
        messagesJson: 'not json at all',
        pendingToolCallId: 'tc-bad',
        answerText: 'Answer',
      };

      const result = await executor.resumeStage('planning', context, checkpoint);

      expect(result.status).toBe('failed');
      expect(result.failureReason).toBe('STAGE_GENERATION_ERROR');
    });
  });

  describe('recursive suspension (resume then suspend again)', () => {
    it('resumeStage can suspend again when askUser is called', async () => {
      const secondQuestions = {
        questions: [
          {
            question: 'Which difficulty level?',
            header: 'Difficulty',
            options: [
              { label: 'Easy', description: 'Relaxed gameplay' },
              { label: 'Hard', description: 'Challenging gameplay' },
            ],
          },
        ],
      };

      mockGenerateText.mockResolvedValue(
        createAskUserResult('tc-ask-recursive', secondQuestions) as any,
      );

      const executor = createExecutor();
      const context = createTestContext();
      const checkpoint = {
        messagesJson: JSON.stringify([
          { role: 'assistant', content: 'First question answered.' },
        ]),
        pendingToolCallId: 'tc-ask-first',
        answerText: 'Space theme',
      };

      const result = await executor.resumeStage('planning', context, checkpoint);

      expect(result.status).toBe('suspended');
      expect(result.suspendedConversation).toBeDefined();
      expect(result.suspendedConversation!.pendingToolCallId).toBe('tc-ask-recursive');
      expect(result.suspendedConversation!.pendingToolName).toBe('askUser');

      const parsedQuestions = JSON.parse(result.suspendedConversation!.pendingQuestionsJson);
      expect(parsedQuestions.questions[0].question).toBe('Which difficulty level?');
    });

    it('preserves new conversation messages on recursive suspension', async () => {
      const newMessages = [
        { role: 'assistant', content: 'First answer processed, asking again.' },
        { role: 'assistant', content: 'I have another question.' },
      ];

      mockGenerateText.mockResolvedValue({
        steps: [
          {
            toolCalls: [
              {
                toolCallId: 'tc-ask-recursive-2',
                toolName: 'askUser',
                args: { questions: [] },
              },
            ],
            toolResults: [],
          },
        ],
        response: {
          messages: newMessages,
        },
        usage: { promptTokens: 200, completionTokens: 100 },
        text: '',
      } as any);

      const executor = createExecutor();
      const context = createTestContext();
      const checkpoint = {
        messagesJson: JSON.stringify([
          { role: 'assistant', content: 'Original message.' },
        ]),
        pendingToolCallId: 'tc-ask-orig',
        answerText: 'First answer',
      };

      const result = await executor.resumeStage('planning', context, checkpoint);

      expect(result.status).toBe('suspended');
      const parsedMessages = JSON.parse(result.suspendedConversation!.messagesJson);
      expect(parsedMessages).toEqual(newMessages);
    });
  });

  describe('answer formatting / checkpoint data structure', () => {
    it('pendingQuestionsJson captures args when present', async () => {
      const questions = {
        questions: [
          {
            question: 'Pick a color',
            header: 'Color',
            options: [
              { label: 'Red', description: 'Warm' },
              { label: 'Blue', description: 'Cool' },
            ],
          },
        ],
      };

      mockGenerateText.mockResolvedValue(
        createAskUserResult('tc-args', questions) as any,
      );

      const executor = createExecutor();
      const result = await executor.executeStage('planning', createTestContext());

      const parsed = JSON.parse(result.suspendedConversation!.pendingQuestionsJson);
      expect(parsed).toEqual(questions);
    });

    it('pendingQuestionsJson falls back to input when args is undefined', async () => {
      const inputData = { questions: [{ question: 'Via input', header: 'Q', options: [] }] };

      mockGenerateText.mockResolvedValue({
        steps: [
          {
            toolCalls: [
              {
                toolCallId: 'tc-input',
                toolName: 'askUser',
                input: inputData,
              },
            ],
            toolResults: [],
          },
        ],
        response: {
          messages: [{ role: 'assistant', content: 'Asking via input.' }],
        },
        usage: { promptTokens: 50, completionTokens: 25 },
        text: '',
      } as any);

      const executor = createExecutor();
      const result = await executor.executeStage('planning', createTestContext());

      expect(result.status).toBe('suspended');
      const parsed = JSON.parse(result.suspendedConversation!.pendingQuestionsJson);
      expect(parsed).toEqual(inputData);
    });

    it('pendingQuestionsJson is null when both args and input are undefined', async () => {
      mockGenerateText.mockResolvedValue({
        steps: [
          {
            toolCalls: [
              {
                toolCallId: 'tc-no-args',
                toolName: 'askUser',
              },
            ],
            toolResults: [],
          },
        ],
        response: {
          messages: [{ role: 'assistant', content: 'Asking.' }],
        },
        usage: { promptTokens: 50, completionTokens: 25 },
        text: '',
      } as any);

      const executor = createExecutor();
      const result = await executor.executeStage('planning', createTestContext());

      expect(result.status).toBe('suspended');
      expect(result.suspendedConversation!.pendingQuestionsJson).toBe('null');
    });

    it('messagesJson is parseable back to the original messages array', async () => {
      const originalMessages = [
        { role: 'assistant', content: 'Let me ask you something.' },
        {
          role: 'assistant',
          content: [
            { type: 'tool-use', toolCallId: 'tc-round', toolName: 'askUser' },
          ],
        },
      ];

      mockGenerateText.mockResolvedValue({
        steps: [
          {
            toolCalls: [
              {
                toolCallId: 'tc-round',
                toolName: 'askUser',
                args: { questions: [] },
              },
            ],
            toolResults: [],
          },
        ],
        response: {
          messages: originalMessages,
        },
        usage: { promptTokens: 50, completionTokens: 25 },
        text: '',
      } as any);

      const executor = createExecutor();
      const result = await executor.executeStage('planning', createTestContext());

      const parsed = JSON.parse(result.suspendedConversation!.messagesJson);
      expect(parsed).toEqual(originalMessages);
    });
  });

  describe('provider and model metadata', () => {
    it('includes provider and model in suspended result', async () => {
      mockGenerateText.mockResolvedValue(
        createAskUserResult('tc-meta', { questions: [] }) as any,
      );

      const executor = createExecutor();
      const result = await executor.executeStage('planning', createTestContext());

      expect(result.provider).toBe('test-provider');
      expect(result.model).toBe('test-model');
    });

    it('includes provider and model in resumed result', async () => {
      mockGenerateText.mockResolvedValue(createNormalResult() as any);

      const executor = createExecutor();
      const result = await executor.resumeStage('planning', createTestContext({ planningDoc: 'Non-empty' }), {
        messagesJson: JSON.stringify([{ role: 'assistant', content: 'Hi' }]),
        pendingToolCallId: 'tc-meta-resume',
        answerText: 'Answer',
      });

      expect(result.provider).toBe('test-provider');
      expect(result.model).toBe('test-model');
    });
  });
});
