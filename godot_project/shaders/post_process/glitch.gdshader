shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform float glitch_intensity : hint_range(0.0, 1.0) = 0.1;
uniform float glitch_speed : hint_range(1.0, 60.0) = 10.0;
uniform float block_size : hint_range(5.0, 100.0) = 20.0;
uniform float color_drift : hint_range(0.0, 0.05) = 0.01;
uniform bool enable_scanline_shift = true;
uniform bool enable_color_separation = true;
uniform bool enable_noise = true;

float random(vec2 st) {
	return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float random_block(float y, float t) {
	return random(vec2(floor(y * block_size), floor(t * glitch_speed)));
}

void fragment() {
	vec2 uv = SCREEN_UV;
	float t = TIME;
	
	// Block-based glitch probability
	float block_noise = random_block(uv.y, t);
	
	// Horizontal shift glitch
	if (enable_scanline_shift && block_noise < glitch_intensity * 0.5) {
		float shift = (random(vec2(floor(t * glitch_speed * 2.0), floor(uv.y * block_size))) - 0.5) * 0.1;
		uv.x += shift * glitch_intensity * 2.0;
	}
	
	// Vertical block displacement
	if (block_noise < glitch_intensity * 0.3) {
		float block_shift = (random(vec2(floor(t * glitch_speed), 0.0)) - 0.5) * 0.05;
		uv.y += block_shift * glitch_intensity;
	}
	
	vec3 color;
	
	// Color channel separation
	if (enable_color_separation && block_noise < glitch_intensity * 0.7) {
		float drift = color_drift * glitch_intensity * (random(vec2(t, uv.y)) * 2.0 - 1.0);
		color.r = texture(SCREEN_TEXTURE, uv + vec2(drift, 0.0)).r;
		color.g = texture(SCREEN_TEXTURE, uv).g;
		color.b = texture(SCREEN_TEXTURE, uv - vec2(drift, 0.0)).b;
	} else {
		color = texture(SCREEN_TEXTURE, uv).rgb;
	}
	
	// Random noise overlay
	if (enable_noise) {
		float noise = random(uv * 1000.0 + vec2(t * 100.0, 0.0));
		float noise_strength = glitch_intensity * 0.1 * step(0.95, random(vec2(floor(t * 10.0), 0.0)));
		color = mix(color, vec3(noise), noise_strength);
	}
	
	// Occasional color inversion
	if (block_noise < glitch_intensity * 0.1) {
		color = 1.0 - color;
	}
	
	COLOR = vec4(color, 1.0);
}
