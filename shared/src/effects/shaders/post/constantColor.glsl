shader_type canvas_item;

uniform vec4 fill_color : source_color = vec4(1.0, 1.0, 1.0, 1.0);
uniform float opacity : hint_range(0.0, 1.0) = 1.0;

void fragment() {
	COLOR = vec4(fill_color.rgb, fill_color.a * opacity);
}
