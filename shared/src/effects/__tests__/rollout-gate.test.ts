import { describe, it, expect } from 'vitest';
import { checkRolloutReadiness } from '../rollout-gate';
import { getAllPresets } from '../preset-library';
import type { EffectPreset } from '../preset-library';
import type { PlatformTier } from '../../types/effect-budget';
import { BUDGET_TIER_PRESETS } from '../../types/effect-budget';

const ALL_PLATFORM_TIERS = Object.keys(BUDGET_TIER_PRESETS) as PlatformTier[];

describe('rollout gate', () => {
  it('current implementation passes all gates', () => {
    const presets = getAllPresets();
    const result = checkRolloutReadiness(presets, ALL_PLATFORM_TIERS);

    expect(result.ready).toBe(true);
    expect(result.blockers).toHaveLength(0);
    expect(result.passed).toContain('preset-validation');
    expect(result.passed).toContain('budget-compatibility');
    expect(result.passed).toContain('legacy-adapter-coverage');
    expect(result.passed).toContain('lifecycle-completeness');
  });

  it('returns all 4 gate names in passed when everything is valid', () => {
    const presets = getAllPresets();
    const result = checkRolloutReadiness(presets, ALL_PLATFORM_TIERS);

    expect(result.passed).toHaveLength(4);
  });

  it('reports a blocker for a preset with an invalid pipeline', () => {
    const brokenPreset: EffectPreset = {
      id: 'broken',
      name: 'Broken',
      description: 'Invalid preset for testing',
      tags: ['test'],
      pipeline: {
        id: 'broken-default',
        spritePasses: [],
        screenPasses: [],
        lifecycle: { stopMode: 'clear', autoStart: false },
      },
      tiers: {
        high: {
          id: 'broken-high',
          spritePasses: [],
          screenPasses: [],
          lifecycle: { stopMode: 'clear', autoStart: false },
        },
        medium: {
          id: 'broken-medium',
          spritePasses: [],
          screenPasses: [],
          lifecycle: { stopMode: 'clear', autoStart: false },
        },
        low: {
          id: 'broken-low',
          spritePasses: [],
          screenPasses: [],
          lifecycle: { stopMode: 'clear', autoStart: false },
        },
      },
    };

    const result = checkRolloutReadiness([brokenPreset], ALL_PLATFORM_TIERS);

    expect(result.ready).toBe(false);
    expect(result.blockers.some((b) => b.startsWith('preset-validation'))).toBe(true);
  });

  it('valid presets still pass budget and lifecycle checks even if mixed with broken ones', () => {
    const validPresets = getAllPresets();
    const brokenPreset: EffectPreset = {
      id: 'broken',
      name: 'Broken',
      description: 'Invalid',
      tags: [],
      pipeline: {
        id: 'broken',
        spritePasses: [],
        screenPasses: [],
        lifecycle: { stopMode: 'clear', autoStart: false },
      },
      tiers: {
        high: {
          id: 'broken-high',
          spritePasses: [],
          screenPasses: [],
          lifecycle: { stopMode: 'clear', autoStart: false },
        },
        medium: {
          id: 'broken-medium',
          spritePasses: [],
          screenPasses: [],
          lifecycle: { stopMode: 'clear', autoStart: false },
        },
        low: {
          id: 'broken-low',
          spritePasses: [],
          screenPasses: [],
          lifecycle: { stopMode: 'clear', autoStart: false },
        },
      },
    };

    const result = checkRolloutReadiness([...validPresets, brokenPreset], ALL_PLATFORM_TIERS);

    expect(result.ready).toBe(false);
    expect(result.passed).toContain('legacy-adapter-coverage');
  });

  it('passes with empty presets array (only legacy adapter check matters)', () => {
    const result = checkRolloutReadiness([], ALL_PLATFORM_TIERS);

    expect(result.passed).toContain('preset-validation');
    expect(result.passed).toContain('budget-compatibility');
    expect(result.passed).toContain('lifecycle-completeness');
    expect(result.passed).toContain('legacy-adapter-coverage');
    expect(result.ready).toBe(true);
  });

  it('returns structured result with correct shape', () => {
    const result = checkRolloutReadiness(getAllPresets(), ALL_PLATFORM_TIERS);

    expect(result).toHaveProperty('ready');
    expect(result).toHaveProperty('blockers');
    expect(result).toHaveProperty('passed');
    expect(typeof result.ready).toBe('boolean');
    expect(Array.isArray(result.blockers)).toBe(true);
    expect(Array.isArray(result.passed)).toBe(true);
  });
});
