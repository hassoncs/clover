shader_type canvas_item;

uniform vec4 glow_color : source_color = vec4(1.0, 0.8, 0.2, 1.0);
uniform float glow_intensity : hint_range(0.0, 5.0) = 1.5;
uniform float glow_size : hint_range(1.0, 20.0) = 4.0;
uniform float pulse_speed : hint_range(0.0, 10.0) = 0.0;

void fragment() {
	vec4 sprite_color = texture(TEXTURE, UV);
	
	// Inner glow: detect proximity to transparent edge
	vec2 ps = TEXTURE_PIXEL_SIZE * glow_size;
	
	// Sample neighbors to find minimum alpha (distance to edge)
	float min_alpha = 1.0;
	min_alpha = min(min_alpha, texture(TEXTURE, UV + vec2(-ps.x, -ps.y)).a);
	min_alpha = min(min_alpha, texture(TEXTURE, UV + vec2(0.0, -ps.y)).a);
	min_alpha = min(min_alpha, texture(TEXTURE, UV + vec2(ps.x, -ps.y)).a);
	min_alpha = min(min_alpha, texture(TEXTURE, UV + vec2(-ps.x, 0.0)).a);
	min_alpha = min(min_alpha, texture(TEXTURE, UV + vec2(ps.x, 0.0)).a);
	min_alpha = min(min_alpha, texture(TEXTURE, UV + vec2(-ps.x, ps.y)).a);
	min_alpha = min(min_alpha, texture(TEXTURE, UV + vec2(0.0, ps.y)).a);
	min_alpha = min(min_alpha, texture(TEXTURE, UV + vec2(ps.x, ps.y)).a);
	
	// Also sample at half distance for smoother gradient
	min_alpha = min(min_alpha, texture(TEXTURE, UV + vec2(-ps.x * 0.5, -ps.y * 0.5)).a);
	min_alpha = min(min_alpha, texture(TEXTURE, UV + vec2(ps.x * 0.5, -ps.y * 0.5)).a);
	min_alpha = min(min_alpha, texture(TEXTURE, UV + vec2(-ps.x * 0.5, ps.y * 0.5)).a);
	min_alpha = min(min_alpha, texture(TEXTURE, UV + vec2(ps.x * 0.5, ps.y * 0.5)).a);
	
	// Glow strength based on proximity to edge (where min_alpha < 1)
	float edge_proximity = 1.0 - min_alpha;
	
	float intensity = glow_intensity;
	if (pulse_speed > 0.0) {
		float pulse = sin(TIME * pulse_speed) * 0.5 + 0.5;
		intensity *= 1.0 + pulse * 0.3;
	}
	
	// Blend glow color with sprite color near edges
	vec3 final_rgb = mix(sprite_color.rgb, glow_color.rgb, edge_proximity * intensity * 0.5);
	
	COLOR = vec4(final_rgb, sprite_color.a);
}
