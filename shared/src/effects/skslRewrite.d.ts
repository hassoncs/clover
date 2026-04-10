/**
 * Godot canvas_item GLSL → Skia SkSL (RuntimeEffect) transpiler.
 *
 * Scope: generator shaders only (no SCREEN_TEXTURE / texture inputs).
 * SkSL entry point: `half4 main(float2 xy)` — receives pixel coordinates.
 *
 * Ordered rewrite chain (order is load-bearing):
 *  1. Strip `shader_type canvas_item;`
 *  2. Parse + strip uniform hints/defaults, remap vec→float types
 *  3. Replace Godot builtins (TIME, PI, TAU, SCREEN_UV, etc.)
 *  4. `void fragment()` → `half4 main(float2 xy)`
 *  5. `COLOR = ...` → `return half4(...)`
 *  6. `mat*` → `float*x*`, `vec*` → `float*`
 *  7. Inject iTime / iResolution uniforms
 */
export interface SkSLRewriteResult {
    sksl: string;
    uniforms: SkSLUniform[];
    warnings: string[];
}
export interface SkSLUniform {
    name: string;
    type: string;
    defaultValue?: number | number[];
}
export declare function rewriteGodotToSkSL(glsl: string): SkSLRewriteResult;
export declare const SKSL_COMPATIBLE_GENERATORS: string[];
//# sourceMappingURL=skslRewrite.d.ts.map