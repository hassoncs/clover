import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { RecordingEvent, RunContext, Transport, TurnInput, TurnResult } from '../core/types';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

const MODEL_PRICES: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  'openai/gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.6 },
  'google/gemini-2.0-flash-001': { inputPer1M: 0.1, outputPer1M: 0.4 },
  'deepseek/deepseek-chat': { inputPer1M: 0.14, outputPer1M: 0.28 },
};

function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const price = MODEL_PRICES[model];
  if (!price) {
    return 0;
  }

  return (inputTokens / 1_000_000) * price.inputPer1M + (outputTokens / 1_000_000) * price.outputPer1M;
}

function getRecordingsDir(ctx: RunContext): string | undefined {
  if (!ctx.recording) {
    return undefined;
  }

  const maybe = ctx.recording as { recordingsDir?: string };
  return maybe.recordingsDir;
}

async function writeEvent(ctx: RunContext, event: RecordingEvent): Promise<void> {
  if (!ctx.recording) {
    return;
  }

  const recordingsDir = getRecordingsDir(ctx);
  if (!recordingsDir) {
    return;
  }

  const dir = path.join(
    recordingsDir,
    ctx.recording.suiteId,
    ctx.recording.caseId,
    ctx.recording.variantId,
    ctx.recording.runId
  );
  const filePath = path.join(dir, 'events.jsonl');
  await mkdir(dir, { recursive: true });
  await appendFile(filePath, `${JSON.stringify(event)}\n`, 'utf8');
}

interface OpenRouterResponse {
  id?: string;
  choices?: Array<{
    message?: {
      role?: string;
      content?: string;
      tool_calls?: Array<{
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

function parseToolArgs(args: string | undefined): Record<string, unknown> {
  if (!args || args.length === 0) {
    return {};
  }

  try {
    const parsed = JSON.parse(args);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return { value: parsed };
  } catch {
    return { raw: args };
  }
}

export function createLiveTransport(opts: { apiKey: string }): Transport {
  return {
    async runTurn(ctx: RunContext, turn: TurnInput): Promise<TurnResult> {
      const model = ctx.variant.model ?? 'openai/gpt-4o-mini';
      const messages: Array<{ role: 'system' | 'user'; content: string }> = [];

      if (ctx.variant.systemPrompt) {
        messages.push({ role: 'system', content: ctx.variant.systemPrompt });
      }
      messages.push({ role: 'user', content: turn.content });

      const start = Date.now();
      await writeEvent(ctx, {
        i: 0,
        type: 'user',
        payload: turn,
        timestamp: start,
      });

      const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${opts.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: ctx.variant.params?.temperature ?? 0,
          max_tokens: ctx.variant.params?.maxTokens ?? 32,
        }),
      });

      const latencyMs = Date.now() - start;
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`OpenRouter request failed (${response.status}): ${body}`);
      }

      const data = (await response.json()) as OpenRouterResponse;
      const content = data.choices?.[0]?.message?.content ?? '';
      const inputTokens = data.usage?.prompt_tokens ?? 0;
      const outputTokens = data.usage?.completion_tokens ?? 0;
      const toolCalls = data.choices?.[0]?.message?.tool_calls?.map((toolCall) => ({
        name: toolCall.function?.name ?? 'unknown',
        args: parseToolArgs(toolCall.function?.arguments),
      }));

      const result: TurnResult = {
        role: 'assistant',
        content,
        model,
        latencyMs,
        inputTokens,
        outputTokens,
        costUsd: estimateCostUsd(model, inputTokens, outputTokens),
        toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
        raw: data,
      };

      const eventTime = Date.now();
      await writeEvent(ctx, {
        i: 0,
        type: 'assistant',
        payload: result,
        timestamp: eventTime,
      });
      await writeEvent(ctx, {
        i: 0,
        type: 'usage',
        payload: {
          inputTokens,
          outputTokens,
          costUsd: result.costUsd,
        },
        timestamp: eventTime,
      });
      await writeEvent(ctx, {
        i: 0,
        type: 'timing',
        payload: { latencyMs },
        timestamp: eventTime,
      });

      return result;
    },
  };
}
