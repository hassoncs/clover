import type { Env } from '@/trpc/context';

export function isAIEditingEnabled(userId: string, env: Env): boolean {
  const globalEnabled = env.AI_EDITING_ENABLED === 'true';
  
  if (!globalEnabled) {
    return false;
  }

  const allowedUsers = env.AI_EDITING_ALLOWED_USERS;
  if (!allowedUsers) {
    return true;
  }

  const allowedUserIds = allowedUsers.split(',').map((id: string) => id.trim());
  return allowedUserIds.includes(userId);
}
