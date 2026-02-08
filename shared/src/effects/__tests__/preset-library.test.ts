import { describe, it, expect } from 'vitest';
import { getPreset, getAllPresets, getPresetsByTag } from '../preset-library';
import type { EffectPreset } from '../preset-library';
import { validatePipelineSpec } from '../pipeline-validator';
import type { QualityTier } from '../../types/effect-pipeline';

const QUALITY_TIERS: QualityTier[] = ['low', 'medium', 'high'];

const EXPECTED_PRESET_IDS = [
  'bloom-glow',
  'retro-crt',
  'underwater-dream',
  'cinematic',
  'pixel-art',
  'feedback-paint',
];

describe('preset-library', () => {
  describe('getAllPresets', () => {
    it('returns all 6 canonical presets', () => {
      const presets = getAllPresets();
      expect(presets).toHaveLength(6);
      const ids = presets.map((p) => p.id);
      for (const expected of EXPECTED_PRESET_IDS) {
        expect(ids).toContain(expected);
      }
    });
  });

  describe('getPreset', () => {
    it.each(EXPECTED_PRESET_IDS)('returns preset for id "%s"', (id) => {
      const preset = getPreset(id);
      expect(preset).toBeDefined();
      expect(preset!.id).toBe(id);
    });

    it('returns undefined for unknown id', () => {
      expect(getPreset('nonexistent')).toBeUndefined();
    });
  });

  describe('getPresetsByTag', () => {
    it('returns presets matching "retro" tag', () => {
      const retro = getPresetsByTag('retro');
      expect(retro.length).toBeGreaterThanOrEqual(2);
      for (const p of retro) {
        expect(p.tags).toContain('retro');
      }
    });

    it('returns presets matching "artistic" tag', () => {
      const artistic = getPresetsByTag('artistic');
      expect(artistic.length).toBeGreaterThanOrEqual(1);
      for (const p of artistic) {
        expect(p.tags).toContain('artistic');
      }
    });

    it('returns presets matching "feedback" tag', () => {
      const feedback = getPresetsByTag('feedback');
      expect(feedback).toHaveLength(1);
      expect(feedback[0].id).toBe('feedback-paint');
    });

    it('returns empty array for unknown tag', () => {
      expect(getPresetsByTag('nonexistent')).toEqual([]);
    });
  });

  describe('pipeline validation', () => {
    const presets = getAllPresets();

    it.each(presets.map((p) => [p.id, p] as const))(
      'preset "%s" default pipeline validates',
      (_id, preset) => {
        const result = validatePipelineSpec(preset.pipeline);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      },
    );
  });

  describe('quality tiers', () => {
    const presets = getAllPresets();

    it.each(presets.map((p) => [p.id, p] as const))(
      'preset "%s" has all 3 quality tiers',
      (_id, preset) => {
        for (const tier of QUALITY_TIERS) {
          expect(preset.tiers[tier]).toBeDefined();
        }
      },
    );

    for (const preset of presets) {
      for (const tier of QUALITY_TIERS) {
        it(`preset "${preset.id}" tier "${tier}" validates`, () => {
          const result = validatePipelineSpec(preset.tiers[tier]);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        });
      }
    }
  });

  describe('tier degradation', () => {
    it('high tier has more or equal passes than medium', () => {
      for (const preset of getAllPresets()) {
        const highPassCount =
          preset.tiers.high.screenPasses.length + preset.tiers.high.spritePasses.length;
        const medPassCount =
          preset.tiers.medium.screenPasses.length + preset.tiers.medium.spritePasses.length;
        expect(highPassCount).toBeGreaterThanOrEqual(medPassCount);
      }
    });

    it('medium tier has more or equal passes than low', () => {
      for (const preset of getAllPresets()) {
        const medPassCount =
          preset.tiers.medium.screenPasses.length + preset.tiers.medium.spritePasses.length;
        const lowPassCount =
          preset.tiers.low.screenPasses.length + preset.tiers.low.spritePasses.length;
        expect(medPassCount).toBeGreaterThanOrEqual(lowPassCount);
      }
    });
  });

  describe('preset structure', () => {
    it('every preset has non-empty name, description, and tags', () => {
      for (const preset of getAllPresets()) {
        expect(preset.name.length).toBeGreaterThan(0);
        expect(preset.description.length).toBeGreaterThan(0);
        expect(preset.tags.length).toBeGreaterThan(0);
      }
    });

    it('every preset pipeline has at least one screen pass', () => {
      for (const preset of getAllPresets()) {
        expect(preset.pipeline.screenPasses.length).toBeGreaterThanOrEqual(1);
      }
    });
  });
});
