shader_type canvas_item;

uniform float speed : hint_range(0.0, 5.0) = 1.0;
uniform float scan_line_count : hint_range(10.0, 200.0) = 50.0;
uniform float scan_line_intensity : hint_range(0.0, 1.0) = 0.3;
uniform float chromatic_offset : hint_range(0.0, 0.02) = 0.005;
uniform float flicker_intensity : hint_range(0.0, 0.5) = 0.1;
uniform float glitch_intensity : hint_range(0.0, 0.1) = 0.02;
uniform vec4 hologram_tint : source_color = vec4(0.3, 0.8, 1.0, 1.0);
uniform float alpha_boost : hint_range(0.0, 1.0) = 0.0;

float random(vec2 st) {
	return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void fragment() {
	vec2 uv = UV;
	
	// Glitch offset
	float glitch = step(0.99, random(vec2(TIME * 0.1, floor(UV.y * 20.0))));
	uv.x += glitch * glitch_intensity * (random(vec2(TIME)) * 2.0 - 1.0);
	
	// Chromatic aberration
	float r = texture(TEXTURE, uv + vec2(chromatic_offset, 0.0)).r;
	float g = texture(TEXTURE, uv).g;
	float b = texture(TEXTURE, uv - vec2(chromatic_offset, 0.0)).b;
	float a = texture(TEXTURE, uv).a;
	
	vec3 color = vec3(r, g, b);
	
	// Scanlines
	float scanline = sin(uv.y * scan_line_count * 3.14159 + TIME * speed * 10.0) * 0.5 + 0.5;
	color *= 1.0 - scanline * scan_line_intensity;
	
	// Hologram tint
	color = mix(color, color * hologram_tint.rgb, 0.5);
	
	// Flicker
	float flicker = 1.0 - flicker_intensity * random(vec2(TIME * 10.0, 0.0));
	color *= flicker;
	
	// Edge glow effect
	float edge = 1.0 - abs(uv.x - 0.5) * 2.0;
	edge *= 1.0 - abs(uv.y - 0.5) * 2.0;
	color += hologram_tint.rgb * (1.0 - edge) * 0.2;
	
	// Alpha with boost option
	float final_alpha = a;
	if (alpha_boost > 0.0) {
		final_alpha = mix(a, min(a * 2.0, 1.0), alpha_boost);
	}
	
	COLOR = vec4(color, final_alpha * hologram_tint.a);
}
