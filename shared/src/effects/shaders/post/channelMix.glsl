shader_type canvas_item;

#include "../_lib/math.glsl"

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform int red_source : hint_range(0, 6) = 0;
uniform int green_source : hint_range(0, 6) = 1;
uniform int blue_source : hint_range(0, 6) = 2;
uniform int alpha_source : hint_range(0, 6) = 3;
uniform bool invert_r = false;
uniform bool invert_g = false;
uniform bool invert_b = false;

float channel_from_source(int source, vec4 sample_color, float lum) {
	if (source == 0) {
		return sample_color.r;
	}
	if (source == 1) {
		return sample_color.g;
	}
	if (source == 2) {
		return sample_color.b;
	}
	if (source == 3) {
		return sample_color.a;
	}
	if (source == 4) {
		return lum;
	}
	if (source == 5) {
		return 0.0;
	}
	return 1.0;
}

void fragment() {
	vec4 source = texture(SCREEN_TEXTURE, SCREEN_UV);
	float lum = luminance(source.rgb);

	float r = channel_from_source(red_source, source, lum);
	float g = channel_from_source(green_source, source, lum);
	float b = channel_from_source(blue_source, source, lum);
	float a = channel_from_source(alpha_source, source, lum);

	if (invert_r) {
		r = 1.0 - r;
	}
	if (invert_g) {
		g = 1.0 - g;
	}
	if (invert_b) {
		b = 1.0 - b;
	}

	COLOR = vec4(clamp(vec3(r, g, b), 0.0, 1.0), clamp(a, 0.0, 1.0));
}
