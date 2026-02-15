shader_type canvas_item;

#include "../_lib/math.glsl"

uniform float speed : hint_range(0.0, 5.0) = 1.0;
uniform float saturation_boost : hint_range(0.0, 1.0) = 0.5;
uniform bool use_uv_offset = false;
uniform float uv_scale : hint_range(0.0, 5.0) = 1.0;

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