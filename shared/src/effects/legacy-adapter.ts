import type { EffectType } from '../types/effects';
import type {
  EffectPipelineSpec,
  EffectPassSpec,
  UniformDeclaration,
  UniformType,
} from '../types/effect-pipeline';

function inferUniformType(value: unknown): UniformType | null {
  if (typeof value === 'number') return 'float';
  if (typeof value === 'boolean') return 'bool';
  if (Array.isArray(value)) {
    if (value.length === 2) return 'vec2';
    if (value.length === 3) return 'vec3';
    if (value.length === 4) return 'vec4';
    return null;
  }
  return null;
}

function extractUniforms(params: Record<string, unknown>): UniformDeclaration[] {
  const uniforms: UniformDeclaration[] = [];
  for (const [name, value] of Object.entries(params)) {
    const type = inferUniformType(value);
    if (type !== null) {
      uniforms.push({
        name,
        type,
        defaultValue: value as number | number[] | boolean,
      });
    }
  }
  return uniforms;
}

function makeDefaultLifecycle(): EffectPipelineSpec['lifecycle'] {
  return { stopMode: 'clear', autoStart: false };
}

function makePass(
  id: string,
  shaderSource: EffectPassSpec['shaderSource'],
  params: Record<string, unknown>,
): EffectPassSpec {
  return {
    id,
    shaderSource,
    samplers: ['inputTex'],
    uniforms: extractUniforms(params),
    params,
    persistence: 'none',
    required: true,
    qualityTier: 'medium',
  };
}

export function legacySpriteEffectToSpec(
  effectName: string,
  params: Record<string, unknown>,
): EffectPipelineSpec {
  return {
    id: `legacy-${effectName}`,
    spritePasses: [
      makePass(effectName, { type: 'builtin', effectType: effectName as EffectType }, params),
    ],
    screenPasses: [],
    lifecycle: makeDefaultLifecycle(),
  };
}

export function legacyPostEffectToSpec(
  effectName: string,
  params: Record<string, unknown>,
): EffectPipelineSpec {
  return {
    id: `legacy-${effectName}`,
    spritePasses: [],
    screenPasses: [
      makePass(effectName, { type: 'builtin', effectType: effectName as EffectType }, params),
    ],
    lifecycle: makeDefaultLifecycle(),
  };
}

export function legacyDynamicShaderToSpec(
  shaderCode: string,
  params: Record<string, unknown>,
): EffectPipelineSpec {
  return {
    id: 'legacy-dynamic',
    spritePasses: [],
    screenPasses: [
      makePass('legacy-dynamic', { type: 'custom', glsl: shaderCode }, params),
    ],
    lifecycle: makeDefaultLifecycle(),
  };
}
