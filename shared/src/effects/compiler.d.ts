import type { CompiledPlan, EffectGraphSpec, PlatformTier } from "./types";
export interface OrderingConstraints {
    [nodeId: string]: {
        before?: string[];
        after?: string[];
    };
}
export interface CompilerOptions {
    platformTier?: PlatformTier;
    orderingConstraints?: OrderingConstraints;
    shaderLookup?: (effectType: string) => string | null;
}
export interface CompileError {
    code: string;
    message: string;
    nodeIds?: string[];
}
export interface CompileResult {
    success: boolean;
    plan?: CompiledPlan;
    errors: CompileError[];
}
export declare function compileGraph(graph: EffectGraphSpec, options?: CompilerOptions): CompileResult;
export declare function wrapShadersAsPlan(shaders: Record<string, string>, scope?: "screen" | "entity"): CompiledPlan;
//# sourceMappingURL=compiler.d.ts.map