/**
 * Rewrites a screen-scope post-process shader for execution inside a SubViewport.
 *
 * In Godot, SCREEN_TEXTURE with hint_screen_texture reads the main viewport's
 * backbuffer. Inside a SubViewport, it reads the SubViewport's own backbuffer
 * (which is empty/black). This rewrite converts the shader to use an explicit
 * `input` sampler2D uniform that the executor binds to the correct texture
 * via inputBindings.
 *
 * Transforms:
 * - `uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, ...;` -> `uniform sampler2D input : filter_linear_mipmap;`
 * - All `SCREEN_TEXTURE` references -> `input`
 * - All `SCREEN_UV` -> `UV`
 * - All `SCREEN_PIXEL_SIZE` -> `screen_pixel_size` (with injected uniform)
 */
export function rewriteScreenShaderForSubViewport(glsl) {
    let result = glsl;
    const hasScreenPixelSize = result.includes("SCREEN_PIXEL_SIZE");
    const declRegex = /uniform\s+sampler2D\s+SCREEN_TEXTURE\s*:[^;]*;/;
    const match = result.match(declRegex);
    if (match) {
        let declaration = "uniform sampler2D input : filter_linear_mipmap;";
        if (hasScreenPixelSize) {
            declaration += "\nuniform vec2 screen_pixel_size;";
        }
        result = result.replace(declRegex, declaration);
    }
    else if (hasScreenPixelSize &&
        !result.includes("uniform vec2 screen_pixel_size")) {
        result = `uniform vec2 screen_pixel_size;\n${result}`;
    }
    result = result.split("SCREEN_TEXTURE").join("input");
    result = result.split("SCREEN_UV").join("UV");
    result = result.split("SCREEN_PIXEL_SIZE").join("screen_pixel_size");
    return result;
}
/**
 * Checks if a shader uses SCREEN_TEXTURE with hint_screen_texture,
 * meaning it needs rewriting for SubViewport execution.
 */
export function needsScreenTextureRewrite(glsl) {
    return glsl.includes("hint_screen_texture");
}
//# sourceMappingURL=shaderRewrite.js.map