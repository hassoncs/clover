shader_type canvas_item;

#include "../_lib/math.glsl"

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform float cutoff : hint_range(0.0, 1.0) = 0.5;
uniform float softness : hint_range(0.0, 0.5) = 0.0;
uniform bool use_luminance = true;
uniform vec4 output_color : source_color = vec4(1.0, 1.0, 1.0, 1.0);
uniform vec4 bg_color : source_color = vec4(0.0, 0.0, 0.0, 1.0);

void fragment() {
	vec4 src = texture(SCREEN_TEXTURE, SCREEN_UV);
	float value = use_luminance ? luminance(src.rgb) : (src.r + src.g + src.b) / 3.0;

	float t;
	if (softness <= 0.0) {
		t = step(cutoff, value);
	} else {
		t = smoothstep(cutoff - softness, cutoff + softness, value);
	}

	COLOR = mix(bg_color, output_color, t);
}
