import { generateText, stepCountIs } from 'ai';
import type { LanguageModel, ModelMessage } from 'ai';

import type { AgentStepStage } from '@slopcade/shared/types/agent-run';

import { getStageConfig, STAGE_PIPELINE } from './stages';
import { createStageTools, type StageExecutionContext } from './tools';

export interface StageProgressEvent {
  type: 'stage_started' | 'attempt_started' | 'attempt_failed' | 'stage_validated' | 'stage_failed';
  runId: string;
  stepId: string;
  stepIndex: number;
  stage: AgentStepStage;
  attempt: number;
  message: string;
  timestamp: number;
}

export interface StageUsage {
  promptTokens: number;
  completionTokens: number;
}

export interface StageResult {
  stage: AgentStepStage;
  status: 'succeeded' | 'failed' | 'suspended';
  attempts: number;
  outputArtifact: unknown;
  validation: { valid: boolean; errors?: string[] };
  failureReason?: string;
  provider: string;
  model: string;
  usage: StageUsage;
  costMicros: number;
  suspendedConversation?: {
    messagesJson: string;
    pendingToolCallId: string;
    pendingToolName: string;
    pendingQuestionsJson: string;
  };
}

export interface StageExecutorOptions {
  onProgress?: (event: StageProgressEvent) => void | Promise<void>;
  costPer1kTokensMicros?: number;
}

function extractUsage(usage: unknown): StageUsage {
  if (!usage || typeof usage !== 'object') {
    return { promptTokens: 0, completionTokens: 0 };
  }

  const usageRecord = usage as Record<string, unknown>;
  const promptTokens = Number(
    usageRecord.promptTokens
    ?? usageRecord.inputTokens
    ?? usageRecord.prompt_tokens
    ?? usageRecord.input_tokens
    ?? 0,
  );
  const completionTokens = Number(
    usageRecord.completionTokens
    ?? usageRecord.outputTokens
    ?? usageRecord.completion_tokens
    ?? usageRecord.output_tokens
    ?? 0,
  );

  return {
    promptTokens: Number.isFinite(promptTokens) ? promptTokens : 0,
    completionTokens: Number.isFinite(completionTokens) ? completionTokens : 0,
  };
}

function getStageOutput(stage: AgentStepStage, context: StageExecutionContext): unknown {
  if (stage === 'planning') {
    return context.planningDoc;
  }
  return context.gameDefinition;
}

function createPrompt(stage: AgentStepStage, context: StageExecutionContext): string {
  const baseContext = [
    `runId: ${context.runId}`,
    `stepId: ${context.stepId}`,
    `stepIndex: ${context.stepIndex}`,
    `stage: ${stage}`,
    `userPrompt: ${context.userPrompt ?? 'No explicit prompt provided. Continue from planning + prior outputs.'}`,
    `planningDoc: ${context.planningDoc || 'No planning doc yet.'}`,
    `hasGameDefinition: ${context.gameDefinition !== null}`,
    `previousOutputs: ${JSON.stringify(context.previousOutputs)}`,
  ];

  if (stage === 'planning') {
    return `${baseContext.join('\n')}\n\nUpdate the planning document using tools. Return a short completion note.`;
  }

  return `${baseContext.join('\n')}\n\nUse tools to produce a valid updated GameDefinition for this stage. Return a short completion note.`;
}

interface PendingAskUserToolCall {
  toolCallId: string;
  toolName: 'askUser';
  args?: unknown;
  input?: unknown;
}

function findPendingAskUserToolCall(step: unknown): PendingAskUserToolCall | undefined {
  if (!step || typeof step !== 'object') {
    return undefined;
  }

  const stepRecord = step as Record<string, unknown>;
  if (!Array.isArray(stepRecord.toolCalls)) {
    return undefined;
  }

  for (const toolCall of stepRecord.toolCalls) {
    if (!toolCall || typeof toolCall !== 'object') {
      continue;
    }

    const toolCallRecord = toolCall as Record<string, unknown>;
    if (toolCallRecord.toolName !== 'askUser') {
      continue;
    }

    const toolCallId = toolCallRecord.toolCallId;
    if (typeof toolCallId !== 'string' || toolCallId.length === 0) {
      continue;
    }

    return {
      toolCallId,
      toolName: 'askUser',
      args: toolCallRecord.args,
      input: toolCallRecord.input,
    };
  }

  return undefined;
}

