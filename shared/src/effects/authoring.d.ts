import type { CompiledPlan, EffectGraphSpec, PlatformTier } from './types';
import type { ManifestRegistry } from './registry';
import type { GraphValidationError } from './errors';
import type { CompileError } from './compiler';
import type { NormalizationError } from './normalizer';
export interface AuthoringOptions {
    platformTier?: PlatformTier;
}
export interface AuthoringResult {
    success: boolean;
    plan?: CompiledPlan;
    graph?: EffectGraphSpec;
    errors: (NormalizationError | CompileError | GraphValidationError)[];
}
export declare function authorGraph(raw: unknown, registry: ManifestRegistry, options?: AuthoringOptions): AuthoringResult;
//# sourceMappingURL=authoring.d.ts.map