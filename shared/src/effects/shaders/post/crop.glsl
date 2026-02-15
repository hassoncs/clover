shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform float left : hint_range(0.0, 1.0) = 0.0;
uniform float right : hint_range(0.0, 1.0) = 1.0;
uniform float top : hint_range(0.0, 1.0) = 0.0;
uniform float bottom : hint_range(0.0, 1.0) = 1.0;
uniform vec4 fill_color : source_color = vec4(0.0, 0.0, 0.0, 1.0);

void fragment() {
	float x_min = min(left, right);
	float x_max = max(left, right);
	float y_min = min(top, bottom);
	float y_max = max(top, bottom);

	bool inside = SCREEN_UV.x >= x_min && SCREEN_UV.x <= x_max && SCREEN_UV.y >= y_min && SCREEN_UV.y <= y_max;
	if (!inside) {
		COLOR = fill_color;
		return;
	}

	vec2 region_size = vec2(max(x_max - x_min, 1e-5), max(y_max - y_min, 1e-5));
	vec2 remapped_uv = (SCREEN_UV - vec2(x_min, y_min)) / region_size;
	COLOR = texture(SCREEN_TEXTURE, clamp(remapped_uv, vec2(0.0), vec2(1.0)));
}
