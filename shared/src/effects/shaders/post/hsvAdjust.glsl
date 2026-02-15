shader_type canvas_item;

#include "../_lib/math.glsl"

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform float hue_shift : hint_range(-180.0, 180.0) = 0.0;
uniform float saturation : hint_range(0.0, 3.0) = 1.0;
uniform float value : hint_range(0.0, 3.0) = 1.0;

void fragment() {
	vec4 source = texture(SCREEN_TEXTURE, SCREEN_UV);
	vec3 hsv = rgb_to_hsv(source.rgb);

	hsv.x = fract(hsv.x + hue_shift / 360.0);
	hsv.y = clamp(hsv.y * saturation, 0.0, 1.0);
	hsv.z = clamp(hsv.z * value, 0.0, 1.0);

	vec3 adjusted = hsv_to_rgb(hsv);
	COLOR = vec4(adjusted, source.a);
}
