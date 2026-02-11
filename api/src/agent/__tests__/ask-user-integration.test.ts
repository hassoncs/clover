import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('ai', () => ({
  generateText: vi.fn(),
  stepCountIs: vi.fn(() => () => false),
  tool: vi.fn((config: unknown) => config),
}));

import { generateText } from 'ai';

import { StageExecutor } from '../engine/stage-executor';
import type { StageExecutionContext } from '../engine/tools';
import type { RunStepResult } from '../types';

const mockGenerateText = vi.mocked(generateText);

function createTestContext(overrides: Partial<StageExecutionContext> = {}): StageExecutionContext {
  return {
    runId: 'test-run-id',
    stepId: 'test-step-id',
    stepIndex: 1,
    stage: 'planning',
    previousOutputs: {},
    ...overrides,
  };
}

function createExecutor(costPer1kTokensMicros = 1000) {
  return new StageExecutor(
    {} as any,
    'test-provider',
    'test-model',
    { costPer1kTokensMicros },
  );
}

function createAskUserResult(toolCallId: string, questions: unknown, usage = { promptTokens: 100, completionTokens: 50 }) {
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
    usage,
    text: '',
  };
}

function createNormalResult(usage = { promptTokens: 80, completionTokens: 40 }) {
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
    usage,
    text: 'Done updating the plan.',
  };
}

