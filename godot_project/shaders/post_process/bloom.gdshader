shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;
uniform float threshold : hint_range(0.0, 1.0) = 0.8;
uniform float intensity : hint_range(0.0, 5.0) = 1.5;
uniform float radius : hint_range(0.0, 10.0) = 3.0;

void fragment() {
    vec4 color = texture(SCREEN_TEXTURE, SCREEN_UV);
    vec3 bloom = vec3(0.0);
    
    // Simple 9-tap box blur approximation for single-pass performance
    vec2 ps = SCREEN_PIXEL_SIZE * radius;
    
    // Loop through 3x3 grid centered on current pixel
    for (float x = -1.0; x <= 1.0; x += 1.0) {
        for (float y = -1.0; y <= 1.0; y += 1.0) {
            vec2 offset = vec2(x, y) * ps;
            vec4 sample_col = texture(SCREEN_TEXTURE, SCREEN_UV + offset);
            
            // Calculate brightness
            float brightness = dot(sample_col.rgb, vec3(0.2126, 0.7152, 0.0722));
            
            // Only add to bloom if brightness exceeds threshold
            if (brightness > threshold) {
                // Soft knee curve for smoother threshold transition
                float factor = smoothstep(threshold, threshold + 0.1, brightness);
                bloom += sample_col.rgb * factor;
            }
        }
    }
    
    // Average the samples (9 samples total)
    bloom /= 9.0;
    
    // Add bloom to original color
    COLOR = vec4(color.rgb + bloom * intensity, color.a);
}
