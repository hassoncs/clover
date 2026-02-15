shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform float translate_x : hint_range(-1.0, 1.0) = 0.0;
uniform float translate_y : hint_range(-1.0, 1.0) = 0.0;
uniform float scale_x : hint_range(0.1, 10.0) = 1.0;
uniform float scale_y : hint_range(0.1, 10.0) = 1.0;
uniform float rotation : hint_range(0.0, 360.0) = 0.0;
uniform int tile_x : hint_range(1, 10) = 1;
uniform int tile_y : hint_range(1, 10) = 1;
uniform int extend_mode : hint_range(0, 2) = 0; // 0=clamp, 1=repeat, 2=mirror

float mirror_coord(float x) {
	return 1.0 - abs(mod(x, 2.0) - 1.0);
}

void fragment() {
	vec2 uv = SCREEN_UV - vec2(0.5);

	uv *= vec2(scale_x, scale_y);

	float angle = radians(rotation);
	float s = sin(angle);
	float c = cos(angle);
	uv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);

	uv += vec2(translate_x, translate_y);
	uv *= vec2(float(tile_x), float(tile_y));
	uv += vec2(0.5);

	if (extend_mode == 1) {
		uv = fract(uv);
	} else if (extend_mode == 2) {
		uv = vec2(mirror_coord(uv.x), mirror_coord(uv.y));
	} else {
		if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
			COLOR = vec4(0.0);
			return;
		}
	}

	COLOR = texture(SCREEN_TEXTURE, uv);
}
