import { generateText, stepCountIs } from 'ai';
import type { LanguageModel, ModelMessage } from 'ai';
import { nanoid } from 'nanoid';

import type { ArtifactService } from '@/agent/artifact-service';
import { CHAT_STAGE_PROMPT } from '@/agent/engine/prompts';
import type { WalletService } from '@/economy/wallet-service';

import { createChatTools } from './chat-tools';

type D1Database = import('@cloudflare/workers-types').D1Database;

export type ThreadStatus = 'active' | 'archived' | 'error';
export type GenerationStage = 'idle' | 'generating' | 'waiting_for_input' | 'complete' | 'error';

export interface ThreadRow {
  id: string;
  user_id: string;
  game_id: string | null;
  title: string | null;
  status: ThreadStatus;
  generation_stage: GenerationStage;
  status_message: string | null;
  metadata_json: string | null;
  created_at: number;
  updated_at: number;
}

export interface MessageRow {
  id: string;
  thread_id: string;
  role: string;
  content_json: string;
  component_name: string | null;
  component_props_json: string | null;
  component_state_json: string | null;
  tool_call_id: string | null;
  tool_name: string | null;
  model: string | null;
  cost_micros: number;
  input_tokens: number;
  output_tokens: number;
  error_json: string | null;
  metadata_json: string | null;
  created_at: number;
  seq: number;
}

export interface ChatHandlerContext {
  db: D1Database;
  model: LanguageModel;
  modelName: string;
  userId: string;
  gameId: string;
  artifactService: ArtifactService;
  walletService: WalletService;
  costPer1kTokensMicros?: number;
}

export interface PendingAskUser {
  toolCallId: string;
  toolName: string;
  questionsJson: string;
}

export interface AdvanceResult {
  status: 'complete' | 'suspended' | 'error';
  text?: string;
  pendingAskUser?: PendingAskUser;
  error?: string;
}

const MAX_STEPS = 10;

async function getNextSeq(db: D1Database, threadId: string): Promise<number> {
  const row = await db
    .prepare('SELECT COALESCE(MAX(seq), 0) + 1 AS next_seq FROM messages WHERE thread_id = ?')
    .bind(threadId)
    .first<{ next_seq: number }>();
  return row?.next_seq ?? 1;
}

