shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;
// This texture should be provided by the game engine (Splat Map)
// Red channel = X displacement, Green channel = Y displacement
uniform sampler2D data_texture : filter_linear; 

uniform float intensity : hint_range(0.0, 0.1) = 0.02;
uniform float speed : hint_range(0.0, 5.0) = 1.0;
uniform bool use_noise_fallback : hint_range(0, 1) = 1;

// Simple fallback noise if no data texture is provided
float random(vec2 uv) {
    return fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 uv) {
    vec2 i = floor(uv);
    vec2 f = fract(uv);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void fragment() {
    vec2 displacement = vec2(0.0);
    
    // Sample data texture
    vec4 data = texture(data_texture, SCREEN_UV);
    
    // Use data if available (assuming > 0 means active)
    if (length(data.rgb) > 0.01) {
        // Map 0..1 to -1..1
        displacement = (data.rg * 2.0 - 1.0);
    } else if (use_noise_fallback) {
        // Fallback procedural ripple
        float n = noise(SCREEN_UV * 10.0 + TIME * speed);
        displacement = vec2(cos(n * 6.28), sin(n * 6.28));
    }
    
    vec2 uv = SCREEN_UV + displacement * intensity;
    COLOR = texture(SCREEN_TEXTURE, uv);
}
