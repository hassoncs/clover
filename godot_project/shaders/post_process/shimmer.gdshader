shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform float amplitude : hint_range(0.0, 0.03) = 0.005;
uniform float frequency_x : hint_range(0.0, 100.0) = 30.0;
uniform float frequency_y : hint_range(0.0, 100.0) = 20.0;
uniform float speed : hint_range(0.0, 10.0) = 2.0;
uniform bool vertical_only = false;
uniform float heat_rise : hint_range(0.0, 0.01) = 0.0;

void fragment() {
	vec2 uv = SCREEN_UV;
	
	// Horizontal wave
	if (!vertical_only) {
		uv.x += sin(uv.y * frequency_y + TIME * speed) * amplitude;
	}
	
	// Vertical wave
	uv.y += cos(uv.x * frequency_x + TIME * speed * 0.7) * amplitude;
	
	// Heat rise effect (distortion moves upward)
	if (heat_rise > 0.0) {
		float rise = sin(uv.x * frequency_x * 0.5 + TIME * speed * 2.0);
		uv.y -= heat_rise * rise * (1.0 - uv.y); // Stronger at bottom
	}
	
	COLOR = texture(SCREEN_TEXTURE, uv);
}
