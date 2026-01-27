shader_type canvas_item;

uniform vec4 shadow_color : source_color = vec4(0.0, 0.0, 0.0, 0.5);
uniform vec2 shadow_offset = vec2(4.0, 4.0);
uniform float shadow_blur : hint_range(0.0, 10.0) = 2.0;
uniform bool shadow_only = false;

void fragment() {
	vec2 shadow_uv = UV - shadow_offset * TEXTURE_PIXEL_SIZE;
	
	// Calculate blurred shadow
	float shadow_alpha = 0.0;
	float total_weight = 0.0;
	
	if (shadow_blur > 0.0) {
		for (float x = -shadow_blur; x <= shadow_blur; x += 1.0) {
			for (float y = -shadow_blur; y <= shadow_blur; y += 1.0) {
				float dist = length(vec2(x, y));
				if (dist <= shadow_blur) {
					float weight = 1.0 - (dist / shadow_blur);
					vec2 offset = vec2(x, y) * TEXTURE_PIXEL_SIZE;
					shadow_alpha += texture(TEXTURE, shadow_uv + offset).a * weight;
					total_weight += weight;
				}
			}
		}
		shadow_alpha /= total_weight;
	} else {
		shadow_alpha = texture(TEXTURE, shadow_uv).a;
	}
	
	vec4 tex = texture(TEXTURE, UV);
	vec4 shadow = vec4(shadow_color.rgb, shadow_alpha * shadow_color.a);
	
	if (shadow_only) {
		COLOR = shadow;
	} else {
		// Composite: shadow behind, sprite on top
		COLOR = mix(shadow, tex, tex.a);
	}
}
