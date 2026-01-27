shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;
uniform float intensity : hint_range(0.0, 1.0) = 0.5;
uniform float noise_strength : hint_range(0.0, 1.0) = 0.3;
uniform float scanline_strength : hint_range(0.0, 1.0) = 0.1;
uniform float vignette_size : hint_range(0.0, 1.0) = 0.4;

// Simple pseudo-random noise
float random(vec2 uv) {
    return fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453123);
}

void fragment() {
    vec4 color = texture(SCREEN_TEXTURE, SCREEN_UV);
    
    // 1. Green Tint & Light Amplification
    // Convert to grayscale first using luminance weights
    float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    
    // Boost light levels (night vision amplifies weak light)
    lum = pow(lum, 0.8) * 1.5;
    
    // Apply green phosphor tint
    vec3 vision_color = vec3(0.0, lum, 0.0);
    
    // 2. Scanlines
    float scanline = sin(SCREEN_UV.y * 800.0) * 0.5 + 0.5;
    vision_color *= 1.0 - (scanline * scanline_strength);
    
    // 3. Noise/Grain (animated by time if passed, static here for now)
    float noise = random(SCREEN_UV + vec2(TIME * 10.0));
    vision_color += noise * noise_strength;
    
    // 4. Vignette (darker corners)
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(SCREEN_UV, center);
    float vignette = smoothstep(vignette_size, vignette_size + 0.4, dist);
    vision_color *= (1.0 - vignette);
    
    // Mix with original based on intensity
    COLOR = vec4(mix(color.rgb, vision_color, intensity), color.a);
}
