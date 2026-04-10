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
export declare function rewriteScreenShaderForSubViewport(glsl: string): string;
/**
 * Checks if a shader uses SCREEN_TEXTURE with hint_screen_texture,
 * meaning it needs rewriting for SubViewport execution.
 */
export declare function needsScreenTextureRewrite(glsl: string): boolean;
//# sourceMappingURL=shaderRewrite.d.ts.map