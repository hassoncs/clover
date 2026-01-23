shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform float blur_amount : hint_range(0.0, 10.0) = 2.0;

void fragment() {
	vec4 color = vec4(0.0);
	float total_weight = 0.0;
	vec2 ps = SCREEN_PIXEL_SIZE * blur_amount;
	
	color += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(-2.0 * ps.x, -2.0 * ps.y)) * 0.0183;
	color += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(-1.0 * ps.x, -2.0 * ps.y)) * 0.0821;
	color += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(0.0, -2.0 * ps.y)) * 0.135;
	color += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(1.0 * ps.x, -2.0 * ps.y)) * 0.0821;
	color += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(2.0 * ps.x, -2.0 * ps.y)) * 0.0183;
	
	color += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(-2.0 * ps.x, -1.0 * ps.y)) * 0.0821;
	color += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(-1.0 * ps.x, -1.0 * ps.y)) * 0.368;
	color += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(0.0, -1.0 * ps.y)) * 0.606;
	color += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(1.0 * ps.x, -1.0 * ps.y)) * 0.368;
	color += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(2.0 * ps.x, -1.0 * ps.y)) * 0.0821;
	
	color += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(-2.0 * ps.x, 0.0)) * 0.135;
	color += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(-1.0 * ps.x, 0.0)) * 0.606;
	color += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(0.0, 0.0)) * 1.0;
	color += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(1.0 * ps.x, 0.0)) * 0.606;
	color += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(2.0 * ps.x, 0.0)) * 0.135;
	
	color += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(-2.0 * ps.x, 1.0 * ps.y)) * 0.0821;
	color += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(-1.0 * ps.x, 1.0 * ps.y)) * 0.368;
	color += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(0.0, 1.0 * ps.y)) * 0.606;
	color += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(1.0 * ps.x, 1.0 * ps.y)) * 0.368;
	color += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(2.0 * ps.x, 1.0 * ps.y)) * 0.0821;
	
	color += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(-2.0 * ps.x, 2.0 * ps.y)) * 0.0183;
	color += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(-1.0 * ps.x, 2.0 * ps.y)) * 0.0821;
	color += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(0.0, 2.0 * ps.y)) * 0.135;
	color += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(1.0 * ps.x, 2.0 * ps.y)) * 0.0821;
	color += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(2.0 * ps.x, 2.0 * ps.y)) * 0.0183;
	
	total_weight = 6.2196;
	
	COLOR = color / total_weight;
}
