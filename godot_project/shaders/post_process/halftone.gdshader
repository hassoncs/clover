shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform float dot_size : hint_range(1.0, 50.0) = 8.0;
uniform float contrast : hint_range(1.0, 5.0) = 1.0;
uniform float intensity : hint_range(0.0, 1.0) = 1.0;

// CMYK angles (standard print angles)
const float ANGLE_C = 15.0;
const float ANGLE_M = 75.0;
const float ANGLE_Y = 0.0;
const float ANGLE_K = 45.0;

vec2 rotate(vec2 uv, float angle_deg) {
    float angle = radians(angle_deg);
    float s = sin(angle);
    float c = cos(angle);
    return vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
}

float halftone_dot(vec2 uv, float angle) {
    // Rotate coordinates
    vec2 rotated_uv = rotate(uv, angle);
    
    // Scale to dots
    vec2 nearest = 2.0 * fract(rotated_uv * (1.0 / SCREEN_PIXEL_SIZE) / dot_size) - 1.0;
    float dist = length(nearest);
    
    // Create soft dot
    return 1.0 - smoothstep(0.7, 0.8, dist);
}

void fragment() {
    vec4 tex_color = texture(SCREEN_TEXTURE, SCREEN_UV);
    
    // High contrast input
    vec3 color = pow(tex_color.rgb, vec3(contrast));
    
    // CMYK approximation
    float k = 1.0 - max(max(color.r, color.g), color.b);
    float c = (1.0 - color.r - k) / (1.0 - k);
    float m = (1.0 - color.g - k) / (1.0 - k);
    float y = (1.0 - color.b - k) / (1.0 - k);
    
    // Check dots
    float dot_c = step(c, halftone_dot(SCREEN_UV, ANGLE_C));
    float dot_m = step(m, halftone_dot(SCREEN_UV, ANGLE_M));
    float dot_y = step(y, halftone_dot(SCREEN_UV, ANGLE_Y));
    float dot_k = step(k, halftone_dot(SCREEN_UV, ANGLE_K));
    
    // Recombine (subtractive mixing)
    vec3 result = vec3(1.0);
    result -= vec3(1.0, 0.0, 0.0) * (1.0 - dot_c); // Cyan absorbs Red
    result -= vec3(0.0, 1.0, 0.0) * (1.0 - dot_m); // Magenta absorbs Green
    result -= vec3(0.0, 0.0, 1.0) * (1.0 - dot_y); // Yellow absorbs Blue
    result *= dot_k; // Black darkens everything
    
    result = clamp(result, 0.0, 1.0);
    
    COLOR = vec4(mix(tex_color.rgb, result, intensity), tex_color.a);
}
