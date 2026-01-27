shader_type canvas_item;

uniform float dissolve_amount : hint_range(0.0, 1.0) = 0.0;
uniform float edge_width : hint_range(0.0, 0.3) = 0.1;
uniform vec4 edge_color : source_color = vec4(1.0, 0.5, 0.0, 1.0);
uniform vec4 edge_color_2 : source_color = vec4(1.0, 1.0, 0.0, 1.0);
uniform float noise_scale : hint_range(1.0, 50.0) = 10.0;
uniform bool use_gradient_edge = true;

// Simple noise function
float hash(vec2 p) {
	return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	
	float a = hash(i);
	float b = hash(i + vec2(1.0, 0.0));
	float c = hash(i + vec2(0.0, 1.0));
	float d = hash(i + vec2(1.0, 1.0));
	
	return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void fragment() {
	vec4 tex_color = texture(TEXTURE, UV);
	float noise_value = noise(UV * noise_scale);
	
	// Calculate edge boundaries
	float edge_start = dissolve_amount;
	float edge_end = dissolve_amount + edge_width;
	
	if (noise_value < edge_start) {
		// Fully dissolved
		COLOR.a = 0.0;
	} else if (noise_value < edge_end && edge_width > 0.0) {
		// Edge zone
		float edge_progress = (noise_value - edge_start) / edge_width;
		
		if (use_gradient_edge) {
			vec4 edge = mix(edge_color, edge_color_2, edge_progress);
			COLOR = vec4(edge.rgb, tex_color.a);
		} else {
			COLOR = vec4(edge_color.rgb, tex_color.a);
		}
	} else {
		// Solid
		COLOR = tex_color;
	}
}
