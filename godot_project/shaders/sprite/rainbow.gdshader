shader_type canvas_item;

uniform float speed : hint_range(0.0, 5.0) = 1.0;
uniform float saturation_boost : hint_range(0.0, 1.0) = 0.5;
uniform bool use_uv_offset = false;
uniform float uv_scale : hint_range(0.0, 5.0) = 1.0;

vec3 rgb_to_hsv(vec3 c) {
	vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
	vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
	vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
	float d = q.x - min(q.w, q.y);
	float e = 1.0e-10;
	return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv_to_rgb(vec3 c) {
	vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
	vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
	return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void fragment() {
	vec4 tex = texture(TEXTURE, UV);
	vec3 hsv = rgb_to_hsv(tex.rgb);
	
	// Calculate hue offset
	float hue_offset = TIME * speed;
	if (use_uv_offset) {
		hue_offset += (UV.x + UV.y) * uv_scale;
	}
	
	hsv.x = fract(hsv.x + hue_offset);
	hsv.y = mix(hsv.y, 1.0, saturation_boost);
	
	COLOR = vec4(hsv_to_rgb(hsv), tex.a);
}
