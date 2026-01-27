shader_type canvas_item;

uniform float pixel_size : hint_range(2.0, 64.0) = 8.0;

void fragment() {
	vec2 tex_size = 1.0 / TEXTURE_PIXEL_SIZE;
	vec2 pixel_uv = floor(UV * tex_size / pixel_size) * pixel_size / tex_size;
	pixel_uv = clamp(pixel_uv, vec2(0.001), vec2(0.999));
	COLOR = texture(TEXTURE, pixel_uv);
}
