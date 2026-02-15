shader_type canvas_item;

#include "../_lib/noise.glsl"
#include "../_lib/math.glsl"

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform float grain_amount : hint_range(0.0, 1.0) = 0.15;
uniform float grain_size : hint_range(1.0, 5.0) = 1.5;
uniform float luminance_response : hint_range(0.0, 1.0) = 0.5;
uniform bool colored = false;

void fragment() {
	vec4 original = texture(SCREEN_TEXTURE, SCREEN_UV);
	vec2 grain_uv = SCREEN_UV * (1.0 / max(grain_size, 0.0001)) + vec2(TIME * 100.0);

	float l = luminance(original.rgb);
	float midtone = 1.0 - abs(l * 2.0 - 1.0);
	float response = mix(1.0, midtone, luminance_response);

	vec3 grain;
	if (colored) {
		grain.r = noise(grain_uv + vec2(11.3, 7.1)) - 0.5;
		grain.g = noise(grain_uv + vec2(23.7, 19.4)) - 0.5;
		grain.b = noise(grain_uv + vec2(37.2, 29.8)) - 0.5;
	} else {
		float n = noise(grain_uv) - 0.5;
		grain = vec3(n);
	}

	vec3 result = original.rgb + grain * (grain_amount * response);
	COLOR = vec4(clamp(result, 0.0, 1.0), original.a);
}