export class StageExecutor {
  constructor(
    private readonly model: LanguageModel,
    private readonly provider: string,
    private readonly modelName: string,
    private readonly options: StageExecutorOptions = {},
  ) {}

  async executeStage(stage: AgentStepStage, context: StageExecutionContext): Promise<StageResult> {
    const tools = createStageTools(context);
    const config = getStageConfig(stage, tools);

    await this.emit({
      type: 'stage_started',
      context,
      stage,
      attempt: 0,
      message: `${config.displayName} stage started`,
    });

    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let lastValidation: { valid: boolean; errors?: string[] } = { valid: false, errors: ['Stage did not run'] };
    let failureReason = 'STAGE_EXECUTION_FAILED';

    for (let attempt = 1; attempt <= config.maxRetries; attempt += 1) {
      await this.emit({
        type: 'attempt_started',
        context,
        stage,
        attempt,
        message: `Attempt ${attempt}/${config.maxRetries}`,
      });

      try {
        const result = await generateText({
          model: this.model,
          system: config.systemPrompt,
          prompt: createPrompt(stage, context),
          tools: config.tools,
          stopWhen: stepCountIs(6),
        });

        const usage = extractUsage(result.usage);
        totalPromptTokens += usage.promptTokens;
        totalCompletionTokens += usage.completionTokens;

        const lastStep = result.steps[result.steps.length - 1];
        const pendingAskUser = findPendingAskUserToolCall(lastStep);

        if (pendingAskUser) {
          return {
            stage,
            status: 'suspended',
            attempts: attempt,
            outputArtifact: getStageOutput(stage, context),
            validation: { valid: false, errors: ['Suspended for user input'] },
            provider: this.provider,
            model: this.modelName,
            usage: {
              promptTokens: totalPromptTokens,
              completionTokens: totalCompletionTokens,
            },
            costMicros: this.estimateCostMicros(totalPromptTokens, totalCompletionTokens),
            suspendedConversation: {
              messagesJson: JSON.stringify(result.response.messages),
              pendingToolCallId: pendingAskUser.toolCallId,
              pendingToolName: pendingAskUser.toolName,
              pendingQuestionsJson: JSON.stringify(pendingAskUser.args ?? pendingAskUser.input ?? null),
            },
          };
        }

        const output = getStageOutput(stage, context);
        const validation = config.validateOutput(output);
        lastValidation = validation;

        if (validation.valid) {
          await this.emit({
            type: 'stage_validated',
            context,
            stage,
            attempt,
            message: `${config.displayName} output validated`,
          });

          return {
            stage,
            status: 'succeeded',
            attempts: attempt,
            outputArtifact: output,
            validation,
            provider: this.provider,
            model: this.modelName,
            usage: {
              promptTokens: totalPromptTokens,
              completionTokens: totalCompletionTokens,
            },
            costMicros: this.estimateCostMicros(totalPromptTokens, totalCompletionTokens),
          };
        }

        failureReason = 'STAGE_VALIDATION_FAILED';

        await this.emit({
          type: 'attempt_failed',
          context,
          stage,
          attempt,
          message: `Validation failed: ${(validation.errors ?? []).join('; ')}`,
        });
      } catch (error) {
        failureReason = 'STAGE_GENERATION_ERROR';
        const message = error instanceof Error ? error.message : String(error);
        lastValidation = {
          valid: false,
          errors: [message],
        };

        await this.emit({
          type: 'attempt_failed',
          context,
          stage,
          attempt,
          message,
        });
      }
    }

    await this.emit({
      type: 'stage_failed',
      context,
      stage,
      attempt: config.maxRetries,
      message: `${config.displayName} failed after ${config.maxRetries} attempts`,
    });

    return {
      stage,
      status: 'failed',
      attempts: config.maxRetries,
      outputArtifact: getStageOutput(stage, context),
      validation: lastValidation,
      failureReason,
      provider: this.provider,
      model: this.modelName,
      usage: {
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
      },
      costMicros: this.estimateCostMicros(totalPromptTokens, totalCompletionTokens),
    };
  }

