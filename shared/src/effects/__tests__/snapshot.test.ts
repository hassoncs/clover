import { describe, it, expect } from 'vitest';
import { SnapshotManager } from '../snapshot';
import type {
  EffectsSnapshot,
  FeedbackSnapshotState,
  SnapshotCompatibilityError,
} from '../snapshot';
import type { CompiledPlan, FeedbackPolicy } from '../types';

function makePolicy(overrides: Partial<FeedbackPolicy> = {}): FeedbackPolicy {
  return {
    initMode: 'clear',
    swapPolicy: 'pingPong',
    stopBehavior: 'freeze',
    bufferFormat: 'rgba8',
    ...overrides,
  };
}

function makePlan(overrides: Partial<CompiledPlan> = {}): CompiledPlan {
  return {
    id: 'plan-1',
    graphId: 'graph-1',
    graphVersion: '1.0.0',
    engineApiVersion: '1.0.0',
    scope: 'screen',
    passes: [
      {
        id: 'pass-a',
        shaderSource: { glsl: 'shader_type canvas_item;\nvoid fragment() { COLOR = vec4(1.0); }' },
        requires: [],
        provides: [],
        params: { intensity: 0.5 },
        paramsSchema: [],
        persistence: 'none',
        qualityTier: 'high',
        constraints: {},
      },
      {
        id: 'pass-b',
        shaderSource: { glsl: 'shader_type canvas_item;\nvoid fragment() { COLOR = vec4(1.0); }' },
        requires: [],
        provides: [],
        params: { blur: 2 },
        paramsSchema: [],
        persistence: 'none',
        qualityTier: 'high',
        constraints: {},
      },
    ],
    resourceMap: {},
    feedbackPolicies: { fb1: makePolicy() },
    hash: 'abc123',
    compiledAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeFeedbackState(
  overrides: Partial<FeedbackSnapshotState> = {},
): FeedbackSnapshotState {
  return {
    currentReadIndex: 0,
    currentWriteIndex: 1,
    frameCount: 0,
    frozen: false,
    initialized: true,
    ...overrides,
  };
}

describe('SnapshotManager', () => {
  describe('capture', () => {
    it('captures snapshot with plan hash, params, feedback states, and timestamp', () => {
      const mgr = new SnapshotManager();
      const plan = makePlan();
      const passParams: Record<string, Record<string, unknown>> = {
        'pass-a': { intensity: 0.7 },
        'pass-b': { blur: 3 },
      };
      const feedbackStates: Record<string, FeedbackSnapshotState> = {
        fb1: makeFeedbackState({ frameCount: 10 }),
      };

      const before = Date.now();
      const snapshot = mgr.capture(plan, passParams, feedbackStates, 'running');
      const after = Date.now();

      expect(snapshot.planHash).toBe('abc123');
      expect(snapshot.graphId).toBe('graph-1');
      expect(snapshot.graphVersion).toBe('1.0.0');
      expect(snapshot.passParams).toEqual(passParams);
      expect(snapshot.feedbackStates).toEqual(feedbackStates);
      expect(snapshot.lifecycleState).toBe('running');
      expect(snapshot.snapshotVersion).toBe(1);
      expect(snapshot.timestamp).toBeGreaterThanOrEqual(before);
      expect(snapshot.timestamp).toBeLessThanOrEqual(after);
    });

    it('snapshot version is always 1', () => {
      const mgr = new SnapshotManager();
      const snapshot = mgr.capture(makePlan(), {}, {}, 'idle');
      expect(snapshot.snapshotVersion).toBe(1);
    });
  });

  describe('checkCompatibility', () => {
    it('returns compatible for matching plan', () => {
      const mgr = new SnapshotManager();
      const plan = makePlan();
      const snapshot = mgr.capture(
        plan,
        { 'pass-a': { intensity: 0.5 }, 'pass-b': { blur: 2 } },
        { fb1: makeFeedbackState() },
        'running',
      );

      const result = mgr.checkCompatibility(snapshot, plan);
      expect(result.compatible).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns E_HASH_MISMATCH when plan hash differs', () => {
      const mgr = new SnapshotManager();
      const plan = makePlan();
      const snapshot = mgr.capture(plan, {}, {}, 'idle');

      const differentPlan = makePlan({ hash: 'xyz789' });
      const result = mgr.checkCompatibility(snapshot, differentPlan);

      expect(result.compatible).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'E_HASH_MISMATCH' }),
      );
    });

    it('returns E_VERSION_MISMATCH when graph version differs', () => {
      const mgr = new SnapshotManager();
      const plan = makePlan();
      const snapshot = mgr.capture(plan, {}, {}, 'idle');

      const differentPlan = makePlan({ graphVersion: '2.0.0', hash: 'abc123' });
      const result = mgr.checkCompatibility(snapshot, differentPlan);

      expect(result.compatible).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'E_VERSION_MISMATCH' }),
      );
    });

    it('returns E_MISSING_PASS when snapshot has pass not in current plan', () => {
      const mgr = new SnapshotManager();
      const plan = makePlan();
      const snapshot = mgr.capture(
        plan,
        { 'pass-a': {}, 'pass-b': {}, 'pass-c': {} },
        {},
        'idle',
      );

      const smallerPlan = makePlan({
        passes: [plan.passes[0]],
        hash: 'abc123',
      });

      const result = mgr.checkCompatibility(snapshot, smallerPlan);
      expect(result.compatible).toBe(false);
      const missingPassErrors = result.errors.filter(
        (e) => e.code === 'E_MISSING_PASS',
      );
      expect(missingPassErrors.length).toBeGreaterThanOrEqual(1);
    });

    it('returns E_EXTRA_PASS when current plan has pass not in snapshot', () => {
      const mgr = new SnapshotManager();
      const smallerPlan = makePlan({
        passes: [makePlan().passes[0]],
        hash: 'abc123',
      });
      const snapshot = mgr.capture(
        smallerPlan,
        { 'pass-a': {} },
        {},
        'idle',
      );

      const biggerPlan = makePlan({ hash: 'abc123' });

      const result = mgr.checkCompatibility(snapshot, biggerPlan);
      expect(result.compatible).toBe(false);
      const extraPassErrors = result.errors.filter(
        (e) => e.code === 'E_EXTRA_PASS',
      );
      expect(extraPassErrors.length).toBeGreaterThanOrEqual(1);
    });

    it('returns E_MISSING_FEEDBACK when snapshot has feedback not in current plan', () => {
      const mgr = new SnapshotManager();
      const plan = makePlan();
      const snapshot = mgr.capture(
        plan,
        {},
        {
          fb1: makeFeedbackState(),
          fb2: makeFeedbackState(),
        },
        'idle',
      );

      const result = mgr.checkCompatibility(snapshot, plan);
      expect(result.compatible).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'E_MISSING_FEEDBACK' }),
      );
    });
  });

  describe('restore', () => {
    it('restores pass params and feedback states for compatible snapshot', () => {
      const mgr = new SnapshotManager();
      const plan = makePlan();
      const passParams = {
        'pass-a': { intensity: 0.9 },
        'pass-b': { blur: 5 },
      };
      const feedbackStates = {
        fb1: makeFeedbackState({ frameCount: 42, frozen: true }),
      };
      const snapshot = mgr.capture(plan, passParams, feedbackStates, 'running');

      const result = mgr.restore(snapshot, plan);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.passParams).toEqual(passParams);
        expect(result.feedbackStates).toEqual(feedbackStates);
      }
    });

    it('returns errors for incompatible snapshot (no partial restore)', () => {
      const mgr = new SnapshotManager();
      const plan = makePlan();
      const snapshot = mgr.capture(plan, {}, {}, 'idle');

      const differentPlan = makePlan({ hash: 'different' });
      const result = mgr.restore(snapshot, differentPlan);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('does not return partial data on incompatible snapshot', () => {
      const mgr = new SnapshotManager();
      const plan = makePlan();
      const snapshot = mgr.capture(
        plan,
        { 'pass-a': { intensity: 1 } },
        {},
        'idle',
      );

      const differentPlan = makePlan({ hash: 'different' });
      const result = mgr.restore(snapshot, differentPlan);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result).not.toHaveProperty('passParams');
        expect(result).not.toHaveProperty('feedbackStates');
      }
    });
  });

  describe('validate', () => {
    it('returns true for valid snapshot structure', () => {
      const mgr = new SnapshotManager();
      const plan = makePlan();
      const snapshot = mgr.capture(plan, {}, {}, 'idle');

      expect(mgr.validate(snapshot)).toBe(true);
    });

    it('returns false for null', () => {
      const mgr = new SnapshotManager();
      expect(mgr.validate(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      const mgr = new SnapshotManager();
      expect(mgr.validate(undefined)).toBe(false);
    });

    it('returns false for non-object', () => {
      const mgr = new SnapshotManager();
      expect(mgr.validate('string')).toBe(false);
      expect(mgr.validate(42)).toBe(false);
    });

    it('returns false when required fields are missing', () => {
      const mgr = new SnapshotManager();
      expect(mgr.validate({ planHash: 'abc' })).toBe(false);
    });

    it('returns false when planHash is not a string', () => {
      const mgr = new SnapshotManager();
      const plan = makePlan();
      const snapshot = mgr.capture(plan, {}, {}, 'idle');
      const corrupted = { ...snapshot, planHash: 123 };
      expect(mgr.validate(corrupted)).toBe(false);
    });

    it('returns false when snapshotVersion is wrong', () => {
      const mgr = new SnapshotManager();
      const plan = makePlan();
      const snapshot = mgr.capture(plan, {}, {}, 'idle');
      const corrupted = { ...snapshot, snapshotVersion: 99 };
      expect(mgr.validate(corrupted)).toBe(false);
    });

    it('returns false when timestamp is not a number', () => {
      const mgr = new SnapshotManager();
      const plan = makePlan();
      const snapshot = mgr.capture(plan, {}, {}, 'idle');
      const corrupted = { ...snapshot, timestamp: 'not-a-number' };
      expect(mgr.validate(corrupted)).toBe(false);
    });

    it('returns false when passParams is not an object', () => {
      const mgr = new SnapshotManager();
      const plan = makePlan();
      const snapshot = mgr.capture(plan, {}, {}, 'idle');
      const corrupted = { ...snapshot, passParams: 'wrong' };
      expect(mgr.validate(corrupted)).toBe(false);
    });

    it('returns false when feedbackStates is not an object', () => {
      const mgr = new SnapshotManager();
      const plan = makePlan();
      const snapshot = mgr.capture(plan, {}, {}, 'idle');
      const corrupted = { ...snapshot, feedbackStates: null };
      expect(mgr.validate(corrupted)).toBe(false);
    });

    it('checkCompatibility returns E_SNAPSHOT_CORRUPT for invalid snapshot', () => {
      const mgr = new SnapshotManager();
      const plan = makePlan();
      const corrupt = { planHash: 123 } as unknown as EffectsSnapshot;

      const result = mgr.checkCompatibility(corrupt, plan);
      expect(result.compatible).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'E_SNAPSHOT_CORRUPT' }),
      );
    });

    it('restore returns E_SNAPSHOT_CORRUPT for invalid snapshot', () => {
      const mgr = new SnapshotManager();
      const plan = makePlan();
      const corrupt = {} as unknown as EffectsSnapshot;

      const result = mgr.restore(corrupt, plan);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContainEqual(
          expect.objectContaining({ code: 'E_SNAPSHOT_CORRUPT' }),
        );
      }
    });
  });
});
