shader_type canvas_item;

#include "../_lib/noise.glsl"

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform float cell_size : hint_range(5.0, 100.0) = 20.0;
uniform float edge_width : hint_range(0.0, 5.0) = 1.0;
uniform vec4 edge_color : source_color = vec4(0.0, 0.0, 0.0, 1.0);
uniform float randomness : hint_range(0.0, 1.0) = 0.8;
uniform bool round_cells = false;

float cell_distance(vec2 d, bool rounded) {
	if (rounded) {
		return length(d);
	}
	vec2 ad = abs(d);
	return max(ad.x, ad.y);
}

void fragment() {
	vec2 pixel_uv = SCREEN_UV / SCREEN_PIXEL_SIZE;
	vec2 grid = pixel_uv / cell_size;
	vec2 base_cell = floor(grid);

	float nearest = 1e20;
	float second_nearest = 1e20;
	vec2 nearest_center = base_cell + vec2(0.5);

	for (int y = -1; y <= 1; y++) {
		for (int x = -1; x <= 1; x++) {
			vec2 cell = base_cell + vec2(float(x), float(y));
			vec2 jitter = vec2(hash(cell + vec2(3.1, 7.9)), hash(cell + vec2(11.7, 5.3))) - vec2(0.5);
			jitter *= randomness * 0.9;
			vec2 center = cell + vec2(0.5) + jitter;

			float d = cell_distance(center - grid, round_cells);
			if (d < nearest) {
				second_nearest = nearest;
				nearest = d;
				nearest_center = center;
			} else if (d < second_nearest) {
				second_nearest = d;
			}
		}
	}

	vec2 sample_pixel = nearest_center * cell_size;
	vec2 sample_uv = clamp(sample_pixel * SCREEN_PIXEL_SIZE, vec2(0.0), vec2(1.0));
	vec4 cell_color = texture(SCREEN_TEXTURE, sample_uv);

	float edge_dist = 0.5 * (second_nearest - nearest);
	float edge_threshold = edge_width / cell_size;
	float edge_mask = 1.0 - smoothstep(0.0, max(edge_threshold, 0.0001), edge_dist);

	vec3 result = mix(cell_color.rgb, edge_color.rgb, edge_mask);
	COLOR = vec4(result, cell_color.a);
}
