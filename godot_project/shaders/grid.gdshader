shader_type spatial;
render_mode unshaded, blend_mix, depth_draw_opaque, cull_disabled;

varying vec3 world_pos;

uniform float grid_size = 1.0;
uniform float line_width = 0.02;
uniform vec4 color : source_color = vec4(0.5, 0.5, 0.5, 0.5);
uniform float fade_start = 20.0;
uniform float fade_end = 40.0;

void vertex() {
	world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

float grid(vec2 pos, float scale) {
	vec2 coord = pos * scale;
	vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
	float line = min(grid.x, grid.y);
	return 1.0 - min(line, 1.0);
}

void fragment() {
	// Base grid
	float g = grid(world_pos.xz, 1.0 / grid_size);
	
	// Thicker lines every 10 units
	float g_major = grid(world_pos.xz, 0.1 / grid_size); // 10x larger cells
	
	// Combine grids
	float combined_grid = max(g * 0.5, g_major);
	
	// Distance fade
	float dist = length(world_pos.xz - CAMERA_POSITION_WORLD.xz);
	float alpha = smoothstep(fade_end, fade_start, dist);
	
	// Axes
	// X axis (Z=0) is Red
	float axis_x = step(abs(world_pos.z), line_width * 2.0);
	// Z axis (X=0) is Blue
	float axis_z = step(abs(world_pos.x), line_width * 2.0);
	
	vec3 final_color = color.rgb;
	float final_alpha = combined_grid;
	
	if (axis_x > 0.5) {
		final_color = vec3(0.8, 0.2, 0.2);
		final_alpha = 1.0;
	} else if (axis_z > 0.5) {
		final_color = vec3(0.2, 0.2, 0.8);
		final_alpha = 1.0;
	}
	
	ALBEDO = final_color;
	ALPHA = final_alpha * alpha * color.a;
}
