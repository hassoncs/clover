import { DurableObject } from 'cloudflare:workers';
import type { ModelMessage } from 'ai';

import { createModelForTier, resolveTierConfig } from '@/ai/agent/tier-config';
import { ArtifactService } from '@/agent/artifact-service';
import { StageExecutor } from '@/agent/engine/stage-executor';
import type { StageExecutionContext } from '@/agent/engine/tools';
import { ChatEventStore } from '@/chat/chat-event-store';
import type { AgentStepStage, AgentTier } from '@slopcade/shared/types/agent-run';

import type { RunStepRequest, RunStepResult } from './types';

type DurableObjectNamespace = import('@cloudflare/workers-types').DurableObjectNamespace;
type D1Database = import('@cloudflare/workers-types').D1Database;
type R2Bucket = import('@cloudflare/workers-types').R2Bucket;
type DurableObjectState = import('@cloudflare/workers-types').DurableObjectState;

interface Env {
  RUN_COORDINATOR: DurableObjectNamespace;
  DB?: D1Database;
  ASSETS?: R2Bucket;
  OPENROUTER_API_KEY?: string;
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
}

interface StepCheckpoint {
  checkpointId: string;
  runId: string;
  stepId: string;
  stepIndex: number;
  stage: RunStepRequest['stage'];
  stateJson: string;
  costMicros: number;
  inputTokens: number;
  outputTokens: number;
  provider: string;
  model: string;
  failureReason?: string;
  errorMessage?: string;
  createdAt: number;
}

interface WorkerExecutionState {
  previousOutputs: Record<string, unknown>;
  conversationMessagesJson?: string;
}

interface ConversationCheckpoint {
  messagesJson: string;
  pendingToolCallId: string;
  pendingToolName: string;
  pendingQuestionsJson: string;
  stageContextJson: string;
  promptTokensSoFar: number;
  completionTokensSoFar: number;
  costMicrosSoFar: number;
  createdAt: number;
}

type WorkerRunStepRequest = RunStepRequest & {
  tier?: AgentTier;
  gameTitle?: string;
  gameDescription?: string | null;
  planningDocJson?: string | null;
};

const CHECKPOINT_PREFIX = 'checkpoint:';
const COST_PREFIX = 'cost:';
const STATE_KEY = 'engine:state';

function createErrorMessage(reason: string | undefined, errors: string[] | undefined): string {
  return `${reason ?? 'STAGE_EXECUTION_FAILED'}: ${(errors ?? ['unknown error']).join('; ')}`;
}

export class RunStepWorkerDO extends DurableObject<Env> {
  private readonly artifactService?: ArtifactService;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    if (env.ASSETS && env.DB) {
      this.artifactService = new ArtifactService(env.ASSETS, env.DB);
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname.endsWith('/internal/execute')) {
      return this.handleExecute(request);
    }

    if (request.method === 'POST' && url.pathname.endsWith('/internal/resume')) {
      return this.handleResume(request);
    }

    if (request.method === 'POST' && url.pathname.endsWith('/internal/last-successful-checkpoint')) {
      return this.handleLastSuccessfulCheckpoint();
    }

