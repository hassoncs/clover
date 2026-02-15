shader_type canvas_item;

uniform float frequency : hint_range(0.1, 20.0) = 1.0;
uniform float amplitude : hint_range(0.0, 1.0) = 1.0;
uniform float phase : hint_range(0.0, 6.28) = 0.0;
uniform int waveform : hint_range(0, 3) = 0;
uniform vec4 color_low : source_color = vec4(0.0, 0.0, 0.0, 1.0);
uniform vec4 color_high : source_color = vec4(1.0, 1.0, 1.0, 1.0);

const float LFO_TAU = 6.28318530718;

float lfoWave(float t, int type) {
	float x = t / LFO_TAU;
	if (type == 1) {
		return step(0.0, sin(t));
	}
	if (type == 2) {
		float tri = abs(fract(x + 0.5) * 2.0 - 1.0);
		return 1.0 - tri;
	}
	if (type == 3) {
		return fract(x);
	}
	return 0.5 + 0.5 * sin(t);
}

void fragment() {
	float t = TIME * frequency * LFO_TAU + phase;
	float wave = lfoWave(t, waveform);
	float value = mix(0.5, wave, amplitude);
	COLOR = mix(color_low, color_high, value);
}
