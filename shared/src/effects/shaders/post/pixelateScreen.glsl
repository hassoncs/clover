#include "../_lib/math.glsl"

shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_nearest;

uniform float pixel_size : hint_range(1.0, 32.0) = 4.0;
uniform bool color_reduction = false;
uniform float color_levels : hint_range(2.0, 32.0) = 8.0;
uniform bool dithering = false;

void fragment() {
	// Calculate pixelated UV
	vec2 screen_size = 1.0 / SCREEN_PIXEL_SIZE;
	vec2 pixel_uv = floor(SCREEN_UV * screen_size / pixel_size) * pixel_size / screen_size;
	
	vec3 color = texture(SCREEN_TEXTURE, pixel_uv).rgb;
	
	if (color_reduction) {
		if (dithering) {
			// Apply dithering before color reduction
			vec2 dither_pos = SCREEN_UV * screen_size / pixel_size;
			float dither = ditherMatrix(dither_pos) - 0.5;
			color += dither / color_levels;
		}
		
		// Reduce color palette
		color = floor(color * color_levels) / (color_levels - 1.0);
	}
	
	COLOR = vec4(color, 1.0);
}