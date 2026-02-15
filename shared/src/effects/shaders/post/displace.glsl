shader_type canvas_item;

#include "../_lib/noise.glsl"

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform float strength : hint_range(0.0, 100.0) = 10.0;
uniform float noise_scale : hint_range(1.0, 50.0) = 10.0;
uniform float noise_speed : hint_range(0.0, 5.0) = 1.0;
uniform int direction : hint_range(0, 2) = 0; // 0=both, 1=horizontal, 2=vertical

void fragment() {
	float t = TIME * noise_speed;
	vec2 p = SCREEN_UV * noise_scale + vec2(t);

	float eps = 0.001;
	float nx0 = noise(p - vec2(eps, 0.0));
	float nx1 = noise(p + vec2(eps, 0.0));
	float ny0 = noise(p - vec2(0.0, eps));
	float ny1 = noise(p + vec2(0.0, eps));

	vec2 grad = vec2(nx1 - nx0, ny1 - ny0) / (2.0 * eps);
	vec2 offset = grad * strength * SCREEN_PIXEL_SIZE;

	if (direction == 1) {
		offset.y = 0.0;
	} else if (direction == 2) {
		offset.x = 0.0;
	}

	COLOR = texture(SCREEN_TEXTURE, SCREEN_UV + offset);
}
