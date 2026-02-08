import { describe, it, expect, vi } from 'vitest';
import type { EffectPipelineSpec, EffectPassSpec } from '../../types/effect-pipeline';
import { serializePipelineSpec } from '../pipeline-serialization';

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
    id: 'pipeline-under-test',
    spritePasses: [],
    screenPasses: [makePass({ id: 'screen-main' })],
    lifecycle: { stopMode: 'clear', autoStart: true },
    ...overrides,
  };
}

describe('serializePipelineSpec', () => {
  it('serializes and round-trips a valid pipeline spec', () => {
    const spec = makePipeline({
      spritePasses: [makePass({ id: 'sprite-glow', shaderSource: { type: 'builtin', effectType: 'glow' } })],
      screenPasses: [
        makePass({
          id: 'screen-custom',
          shaderSource: { type: 'custom', glsl: 'shader_type canvas_item; void fragment() { COLOR = vec4(1.0); }' },
          samplers: ['inputTex'],
        }),
        makePass({
          id: 'screen-bloom',
          shaderSource: { type: 'builtin', effectType: 'bloom' },
          samplers: ['inputTex', 'screen-custom'],
        }),
      ],
    });

    const serialized = serializePipelineSpec(spec);
    const parsed = JSON.parse(serialized) as EffectPipelineSpec;

    expect(parsed).toEqual(spec);
  });

  it('calls validator before serialization', () => {
    const spec = makePipeline();
    const validator = vi.fn(() => ({ valid: true as const, errors: [] }));

    const serialized = serializePipelineSpec(spec, validator);

    expect(validator).toHaveBeenCalledTimes(1);
    expect(validator).toHaveBeenCalledWith(spec);
    expect(JSON.parse(serialized)).toEqual(spec);
  });

  it('throws when validator reports an invalid pipeline', () => {
    const spec = makePipeline();
    const validator = vi.fn(() => ({
      valid: false as const,
      errors: [
        {
          code: 'E_UNDECLARED_SAMPLER' as const,
          message: 'Pass "screen-main" references undeclared sampler "badTex"',
          passId: 'screen-main',
          path: 'screenPasses[0].samplers',
        },
      ],
    }));

    expect(() => serializePipelineSpec(spec, validator)).toThrowError(
      /Invalid effect pipeline spec.*E_UNDECLARED_SAMPLER/,
    );
  });
});
