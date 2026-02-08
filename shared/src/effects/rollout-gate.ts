import type { EffectPreset } from './preset-library';
import type { PlatformTier } from '../types/effect-budget';
import type { QualityTier } from '../types/effect-pipeline';
import { BUDGET_TIER_PRESETS } from '../types/effect-budget';
import { validatePipelineSpec } from './pipeline-validator';
import { resolveBudget } from './budget-resolver';
import {
  legacySpriteEffectToSpec,
  legacyPostEffectToSpec,
} from './legacy-adapter';
import { EFFECT_METADATA } from '../types/effects';
import type { EffectType } from '../types/effects';

export interface RolloutGateResult {
  ready: boolean;
  blockers: string[];
  passed: string[];
}

const ALL_QUALITY_TIERS: QualityTier[] = ['low', 'medium', 'high'];

function checkPresetValidation(presets: EffectPreset[]): { ok: boolean; detail: string } {
  const failures: string[] = [];

  for (const preset of presets) {
    for (const tier of ALL_QUALITY_TIERS) {
      const result = validatePipelineSpec(preset.tiers[tier]);
      if (!result.valid) {
        failures.push(`${preset.id}@${tier}: ${result.errors.map((e) => e.message).join(', ')}`);
      }
    }
  }

  if (failures.length > 0) {
    return { ok: false, detail: `preset-validation: ${failures.join('; ')}` };
  }
  return { ok: true, detail: 'preset-validation' };
}

function checkBudgetCompatibility(
  presets: EffectPreset[],
  tiers: PlatformTier[],
): { ok: boolean; detail: string } {
  const failures: string[] = [];

  for (const preset of presets) {
    for (const qualityTier of ALL_QUALITY_TIERS) {
      for (const platformTier of tiers) {
        const policy = { tier: platformTier, limits: BUDGET_TIER_PRESETS[platformTier] };
        const resolution = resolveBudget(preset.tiers[qualityTier], policy);
        if (!resolution.withinBudget) {
          failures.push(`${preset.id}@${qualityTier} on ${platformTier}`);
        }
      }
    }
  }

  if (failures.length > 0) {
    return { ok: false, detail: `budget-compatibility: ${failures.join('; ')}` };
  }
  return { ok: true, detail: 'budget-compatibility' };
}

function checkLegacyAdapterCoverage(): { ok: boolean; detail: string } {
  const effectTypes = Object.keys(EFFECT_METADATA) as EffectType[];
  const failures: string[] = [];

  for (const effectType of effectTypes) {
    const spriteSpec = legacySpriteEffectToSpec(effectType, {});
    const spriteValid = validatePipelineSpec(spriteSpec);
    if (!spriteValid.valid) {
      failures.push(`sprite:${effectType}`);
    }

    const postSpec = legacyPostEffectToSpec(effectType, {});
    const postValid = validatePipelineSpec(postSpec);
    if (!postValid.valid) {
      failures.push(`post:${effectType}`);
    }
  }

  if (failures.length > 0) {
    return { ok: false, detail: `legacy-adapter-coverage: ${failures.join('; ')}` };
  }
  return { ok: true, detail: 'legacy-adapter-coverage' };
}

function checkLifecycleCompleteness(presets: EffectPreset[]): { ok: boolean; detail: string } {
  const failures: string[] = [];

  for (const preset of presets) {
    for (const tier of ALL_QUALITY_TIERS) {
      const lifecycle = preset.tiers[tier].lifecycle;
      if (!lifecycle || lifecycle.stopMode === undefined || lifecycle.autoStart === undefined) {
        failures.push(`${preset.id}@${tier} missing lifecycle fields`);
      }
    }
  }

  if (failures.length > 0) {
    return { ok: false, detail: `lifecycle-completeness: ${failures.join('; ')}` };
  }
  return { ok: true, detail: 'lifecycle-completeness' };
}

export function checkRolloutReadiness(
  presets: EffectPreset[],
  tiers: PlatformTier[],
): RolloutGateResult {
  const checks = [
    checkPresetValidation(presets),
    checkBudgetCompatibility(presets, tiers),
    checkLegacyAdapterCoverage(),
    checkLifecycleCompleteness(presets),
  ];

  const passed: string[] = [];
  const blockers: string[] = [];

  for (const check of checks) {
    if (check.ok) {
      passed.push(check.detail);
    } else {
      blockers.push(check.detail);
    }
  }

  return { ready: blockers.length === 0, blockers, passed };
}
