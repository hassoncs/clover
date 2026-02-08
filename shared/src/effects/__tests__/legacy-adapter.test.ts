import { describe, it, expect } from 'vitest';
import {
  legacySpriteEffectToSpec,
  legacyPostEffectToSpec,
  legacyDynamicShaderToSpec,
} from '../legacy-adapter';
import { validatePipelineSpec } from '../pipeline-validator';

describe('legacySpriteEffectToSpec', () => {
  it('maps a builtin sprite effect to a single sprite pass', () => {
    const spec = legacySpriteEffectToSpec('glow', { color: '#ff0000', radius: 10, intensity: 0.8 });

    expect(spec.id).toBe('legacy-glow');
    expect(spec.spritePasses).toHaveLength(1);
    expect(spec.screenPasses).toHaveLength(0);

    const pass = spec.spritePasses[0];
    expect(pass.id).toBe('glow');
    expect(pass.shaderSource).toEqual({ type: 'builtin', effectType: 'glow' });
  });

  it('preserves params in the pass spec', () => {
    const params = { radius: 15, intensity: 0.9, pulse: true };
    const spec = legacySpriteEffectToSpec('glow', params);
    const pass = spec.spritePasses[0];

    expect(pass.params).toEqual(params);
  });

  it('extracts uniform declarations from params', () => {
    const spec = legacySpriteEffectToSpec('glow', { radius: 15, intensity: 0.9, pulse: true });
    const pass = spec.spritePasses[0];
    const uniformNames = pass.uniforms.map((u) => u.name);

    expect(uniformNames).toContain('radius');
    expect(uniformNames).toContain('intensity');
    expect(uniformNames).toContain('pulse');

    expect(pass.uniforms.find((u) => u.name === 'radius')?.type).toBe('float');
    expect(pass.uniforms.find((u) => u.name === 'intensity')?.type).toBe('float');
    expect(pass.uniforms.find((u) => u.name === 'pulse')?.type).toBe('bool');
  });

  it('infers vec types from array params', () => {
    const spec = legacySpriteEffectToSpec('glow', {
      offset: [1, 2],
      color3: [0.1, 0.2, 0.3],
      color4: [0.1, 0.2, 0.3, 1.0],
    });
    const pass = spec.spritePasses[0];

    expect(pass.uniforms.find((u) => u.name === 'offset')?.type).toBe('vec2');
    expect(pass.uniforms.find((u) => u.name === 'color3')?.type).toBe('vec3');
    expect(pass.uniforms.find((u) => u.name === 'color4')?.type).toBe('vec4');
  });

  it('skips string params in uniform extraction', () => {
    const spec = legacySpriteEffectToSpec('glow', { color: '#ff0000', radius: 10 });
    const pass = spec.spritePasses[0];
    const uniformNames = pass.uniforms.map((u) => u.name);

    expect(uniformNames).not.toContain('color');
    expect(uniformNames).toContain('radius');
  });

  it('uses default lifecycle and pass settings', () => {
    const spec = legacySpriteEffectToSpec('glow', {});
    const pass = spec.spritePasses[0];

    expect(spec.lifecycle).toEqual({ stopMode: 'clear', autoStart: false });
    expect(pass.persistence).toBe('none');
    expect(pass.qualityTier).toBe('medium');
    expect(pass.required).toBe(true);
    expect(pass.samplers).toEqual(['inputTex']);
  });

  it('generates a spec that passes pipeline validation', () => {
    const spec = legacySpriteEffectToSpec('glow', { radius: 15, intensity: 0.8 });
    const result = validatePipelineSpec(spec);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('legacyPostEffectToSpec', () => {
  it('maps a builtin post effect to a single screen pass', () => {
    const spec = legacyPostEffectToSpec('bloom', { threshold: 0.8, intensity: 1.5, radius: 3 });

    expect(spec.id).toBe('legacy-bloom');
    expect(spec.spritePasses).toHaveLength(0);
    expect(spec.screenPasses).toHaveLength(1);

    const pass = spec.screenPasses[0];
    expect(pass.id).toBe('bloom');
    expect(pass.shaderSource).toEqual({ type: 'builtin', effectType: 'bloom' });
  });

  it('preserves params in the pass spec', () => {
    const params = { threshold: 0.8, intensity: 1.5, radius: 3 };
    const spec = legacyPostEffectToSpec('bloom', params);

    expect(spec.screenPasses[0].params).toEqual(params);
  });

  it('generates a spec that passes pipeline validation', () => {
    const spec = legacyPostEffectToSpec('vignette', { intensity: 0.5, radius: 0.7, softness: 0.5 });
    const result = validatePipelineSpec(spec);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('legacyDynamicShaderToSpec', () => {
  it('maps a dynamic shader to a custom GLSL screen pass', () => {
    const glsl = 'void fragment() { COLOR = texture(inputTex, UV); }';
    const spec = legacyDynamicShaderToSpec(glsl, { strength: 0.5 });

    expect(spec.id).toBe('legacy-dynamic');
    expect(spec.spritePasses).toHaveLength(0);
    expect(spec.screenPasses).toHaveLength(1);

    const pass = spec.screenPasses[0];
    expect(pass.id).toBe('legacy-dynamic');
    expect(pass.shaderSource).toEqual({ type: 'custom', glsl });
  });

  it('preserves params and extracts uniforms', () => {
    const params = { strength: 0.5, enabled: true, offset: [1.0, 2.0] };
    const spec = legacyDynamicShaderToSpec('void fragment() {}', params);
    const pass = spec.screenPasses[0];

    expect(pass.params).toEqual(params);
    expect(pass.uniforms.find((u) => u.name === 'strength')?.type).toBe('float');
    expect(pass.uniforms.find((u) => u.name === 'enabled')?.type).toBe('bool');
    expect(pass.uniforms.find((u) => u.name === 'offset')?.type).toBe('vec2');
  });

  it('generates a spec that passes pipeline validation', () => {
    const spec = legacyDynamicShaderToSpec('void fragment() { COLOR = vec4(1.0); }', {});
    const result = validatePipelineSpec(spec);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
