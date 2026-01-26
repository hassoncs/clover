shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;
// Mask: R = Explored (Permanent), G = Visible (Current)
uniform sampler2D mask_texture : filter_linear;

uniform vec4 fog_color : source_color = vec4(0.0, 0.0, 0.0, 0.5);
uniform vec4 unexplored_color : source_color = vec4(0.0, 0.0, 0.0, 1.0);
uniform float smoothness : hint_range(0.0, 0.2) = 0.05;

void fragment() {
    vec4 color = texture(SCREEN_TEXTURE, SCREEN_UV);
    vec4 mask = texture(mask_texture, SCREEN_UV);
    
    float explored = mask.r;
    float visible = mask.g;
    
    // Smooth transitions
    // 1. Unexplored (Black)
    float unexplored_factor = smoothstep(0.5 - smoothness, 0.5 + smoothness, explored);
    
    // 2. Fog (Dimmed)
    float visible_factor = smoothstep(0.5 - smoothness, 0.5 + smoothness, visible);
    
    // Logic:
    // If not explored -> Unexplored Color
    // If explored but not visible -> Fog Color (mix with screen)
    // If visible -> Screen Color
    
    vec3 result = color.rgb;
    
    // Apply Fog (Dimming)
    // Mix screen color with fog color based on visibility
    result = mix(mix(result, fog_color.rgb, fog_color.a), result, visible_factor);
    
    // Apply Unexplored (Blackout)
    result = mix(unexplored_color.rgb, result, unexplored_factor);
    
    COLOR = vec4(result, color.a);
}
