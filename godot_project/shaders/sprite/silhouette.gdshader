shader_type canvas_item;

uniform vec4 silhouette_color : source_color = vec4(0.0, 0.0, 0.0, 0.5);
uniform float alpha_threshold : hint_range(0.0, 1.0) = 0.1;

void fragment() {
	vec4 tex = texture(TEXTURE, UV);
	
	if (tex.a > alpha_threshold) {
		COLOR = vec4(silhouette_color.rgb, tex.a * silhouette_color.a);
	} else {
		COLOR = vec4(0.0);
	}
}
