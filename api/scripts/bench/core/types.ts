export type Mode = 'live' | 'replay';
export type TaskType = 'routing' | 'generation' | 'prompt_ab' | 'regression';

export interface BenchmarkSuite {
  id: string;
  taskType: TaskType;
  cases: BenchmarkCase[];
}

export interface BenchmarkCase {
  id: string;
  input: Record<string, unknown>;
  assertions: Assertion[];
  tags?: string[];
}

export interface Assertion {
  type: 'equals' | 'contains' | 'exists' | 'custom';
  field: string;
  expected?: unknown;
  customFn?: (result: TurnResult) => boolean;
}

export interface Variant {
  id: string;
  model?: string;
  systemPrompt?: string;
  routerStrategy?: string;
  params?: { temperature?: number; maxTokens?: number };
}

export interface TurnInput {
  role: 'user';
  content: string;
}

export interface TurnResult {
  role: 'assistant';
  content: string;
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  toolCalls?: Array<{ name: string; args: Record<string, unknown>; result?: unknown }>;
  raw?: unknown;
}

export interface RunContext {
  suite: BenchmarkSuite;
  case_: BenchmarkCase;
  variant: Variant;
  mode: Mode;
  recording?: RecordingMeta;
}

export interface Transport {
  runTurn(ctx: RunContext, turn: TurnInput): Promise<TurnResult>;
}

export interface RecordingMeta {
  suiteId: string;
  caseId: string;
  variantId: string;
  runId: string;
  timestamp: number;
}

export interface RecordingEvent {
  i: number;
  type: 'user' | 'assistant' | 'tool_call' | 'tool_result' | 'usage' | 'timing';
  payload: unknown;
  timestamp: number;
}

export interface EvaluationResult {
  pass: boolean;
  checks: Array<{ id: string; pass: boolean; message?: string; value?: unknown }>;
  scores?: Record<string, number>;
}

export interface Evaluator {
  id: string;
  evaluate(ctx: RunContext, results: TurnResult[]): EvaluationResult;
}

export interface RunResult {
  suiteId: string;
  caseId: string;
  variantId: string;
  mode: Mode;
  turns: TurnResult[];
  latencyMs: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  evaluation: EvaluationResult;
}

export interface BenchmarkReport {
  timestamp: number;
  suiteId: string;
  mode: Mode;
  variants: Variant[];
  results: RunResult[];
  summary: {
    totalCases: number;
    totalRuns: number;
    byVariant: Record<string, {
      accuracy: number;
      avgLatencyMs: number;
      totalCostUsd: number;
      passCount: number;
      failCount: number;
    }>;
  };
}
