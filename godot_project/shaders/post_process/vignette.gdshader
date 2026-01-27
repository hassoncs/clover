shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform float vignette_intensity : hint_range(0.0, 2.0) = 0.4;
uniform float vignette_opacity : hint_range(0.0, 1.0) = 0.5;
uniform vec4 vignette_color : source_color = vec4(0.0, 0.0, 0.0, 1.0);
uniform float vignette_roundness : hint_range(0.0, 1.0) = 1.0;
uniform vec2 vignette_center = vec2(0.5, 0.5);

void fragment() {
	vec4 screen_color = texture(SCREEN_TEXTURE, SCREEN_UV);
	
	// Calculate vignette
	vec2 uv = SCREEN_UV - vignette_center;
	
	// Adjust for aspect ratio if needed
	float aspect = SCREEN_PIXEL_SIZE.y / SCREEN_PIXEL_SIZE.x;
	uv.x *= mix(1.0, aspect, vignette_roundness);
	
	float dist = length(uv) * 2.0;
	float vignette = 1.0 - pow(dist, vignette_intensity + 1.0);
	vignette = clamp(vignette, 0.0, 1.0);
	
	// Apply vignette
	vec3 result = mix(vignette_color.rgb, screen_color.rgb, mix(1.0, vignette, vignette_opacity));
	
	COLOR = vec4(result, 1.0);
}
