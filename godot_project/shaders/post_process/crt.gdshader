shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

// Scanlines
uniform float scanline_opacity : hint_range(0.0, 1.0) = 0.4;
uniform float scanline_width : hint_range(0.0, 1.0) = 0.25;

// Curvature
uniform float curvature : hint_range(0.0, 0.5) = 0.1;

// RGB separation
uniform float rgb_offset : hint_range(0.0, 5.0) = 1.0;

// Vignette
uniform float vignette_strength : hint_range(0.0, 1.0) = 0.3;

// Brightness/contrast
uniform float brightness : hint_range(0.5, 1.5) = 1.0;
uniform float contrast : hint_range(0.5, 1.5) = 1.0;

// Flicker
uniform float flicker : hint_range(0.0, 0.1) = 0.02;

float random(float x) {
	return fract(sin(x * 12.9898) * 43758.5453);
}

void fragment() {
	// Apply curvature
	vec2 uv = SCREEN_UV;
	vec2 curved_uv = (uv - 0.5) * 2.0;
	curved_uv *= 1.0 + pow(abs(curved_uv.yx) / 4.0, vec2(2.0)) * curvature;
	uv = (curved_uv / 2.0) + 0.5;
	
	// Clamp to bounds (instead of early return)
	uv = clamp(uv, vec2(0.001), vec2(0.999));
	
	// Check if we're outside bounds for black border
	float in_bounds = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
	
	// RGB offset (simulate shadow mask)
	vec2 offset = SCREEN_PIXEL_SIZE * rgb_offset;
	float r = texture(SCREEN_TEXTURE, uv + vec2(offset.x, 0.0)).r;
	float g = texture(SCREEN_TEXTURE, uv).g;
	float b = texture(SCREEN_TEXTURE, uv - vec2(offset.x, 0.0)).b;
	vec3 color = vec3(r, g, b);
	
	// Scanlines
	float scanline = sin(uv.y * 800.0) * 0.5 + 0.5;
	scanline = pow(scanline, scanline_width * 10.0 + 0.0001);
	color *= mix(1.0, scanline, scanline_opacity);
	
	// Brightness and contrast
	color = (color - 0.5) * contrast + 0.5 + (brightness - 1.0);
	
	// Vignette
	vec2 vig_uv = uv * (1.0 - uv.yx);
	float vignette = vig_uv.x * vig_uv.y * 15.0;
	vignette = pow(vignette, vignette_strength);
	color *= vignette;
	
	// Flicker
	color *= 1.0 - flicker * random(floor(TIME * 15.0));
	
	// Apply bounds mask
	color *= in_bounds;
	
	COLOR = vec4(clamp(color, 0.0, 1.0), 1.0);
}
