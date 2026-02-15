shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform float brightness : hint_range(-1.0, 1.0) = 0.0;
uniform float contrast : hint_range(0.0, 3.0) = 1.0;
uniform float gamma : hint_range(0.1, 3.0) = 1.0;
uniform float black_point : hint_range(0.0, 1.0) = 0.0;
uniform float white_point : hint_range(0.0, 1.0) = 1.0;
uniform float opacity : hint_range(0.0, 1.0) = 1.0;

void fragment() {
	vec4 source = texture(SCREEN_TEXTURE, SCREEN_UV);
	vec3 color = source.rgb;

	float range = max(white_point - black_point, 0.001);
	color = clamp((color - vec3(black_point)) / range, 0.0, 1.0);
	color = pow(max(color, vec3(0.0)), vec3(1.0 / max(gamma, 0.001)));
	color = (color - 0.5) * contrast + 0.5;
	color += vec3(brightness);
	color = clamp(color, 0.0, 1.0);

	vec3 final_color = mix(source.rgb, color, opacity);
	COLOR = vec4(final_color, source.a);
}
