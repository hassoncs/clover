shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;
uniform float intensity : hint_range(0.0, 1.0) = 1.0;

// Thermal Gradient Colors
const vec3 C0 = vec3(0.0, 0.0, 0.2); // Deep Blue (Coldest)
const vec3 C1 = vec3(0.0, 0.0, 1.0); // Blue
const vec3 C2 = vec3(0.0, 1.0, 1.0); // Cyan
const vec3 C3 = vec3(0.0, 1.0, 0.0); // Green
const vec3 C4 = vec3(1.0, 1.0, 0.0); // Yellow
const vec3 C5 = vec3(1.0, 0.0, 0.0); // Red
const vec3 C6 = vec3(1.0, 1.0, 1.0); // White (Hottest)

vec3 thermal_map(float v) {
    if (v < 0.166) return mix(C0, C1, v / 0.166);
    if (v < 0.333) return mix(C1, C2, (v - 0.166) / 0.166);
    if (v < 0.500) return mix(C2, C3, (v - 0.333) / 0.166);
    if (v < 0.666) return mix(C3, C4, (v - 0.500) / 0.166);
    if (v < 0.833) return mix(C4, C5, (v - 0.666) / 0.166);
    return mix(C5, C6, (v - 0.833) / 0.166);
}

void fragment() {
    vec4 color = texture(SCREEN_TEXTURE, SCREEN_UV);
    
    // Calculate luminance (heat value)
    float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    
    // Map luminance to thermal gradient
    vec3 thermal = thermal_map(lum);
    
    COLOR = vec4(mix(color.rgb, thermal, intensity), color.a);
}
