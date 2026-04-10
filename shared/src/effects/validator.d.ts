import type { GraphValidationResult } from "./errors";
import type { EffectGraphSpec, PlatformTier } from "./types";
export interface ValidatorOptions {
    platformTier?: PlatformTier;
}
export declare function validateGraph(graph: EffectGraphSpec, options?: ValidatorOptions): GraphValidationResult;
//# sourceMappingURL=validator.d.ts.map