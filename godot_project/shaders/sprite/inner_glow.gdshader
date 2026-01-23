shader_type canvas_item;

uniform vec4 glow_color : source_color = vec4(1.0, 0.5, 0.0, 1.0);
uniform float glow_width : hint_range(0.0, 20.0) = 5.0;
uniform float glow_intensity : hint_range(0.0, 3.0) = 1.0;
uniform float glow_falloff : hint_range(0.5, 5.0) = 2.0;
uniform bool additive = true;

void fragment() {
	vec4 tex = texture(TEXTURE, UV);
	
	if (tex.a < 0.1) {
		COLOR = tex;
		return;
	}
	
	// Find distance to edge by sampling outward
	float min_dist = glow_width;
	
	for (float angle = 0.0; angle < 6.28318; angle += 0.5) {
		vec2 dir = vec2(cos(angle), sin(angle));
		
		for (float dist = 1.0; dist <= glow_width; dist += 1.0) {
			vec2 sample_uv = UV + dir * dist * TEXTURE_PIXEL_SIZE;
			float sample_alpha = texture(TEXTURE, sample_uv).a;
			
			if (sample_alpha < 0.1) {
				min_dist = min(min_dist, dist);
				break;
			}
		}
	}
	
	// Calculate glow based on distance to edge
	float glow = 1.0 - (min_dist / glow_width);
	glow = pow(glow, glow_falloff) * glow_intensity;
	
	vec3 result;
	if (additive) {
		result = tex.rgb + glow_color.rgb * glow;
	} else {
		result = mix(tex.rgb, glow_color.rgb, glow);
	}
	
	COLOR = vec4(result, tex.a);
}