  async resumeStage(
    stage: AgentStepStage,
    context: StageExecutionContext,
    checkpoint: {
      messagesJson: string;
      pendingToolCallId: string;
      answerText: string;
    },
  ): Promise<StageResult> {
    const tools = createStageTools(context);
    const config = getStageConfig(stage, tools);

    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;

    try {
      const parsed = JSON.parse(checkpoint.messagesJson) as unknown;
      if (!Array.isArray(parsed)) {
        throw new Error('Invalid suspended conversation checkpoint: messages must be an array');
      }

      const savedMessages = parsed as ModelMessage[];
      const resumeMessages = [
        ...savedMessages,
        {
          role: 'tool' as const,
          content: [
            {
              type: 'tool-result' as const,
              toolCallId: checkpoint.pendingToolCallId,
              toolName: 'askUser',
              output: {
                type: 'text' as const,
                value: checkpoint.answerText,
              },
            },
          ],
        },
      ];

      const result = await generateText({
        model: this.model,
        system: config.systemPrompt,
        messages: resumeMessages,
        tools: config.tools,
        stopWhen: stepCountIs(6),
      });

      const usage = extractUsage(result.usage);
      totalPromptTokens += usage.promptTokens;
      totalCompletionTokens += usage.completionTokens;

      const lastStep = result.steps[result.steps.length - 1];
      const pendingAskUser = findPendingAskUserToolCall(lastStep);

      if (pendingAskUser) {
        return {
          stage,
          status: 'suspended',
          attempts: 1,
          outputArtifact: getStageOutput(stage, context),
          validation: { valid: false, errors: ['Suspended for user input'] },
          provider: this.provider,
          model: this.modelName,
          usage: {
            promptTokens: totalPromptTokens,
            completionTokens: totalCompletionTokens,
          },
          costMicros: this.estimateCostMicros(totalPromptTokens, totalCompletionTokens),
          suspendedConversation: {
            messagesJson: JSON.stringify(result.response.messages),
            pendingToolCallId: pendingAskUser.toolCallId,
            pendingToolName: pendingAskUser.toolName,
            pendingQuestionsJson: JSON.stringify(pendingAskUser.args ?? pendingAskUser.input ?? null),
          },
        };
      }

      const output = getStageOutput(stage, context);
      const validation = config.validateOutput(output);

      return {
        stage,
        status: validation.valid ? 'succeeded' : 'failed',
        attempts: 1,
        outputArtifact: output,
        validation,
        failureReason: validation.valid ? undefined : 'STAGE_VALIDATION_FAILED',
        provider: this.provider,
        model: this.modelName,
        usage: {
          promptTokens: totalPromptTokens,
          completionTokens: totalCompletionTokens,
        },
        costMicros: this.estimateCostMicros(totalPromptTokens, totalCompletionTokens),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return {
        stage,
        status: 'failed',
        attempts: 1,
        outputArtifact: getStageOutput(stage, context),
        validation: { valid: false, errors: [message] },
        failureReason: 'STAGE_GENERATION_ERROR',
        provider: this.provider,
        model: this.modelName,
        usage: {
          promptTokens: totalPromptTokens,
          completionTokens: totalCompletionTokens,
        },
        costMicros: this.estimateCostMicros(totalPromptTokens, totalCompletionTokens),
      };
    }
  }

  async executePipeline(initialContext: StageExecutionContext): Promise<StageResult[]> {
    const stageResults: StageResult[] = [];
    for (const stageConfig of STAGE_PIPELINE) {
      const result = await this.executeStage(stageConfig.stage, {
        ...initialContext,
        stage: stageConfig.stage,
      });
      stageResults.push(result);
      if (result.status === 'failed') {
        break;
      }
      initialContext.previousOutputs[stageConfig.stage] = result.outputArtifact;
    }
    return stageResults;
  }

  private estimateCostMicros(promptTokens: number, completionTokens: number): number {
    const tokens = promptTokens + completionTokens;
    const costPer1kTokensMicros = this.options.costPer1kTokensMicros ?? 1_000;
    if (tokens <= 0) {
      return 0;
    }
    return Math.max(1, Math.round((tokens / 1000) * costPer1kTokensMicros));
  }

  private async emit(event: {
    type: StageProgressEvent['type'];
    context: StageExecutionContext;
    stage: AgentStepStage;
    attempt: number;
    message: string;
  }): Promise<void> {
    if (!this.options.onProgress) {
      return;
    }

    await this.options.onProgress({
      type: event.type,
      runId: event.context.runId,
      stepId: event.context.stepId,
      stepIndex: event.context.stepIndex,
      stage: event.stage,
      attempt: event.attempt,
      message: event.message,
      timestamp: Date.now(),
    });
  }
}
