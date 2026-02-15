#include "../_lib/sdf.glsl"

shader_type canvas_item;

uniform vec2 size = vec2(0.8, 0.6);
uniform float corner_radius : hint_range(0.0, 0.5) = 0.0;
uniform float softness : hint_range(0.0, 0.5) = 0.02;
uniform vec4 fill_color : source_color = vec4(1.0, 1.0, 1.0, 1.0);
uniform vec4 bg_color : source_color = vec4(0.0, 0.0, 0.0, 0.0);
uniform vec2 center = vec2(0.5, 0.5);

void fragment() {
	vec2 p = UV - center;
	vec2 half_size = max(size * 0.5, vec2(0.0001));
	float r = min(corner_radius, min(half_size.x, half_size.y));
	float d = sdRoundedBox(p, half_size, vec4(r));
	float mask = smoothEdge(d, softness);
	COLOR = mix(bg_color, fill_color, mask);
}
