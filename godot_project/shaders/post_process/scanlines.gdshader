shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform float scanline_count : hint_range(50.0, 500.0) = 200.0;
uniform float scanline_opacity : hint_range(0.0, 1.0) = 0.3;
uniform float scanline_speed : hint_range(0.0, 5.0) = 0.0;
uniform int scanline_pattern : hint_range(0, 2) = 0; // 0=horizontal, 1=vertical, 2=grid
uniform float brightness : hint_range(0.5, 1.5) = 1.0;
uniform float flicker : hint_range(0.0, 0.1) = 0.0;

float random(float x) {
	return fract(sin(x * 12.9898) * 43758.5453);
}

void fragment() {
	vec4 screen_color = texture(SCREEN_TEXTURE, SCREEN_UV);
	
	float scroll = TIME * scanline_speed;
	float scanline;
	
	if (scanline_pattern == 0) {
		// Horizontal scanlines
		scanline = sin((SCREEN_UV.y + scroll) * scanline_count * 3.14159) * 0.5 + 0.5;
	} else if (scanline_pattern == 1) {
		// Vertical scanlines
		scanline = sin((SCREEN_UV.x + scroll) * scanline_count * 3.14159) * 0.5 + 0.5;
	} else {
		// Grid pattern
		float h = sin((SCREEN_UV.y + scroll) * scanline_count * 3.14159) * 0.5 + 0.5;
		float v = sin((SCREEN_UV.x + scroll) * scanline_count * 3.14159) * 0.5 + 0.5;
		scanline = min(h, v);
	}
	
	float scanline_mask = mix(1.0, scanline, scanline_opacity);
	
	// Apply flicker
	float flicker_amount = 1.0;
	if (flicker > 0.0) {
		flicker_amount = 1.0 - flicker * random(floor(TIME * 30.0));
	}
	
	vec3 result = screen_color.rgb * scanline_mask * brightness * flicker_amount;
	
	COLOR = vec4(result, 1.0);
}
