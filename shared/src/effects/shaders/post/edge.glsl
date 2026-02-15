shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform float strength : hint_range(0.0, 5.0) = 1.0;
uniform float threshold : hint_range(0.0, 1.0) = 0.1;
uniform vec4 edge_color : source_color = vec4(1.0, 1.0, 1.0, 1.0);
uniform vec4 bg_color : source_color = vec4(0.0, 0.0, 0.0, 1.0);
uniform bool use_luminance = true;

float sample_intensity(vec2 uv) {
	vec3 c = texture(SCREEN_TEXTURE, uv).rgb;
	if (use_luminance) {
		return dot(c, vec3(0.299, 0.587, 0.114));
	}
	return (c.r + c.g + c.b) / 3.0;
}

void fragment() {
	vec2 p = SCREEN_PIXEL_SIZE;

	float s00 = sample_intensity(SCREEN_UV + vec2(-p.x, -p.y));
	float s01 = sample_intensity(SCREEN_UV + vec2(0.0, -p.y));
	float s02 = sample_intensity(SCREEN_UV + vec2(p.x, -p.y));
	float s10 = sample_intensity(SCREEN_UV + vec2(-p.x, 0.0));
	float s12 = sample_intensity(SCREEN_UV + vec2(p.x, 0.0));
	float s20 = sample_intensity(SCREEN_UV + vec2(-p.x, p.y));
	float s21 = sample_intensity(SCREEN_UV + vec2(0.0, p.y));
	float s22 = sample_intensity(SCREEN_UV + vec2(p.x, p.y));

	float gx = -s00 - 2.0 * s10 - s20 + s02 + 2.0 * s12 + s22;
	float gy = -s00 - 2.0 * s01 - s02 + s20 + 2.0 * s21 + s22;
	float magnitude = length(vec2(gx, gy));

	float edge_mask = clamp(max(magnitude - threshold, 0.0) * strength, 0.0, 1.0);
	vec4 result = mix(bg_color, edge_color, edge_mask);
	COLOR = vec4(result.rgb, 1.0);
}
