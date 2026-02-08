import { describe, it, expect } from 'vitest';
import { resolveBudget } from '../budget-resolver';
import type { EffectPipelineSpec, EffectPassSpec } from '../../types/effect-pipeline';
import type { BudgetPolicy } from '../../types/effect-budget';
import { BUDGET_TIER_PRESETS } from '../../types/effect-budget';

function makePass(overrides: Partial<EffectPassSpec> & { id: string }): EffectPassSpec {
  return {
    shaderSource: { type: 'builtin', effectType: 'bloom' },
    samplers: ['inputTex'],
    uniforms: [],
    params: {},
    persistence: 'none',
    required: false,
    qualityTier: 'medium',
    ...overrides,
  };
}

function makePipeline(overrides: Partial<EffectPipelineSpec> = {}): EffectPipelineSpec {
  return {
    id: 'test-pipeline',
    spritePasses: [],
    screenPasses: [makePass({ id: 'default-pass' })],
    lifecycle: { stopMode: 'clear', autoStart: true },
    ...overrides,
  };
}

function makePolicy(tier: BudgetPolicy['tier'], overrides: Partial<BudgetPolicy['limits']> = {}): BudgetPolicy {
  return {
    tier,
    limits: { ...BUDGET_TIER_PRESETS[tier], ...overrides },
  };
}

