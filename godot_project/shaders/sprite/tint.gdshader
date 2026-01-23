shader_type canvas_item;

uniform vec4 tint_color : source_color = vec4(1.0, 1.0, 1.0, 1.0);
uniform float tint_amount : hint_range(0.0, 1.0) = 0.5;
uniform int blend_mode : hint_range(0, 4) = 0; // 0=multiply, 1=add, 2=screen, 3=overlay, 4=replace

void fragment() {
	vec4 tex = texture(TEXTURE, UV);
	vec3 result;
	
	if (blend_mode == 0) {
		// Multiply
		result = tex.rgb * tint_color.rgb;
	} else if (blend_mode == 1) {
		// Additive
		result = tex.rgb + tint_color.rgb * tint_amount;
	} else if (blend_mode == 2) {
		// Screen
		result = 1.0 - (1.0 - tex.rgb) * (1.0 - tint_color.rgb);
	} else if (blend_mode == 3) {
		// Overlay
		result = mix(
			2.0 * tex.rgb * tint_color.rgb,
			1.0 - 2.0 * (1.0 - tex.rgb) * (1.0 - tint_color.rgb),
			step(0.5, tex.rgb)
		);
	} else {
		// Replace
		result = tint_color.rgb;
	}
	
	COLOR = vec4(mix(tex.rgb, result, tint_amount), tex.a * tint_color.a);
}
