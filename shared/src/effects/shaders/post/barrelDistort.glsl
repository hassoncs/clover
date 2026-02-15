shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform float strength : hint_range(-1.0, 1.0) = 0.3;
uniform float zoom : hint_range(0.5, 2.0) = 1.0;
uniform bool chromatic = false;
uniform float chromatic_spread : hint_range(0.0, 0.02) = 0.005;

vec2 distort_uv(vec2 uv, float s, float z) {
	vec2 centered = (uv - vec2(0.5)) / z;
	float r2 = dot(centered, centered);
	vec2 distorted = centered * (1.0 + s * r2);
	return distorted + vec2(0.5);
}

void fragment() {
	if (chromatic) {
		vec2 uv_r = clamp(distort_uv(SCREEN_UV, strength + chromatic_spread, zoom), vec2(0.0), vec2(1.0));
		vec2 uv_g = clamp(distort_uv(SCREEN_UV, strength, zoom), vec2(0.0), vec2(1.0));
		vec2 uv_b = clamp(distort_uv(SCREEN_UV, strength - chromatic_spread, zoom), vec2(0.0), vec2(1.0));

		float r = texture(SCREEN_TEXTURE, uv_r).r;
		float g = texture(SCREEN_TEXTURE, uv_g).g;
		float b = texture(SCREEN_TEXTURE, uv_b).b;
		float a = texture(SCREEN_TEXTURE, uv_g).a;
		COLOR = vec4(r, g, b, a);
	} else {
		vec2 uv = clamp(distort_uv(SCREEN_UV, strength, zoom), vec2(0.0), vec2(1.0));
		COLOR = texture(SCREEN_TEXTURE, uv);
	}
}