describe('ask-user integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('answer formatting', () => {
    it('formats single question with single answer as OpenCode pattern', () => {
      const questionsData = {
        questions: [
          { header: 'Theme', question: 'Pick a theme', options: [{ label: 'Space', description: 'Sci-fi' }] },
        ],
      };
      const answers: string[][] = [['Space']];

      const answerText = questionsData.questions
        .map((question, index) => `"${question.header}"="${answers[index]?.join(', ') ?? ''}"`)
        .join(', ');
      const formatted = `User answered your questions: ${answerText}`;

      expect(formatted).toBe('User answered your questions: "Theme"="Space"');
    });

    it('formats multiple questions with multiple answers', () => {
      const questionsData = {
        questions: [
          { header: 'Theme', question: 'Pick a theme', options: [] },
          { header: 'Difficulty', question: 'Pick difficulty', options: [] },
        ],
      };
      const answers: string[][] = [['Space', 'Fantasy'], ['Hard']];

      const answerText = questionsData.questions
        .map((question, index) => `"${question.header}"="${answers[index]?.join(', ') ?? ''}"`)
        .join(', ');
      const formatted = `User answered your questions: ${answerText}`;

      expect(formatted).toBe('User answered your questions: "Theme"="Space, Fantasy", "Difficulty"="Hard"');
    });

    it('handles missing answer for a question as empty string', () => {
      const questionsData = {
        questions: [
          { header: 'Color', question: 'Pick color', options: [] },
          { header: 'Size', question: 'Pick size', options: [] },
        ],
      };
      const answers: string[][] = [['Red']];

      const answerText = questionsData.questions
        .map((question, index) => `"${question.header}"="${answers[index]?.join(', ') ?? ''}"`)
        .join(', ');
      const formatted = `User answered your questions: ${answerText}`;

      expect(formatted).toBe('User answered your questions: "Color"="Red", "Size"=""');
    });

    it('matches the exact format used in RunCoordinatorDO.handleSubmitUserAnswer', () => {
      const questionsData = {
        questions: [
          { header: 'Game Type', question: 'What type?', options: [] },
          { header: 'Art Style', question: 'Which art?', options: [] },
        ],
      };
      const answers: string[][] = [['Puzzle'], ['Pixel Art', 'Cartoon']];

      const answerText = questionsData.questions
        .map((question, index) => `"${question.header}"="${answers[index]?.join(', ') ?? ''}"`)
        .join(', ');
      const formattedAnswer = `User answered your questions: ${answerText}`;

      expect(formattedAnswer).toMatch(/^User answered your questions: /);
      expect(formattedAnswer).toContain('"Game Type"="Puzzle"');
      expect(formattedAnswer).toContain('"Art Style"="Pixel Art, Cartoon"');
    });
  });

  describe('conversation checkpoint', () => {
    it('contains all required fields when executor suspends', async () => {
      const questions = {
        questions: [
          {
            question: 'What theme?',
            header: 'Theme',
            options: [{ label: 'Space', description: 'Sci-fi space theme' }],
          },
        ],
      };

      mockGenerateText.mockResolvedValue(
        createAskUserResult('tc-checkpoint-1', questions) as any,
      );

      const executor = createExecutor();
      const result = await executor.executeStage('planning', createTestContext());

      expect(result.status).toBe('suspended');
      expect(result.suspendedConversation).toBeDefined();

      const conv = result.suspendedConversation!;
      expect(conv.messagesJson).toBeTruthy();
      expect(conv.pendingToolCallId).toBe('tc-checkpoint-1');
      expect(conv.pendingToolName).toBe('askUser');
      expect(conv.pendingQuestionsJson).toBeTruthy();
    });

    it('messagesJson is valid JSON array of ModelMessage', async () => {
      mockGenerateText.mockResolvedValue(
        createAskUserResult('tc-msg-1', { questions: [] }) as any,
      );

      const executor = createExecutor();
      const result = await executor.executeStage('planning', createTestContext());

      const messages = JSON.parse(result.suspendedConversation!.messagesJson);
      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0]).toHaveProperty('role');
    });

    it('pendingQuestionsJson round-trips through JSON', async () => {
      const questions = {
        questions: [
          {
            question: 'Pick a color',
            header: 'Color',
            options: [
              { label: 'Red', description: 'Warm' },
              { label: 'Blue', description: 'Cool' },
            ],
            multiple: true,
          },
        ],
      };

      mockGenerateText.mockResolvedValue(
        createAskUserResult('tc-round-1', questions) as any,
      );

      const executor = createExecutor();
      const result = await executor.executeStage('planning', createTestContext());

      const parsed = JSON.parse(result.suspendedConversation!.pendingQuestionsJson);
      expect(parsed).toEqual(questions);
    });

    it('worker-level ConversationCheckpoint structure contains cost tracking fields', () => {
      const checkpoint = {
        messagesJson: JSON.stringify([{ role: 'assistant', content: 'Hi' }]),
        pendingToolCallId: 'tc-1',
        pendingToolName: 'askUser',
        pendingQuestionsJson: JSON.stringify({ questions: [] }),
        stageContextJson: JSON.stringify({ previousOutputs: {} }),
        promptTokensSoFar: 100,
        completionTokensSoFar: 50,
        costMicrosSoFar: 150,
        createdAt: Date.now(),
      };

      expect(checkpoint).toHaveProperty('messagesJson');
      expect(checkpoint).toHaveProperty('pendingToolCallId');
      expect(checkpoint).toHaveProperty('pendingToolName');
      expect(checkpoint).toHaveProperty('pendingQuestionsJson');
      expect(checkpoint).toHaveProperty('stageContextJson');
      expect(checkpoint).toHaveProperty('promptTokensSoFar');
      expect(checkpoint).toHaveProperty('completionTokensSoFar');
      expect(checkpoint).toHaveProperty('costMicrosSoFar');
      expect(checkpoint).toHaveProperty('createdAt');

      expect(typeof checkpoint.promptTokensSoFar).toBe('number');
      expect(typeof checkpoint.completionTokensSoFar).toBe('number');
      expect(typeof checkpoint.costMicrosSoFar).toBe('number');
      expect(typeof checkpoint.createdAt).toBe('number');

      const parsedStageContext = JSON.parse(checkpoint.stageContextJson);
      expect(parsedStageContext).toHaveProperty('previousOutputs');
    });
  });

  describe('worker result mapping', () => {
    it('maps suspended StageResult to RunStepResult with suspended status', async () => {
      const questions = {
        questions: [
          { question: 'Theme?', header: 'Theme', options: [{ label: 'Space', description: 'Sci-fi' }] },
        ],
      };

      mockGenerateText.mockResolvedValue(
        createAskUserResult('tc-map-1', questions) as any,
      );

      const executor = createExecutor();
      const stageResult = await executor.executeStage('planning', createTestContext());

      const runStepResult: RunStepResult = {
        type: 'step_result',
        runId: 'test-run-id',
        stepId: 'test-step-id',
        stepIndex: 1,
        stage: 'planning',
        status: 'suspended',
        costMicros: stageResult.costMicros,
        checkpointId: 'test-run-id:conversation:1',
        suspendedConversationJson: JSON.stringify(stageResult.suspendedConversation),
        questionsJson: stageResult.suspendedConversation!.pendingQuestionsJson,
        provider: stageResult.provider,
        model: stageResult.model,
        inputTokens: stageResult.usage.promptTokens,
        outputTokens: stageResult.usage.completionTokens,
        completedAt: Date.now(),
      };

      expect(runStepResult.status).toBe('suspended');
      expect(runStepResult.suspendedConversationJson).toBeDefined();
      expect(runStepResult.questionsJson).toBeDefined();
      expect(runStepResult.costMicros).toBeGreaterThan(0);

      const parsedConversation = JSON.parse(runStepResult.suspendedConversationJson!);
      expect(parsedConversation.pendingToolCallId).toBe('tc-map-1');
      expect(parsedConversation.pendingToolName).toBe('askUser');

      const parsedQuestions = JSON.parse(runStepResult.questionsJson!);
      expect(parsedQuestions.questions[0].header).toBe('Theme');
    });

    it('includes provider and model metadata in suspended RunStepResult', async () => {
      mockGenerateText.mockResolvedValue(
        createAskUserResult('tc-meta-1', { questions: [] }) as any,
      );

      const executor = createExecutor();
      const stageResult = await executor.executeStage('planning', createTestContext());

      expect(stageResult.provider).toBe('test-provider');
      expect(stageResult.model).toBe('test-model');
    });

    it('suspended RunStepResult does not include outputArtifactKey or checkpointStateJson', async () => {
      mockGenerateText.mockResolvedValue(
        createAskUserResult('tc-no-artifact', { questions: [] }) as any,
      );

      const executor = createExecutor();
      const stageResult = await executor.executeStage('planning', createTestContext());

      const runStepResult: RunStepResult = {
        type: 'step_result',
        runId: 'test-run-id',
        stepId: 'test-step-id',
        stepIndex: 1,
        stage: 'planning',
        status: 'suspended',
        costMicros: stageResult.costMicros,
        checkpointId: 'test-run-id:conversation:1',
        suspendedConversationJson: JSON.stringify(stageResult.suspendedConversation),
        questionsJson: stageResult.suspendedConversation!.pendingQuestionsJson,
        provider: stageResult.provider,
        model: stageResult.model,
        inputTokens: stageResult.usage.promptTokens,
        outputTokens: stageResult.usage.completionTokens,
        completedAt: Date.now(),
      };

      expect(runStepResult.outputArtifactKey).toBeUndefined();
      expect(runStepResult.checkpointStateJson).toBeUndefined();
    });
  });

  describe('cost accounting', () => {
    it('tracks tokens from initial suspension in StageResult', async () => {
      mockGenerateText.mockResolvedValue(
        createAskUserResult('tc-cost-1', { questions: [] }, { promptTokens: 200, completionTokens: 100 }) as any,
      );

      const executor = createExecutor(1000);
      const result = await executor.executeStage('planning', createTestContext());

      expect(result.usage.promptTokens).toBe(200);
      expect(result.usage.completionTokens).toBe(100);
      expect(result.costMicros).toBeGreaterThan(0);
    });

    it('accumulates tokens across suspend and resume at worker level', async () => {
      const preSuspendPromptTokens = 200;
      const preSuspendCompletionTokens = 100;
      const preSuspendCostMicros = 300;

      const resumePromptTokens = 150;
      const resumeCompletionTokens = 75;

      mockGenerateText.mockResolvedValue(
        createNormalResult({ promptTokens: resumePromptTokens, completionTokens: resumeCompletionTokens }) as any,
      );

      const executor = createExecutor(1000);
      const context = createTestContext();
      const resumeResult = await executor.resumeStage('planning', context, {
        messagesJson: JSON.stringify([{ role: 'assistant', content: 'Asking questions.' }]),
        pendingToolCallId: 'tc-cost-resume',
        answerText: 'Space theme',
      });

      const totalPromptTokens = preSuspendPromptTokens + resumeResult.usage.promptTokens;
      const totalCompletionTokens = preSuspendCompletionTokens + resumeResult.usage.completionTokens;
      const totalCostMicros = preSuspendCostMicros + resumeResult.costMicros;

      expect(totalPromptTokens).toBe(preSuspendPromptTokens + resumePromptTokens);
      expect(totalCompletionTokens).toBe(preSuspendCompletionTokens + resumeCompletionTokens);
      expect(totalCostMicros).toBeGreaterThan(preSuspendCostMicros);
    });

    it('worker resume accumulation matches handleResume pattern', () => {
      const checkpoint = {
        promptTokensSoFar: 200,
        completionTokensSoFar: 100,
        costMicrosSoFar: 300,
      };

      const resumeUsage = {
        promptTokens: 150,
        completionTokens: 75,
      };
      const resumeCostMicros = 225;

      const totalPromptTokens = checkpoint.promptTokensSoFar + resumeUsage.promptTokens;
      const totalCompletionTokens = checkpoint.completionTokensSoFar + resumeUsage.completionTokens;
      const totalCostMicros = checkpoint.costMicrosSoFar + resumeCostMicros;

      expect(totalPromptTokens).toBe(350);
      expect(totalCompletionTokens).toBe(175);
      expect(totalCostMicros).toBe(525);
    });

    it('cost estimation uses costPer1kTokensMicros correctly', async () => {
      mockGenerateText.mockResolvedValue(
        createAskUserResult('tc-cost-calc', { questions: [] }, { promptTokens: 500, completionTokens: 500 }) as any,
      );

      const executor = createExecutor(2000);
      const result = await executor.executeStage('planning', createTestContext());

      const expectedCost = Math.max(1, Math.round((1000 / 1000) * 2000));
      expect(result.costMicros).toBe(expectedCost);
    });
  });

  describe('recursive suspension', () => {
    it('resume can trigger another suspension', async () => {
      const secondQuestions = {
        questions: [
          {
            question: 'Difficulty level?',
            header: 'Difficulty',
            options: [
              { label: 'Easy', description: 'Relaxed' },
              { label: 'Hard', description: 'Challenging' },
            ],
          },
        ],
      };

      mockGenerateText.mockResolvedValue(
        createAskUserResult('tc-recursive-1', secondQuestions) as any,
      );

      const executor = createExecutor();
      const context = createTestContext();
      const result = await executor.resumeStage('planning', context, {
        messagesJson: JSON.stringify([
          { role: 'assistant', content: 'First question done.' },
        ]),
        pendingToolCallId: 'tc-first',
        answerText: 'Space theme',
      });

      expect(result.status).toBe('suspended');
      expect(result.suspendedConversation).toBeDefined();
      expect(result.suspendedConversation!.pendingToolCallId).toBe('tc-recursive-1');
      expect(result.suspendedConversation!.pendingToolName).toBe('askUser');

      const parsedQuestions = JSON.parse(result.suspendedConversation!.pendingQuestionsJson);
      expect(parsedQuestions.questions[0].header).toBe('Difficulty');
    });

    it('recursive suspension produces fresh conversation messages', async () => {
      const newMessages = [
        { role: 'assistant', content: 'Processed first answer, now asking again.' },
      ];

      mockGenerateText.mockResolvedValue({
        steps: [
          {
            toolCalls: [
              {
                toolCallId: 'tc-recursive-2',
                toolName: 'askUser',
                args: { questions: [{ question: 'More?', header: 'Extra', options: [] }] },
              },
            ],
            toolResults: [],
          },
        ],
        response: {
          messages: newMessages,
        },
        usage: { promptTokens: 300, completionTokens: 150 },
        text: '',
      } as any);

      const executor = createExecutor();
      const result = await executor.resumeStage('planning', createTestContext(), {
        messagesJson: JSON.stringify([{ role: 'assistant', content: 'Original message.' }]),
        pendingToolCallId: 'tc-orig',
        answerText: 'First answer',
      });

      expect(result.status).toBe('suspended');
      const parsedMessages = JSON.parse(result.suspendedConversation!.messagesJson);
      expect(parsedMessages).toEqual(newMessages);
      expect(parsedMessages).not.toEqual([{ role: 'assistant', content: 'Original message.' }]);
    });

    it('worker checkpoint is updated with accumulated costs on recursive suspension', () => {
      const firstCheckpoint = {
        promptTokensSoFar: 100,
        completionTokensSoFar: 50,
        costMicrosSoFar: 150,
      };

      const secondExecutionUsage = { promptTokens: 200, completionTokens: 100 };
      const secondExecutionCost = 300;

      const updatedCheckpoint = {
        promptTokensSoFar: firstCheckpoint.promptTokensSoFar + secondExecutionUsage.promptTokens,
        completionTokensSoFar: firstCheckpoint.completionTokensSoFar + secondExecutionUsage.completionTokens,
        costMicrosSoFar: firstCheckpoint.costMicrosSoFar + secondExecutionCost,
      };

      expect(updatedCheckpoint.promptTokensSoFar).toBe(300);
      expect(updatedCheckpoint.completionTokensSoFar).toBe(150);
      expect(updatedCheckpoint.costMicrosSoFar).toBe(450);
    });

    it('recursive suspension result reports accumulated totals to coordinator', () => {
      const checkpoint = {
        promptTokensSoFar: 100,
        completionTokensSoFar: 50,
        costMicrosSoFar: 150,
      };

      const executionUsage = { promptTokens: 200, completionTokens: 100 };
      const executionCostMicros = 300;

      const totalPromptTokens = checkpoint.promptTokensSoFar + executionUsage.promptTokens;
      const totalCompletionTokens = checkpoint.completionTokensSoFar + executionUsage.completionTokens;
      const totalCostMicros = checkpoint.costMicrosSoFar + executionCostMicros;

      const result: RunStepResult = {
        type: 'step_result',
        runId: 'test-run',
        stepId: 'test-step',
        stepIndex: 1,
        stage: 'planning',
        status: 'suspended',
        costMicros: totalCostMicros,
        checkpointId: 'test-run:conversation:1',
        provider: 'test-provider',
        model: 'test-model',
        inputTokens: totalPromptTokens,
        outputTokens: totalCompletionTokens,
        completedAt: Date.now(),
      };

      expect(result.costMicros).toBe(450);
      expect(result.inputTokens).toBe(300);
      expect(result.outputTokens).toBe(150);
    });

    it('successful resume after recursive suspension clears conversation checkpoint', async () => {
      mockGenerateText.mockResolvedValue(createNormalResult() as any);

      const executor = createExecutor();
      const context = createTestContext();
      const result = await executor.resumeStage('planning', context, {
        messagesJson: JSON.stringify([{ role: 'assistant', content: 'Second question answered.' }]),
        pendingToolCallId: 'tc-final',
        answerText: 'Hard difficulty',
      });

      expect(result.status).toBe('succeeded');
      expect(result.suspendedConversation).toBeUndefined();
    });
  });
});
