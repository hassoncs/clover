shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

// Basic adjustments
uniform float brightness : hint_range(-1.0, 1.0) = 0.0;
uniform float contrast : hint_range(0.0, 2.0) = 1.0;
uniform float saturation : hint_range(0.0, 2.0) = 1.0;
uniform float gamma : hint_range(0.5, 2.0) = 1.0;

// Color temperature
uniform float temperature : hint_range(-1.0, 1.0) = 0.0; // -1 cool, +1 warm

// Tint
uniform vec4 tint_color : source_color = vec4(1.0, 1.0, 1.0, 1.0);
uniform float tint_strength : hint_range(0.0, 1.0) = 0.0;

// Shadows/Midtones/Highlights
uniform vec4 shadow_color : source_color = vec4(0.0, 0.0, 0.0, 1.0);
uniform vec4 highlight_color : source_color = vec4(1.0, 1.0, 1.0, 1.0);
uniform float shadow_strength : hint_range(0.0, 1.0) = 0.0;
uniform float highlight_strength : hint_range(0.0, 1.0) = 0.0;

// Preset modes
uniform int preset : hint_range(0, 5) = 0;
// 0 = custom, 1 = warm vintage, 2 = cool cinema, 3 = high contrast, 4 = sepia, 5 = noir

float luminance(vec3 c) {
	return dot(c, vec3(0.299, 0.587, 0.114));
}

void fragment() {
	vec3 color = texture(SCREEN_TEXTURE, SCREEN_UV).rgb;
	
	// Apply preset overrides
	float b = brightness;
	float c = contrast;
	float s = saturation;
	float g = gamma;
	float t = temperature;
	vec3 tint = tint_color.rgb;
	float ts = tint_strength;
	
	if (preset == 1) {
		// Warm vintage
		t = 0.3; ts = 0.2; tint = vec3(1.0, 0.9, 0.7);
		c = 0.9; s = 0.8;
	} else if (preset == 2) {
		// Cool cinema
		t = -0.2; ts = 0.15; tint = vec3(0.8, 0.9, 1.0);
		c = 1.1; s = 0.9;
	} else if (preset == 3) {
		// High contrast
		c = 1.4; s = 1.2;
	} else if (preset == 4) {
		// Sepia
		s = 0.0; ts = 0.6; tint = vec3(1.0, 0.9, 0.7);
	} else if (preset == 5) {
		// Noir
		s = 0.0; c = 1.3;
	}
	
	// Brightness
	color += vec3(b);
	
	// Contrast
	color = (color - 0.5) * c + 0.5;
	
	// Saturation
	float lum = luminance(color);
	color = mix(vec3(lum), color, s);
	
	// Gamma
	color = pow(max(color, vec3(0.0)), vec3(1.0 / g));
	
	// Temperature
	if (abs(t) > 0.01) {
		vec3 warm = vec3(1.0, 0.9, 0.7);
		vec3 cool = vec3(0.7, 0.9, 1.0);
		vec3 temp_tint = mix(cool, warm, t * 0.5 + 0.5);
		color *= temp_tint;
	}
	
	// Tint
	color = mix(color, color * tint, ts);
	
	// Shadows/Highlights
	if (shadow_strength > 0.0 || highlight_strength > 0.0) {
		float l = luminance(color);
		
		// Shadows (darker areas)
		float shadow_mask = 1.0 - smoothstep(0.0, 0.5, l);
		color = mix(color, color * shadow_color.rgb, shadow_mask * shadow_strength);
		
		// Highlights (brighter areas)
		float highlight_mask = smoothstep(0.5, 1.0, l);
		color = mix(color, color * highlight_color.rgb, highlight_mask * highlight_strength);
	}
	
	COLOR = vec4(clamp(color, 0.0, 1.0), 1.0);
}
