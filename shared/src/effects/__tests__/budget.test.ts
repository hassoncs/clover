import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkBudget,
  PerformanceHarness,
} from '../budget';
import type { CompiledPlan, CompiledPass, ResourceRef, FeedbackPolicy } from '../types';
import { BUDGET_TIER_PRESETS } from '../budget';
import type { PlatformTier } from '../types';

function makeResourceRef(overrides: Partial<ResourceRef> & { id: string }): ResourceRef {
  return {
    type: 'texture',
    format: 'rgba8',
    resolution: 'full',
    ...overrides,
  };
}

function makePass(overrides: Partial<CompiledPass> & { id: string }): CompiledPass {
  return {
    shaderSource: { glsl: 'shader_type canvas_item;\nvoid fragment() { COLOR = vec4(1.0); }' },
    requires: [],
    provides: [makeResourceRef({ id: `${overrides.id}-out` })],
    params: {},
    paramsSchema: [],
    persistence: 'none',
    qualityTier: 'medium',
    constraints: {},
    ...overrides,
  };
}

function makePlan(overrides: Partial<CompiledPlan> = {}): CompiledPlan {
  return {
    id: 'test-plan',
    graphId: 'test-graph',
    graphVersion: '1.0.0',
    engineApiVersion: '1.0.0',
    scope: 'screen',
    passes: [makePass({ id: 'default' })],
    resourceMap: {
      'default-out': makeResourceRef({ id: 'default-out' }),
    },
    feedbackPolicies: {},
    hash: 'abc123',
    compiledAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('checkBudget', () => {
  it('passes a valid plan within web-high budget', () => {
    const plan = makePlan({
      passes: [makePass({ id: 'p1' }), makePass({ id: 'p2' })],
      resourceMap: {
        'p1-out': makeResourceRef({ id: 'p1-out' }),
        'p2-out': makeResourceRef({ id: 'p2-out' }),
      },
    });

    const result = checkBudget(plan, 'web-high');

    expect(result.withinBudget).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.metrics.passCount).toBe(2);
    expect(result.metrics.bufferCount).toBe(2);
  });

  it('fails plan with 5 passes on mobile-low (max 4)', () => {
    const passes = Array.from({ length: 5 }, (_, i) => makePass({ id: `p${i}` }));
    const resourceMap: Record<string, ResourceRef> = {};
    for (const p of passes) {
      resourceMap[`${p.id}-out`] = makeResourceRef({ id: `${p.id}-out` });
    }

    const plan = makePlan({ passes, resourceMap });
    const result = checkBudget(plan, 'mobile-low');

    expect(result.withinBudget).toBe(false);
    const passViolation = result.violations.find((v) => v.code === 'E_TOO_MANY_PASSES');
    expect(passViolation).toBeDefined();
    expect(passViolation!.limit).toBe(4);
    expect(passViolation!.actual).toBe(5);
  });

  it('fails plan with full resolution on mobile-low (max 0.5)', () => {
    const plan = makePlan({
      passes: [makePass({ id: 'p1' })],
      resourceMap: {
        'p1-out': makeResourceRef({ id: 'p1-out', resolution: 'full' }),
      },
    });

    const result = checkBudget(plan, 'mobile-low');

    expect(result.withinBudget).toBe(false);
    const resViolation = result.violations.find((v) => v.code === 'E_RESOLUTION_TOO_HIGH');
    expect(resViolation).toBeDefined();
    expect(resViolation!.limit).toBe(0.5);
    expect(resViolation!.actual).toBe(1.0);
  });

  it('reports half resolution as 0.5 scale and passes on mobile-low', () => {
    const plan = makePlan({
      passes: [makePass({ id: 'p1' })],
      resourceMap: {
        'p1-out': makeResourceRef({ id: 'p1-out', resolution: 'half' }),
      },
    });

    const result = checkBudget(plan, 'mobile-low');

    expect(result.metrics.maxResolutionScale).toBe(0.5);
    const resViolation = result.violations.find((v) => v.code === 'E_RESOLUTION_TOO_HIGH');
    expect(resViolation).toBeUndefined();
  });

  it('reports quarter resolution as 0.25 scale', () => {
    const plan = makePlan({
      passes: [makePass({ id: 'p1' })],
      resourceMap: {
        'p1-out': makeResourceRef({ id: 'p1-out', resolution: 'quarter' }),
      },
    });

    const result = checkBudget(plan, 'mobile-low');

    expect(result.metrics.maxResolutionScale).toBe(0.25);
  });

  it('detects too many buffers exceeding pass-based limit', () => {
    const resourceMap: Record<string, ResourceRef> = {};
    for (let i = 0; i < 20; i++) {
      resourceMap[`buf-${i}`] = makeResourceRef({ id: `buf-${i}` });
    }

    const plan = makePlan({
      passes: [makePass({ id: 'p1' })],
      resourceMap,
    });

    const result = checkBudget(plan, 'mobile-low');

    const bufViolation = result.violations.find((v) => v.code === 'E_TOO_MANY_BUFFERS');
    expect(bufViolation).toBeDefined();
    expect(bufViolation!.actual).toBe(20);
  });

  it('detects feedback budget violation on mobile-low', () => {
    const feedbackPolicies: Record<string, FeedbackPolicy> = {
      'fb-1': {
        initMode: 'clear',
        swapPolicy: 'pingPong',
        stopBehavior: 'freeze',
        bufferFormat: 'rgba8',
      },
      'fb-2': {
        initMode: 'clear',
        swapPolicy: 'pingPong',
        stopBehavior: 'freeze',
        bufferFormat: 'rgba8',
      },
    };

    const plan = makePlan({
      passes: [makePass({ id: 'p1' })],
      resourceMap: {
        'p1-out': makeResourceRef({ id: 'p1-out', resolution: 'half' }),
      },
      feedbackPolicies,
    });

    const result = checkBudget(plan, 'mobile-low');

    const fbViolation = result.violations.find((v) => v.code === 'E_FEEDBACK_BUDGET');
    expect(fbViolation).toBeDefined();
    expect(fbViolation!.actual).toBe(2);
  });

  it('correctly counts metrics: passes, buffers, feedback buffers', () => {
    const passes = [makePass({ id: 'p1' }), makePass({ id: 'p2' }), makePass({ id: 'p3' })];
    const resourceMap: Record<string, ResourceRef> = {
      'buf-a': makeResourceRef({ id: 'buf-a', resolution: 'half' }),
      'buf-b': makeResourceRef({ id: 'buf-b', resolution: 'full' }),
      'buf-c': makeResourceRef({ id: 'buf-c', resolution: 'quarter' }),
    };
    const feedbackPolicies: Record<string, FeedbackPolicy> = {
      'fb-1': {
        initMode: 'clear',
        swapPolicy: 'pingPong',
        stopBehavior: 'freeze',
        bufferFormat: 'rgba8',
      },
    };

    const plan = makePlan({ passes, resourceMap, feedbackPolicies });
    const result = checkBudget(plan, 'web-high');

    expect(result.metrics.passCount).toBe(3);
    expect(result.metrics.bufferCount).toBe(3);
    expect(result.metrics.feedbackBufferCount).toBe(1);
    expect(result.metrics.maxResolutionScale).toBe(1.0);
  });

  it('estimates memory based on buffer count and format', () => {
    const resourceMap: Record<string, ResourceRef> = {
      'buf-a': makeResourceRef({ id: 'buf-a', format: 'rgba8' }),
      'buf-b': makeResourceRef({ id: 'buf-b', format: 'rgba16f' }),
    };

    const plan = makePlan({
      passes: [makePass({ id: 'p1' })],
      resourceMap,
    });

    const result = checkBudget(plan, 'web-high');

    expect(result.metrics.estimatedMemoryMB).toBeGreaterThan(0);
  });

  describe('all 4 platform tiers', () => {
    const tiers: PlatformTier[] = ['web-high', 'web-low', 'mobile-high', 'mobile-low'];

    for (const tier of tiers) {
      it(`enforces ${tier} pass limit correctly`, () => {
        const preset = BUDGET_TIER_PRESETS[tier];
        const overCount = preset.maxPasses + 1;
        const passes = Array.from({ length: overCount }, (_, i) => makePass({ id: `p${i}` }));
        const resourceMap: Record<string, ResourceRef> = {};
        for (const p of passes) {
          resourceMap[`${p.id}-out`] = makeResourceRef({ id: `${p.id}-out`, resolution: 'quarter' });
        }

        const plan = makePlan({ passes, resourceMap });
        const result = checkBudget(plan, tier);

        expect(result.withinBudget).toBe(false);
        expect(result.violations.some((v) => v.code === 'E_TOO_MANY_PASSES')).toBe(true);
      });

      it(`passes ${tier} when exactly at pass limit`, () => {
        const preset = BUDGET_TIER_PRESETS[tier];
        const passes = Array.from({ length: preset.maxPasses }, (_, i) => makePass({ id: `p${i}` }));
        const resourceMap: Record<string, ResourceRef> = {};
        for (const p of passes) {
          resourceMap[`${p.id}-out`] = makeResourceRef({ id: `${p.id}-out`, resolution: 'quarter' });
        }

        const plan = makePlan({ passes, resourceMap });
        const result = checkBudget(plan, tier);

        expect(result.violations.some((v) => v.code === 'E_TOO_MANY_PASSES')).toBe(false);
      });
    }
  });
});

describe('PerformanceHarness', () => {
  let harness: PerformanceHarness;

  beforeEach(() => {
    harness = new PerformanceHarness();
  });

  it('records and retrieves compile time', () => {
    harness.recordCompileTime('plan-1', 12.5);

    const metrics = harness.getMetrics('plan-1');

    expect(metrics).toBeDefined();
    expect(metrics!.compileTimeMs).toBe(12.5);
  });

  it('records and retrieves frame time', () => {
    harness.recordFrameTime('plan-1', 16.7);

    const metrics = harness.getMetrics('plan-1');

    expect(metrics).toBeDefined();
    expect(metrics!.frameTimeMs).toBe(16.7);
  });

  it('records and retrieves resource memory', () => {
    harness.recordResourceMemory('plan-1', 64.0);

    const metrics = harness.getMetrics('plan-1');

    expect(metrics).toBeDefined();
    expect(metrics!.resourceMemoryMB).toBe(64.0);
  });

  it('returns undefined for unknown plan', () => {
    const metrics = harness.getMetrics('nonexistent');

    expect(metrics).toBeUndefined();
  });

  it('threshold check passes when within limits', () => {
    harness.recordFrameTime('plan-1', 10);
    harness.recordResourceMemory('plan-1', 50);

    const check = harness.checkThresholds('plan-1', {
      maxFrameTimeMs: 16.67,
      maxMemoryMB: 128,
    });

    expect(check.passed).toBe(true);
    expect(check.violations).toHaveLength(0);
  });

  it('threshold check fails when frame time exceeds limit', () => {
    harness.recordFrameTime('plan-1', 20);

    const check = harness.checkThresholds('plan-1', {
      maxFrameTimeMs: 16.67,
    });

    expect(check.passed).toBe(false);
    expect(check.violations.length).toBeGreaterThan(0);
    expect(check.violations[0]).toContain('frame time');
  });

  it('threshold check fails when memory exceeds limit', () => {
    harness.recordResourceMemory('plan-1', 256);

    const check = harness.checkThresholds('plan-1', {
      maxMemoryMB: 128,
    });

    expect(check.passed).toBe(false);
    expect(check.violations.length).toBeGreaterThan(0);
    expect(check.violations[0]).toContain('memory');
  });

  it('threshold check reports multiple violations', () => {
    harness.recordFrameTime('plan-1', 20);
    harness.recordResourceMemory('plan-1', 256);

    const check = harness.checkThresholds('plan-1', {
      maxFrameTimeMs: 16.67,
      maxMemoryMB: 128,
    });

    expect(check.passed).toBe(false);
    expect(check.violations).toHaveLength(2);
  });

  it('threshold check passes for unknown plan (no metrics = no violations)', () => {
    const check = harness.checkThresholds('nonexistent', {
      maxFrameTimeMs: 16.67,
    });

    expect(check.passed).toBe(true);
    expect(check.violations).toHaveLength(0);
  });

  it('records pass execution times', () => {
    harness.recordCompileTime('plan-1', 5);
    harness.recordFrameTime('plan-1', 8);

    const metrics = harness.getMetrics('plan-1');

    expect(metrics).toBeDefined();
    expect(metrics!.passExecutionTimes).toBeDefined();
  });

  it('reset clears all metrics', () => {
    harness.recordCompileTime('plan-1', 12.5);
    harness.recordFrameTime('plan-2', 16.7);

    harness.reset();

    expect(harness.getMetrics('plan-1')).toBeUndefined();
    expect(harness.getMetrics('plan-2')).toBeUndefined();
  });

  it('overwrites previous metrics for same plan', () => {
    harness.recordCompileTime('plan-1', 10);
    harness.recordCompileTime('plan-1', 20);

    const metrics = harness.getMetrics('plan-1');

    expect(metrics!.compileTimeMs).toBe(20);
  });
});
