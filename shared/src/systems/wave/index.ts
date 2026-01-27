import type { GameSystemDefinition } from '../types';
import type { WaveDefinition, WaveState } from './types';

export const WAVE_SYSTEM_ID = 'wave';
export const WAVE_VERSION = { major: 1, minor: 0, patch: 0 };

export const waveSystem: GameSystemDefinition<Record<string, WaveDefinition>, Record<string, WaveState>> = {
  id: WAVE_SYSTEM_ID,
  version: WAVE_VERSION,
  actionTypes: ['waves_start', 'waves_next', 'waves_pause', 'waves_resume'],
  behaviorTypes: ['wave_spawner'],
  expressionFunctions: {
    waveCurrent: (args, ctx) => {
      if (args.length < 1) throw new Error('waveCurrent(waveDefId) requires 1 argument');
      const waveDefId = String(args[0]);
      const states = (ctx.variables['__waveStates'] as unknown as Record<string, WaveState>) ?? {};
      const state = states[waveDefId];
      return state?.currentWave ?? 0;
    },
    
    waveTotal: (args, ctx) => {
      if (args.length < 1) throw new Error('waveTotal(waveDefId) requires 1 argument');
      const waveDefId = String(args[0]);
      const defs = (ctx.variables['__waveDefs'] as unknown as Record<string, WaveDefinition>) ?? {};
      const def = defs[waveDefId];
      return def?.waves.length ?? 0;
    },
    
    waveIsActive: (args, ctx) => {
      if (args.length < 1) throw new Error('waveIsActive(waveDefId) requires 1 argument');
      const waveDefId = String(args[0]);
      const states = (ctx.variables['__waveStates'] as unknown as Record<string, WaveState>) ?? {};
      const state = states[waveDefId];
      return state?.isActive ?? false;
    },
    
    waveProgress: (args, ctx) => {
      if (args.length < 1) throw new Error('waveProgress(waveDefId) requires 1 argument');
      const waveDefId = String(args[0]);
      const states = (ctx.variables['__waveStates'] as unknown as Record<string, WaveState>) ?? {};
      const defs = (ctx.variables['__waveDefs'] as unknown as Record<string, WaveDefinition>) ?? {};
      const state = states[waveDefId];
      const def = defs[waveDefId];
      if (!state || !def || def.waves.length === 0) return 0;
      return state.currentWave / def.waves.length;
    },
    
    waveEnemiesRemaining: (args, ctx) => {
      if (args.length < 1) throw new Error('waveEnemiesRemaining(waveDefId) requires 1 argument');
      const waveDefId = String(args[0]);
      const states = (ctx.variables['__waveStates'] as unknown as Record<string, WaveState>) ?? {};
      const state = states[waveDefId];
      if (!state || !ctx.entityManager) return 0;
      let count = 0;
      for (const id of state.spawnedEntityIds) {
        if (ctx.entityManager.getEntity(id)) {
          count++;
        }
      }
      return count;
    },
  },
};

export * from './types';
