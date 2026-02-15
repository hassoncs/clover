shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform float segments : hint_range(2.0, 32.0) = 6.0;
uniform float rotation : hint_range(0.0, 360.0) = 0.0;
uniform vec2 center = vec2(0.5, 0.5);
uniform float zoom : hint_range(0.5, 3.0) = 1.0;

const float PI = 3.14159265359;
const float TAU = 6.28318530718;

void fragment() {
	vec2 uv = (SCREEN_UV - center) / zoom;
	float rot = radians(rotation);
	float cs = cos(rot);
	float sn = sin(rot);
	uv = vec2(uv.x * cs - uv.y * sn, uv.x * sn + uv.y * cs);

	float r = length(uv);
	float a = atan(uv.y, uv.x);
	float segment_angle = TAU / max(segments, 2.0);

	a = mod(a, segment_angle);
	a = abs(a - segment_angle * 0.5);

	vec2 sample_uv = center + vec2(cos(a), sin(a)) * r;
	sample_uv = clamp(sample_uv, vec2(0.0), vec2(1.0));

	COLOR = texture(SCREEN_TEXTURE, sample_uv);
}
