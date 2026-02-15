shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform float kernel_00 : hint_range(-5.0, 5.0) = 0.0;
uniform float kernel_01 : hint_range(-5.0, 5.0) = 0.0;
uniform float kernel_02 : hint_range(-5.0, 5.0) = 0.0;
uniform float kernel_10 : hint_range(-5.0, 5.0) = 0.0;
uniform float kernel_11 : hint_range(-5.0, 5.0) = 1.0;
uniform float kernel_12 : hint_range(-5.0, 5.0) = 0.0;
uniform float kernel_20 : hint_range(-5.0, 5.0) = 0.0;
uniform float kernel_21 : hint_range(-5.0, 5.0) = 0.0;
uniform float kernel_22 : hint_range(-5.0, 5.0) = 0.0;
uniform bool normalize = true;
uniform float bias : hint_range(-1.0, 1.0) = 0.0;

void fragment() {
	vec2 ps = SCREEN_PIXEL_SIZE;

	vec3 c00 = texture(SCREEN_TEXTURE, SCREEN_UV + vec2(-ps.x, -ps.y)).rgb;
	vec3 c01 = texture(SCREEN_TEXTURE, SCREEN_UV + vec2(0.0, -ps.y)).rgb;
	vec3 c02 = texture(SCREEN_TEXTURE, SCREEN_UV + vec2(ps.x, -ps.y)).rgb;
	vec3 c10 = texture(SCREEN_TEXTURE, SCREEN_UV + vec2(-ps.x, 0.0)).rgb;
	vec3 c11 = texture(SCREEN_TEXTURE, SCREEN_UV).rgb;
	vec3 c12 = texture(SCREEN_TEXTURE, SCREEN_UV + vec2(ps.x, 0.0)).rgb;
	vec3 c20 = texture(SCREEN_TEXTURE, SCREEN_UV + vec2(-ps.x, ps.y)).rgb;
	vec3 c21 = texture(SCREEN_TEXTURE, SCREEN_UV + vec2(0.0, ps.y)).rgb;
	vec3 c22 = texture(SCREEN_TEXTURE, SCREEN_UV + vec2(ps.x, ps.y)).rgb;

	vec3 sum =
		c00 * kernel_00 + c01 * kernel_01 + c02 * kernel_02 +
		c10 * kernel_10 + c11 * kernel_11 + c12 * kernel_12 +
		c20 * kernel_20 + c21 * kernel_21 + c22 * kernel_22;

	float kernel_sum =
		kernel_00 + kernel_01 + kernel_02 +
		kernel_10 + kernel_11 + kernel_12 +
		kernel_20 + kernel_21 + kernel_22;

	float divisor = 1.0;
	if (normalize) {
		divisor = abs(kernel_sum) < 0.0001 ? 1.0 : kernel_sum;
	}

	vec3 result = sum / divisor + vec3(bias);
	float alpha = texture(SCREEN_TEXTURE, SCREEN_UV).a;
	COLOR = vec4(clamp(result, 0.0, 1.0), alpha);
}
