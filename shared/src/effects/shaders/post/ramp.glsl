shader_type canvas_item;

uniform vec4 color_a : source_color = vec4(1.0, 1.0, 1.0, 1.0);
uniform vec4 color_b : source_color = vec4(0.0, 0.0, 0.0, 1.0);
uniform int ramp_type : hint_range(0, 3) = 0;
uniform float offset : hint_range(0.0, 1.0) = 0.0;
uniform float smoothness : hint_range(0.0, 1.0) = 1.0;

const float RAMP_TAU = 6.28318530718;

void fragment() {
	vec2 uv = UV;
	float t = uv.x;

	if (ramp_type == 1) {
		t = uv.y;
	} else if (ramp_type == 2) {
		t = length(uv - vec2(0.5)) * 2.0;
	} else if (ramp_type == 3) {
		vec2 p = uv - vec2(0.5);
		t = atan(p.y, p.x) / RAMP_TAU + 0.5;
	}

	t = fract(t + offset);
	t = clamp(t, 0.0, 1.0);

	float blend_t = t;
	if (smoothness < 0.999) {
		float s = max(smoothness, 0.001);
		blend_t = smoothstep(0.5 - 0.5 * s, 0.5 + 0.5 * s, t);
	}

	COLOR = mix(color_a, color_b, blend_t);
}