describe('resolveBudget', () => {
  it('returns no actions when pipeline is within budget', () => {
    const spec = makePipeline({
      screenPasses: [makePass({ id: 'a' }), makePass({ id: 'b' })],
    });
    const policy = makePolicy('web-high');

    const result = resolveBudget(spec, policy);

    expect(result.withinBudget).toBe(true);
    expect(result.actions).toHaveLength(0);
    expect(result.resultSpec.screenPasses).toHaveLength(2);
  });

  it('applies deterministic degradation ladder: resolution → cadence → drop passes', () => {
    const passes = Array.from({ length: 9 }, (_, i) =>
      makePass({ id: `opt-${i}`, qualityTier: i < 3 ? 'high' : i < 6 ? 'medium' : 'low' }),
    );
    const spec = makePipeline({ screenPasses: passes });
    const policy = makePolicy('mobile-low');

    const result = resolveBudget(spec, policy);

    expect(result.actions.length).toBeGreaterThan(0);

    const actionTypes = result.actions.map((a) => a.type);
    const firstScale = actionTypes.indexOf('scale_resolution');
    const firstCadence = actionTypes.indexOf('reduce_cadence');
    const firstDrop = actionTypes.indexOf('drop_pass');

    expect(firstScale).not.toBe(-1);
    expect(firstCadence).not.toBe(-1);
    expect(firstDrop).not.toBe(-1);
    expect(firstScale).toBeLessThan(firstCadence);
    expect(firstCadence).toBeLessThan(firstDrop);
  });

  it('produces identical output on repeated runs (deterministic)', () => {
    const passes = Array.from({ length: 9 }, (_, i) =>
      makePass({ id: `opt-${i}`, qualityTier: i < 3 ? 'high' : i < 6 ? 'medium' : 'low' }),
    );
    const spec = makePipeline({ screenPasses: passes });
    const policy = makePolicy('mobile-low');

    const run1 = resolveBudget(spec, policy);
    const run2 = resolveBudget(spec, policy);

    expect(run1.actions).toEqual(run2.actions);
    expect(run1.resultSpec.screenPasses.map((p) => p.id)).toEqual(
      run2.resultSpec.screenPasses.map((p) => p.id),
    );
    expect(run1.withinBudget).toBe(run2.withinBudget);
  });

  it('never drops required passes even under heavy budget pressure', () => {
    const passes = [
      makePass({ id: 'required-a', required: true }),
      makePass({ id: 'required-b', required: true }),
      makePass({ id: 'required-c', required: true }),
      makePass({ id: 'required-d', required: true }),
      makePass({ id: 'required-e', required: true }),
      makePass({ id: 'optional-low', required: false, qualityTier: 'low' }),
      makePass({ id: 'optional-med', required: false, qualityTier: 'medium' }),
    ];
    const spec = makePipeline({ screenPasses: passes });
    const policy = makePolicy('mobile-low');

    const result = resolveBudget(spec, policy);

    const remainingIds = result.resultSpec.screenPasses.map((p) => p.id);
    expect(remainingIds).toContain('required-a');
    expect(remainingIds).toContain('required-b');
    expect(remainingIds).toContain('required-c');
    expect(remainingIds).toContain('required-d');
    expect(remainingIds).toContain('required-e');
  });

  it('drops optional passes before required ones even when optional has higher quality tier', () => {
    const passes = [
      makePass({ id: 'required', required: true, qualityTier: 'low' }),
      makePass({ id: 'optional-high', required: false, qualityTier: 'high' }),
    ];
    const spec = makePipeline({ screenPasses: passes });
    const policy = makePolicy('mobile-low', { maxPasses: 1 });

    const result = resolveBudget(spec, policy);

    const remainingIds = result.resultSpec.screenPasses.map((p) => p.id);
    expect(remainingIds).toContain('required');
    expect(remainingIds).not.toContain('optional-high');
  });

  it('drops lowest quality tier passes first', () => {
    const passes = [
      makePass({ id: 'high-a', qualityTier: 'high' }),
      makePass({ id: 'low-a', qualityTier: 'low' }),
      makePass({ id: 'med-a', qualityTier: 'medium' }),
      makePass({ id: 'low-b', qualityTier: 'low' }),
      makePass({ id: 'high-b', qualityTier: 'high' }),
    ];
    const spec = makePipeline({ screenPasses: passes });
    const policy = makePolicy('mobile-low', { maxPasses: 3 });

    const result = resolveBudget(spec, policy);

    const droppedIds = result.actions
      .filter((a) => a.type === 'drop_pass')
      .map((a) => a.passId);
    expect(droppedIds).toEqual(['low-a', 'low-b']);
  });

  it('uses alphabetical ID as tiebreaker within same quality tier', () => {
    const passes = [
      makePass({ id: 'zz-pass', qualityTier: 'medium' }),
      makePass({ id: 'aa-pass', qualityTier: 'medium' }),
      makePass({ id: 'mm-pass', qualityTier: 'medium' }),
    ];
    const spec = makePipeline({ screenPasses: passes });
    const policy = makePolicy('mobile-low', { maxPasses: 1 });

    const result = resolveBudget(spec, policy);

    const droppedIds = result.actions
      .filter((a) => a.type === 'drop_pass')
      .map((a) => a.passId);
    expect(droppedIds).toEqual(['aa-pass', 'mm-pass']);
  });

  it('reports withinBudget=false when required passes exceed maxPasses', () => {
    const passes = [
      makePass({ id: 'req-1', required: true }),
      makePass({ id: 'req-2', required: true }),
      makePass({ id: 'req-3', required: true }),
    ];
    const spec = makePipeline({ screenPasses: passes });
    const policy = makePolicy('mobile-low', { maxPasses: 2 });

    const result = resolveBudget(spec, policy);

    expect(result.withinBudget).toBe(false);
    expect(result.resultSpec.screenPasses).toHaveLength(3);
  });

  it('does not mutate the original spec', () => {
    const passes = [
      makePass({ id: 'a' }),
      makePass({ id: 'b' }),
      makePass({ id: 'c' }),
    ];
    const spec = makePipeline({ screenPasses: passes });
    const policy = makePolicy('mobile-low', { maxPasses: 1 });

    resolveBudget(spec, policy);

    expect(spec.screenPasses).toHaveLength(3);
    expect(spec.screenPasses.map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });

  it('handles sprite and screen passes together for total count', () => {
    const spec = makePipeline({
      spritePasses: [makePass({ id: 's1' }), makePass({ id: 's2' })],
      screenPasses: [makePass({ id: 'p1' }), makePass({ id: 'p2' }), makePass({ id: 'p3' })],
    });
    const policy = makePolicy('mobile-low', { maxPasses: 3 });

    const result = resolveBudget(spec, policy);

    const totalRemaining = result.resultSpec.spritePasses.length + result.resultSpec.screenPasses.length;
    expect(totalRemaining).toBe(3);
    expect(result.withinBudget).toBe(true);
  });

  it('emits scale_resolution action when policy maxResolutionScale < 1', () => {
    const spec = makePipeline({ screenPasses: [makePass({ id: 'a' })] });
    const policy = makePolicy('mobile-low');

    const result = resolveBudget(spec, policy);

    const scaleAction = result.actions.find((a) => a.type === 'scale_resolution');
    expect(scaleAction).toBeDefined();
    expect(scaleAction!.to).toBe(BUDGET_TIER_PRESETS['mobile-low'].maxResolutionScale);
  });

  it('emits reduce_cadence action when policy minCadence > 1', () => {
    const spec = makePipeline({ screenPasses: [makePass({ id: 'a' })] });
    const policy = makePolicy('mobile-low');

    const result = resolveBudget(spec, policy);

    const cadenceAction = result.actions.find((a) => a.type === 'reduce_cadence');
    expect(cadenceAction).toBeDefined();
    expect(cadenceAction!.to).toBe(BUDGET_TIER_PRESETS['mobile-low'].minCadence);
  });

  it('emits no resolution or cadence actions for web-high tier', () => {
    const spec = makePipeline({ screenPasses: [makePass({ id: 'a' })] });
    const policy = makePolicy('web-high');

    const result = resolveBudget(spec, policy);

    expect(result.actions.filter((a) => a.type === 'scale_resolution')).toHaveLength(0);
    expect(result.actions.filter((a) => a.type === 'reduce_cadence')).toHaveLength(0);
  });

  it('tier presets have sane values', () => {
    for (const [tier, limits] of Object.entries(BUDGET_TIER_PRESETS)) {
      expect(limits.maxPasses).toBeGreaterThan(0);
      expect(limits.maxResolutionScale).toBeGreaterThan(0);
      expect(limits.maxResolutionScale).toBeLessThanOrEqual(1);
      expect(limits.minCadence).toBeGreaterThanOrEqual(1);
    }
  });
});
