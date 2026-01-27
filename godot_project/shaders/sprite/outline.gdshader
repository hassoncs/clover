shader_type canvas_item;

uniform vec4 outline_color : source_color = vec4(1.0, 1.0, 0.0, 1.0);
uniform float outline_width : hint_range(0.0, 10.0) = 2.0;
uniform bool outline_only = false;

void fragment() {
	vec4 sprite_color = texture(TEXTURE, UV);
	
	// For Polygon2D: use inner outline (draw outline where neighbor is transparent)
	// Check if any neighboring pixel is transparent (outside the shape)
	vec2 ps = TEXTURE_PIXEL_SIZE * outline_width;
	
	float neighbor_alpha = 1.0;
	neighbor_alpha = min(neighbor_alpha, texture(TEXTURE, UV + vec2(-ps.x, -ps.y)).a);
	neighbor_alpha = min(neighbor_alpha, texture(TEXTURE, UV + vec2(0.0, -ps.y)).a);
	neighbor_alpha = min(neighbor_alpha, texture(TEXTURE, UV + vec2(ps.x, -ps.y)).a);
	neighbor_alpha = min(neighbor_alpha, texture(TEXTURE, UV + vec2(-ps.x, 0.0)).a);
	neighbor_alpha = min(neighbor_alpha, texture(TEXTURE, UV + vec2(ps.x, 0.0)).a);
	neighbor_alpha = min(neighbor_alpha, texture(TEXTURE, UV + vec2(-ps.x, ps.y)).a);
	neighbor_alpha = min(neighbor_alpha, texture(TEXTURE, UV + vec2(0.0, ps.y)).a);
	neighbor_alpha = min(neighbor_alpha, texture(TEXTURE, UV + vec2(ps.x, ps.y)).a);
	
	vec4 final_color;
	// Inner outline: current pixel is opaque but at least one neighbor is transparent
	if (sprite_color.a > 0.1 && neighbor_alpha < 0.1) {
		final_color = outline_color;
		final_color.a = sprite_color.a;
	} else if (outline_only) {
		final_color = vec4(0.0);
	} else {
		final_color = sprite_color;
	}
	COLOR = final_color;
}
