shader_type canvas_item;

#include "../_lib/math.glsl"

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform vec4 color_low : source_color = vec4(0.0, 0.0, 0.0, 1.0);
uniform vec4 color_mid : source_color = vec4(0.5, 0.5, 0.5, 1.0);
uniform vec4 color_high : source_color = vec4(1.0, 1.0, 1.0, 1.0);
uniform float midpoint : hint_range(0.0, 1.0) = 0.5;
uniform float intensity : hint_range(0.0, 1.0) = 1.0;

void fragment() {
	vec4 src = texture(SCREEN_TEXTURE, SCREEN_UV);
	float lum = luminance(src.rgb);

	float mid = clamp(midpoint, 0.0, 1.0);
	vec3 mapped;

	if (lum <= mid) {
		float t = lum / max(mid, 0.00001);
		mapped = mix(color_low.rgb, color_mid.rgb, t);
	} else {
		float t = (lum - mid) / max(1.0 - mid, 0.00001);
		mapped = mix(color_mid.rgb, color_high.rgb, t);
	}

	vec3 result = mix(src.rgb, mapped, intensity);
	COLOR = vec4(result, src.a);
}
