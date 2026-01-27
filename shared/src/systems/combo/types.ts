import type { Value } from '../../expressions/types';

export interface ComboTier {
  threshold: number;
  name: string;
  event?: string;
  bonus?: number;
}

export interface ComboDefinition {
  id: string;
  triggerEvent: string;
  timeout: number;
  multiplierCurve?: number[];
  tiers?: ComboTier[];
  maxCombo?: number;
}

export interface ComboState {
  count: number;
  multiplier: number;
  tier: number;
  lastTriggerTime: number;
}

export interface ComboIncrementAction {
  type: 'combo_increment';
  comboId: string;
  amount?: Value<number>;
}

export interface ComboResetAction {
  type: 'combo_reset';
  comboId: string;
}