async function insertMessage(
  db: D1Database,
  threadId: string,
  params: {
    role: string;
    contentJson: string;
    toolCallId?: string;
    toolName?: string;
    model?: string;
    costMicros?: number;
    inputTokens?: number;
    outputTokens?: number;
    errorJson?: string;
  },
): Promise<MessageRow> {
  const id = nanoid();
  const now = Date.now();
  const seq = await getNextSeq(db, threadId);

  await db
    .prepare(
      `INSERT INTO messages (id, thread_id, role, content_json, tool_call_id, tool_name, model, cost_micros, input_tokens, output_tokens, error_json, created_at, seq)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      threadId,
      params.role,
      params.contentJson,
      params.toolCallId ?? null,
      params.toolName ?? null,
      params.model ?? null,
      params.costMicros ?? 0,
      params.inputTokens ?? 0,
      params.outputTokens ?? 0,
      params.errorJson ?? null,
      now,
      seq,
    )
    .run();

  return {
    id,
    thread_id: threadId,
    role: params.role,
    content_json: params.contentJson,
    component_name: null,
    component_props_json: null,
    component_state_json: null,
    tool_call_id: params.toolCallId ?? null,
    tool_name: params.toolName ?? null,
    model: params.model ?? null,
    cost_micros: params.costMicros ?? 0,
    input_tokens: params.inputTokens ?? 0,
    output_tokens: params.outputTokens ?? 0,
    error_json: params.errorJson ?? null,
    metadata_json: null,
    created_at: now,
    seq,
  };
}

async function updateThread(
  db: D1Database,
  threadId: string,
  updates: {
    generation_stage?: GenerationStage;
    status_message?: string | null;
    metadata_json?: string | null;
  },
): Promise<void> {
  const setClauses: string[] = ['updated_at = ?'];
  const binds: (string | number | null)[] = [Date.now()];

  if (updates.generation_stage !== undefined) {
    setClauses.push('generation_stage = ?');
    binds.push(updates.generation_stage);
  }
  if (updates.status_message !== undefined) {
    setClauses.push('status_message = ?');
    binds.push(updates.status_message);
  }
  if (updates.metadata_json !== undefined) {
    setClauses.push('metadata_json = ?');
    binds.push(updates.metadata_json);
  }

  binds.push(threadId);
  await db
    .prepare(`UPDATE threads SET ${setClauses.join(', ')} WHERE id = ?`)
    .bind(...binds)
    .run();
}

async function loadThreadMessages(db: D1Database, threadId: string): Promise<MessageRow[]> {
  const result = await db
    .prepare('SELECT * FROM messages WHERE thread_id = ? ORDER BY seq ASC')
    .bind(threadId)
    .all<MessageRow>();
  return result.results ?? [];
}

function toAIMessages(rows: MessageRow[]): ModelMessage[] {
  return rows
    .filter(row => row.role === 'user' || row.role === 'assistant' || row.role === 'tool')
    .map(row => ({
      role: row.role,
      content: JSON.parse(row.content_json),
    }) as unknown as ModelMessage);
}

function findPendingAskUser(steps: unknown[]): PendingAskUser | undefined {
  const lastStep = steps[steps.length - 1];
  if (!lastStep || typeof lastStep !== 'object') return undefined;

  const stepRecord = lastStep as Record<string, unknown>;
  if (!Array.isArray(stepRecord.toolCalls)) return undefined;

  for (const toolCall of stepRecord.toolCalls) {
    if (!toolCall || typeof toolCall !== 'object') continue;
    const tc = toolCall as Record<string, unknown>;
    if (tc.toolName !== 'askUser') continue;
    if (typeof tc.toolCallId !== 'string' || tc.toolCallId.length === 0) continue;

    return {
      toolCallId: tc.toolCallId,
      toolName: 'askUser',
      questionsJson: JSON.stringify(tc.args ?? tc.input ?? null),
    };
  }

  return undefined;
}

function estimateCostMicros(
  inputTokens: number,
  outputTokens: number,
  costPer1kTokensMicros: number,
): number {
  const tokens = inputTokens + outputTokens;
  if (tokens <= 0) return 0;
  return Math.max(1, Math.round((tokens / 1000) * costPer1kTokensMicros));
}

async function persistGenerationResults(
  db: D1Database,
  threadId: string,
  modelName: string,
  responseMessages: ReadonlyArray<{ role: string; content: unknown[] }>,
): Promise<void> {
  for (const msg of responseMessages) {
    if (msg.role === 'assistant') {
      await insertMessage(db, threadId, {
        role: 'assistant',
        contentJson: JSON.stringify(msg.content),
        model: modelName,
      });
    } else     if (msg.role === 'tool') {
      for (const part of msg.content) {
        const p = part as Record<string, unknown>;
        if (p.type === 'tool-result') {
          await insertMessage(db, threadId, {
            role: 'tool',
            contentJson: JSON.stringify([part]),
            toolCallId: p.toolCallId as string,
            toolName: p.toolName as string,
          });
        }
      }
    }
  }
}

async function billForUsage(
  ctx: ChatHandlerContext,
  threadId: string,
  inputTokens: number,
  outputTokens: number,
): Promise<void> {
  const costPer1k = ctx.costPer1kTokensMicros ?? 1_000;
  const costMicros = estimateCostMicros(inputTokens, outputTokens, costPer1k);
  if (costMicros <= 0) return;

  const idempotencyKey = `chat-message:${threadId}:${Date.now()}`;
  await ctx.walletService.debit({
    userId: ctx.userId,
    type: 'generation_debit',
    amountMicros: -costMicros,
    referenceType: 'thread',
    referenceId: threadId,
    idempotencyKey,
    description: 'Chat message generation',
    metadata: { threadId, inputTokens, outputTokens, costMicros },
  });
}

async function runGeneration(
  ctx: ChatHandlerContext,
  threadId: string,
  messages: ModelMessage[],
): Promise<AdvanceResult> {
  await updateThread(ctx.db, threadId, {
    generation_stage: 'generating',
    status_message: 'Thinking...',
  });

  const tools = createChatTools({
    gameId: ctx.gameId,
    artifactService: ctx.artifactService,
  });

  try {
    const result = await generateText({
      model: ctx.model,
      system: CHAT_STAGE_PROMPT,
      messages,
      tools,
      stopWhen: stepCountIs(MAX_STEPS),
    });

    await persistGenerationResults(
      ctx.db,
      threadId,
      ctx.modelName,
      result.response.messages as ReadonlyArray<{ role: string; content: unknown[] }>,
    );

    const pending = findPendingAskUser(result.steps as unknown[]);
    if (pending) {
      await updateThread(ctx.db, threadId, {
        generation_stage: 'waiting_for_input',
        status_message: 'Waiting for your input...',
        metadata_json: JSON.stringify({ pendingToolCallId: pending.toolCallId }),
      });
      return { status: 'suspended', pendingAskUser: pending };
    }

    const inputTokens = result.totalUsage.inputTokens ?? 0;
    const outputTokens = result.totalUsage.outputTokens ?? 0;
    await billForUsage(ctx, threadId, inputTokens, outputTokens);

    await updateThread(ctx.db, threadId, {
      generation_stage: 'complete',
      status_message: null,
    });

    return { status: 'complete', text: result.text };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorJson = JSON.stringify({ message: errorMessage, timestamp: Date.now() });

    await insertMessage(ctx.db, threadId, {
      role: 'assistant',
      contentJson: JSON.stringify([{ type: 'text', text: `Error: ${errorMessage}` }]),
      errorJson,
    });

    await updateThread(ctx.db, threadId, {
      generation_stage: 'error',
      status_message: errorMessage,
    });

    return { status: 'error', error: errorMessage };
  }
}

export async function advanceThread(
  threadId: string,
  userText: string,
  ctx: ChatHandlerContext,
): Promise<AdvanceResult> {
  await insertUserMessage(ctx.db, threadId, userText);

  const history = await loadThreadMessages(ctx.db, threadId);
  const messages = toAIMessages(history);

  return runGeneration(ctx, threadId, messages);
}

export async function resumeThread(
  threadId: string,
  toolCallId: string,
  answerText: string,
  ctx: ChatHandlerContext,
): Promise<AdvanceResult> {
  await insertToolResult(ctx.db, threadId, toolCallId, answerText);

  const history = await loadThreadMessages(ctx.db, threadId);
  const messages = toAIMessages(history);

  return runGeneration(ctx, threadId, messages);
}

export async function insertUserMessage(
  db: D1Database,
  threadId: string,
  userText: string,
): Promise<MessageRow> {
  return insertMessage(db, threadId, {
    role: 'user',
    contentJson: JSON.stringify([{ type: 'text', text: userText }]),
  });
}

export async function insertToolResult(
  db: D1Database,
  threadId: string,
  toolCallId: string,
  answerText: string,
): Promise<MessageRow> {
  return insertMessage(db, threadId, {
    role: 'tool',
    contentJson: JSON.stringify([
      {
        type: 'tool-result',
        toolCallId,
        toolName: 'askUser',
        result: answerText,
      },
    ]),
    toolCallId,
    toolName: 'askUser',
  });
}
