import type {
  EffectPipelineSpec,
  EffectPassSpec,
  PipelineValidationResult,
  PipelineValidationError,
  PipelineValidationErrorCode,
} from '../types/effect-pipeline';

const WELL_KNOWN_SAMPLERS = new Set(['inputTex', 'historyTex', 'screenTex', 'depthTex']);

function error(
  code: PipelineValidationErrorCode,
  message: string,
  passId?: string,
  path?: string,
): PipelineValidationError {
  return { code, message, passId, path };
}

function validatePassList(
  passes: EffectPassSpec[],
  chainName: string,
  seenIds: Set<string>,
  errors: PipelineValidationError[],
): void {
  const previousPassIds = new Set<string>();

  for (let i = 0; i < passes.length; i++) {
    const pass = passes[i];
    const passPath = `${chainName}[${i}]`;

    if (seenIds.has(pass.id)) {
      errors.push(
        error('E_DUPLICATE_PASS_ID', `Duplicate pass id "${pass.id}"`, pass.id, passPath),
      );
    }
    seenIds.add(pass.id);

    for (const sampler of pass.samplers) {
      if (!WELL_KNOWN_SAMPLERS.has(sampler) && !previousPassIds.has(sampler)) {
        errors.push(
          error(
            'E_UNDECLARED_SAMPLER',
            `Pass "${pass.id}" references undeclared sampler "${sampler}"`,
            pass.id,
            `${passPath}.samplers`,
          ),
        );
      }
    }

    if (pass.persistence === 'pingPong' && !pass.samplers.includes('historyTex')) {
      errors.push(
        error(
          'E_INVALID_PERSISTENCE',
          `Pass "${pass.id}" uses pingPong persistence but does not declare "historyTex" sampler`,
          pass.id,
          `${passPath}.persistence`,
        ),
      );
    }

    previousPassIds.add(pass.id);
  }
}

export function validatePipelineSpec(spec: EffectPipelineSpec): PipelineValidationResult {
  const errors: PipelineValidationError[] = [];

  if (spec.spritePasses.length === 0 && spec.screenPasses.length === 0) {
    errors.push(error('E_EMPTY_CHAIN', 'Pipeline must have at least one pass'));
  }

  const seenIds = new Set<string>();
  validatePassList(spec.spritePasses, 'spritePasses', seenIds, errors);
  validatePassList(spec.screenPasses, 'screenPasses', seenIds, errors);

  return { valid: errors.length === 0, errors };
}
