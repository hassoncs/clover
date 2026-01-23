shader_type canvas_item;

uniform vec4 flash_color : source_color = vec4(1.0, 1.0, 1.0, 1.0);
uniform float flash_amount : hint_range(0.0, 1.0) = 0.5;

void fragment() {
	vec4 tex_color = texture(TEXTURE, UV);
	vec3 result = mix(tex_color.rgb, flash_color.rgb, flash_amount);
	COLOR = vec4(result, tex_color.a);
}
