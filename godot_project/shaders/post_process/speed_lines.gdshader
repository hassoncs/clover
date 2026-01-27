shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;
uniform float intensity : hint_range(0.0, 1.0) = 0.5;
uniform float density : hint_range(0.0, 1.0) = 0.2;
uniform float speed : hint_range(0.1, 10.0) = 2.0;
uniform vec2 center = vec2(0.5, 0.5);

// Simple noise function
float random(vec2 uv) {
    return fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453123);
}

void fragment() {
    vec4 color = texture(SCREEN_TEXTURE, SCREEN_UV);
    
    // Convert to polar coordinates centered on screen
    vec2 uv_centered = SCREEN_UV - center;
    float dist = length(uv_centered);
    float angle = atan(uv_centered.y, uv_centered.x);
    
    // Create radial streaks
    // We map angle to X and time to Y in noise function
    float noise_val = random(vec2(angle * 20.0, TIME * speed));
    
    // Threshold the noise to create lines
    float lines = step(1.0 - density, noise_val);
    
    // Fade out near center (exclusion zone)
    float mask = smoothstep(0.2, 0.5, dist);
    
    // Combine
    float effect = lines * mask * intensity;
    
    // Add lines to screen (additive blending)
    COLOR = vec4(color.rgb + vec3(effect), color.a);
}
