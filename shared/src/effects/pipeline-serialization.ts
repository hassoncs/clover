import type { EffectPipelineSpec, PipelineValidationError } from '../types/effect-pipeline';
import { validatePipelineSpec } from './pipeline-validator';

export type PipelineSpecValidator = (spec: EffectPipelineSpec) => {
  valid: boolean;
  errors: PipelineValidationError[];
};

export function serializePipelineSpec(
  spec: EffectPipelineSpec,
  validator: PipelineSpecValidator = validatePipelineSpec,
): string {
  const validation = validator(spec);
  if (!validation.valid) {
    const details = validation.errors.map((error) => `${error.code}: ${error.message}`).join('; ');
    throw new Error(`Invalid effect pipeline spec. ${details}`);
  }

  return JSON.stringify(spec);
}
