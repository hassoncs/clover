import type { EffectType } from './effects';

// ---------------------------------------------------------------------------
// Uniform declarations
// ---------------------------------------------------------------------------

export type UniformType = 'float' | 'int' | 'vec2' | 'vec3' | 'vec4' | 'color' | 'bool';

export interface UniformDeclaration {
  name: string;
  type: UniformType;
  defaultValue?: number | number[] | string | boolean;
}

// ---------------------------------------------------------------------------
// Shader source — either a built-in effect or raw GLSL
// ---------------------------------------------------------------------------

export type ShaderSource =
  | { type: 'builtin'; effectType: EffectType }
  | { type: 'custom'; glsl: string };

// ---------------------------------------------------------------------------
// EffectPassSpec — a single pass in the pipeline
// ---------------------------------------------------------------------------

export type PersistenceMode = 'none' | 'pingPong';

export type QualityTier = 'low' | 'medium' | 'high';

export interface EffectPassSpec {
  id: string;
  targetEntityId?: string;
  shaderSource: ShaderSource;
  samplers: string[];
  uniforms: UniformDeclaration[];
  params: Record<string, unknown>;
  persistence: PersistenceMode;
  required: boolean;
  qualityTier: QualityTier;
}

// ---------------------------------------------------------------------------
// Pipeline lifecycle
// ---------------------------------------------------------------------------

export type StopMode = 'freeze' | 'clear';

export interface PipelineLifecycle {
  stopMode: StopMode;
  autoStart: boolean;
}

// ---------------------------------------------------------------------------
// EffectPipelineSpec — the top-level composable pipeline
// ---------------------------------------------------------------------------

export interface EffectPipelineSpec {
  id: string;
  spritePasses: EffectPassSpec[];
  screenPasses: EffectPassSpec[];
  lifecycle: PipelineLifecycle;
}

// ---------------------------------------------------------------------------
// Validation result types
// ---------------------------------------------------------------------------

export type PipelineValidationErrorCode =
  | 'E_UNDECLARED_SAMPLER'
  | 'E_EMPTY_CHAIN'
  | 'E_INVALID_PERSISTENCE'
  | 'E_DUPLICATE_PASS_ID';

export interface PipelineValidationError {
  code: PipelineValidationErrorCode;
  message: string;
  passId?: string;
  path?: string;
}

export interface PipelineValidationResult {
  valid: boolean;
  errors: PipelineValidationError[];
}
