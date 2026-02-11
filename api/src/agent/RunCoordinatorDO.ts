import { DurableObject } from 'cloudflare:workers';

import type { AgentEventPayload, AgentRunStatus, ClarificationQuestion } from '@slopcade/shared/types/agent-run';
import { logAgentEvent } from '@/agent/observability';
import { processGates } from '@/agent/engine/gate-processor';
import { getStageGateConfig, type StageGateConfig } from '@/agent/stage-gates';
import { ChatEventStore } from '@/chat/chat-event-store';

import type {
  AgentEvent,
  AgentRunSnapshot,
  ClientMessage,
  RunControlLedgerEntry,
  RunStepRequest,
  RunStepResult,
  ServerMessage,
} from './types';

import type { RunState, RunAnswerLedgerEntry, RunExecutionContextRow } from './run-state-machine';
import {
  STATE_KEY,
  MAX_REPLAY_EVENTS,
  COMMAND_KEY_PREFIX,
  ANSWER_KEY_PREFIX,
  LEASE_MS,
  MAX_RECOVERY_ATTEMPTS,
  PLANNING_STAGE_GATES_YAML,
  transitionStatus as transitionStatusFn,
  getStage as getStageFn,
  toSnapshot as toSnapshotFn,
  parseClientMessage as parseClientMessageFn,
} from './run-state-machine';
import { RunEventStore } from './run-event-store';
import { RunBillingBridge } from './run-billing-bridge';
import {
  refreshLease as refreshLeaseFn,
  getLastSuccessfulWorkerCheckpoint,
  settleCompletedUnsettledSteps,
  loadRunExecutionContext,
} from './run-recovery';

type DurableObjectNamespace = import('@cloudflare/workers-types').DurableObjectNamespace;

interface Env {
  RUN_STEP_WORKER: DurableObjectNamespace;
  DB: D1Database;
  OPENROUTER_API_KEY?: string;
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
}

type D1Database = import('@cloudflare/workers-types').D1Database;

