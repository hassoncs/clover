shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform int operation : hint_range(0, 8) = 0;
uniform float value : hint_range(-2.0, 2.0) = 0.0;
uniform float range_min : hint_range(0.0, 1.0) = 0.0;
uniform float range_max : hint_range(0.0, 1.0) = 1.0;
uniform bool affect_alpha = false;

float apply_math_scalar(float v) {
	if (operation == 0) {
		return v + value;
	} else if (operation == 1) {
		return v * value;
	} else if (operation == 2) {
		return pow(v, value);
	} else if (operation == 3) {
		return abs(v - value);
	} else if (operation == 4) {
		return 1.0 - v;
	} else if (operation == 5) {
		return step(value, v);
	} else if (operation == 6) {
		return smoothstep(range_min, range_max, v);
	} else if (operation == 7) {
		return sin(v * value * 3.14159);
	}

	return clamp(v, range_min, range_max);
}

vec3 apply_math_vec3(vec3 v) {
	if (operation == 0) {
		return v + vec3(value);
	} else if (operation == 1) {
		return v * vec3(value);
	} else if (operation == 2) {
		return pow(v, vec3(value));
	} else if (operation == 3) {
		return abs(v - vec3(value));
	} else if (operation == 4) {
		return vec3(1.0) - v;
	} else if (operation == 5) {
		return step(vec3(value), v);
	} else if (operation == 6) {
		return smoothstep(vec3(range_min), vec3(range_max), v);
	} else if (operation == 7) {
		return sin(v * value * 3.14159);
	}

	return clamp(v, vec3(range_min), vec3(range_max));
}

void fragment() {
	vec4 src = texture(SCREEN_TEXTURE, SCREEN_UV);
	vec3 out_rgb = apply_math_vec3(src.rgb);
	float out_alpha = src.a;

	if (affect_alpha) {
		out_alpha = apply_math_scalar(src.a);
	}

	COLOR = vec4(out_rgb, out_alpha);
}
