shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform bool mirror_x = true;
uniform bool mirror_y = false;
uniform int mirror_mode : hint_range(0, 1) = 0;

float mirror_axis(float v, bool enabled) {
	if (!enabled) {
		return v;
	}
	if (mirror_mode == 0) {
		return 1.0 - v;
	}
	return abs(v - 0.5) * 2.0;
}

void fragment() {
	vec2 uv = SCREEN_UV;
	uv.x = mirror_axis(uv.x, mirror_x);
	uv.y = mirror_axis(uv.y, mirror_y);
	COLOR = texture(SCREEN_TEXTURE, clamp(uv, vec2(0.0), vec2(1.0)));
}
