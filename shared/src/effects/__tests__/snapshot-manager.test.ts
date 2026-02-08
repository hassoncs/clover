import { describe, it, expect } from 'vitest';
import { createSnapshotRequest, validateSnapshotForRestore } from '../snapshot-manager';
import type { PipelineSnapshot } from '../../types/effect-snapshot';
import type { EffectPipelineSpec, EffectPassSpec } from '../../types/effect-pipeline';

function makePass(overrides: Partial<EffectPassSpec> & { id: string }): EffectPassSpec {
  return {
    shaderSource: { type: 'builtin', effectType: 'bloom' },
    samplers: ['inputTex'],
    uniforms: [],
    params: {},
    persistence: 'none',
    required: true,
    qualityTier: 'medium',
    ...overrides,
  };
}

function makePipeline(overrides: Partial<EffectPipelineSpec> = {}): EffectPipelineSpec {
  return {
    id: 'test-pipeline',
    spritePasses: [],
    screenPasses: [makePass({ id: 'pass-a' }), makePass({ id: 'pass-b' })],
    lifecycle: { stopMode: 'clear', autoStart: true },
    ...overrides,
  };
}

function makeSnapshot(overrides: Partial<PipelineSnapshot> = {}): PipelineSnapshot {
  return {
    pipelineId: 'test-pipeline',
    passes: [
      { passId: 'pass-a', params: { intensity: 0.5 }, hasFeedbackState: false },
      { passId: 'pass-b', params: { radius: 3 }, hasFeedbackState: false },
    ],
    lifecycleState: 'running',
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('createSnapshotRequest', () => {
  it('creates a request with only pipelineId when no passIds given', () => {
    const req = createSnapshotRequest('my-pipeline');
    expect(req.pipelineId).toBe('my-pipeline');
    expect(req.passIds).toBeUndefined();
  });

  it('creates a request with passIds when provided', () => {
    const req = createSnapshotRequest('my-pipeline', ['pass-a', 'pass-b']);
    expect(req.pipelineId).toBe('my-pipeline');
    expect(req.passIds).toEqual(['pass-a', 'pass-b']);
  });

  it('omits passIds for empty array', () => {
    const req = createSnapshotRequest('my-pipeline', []);
    expect(req.passIds).toBeUndefined();
  });
});

describe('validateSnapshotForRestore', () => {
  it('validates a matching snapshot as valid', () => {
    const result = validateSnapshotForRestore(makeSnapshot(), makePipeline());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects snapshot with pass not in current pipeline', () => {
    const snapshot = makeSnapshot({
      passes: [
        { passId: 'pass-a', params: {}, hasFeedbackState: false },
        { passId: 'nonexistent', params: {}, hasFeedbackState: false },
      ],
    });
    const result = validateSnapshotForRestore(snapshot, makePipeline());
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Snapshot pass "nonexistent" not found in current pipeline');
  });

  it('warns when pipeline pass is missing from snapshot but stays valid', () => {
    const snapshot = makeSnapshot({
      passes: [{ passId: 'pass-a', params: { intensity: 0.5 }, hasFeedbackState: false }],
    });
    const result = validateSnapshotForRestore(snapshot, makePipeline());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('pass-b');
    expect(result.errors[0]).toContain('missing from snapshot');
  });

  it('rejects snapshot with no passes', () => {
    const snapshot = makeSnapshot({ passes: [] });
    const result = validateSnapshotForRestore(snapshot, makePipeline());
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Snapshot contains no passes');
  });

  it('rejects when current pipeline has no passes', () => {
    const spec = makePipeline({ spritePasses: [], screenPasses: [] });
    const result = validateSnapshotForRestore(makeSnapshot(), spec);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Current pipeline has no passes');
  });

  it('validates snapshot with feedback state indicator', () => {
    const snapshot = makeSnapshot({
      passes: [
        { passId: 'pass-a', params: { decay: 0.95 }, hasFeedbackState: true },
        { passId: 'pass-b', params: { radius: 3 }, hasFeedbackState: false },
      ],
    });
    const result = validateSnapshotForRestore(snapshot, makePipeline());
    expect(result.valid).toBe(true);
  });

  it('validates against pipeline with both sprite and screen passes', () => {
    const spec = makePipeline({
      spritePasses: [makePass({ id: 'sprite-glow' })],
      screenPasses: [makePass({ id: 'screen-bloom' })],
    });
    const snapshot = makeSnapshot({
      passes: [
        { passId: 'sprite-glow', params: { intensity: 1 }, hasFeedbackState: false },
        { passId: 'screen-bloom', params: { threshold: 0.8 }, hasFeedbackState: false },
      ],
    });
    const result = validateSnapshotForRestore(snapshot, spec);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('collects both missing and extra pass errors', () => {
    const spec = makePipeline({
      screenPasses: [makePass({ id: 'pass-x' }), makePass({ id: 'pass-y' })],
    });
    const snapshot = makeSnapshot({
      passes: [
        { passId: 'pass-x', params: {}, hasFeedbackState: false },
        { passId: 'pass-z', params: {}, hasFeedbackState: false },
      ],
    });
    const result = validateSnapshotForRestore(snapshot, spec);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('pass-z'))).toBe(true);
    expect(result.errors.some((e) => e.includes('pass-y'))).toBe(true);
  });
});
