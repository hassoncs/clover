shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform float scale : hint_range(0.1, 4.0) = 1.0;
uniform int filter_mode : hint_range(0, 1) = 0;
uniform bool maintain_aspect = true;

void fragment() {
	float s = max(scale, 0.0001);
	vec2 centered = SCREEN_UV - vec2(0.5);

	if (maintain_aspect) {
		float aspect = SCREEN_PIXEL_SIZE.y / SCREEN_PIXEL_SIZE.x;
		centered.x *= aspect;
		centered /= s;
		centered.x /= aspect;
	} else {
		centered /= s;
	}

	vec2 uv = centered + vec2(0.5);
	if (filter_mode == 1) {
		uv = (floor(uv / SCREEN_PIXEL_SIZE) + 0.5) * SCREEN_PIXEL_SIZE;
	}

	COLOR = texture(SCREEN_TEXTURE, clamp(uv, vec2(0.0), vec2(1.0)));
}
