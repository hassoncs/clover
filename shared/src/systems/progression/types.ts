import type { Value } from '../../expressions/types';

export interface AchievementDefinition {
  id: string;
  name: string;
  description?: string;
  condition: string;
  reward?: AchievementReward;
  hidden?: boolean;
}

export interface AchievementReward {
  type: 'unlock' | 'currency' | 'item';
  unlockId?: string;
  currencyId?: string;
  amount?: number;
  itemId?: string;
}

export interface ProgressionLevelDefinition {
  level: number;
  xpRequired: number;
  rewards?: AchievementReward[];
}

export interface ProgressionDefinition {
  id: string;
  achievements?: AchievementDefinition[];
  levels?: ProgressionLevelDefinition[];
  xpCurve?: 'linear' | 'exponential';
  xpBase?: number;
  xpMultiplier?: number;
}

export interface ProgressionState {
  xp: number;
  level: number;
  unlockedAchievements: string[];
  unlocks: string[];
}

export interface AddXPAction {
  type: 'progression_add_xp';
  progressionId: string;
  amount: Value<number>;
}

export interface UnlockAction {
  type: 'progression_unlock';
  unlockId: string;
}

export interface CheckAchievementsAction {
  type: 'progression_check_achievements';
  progressionId: string;
}

export type ProgressionAction = AddXPAction | UnlockAction | CheckAchievementsAction;
