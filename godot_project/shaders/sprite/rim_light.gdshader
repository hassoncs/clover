shader_type canvas_item;

uniform vec4 rim_color : source_color = vec4(1.0, 1.0, 1.0, 1.0);
uniform float rim_width : hint_range(0.0, 20.0) = 3.0;
uniform float rim_intensity : hint_range(0.0, 3.0) = 1.0;
uniform vec2 light_direction = vec2(1.0, -1.0);
uniform bool additive_blend = true;
uniform float inner_fade : hint_range(0.0, 1.0) = 0.5;

void fragment() {
	vec4 tex = texture(TEXTURE, UV);
	
	// WebGL doesn't support early return, use if-else instead
	if (tex.a < 0.1) {
		COLOR = tex;
	} else {
		// Normalize light direction
		vec2 light_dir = normalize(light_direction);
		
		// Sample alpha in light direction to find edge
		float edge_alpha = 0.0;
		float samples = 0.0;
		
		for (float i = 1.0; i <= rim_width; i += 1.0) {
			vec2 offset = light_dir * i * TEXTURE_PIXEL_SIZE;
			float sample_alpha = texture(TEXTURE, UV + offset).a;
			
			// Weight by distance
			float weight = 1.0 - (i / rim_width);
			edge_alpha += (1.0 - sample_alpha) * weight;
			samples += weight;
		}
		
		edge_alpha /= max(samples, 1.0);
		
		// Calculate rim factor based on edge detection
		float rim = edge_alpha * rim_intensity;
		rim *= tex.a; // Only apply to visible parts
		
		// Apply inner fade
		rim *= mix(1.0, tex.a, inner_fade);
		
		vec3 result;
		if (additive_blend) {
			result = tex.rgb + rim_color.rgb * rim;
		} else {
			result = mix(tex.rgb, rim_color.rgb, rim);
		}
		
		COLOR = vec4(result, tex.a);
	}
}
