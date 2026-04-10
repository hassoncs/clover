import type { EffectGraphSpec } from './types';
import type { ManifestRegistry } from './registry';
export type NormalizationErrorCode = 'E_PARSE_FAILED' | 'E_UNKNOWN_NODE_TYPE' | 'E_INVALID_PARAM_SHAPE' | 'E_MISSING_REQUIRED_FIELD' | 'E_INVALID_CONNECTION' | 'E_CANONICALIZATION_FAILED';
export interface NormalizationError {
    code: NormalizationErrorCode;
    message: string;
    path?: string;
}
export interface NormalizationResult {
    success: boolean;
    graph?: EffectGraphSpec;
    errors: NormalizationError[];
}
export declare function normalizeAIOutput(raw: unknown, registry: ManifestRegistry): NormalizationResult;
//# sourceMappingURL=normalizer.d.ts.map