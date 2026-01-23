shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform float strength : hint_range(0.0, 30.0) = 3.0;
uniform vec2 direction = vec2(1.0, 0.0);
uniform bool radial = false;
uniform vec2 radial_center = vec2(0.5, 0.5);
uniform float radial_falloff : hint_range(0.0, 2.0) = 1.0;

void fragment() {
	vec2 offset;
	
	if (radial) {
		// Radial chromatic aberration (stronger at edges)
		vec2 to_center = SCREEN_UV - radial_center;
		float dist = length(to_center);
		offset = normalize(to_center) * SCREEN_PIXEL_SIZE * strength * pow(dist, radial_falloff);
	} else {
		// Directional chromatic aberration
		offset = normalize(direction) * SCREEN_PIXEL_SIZE * strength;
	}
	
	float r = texture(SCREEN_TEXTURE, SCREEN_UV + offset).r;
	float g = texture(SCREEN_TEXTURE, SCREEN_UV).g;
	float b = texture(SCREEN_TEXTURE, SCREEN_UV - offset).b;
	
	COLOR = vec4(r, g, b, 1.0);
}
