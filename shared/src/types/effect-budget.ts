import type { EffectPassSpec, EffectPipelineSpec, QualityTier } from './effect-pipeline';

// ---------------------------------------------------------------------------
// Platform tier identifiers
// ---------------------------------------------------------------------------

export type PlatformTier = 'web-high' | 'web-low' | 'mobile-high' | 'mobile-low';

// ---------------------------------------------------------------------------
// Budget policy — declarative caps per platform tier
// ---------------------------------------------------------------------------

export interface BudgetTierPolicy {
  maxPasses: number;
  maxResolutionScale: number;
  minCadence: number;
}

export interface BudgetPolicy {
  tier: PlatformTier;
  limits: BudgetTierPolicy;
}

// ---------------------------------------------------------------------------
// Built-in tier presets
// ---------------------------------------------------------------------------

export const BUDGET_TIER_PRESETS: Record<PlatformTier, BudgetTierPolicy> = {
  'web-high': {
    maxPasses: 16,
    maxResolutionScale: 1.0,
    minCadence: 1,
  },
  'web-low': {
    maxPasses: 8,
    maxResolutionScale: 0.75,
    minCadence: 2,
  },
  'mobile-high': {
    maxPasses: 8,
    maxResolutionScale: 0.75,
    minCadence: 1,
  },
  'mobile-low': {
    maxPasses: 4,
    maxResolutionScale: 0.5,
    minCadence: 3,
  },
};

// ---------------------------------------------------------------------------
// Degradation actions — ordered record of what the resolver did
// ---------------------------------------------------------------------------

export type DegradationActionType =
  | 'scale_resolution'
  | 'reduce_cadence'
  | 'drop_pass';

export interface DegradationAction {
  type: DegradationActionType;
  passId?: string;
  qualityTier?: QualityTier;
  from?: number;
  to?: number;
  reason: string;
}

// ---------------------------------------------------------------------------
// Budget resolution result
// ---------------------------------------------------------------------------

export interface BudgetResolution {
  actions: DegradationAction[];
  resultSpec: EffectPipelineSpec;
  withinBudget: boolean;
}
