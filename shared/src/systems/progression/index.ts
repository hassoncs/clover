import type { GameSystemDefinition } from '../types';
import type { ProgressionDefinition, ProgressionState } from './types';

export const PROGRESSION_SYSTEM_ID = 'progression';
export const PROGRESSION_VERSION = { major: 1, minor: 0, patch: 0 };

export const progressionSystem: GameSystemDefinition<Record<string, ProgressionDefinition>, Record<string, ProgressionState>> = {
  id: PROGRESSION_SYSTEM_ID,
  version: PROGRESSION_VERSION,
  actionTypes: ['progression_add_xp', 'progression_unlock', 'progression_check_achievements'],
  behaviorTypes: [],
  expressionFunctions: {
    progressionXP: (args, ctx) => {
      if (args.length < 1) throw new Error('progressionXP(progressionId) requires 1 argument');
      const progId = String(args[0]);
      const states = (ctx.variables['__progStates'] as unknown as Record<string, ProgressionState>) ?? {};
      return states[progId]?.xp ?? 0;
    },
    
    progressionLevel: (args, ctx) => {
      if (args.length < 1) throw new Error('progressionLevel(progressionId) requires 1 argument');
      const progId = String(args[0]);
      const states = (ctx.variables['__progStates'] as unknown as Record<string, ProgressionState>) ?? {};
      return states[progId]?.level ?? 1;
    },
    
    progressionHasAchievement: (args, ctx) => {
      if (args.length < 2) throw new Error('progressionHasAchievement(progressionId, achievementId) requires 2 arguments');
      const progId = String(args[0]);
      const achId = String(args[1]);
      const states = (ctx.variables['__progStates'] as unknown as Record<string, ProgressionState>) ?? {};
      return states[progId]?.unlockedAchievements.includes(achId) ?? false;
    },
    
    progressionIsUnlocked: (args, ctx) => {
      if (args.length < 2) throw new Error('progressionIsUnlocked(progressionId, unlockId) requires 2 arguments');
      const progId = String(args[0]);
      const unlockId = String(args[1]);
      const states = (ctx.variables['__progStates'] as unknown as Record<string, ProgressionState>) ?? {};
      return states[progId]?.unlocks.includes(unlockId) ?? false;
    },
  },
};

export * from './types';
