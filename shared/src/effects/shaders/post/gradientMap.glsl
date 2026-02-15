shader_type canvas_item;

#include "../_lib/math.glsl"

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform vec4 color_0 : source_color = vec4(0.0, 0.0, 0.0, 1.0);
uniform vec4 color_25 : source_color = vec4(0.0, 0.1, 0.3, 1.0);
uniform vec4 color_50 : source_color = vec4(0.0, 0.6, 0.2, 1.0);
uniform vec4 color_75 : source_color = vec4(1.0, 0.9, 0.2, 1.0);
uniform vec4 color_100 : source_color = vec4(1.0, 1.0, 1.0, 1.0);
uniform float intensity : hint_range(0.0, 1.0) = 1.0;

void fragment() {
	vec4 original = texture(SCREEN_TEXTURE, SCREEN_UV);
	float t = clamp(luminance(original.rgb), 0.0, 1.0);

	vec3 mapped;
	if (t < 0.25) {
		float f = smoothstep(0.0, 0.25, t);
		mapped = mix(color_0.rgb, color_25.rgb, f);
	} else if (t < 0.5) {
		float f = smoothstep(0.25, 0.5, t);
		mapped = mix(color_25.rgb, color_50.rgb, f);
	} else if (t < 0.75) {
		float f = smoothstep(0.5, 0.75, t);
		mapped = mix(color_50.rgb, color_75.rgb, f);
	} else {
		float f = smoothstep(0.75, 1.0, t);
		mapped = mix(color_75.rgb, color_100.rgb, f);
	}

	vec3 result = mix(original.rgb, mapped, intensity);
	COLOR = vec4(clamp(result, 0.0, 1.0), original.a);
}
