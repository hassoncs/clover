/**
 * Inline GLSL shaders for text effects
 * All shaders use shader_type canvas_item for Godot 2D rendering
 */
export const TEXT_MSDF_UBER_SHADER = `
shader_type canvas_item;

uniform vec4 fill_color : source_color = vec4(1.0, 1.0, 1.0, 1.0);
uniform float font_size = 64.0;

uniform bool outline_enabled = false;
uniform vec4 outline_color : source_color = vec4(0.0, 0.0, 0.0, 1.0);
uniform float outline_size : hint_range(0.0, 10.0) = 3.0;

uniform bool shadow_enabled = false;
uniform vec4 shadow_color : source_color = vec4(0.0, 0.0, 0.0, 0.5);
uniform float shadow_spread : hint_range(0.0, 20.0) = 4.0;

uniform bool glow_enabled = false;
uniform vec4 glow_color : source_color = vec4(1.0, 0.8, 0.0, 0.5);
uniform float glow_spread : hint_range(0.0, 20.0) = 8.0;
uniform float glow_intensity : hint_range(0.0, 3.0) = 1.5;

float msdf_median(float r, float g, float b, float a) {
    return min(max(min(r, g), min(max(r, g), b)), a);
}

void fragment() {
    vec4 sample = texture(TEXTURE, UV);
    float d = msdf_median(sample.r, sample.g, sample.b, sample.a) - 0.5;
    
    vec2 dx = dFdx(UV);
    vec2 dy = dFdy(UV);
    float px_size = 1.0 / (length(vec2(length(dx), length(dy))) * float(textureSize(TEXTURE, 0).x));
    
    float fill_alpha = clamp(d * px_size + 0.5, 0.0, 1.0);
    
    vec4 result = vec4(0.0);
    
    if (shadow_enabled) {
        float shadow_d = d + shadow_spread * 0.01;
        float shadow_alpha = clamp(shadow_d * px_size + 0.5, 0.0, 1.0);
        result = mix(result, shadow_color, shadow_alpha * shadow_color.a);
    }
    
    if (glow_enabled) {
        float glow_d = d + glow_spread * 0.01;
        float glow_alpha = clamp(glow_d * px_size + 0.5, 0.0, 1.0);
        glow_alpha *= glow_intensity * (1.0 - smoothstep(0.0, glow_spread * 0.01, max(0.0, -d)));
        result = mix(result, glow_color, glow_alpha);
    }
    
    if (outline_enabled) {
        float outline_d = d + outline_size * 0.01;
        float outline_alpha = clamp(outline_d * px_size + 0.5, 0.0, 1.0);
        outline_alpha = max(0.0, outline_alpha - fill_alpha);
        result = mix(result, outline_color, outline_alpha * outline_color.a);
    }
    
    result = mix(result, fill_color, fill_alpha * fill_color.a);
    
    COLOR = result;
}
`;
export const TEXT_DROPSHADOW_SHADER = `
shader_type canvas_item;

uniform sampler2D current_buffer;
uniform vec4 shadow_color : source_color = vec4(0.0, 0.0, 0.0, 0.6);
uniform vec2 shadow_offset = vec2(4.0, 4.0);
uniform float shadow_blur : hint_range(0.0, 10.0) = 4.0;
uniform int blur_samples : hint_range(4, 16) = 8;

void fragment() {
    vec4 base = texture(current_buffer, UV);
    vec2 shadow_uv = UV - shadow_offset * TEXTURE_PIXEL_SIZE;
    
    float shadow_a = 0.0;
    float total_weight = 0.0;
    
    for (int i = 0; i < blur_samples; i++) {
        float angle = float(i) * 6.28318 / float(blur_samples);
        vec2 dir = vec2(cos(angle), sin(angle));
        
        for (float r = 1.0; r <= shadow_blur; r += max(1.0, shadow_blur * 0.5)) {
            vec2 off = dir * TEXTURE_PIXEL_SIZE * r;
            float w = 1.0 / r;
            shadow_a += texture(current_buffer, shadow_uv + off).a * w;
            total_weight += w;
        }
    }
    
    shadow_a = shadow_a / max(total_weight, 0.001);
    shadow_a += texture(current_buffer, shadow_uv).a;
    shadow_a = clamp(shadow_a, 0.0, 1.0);
    
    vec4 shadow = vec4(shadow_color.rgb, shadow_a * shadow_color.a);
    COLOR = mix(shadow, base, base.a);
}
`;
export const TEXT_OUTER_GLOW_SHADER = `
shader_type canvas_item;

uniform sampler2D current_buffer;
uniform vec4 glow_color : source_color = vec4(1.0, 0.8, 0.0, 0.8);
uniform float glow_size : hint_range(1.0, 20.0) = 6.0;
uniform float glow_intensity : hint_range(0.0, 3.0) = 1.5;
uniform int glow_samples : hint_range(4, 16) = 8;

void fragment() {
    vec4 base = texture(current_buffer, UV);
    float glow_a = 0.0;
    
    for (int i = 0; i < glow_samples; i++) {
        float angle = float(i) * 6.28318 / float(glow_samples);
        for (float r = 1.0; r <= glow_size; r += 1.0) {
            vec2 off = vec2(cos(angle), sin(angle)) * TEXTURE_PIXEL_SIZE * r;
            float falloff = 1.0 - (r / glow_size);
            glow_a = max(glow_a, texture(current_buffer, UV + off).a * falloff);
        }
    }
    
    glow_a = clamp(glow_a / float(glow_samples) * glow_intensity, 0.0, 1.0);
    vec4 glow = vec4(glow_color.rgb, glow_a * glow_color.a);
    COLOR = mix(glow, base, base.a);
}
`;
export const TEXT_GRADIENT_SHADER = `
shader_type canvas_item;

uniform sampler2D current_buffer;
uniform vec4 gradient_start : source_color = vec4(1.0, 0.0, 0.0, 1.0);
uniform vec4 gradient_end : source_color = vec4(0.0, 0.0, 1.0, 1.0);
uniform float gradient_angle : hint_range(0.0, 360.0) = 90.0;

void fragment() {
    vec4 tex = texture(current_buffer, UV);
    
    float rad = radians(gradient_angle);
    vec2 dir = vec2(cos(rad), sin(rad));
    float t = dot(SCREEN_UV - vec2(0.5), dir) + 0.5;
    t = clamp(t, 0.0, 1.0);
    
    vec3 grad = mix(gradient_start.rgb, gradient_end.rgb, t);
    COLOR = vec4(grad, tex.a);
}
`;
export const TEXT_BEVEL_SHADER = `
shader_type canvas_item;

uniform sampler2D current_buffer;
uniform vec2 light_dir = vec2(1.0, -1.0);
uniform float bevel_strength : hint_range(0.0, 2.0) = 1.0;
uniform float bevel_size : hint_range(1.0, 10.0) = 2.0;

void fragment() {
    vec4 tex = texture(current_buffer, UV) * COLOR;
    vec2 ps = TEXTURE_PIXEL_SIZE * bevel_size;
    
    float al = texture(current_buffer, UV + vec2(-ps.x, 0.0)).a;
    float ar = texture(current_buffer, UV + vec2(ps.x, 0.0)).a;
    float at = texture(current_buffer, UV + vec2(0.0, -ps.y)).a;
    float ab = texture(current_buffer, UV + vec2(0.0, ps.y)).a;
    
    vec2 normal = vec2(al - ar, at - ab);
    float ndotl = dot(normalize(normal + vec2(0.001)), normalize(light_dir));
    
    vec3 color = tex.rgb + vec3(ndotl * bevel_strength);
    COLOR = vec4(clamp(color, 0.0, 1.0), tex.a);
}
`;
export const TEXT_INNER_GLOW_SHADER = `
shader_type canvas_item;

uniform sampler2D current_buffer;
uniform vec4 inner_glow_color : source_color = vec4(1.0, 1.0, 0.0, 1.0);
uniform float inner_glow_size : hint_range(1.0, 10.0) = 3.0;

void fragment() {
    vec4 base = texture(current_buffer, UV);
    float edge_dist = base.a;
    
    for (int i = 0; i < 8; i++) {
        float angle = float(i) * 6.28318 / 8.0;
        vec2 off = vec2(cos(angle), sin(angle)) * TEXTURE_PIXEL_SIZE * inner_glow_size;
        edge_dist = min(edge_dist, texture(current_buffer, UV + off).a);
    }
    
    float inner = base.a * (1.0 - edge_dist);
    vec3 color = mix(base.rgb, inner_glow_color.rgb, inner * inner_glow_color.a);
    COLOR = vec4(color, base.a);
}
`;
export const TEXT_OUTLINE_SHADER = `
shader_type canvas_item;

uniform sampler2D current_buffer;
uniform vec4 outline_color : source_color = vec4(0.0, 0.0, 0.0, 1.0);
uniform float outline_width : hint_range(0.0, 10.0) = 2.0;
uniform int outline_samples : hint_range(4, 32) = 16;

void fragment() {
    vec4 base = texture(current_buffer, UV);
    float max_a = 0.0;
    
    for (int i = 0; i < outline_samples; i++) {
        float angle = float(i) * 6.28318 / float(outline_samples);
        vec2 offset = vec2(cos(angle), sin(angle)) * TEXTURE_PIXEL_SIZE * outline_width;
        max_a = max(max_a, texture(current_buffer, UV + offset).a);
    }
    
    vec4 outline = vec4(outline_color.rgb, max_a * outline_color.a);
    COLOR = mix(outline, base * COLOR, base.a);
}
`;
//# sourceMappingURL=shaders.js.map