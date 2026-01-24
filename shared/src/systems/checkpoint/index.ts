import type { GameSystemDefinition } from '../types';
import type { CheckpointDefinition, CheckpointState } from './types';

export const CHECKPOINT_SYSTEM_ID = 'checkpoint';
export const CHECKPOINT_VERSION = { major: 1, minor: 0, patch: 0 };

export const checkpointSystem: GameSystemDefinition<Record<string, CheckpointDefinition>, CheckpointState> = {
  id: CHECKPOINT_SYSTEM_ID,
  version: CHECKPOINT_VERSION,
  actionTypes: ['checkpoint_activate', 'checkpoint_save', 'checkpoint_restore'],
  behaviorTypes: [],
  expressionFunctions: {
    checkpointActive: (args, ctx) => {
      const state = (ctx.variables['__checkpointState'] as unknown as CheckpointState) ?? null;
      return state?.activeCheckpointId ?? '';
    },
    
    checkpointHasSave: (args, ctx) => {
      const state = (ctx.variables['__checkpointState'] as unknown as CheckpointState) ?? null;
      return state?.savedState !== null;
    },
  },
};

export * from './types';