    return new Response('Not found', { status: 404 });
  }

  private async handleExecute(request: Request): Promise<Response> {
    const payload = (await request.json()) as WorkerRunStepRequest;
    if (payload.type !== 'execute_step') {
      return new Response('Invalid payload', { status: 400 });
    }

    const checkpointStorageKey = `${CHECKPOINT_PREFIX}${payload.stepIndex.toString().padStart(6, '0')}`;
    const existingCheckpoint = await this.ctx.storage.get<StepCheckpoint>(checkpointStorageKey);
    if (existingCheckpoint) {
      try {
        const parsedState = JSON.parse(existingCheckpoint.stateJson) as { status?: string; completedAt?: number };
        if (parsedState.status === 'succeeded') {
          console.log('[worker] Idempotency short-circuit activated', {
            runId: payload.runId,
            stepIndex: payload.stepIndex,
            stage: payload.stage,
            checkpointId: existingCheckpoint.checkpointId,
            costMicros: existingCheckpoint.costMicros,
          });

          const outputArtifactKey = `agent-runs/${payload.runId}/stages/${payload.stage}/${payload.stepIndex}`;
          const existingResult: RunStepResult = {
            type: 'step_result',
            runId: payload.runId,
            stepId: payload.stepId,
            stepIndex: payload.stepIndex,
            stage: payload.stage,
            status: 'succeeded',
            costMicros: existingCheckpoint.costMicros,
            checkpointId: existingCheckpoint.checkpointId,
            checkpointStateJson: existingCheckpoint.stateJson,
            checkpointArtifactKeysJson: JSON.stringify({ outputArtifactKey }),
            outputArtifactKey,
            provider: existingCheckpoint.provider,
            model: existingCheckpoint.model,
            inputTokens: existingCheckpoint.inputTokens,
            outputTokens: existingCheckpoint.outputTokens,
            completedAt: parsedState.completedAt ?? existingCheckpoint.createdAt,
          };

          await this.reportResult(existingResult);
          return Response.json({ ok: true, checkpointId: existingCheckpoint.checkpointId, costMicros: existingCheckpoint.costMicros });
        }
      } catch {
        // Ignore malformed checkpoint payloads and continue execution.
      }
    }

    const checkpointId = `${payload.runId}:checkpoint:${payload.stepIndex}`;
    const completedAt = Date.now();

    try {
      const tierConfig = resolveTierConfig(payload.tier ?? 'free');
      const model = createModelForTier(tierConfig, {
        OPENROUTER_API_KEY: this.env.OPENROUTER_API_KEY,
      });

      const state = await this.loadState();

      let conversationHistory: ModelMessage[] | undefined;
      if (payload.stage === 'chat' && payload.threadId && this.env.DB) {
        if (state.conversationMessagesJson) {
          try {
            const saved = JSON.parse(state.conversationMessagesJson) as ModelMessage[];
            const latestUserMsg = await this.getLatestUserMessage(payload.threadId);
            conversationHistory = latestUserMsg
              ? [...saved, { role: 'user' as const, content: latestUserMsg }]
              : saved;
          } catch {
            conversationHistory = await this.buildConversationFromChatEvents(payload.threadId);
          }
        } else {
          conversationHistory = await this.buildConversationFromChatEvents(payload.threadId);
        }
      }

      const context: StageExecutionContext = {
        runId: payload.runId,
        stepId: payload.stepId,
        stepIndex: payload.stepIndex,
        stage: payload.stage,
        gameId: payload.gameId,
        userPrompt: `${payload.gameTitle ?? 'Untitled'}: ${payload.gameDescription ?? ''}`.trim(),
        previousOutputs: state.previousOutputs,
        artifactService: this.artifactService,
        conversationHistory,
      };

      const executor = new StageExecutor(
        model,
        tierConfig.primary.provider,
        tierConfig.primary.model,
        {
          costPer1kTokensMicros: Math.max(1, tierConfig.estimatedCostPerStepMicros / 2),
        },
      );

      const execution = await executor.executeStage(payload.stage, context);

      if (execution.status === 'suspended' && execution.suspendedConversation) {
        if (payload.threadId && this.env.DB) {
          const chatStore = new ChatEventStore(this.env.DB);
          const questionsData = execution.suspendedConversation.pendingQuestionsJson;
          let parsedQuestions: unknown;

          try {
            parsedQuestions = JSON.parse(questionsData);
          } catch {
            parsedQuestions = null;
          }

          await chatStore.appendEvent({
            threadId: payload.threadId,
            eventType: 'user_question',
            role: 'assistant',
            payload: {
              version: 1,
              type: 'user_question',
              batchId: `${payload.runId}:q:${payload.stepIndex}`,
              questions: parsedQuestions,
              runId: payload.runId,
            },
            runId: payload.runId,
          });
        }

        const conversationKey = `conversation:${payload.stepIndex}`;
        await this.ctx.storage.put<ConversationCheckpoint>(conversationKey, {
          messagesJson: execution.suspendedConversation.messagesJson,
          pendingToolCallId: execution.suspendedConversation.pendingToolCallId,
          pendingToolName: execution.suspendedConversation.pendingToolName,
          pendingQuestionsJson: execution.suspendedConversation.pendingQuestionsJson,
          stageContextJson: JSON.stringify({
            previousOutputs: context.previousOutputs,
          }),
          promptTokensSoFar: execution.usage.promptTokens,
          completionTokensSoFar: execution.usage.completionTokens,
          costMicrosSoFar: execution.costMicros,
          createdAt: Date.now(),
        });

        await this.persistState({
          previousOutputs: context.previousOutputs,
          conversationMessagesJson: execution.conversationMessagesJson,
        });

        const result: RunStepResult = {
          type: 'step_result',
          runId: payload.runId,
          stepId: payload.stepId,
          stepIndex: payload.stepIndex,
          stage: payload.stage,
          status: 'suspended',
          costMicros: execution.costMicros,
          checkpointId: `${payload.runId}:conversation:${payload.stepIndex}`,
          suspendedConversationJson: JSON.stringify(execution.suspendedConversation),
          questionsJson: execution.suspendedConversation.pendingQuestionsJson,
          provider: execution.provider,
          model: execution.model,
          inputTokens: execution.usage.promptTokens,
          outputTokens: execution.usage.completionTokens,
          completedAt: Date.now(),
        };
        await this.reportResult(result);
        return Response.json({ ok: true, status: 'suspended' });
      }

      if (payload.threadId && this.env.DB && execution.status === 'succeeded') {
        const chatStore = new ChatEventStore(this.env.DB);
        await chatStore.appendEvent({
          threadId: payload.threadId,
          eventType: 'assistant_message',
          role: 'assistant',
          payload: {
            version: 1,
            type: 'assistant_message',
            text: execution.responseText,
            runId: payload.runId,
          },
          runId: payload.runId,
        });
      }

      context.previousOutputs[payload.stage] = execution.outputArtifact;

      await this.persistState({
        previousOutputs: context.previousOutputs,
        conversationMessagesJson: execution.conversationMessagesJson,
      });

      const errorMessage = execution.status === 'failed'
        ? createErrorMessage(execution.failureReason, execution.validation.errors)
        : undefined;

      const checkpoint: StepCheckpoint = {
        checkpointId,
        runId: payload.runId,
        stepId: payload.stepId,
        stepIndex: payload.stepIndex,
        stage: payload.stage,
        stateJson: JSON.stringify({
          stage: payload.stage,
          stepIndex: payload.stepIndex,
          startedAt: payload.startedAt,
          completedAt,
          status: execution.status,
          validation: execution.validation,
          attempts: execution.attempts,
        }),
        costMicros: execution.costMicros,
        inputTokens: execution.usage.promptTokens,
        outputTokens: execution.usage.completionTokens,
        provider: execution.provider,
        model: execution.model,
        failureReason: execution.status === 'failed' ? execution.failureReason : undefined,
        errorMessage,
        createdAt: completedAt,
      };

      await this.ctx.storage.put(checkpointStorageKey, checkpoint);
      await this.ctx.storage.put(`${COST_PREFIX}${payload.stepIndex.toString().padStart(6, '0')}`, {
        runId: payload.runId,
        stepId: payload.stepId,
        costMicros: execution.costMicros,
        inputTokens: execution.usage.promptTokens,
        outputTokens: execution.usage.completionTokens,
        provider: execution.provider,
        model: execution.model,
        createdAt: completedAt,
      });

      const result: RunStepResult = {
        type: 'step_result',
        runId: payload.runId,
        stepId: payload.stepId,
        stepIndex: payload.stepIndex,
        stage: payload.stage,
        status: execution.status,
        costMicros: execution.costMicros,
        checkpointId,
        checkpointStateJson: checkpoint.stateJson,
        checkpointArtifactKeysJson: JSON.stringify({ outputArtifactKey: `agent-runs/${payload.runId}/stages/${payload.stage}/${payload.stepIndex}` }),
        outputArtifactKey: `agent-runs/${payload.runId}/stages/${payload.stage}/${payload.stepIndex}`,
        errorMessage,
        provider: execution.provider,
        model: execution.model,
        inputTokens: execution.usage.promptTokens,
        outputTokens: execution.usage.completionTokens,
        completedAt,
      };

      await this.reportResult(result);

      return Response.json({ ok: true, checkpointId, costMicros: execution.costMicros });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      const failed: RunStepResult = {
        type: 'step_result',
        runId: payload.runId,
        stepId: payload.stepId,
        stepIndex: payload.stepIndex,
        stage: payload.stage,
        status: 'failed',
        costMicros: 0,
        checkpointId,
        checkpointStateJson: JSON.stringify({
          stage: payload.stage,
          stepIndex: payload.stepIndex,
          startedAt: payload.startedAt,
          completedAt,
          status: 'failed',
          error: message,
        }),
        checkpointArtifactKeysJson: null,
        errorMessage: `UNKNOWN: ${message}`,
        provider: 'unknown',
        model: 'unknown',
        completedAt,
      };

      await this.ctx.storage.put(checkpointStorageKey, {
        checkpointId,
        runId: payload.runId,
        stepId: payload.stepId,
        stepIndex: payload.stepIndex,
        stage: payload.stage,
        stateJson: JSON.stringify({
          stage: payload.stage,
          stepIndex: payload.stepIndex,
          startedAt: payload.startedAt,
          completedAt,
          status: 'failed',
          error: message,
        }),
        costMicros: 0,
        inputTokens: 0,
        outputTokens: 0,
        provider: 'unknown',
        model: 'unknown',
        failureReason: 'UNKNOWN',
        errorMessage: message,
        createdAt: completedAt,
      } satisfies StepCheckpoint);

      await this.reportResult(failed);

      return Response.json({ ok: false, checkpointId, error: message }, { status: 500 });
    }
  }

  private async handleResume(request: Request): Promise<Response> {
    const body = await request.json() as {
      runId: string;
      stepId: string;
      stepIndex: number;
      stage: AgentStepStage;
      tier: AgentTier;
      answerText: string;
      gameId?: string;
      gameTitle?: string;
      gameDescription?: string | null;
      threadId?: string | null;
    };

    const conversationKey = `conversation:${body.stepIndex}`;
    const checkpoint = await this.ctx.storage.get<ConversationCheckpoint>(conversationKey);

    if (!checkpoint) {
      return Response.json({ ok: false, reason: 'No conversation checkpoint found' }, { status: 404 });
    }

    const stageContext = JSON.parse(checkpoint.stageContextJson) as WorkerExecutionState;
    const tierConfig = resolveTierConfig(body.tier ?? 'free');
    const model = createModelForTier(tierConfig, {
      OPENROUTER_API_KEY: this.env.OPENROUTER_API_KEY,
    });

    let userPrompt = `${body.gameTitle ?? 'Untitled'}: ${body.gameDescription ?? ''}`.trim();

    if (body.stage === 'chat' && body.threadId && this.env.DB) {
      const chatHistory = await this.env.DB
        .prepare('SELECT event_type, content_json FROM chat_events WHERE thread_id = ? ORDER BY seq ASC')
        .bind(body.threadId)
        .all<{ event_type: string; content_json: string }>();

      if (chatHistory.results.length > 0) {
        const conversationParts: string[] = [];
        for (const row of chatHistory.results) {
          try {
            const content = JSON.parse(row.content_json) as { text?: string };
            if (row.event_type === 'user_message' && content.text) {
              conversationParts.push(`User: ${content.text}`);
            } else if (row.event_type === 'assistant_message' && content.text) {
              conversationParts.push(`Assistant: ${content.text}`);
            }
          } catch {
            continue;
          }
        }

        if (conversationParts.length > 0) {
          userPrompt = conversationParts.join('\n\n');
        }
      }
    }

    const context: StageExecutionContext = {
      runId: body.runId,
      stepId: body.stepId,
      stepIndex: body.stepIndex,
      stage: body.stage,
      gameId: body.gameId,
      userPrompt,
      previousOutputs: stageContext.previousOutputs,
      artifactService: this.artifactService,
    };

    const executor = new StageExecutor(
      model,
      tierConfig.primary.provider,
      tierConfig.primary.model,
      {
        costPer1kTokensMicros: Math.max(1, tierConfig.estimatedCostPerStepMicros / 2),
      },
    );

    const execution = await executor.resumeStage(body.stage, context, {
      messagesJson: checkpoint.messagesJson,
      pendingToolCallId: checkpoint.pendingToolCallId,
      answerText: body.answerText,
    });

    const totalPromptTokens = checkpoint.promptTokensSoFar + execution.usage.promptTokens;
    const totalCompletionTokens = checkpoint.completionTokensSoFar + execution.usage.completionTokens;
    const totalCostMicros = checkpoint.costMicrosSoFar + execution.costMicros;

    if (execution.status === 'suspended' && execution.suspendedConversation) {
      if (body.threadId && this.env.DB) {
        const chatStore = new ChatEventStore(this.env.DB);
        const questionsData = execution.suspendedConversation.pendingQuestionsJson;
        let parsedQuestions: unknown;

        try {
          parsedQuestions = JSON.parse(questionsData);
        } catch {
          parsedQuestions = null;
        }

        await chatStore.appendEvent({
          threadId: body.threadId,
          eventType: 'user_question',
          role: 'assistant',
          payload: {
            version: 1,
            type: 'user_question',
            batchId: `${body.runId}:q:${body.stepIndex}`,
            questions: parsedQuestions,
            runId: body.runId,
          },
          runId: body.runId,
        });
      }

      await this.ctx.storage.put<ConversationCheckpoint>(conversationKey, {
        messagesJson: execution.suspendedConversation.messagesJson,
        pendingToolCallId: execution.suspendedConversation.pendingToolCallId,
        pendingToolName: execution.suspendedConversation.pendingToolName,
        pendingQuestionsJson: execution.suspendedConversation.pendingQuestionsJson,
        stageContextJson: JSON.stringify({
          previousOutputs: context.previousOutputs,
        }),
        promptTokensSoFar: totalPromptTokens,
        completionTokensSoFar: totalCompletionTokens,
        costMicrosSoFar: totalCostMicros,
        createdAt: Date.now(),
      });

      await this.persistState({
          previousOutputs: context.previousOutputs,
          conversationMessagesJson: execution.conversationMessagesJson,
        });

      const result: RunStepResult = {
        type: 'step_result',
        runId: body.runId,
        stepId: body.stepId,
        stepIndex: body.stepIndex,
        stage: body.stage,
        status: 'suspended',
        costMicros: totalCostMicros,
        checkpointId: `${body.runId}:conversation:${body.stepIndex}`,
        suspendedConversationJson: JSON.stringify(execution.suspendedConversation),
        questionsJson: execution.suspendedConversation.pendingQuestionsJson,
        provider: execution.provider,
        model: execution.model,
        inputTokens: totalPromptTokens,
        outputTokens: totalCompletionTokens,
        completedAt: Date.now(),
      };
      await this.reportResult(result);
      return Response.json({ ok: true, status: 'suspended' });
    }

    if (body.threadId && this.env.DB && execution.status === 'succeeded') {
      const chatStore = new ChatEventStore(this.env.DB);
      await chatStore.appendEvent({
        threadId: body.threadId,
        eventType: 'assistant_message',
        role: 'assistant',
        payload: {
          version: 1,
          type: 'assistant_message',
          text: execution.responseText,
          runId: body.runId,
        },
        runId: body.runId,
      });
    }

    context.previousOutputs[body.stage] = execution.outputArtifact;

    await this.persistState({
      previousOutputs: context.previousOutputs,
      conversationMessagesJson: execution.conversationMessagesJson,
    });

    const completedAt = Date.now();
    const checkpointStorageKey = `${CHECKPOINT_PREFIX}${body.stepIndex.toString().padStart(6, '0')}`;
    const checkpointId = `${body.runId}:checkpoint:${body.stepIndex}`;
    const errorMessage = execution.status === 'failed'
      ? createErrorMessage(execution.failureReason, execution.validation.errors)
      : undefined;

    const stepCheckpoint: StepCheckpoint = {
      checkpointId,
      runId: body.runId,
      stepId: body.stepId,
      stepIndex: body.stepIndex,
      stage: body.stage,
      stateJson: JSON.stringify({
        stage: body.stage,
        stepIndex: body.stepIndex,
        completedAt,
        status: execution.status,
        validation: execution.validation,
        attempts: execution.attempts,
      }),
      costMicros: totalCostMicros,
      inputTokens: totalPromptTokens,
      outputTokens: totalCompletionTokens,
      provider: execution.provider,
      model: execution.model,
      failureReason: execution.status === 'failed' ? execution.failureReason : undefined,
      errorMessage,
      createdAt: completedAt,
    };

    await this.ctx.storage.put(checkpointStorageKey, stepCheckpoint);
    await this.ctx.storage.put(`${COST_PREFIX}${body.stepIndex.toString().padStart(6, '0')}`, {
      runId: body.runId,
      stepId: body.stepId,
      costMicros: totalCostMicros,
      inputTokens: totalPromptTokens,
      outputTokens: totalCompletionTokens,
      provider: execution.provider,
      model: execution.model,
      createdAt: completedAt,
    });

    const result: RunStepResult = {
      type: 'step_result',
      runId: body.runId,
      stepId: body.stepId,
      stepIndex: body.stepIndex,
      stage: body.stage,
      status: execution.status,
      costMicros: totalCostMicros,
      checkpointId,
      checkpointStateJson: stepCheckpoint.stateJson,
      checkpointArtifactKeysJson: JSON.stringify({ outputArtifactKey: `agent-runs/${body.runId}/stages/${body.stage}/${body.stepIndex}` }),
      outputArtifactKey: `agent-runs/${body.runId}/stages/${body.stage}/${body.stepIndex}`,
      errorMessage,
      provider: execution.provider,
      model: execution.model,
      inputTokens: totalPromptTokens,
      outputTokens: totalCompletionTokens,
      completedAt,
    };

    await this.reportResult(result);

    if (execution.status === 'succeeded') {
      await this.ctx.storage.delete(conversationKey);
    }

    return Response.json({ ok: true, checkpointId, costMicros: totalCostMicros });
  }

  private async handleLastSuccessfulCheckpoint(): Promise<Response> {
    const allCheckpoints = await this.ctx.storage.list<StepCheckpoint>({ prefix: CHECKPOINT_PREFIX });
    const sorted = Array.from(allCheckpoints.values()).sort((a, b) => b.stepIndex - a.stepIndex || b.createdAt - a.createdAt);

    for (const checkpoint of sorted) {
      try {
        const parsed = JSON.parse(checkpoint.stateJson) as { status?: string };
        if (parsed.status !== 'succeeded') {
          continue;
        }

        return Response.json({
          checkpointId: checkpoint.checkpointId,
          stepIndex: checkpoint.stepIndex,
          stateJson: checkpoint.stateJson,
        });
      } catch {
        continue;
      }
    }

    return Response.json({ checkpointId: null, stepIndex: null, stateJson: null });
  }

  private async loadState(): Promise<WorkerExecutionState> {
    const existing = await this.ctx.storage.get<WorkerExecutionState>(STATE_KEY);
    if (existing) {
      return existing;
    }

    return {
      previousOutputs: {},
    };
  }

  private async persistState(state: WorkerExecutionState): Promise<void> {
    await this.ctx.storage.put(STATE_KEY, state);
  }

  private async reportResult(result: RunStepResult): Promise<void> {
    const coordinatorId = this.env.RUN_COORDINATOR.idFromName(result.runId);
    const coordinator = this.env.RUN_COORDINATOR.get(coordinatorId);
    await coordinator.fetch('https://run-coordinator/internal/step-result', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(result),
    });
  }

  private async buildConversationFromChatEvents(threadId: string): Promise<ModelMessage[]> {
    if (!this.env.DB) return [];

    const rows = await this.env.DB
      .prepare('SELECT event_type, content_json FROM chat_events WHERE thread_id = ? ORDER BY seq ASC')
      .bind(threadId)
      .all<{ event_type: string; content_json: string }>();

    const messages: ModelMessage[] = [];
    for (const row of rows.results) {
      try {
        const content = JSON.parse(row.content_json) as { text?: string };
        if (row.event_type === 'user_message' && content.text) {
          messages.push({ role: 'user', content: content.text });
        } else if (row.event_type === 'assistant_message' && content.text) {
          messages.push({ role: 'assistant', content: [{ type: 'text', text: content.text }] });
        }
      } catch { continue; }
    }
    return messages;
  }

  private async getLatestUserMessage(threadId: string): Promise<string | null> {
    if (!this.env.DB) return null;

    const row = await this.env.DB
      .prepare('SELECT content_json FROM chat_events WHERE thread_id = ? AND event_type = ? ORDER BY seq DESC LIMIT 1')
      .bind(threadId, 'user_message')
      .first<{ content_json: string }>();

    if (!row) return null;
    try {
      const content = JSON.parse(row.content_json) as { text?: string };
      return content.text ?? null;
    } catch { return null; }
  }
}
