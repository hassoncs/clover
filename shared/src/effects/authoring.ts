import type { CompiledPlan, EffectGraphSpec, PlatformTier } from './types';
import type { ManifestRegistry } from './registry';
import type { GraphValidationError } from './errors';
import type { CompileError } from './compiler';
import type { NormalizationError } from './normalizer';
import { normalizeAIOutput } from './normalizer';
import { validateGraph } from './validator';
import { compileGraph } from './compiler';

export interface AuthoringOptions {
  platformTier?: PlatformTier;
}

export interface AuthoringResult {
  success: boolean;
  plan?: CompiledPlan;
  graph?: EffectGraphSpec;
  errors: (NormalizationError | CompileError | GraphValidationError)[];
}

export function authorGraph(
  raw: unknown,
  registry: ManifestRegistry,
  options?: AuthoringOptions,
): AuthoringResult {
  const normResult = normalizeAIOutput(raw, registry);
  if (!normResult.success) {
    return { success: false, errors: normResult.errors };
  }

  const graph = normResult.graph!;

  const validationResult = validateGraph(graph, {
    platformTier: options?.platformTier,
  });
  if (!validationResult.valid) {
    return { success: false, graph, errors: validationResult.errors };
  }

  const compileResult = compileGraph(graph, {
    platformTier: options?.platformTier,
  });
  if (!compileResult.success) {
    return { success: false, graph, errors: compileResult.errors };
  }

  return {
    success: true,
    plan: compileResult.plan,
    graph,
    errors: [],
  };
}
