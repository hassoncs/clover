import { describe, it, expect } from 'vitest';
import {
  legacySpriteEffectToSpec,
  legacyPostEffectToSpec,
} from '../legacy-adapter';
import { validatePipelineSpec } from '../pipeline-validator';
import { getAllPresets } from '../preset-library';
import { resolveBudget } from '../budget-resolver';
import {
  createSnapshotRequest,
  validateSnapshotForRestore,
} from '../snapshot-manager';
import { EFFECT_METADATA } from '../../types/effects';
import type { EffectType } from '../../types/effects';
import type { QualityTier } from '../../types/effect-pipeline';
import type { PlatformTier } from '../../types/effect-budget';
import { BUDGET_TIER_PRESETS } from '../../types/effect-budget';
import type { PipelineSnapshot } from '../../types/effect-snapshot';

const ALL_EFFECT_TYPES = Object.keys(EFFECT_METADATA) as EffectType[];
const ALL_QUALITY_TIERS: QualityTier[] = ['low', 'medium', 'high'];
const ALL_PLATFORM_TIERS = Object.keys(BUDGET_TIER_PRESETS) as PlatformTier[];

describe('parity harness', () => {
  // ---------------------------------------------------------------------------
  // Legacy adapter coverage — every EffectType produces a valid pipeline spec
  // ---------------------------------------------------------------------------

  describe('legacy adapter coverage', () => {
    describe('legacySpriteEffectToSpec', () => {
      it.each(ALL_EFFECT_TYPES)(
        'EffectType "%s" produces a valid sprite pipeline spec',
        (effectType) => {
          const spec = legacySpriteEffectToSpec(effectType, {});
          const result = validatePipelineSpec(spec);

          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        },
      );
    });

    describe('legacyPostEffectToSpec', () => {
      it.each(ALL_EFFECT_TYPES)(
        'EffectType "%s" produces a valid post-effect pipeline spec',
        (effectType) => {
          const spec = legacyPostEffectToSpec(effectType, {});
          const result = validatePipelineSpec(spec);

          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        },
      );
    });

    it('covers all known EffectType values', () => {
      expect(ALL_EFFECT_TYPES.length).toBeGreaterThanOrEqual(28);
    });
  });

  // ---------------------------------------------------------------------------
  // Preset validation — every preset × every quality tier validates
  // ---------------------------------------------------------------------------

  describe('preset validation', () => {
    const presets = getAllPresets();

    for (const preset of presets) {
      for (const tier of ALL_QUALITY_TIERS) {
        it(`preset "${preset.id}" at quality tier "${tier}" validates`, () => {
          const pipelineSpec = preset.tiers[tier];
          const result = validatePipelineSpec(pipelineSpec);

          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        });
      }
    }

    it('default pipeline for each preset also validates', () => {
      for (const preset of presets) {
        const result = validatePipelineSpec(preset.pipeline);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Budget resolution — every preset × every platform tier resolves within budget
  // ---------------------------------------------------------------------------

  describe('budget resolution', () => {
    const presets = getAllPresets();

    for (const preset of presets) {
      for (const platformTier of ALL_PLATFORM_TIERS) {
        for (const qualityTier of ALL_QUALITY_TIERS) {
          it(`preset "${preset.id}" (${qualityTier}) resolves within budget on ${platformTier}`, () => {
            const pipelineSpec = preset.tiers[qualityTier];
            const policy = {
              tier: platformTier,
              limits: BUDGET_TIER_PRESETS[platformTier],
            };
            const resolution = resolveBudget(pipelineSpec, policy);

            expect(resolution.withinBudget).toBe(true);

            const resultValidation = validatePipelineSpec(resolution.resultSpec);
            expect(resultValidation.valid).toBe(true);
          });
        }
      }
    }
  });

  // ---------------------------------------------------------------------------
  // Budget degradation determinism — same input always produces same output
  // ---------------------------------------------------------------------------

  describe('budget degradation determinism', () => {
    const presets = getAllPresets();

    for (const preset of presets) {
      it(`preset "${preset.id}" produces deterministic budget resolution`, () => {
        const pipelineSpec = preset.tiers.high;
        const policy = {
          tier: 'mobile-low' as PlatformTier,
          limits: BUDGET_TIER_PRESETS['mobile-low'],
        };

        const results = Array.from({ length: 3 }, () => resolveBudget(pipelineSpec, policy));

        for (let i = 1; i < results.length; i++) {
          expect(results[i].actions).toEqual(results[0].actions);
          expect(results[i].withinBudget).toBe(results[0].withinBudget);
          expect(results[i].resultSpec.spritePasses.map((p) => p.id)).toEqual(
            results[0].resultSpec.spritePasses.map((p) => p.id),
          );
          expect(results[i].resultSpec.screenPasses.map((p) => p.id)).toEqual(
            results[0].resultSpec.screenPasses.map((p) => p.id),
          );
        }
      });
    }
  });

  // ---------------------------------------------------------------------------
  // Lifecycle correctness — validate PipelineLifecycle fields
  // ---------------------------------------------------------------------------

  describe('lifecycle correctness', () => {
    it('stopMode "clear" is a valid lifecycle configuration', () => {
      const spec = legacyPostEffectToSpec('bloom', {});
      expect(spec.lifecycle.stopMode).toBe('clear');
      expect(typeof spec.lifecycle.autoStart).toBe('boolean');
    });

    it('stopMode "freeze" is a valid lifecycle configuration', () => {
      const presets = getAllPresets();
      for (const preset of presets) {
        const lifecycle = preset.pipeline.lifecycle;
        expect(['freeze', 'clear']).toContain(lifecycle.stopMode);
        expect(typeof lifecycle.autoStart).toBe('boolean');
      }
    });

    it('all presets have complete lifecycle fields', () => {
      for (const preset of getAllPresets()) {
        for (const tier of ALL_QUALITY_TIERS) {
          const lifecycle = preset.tiers[tier].lifecycle;
          expect(lifecycle).toBeDefined();
          expect(lifecycle).toHaveProperty('stopMode');
          expect(lifecycle).toHaveProperty('autoStart');
        }
      }
    });

    it('legacy adapter produces complete lifecycle fields', () => {
      for (const effectType of ALL_EFFECT_TYPES) {
        const spriteSpec = legacySpriteEffectToSpec(effectType, {});
        expect(spriteSpec.lifecycle).toHaveProperty('stopMode');
        expect(spriteSpec.lifecycle).toHaveProperty('autoStart');

        const postSpec = legacyPostEffectToSpec(effectType, {});
        expect(postSpec.lifecycle).toHaveProperty('stopMode');
        expect(postSpec.lifecycle).toHaveProperty('autoStart');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Snapshot roundtrip — create → validate → restore compatibility
  // ---------------------------------------------------------------------------

  describe('snapshot roundtrip', () => {
    it('snapshot request for a valid pipeline creates with correct pipelineId', () => {
      const spec = legacyPostEffectToSpec('bloom', { threshold: 0.8 });
      const request = createSnapshotRequest(spec.id, ['bloom']);

      expect(request.pipelineId).toBe(spec.id);
      expect(request.passIds).toEqual(['bloom']);
    });

    it('snapshot request without passIds omits the field', () => {
      const request = createSnapshotRequest('my-pipeline');

      expect(request.pipelineId).toBe('my-pipeline');
      expect(request.passIds).toBeUndefined();
    });

    it('validates a matching snapshot against the spec (should pass)', () => {
      const spec = legacyPostEffectToSpec('bloom', { threshold: 0.8 });
      const snapshot: PipelineSnapshot = {
        pipelineId: spec.id,
        passes: [{ passId: 'bloom', params: { threshold: 0.8 }, hasFeedbackState: false }],
        lifecycleState: 'running',
        timestamp: Date.now(),
      };

      const result = validateSnapshotForRestore(snapshot, spec);
      expect(result.valid).toBe(true);
    });

    it('rejects a snapshot with pass IDs not in the current spec', () => {
      const spec = legacyPostEffectToSpec('bloom', {});
      const snapshot: PipelineSnapshot = {
        pipelineId: spec.id,
        passes: [{ passId: 'nonexistent-pass', params: {}, hasFeedbackState: false }],
        lifecycleState: 'running',
        timestamp: Date.now(),
      };

      const result = validateSnapshotForRestore(snapshot, spec);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('reports warnings for missing passes but remains valid', () => {
      const presets = getAllPresets();
      const preset = presets[0];
      const spec = preset.tiers.high;

      const firstPassId = spec.screenPasses[0]?.id ?? spec.spritePasses[0]?.id;
      expect(firstPassId).toBeDefined();

      const snapshot: PipelineSnapshot = {
        pipelineId: spec.id,
        passes: [{ passId: firstPassId!, params: {}, hasFeedbackState: false }],
        lifecycleState: 'running',
        timestamp: Date.now(),
      };

      const result = validateSnapshotForRestore(snapshot, spec);
      expect(result.valid).toBe(true);

      const totalPasses = spec.screenPasses.length + spec.spritePasses.length;
      if (totalPasses > 1) {
        expect(result.errors.some((e) => e.includes('missing from snapshot'))).toBe(true);
      }
    });

    it('rejects an empty snapshot', () => {
      const spec = legacyPostEffectToSpec('bloom', {});
      const snapshot: PipelineSnapshot = {
        pipelineId: spec.id,
        passes: [],
        lifecycleState: 'running',
        timestamp: Date.now(),
      };

      const result = validateSnapshotForRestore(snapshot, spec);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Snapshot contains no passes');
    });
  });
});
