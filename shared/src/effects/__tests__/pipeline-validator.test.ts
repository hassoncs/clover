import { describe, it, expect } from 'vitest';
import { validatePipelineSpec } from '../pipeline-validator';
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
    screenPasses: [makePass({ id: 'default-pass' })],
    lifecycle: { stopMode: 'clear', autoStart: true },
    ...overrides,
  };
}

describe('validatePipelineSpec', () => {
  it('accepts a valid pipeline with a single screen pass', () => {
    const result = validatePipelineSpec(makePipeline());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts a valid pipeline with mixed built-in and custom passes', () => {
    const spec = makePipeline({
      spritePasses: [
        makePass({ id: 'sprite-glow', shaderSource: { type: 'builtin', effectType: 'glow' } }),
      ],
      screenPasses: [
        makePass({
          id: 'screen-custom',
          shaderSource: { type: 'custom', glsl: 'void fragment() { COLOR = texture(inputTex, UV); }' },
          samplers: ['inputTex'],
        }),
        makePass({
          id: 'screen-bloom',
          shaderSource: { type: 'builtin', effectType: 'bloom' },
          samplers: ['inputTex', 'screen-custom'],
        }),
      ],
    });

    const result = validatePipelineSpec(spec);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('preserves pass ordering after validation', () => {
    const passes = [
      makePass({ id: 'a' }),
      makePass({ id: 'b' }),
      makePass({ id: 'c' }),
    ];
    const spec = makePipeline({ screenPasses: passes });
    const result = validatePipelineSpec(spec);

    expect(result.valid).toBe(true);
    expect(spec.screenPasses.map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });

  it('rejects empty chains (no passes at all)', () => {
    const spec = makePipeline({ spritePasses: [], screenPasses: [] });
    const result = validatePipelineSpec(spec);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('E_EMPTY_CHAIN');
  });

  it('rejects duplicate pass IDs within same chain', () => {
    const spec = makePipeline({
      screenPasses: [makePass({ id: 'dup' }), makePass({ id: 'dup' })],
    });
    const result = validatePipelineSpec(spec);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'E_DUPLICATE_PASS_ID')).toBe(true);
  });

  it('rejects duplicate pass IDs across chains', () => {
    const spec = makePipeline({
      spritePasses: [makePass({ id: 'shared-id' })],
      screenPasses: [makePass({ id: 'shared-id' })],
    });
    const result = validatePipelineSpec(spec);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'E_DUPLICATE_PASS_ID')).toBe(true);
  });

  it('rejects undeclared sampler (not well-known and not a previous pass)', () => {
    const spec = makePipeline({
      screenPasses: [makePass({ id: 'pass1', samplers: ['inputTex', 'nonexistentTex'] })],
    });
    const result = validatePipelineSpec(spec);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('E_UNDECLARED_SAMPLER');
    expect(result.errors[0].message).toContain('nonexistentTex');
  });

  it('allows referencing a previous pass ID as a sampler', () => {
    const spec = makePipeline({
      screenPasses: [
        makePass({ id: 'blur-pass', samplers: ['inputTex'] }),
        makePass({ id: 'composite', samplers: ['inputTex', 'blur-pass'] }),
      ],
    });
    const result = validatePipelineSpec(spec);

    expect(result.valid).toBe(true);
  });

  it('rejects forward-referencing a later pass ID as a sampler', () => {
    const spec = makePipeline({
      screenPasses: [
        makePass({ id: 'first', samplers: ['inputTex', 'second'] }),
        makePass({ id: 'second', samplers: ['inputTex'] }),
      ],
    });
    const result = validatePipelineSpec(spec);

    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('E_UNDECLARED_SAMPLER');
    expect(result.errors[0].message).toContain('second');
  });

  it('rejects pingPong persistence without historyTex sampler', () => {
    const spec = makePipeline({
      screenPasses: [
        makePass({ id: 'feedback', persistence: 'pingPong', samplers: ['inputTex'] }),
      ],
    });
    const result = validatePipelineSpec(spec);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('E_INVALID_PERSISTENCE');
  });

  it('accepts pingPong persistence with historyTex sampler', () => {
    const spec = makePipeline({
      screenPasses: [
        makePass({
          id: 'feedback',
          persistence: 'pingPong',
          samplers: ['inputTex', 'historyTex'],
        }),
      ],
    });
    const result = validatePipelineSpec(spec);

    expect(result.valid).toBe(true);
  });

  it('collects multiple errors in a single validation pass', () => {
    const spec = makePipeline({
      spritePasses: [],
      screenPasses: [],
    });

    const result = validatePipelineSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
  });

  it('reports all errors when multiple issues exist', () => {
    const spec = makePipeline({
      screenPasses: [
        makePass({ id: 'dup', samplers: ['badSampler'], persistence: 'pingPong' }),
        makePass({ id: 'dup', samplers: ['inputTex'] }),
      ],
    });
    const result = validatePipelineSpec(spec);

    expect(result.valid).toBe(false);
    const codes = result.errors.map((e) => e.code);
    expect(codes).toContain('E_UNDECLARED_SAMPLER');
    expect(codes).toContain('E_INVALID_PERSISTENCE');
    expect(codes).toContain('E_DUPLICATE_PASS_ID');
  });
});
