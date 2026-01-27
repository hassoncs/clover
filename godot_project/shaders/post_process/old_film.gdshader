shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform float sepia_strength : hint_range(0.0, 1.0) = 0.8;
uniform float scratch_strength : hint_range(0.0, 1.0) = 0.3;
uniform float noise_strength : hint_range(0.0, 1.0) = 0.2;
uniform float vignette_size : hint_range(0.0, 1.0) = 0.4;

float random(vec2 uv) {
    return fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453123);
}

void fragment() {
    vec4 color = texture(SCREEN_TEXTURE, SCREEN_UV);
    
    // 1. Sepia Tone
    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    vec3 sepia = vec3(gray) * vec3(1.2, 1.0, 0.8);
    color.rgb = mix(color.rgb, sepia, sepia_strength);
    
    // 2. Grain Noise (animated)
    float noise = random(SCREEN_UV + vec2(TIME * 5.0));
    color.rgb += (noise - 0.5) * noise_strength;
    
    // 3. Scratches (vertical lines jumping horizontally)
    // We use time to jump the x position
    float scratch_x = floor(TIME * 2.0) * 0.37; // Jump around
    float scratch_line = step(0.998, random(vec2(SCREEN_UV.x + scratch_x, 0.0)));
    
    // Scratches are dark
    color.rgb *= (1.0 - scratch_line * scratch_strength);
    
    // 4. Flicker (global brightness fluctuation)
    float flicker = 1.0 - (random(vec2(TIME)) * 0.1);
    color.rgb *= flicker;
    
    // 5. Vignette (Classic darken corners)
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(SCREEN_UV, center);
    float vignette = smoothstep(vignette_size, vignette_size + 0.5, dist);
    color.rgb *= (1.0 - vignette);
    
    COLOR = color;
}
