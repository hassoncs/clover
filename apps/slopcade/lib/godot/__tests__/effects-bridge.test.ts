import { describe, expect, it, expectTypeOf } from 'vitest';

import type {
  EffectsBridge,
  EffectsPipelineSnapshot,
  EffectsResult,
} from '../types';
import {
  createEffectsSnapshotPayload,
  normalizeEffectsResult,
  normalizeEffectsSnapshot,
} from '../GodotBridgeBase';

type WebBridge = ReturnType<typeof import('../GodotBridge.web').createWebGodotBridge>;
type NativeBridge = ReturnType<typeof import('../GodotBridge.native').createNativeGodotBridge>;

describe('effects bridge contracts', () => {
  it('web bridge implements EffectsBridge', () => {
    expectTypeOf<WebBridge>().toExtend<EffectsBridge>();
  });

  it('native bridge implements EffectsBridge', () => {
    expectTypeOf<NativeBridge>().toExtend<EffectsBridge>();
  });

  it('normalizes error result shape consistently', () => {
    const result = normalizeEffectsResult({ success: false, error: 'boom' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toEqual({
        code: 'E_EFFECTS_EXECUTION',
        message: 'boom',
      });
    }
  });

  it('normalizes snapshot result with required fields', () => {
    const snapshot = normalizeEffectsSnapshot({
      planHash: 'abc123',
      passes: [
        { id: 'pass-a', params: { intensity: 0.7 } },
        { id: 'pass-b', params: { amount: 1.2 } },
      ],
      state: 'running',
      timestamp: 1234,
    });

    expect(snapshot.planHash).toBe('abc123');
    expect(snapshot.passParams).toEqual({
      'pass-a': { intensity: 0.7 },
      'pass-b': { amount: 1.2 },
    });
    expect(snapshot.feedbackStates).toEqual({});
    expect(snapshot.lifecycleState).toBe('running');
    expect(snapshot.timestamp).toBe(1234);
  });

  it('creates restore payload compatible with runtime snapshots', () => {
    const snapshot: EffectsPipelineSnapshot = {
      planHash: 'hash',
      passParams: {
        p1: { amount: 0.5 },
      },
      feedbackStates: {
        p1: { frameCount: 10, frozen: true },
      },
      lifecycleState: 'paused',
      timestamp: 42,
    };

    expect(createEffectsSnapshotPayload(snapshot)).toEqual({
      planHash: 'hash',
      state: 'paused',
      timestamp: 42,
      feedbackStates: {
        p1: { frameCount: 10, frozen: true },
      },
      passes: [{ id: 'p1', params: { amount: 0.5 } }],
    });
  });

  it('effects result type preserves payload type', () => {
    type SnapshotResult = EffectsResult<EffectsPipelineSnapshot>;
    expectTypeOf<SnapshotResult>().toEqualTypeOf<
      | { success: true; data: EffectsPipelineSnapshot }
      | { success: false; error: { code: string; message: string; details?: Record<string, unknown> } }
    >();
  });
});
