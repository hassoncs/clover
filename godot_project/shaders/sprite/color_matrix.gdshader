shader_type canvas_item;

// Color matrix: each row transforms one output channel
// [r_to_r, g_to_r, b_to_r, offset_r]
// [r_to_g, g_to_g, b_to_g, offset_g]
// [r_to_b, g_to_b, b_to_b, offset_b]
// [0,      0,      0,      1       ]

uniform vec4 row_red = vec4(1.0, 0.0, 0.0, 0.0);
uniform vec4 row_green = vec4(0.0, 1.0, 0.0, 0.0);
uniform vec4 row_blue = vec4(0.0, 0.0, 1.0, 0.0);

// Preset modes (overrides matrix if > 0)
uniform int preset : hint_range(0, 7) = 0;
// 0 = custom matrix
// 1 = grayscale
// 2 = sepia
// 3 = invert
// 4 = deuteranopia simulation
// 5 = protanopia simulation
// 6 = tritanopia simulation
// 7 = high contrast

void fragment() {
	vec4 tex = texture(TEXTURE, UV);
	vec3 color = tex.rgb;
	vec3 result;
	
	if (preset == 1) {
		// Grayscale
		float gray = dot(color, vec3(0.299, 0.587, 0.114));
		result = vec3(gray);
	} else if (preset == 2) {
		// Sepia
		result = vec3(
			dot(color, vec3(0.393, 0.769, 0.189)),
			dot(color, vec3(0.349, 0.686, 0.168)),
			dot(color, vec3(0.272, 0.534, 0.131))
		);
	} else if (preset == 3) {
		// Invert
		result = 1.0 - color;
	} else if (preset == 4) {
		// Deuteranopia (green-blind)
		result = vec3(
			dot(color, vec3(0.625, 0.375, 0.0)),
			dot(color, vec3(0.7, 0.3, 0.0)),
			dot(color, vec3(0.0, 0.3, 0.7))
		);
	} else if (preset == 5) {
		// Protanopia (red-blind)
		result = vec3(
			dot(color, vec3(0.567, 0.433, 0.0)),
			dot(color, vec3(0.558, 0.442, 0.0)),
			dot(color, vec3(0.0, 0.242, 0.758))
		);
	} else if (preset == 6) {
		// Tritanopia (blue-blind)
		result = vec3(
			dot(color, vec3(0.95, 0.05, 0.0)),
			dot(color, vec3(0.0, 0.433, 0.567)),
			dot(color, vec3(0.0, 0.475, 0.525))
		);
	} else if (preset == 7) {
		// High contrast
		float gray = dot(color, vec3(0.299, 0.587, 0.114));
		result = step(0.5, color) * 1.5 - 0.25;
	} else {
		// Custom matrix
		result = vec3(
			dot(color, row_red.rgb) + row_red.a,
			dot(color, row_green.rgb) + row_green.a,
			dot(color, row_blue.rgb) + row_blue.a
		);
	}
	
	COLOR = vec4(clamp(result, 0.0, 1.0), tex.a);
}
