shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform float strength : hint_range(0.0, 1.0) = 1.0;
uniform bool invert_r = true;
uniform bool invert_g = true;
uniform bool invert_b = true;
uniform bool invert_a = false;

void fragment() {
	vec4 source = texture(SCREEN_TEXTURE, SCREEN_UV);
	vec4 inverted = source;

	if (invert_r) {
		inverted.r = 1.0 - source.r;
	}
	if (invert_g) {
		inverted.g = 1.0 - source.g;
	}
	if (invert_b) {
		inverted.b = 1.0 - source.b;
	}
	if (invert_a) {
		inverted.a = 1.0 - source.a;
	}

	COLOR = mix(source, inverted, clamp(strength, 0.0, 1.0));
}
