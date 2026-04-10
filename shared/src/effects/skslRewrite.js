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
export function rewriteGodotToSkSL(glsl) {
    const warnings = [];
    const uniforms = [];
    let result = glsl;
    if (result.includes("SCREEN_TEXTURE") ||
        result.includes("hint_screen_texture")) {
        warnings.push("SCREEN_TEXTURE not supported — filter shaders require a separate approach");
    }
    if (result.includes("#include")) {
        warnings.push("Shader uses #include — SkSL does not support includes");
    }
    if (/\bvarying\b/.test(result)) {
        warnings.push("'varying' not supported in SkSL RuntimeEffect");
    }
    if (/\buniform\s+sampler2D\b/.test(result)) {
        warnings.push("sampler2D not supported in generator transpiler");
    }
    // 1. Strip shader_type
    result = result.replace(/^\s*shader_type\s+canvas_item\s*;\s*\n?/m, "");
    // 2. Parse and rewrite uniforms (strip hints/defaults, remap types)
    const uniformRegex = /^\s*uniform\s+(int|float|vec[234])\s+(\w+)\s*(?::\s*[^=;]*)?\s*(?:=\s*([^;]*?))?\s*;/gm;
    const parsedUniforms = [];
    for (;;) {
        const match = uniformRegex.exec(result);
        if (!match)
            break;
        parsedUniforms.push({
            original: match[0],
            godotType: match[1],
            name: match[2],
            defaultVal: match[3]?.trim(),
        });
    }
    for (const u of parsedUniforms) {
        const skslType = godotTypeToSkSL(u.godotType);
        const defaultValue = parseDefaultValue(u.defaultVal);
        uniforms.push({ name: u.name, type: skslType, defaultValue });
        result = result.replace(u.original, `uniform ${skslType} ${u.name};`);
    }
    const usesTime = /\bTIME\b/.test(result);
    const usesScreenUV = /\bSCREEN_UV\b/.test(result);
    const usesScreenPixelSize = /\bSCREEN_PIXEL_SIZE\b/.test(result);
    const usesFragCoord = /\bFRAGCOORD\b/.test(result);
    const needsResolution = usesScreenUV || usesScreenPixelSize || usesFragCoord;
    // 3. Godot builtins → SkSL equivalents
    result = result.replace(/\bPI\b/g, "3.14159265358979");
    result = result.replace(/\bTAU\b/g, "6.28318530718");
    result = result.replace(/\bTIME\b/g, "iTime");
    result = result.replace(/\bSCREEN_UV\b/g, "(xy / iResolution)");
    result = result.replace(/\bSCREEN_PIXEL_SIZE\b/g, "(1.0 / iResolution)");
    result = result.replace(/\bFRAGCOORD\.xy\b/g, "xy");
    result = result.replace(/\bFRAGCOORD\b/g, "float4(xy, 0.0, 1.0)");
    if (!usesScreenUV &&
        /\bUV\b/.test(result) &&
        !/\bvec2\s+UV\b/.test(glsl) &&
        !/\bfloat2\s+UV\b/.test(result)) {
        result = result.replace(/\bUV\b/g, "(xy / iResolution)");
    }
    // 4. void fragment() → half4 main(float2 xy)
    result = result.replace(/\bvoid\s+fragment\s*\(\s*\)\s*\{/, "half4 main(float2 xy) {");
    // 5. COLOR = expr → return half4(expr)
    result = rewriteColorToReturn(result);
    // 6. GLSL types → SkSL types
    result = result.replace(/\bmat2\b/g, "float2x2");
    result = result.replace(/\bmat3\b/g, "float3x3");
    result = result.replace(/\bmat4\b/g, "float4x4");
    result = result.replace(/\bvec2\b/g, "float2");
    result = result.replace(/\bvec3\b/g, "float3");
    result = result.replace(/\bvec4\b/g, "float4");
    result = result.replace(/\bivec2\b/g, "int2");
    result = result.replace(/\bivec3\b/g, "int3");
    result = result.replace(/\bivec4\b/g, "int4");
    // 7. Inject builtin uniforms
    const injections = [];
    if (usesTime) {
        injections.push("uniform float iTime;");
        uniforms.unshift({ name: "iTime", type: "float" });
    }
    if (needsResolution || /\biResolution\b/.test(result)) {
        injections.push("uniform float2 iResolution;");
        uniforms.unshift({ name: "iResolution", type: "float2" });
    }
    if (injections.length > 0) {
        result = injections.join("\n") + "\n\n" + result;
    }
    result = result.replace(/\n{3,}/g, "\n\n");
    result = result.trim() + "\n";
    return { sksl: result, uniforms, warnings };
}
function godotTypeToSkSL(godotType) {
    const map = {
        vec2: "float2",
        vec3: "float3",
        vec4: "float4",
        ivec2: "int2",
        ivec3: "int3",
        ivec4: "int4",
        mat2: "float2x2",
        mat3: "float3x3",
        mat4: "float4x4",
    };
    return map[godotType] ?? godotType;
}
function parseDefaultValue(raw) {
    if (!raw)
        return undefined;
    const vecMatch = raw.match(/^vec[234]\s*\(([^)]+)\)/);
    if (vecMatch) {
        return vecMatch[1].split(",").map((s) => parseFloat(s.trim()));
    }
    const num = parseFloat(raw);
    if (!isNaN(num))
        return num;
    return undefined;
}
/**
 * COLOR = vec4(r, g, b, a) → return half4(r, g, b, a)
 * COLOR = someExpr         → return half4(someExpr)
 *
 * Runs before vec→float type rewrite, so we match `vec4` not `float4`.
 */
function rewriteColorToReturn(source) {
    let result = source;
    result = result.replace(/\bCOLOR\s*=\s*vec4\s*\(([^;]*)\)\s*;/g, (_, inner) => `return half4(${inner});`);
    result = result.replace(/\bCOLOR\s*=\s*(?!vec[234]\s*\()([^;]+);/g, (_, expr) => `return half4(${expr.trim()});`);
    return result;
}
export const SKSL_COMPATIBLE_GENERATORS = [
    "rbAurora",
    "rbBalatro",
    "rbColorBends",
    "rbDarkVeil",
    "rbFaultyTerminal",
    "rbFloatingLines",
    "rbGalaxy",
    "rbGradientBlinds",
    "rbGrainient",
    "rbIridescence",
    "rbLightRays",
    "rbLightning",
    "rbLiquidChrome",
    "rbMetaBalls",
    "rbOrb",
    "rbPlasma",
    "rbPrism",
    "rbShapeBlur",
    "rbSilk",
    "rbThreads",
    "constantColor",
    "lfo",
    "ramp",
];
//# sourceMappingURL=skslRewrite.js.map