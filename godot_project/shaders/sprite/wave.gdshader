shader_type canvas_item;

uniform float amplitude_x : hint_range(0.0, 0.2) = 0.02;
uniform float amplitude_y : hint_range(0.0, 0.2) = 0.02;
uniform float frequency_x : hint_range(0.0, 50.0) = 10.0;
uniform float frequency_y : hint_range(0.0, 50.0) = 10.0;
uniform float speed : hint_range(0.0, 10.0) = 2.0;

void fragment() {
	vec2 uv = UV;
	
	// Sine wave distortion
	uv.x += sin(uv.y * frequency_y + TIME * speed) * amplitude_x;
	uv.y += sin(uv.x * frequency_x + TIME * speed) * amplitude_y;
	
	// Clamp UV to prevent sampling outside texture
	uv = clamp(uv, vec2(0.0), vec2(1.0));
	
	COLOR = texture(TEXTURE, uv);
}
