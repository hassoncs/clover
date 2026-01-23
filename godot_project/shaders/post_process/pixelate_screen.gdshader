shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_nearest;

uniform float pixel_size : hint_range(1.0, 32.0) = 4.0;
uniform bool color_reduction = false;
uniform float color_levels : hint_range(2.0, 32.0) = 8.0;
uniform bool dithering = false;

float dither_matrix(vec2 pos) {
	// 4x4 Bayer dithering matrix
	int x = int(mod(pos.x, 4.0));
	int y = int(mod(pos.y, 4.0));
	int index = x + y * 4;
	
	float matrix[16] = float[16](
		0.0, 8.0, 2.0, 10.0,
		12.0, 4.0, 14.0, 6.0,
		3.0, 11.0, 1.0, 9.0,
		15.0, 7.0, 13.0, 5.0
	);
	
	return matrix[index] / 16.0;
}

void fragment() {
	// Calculate pixelated UV
	vec2 screen_size = 1.0 / SCREEN_PIXEL_SIZE;
	vec2 pixel_uv = floor(SCREEN_UV * screen_size / pixel_size) * pixel_size / screen_size;
	
	vec3 color = texture(SCREEN_TEXTURE, pixel_uv).rgb;
	
	if (color_reduction) {
		if (dithering) {
			// Apply dithering before color reduction
			vec2 dither_pos = SCREEN_UV * screen_size / pixel_size;
			float dither = dither_matrix(dither_pos) - 0.5;
			color += dither / color_levels;
		}
		
		// Reduce color palette
		color = floor(color * color_levels) / (color_levels - 1.0);
	}
	
	COLOR = vec4(color, 1.0);
}
