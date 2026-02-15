shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform vec4 overlay_color : source_color = vec4(1.0, 1.0, 1.0, 0.5);
uniform int blend_mode : hint_range(0, 4) = 0;
uniform float opacity : hint_range(0.0, 1.0) = 1.0;

float blend_overlay_channel(float base, float over) {
	if (base < 0.5) {
		return 2.0 * base * over;
	}
	return 1.0 - 2.0 * (1.0 - base) * (1.0 - over);
}

float blend_softlight_channel(float base, float over) {
	return (1.0 - 2.0 * over) * base * base + 2.0 * over * base;
}

vec3 apply_blend(vec3 base, vec3 over) {
	if (blend_mode == 1) {
		return base * over;
	}
	if (blend_mode == 2) {
		return 1.0 - (1.0 - base) * (1.0 - over);
	}
	if (blend_mode == 3) {
		return vec3(
			blend_overlay_channel(base.r, over.r),
			blend_overlay_channel(base.g, over.g),
			blend_overlay_channel(base.b, over.b)
		);
	}
	if (blend_mode == 4) {
		return vec3(
			blend_softlight_channel(base.r, over.r),
			blend_softlight_channel(base.g, over.g),
			blend_softlight_channel(base.b, over.b)
		);
	}
	return over;
}

void fragment() {
	vec4 base = texture(SCREEN_TEXTURE, SCREEN_UV);
	vec4 over = overlay_color;
	over.a *= clamp(opacity, 0.0, 1.0);

	vec3 blended_rgb = apply_blend(base.rgb, over.rgb);
	vec3 out_rgb = mix(base.rgb, blended_rgb, over.a);
	float out_a = over.a + base.a * (1.0 - over.a);

	COLOR = vec4(clamp(out_rgb, 0.0, 1.0), clamp(out_a, 0.0, 1.0));
}
