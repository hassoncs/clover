import type { Env } from '@/trpc/context';

export interface AgentFeatureFlags {
  maxConcurrentRunsPerUser: number;
  maxRunsPerDay: number;
}

export function getAgentFeatureFlags(env: Env): AgentFeatureFlags {
  const maxConcurrentRunsPerUser = env.AI_EDITING_MAX_CONCURRENT_RUNS
    ? Number.parseInt(env.AI_EDITING_MAX_CONCURRENT_RUNS, 10)
    : 3;
  const maxRunsPerDay = env.AI_EDITING_MAX_RUNS_PER_DAY
    ? Number.parseInt(env.AI_EDITING_MAX_RUNS_PER_DAY, 10)
    : 10;

  return {
    maxConcurrentRunsPerUser: Number.isNaN(maxConcurrentRunsPerUser) ? 3 : maxConcurrentRunsPerUser,
    maxRunsPerDay: Number.isNaN(maxRunsPerDay) ? 10 : maxRunsPerDay,
  };
}

export function isAIEditingEnabled(_userId: string, _env: Env): boolean {
  return true;
}