export class RunCoordinatorDO extends DurableObject<Env> {
  private clients = new Set<WebSocket>();
  private initialized = false;
  private state!: RunState;
  private eventStore!: RunEventStore;
  private billing!: RunBillingBridge;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.clients = new Set(this.ctx.getWebSockets());
    this.eventStore = new RunEventStore(this.ctx.storage, this.env.DB);
    this.billing = new RunBillingBridge(this.env.DB);
  }

  async fetch(request: Request): Promise<Response> {
    await this.ensureState(request);

    const url = new URL(request.url);
    if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      return this.handleWebSocketUpgrade();
    }

    if (request.method === 'POST' && url.pathname.endsWith('/internal/start')) {
      return this.handleStart(request);
    }

    if (request.method === 'POST' && url.pathname.endsWith('/internal/pause')) {
      return this.handleControl('pause');
    }

    if (request.method === 'POST' && url.pathname.endsWith('/internal/resume')) {
      return this.handleControl('resume');
    }

    if (request.method === 'POST' && url.pathname.endsWith('/internal/resume-from-checkpoint')) {
      return this.handleResumeFromCheckpoint(request);
    }

    if (request.method === 'POST' && url.pathname.endsWith('/internal/cancel')) {
      return this.handleControl('cancel');
    }

    if (request.method === 'POST' && url.pathname.endsWith('/internal/step-result')) {
      return this.handleStepResult(request);
    }

    if (request.method === 'POST' && url.pathname.endsWith('/internal/request-clarification')) {
      return this.handleRequestClarification(request);
    }

    if (request.method === 'POST' && url.pathname.endsWith('/internal/submit-answer')) {
      return this.handleSubmitAnswer(request);
    }

    if (request.method === 'POST' && url.pathname.endsWith('/internal/submit-user-answer')) {
      return this.handleSubmitUserAnswer(request);
    }

    if (request.method === 'POST' && url.pathname.endsWith('/internal/heartbeat')) {
      return this.handleHeartbeat();
    }

    return new Response('Not found', { status: 404 });
  }

  async alarm(): Promise<void> {
    await this.ensureState();
    const now = Date.now();
    if (this.state.status !== 'running') {
      return;
    }
    if (!this.state.leaseExpiresAt || this.state.leaseExpiresAt > now) {
      await this.ctx.storage.setAlarm(now + LEASE_MS);
      return;
    }

    const recovered = await this.attemptRecovery('lease_expired');
    if (this.state.status === 'running') {
      await this.ctx.storage.setAlarm(this.state.leaseExpiresAt ?? Date.now() + LEASE_MS);
    } else if (!recovered && this.state.status !== 'running') {
      await this.ctx.storage.deleteAlarm();
    }
  }

  async webSocketMessage(ws: WebSocket, rawMessage: string | ArrayBuffer): Promise<void> {
    const parsed = this.parseClientMessage(rawMessage);
    if (!parsed) {
      this.send(ws, { type: 'error', message: 'Invalid message', code: 'BAD_MESSAGE' });
      return;
    }

    if (parsed.type === 'connect') {
      await this.handleConnect(ws, parsed);
      return;
    }

    if (parsed.type === 'request_snapshot') {
      const events = await this.getEventsAfter(Math.max(this.state.lastSeq - MAX_REPLAY_EVENTS, 0));
      this.send(ws, {
        type: 'snapshot',
        run: this.toSnapshot(),
        events,
      });
      return;
    }

    if (parsed.type === 'pong') {
      await this.refreshLease();
      return;
    }

    if (parsed.type === 'pause' || parsed.type === 'resume' || parsed.type === 'cancel') {
      const ack = await this.processControlCommand(parsed.type, parsed.commandId);
      this.send(ws, ack);
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    this.clients.delete(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    this.clients.delete(ws);
    try {
      ws.close(1011, 'websocket error');
    } catch {
      // no-op
    }
  }

  private async ensureState(request?: Request): Promise<void> {
    if (this.initialized) {
      return;
    }

    const stored = await this.ctx.storage.get<RunState>(STATE_KEY);
    if (stored) {
      this.state = {
        ...stored,
        stateVersion: stored.stateVersion ?? 0,
        recoveryAttempts: stored.recoveryAttempts ?? 0,
        clarificationQuestions: stored.clarificationQuestions ?? [],
        pendingQuestionId: stored.pendingQuestionId ?? null,
        pendingQuestionBatchId: stored.pendingQuestionBatchId ?? null,
        pendingQuestionsJson: stored.pendingQuestionsJson ?? null,
        suspendedStepIndex: stored.suspendedStepIndex ?? null,
        rawPrompt: stored.rawPrompt ?? null,
        threadId: stored.threadId ?? null,
        gateValues: stored.gateValues ?? {},
        gateLoopIteration: stored.gateLoopIteration ?? 0,
        gateAnswers: stored.gateAnswers ?? [],
      };
      this.initialized = true;
      return;
    }

    const runId = this.resolveRunId(request);
    const now = Date.now();
    this.state = {
      runId,
      status: 'queued',
      stateVersion: 0,
      currentStepIndex: 0,
      totalSteps: 5,
      lastSeq: 0,
      totalCostMicros: 0,
      recoveryAttempts: 0,
      clarificationQuestions: [],
      pendingQuestionId: null,
      pendingQuestionBatchId: null,
      pendingQuestionsJson: null,
      suspendedStepIndex: null,
      rawPrompt: null,
      threadId: null,
      gateValues: {},
      gateLoopIteration: 0,
      gateAnswers: [],
      heartbeatAt: null,
      leaseExpiresAt: null,
      updatedAt: now,
    };
    await this.persistState();
    this.initialized = true;
  }

  private resolveRunId(request?: Request): string {
    if (request) {
      const url = new URL(request.url);
      const runIdParam = url.searchParams.get('runId');
      if (runIdParam) {
        return runIdParam;
      }
    }
    return this.ctx.id.toString();
  }

  private async handleWebSocketUpgrade(): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    this.clients.add(server);

    return new Response(null, { status: 101, webSocket: client });
  }

  private async handleStart(request: Request): Promise<Response> {
    const rawBody = (await request.json().catch(() => null)) as
      | { totalSteps?: number; stepIndex?: number; rawPrompt?: string | null }
      | null;
    const result = await this.ctx.blockConcurrencyWhile(async () => {
      if (this.state.status === 'running') {
        return {
          ok: true as const,
          dispatch: false,
          snapshot: this.toSnapshot(),
        };
      }

      if (this.state.status !== 'queued') {
        console.log('[coordinator] CAS guard rejected start transition', {
          runId: this.state.runId,
          currentStatus: this.state.status,
          currentStateVersion: this.state.stateVersion,
          expectedStatus: 'queued',
        });

        return {
          ok: false as const,
          reason: `Invalid start transition from status ${this.state.status}`,
          snapshot: this.toSnapshot(),
        };
      }

      if (typeof rawBody?.totalSteps === 'number' && rawBody.totalSteps > 0) {
        this.state.totalSteps = Math.floor(rawBody.totalSteps);
      }

      if (typeof rawBody?.stepIndex === 'number' && Number.isFinite(rawBody.stepIndex)) {
        this.state.currentStepIndex = Math.max(0, Math.min(Math.floor(rawBody.stepIndex), this.state.totalSteps));
      }

      if (typeof rawBody?.rawPrompt === 'string') {
        this.state.rawPrompt = rawBody.rawPrompt;
      } else if (rawBody?.rawPrompt === null) {
        this.state.rawPrompt = null;
      }
      this.state.gateValues = {};
      this.state.gateLoopIteration = 0;
      this.state.gateAnswers = [];

      const threadRow = await this.env.DB
        .prepare('SELECT thread_id FROM agent_runs WHERE id = ?')
        .bind(this.state.runId)
        .first<{ thread_id: string | null }>();
      this.state.threadId = threadRow?.thread_id ?? null;

      this.transitionStatus('running');
      this.state.recoveryAttempts = 0;
      await this.refreshLease();

      const executionContext = await this.loadRunExecutionContext();
      logAgentEvent({
        event: 'agent_run.coordinator_started',
        runId: this.state.runId,
        userId: executionContext?.user_id,
        tier: executionContext?.tier,
        metadata: {
          currentStepIndex: this.state.currentStepIndex,
          totalSteps: this.state.totalSteps,
          stateVersion: this.state.stateVersion,
        },
      });

      return {
        ok: true as const,
        dispatch: true,
        snapshot: this.toSnapshot(),
      };
    });

    if (!result.ok) {
      return Response.json(
        {
          ok: false,
          reason: result.reason,
          currentState: {
            status: this.state.status,
            stateVersion: this.state.stateVersion,
          },
        },
        { status: 409 }
      );
    }

    if (result.dispatch) {
      this.ctx.waitUntil(this.dispatchNextStep());
    }

    return Response.json(result.snapshot);
  }

  private async handleControl(type: 'pause' | 'resume' | 'cancel'): Promise<Response> {
    const commandId = crypto.randomUUID();
    const result = await this.processControlCommand(type, commandId);

    if (result.result === 'rejected') {
      return Response.json({ ok: false, reason: result.reason }, { status: 409 });
    }

    return Response.json({ ok: true });
  }

  private async handleResumeFromCheckpoint(request: Request): Promise<Response> {
    const body = (await request.json().catch(() => null)) as
      | { resumeFromStepIndex?: number; allowStatuses?: AgentRunStatus[] }
      | null;

    const requestedStep = typeof body?.resumeFromStepIndex === 'number'
      ? Math.max(0, Math.floor(body.resumeFromStepIndex))
      : null;
    const allowedStatuses = body?.allowStatuses ?? ['paused', 'failed', 'waiting_for_input'];
    const resumableStatuses: AgentRunStatus[] = ['paused', 'failed', 'waiting_for_input'];
    const effectiveAllowedStatuses = allowedStatuses.filter((status): status is AgentRunStatus =>
      resumableStatuses.includes(status)
    );

    const transitionResult = await this.ctx.blockConcurrencyWhile(async () => {
      if (!effectiveAllowedStatuses.includes(this.state.status) || !resumableStatuses.includes(this.state.status)) {
        return {
          ok: false as const,
          reason: `Run status ${this.state.status} is not resumable`,
        };
      }

      let resumeStepIndex = requestedStep;
      if (resumeStepIndex === null) {
        const checkpoint = await this.getLastSuccessfulWorkerCheckpoint();
        if (checkpoint?.stepIndex !== null && checkpoint?.stepIndex !== undefined) {
          await this.settleCompletedUnsettledSteps(checkpoint.stepIndex);
        }
        resumeStepIndex = checkpoint?.stepIndex !== null && checkpoint?.stepIndex !== undefined
          ? checkpoint.stepIndex + 1
          : this.state.currentStepIndex;
      }

      const normalizedResumeStep = resumeStepIndex ?? this.state.currentStepIndex;
      this.state.currentStepIndex = Math.min(normalizedResumeStep, this.state.totalSteps);
      this.transitionStatus('running');
      this.state.recoveryAttempts = 0;
      await this.refreshLease();

      console.log('[coordinator] Resuming from checkpoint', {
        runId: this.state.runId,
        resumeFromStepIndex: this.state.currentStepIndex,
        previousStatus: effectiveAllowedStatuses.includes(this.state.status) ? 'allowed' : 'unknown',
        stateVersion: this.state.stateVersion,
      });

      await this.emitEvent('run_resumed', { type: 'run_resumed' });

      return {
        ok: true as const,
        resumeFromStepIndex: this.state.currentStepIndex,
      };
    });

    if (!transitionResult.ok) {
      return Response.json(
        {
          ok: false,
          reason: transitionResult.reason,
          currentState: {
            status: this.state.status,
            stateVersion: this.state.stateVersion,
          },
        },
        { status: 409 }
      );
    }

    this.ctx.waitUntil(this.dispatchNextStep());
    return Response.json({ ok: true, resumeFromStepIndex: transitionResult.resumeFromStepIndex });
  }

  private async handleStepResult(request: Request): Promise<Response> {
    const result = (await request.json()) as RunStepResult;

    if (result.type !== 'step_result' || result.runId !== this.state.runId) {
      return new Response('Invalid step result payload', { status: 400 });
    }

    if (this.state.status !== 'running') {
      return new Response('Run is not running', { status: 409 });
    }

    await this.refreshLease();
    await this.persistCheckpointRecord(result);
    await this.updateStepStatus(result);

    if (result.status === 'suspended' && result.questionsJson) {
      const questions = JSON.parse(result.questionsJson) as {
        questions: Array<{
          question: string;
          header: string;
          options: Array<{ label: string; description: string; iconKey?: string }>;
          multiple?: boolean;
        }>;
      };
      const batchId = crypto.randomUUID();

      this.state.pendingQuestionBatchId = batchId;
      this.state.pendingQuestionsJson = result.questionsJson;
      this.state.suspendedStepIndex = result.stepIndex;

      this.transitionStatus('waiting_for_input');
      this.state.leaseExpiresAt = null;
      await this.ctx.storage.deleteAlarm();
      await this.persistState();

      await this.emitEvent('user_question', {
        type: 'user_question',
        batchId,
        questions: questions.questions,
        stage: this.getStage(result.stepIndex),
        stepIndex: result.stepIndex,
      });

      return Response.json({ ok: true });
    }

    if (result.status === 'failed') {
      await this.emitEvent('step_failed', {
        type: 'step_failed',
        stepId: result.stepId,
        stepIndex: result.stepIndex,
        errorMessage: result.errorMessage ?? 'Unknown step error',
      });

      this.transitionStatus('failed');
      this.state.currentStepIndex = result.stepIndex;
      await this.persistState(result.errorMessage ?? 'Step execution failed');

      await this.emitEvent('run_failed', {
        type: 'run_failed',
        errorMessage: result.errorMessage ?? 'Step execution failed',
      });

      const executionContext = await this.loadRunExecutionContext();
      logAgentEvent({
        event: 'agent_run.failed',
        runId: this.state.runId,
        userId: executionContext?.user_id,
        tier: executionContext?.tier,
        stepIndex: result.stepIndex,
        error: result.errorMessage ?? 'Step execution failed',
        costMicros: this.state.totalCostMicros,
      });

      return Response.json({ ok: true });
    }

    await this.settleStepBilling(result);

    this.state.totalCostMicros += result.costMicros;
    this.state.currentStepIndex = result.stepIndex + 1;
    await this.persistState();

    await this.emitEvent('step_completed', {
      type: 'step_completed',
      stepId: result.stepId,
      stepIndex: result.stepIndex,
      outputArtifactKey: result.outputArtifactKey,
    });
    await this.emitEvent('checkpoint_ready', {
      type: 'checkpoint_ready',
      checkpointId: result.checkpointId,
      stepIndex: result.stepIndex,
    });
    await this.emitEvent('cost_recorded', {
      type: 'cost_recorded',
      costMicros: result.costMicros,
      provider: result.provider,
      model: result.model,
    });

    if (result.status === 'succeeded' && result.stage === 'chat' && this.state.threadId) {
      const chatStore = new ChatEventStore(this.env.DB);
      await chatStore.appendEvent({
        threadId: this.state.threadId,
        eventType: 'system',
        role: null,
        payload: {
          version: 1,
          type: 'system',
          text: `Chat step ${result.stepIndex} completed`,
          level: 'info',
        },
        runId: this.state.runId,
      });
    }

    const executionContext = await this.loadRunExecutionContext();
    const stage = this.getStage(result.stepIndex);
    logAgentEvent({
      event: 'agent_run.step_completed',
      runId: this.state.runId,
      userId: executionContext?.user_id,
      tier: executionContext?.tier,
      stepIndex: result.stepIndex,
      stage,
      costMicros: result.costMicros,
      metadata: {
        provider: result.provider,
        model: result.model,
        outputArtifactKey: result.outputArtifactKey,
      },
    });

    if (this.state.currentStepIndex >= this.state.totalSteps) {
      this.transitionStatus('succeeded');
      await this.persistState();
      await this.emitEvent('run_completed', {
        type: 'run_completed',
        totalSteps: this.state.totalSteps,
        totalCostMicros: this.state.totalCostMicros,
      });

      const runRow = await this.env.DB
        .prepare('SELECT started_at FROM agent_runs WHERE id = ?')
        .bind(this.state.runId)
        .first<{ started_at: number | null }>();
      
      const durationMs = runRow?.started_at ? this.state.updatedAt - runRow.started_at : undefined;

      logAgentEvent({
        event: 'agent_run.completed',
        runId: this.state.runId,
        userId: executionContext?.user_id,
        tier: executionContext?.tier,
        costMicros: this.state.totalCostMicros,
        durationMs,
        metadata: {
          totalSteps: this.state.totalSteps,
        },
      });

      return Response.json({ ok: true });
    }

    this.ctx.waitUntil(this.dispatchNextStep());
    return Response.json({ ok: true });
  }

  private async handleRequestClarification(request: Request): Promise<Response> {
    const body = (await request.json().catch(() => null)) as {
      questionId?: string;
      question?: string;
      stage?: string;
      stepIndex?: number;
      context?: string;
    } | null;

    if (!body?.questionId || !body.question || !body.stage || typeof body.stepIndex !== 'number') {
      return Response.json({ ok: false, reason: 'Invalid clarification request payload' }, { status: 400 });
    }

    const stepIndex = Number.isFinite(body.stepIndex) ? Math.max(0, Math.floor(body.stepIndex)) : null;
    if (stepIndex === null) {
      return Response.json({ ok: false, reason: 'Invalid clarification step index' }, { status: 400 });
    }
    const questionId = body.questionId;
    const questionText = body.question;
    const stage = body.stage;
    const context = body.context ?? null;

    const result = await this.ctx.blockConcurrencyWhile(async () => {
      if (this.state.status === 'waiting_for_input' && this.state.pendingQuestionId === questionId) {
        return { ok: true as const, duplicate: true as const };
      }

      if (this.state.status !== 'running') {
        return {
          ok: false as const,
          reason: `Cannot request clarification while run is ${this.state.status}`,
        };
      }

      const question: ClarificationQuestion = {
        questionId,
        question: questionText,
        stage,
        stepIndex,
        context: context ?? undefined,
      };

      const existingIndex = this.state.clarificationQuestions.findIndex((entry) => entry.questionId === questionId);
      if (existingIndex >= 0) {
        this.state.clarificationQuestions[existingIndex] = question;
      } else {
        this.state.clarificationQuestions.push(question);
      }

      this.transitionStatus('waiting_for_input');
      this.state.pendingQuestionId = questionId;
      this.state.leaseExpiresAt = null;
      await this.ctx.storage.deleteAlarm();
      await this.persistState();

      console.log('[coordinator] Transitioning to waiting_for_input', {
        runId: this.state.runId,
        questionId,
        stage,
        stepIndex,
        stateVersion: this.state.stateVersion,
      });

      await this.emitEvent('clarification_requested', {
        type: 'clarification_requested',
        questionId,
        question: questionText,
        stage,
        stepIndex,
        context: context ?? undefined,
      });

      return { ok: true as const, duplicate: false as const };
    });

    if (!result.ok) {
      return Response.json(
        {
          ok: false,
          reason: result.reason,
          currentState: {
            status: this.state.status,
            stateVersion: this.state.stateVersion,
          },
        },
        { status: 409 }
      );
    }

    return Response.json({
      ok: true,
      duplicate: result.duplicate,
      status: this.state.status,
      stateVersion: this.state.stateVersion,
      pendingQuestionId: this.state.pendingQuestionId,
    });
  }

  private async handleSubmitAnswer(request: Request): Promise<Response> {
    const body = (await request.json().catch(() => null)) as {
      questionId?: string;
      answer?: string;
      submissionId?: string;
    } | null;

    const questionId = body?.questionId?.trim();
    const answer = body?.answer?.trim();
    const submissionId = body?.submissionId?.trim() || crypto.randomUUID();

    if (!questionId || !answer) {
      return Response.json({ ok: false, reason: 'Invalid answer payload' }, { status: 400 });
    }

    const key = `${ANSWER_KEY_PREFIX}${submissionId}`;
    const existing = await this.ctx.storage.get<RunAnswerLedgerEntry>(key);
    if (existing) {
      return Response.json({
        ok: existing.result === 'accepted',
        duplicate: true,
        reason: existing.reason,
      }, { status: existing.result === 'accepted' ? 200 : 409 });
    }

    const now = Date.now();
    const result = await this.ctx.blockConcurrencyWhile(async () => {
      const alreadyProcessed = await this.ctx.storage.get<RunAnswerLedgerEntry>(key);
      if (alreadyProcessed) {
        return {
          ok: alreadyProcessed.result === 'accepted',
          duplicate: true as const,
          reason: alreadyProcessed.reason,
        };
      }

      if (this.state.status !== 'waiting_for_input') {
        const rejected: RunAnswerLedgerEntry = {
          submissionId,
          questionId,
          result: 'rejected',
          reason: `Run is not waiting for input (status=${this.state.status}, stateVersion=${this.state.stateVersion})`,
          processedAt: now,
        };
        await this.ctx.storage.put(key, rejected);
        return { ok: false, duplicate: false as const, reason: rejected.reason };
      }

      if (this.state.pendingQuestionId !== questionId) {
        const rejected: RunAnswerLedgerEntry = {
          submissionId,
          questionId,
          result: 'rejected',
          reason: `Question ${questionId} is not the pending clarification`,
          processedAt: now,
        };
        await this.ctx.storage.put(key, rejected);
        return { ok: false, duplicate: false as const, reason: rejected.reason };
      }

      const questionIndex = this.state.clarificationQuestions.findIndex((entry) => entry.questionId === questionId);
      if (questionIndex < 0) {
        const rejected: RunAnswerLedgerEntry = {
          submissionId,
          questionId,
          result: 'rejected',
          reason: `Unknown clarification question ${questionId}`,
          processedAt: now,
        };
        await this.ctx.storage.put(key, rejected);
        return { ok: false, duplicate: false as const, reason: rejected.reason };
      }

      const answeredAt = Date.now();
      const answeredQuestion = this.state.clarificationQuestions[questionIndex];
      this.state.clarificationQuestions[questionIndex] = {
        ...answeredQuestion,
        answer,
        answeredAt,
      };
      this.state.gateAnswers.push({
        question: answeredQuestion.question,
        answer,
      });
      this.state.pendingQuestionId = null;
      await this.persistState();

      await this.emitEvent('clarification_answered', {
        type: 'clarification_answered',
        questionId,
        answer,
      });

      this.transitionStatus('running');
      this.state.recoveryAttempts = 0;
      await this.refreshLease();

      console.log('[coordinator] Resuming from waiting_for_input', {
        runId: this.state.runId,
        questionId,
        answerLength: answer.length,
        currentStepIndex: this.state.currentStepIndex,
        stateVersion: this.state.stateVersion,
      });

      const accepted: RunAnswerLedgerEntry = {
        submissionId,
        questionId,
        result: 'accepted',
        processedAt: now,
      };
      await this.ctx.storage.put(key, accepted);

      return {
        ok: true,
        duplicate: false as const,
      };
    });

    if (result.ok) {
      const stage = this.getStage(this.state.currentStepIndex);
      if (this.state.currentStepIndex === 0 && this.state.rawPrompt !== null && stage === 'planning') {
        this.ctx.waitUntil(this.runGateLoop());
      } else {
        this.ctx.waitUntil(this.dispatchNextStep());
      }
    }

    return Response.json(
      {
        ok: result.ok,
        duplicate: result.duplicate,
        reason: result.reason,
      },
      { status: result.ok ? 200 : 409 }
    );
  }

  private async handleSubmitUserAnswer(request: Request): Promise<Response> {
    const body = (await request.json().catch(() => null)) as {
      batchId?: string;
      answers?: string[][];
    } | null;

    if (!body?.batchId || !Array.isArray(body.answers)) {
      return Response.json({ ok: false, reason: 'Invalid answer payload' }, { status: 400 });
    }

    const answers = body.answers;

    const result = await this.ctx.blockConcurrencyWhile(async () => {
      if (this.state.status !== 'waiting_for_input') {
        return {
          ok: false as const,
          reason: `Run is not waiting for input (status=${this.state.status})`,
        };
      }

      if (this.state.pendingQuestionBatchId !== body.batchId) {
        return { ok: false as const, reason: 'Batch ID mismatch' };
      }

      if (!this.state.pendingQuestionsJson || this.state.suspendedStepIndex === null) {
        return { ok: false as const, reason: 'No suspended question batch pending' };
      }

      const questionsData = JSON.parse(this.state.pendingQuestionsJson) as {
        questions: Array<{ header: string }>;
      };
      const answerText = questionsData.questions
        .map((question, index) => `"${question.header}"="${answers[index]?.join(', ') ?? ''}"`)
        .join(', ');
      const formattedAnswer = `User answered your questions: ${answerText}`;

      await this.emitEvent('user_answer', {
        type: 'user_answer',
        batchId: body.batchId,
        answers,
      });

      const stepIndex = this.state.suspendedStepIndex;
      this.state.pendingQuestionBatchId = null;
      this.state.pendingQuestionsJson = null;
      this.state.suspendedStepIndex = null;
      this.transitionStatus('running');
      this.state.recoveryAttempts = 0;
      await this.refreshLease();

      const executionContext = await this.loadRunExecutionContext();
      const resumeStepRow = await this.env.DB
        .prepare('SELECT id FROM agent_steps WHERE run_id = ? AND step_index = ?')
        .bind(this.state.runId, stepIndex)
        .first<{ id: string }>();
      const resumeStepId = resumeStepRow?.id ?? `${this.state.runId}:step:${stepIndex}`;
      const workerId = this.env.RUN_STEP_WORKER.idFromName(this.state.runId);
      const worker = this.env.RUN_STEP_WORKER.get(workerId);

      this.ctx.waitUntil(
        worker.fetch('https://run-step-worker/internal/resume', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            runId: this.state.runId,
            stepId: resumeStepId,
            stepIndex,
            stage: this.getStage(stepIndex),
            tier: executionContext?.tier ?? 'free',
            answerText: formattedAnswer,
            gameTitle: executionContext?.game_title,
            gameDescription: executionContext?.game_description,
            threadId: this.state.threadId,
          }),
        })
      );

      return { ok: true as const };
    });

    if (!result.ok) {
      return Response.json({ ok: false, reason: result.reason }, { status: 409 });
    }

    return Response.json({ ok: true });
  }

  private async persistCheckpointRecord(result: RunStepResult): Promise<void> {
    await this.billing.persistCheckpoint(result);
  }

  private async updateStepStatus(result: RunStepResult): Promise<void> {
    await this.billing.updateStepStatus(result);
  }

  private async settleStepBilling(result: RunStepResult): Promise<void> {
    await this.billing.settleStep(result);
  }

  private async handleHeartbeat(): Promise<Response> {
    await this.refreshLease();
    return Response.json({ ok: true, leaseExpiresAt: this.state.leaseExpiresAt });
  }

  private parseClientMessage(rawMessage: string | ArrayBuffer): ClientMessage | null {
    return parseClientMessageFn(rawMessage);
  }

  private async handleConnect(
    ws: WebSocket,
    connectMessage: Extract<ClientMessage, { type: 'connect' }>
  ): Promise<void> {
    if (connectMessage.runId !== this.state.runId) {
      this.send(ws, {
        type: 'error',
        message: `runId mismatch: expected ${this.state.runId}`,
        code: 'RUN_ID_MISMATCH',
      });
      return;
    }

    const lastSeq = connectMessage.lastSeq ?? 0;
    this.send(ws, {
      type: 'connected',
      runId: this.state.runId,
      status: this.state.status,
      lastSeq: this.state.lastSeq,
      stateVersion: this.state.stateVersion,
    });

    const missingEvents = await this.getEventsAfter(lastSeq);
    for (const event of missingEvents) {
      this.send(ws, {
        type: 'event',
        seq: event.seq,
        stateVersion: event.stateVersion,
        eventType: event.eventType,
        payload: event.payload,
        timestamp: event.timestamp,
      });
    }

    if (this.state.status === 'queued' || this.state.status === 'planning') {
      await this.ctx.blockConcurrencyWhile(async () => {
        if (this.state.status !== 'queued' && this.state.status !== 'planning') {
          return;
        }
        this.transitionStatus('running');
        await this.refreshLease();
      });
      this.ctx.waitUntil(this.dispatchNextStep());
    }
  }

  private async processControlCommand(
    type: 'pause' | 'resume' | 'cancel',
    commandId: string
  ): Promise<Extract<ServerMessage, { type: 'control_ack' }>> {
    const key = `${COMMAND_KEY_PREFIX}${commandId}`;
    const existing = await this.ctx.storage.get<RunControlLedgerEntry>(key);
    if (existing) {
      return {
        type: 'control_ack',
        commandId,
        result: existing.result,
        reason: existing.reason,
      };
    }

    const now = Date.now();
    const response = await this.ctx.blockConcurrencyWhile(async () => {
      const alreadyProcessed = await this.ctx.storage.get<RunControlLedgerEntry>(key);
      if (alreadyProcessed) {
        return {
          type: 'control_ack' as const,
          commandId,
          result: alreadyProcessed.result,
          reason: alreadyProcessed.reason,
        };
      }

      const sourceStatus = this.state.status;
      const commandRules: Record<'pause' | 'resume' | 'cancel', { sources: AgentRunStatus[]; target: AgentRunStatus }> = {
        pause: { sources: ['running'], target: 'paused' },
        resume: { sources: ['paused'], target: 'running' },
        cancel: { sources: ['running', 'waiting_for_input', 'paused', 'queued'], target: 'canceled' },
      };
      const rule = commandRules[type];

      if (sourceStatus === rule.target) {
        const duplicateAccepted: RunControlLedgerEntry = {
          commandId,
          type,
          result: 'accepted',
          reason: `No-op: run already ${rule.target}`,
          processedAt: now,
        };
        await this.ctx.storage.put(key, duplicateAccepted);
        return {
          type: 'control_ack' as const,
          commandId,
          result: 'accepted' as const,
          reason: duplicateAccepted.reason,
        };
      }

      if (!rule.sources.includes(sourceStatus)) {
        const rejected: RunControlLedgerEntry = {
          commandId,
          type,
          result: 'rejected',
          reason: `Invalid ${type} transition from status ${sourceStatus} (stateVersion=${this.state.stateVersion})`,
          processedAt: now,
        };
        await this.ctx.storage.put(key, rejected);
        return {
          type: 'control_ack' as const,
          commandId,
          result: 'rejected' as const,
          reason: rejected.reason,
        };
      }

      if (type === 'pause') {
        this.transitionStatus('paused');
        await this.persistState();
        await this.emitEvent('run_paused', { type: 'run_paused', reason: 'Paused by user command' });
      } else if (type === 'resume') {
        this.transitionStatus('running');
        this.state.recoveryAttempts = 0;
        await this.refreshLease();
        await this.emitEvent('run_resumed', { type: 'run_resumed' });
        this.ctx.waitUntil(this.dispatchNextStep());
      } else {
        this.transitionStatus('canceled');
        await this.persistState();
        await this.emitEvent('run_canceled', {
          type: 'run_canceled',
          reason: 'Canceled by user command',
        });
      }

      const accepted: RunControlLedgerEntry = {
        commandId,
        type,
        result: 'accepted',
        processedAt: now,
      };
      await this.ctx.storage.put(key, accepted);

      return {
        type: 'control_ack' as const,
        commandId,
        result: 'accepted' as const,
      };
    });

    return response;
  }

  private async attemptRecovery(reason: 'lease_expired' | 'manual_resume'): Promise<boolean> {
    return this.ctx.blockConcurrencyWhile(async () => {
      if (this.state.status !== 'running') {
        return false;
      }

      const nextRecoveryAttempt = this.state.recoveryAttempts + 1;
      this.state.recoveryAttempts = nextRecoveryAttempt;

      await this.emitEvent('error', {
        type: 'error',
        errorMessage: `Recovery attempt ${nextRecoveryAttempt}/${MAX_RECOVERY_ATTEMPTS}`,
        errorContext: `run:${this.state.runId}:${reason}`,
      });

      const executionContext = await this.loadRunExecutionContext();
      logAgentEvent({
        event: 'agent_run.recovery_attempted',
        runId: this.state.runId,
        userId: executionContext?.user_id,
        tier: executionContext?.tier,
        metadata: {
          reason,
          attempt: nextRecoveryAttempt,
          maxAttempts: MAX_RECOVERY_ATTEMPTS,
        },
      });

      try {
        const checkpoint = await this.getLastSuccessfulWorkerCheckpoint();
        if (checkpoint?.stepIndex !== null && checkpoint?.stepIndex !== undefined) {
          await this.settleCompletedUnsettledSteps(checkpoint.stepIndex);
        }
        const resumeFromStepIndex = checkpoint?.stepIndex !== null && checkpoint?.stepIndex !== undefined
          ? checkpoint.stepIndex + 1
          : this.state.currentStepIndex;

        this.state.currentStepIndex = Math.min(resumeFromStepIndex, this.state.totalSteps);
        await this.refreshLease();
        this.ctx.waitUntil(this.dispatchNextStep());
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await this.emitEvent('error', {
          type: 'error',
          errorMessage: `Recovery dispatch failed: ${message}`,
          errorContext: `run:${this.state.runId}:${reason}`,
        });

        if (nextRecoveryAttempt >= MAX_RECOVERY_ATTEMPTS) {
          this.transitionStatus('failed');
          this.state.leaseExpiresAt = null;
          this.state.heartbeatAt = Date.now();
          await this.persistState('recovery_exhausted');
          await this.emitEvent('run_failed', {
            type: 'run_failed',
            errorMessage: 'recovery_exhausted',
          });

          logAgentEvent({
            event: 'agent_run.recovery_exhausted',
            runId: this.state.runId,
            userId: executionContext?.user_id,
            tier: executionContext?.tier,
            error: 'recovery_exhausted',
            metadata: {
              reason,
              attempts: nextRecoveryAttempt,
            },
          });
        } else {
          await this.persistState();
        }

        return false;
      }
    });
  }

  private async getLastSuccessfulWorkerCheckpoint() {
    return getLastSuccessfulWorkerCheckpoint(this.state.runId, this.env.RUN_STEP_WORKER);
  }

  private async settleCompletedUnsettledSteps(throughStepIndex: number): Promise<void> {
    return settleCompletedUnsettledSteps(this.state, this.env.DB, this.billing, throughStepIndex);
  }

  private async runGateLoop(): Promise<void> {
    if (this.state.status !== 'running') {
      return;
    }

    if (this.state.currentStepIndex !== 0 || this.state.rawPrompt === null) {
      return;
    }

    const executionContext = await this.loadRunExecutionContext();
    if (!executionContext) {
      await this.emitEvent('error', {
        type: 'error',
        errorMessage: 'Missing run execution context while evaluating planning gates',
        errorContext: `run:${this.state.runId}:step:0`,
      });

      this.transitionStatus('failed');
      await this.persistState('Missing execution context');
      await this.emitEvent('run_failed', {
        type: 'run_failed',
        errorMessage: 'Missing execution context',
      });
      return;
    }

    const planningConfig: StageGateConfig = getStageGateConfig('planning', PLANNING_STAGE_GATES_YAML);
    const stepRow = await this.env.DB
      .prepare('SELECT id FROM agent_steps WHERE run_id = ? AND step_index = 0')
      .bind(this.state.runId)
      .first<{ id: string }>();
    const stepId = stepRow?.id ?? `${this.state.runId}:step:0`;
    const now = Date.now();

    if (this.state.gateLoopIteration === 0) {
      await this.env.DB.prepare(
        `UPDATE agent_steps
         SET status = 'running',
             started_at = COALESCE(started_at, ?)
         WHERE run_id = ? AND step_index = 0`
      )
        .bind(now, this.state.runId)
        .run();

      await this.emitEvent('step_started', {
        type: 'step_started',
        stepId,
        stepIndex: 0,
        stage: 'planning',
      });

      logAgentEvent({
        event: 'agent_run.step_dispatched',
        runId: this.state.runId,
        userId: executionContext.user_id,
        tier: executionContext.tier,
        stepIndex: 0,
        stage: 'planning',
      });
    }

    const gateResult = await processGates(
      {
        stageConfig: planningConfig,
        userPrompt: this.state.rawPrompt,
        previousAnswers: this.state.gateAnswers,
        currentGateValues: this.state.gateValues,
      },
      {
        tier: executionContext.tier,
        env: {
          OPENROUTER_API_KEY: this.env.OPENROUTER_API_KEY,
        },
      }
    );

    this.state.gateValues = gateResult.gateValues;
    this.state.gateLoopIteration += 1;
    await this.persistState();

    await this.emitEvent('gate_values_updated', {
      type: 'gate_values_updated',
      stage: planningConfig.stage,
      gateValues: gateResult.gateValues,
      satisfiedFields: gateResult.satisfiedFields,
      unsatisfiedFields: gateResult.unsatisfiedFields,
    });

    if (gateResult.unsatisfiedFields.length === 0) {
      const finishedAt = Date.now();
      await this.env.DB.prepare(
        `UPDATE agent_steps
         SET status = 'succeeded',
             finished_at = ?,
             started_at = COALESCE(started_at, ?)
         WHERE run_id = ? AND step_index = 0`
      )
        .bind(finishedAt, finishedAt, this.state.runId)
        .run();

      await this.emitEvent('planning_complete', {
        type: 'planning_complete',
        stage: planningConfig.stage,
        finalGateValues: gateResult.gateValues,
      });

      await this.emitEvent('step_completed', {
        type: 'step_completed',
        stepId,
        stepIndex: 0,
      });

      this.state.currentStepIndex = 1;
      this.state.pendingQuestionId = null;
      this.transitionStatus('running');
      await this.persistState();
      await this.dispatchNextStep();
      return;
    }

    const generatedQuestions = gateResult.questions.length > 0
      ? gateResult.questions
      : gateResult.unsatisfiedFields.map((fieldId) => {
        const field = planningConfig.gates.find((gate) => gate.id === fieldId);
        return {
          questionId: crypto.randomUUID(),
          question: `Please provide ${field?.label ?? fieldId}.`,
          context: field?.description,
        };
      });

    const questions: ClarificationQuestion[] = generatedQuestions.map((item) => ({
      questionId: item.questionId,
      question: item.question,
      stage: planningConfig.stage,
      stepIndex: 0,
      context: item.context,
    }));

    this.state.clarificationQuestions = [
      ...this.state.clarificationQuestions.filter((question) => question.stepIndex !== 0 || question.answer),
      ...questions,
    ];

    this.transitionStatus('waiting_for_input');
    this.state.pendingQuestionId = questions[0]?.questionId ?? null;
    this.state.leaseExpiresAt = null;
    await this.ctx.storage.deleteAlarm();
    await this.persistState();

    for (const question of questions) {
      await this.emitEvent('clarification_requested', {
        type: 'clarification_requested',
        questionId: question.questionId,
        question: question.question,
        stage: question.stage,
        stepIndex: question.stepIndex,
        context: question.context,
      });
    }
  }

  private async dispatchNextStep(): Promise<void> {
    if (this.state.status !== 'running') {
      return;
    }

    const stepIndex = this.state.currentStepIndex;
    if (stepIndex >= this.state.totalSteps) {
      return;
    }

    const stage: RunStepRequest['stage'] = this.getStage(stepIndex);

    if (stepIndex === 0 && this.state.rawPrompt !== null && stage === 'planning') {
      await this.runGateLoop();
      return;
    }

    const executionContext = await this.loadRunExecutionContext();

    if (!executionContext) {
      await this.emitEvent('error', {
        type: 'error',
        errorMessage: 'Missing run execution context while dispatching step',
        errorContext: `run:${this.state.runId}:step:${stepIndex}`,
      });

      this.transitionStatus('failed');
      await this.persistState();
      await this.emitEvent('run_failed', {
        type: 'run_failed',
        errorMessage: 'Missing execution context',
      });
      return;
    }

    const stepRow = await this.env.DB
      .prepare('SELECT id FROM agent_steps WHERE run_id = ? AND step_index = ?')
      .bind(this.state.runId, stepIndex)
      .first<{ id: string }>();
    const stepId = stepRow?.id ?? `${this.state.runId}:step:${stepIndex}`;

    const request: RunStepRequest = {
      type: 'execute_step',
      runId: this.state.runId,
      stepId,
      stepIndex,
      stage,
      startedAt: Date.now(),
      tier: executionContext.tier,
      gameId: executionContext.game_id,
      gameTitle: executionContext.game_title,
      gameDescription: executionContext.game_description,
      planningDocJson: executionContext.planning_doc_json,
      threadId: this.state.threadId,
    };

    const now = Date.now();
    await this.env.DB.prepare(
      `UPDATE agent_steps
       SET status = 'running',
           started_at = COALESCE(started_at, ?)
       WHERE run_id = ? AND step_index = ?`
    )
      .bind(now, this.state.runId, stepIndex)
      .run();

    await this.emitEvent('step_started', {
      type: 'step_started',
      stepId,
      stepIndex,
      stage,
    });

    logAgentEvent({
      event: 'agent_run.step_dispatched',
      runId: this.state.runId,
      userId: executionContext.user_id,
      tier: executionContext.tier,
      stepIndex,
      stage,
    });

    const workerId = this.env.RUN_STEP_WORKER.idFromName(this.state.runId);
    const workerStub = this.env.RUN_STEP_WORKER.get(workerId);
    await workerStub.fetch('https://run-step/internal/execute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
    });
  }

  private async loadRunExecutionContext(): Promise<RunExecutionContextRow | null> {
    return loadRunExecutionContext(this.state.runId, this.env.DB);
  }

  private getStage(stepIndex: number): RunStepRequest['stage'] {
    return getStageFn(stepIndex);
  }

  private async emitEvent(
    eventType: AgentEvent['eventType'],
    payload: AgentEventPayload
  ): Promise<void> {
    const event = await this.eventStore.append(this.state, eventType, payload);
    await this.persistState();
    await this.eventStore.prune(event.seq);
    this.broadcast(this.eventStore.toServerMessage(event));
  }

  private async getEventsAfter(lastSeq: number): Promise<AgentEvent[]> {
    return this.eventStore.getAfter(lastSeq);
  }

  private async refreshLease(): Promise<void> {
    await refreshLeaseFn(this.state, this.ctx.storage);
    await this.persistState();
  }

  private toSnapshot(): AgentRunSnapshot {
    return toSnapshotFn(this.state);
  }

  private transitionStatus(nextStatus: AgentRunStatus): void {
    transitionStatusFn(this.state, nextStatus);
  }

  private broadcast(message: ServerMessage): void {
    const serialized = JSON.stringify(message);
    for (const ws of this.clients) {
      this.sendRaw(ws, serialized);
    }
  }

  private send(ws: WebSocket, message: ServerMessage): void {
    this.sendRaw(ws, JSON.stringify(message));
  }

  private sendRaw(ws: WebSocket, payload: string): void {
    try {
      ws.send(payload);
    } catch {
      this.clients.delete(ws);
      try {
        ws.close(1011, 'send failed');
      } catch {
        // no-op
      }
    }
  }

  private async persistState(errorMessage?: string | null): Promise<void> {
    this.state.updatedAt = Date.now();
    await Promise.all([
      this.ctx.storage.put(STATE_KEY, this.state),
      this.env.DB
        .prepare(
          `UPDATE agent_runs
           SET status = ?,
               current_step_index = ?,
               total_steps = ?,
               actual_cost_micros = ?,
               error_message = ?,
               updated_at = ?,
               started_at = CASE
                 WHEN started_at IS NULL AND ? = 'running' THEN ?
                 ELSE started_at
               END,
               finished_at = CASE
                 WHEN ? IN ('succeeded', 'failed', 'canceled') THEN ?
                 ELSE finished_at
               END
           WHERE id = ?`
        )
        .bind(
          this.state.status,
          this.state.currentStepIndex,
          this.state.totalSteps,
          this.state.totalCostMicros,
          errorMessage ?? null,
          this.state.updatedAt,
          this.state.status,
          this.state.updatedAt,
          this.state.status,
          this.state.updatedAt,
          this.state.runId
        )
        .run(),
    ]);
  }
}
