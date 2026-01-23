shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform vec2 center = vec2(0.5, 0.5);
uniform float radius : hint_range(0.0, 2.0) = 0.0;
uniform float thickness : hint_range(0.0, 0.5) = 0.1;
uniform float amplitude : hint_range(0.0, 0.1) = 0.03;
uniform float distortion_type : hint_range(0, 2) = 0; // 0=outward, 1=inward, 2=wave

void fragment() {
	vec2 uv = SCREEN_UV;
	float dist = distance(uv, center);
	
	// Check if we're in the shockwave ring
	float inner = radius - thickness;
	float outer = radius + thickness;
	
	if (dist > inner && dist < outer && radius > 0.0) {
		// Calculate position within the ring (0 at edges, 1 at center)
		float ring_pos;
		if (dist < radius) {
			ring_pos = (dist - inner) / thickness;
		} else {
			ring_pos = (outer - dist) / thickness;
		}
		
		// Smooth the ring edges
		float wave = sin(ring_pos * 3.14159);
		
		// Direction from center
		vec2 dir = normalize(uv - center);
		
		// Apply distortion
		float displacement;
		if (distortion_type < 0.5) {
			// Outward push
			displacement = wave * amplitude;
		} else if (distortion_type < 1.5) {
			// Inward pull
			displacement = -wave * amplitude;
		} else {
			// Oscillating wave
			displacement = sin(ring_pos * 6.28318 * 2.0) * amplitude * wave;
		}
		
		uv += dir * displacement;
	}
	
	COLOR = texture(SCREEN_TEXTURE, uv);
}
