import type { Env } from '@/trpc/context';

export interface AgentFeatureFlags {
  aiEditingEnabled: boolean;
  aiEditingAllowedUserIds: string[];
  maxConcurrentRunsPerUser: number;
  maxRunsPerDay: number;
}

export function getAgentFeatureFlags(env: Env): AgentFeatureFlags {
  const aiEditingEnabled = env.AI_EDITING_ENABLED === 'true';
  const aiEditingAllowedUserIds = env.AI_EDITING_ALLOWED_USERS
    ? env.AI_EDITING_ALLOWED_USERS.split(',').map((id: string) => id.trim()).filter(Boolean)
    : [];
  const maxConcurrentRunsPerUser = env.AI_EDITING_MAX_CONCURRENT_RUNS
    ? Number.parseInt(env.AI_EDITING_MAX_CONCURRENT_RUNS, 10)
    : 3;
  const maxRunsPerDay = env.AI_EDITING_MAX_RUNS_PER_DAY
    ? Number.parseInt(env.AI_EDITING_MAX_RUNS_PER_DAY, 10)
    : 10;

  return {
    aiEditingEnabled,
    aiEditingAllowedUserIds,
    maxConcurrentRunsPerUser: Number.isNaN(maxConcurrentRunsPerUser) ? 3 : maxConcurrentRunsPerUser,
    maxRunsPerDay: Number.isNaN(maxRunsPerDay) ? 10 : maxRunsPerDay,
  };
}

export function canUserCreateRun(flags: AgentFeatureFlags, userId: string): {
  allowed: boolean;
  reason?: string;
} {
  if (!flags.aiEditingEnabled) {
    return {
      allowed: false,
      reason: 'AI editing is globally disabled',
    };
  }

  if (flags.aiEditingAllowedUserIds.length > 0 && !flags.aiEditingAllowedUserIds.includes(userId)) {
    return {
      allowed: false,
      reason: 'AI editing is not enabled for your account',
    };
  }

  return { allowed: true };
}

export function isAIEditingEnabled(userId: string, env: Env): boolean {
  const flags = getAgentFeatureFlags(env);
  return canUserCreateRun(flags, userId).allowed;
}
