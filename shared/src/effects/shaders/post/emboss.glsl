shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform float strength : hint_range(0.0, 5.0) = 1.0;
uniform float angle : hint_range(0.0, 360.0) = 135.0;
uniform float blend_with_original : hint_range(0.0, 1.0) = 0.5;

void fragment() {
	vec4 original = texture(SCREEN_TEXTURE, SCREEN_UV);
	float angle_rad = radians(angle);
	vec2 direction = vec2(cos(angle_rad), sin(angle_rad));
	vec2 offset = direction * SCREEN_PIXEL_SIZE;

	vec3 sample_a = texture(SCREEN_TEXTURE, SCREEN_UV + offset).rgb;
	vec3 sample_b = texture(SCREEN_TEXTURE, SCREEN_UV - offset).rgb;
	vec3 emboss_color = vec3(0.5) + (sample_a - sample_b) * strength;

	vec3 result = mix(original.rgb, emboss_color, blend_with_original);
	COLOR = vec4(clamp(result, 0.0, 1.0), original.a);
}
