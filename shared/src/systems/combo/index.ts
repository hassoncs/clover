import type { GameSystemDefinition } from '../types';
import type { ComboDefinition, ComboState } from './types';

export const COMBO_SYSTEM_ID = 'combo';
export const COMBO_VERSION = { major: 1, minor: 0, patch: 0 };

function getMultiplier(def: ComboDefinition, count: number): number {
  if (!def.multiplierCurve || def.multiplierCurve.length === 0) return 1;
  const idx = Math.min(count - 1, def.multiplierCurve.length - 1);
  return def.multiplierCurve[Math.max(0, idx)] ?? 1;
}

function getTier(def: ComboDefinition, count: number): number {
  if (!def.tiers || def.tiers.length === 0) return 0;
  let tier = 0;
  for (let i = 0; i < def.tiers.length; i++) {
    if (count >= def.tiers[i].threshold) {
      tier = i + 1;
    }
  }
  return tier;
}

function getTierName(def: ComboDefinition, tier: number): string {
  if (!def.tiers || tier <= 0 || tier > def.tiers.length) return '';
  return def.tiers[tier - 1].name;
}

export const comboSystem: GameSystemDefinition<Record<string, ComboDefinition>, Record<string, ComboState>> = {
  id: COMBO_SYSTEM_ID,
  version: COMBO_VERSION,
  actionTypes: ['combo_increment', 'combo_reset'],
  behaviorTypes: [],
  expressionFunctions: {
    comboCount: (args, ctx) => {
      if (args.length < 1) throw new Error('comboCount(comboId) requires 1 argument');
      const comboId = String(args[0]);
      const states = (ctx.variables['__comboStates'] as unknown as Record<string, ComboState>) ?? {};
      return states[comboId]?.count ?? 0;
    },
    
    comboMultiplier: (args, ctx) => {
      if (args.length < 1) throw new Error('comboMultiplier(comboId) requires 1 argument');
      const comboId = String(args[0]);
      const states = (ctx.variables['__comboStates'] as unknown as Record<string, ComboState>) ?? {};
      return states[comboId]?.multiplier ?? 1;
    },
    
    comboTier: (args, ctx) => {
      if (args.length < 1) throw new Error('comboTier(comboId) requires 1 argument');
      const comboId = String(args[0]);
      const states = (ctx.variables['__comboStates'] as unknown as Record<string, ComboState>) ?? {};
      return states[comboId]?.tier ?? 0;
    },
    
    comboTierName: (args, ctx) => {
      if (args.length < 1) throw new Error('comboTierName(comboId) requires 1 argument');
      const comboId = String(args[0]);
      const states = (ctx.variables['__comboStates'] as unknown as Record<string, ComboState>) ?? {};
      const defs = (ctx.variables['__comboDefs'] as unknown as Record<string, ComboDefinition>) ?? {};
      const state = states[comboId];
      const def = defs[comboId];
      if (!state || !def) return '';
      return getTierName(def, state.tier);
    },
    
    comboTimeLeft: (args, ctx) => {
      if (args.length < 1) throw new Error('comboTimeLeft(comboId) requires 1 argument');
      const comboId = String(args[0]);
      const states = (ctx.variables['__comboStates'] as unknown as Record<string, ComboState>) ?? {};
      const defs = (ctx.variables['__comboDefs'] as unknown as Record<string, ComboDefinition>) ?? {};
      const state = states[comboId];
      const def = defs[comboId];
      if (!state || !def || state.count === 0) return 0;
      const elapsed = ctx.time - state.lastTriggerTime;
      return Math.max(0, def.timeout - elapsed);
    },
    
    comboIsActive: (args, ctx) => {
      if (args.length < 1) throw new Error('comboIsActive(comboId) requires 1 argument');
      const comboId = String(args[0]);
      const states = (ctx.variables['__comboStates'] as unknown as Record<string, ComboState>) ?? {};
      const defs = (ctx.variables['__comboDefs'] as unknown as Record<string, ComboDefinition>) ?? {};
      const state = states[comboId];
      const def = defs[comboId];
      if (!state || !def || state.count === 0) return false;
      const elapsed = ctx.time - state.lastTriggerTime;
      return elapsed < def.timeout;
    },
  },
};

export * from './types';
