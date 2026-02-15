shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform float strength : hint_range(0.0, 5.0) = 1.0;
uniform float radius : hint_range(0.5, 5.0) = 1.0;

void fragment() {
	vec2 ps = SCREEN_PIXEL_SIZE * radius;
	vec4 center = texture(SCREEN_TEXTURE, SCREEN_UV);
	vec3 up = texture(SCREEN_TEXTURE, SCREEN_UV + vec2(0.0, -ps.y)).rgb;
	vec3 down = texture(SCREEN_TEXTURE, SCREEN_UV + vec2(0.0, ps.y)).rgb;
	vec3 left = texture(SCREEN_TEXTURE, SCREEN_UV + vec2(-ps.x, 0.0)).rgb;
	vec3 right = texture(SCREEN_TEXTURE, SCREEN_UV + vec2(ps.x, 0.0)).rgb;

	vec3 laplacian = 5.0 * center.rgb - (up + down + left + right);
	vec3 sharpened = center.rgb + laplacian * strength;

	COLOR = vec4(clamp(sharpened, 0.0, 1.0), center.a);
}
