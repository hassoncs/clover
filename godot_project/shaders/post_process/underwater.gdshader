shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_repeat_linear;
uniform float intensity : hint_range(0.0, 1.0) = 0.5;
uniform float wave_speed : hint_range(0.1, 5.0) = 1.0;
uniform float wave_frequency : hint_range(1.0, 20.0) = 10.0;
uniform float wave_amplitude : hint_range(0.001, 0.05) = 0.01;
uniform vec4 water_tint : source_color = vec4(0.0, 0.4, 0.8, 0.3);

void fragment() {
    // 1. UV Distortion (Wave effect)
    vec2 uv = SCREEN_UV;
    
    // Horizontal wave
    uv.x += sin(uv.y * wave_frequency + TIME * wave_speed) * wave_amplitude;
    // Vertical wave (offset phase)
    uv.y += cos(uv.x * wave_frequency + TIME * wave_speed) * wave_amplitude;
    
    // Sample texture with distorted UVs
    vec4 color = texture(SCREEN_TEXTURE, uv);
    
    // 2. Depth Tinting (Blue atmosphere)
    // Mix original color with water tint
    vec3 tinted = mix(color.rgb, water_tint.rgb, water_tint.a * intensity);
    
    // 3. Simple Caustics (simulated light patterns)
    // Overlap two sine waves moving differently
    float caustics = sin(uv.x * 20.0 + TIME) * sin(uv.y * 15.0 - TIME * 0.5);
    caustics = smoothstep(0.5, 0.8, caustics) * 0.1 * intensity;
    
    COLOR = vec4(tinted + vec3(caustics), color.a);
}
