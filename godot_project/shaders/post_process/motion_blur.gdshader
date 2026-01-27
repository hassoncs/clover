shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform vec2 velocity = vec2(0.0, 0.0);
uniform float strength : hint_range(0.0, 1.0) = 0.5;
uniform vec2 radial_center = vec2(0.5, 0.5);
uniform bool use_radial = false;

void fragment() {
	vec2 blur_dir;
	
	if (use_radial) {
		blur_dir = (SCREEN_UV - radial_center) * strength * 0.1;
	} else {
		blur_dir = velocity * SCREEN_PIXEL_SIZE * strength * 10.0;
	}
	
	vec4 color = vec4(0.0);
	float total_weight = 0.0;
	
	// Fixed 8 samples for WebGL compatibility
	float sample_offsets[8] = float[](-0.5, -0.357, -0.214, -0.071, 0.071, 0.214, 0.357, 0.5);
	
	for (int i = 0; i < 8; i++) {
		float t = sample_offsets[i];
		vec2 offset = blur_dir * t;
		float weight = 1.0 - abs(t) * 0.5;
		
		color += texture(SCREEN_TEXTURE, SCREEN_UV + offset) * weight;
		total_weight += weight;
	}
	
	COLOR = color / total_weight;
}
