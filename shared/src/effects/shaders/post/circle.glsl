#include "../_lib/sdf.glsl"

shader_type canvas_item;

uniform float radius : hint_range(0.0, 1.0) = 0.4;
uniform float softness : hint_range(0.0, 0.5) = 0.02;
uniform vec4 fill_color : source_color = vec4(1.0, 1.0, 1.0, 1.0);
uniform vec4 bg_color : source_color = vec4(0.0, 0.0, 0.0, 0.0);
uniform vec2 center = vec2(0.5, 0.5);
uniform float ring_width : hint_range(0.0, 0.5) = 0.0;

void fragment() {
	vec2 p = UV - center;
	float d = sdCircle(p, radius);

	if (ring_width > 0.0) {
		float inner_radius = max(radius - ring_width, 0.0);
		d = sdRing(p, radius, inner_radius);
	}

	float mask = smoothEdge(d, softness);
	COLOR = mix(bg_color, fill_color, mask);
}
