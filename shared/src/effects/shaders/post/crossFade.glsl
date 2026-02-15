shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform float mix_amount : hint_range(0.0, 1.0) = 0.5;
uniform vec4 fade_color : source_color = vec4(0.0, 0.0, 0.0, 1.0);
uniform bool use_color = true;
uniform int fade_mode : hint_range(0, 3) = 0;

float apply_fade_curve(float t) {
	if (fade_mode == 1) {
		return t * t * (3.0 - 2.0 * t);
	}
	if (fade_mode == 2) {
		return t * t;
	}
	if (fade_mode == 3) {
		return 1.0 - (1.0 - t) * (1.0 - t);
	}
	return t;
}

void fragment() {
	vec4 source = texture(SCREEN_TEXTURE, SCREEN_UV);
	float t = apply_fade_curve(clamp(mix_amount, 0.0, 1.0));
	vec4 target = use_color ? fade_color : source;
	COLOR = mix(source, target, t);
}
