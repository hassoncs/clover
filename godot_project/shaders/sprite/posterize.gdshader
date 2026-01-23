shader_type canvas_item;

uniform float color_levels : hint_range(2.0, 32.0) = 4.0;

void fragment() {
	vec4 tex = texture(TEXTURE, UV);
	vec3 color = floor(tex.rgb * color_levels) / max(color_levels - 1.0, 1.0);
	COLOR = vec4(color, tex.a);
}
