shader_type canvas_item;

#include "../_lib/math.glsl"

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform vec4 color_dark : source_color = vec4(0.05, 0.05, 0.2, 1.0);
uniform vec4 color_light : source_color = vec4(1.0, 0.8, 0.5, 1.0);
uniform float intensity : hint_range(0.0, 1.0) = 1.0;

void fragment() {
	vec4 original = texture(SCREEN_TEXTURE, SCREEN_UV);
	float l = luminance(original.rgb);
	vec3 mapped = mix(color_dark.rgb, color_light.rgb, l);
	vec3 result = mix(original.rgb, mapped, intensity);
	COLOR = vec4(clamp(result, 0.0, 1.0), original.a);
}
