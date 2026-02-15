import type { EffectType } from "./types";

// ---------------------------------------------------------------------------
// Shader Library — Inline GLSL transcribed from godot_project/shaders/
// ---------------------------------------------------------------------------
// 37 shaders total:
//   - 15 sprite shaders (godot_project/shaders/sprite/)
//   - 21 post-process shaders (godot_project/shaders/post_process/)
//   - 1 grid shader (godot_project/shaders/grid.gdshader)
// ---------------------------------------------------------------------------

export const SHADER_LIBRARY: Record<string, string> = {
	// =========================================================================
	// SPRITE SHADERS (godot_project/shaders/sprite/)
	// =========================================================================

	silhouette: `shader_type canvas_item;

uniform vec4 silhouette_color : source_color = vec4(0.0, 0.0, 0.0, 0.5);
uniform float alpha_threshold : hint_range(0.0, 1.0) = 0.1;

void fragment() {
\tvec4 tex = texture(TEXTURE, UV);
\t
\tif (tex.a > alpha_threshold) {
\t\tCOLOR = vec4(silhouette_color.rgb, tex.a * silhouette_color.a);
\t} else {
\t\tCOLOR = vec4(0.0);
\t}
}`,

	tint: `shader_type canvas_item;

uniform vec4 tint_color : source_color = vec4(1.0, 1.0, 1.0, 1.0);
uniform float tint_amount : hint_range(0.0, 1.0) = 0.5;
uniform int blend_mode : hint_range(0, 4) = 0; // 0=multiply, 1=add, 2=screen, 3=overlay, 4=replace

void fragment() {
\tvec4 tex = texture(TEXTURE, UV);
\tvec3 result;
\t
\tif (blend_mode == 0) {
\t\t// Multiply
\t\tresult = tex.rgb * tint_color.rgb;
\t} else if (blend_mode == 1) {
\t\t// Additive
\t\tresult = tex.rgb + tint_color.rgb * tint_amount;
\t} else if (blend_mode == 2) {
\t\t// Screen
\t\tresult = 1.0 - (1.0 - tex.rgb) * (1.0 - tint_color.rgb);
\t} else if (blend_mode == 3) {
\t\t// Overlay
\t\tresult = mix(
\t\t\t2.0 * tex.rgb * tint_color.rgb,
\t\t\t1.0 - 2.0 * (1.0 - tex.rgb) * (1.0 - tint_color.rgb),
\t\t\tstep(0.5, tex.rgb)
\t\t);
\t} else {
\t\t// Replace
\t\tresult = tint_color.rgb;
\t}
\t
\tCOLOR = vec4(mix(tex.rgb, result, tint_amount), tex.a * tint_color.a);
}`,

	waveDistortion: `shader_type canvas_item;

uniform float amplitude_x : hint_range(0.0, 0.2) = 0.02;
uniform float amplitude_y : hint_range(0.0, 0.2) = 0.02;
uniform float frequency_x : hint_range(0.0, 50.0) = 10.0;
uniform float frequency_y : hint_range(0.0, 50.0) = 10.0;
uniform float speed : hint_range(0.0, 10.0) = 2.0;

void fragment() {
\tvec2 uv = UV;
\t
\t// Sine wave distortion
\tuv.x += sin(uv.y * frequency_y + TIME * speed) * amplitude_x;
\tuv.y += sin(uv.x * frequency_x + TIME * speed) * amplitude_y;
\t
\t// Clamp UV to prevent sampling outside texture
\tuv = clamp(uv, vec2(0.0), vec2(1.0));
\t
\tCOLOR = texture(TEXTURE, uv);
}`,

	rimLight: `shader_type canvas_item;

uniform vec4 rim_color : source_color = vec4(1.0, 1.0, 1.0, 1.0);
uniform float rim_width : hint_range(0.0, 20.0) = 3.0;
uniform float rim_intensity : hint_range(0.0, 3.0) = 1.0;
uniform vec2 light_direction = vec2(1.0, -1.0);
uniform bool additive_blend = true;
uniform float inner_fade : hint_range(0.0, 1.0) = 0.5;

void fragment() {
\tvec4 tex = texture(TEXTURE, UV);
\t
\t// WebGL doesn't support early return, use if-else instead
\tif (tex.a < 0.1) {
\t\tCOLOR = tex;
\t} else {
\t\t// Normalize light direction
\t\tvec2 light_dir = normalize(light_direction);
\t\t
\t\t// Sample alpha in light direction to find edge
\t\tfloat edge_alpha = 0.0;
\t\tfloat samples = 0.0;
\t\t
\t\tfor (float i = 1.0; i <= rim_width; i += 1.0) {
\t\t\tvec2 offset = light_dir * i * TEXTURE_PIXEL_SIZE;
\t\t\tfloat sample_alpha = texture(TEXTURE, UV + offset).a;
\t\t\t
\t\t\t// Weight by distance
\t\t\tfloat weight = 1.0 - (i / rim_width);
\t\t\tedge_alpha += (1.0 - sample_alpha) * weight;
\t\t\tsamples += weight;
\t\t}
\t\t
\t\tedge_alpha /= max(samples, 1.0);
\t\t
\t\t// Calculate rim factor based on edge detection
\t\tfloat rim = edge_alpha * rim_intensity;
\t\trim *= tex.a; // Only apply to visible parts
\t\t
\t\t// Apply inner fade
\t\trim *= mix(1.0, tex.a, inner_fade);
\t\t
\t\tvec3 result;
\t\tif (additive_blend) {
\t\t\tresult = tex.rgb + rim_color.rgb * rim;
\t\t} else {
\t\t\tresult = mix(tex.rgb, rim_color.rgb, rim);
\t\t}
\t\t
\t\tCOLOR = vec4(result, tex.a);
\t}
}`,

	rainbow: `shader_type canvas_item;

uniform float speed : hint_range(0.0, 5.0) = 1.0;
uniform float saturation_boost : hint_range(0.0, 1.0) = 0.5;
uniform bool use_uv_offset = false;
uniform float uv_scale : hint_range(0.0, 5.0) = 1.0;

vec3 rgb_to_hsv(vec3 c) {
\tvec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
\tvec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
\tvec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
\tfloat d = q.x - min(q.w, q.y);
\tfloat e = 1.0e-10;
\treturn vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv_to_rgb(vec3 c) {
\tvec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
\tvec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
\treturn c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void fragment() {
\tvec4 tex = texture(TEXTURE, UV);
\tvec3 hsv = rgb_to_hsv(tex.rgb);
\t
\t// Calculate hue offset
\tfloat hue_offset = TIME * speed;
\tif (use_uv_offset) {
\t\thue_offset += (UV.x + UV.y) * uv_scale;
\t}
\t
\thsv.x = fract(hsv.x + hue_offset);
\thsv.y = mix(hsv.y, 1.0, saturation_boost);
\t
\tCOLOR = vec4(hsv_to_rgb(hsv), tex.a);
}`,

	pixelate: `shader_type canvas_item;

uniform float pixel_size : hint_range(2.0, 64.0) = 8.0;

void fragment() {
\tvec2 tex_size = 1.0 / TEXTURE_PIXEL_SIZE;
\tvec2 pixel_uv = floor(UV * tex_size / pixel_size) * pixel_size / tex_size;
\tpixel_uv = clamp(pixel_uv, vec2(0.001), vec2(0.999));
\tCOLOR = texture(TEXTURE, pixel_uv);
}`,

	posterize: `shader_type canvas_item;

uniform float color_levels : hint_range(2.0, 32.0) = 4.0;

void fragment() {
\tvec4 tex = texture(TEXTURE, UV);
\tvec3 color = floor(tex.rgb * color_levels) / max(color_levels - 1.0, 1.0);
\tCOLOR = vec4(color, tex.a);
}`,

	outline: `shader_type canvas_item;

uniform vec4 outline_color : source_color = vec4(1.0, 1.0, 0.0, 1.0);
uniform float outline_width : hint_range(0.0, 10.0) = 2.0;
uniform bool outline_only = false;

void fragment() {
\tvec4 sprite_color = texture(TEXTURE, UV);
\t
\t// For Polygon2D: use inner outline (draw outline where neighbor is transparent)
\t// Check if any neighboring pixel is transparent (outside the shape)
\tvec2 ps = TEXTURE_PIXEL_SIZE * outline_width;
\t
\tfloat neighbor_alpha = 1.0;
\tneighbor_alpha = min(neighbor_alpha, texture(TEXTURE, UV + vec2(-ps.x, -ps.y)).a);
\tneighbor_alpha = min(neighbor_alpha, texture(TEXTURE, UV + vec2(0.0, -ps.y)).a);
\tneighbor_alpha = min(neighbor_alpha, texture(TEXTURE, UV + vec2(ps.x, -ps.y)).a);
\tneighbor_alpha = min(neighbor_alpha, texture(TEXTURE, UV + vec2(-ps.x, 0.0)).a);
\tneighbor_alpha = min(neighbor_alpha, texture(TEXTURE, UV + vec2(ps.x, 0.0)).a);
\tneighbor_alpha = min(neighbor_alpha, texture(TEXTURE, UV + vec2(-ps.x, ps.y)).a);
\tneighbor_alpha = min(neighbor_alpha, texture(TEXTURE, UV + vec2(0.0, ps.y)).a);
\tneighbor_alpha = min(neighbor_alpha, texture(TEXTURE, UV + vec2(ps.x, ps.y)).a);
\t
\tvec4 final_color;
\t// Inner outline: current pixel is opaque but at least one neighbor is transparent
\tif (sprite_color.a > 0.1 && neighbor_alpha < 0.1) {
\t\tfinal_color = outline_color;
\t\tfinal_color.a = sprite_color.a;
\t} else if (outline_only) {
\t\tfinal_color = vec4(0.0);
\t} else {
\t\tfinal_color = sprite_color;
\t}
\tCOLOR = final_color;
}`,

	innerGlow: `shader_type canvas_item;

uniform vec4 glow_color : source_color = vec4(1.0, 0.5, 0.0, 1.0);
uniform float glow_width : hint_range(0.0, 20.0) = 5.0;
uniform float glow_intensity : hint_range(0.0, 3.0) = 1.0;
uniform float glow_falloff : hint_range(0.5, 5.0) = 2.0;
uniform bool additive = true;

void fragment() {
\tvec4 tex = texture(TEXTURE, UV);
\t
\t// WebGL doesn't support early return in fragment(), use if-else instead
\tif (tex.a < 0.1) {
\t\tCOLOR = tex;
\t} else {
\t\t// Find distance to edge by sampling outward
\t\tfloat min_dist = glow_width;
\t\t
\t\tfor (float angle = 0.0; angle < 6.28318; angle += 0.5) {
\t\t\tvec2 dir = vec2(cos(angle), sin(angle));
\t\t\t
\t\t\tfor (float dist = 1.0; dist <= glow_width; dist += 1.0) {
\t\t\t\tvec2 sample_uv = UV + dir * dist * TEXTURE_PIXEL_SIZE;
\t\t\t\tfloat sample_alpha = texture(TEXTURE, sample_uv).a;
\t\t\t\t
\t\t\t\tif (sample_alpha < 0.1) {
\t\t\t\t\tmin_dist = min(min_dist, dist);
\t\t\t\t\tbreak;
\t\t\t\t}
\t\t\t}
\t\t}
\t\t
\t\t// Calculate glow based on distance to edge
\t\tfloat glow = 1.0 - (min_dist / glow_width);
\t\tglow = pow(glow, glow_falloff) * glow_intensity;
\t\t
\t\tvec3 result;
\t\tif (additive) {
\t\t\tresult = tex.rgb + glow_color.rgb * glow;
\t\t} else {
\t\t\tresult = mix(tex.rgb, glow_color.rgb, glow);
\t\t}
\t\t
\t\tCOLOR = vec4(result, tex.a);
\t}
}`,

	holographic: `shader_type canvas_item;

uniform float speed : hint_range(0.0, 5.0) = 1.0;
uniform float scan_line_count : hint_range(10.0, 200.0) = 50.0;
uniform float scan_line_intensity : hint_range(0.0, 1.0) = 0.3;
uniform float chromatic_offset : hint_range(0.0, 0.02) = 0.005;
uniform float flicker_intensity : hint_range(0.0, 0.5) = 0.1;
uniform float glitch_intensity : hint_range(0.0, 0.1) = 0.02;
uniform vec4 hologram_tint : source_color = vec4(0.3, 0.8, 1.0, 1.0);
uniform float alpha_boost : hint_range(0.0, 1.0) = 0.0;

float random(vec2 st) {
\treturn fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void fragment() {
\tvec2 uv = UV;
\t
\t// Glitch offset
\tfloat glitch = step(0.99, random(vec2(TIME * 0.1, floor(UV.y * 20.0))));
\tuv.x += glitch * glitch_intensity * (random(vec2(TIME)) * 2.0 - 1.0);
\t
\t// Chromatic aberration
\tfloat r = texture(TEXTURE, uv + vec2(chromatic_offset, 0.0)).r;
\tfloat g = texture(TEXTURE, uv).g;
\tfloat b = texture(TEXTURE, uv - vec2(chromatic_offset, 0.0)).b;
\tfloat a = texture(TEXTURE, uv).a;
\t
\tvec3 color = vec3(r, g, b);
\t
\t// Scanlines
\tfloat scanline = sin(uv.y * scan_line_count * 3.14159 + TIME * speed * 10.0) * 0.5 + 0.5;
\tcolor *= 1.0 - scanline * scan_line_intensity;
\t
\t// Hologram tint
\tcolor = mix(color, color * hologram_tint.rgb, 0.5);
\t
\t// Flicker
\tfloat flicker = 1.0 - flicker_intensity * random(vec2(TIME * 10.0, 0.0));
\tcolor *= flicker;
\t
\t// Edge glow effect
\tfloat edge = 1.0 - abs(uv.x - 0.5) * 2.0;
\tedge *= 1.0 - abs(uv.y - 0.5) * 2.0;
\tcolor += hologram_tint.rgb * (1.0 - edge) * 0.2;
\t
\t// Alpha with boost option
\tfloat final_alpha = a;
\tif (alpha_boost > 0.0) {
\t\tfinal_alpha = mix(a, min(a * 2.0, 1.0), alpha_boost);
\t}
\t
\tCOLOR = vec4(color, final_alpha * hologram_tint.a);
}`,

	glow: `shader_type canvas_item;

uniform vec4 glow_color : source_color = vec4(1.0, 0.8, 0.2, 1.0);
uniform float glow_intensity : hint_range(0.0, 5.0) = 1.5;
uniform float glow_size : hint_range(1.0, 20.0) = 4.0;
uniform float pulse_speed : hint_range(0.0, 10.0) = 0.0;

void fragment() {
\tvec4 sprite_color = texture(TEXTURE, UV);
\t
\t// Inner glow: detect proximity to transparent edge
\tvec2 ps = TEXTURE_PIXEL_SIZE * glow_size;
\t
\t// Sample neighbors to find minimum alpha (distance to edge)
\tfloat min_alpha = 1.0;
\tmin_alpha = min(min_alpha, texture(TEXTURE, UV + vec2(-ps.x, -ps.y)).a);
\tmin_alpha = min(min_alpha, texture(TEXTURE, UV + vec2(0.0, -ps.y)).a);
\tmin_alpha = min(min_alpha, texture(TEXTURE, UV + vec2(ps.x, -ps.y)).a);
\tmin_alpha = min(min_alpha, texture(TEXTURE, UV + vec2(-ps.x, 0.0)).a);
\tmin_alpha = min(min_alpha, texture(TEXTURE, UV + vec2(ps.x, 0.0)).a);
\tmin_alpha = min(min_alpha, texture(TEXTURE, UV + vec2(-ps.x, ps.y)).a);
\tmin_alpha = min(min_alpha, texture(TEXTURE, UV + vec2(0.0, ps.y)).a);
\tmin_alpha = min(min_alpha, texture(TEXTURE, UV + vec2(ps.x, ps.y)).a);
\t
\t// Also sample at half distance for smoother gradient
\tmin_alpha = min(min_alpha, texture(TEXTURE, UV + vec2(-ps.x * 0.5, -ps.y * 0.5)).a);
\tmin_alpha = min(min_alpha, texture(TEXTURE, UV + vec2(ps.x * 0.5, -ps.y * 0.5)).a);
\tmin_alpha = min(min_alpha, texture(TEXTURE, UV + vec2(-ps.x * 0.5, ps.y * 0.5)).a);
\tmin_alpha = min(min_alpha, texture(TEXTURE, UV + vec2(ps.x * 0.5, ps.y * 0.5)).a);
\t
\t// Glow strength based on proximity to edge (where min_alpha < 1)
\tfloat edge_proximity = 1.0 - min_alpha;
\t
\tfloat intensity = glow_intensity;
\tif (pulse_speed > 0.0) {
\t\tfloat pulse = sin(TIME * pulse_speed) * 0.5 + 0.5;
\t\tintensity *= 1.0 + pulse * 0.3;
\t}
\t
\t// Blend glow color with sprite color near edges
\tvec3 final_rgb = mix(sprite_color.rgb, glow_color.rgb, edge_proximity * intensity * 0.5);
\t
\tCOLOR = vec4(final_rgb, sprite_color.a);
}`,

	dropShadow: `shader_type canvas_item;

uniform vec4 shadow_color : source_color = vec4(0.0, 0.0, 0.0, 0.5);
uniform vec2 shadow_offset = vec2(4.0, 4.0);
uniform float shadow_blur : hint_range(0.0, 10.0) = 2.0;
uniform bool shadow_only = false;

void fragment() {
\tvec2 shadow_uv = UV - shadow_offset * TEXTURE_PIXEL_SIZE;
\t
\t// Calculate blurred shadow
\tfloat shadow_alpha = 0.0;
\tfloat total_weight = 0.0;
\t
\tif (shadow_blur > 0.0) {
\t\tfor (float x = -shadow_blur; x <= shadow_blur; x += 1.0) {
\t\t\tfor (float y = -shadow_blur; y <= shadow_blur; y += 1.0) {
\t\t\t\tfloat dist = length(vec2(x, y));
\t\t\t\tif (dist <= shadow_blur) {
\t\t\t\t\tfloat weight = 1.0 - (dist / shadow_blur);
\t\t\t\t\tvec2 offset = vec2(x, y) * TEXTURE_PIXEL_SIZE;
\t\t\t\t\tshadow_alpha += texture(TEXTURE, shadow_uv + offset).a * weight;
\t\t\t\t\ttotal_weight += weight;
\t\t\t\t}
\t\t\t}
\t\t}
\t\tshadow_alpha /= total_weight;
\t} else {
\t\tshadow_alpha = texture(TEXTURE, shadow_uv).a;
\t}
\t
\tvec4 tex = texture(TEXTURE, UV);
\tvec4 shadow = vec4(shadow_color.rgb, shadow_alpha * shadow_color.a);
\t
\tif (shadow_only) {
\t\tCOLOR = shadow;
\t} else {
\t\t// Composite: shadow behind, sprite on top
\t\tCOLOR = mix(shadow, tex, tex.a);
\t}
}`,

	flash: `shader_type canvas_item;

uniform vec4 flash_color : source_color = vec4(1.0, 1.0, 1.0, 1.0);
uniform float flash_amount : hint_range(0.0, 1.0) = 0.5;

void fragment() {
\tvec4 tex_color = texture(TEXTURE, UV);
\tvec3 result = mix(tex_color.rgb, flash_color.rgb, flash_amount);
\tCOLOR = vec4(result, tex_color.a);
}`,

	dissolve: `shader_type canvas_item;

uniform float dissolve_amount : hint_range(0.0, 1.0) = 0.0;
uniform float edge_width : hint_range(0.0, 0.3) = 0.1;
uniform vec4 edge_color : source_color = vec4(1.0, 0.5, 0.0, 1.0);
uniform vec4 edge_color_2 : source_color = vec4(1.0, 1.0, 0.0, 1.0);
uniform float noise_scale : hint_range(1.0, 50.0) = 10.0;
uniform bool use_gradient_edge = true;

// Simple noise function
float hash(vec2 p) {
\treturn fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 p) {
\tvec2 i = floor(p);
\tvec2 f = fract(p);
\tf = f * f * (3.0 - 2.0 * f);
\t
\tfloat a = hash(i);
\tfloat b = hash(i + vec2(1.0, 0.0));
\tfloat c = hash(i + vec2(0.0, 1.0));
\tfloat d = hash(i + vec2(1.0, 1.0));
\t
\treturn mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void fragment() {
\tvec4 tex_color = texture(TEXTURE, UV);
\tfloat noise_value = noise(UV * noise_scale);
\t
\t// Calculate edge boundaries
\tfloat edge_start = dissolve_amount;
\tfloat edge_end = dissolve_amount + edge_width;
\t
\tif (noise_value < edge_start) {
\t\t// Fully dissolved
\t\tCOLOR.a = 0.0;
\t} else if (noise_value < edge_end && edge_width > 0.0) {
\t\t// Edge zone
\t\tfloat edge_progress = (noise_value - edge_start) / edge_width;
\t\t
\t\tif (use_gradient_edge) {
\t\t\tvec4 edge = mix(edge_color, edge_color_2, edge_progress);
\t\t\tCOLOR = vec4(edge.rgb, tex_color.a);
\t\t} else {
\t\t\tCOLOR = vec4(edge_color.rgb, tex_color.a);
\t\t}
\t} else {
\t\t// Solid
\t\tCOLOR = tex_color;
\t}
}`,

	colorMatrix: `shader_type canvas_item;

// Color matrix: each row transforms one output channel
// [r_to_r, g_to_r, b_to_r, offset_r]
// [r_to_g, g_to_g, b_to_g, offset_g]
// [r_to_b, g_to_b, b_to_b, offset_b]
// [0,      0,      0,      1       ]

uniform vec4 row_red = vec4(1.0, 0.0, 0.0, 0.0);
uniform vec4 row_green = vec4(0.0, 1.0, 0.0, 0.0);
uniform vec4 row_blue = vec4(0.0, 0.0, 1.0, 0.0);

// Preset modes (overrides matrix if > 0)
uniform int preset : hint_range(0, 7) = 0;
// 0 = custom matrix
// 1 = grayscale
// 2 = sepia
// 3 = invert
// 4 = deuteranopia simulation
// 5 = protanopia simulation
// 6 = tritanopia simulation
// 7 = high contrast

void fragment() {
\tvec4 tex = texture(TEXTURE, UV);
\tvec3 color = tex.rgb;
\tvec3 result;
\t
\tif (preset == 1) {
\t\t// Grayscale
\t\tfloat gray = dot(color, vec3(0.299, 0.587, 0.114));
\t\tresult = vec3(gray);
\t} else if (preset == 2) {
\t\t// Sepia
\t\tresult = vec3(
\t\t\tdot(color, vec3(0.393, 0.769, 0.189)),
\t\t\tdot(color, vec3(0.349, 0.686, 0.168)),
\t\t\tdot(color, vec3(0.272, 0.534, 0.131))
\t\t);
\t} else if (preset == 3) {
\t\t// Invert
\t\tresult = 1.0 - color;
\t} else if (preset == 4) {
\t\t// Deuteranopia (green-blind)
\t\tresult = vec3(
\t\t\tdot(color, vec3(0.625, 0.375, 0.0)),
\t\t\tdot(color, vec3(0.7, 0.3, 0.0)),
\t\t\tdot(color, vec3(0.0, 0.3, 0.7))
\t\t);
\t} else if (preset == 5) {
\t\t// Protanopia (red-blind)
\t\tresult = vec3(
\t\t\tdot(color, vec3(0.567, 0.433, 0.0)),
\t\t\tdot(color, vec3(0.558, 0.442, 0.0)),
\t\t\tdot(color, vec3(0.0, 0.242, 0.758))
\t\t);
\t} else if (preset == 6) {
\t\t// Tritanopia (blue-blind)
\t\tresult = vec3(
\t\t\tdot(color, vec3(0.95, 0.05, 0.0)),
\t\t\tdot(color, vec3(0.0, 0.433, 0.567)),
\t\t\tdot(color, vec3(0.0, 0.475, 0.525))
\t\t);
\t} else if (preset == 7) {
\t\t// High contrast
\t\tfloat gray = dot(color, vec3(0.299, 0.587, 0.114));
\t\tresult = step(0.5, color) * 1.5 - 0.25;
\t} else {
\t\t// Custom matrix
\t\tresult = vec3(
\t\t\tdot(color, row_red.rgb) + row_red.a,
\t\t\tdot(color, row_green.rgb) + row_green.a,
\t\t\tdot(color, row_blue.rgb) + row_blue.a
\t\t);
\t}
\t
\tCOLOR = vec4(clamp(result, 0.0, 1.0), tex.a);
}`,

	// =========================================================================
	// POST-PROCESS SHADERS (godot_project/shaders/post_process/)
	// =========================================================================

	underwater: `shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_repeat_linear;
uniform float intensity : hint_range(0.0, 1.0) = 0.5;
uniform float wave_speed : hint_range(0.1, 5.0) = 1.0;
uniform float wave_frequency : hint_range(1.0, 20.0) = 10.0;
uniform float wave_amplitude : hint_range(0.001, 0.05) = 0.01;
uniform vec4 water_tint : source_color = vec4(0.0, 0.4, 0.8, 0.3);

void fragment() {
    // 1. UV Distortion (Wave effect)
    vec2 uv = SCREEN_UV;
    
    // Horizontal wave
    uv.x += sin(uv.y * wave_frequency + TIME * wave_speed) * wave_amplitude;
    // Vertical wave (offset phase)
    uv.y += cos(uv.x * wave_frequency + TIME * wave_speed) * wave_amplitude;
    
    // Sample texture with distorted UVs
    vec4 color = texture(SCREEN_TEXTURE, uv);
    
    // 2. Depth Tinting (Blue atmosphere)
    // Mix original color with water tint
    vec3 tinted = mix(color.rgb, water_tint.rgb, water_tint.a * intensity);
    
    // 3. Simple Caustics (simulated light patterns)
    // Overlap two sine waves moving differently
    float caustics = sin(uv.x * 20.0 + TIME) * sin(uv.y * 15.0 - TIME * 0.5);
    caustics = smoothstep(0.5, 0.8, caustics) * 0.1 * intensity;
    
    COLOR = vec4(tinted + vec3(caustics), color.a);
}`,

	vignette: `shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform float vignette_intensity : hint_range(0.0, 2.0) = 0.4;
uniform float vignette_opacity : hint_range(0.0, 1.0) = 0.5;
uniform vec4 vignette_color : source_color = vec4(0.0, 0.0, 0.0, 1.0);
uniform float vignette_roundness : hint_range(0.0, 1.0) = 1.0;
uniform vec2 vignette_center = vec2(0.5, 0.5);

void fragment() {
\tvec4 screen_color = texture(SCREEN_TEXTURE, SCREEN_UV);
\t
\t// Calculate vignette
\tvec2 uv = SCREEN_UV - vignette_center;
\t
\t// Adjust for aspect ratio if needed
\tfloat aspect = SCREEN_PIXEL_SIZE.y / SCREEN_PIXEL_SIZE.x;
\tuv.x *= mix(1.0, aspect, vignette_roundness);
\t
\tfloat dist = length(uv) * 2.0;
\tfloat vignette = 1.0 - pow(dist, vignette_intensity + 1.0);
\tvignette = clamp(vignette, 0.0, 1.0);
\t
\t// Apply vignette
\tvec3 result = mix(vignette_color.rgb, screen_color.rgb, mix(1.0, vignette, vignette_opacity));
\t
\tCOLOR = vec4(result, 1.0);
}`,

	thermalVision: `shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;
uniform float intensity : hint_range(0.0, 1.0) = 1.0;

// Thermal Gradient Colors
const vec3 C0 = vec3(0.0, 0.0, 0.2); // Deep Blue (Coldest)
const vec3 C1 = vec3(0.0, 0.0, 1.0); // Blue
const vec3 C2 = vec3(0.0, 1.0, 1.0); // Cyan
const vec3 C3 = vec3(0.0, 1.0, 0.0); // Green
const vec3 C4 = vec3(1.0, 1.0, 0.0); // Yellow
const vec3 C5 = vec3(1.0, 0.0, 0.0); // Red
const vec3 C6 = vec3(1.0, 1.0, 1.0); // White (Hottest)

vec3 thermal_map(float v) {
    if (v < 0.166) return mix(C0, C1, v / 0.166);
    if (v < 0.333) return mix(C1, C2, (v - 0.166) / 0.166);
    if (v < 0.500) return mix(C2, C3, (v - 0.333) / 0.166);
    if (v < 0.666) return mix(C3, C4, (v - 0.500) / 0.166);
    if (v < 0.833) return mix(C4, C5, (v - 0.666) / 0.166);
    return mix(C5, C6, (v - 0.833) / 0.166);
}

void fragment() {
    vec4 color = texture(SCREEN_TEXTURE, SCREEN_UV);
    
    // Calculate luminance (heat value)
    float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    
    // Map luminance to thermal gradient
    vec3 thermal = thermal_map(lum);
    
    COLOR = vec4(mix(color.rgb, thermal, intensity), color.a);
}`,

	speedLines: `shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;
uniform float intensity : hint_range(0.0, 1.0) = 0.5;
uniform float density : hint_range(0.0, 1.0) = 0.2;
uniform float speed : hint_range(0.1, 10.0) = 2.0;
uniform vec2 center = vec2(0.5, 0.5);

// Simple noise function
float random(vec2 uv) {
    return fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453123);
}

void fragment() {
    vec4 color = texture(SCREEN_TEXTURE, SCREEN_UV);
    
    // Convert to polar coordinates centered on screen
    vec2 uv_centered = SCREEN_UV - center;
    float dist = length(uv_centered);
    float angle = atan(uv_centered.y, uv_centered.x);
    
    // Create radial streaks
    // We map angle to X and time to Y in noise function
    float noise_val = random(vec2(angle * 20.0, TIME * speed));
    
    // Threshold the noise to create lines
    float lines = step(1.0 - density, noise_val);
    
    // Fade out near center (exclusion zone)
    float mask = smoothstep(0.2, 0.5, dist);
    
    // Combine
    float effect = lines * mask * intensity;
    
    // Add lines to screen (additive blending)
    COLOR = vec4(color.rgb + vec3(effect), color.a);
}`,

	shockwave: `shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform vec2 center = vec2(0.5, 0.5);
uniform float radius : hint_range(0.0, 2.0) = 0.0;
uniform float thickness : hint_range(0.0, 0.5) = 0.1;
uniform float amplitude : hint_range(0.0, 0.1) = 0.03;
uniform float distortion_type : hint_range(0, 2) = 0; // 0=outward, 1=inward, 2=wave

void fragment() {
\tvec2 uv = SCREEN_UV;
\tfloat dist = distance(uv, center);
\t
\t// Check if we're in the shockwave ring
\tfloat inner = radius - thickness;
\tfloat outer = radius + thickness;
\t
\tif (dist > inner && dist < outer && radius > 0.0) {
\t\t// Calculate position within the ring (0 at edges, 1 at center)
\t\tfloat ring_pos;
\t\tif (dist < radius) {
\t\t\tring_pos = (dist - inner) / thickness;
\t\t} else {
\t\t\tring_pos = (outer - dist) / thickness;
\t\t}
\t\t
\t\t// Smooth the ring edges
\t\tfloat wave = sin(ring_pos * 3.14159);
\t\t
\t\t// Direction from center
\t\tvec2 dir = normalize(uv - center);
\t\t
\t\t// Apply distortion
\t\tfloat displacement;
\t\tif (distortion_type < 0.5) {
\t\t\t// Outward push
\t\t\tdisplacement = wave * amplitude;
\t\t} else if (distortion_type < 1.5) {
\t\t\t// Inward pull
\t\t\tdisplacement = -wave * amplitude;
\t\t} else {
\t\t\t// Oscillating wave
\t\t\tdisplacement = sin(ring_pos * 6.28318 * 2.0) * amplitude * wave;
\t\t}
\t\t
\t\tuv += dir * displacement;
\t}
\t
\tCOLOR = texture(SCREEN_TEXTURE, uv);
}`,

	shimmer: `shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform float amplitude : hint_range(0.0, 0.03) = 0.005;
uniform float frequency_x : hint_range(0.0, 100.0) = 30.0;
uniform float frequency_y : hint_range(0.0, 100.0) = 20.0;
uniform float speed : hint_range(0.0, 10.0) = 2.0;
uniform bool vertical_only = false;
uniform float heat_rise : hint_range(0.0, 0.01) = 0.0;

void fragment() {
\tvec2 uv = SCREEN_UV;
\t
\t// Horizontal wave
\tif (!vertical_only) {
\t\tuv.x += sin(uv.y * frequency_y + TIME * speed) * amplitude;
\t}
\t
\t// Vertical wave
\tuv.y += cos(uv.x * frequency_x + TIME * speed * 0.7) * amplitude;
\t
\t// Heat rise effect (distortion moves upward)
\tif (heat_rise > 0.0) {
\t\tfloat rise = sin(uv.x * frequency_x * 0.5 + TIME * speed * 2.0);
\t\tuv.y -= heat_rise * rise * (1.0 - uv.y); // Stronger at bottom
\t}
\t
\tCOLOR = texture(SCREEN_TEXTURE, uv);
}`,

	ripple: `shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;
// This texture should be provided by the game engine (Splat Map)
// Red channel = X displacement, Green channel = Y displacement
uniform sampler2D data_texture : filter_linear; 

uniform float intensity : hint_range(0.0, 0.1) = 0.02;
uniform float speed : hint_range(0.0, 5.0) = 1.0;
uniform bool use_noise_fallback : hint_range(0, 1) = 1;

// Simple fallback noise if no data texture is provided
float random(vec2 uv) {
    return fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 uv) {
    vec2 i = floor(uv);
    vec2 f = fract(uv);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void fragment() {
    vec2 displacement = vec2(0.0);
    
    // Sample data texture
    vec4 data = texture(data_texture, SCREEN_UV);
    
    // Use data if available (assuming > 0 means active)
    if (length(data.rgb) > 0.01) {
        // Map 0..1 to -1..1
        displacement = (data.rg * 2.0 - 1.0);
    } else if (use_noise_fallback) {
        // Fallback procedural ripple
        float n = noise(SCREEN_UV * 10.0 + TIME * speed);
        displacement = vec2(cos(n * 6.28), sin(n * 6.28));
    }
    
    vec2 uv = SCREEN_UV + displacement * intensity;
    COLOR = texture(SCREEN_TEXTURE, uv);
}`,

	scanlines: `shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform float scanline_count : hint_range(50.0, 500.0) = 200.0;
uniform float scanline_opacity : hint_range(0.0, 1.0) = 0.3;
uniform float scanline_speed : hint_range(0.0, 5.0) = 0.0;
uniform int scanline_pattern : hint_range(0, 2) = 0; // 0=horizontal, 1=vertical, 2=grid
uniform float brightness : hint_range(0.5, 1.5) = 1.0;
uniform float flicker : hint_range(0.0, 0.1) = 0.0;

float random(float x) {
\treturn fract(sin(x * 12.9898) * 43758.5453);
}

void fragment() {
\tvec4 screen_color = texture(SCREEN_TEXTURE, SCREEN_UV);
\t
\tfloat scroll = TIME * scanline_speed;
\tfloat scanline;
\t
\tif (scanline_pattern == 0) {
\t\t// Horizontal scanlines
\t\tscanline = sin((SCREEN_UV.y + scroll) * scanline_count * 3.14159) * 0.5 + 0.5;
\t} else if (scanline_pattern == 1) {
\t\t// Vertical scanlines
\t\tscanline = sin((SCREEN_UV.x + scroll) * scanline_count * 3.14159) * 0.5 + 0.5;
\t} else {
\t\t// Grid pattern
\t\tfloat h = sin((SCREEN_UV.y + scroll) * scanline_count * 3.14159) * 0.5 + 0.5;
\t\tfloat v = sin((SCREEN_UV.x + scroll) * scanline_count * 3.14159) * 0.5 + 0.5;
\t\tscanline = min(h, v);
\t}
\t
\tfloat scanline_mask = mix(1.0, scanline, scanline_opacity);
\t
\t// Apply flicker
\tfloat flicker_amount = 1.0;
\tif (flicker > 0.0) {
\t\tflicker_amount = 1.0 - flicker * random(floor(TIME * 30.0));
\t}
\t
\tvec3 result = screen_color.rgb * scanline_mask * brightness * flicker_amount;
\t
\tCOLOR = vec4(result, 1.0);
}`,

	oldFilm: `shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform float sepia_strength : hint_range(0.0, 1.0) = 0.8;
uniform float scratch_strength : hint_range(0.0, 1.0) = 0.3;
uniform float noise_strength : hint_range(0.0, 1.0) = 0.2;
uniform float vignette_size : hint_range(0.0, 1.0) = 0.4;

float random(vec2 uv) {
    return fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453123);
}

void fragment() {
    vec4 color = texture(SCREEN_TEXTURE, SCREEN_UV);
    
    // 1. Sepia Tone
    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    vec3 sepia = vec3(gray) * vec3(1.2, 1.0, 0.8);
    color.rgb = mix(color.rgb, sepia, sepia_strength);
    
    // 2. Grain Noise (animated)
    float noise = random(SCREEN_UV + vec2(TIME * 5.0));
    color.rgb += (noise - 0.5) * noise_strength;
    
    // 3. Scratches (vertical lines jumping horizontally)
    // We use time to jump the x position
    float scratch_x = floor(TIME * 2.0) * 0.37; // Jump around
    float scratch_line = step(0.998, random(vec2(SCREEN_UV.x + scratch_x, 0.0)));
    
    // Scratches are dark
    color.rgb *= (1.0 - scratch_line * scratch_strength);
    
    // 4. Flicker (global brightness fluctuation)
    float flicker = 1.0 - (random(vec2(TIME)) * 0.1);
    color.rgb *= flicker;
    
    // 5. Vignette (Classic darken corners)
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(SCREEN_UV, center);
    float vignette = smoothstep(vignette_size, vignette_size + 0.5, dist);
    color.rgb *= (1.0 - vignette);
    
    COLOR = color;
}`,

	pixelateScreen: `shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_nearest;

uniform float pixel_size : hint_range(1.0, 32.0) = 4.0;
uniform bool color_reduction = false;
uniform float color_levels : hint_range(2.0, 32.0) = 8.0;
uniform bool dithering = false;

float dither_matrix(vec2 pos) {
\t// 4x4 Bayer dithering matrix
\tint x = int(mod(pos.x, 4.0));
\tint y = int(mod(pos.y, 4.0));
\tint index = x + y * 4;
\t
\tfloat matrix[16] = float[16](
\t\t0.0, 8.0, 2.0, 10.0,
\t\t12.0, 4.0, 14.0, 6.0,
\t\t3.0, 11.0, 1.0, 9.0,
\t\t15.0, 7.0, 13.0, 5.0
\t);
\t
\treturn matrix[index] / 16.0;
}

void fragment() {
\t// Calculate pixelated UV
\tvec2 screen_size = 1.0 / SCREEN_PIXEL_SIZE;
\tvec2 pixel_uv = floor(SCREEN_UV * screen_size / pixel_size) * pixel_size / screen_size;
\t
\tvec3 color = texture(SCREEN_TEXTURE, pixel_uv).rgb;
\t
\tif (color_reduction) {
\t\tif (dithering) {
\t\t\t// Apply dithering before color reduction
\t\t\tvec2 dither_pos = SCREEN_UV * screen_size / pixel_size;
\t\t\tfloat dither = dither_matrix(dither_pos) - 0.5;
\t\t\tcolor += dither / color_levels;
\t\t}
\t\t
\t\t// Reduce color palette
\t\tcolor = floor(color * color_levels) / (color_levels - 1.0);
\t}
\t
\tCOLOR = vec4(color, 1.0);
}`,

	motionBlur: `shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform vec2 velocity = vec2(0.0, 0.0);
uniform float strength : hint_range(0.0, 1.0) = 0.5;
uniform vec2 radial_center = vec2(0.5, 0.5);
uniform bool use_radial = false;

void fragment() {
\tvec2 blur_dir;
\t
\tif (use_radial) {
\t\tblur_dir = (SCREEN_UV - radial_center) * strength * 0.1;
\t} else {
\t\tblur_dir = velocity * SCREEN_PIXEL_SIZE * strength * 10.0;
\t}
\t
\tvec4 color = vec4(0.0);
\tfloat total_weight = 0.0;
\t
\t// Fixed 8 samples for WebGL compatibility
\tfloat sample_offsets[8] = float[](-0.5, -0.357, -0.214, -0.071, 0.071, 0.214, 0.357, 0.5);
\t
\tfor (int i = 0; i < 8; i++) {
\t\tfloat t = sample_offsets[i];
\t\tvec2 offset = blur_dir * t;
\t\tfloat weight = 1.0 - abs(t) * 0.5;
\t\t
\t\tcolor += texture(SCREEN_TEXTURE, SCREEN_UV + offset) * weight;
\t\ttotal_weight += weight;
\t}
\t
\tCOLOR = color / total_weight;
}`,

	nightVision: `shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;
uniform float intensity : hint_range(0.0, 1.0) = 0.5;
uniform float noise_strength : hint_range(0.0, 1.0) = 0.3;
uniform float scanline_strength : hint_range(0.0, 1.0) = 0.1;
uniform float vignette_size : hint_range(0.0, 1.0) = 0.4;

// Simple pseudo-random noise
float random(vec2 uv) {
    return fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453123);
}

void fragment() {
    vec4 color = texture(SCREEN_TEXTURE, SCREEN_UV);
    
    // 1. Green Tint & Light Amplification
    // Convert to grayscale first using luminance weights
    float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    
    // Boost light levels (night vision amplifies weak light)
    lum = pow(lum, 0.8) * 1.5;
    
    // Apply green phosphor tint
    vec3 vision_color = vec3(0.0, lum, 0.0);
    
    // 2. Scanlines
    float scanline = sin(SCREEN_UV.y * 800.0) * 0.5 + 0.5;
    vision_color *= 1.0 - (scanline * scanline_strength);
    
    // 3. Noise/Grain (animated by time if passed, static here for now)
    float noise = random(SCREEN_UV + vec2(TIME * 10.0));
    vision_color += noise * noise_strength;
    
    // 4. Vignette (darker corners)
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(SCREEN_UV, center);
    float vignette = smoothstep(vignette_size, vignette_size + 0.4, dist);
    vision_color *= (1.0 - vignette);
    
    // Mix with original based on intensity
    COLOR = vec4(mix(color.rgb, vision_color, intensity), color.a);
}`,

	fogOfWar: `shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;
// Mask: R = Explored (Permanent), G = Visible (Current)
uniform sampler2D mask_texture : filter_linear;

uniform vec4 fog_color : source_color = vec4(0.0, 0.0, 0.0, 0.5);
uniform vec4 unexplored_color : source_color = vec4(0.0, 0.0, 0.0, 1.0);
uniform float smoothness : hint_range(0.0, 0.2) = 0.05;

void fragment() {
    vec4 color = texture(SCREEN_TEXTURE, SCREEN_UV);
    vec4 mask = texture(mask_texture, SCREEN_UV);
    
    float explored = mask.r;
    float visible = mask.g;
    
    // Smooth transitions
    // 1. Unexplored (Black)
    float unexplored_factor = smoothstep(0.5 - smoothness, 0.5 + smoothness, explored);
    
    // 2. Fog (Dimmed)
    float visible_factor = smoothstep(0.5 - smoothness, 0.5 + smoothness, visible);
    
    // Logic:
    // If not explored -> Unexplored Color
    // If explored but not visible -> Fog Color (mix with screen)
    // If visible -> Screen Color
    
    vec3 result = color.rgb;
    
    // Apply Fog (Dimming)
    // Mix screen color with fog color based on visibility
    result = mix(mix(result, fog_color.rgb, fog_color.a), result, visible_factor);
    
    // Apply Unexplored (Blackout)
    result = mix(unexplored_color.rgb, result, unexplored_factor);
    
    COLOR = vec4(result, color.a);
}`,

	crt: `shader_type canvas_item;

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
\treturn fract(sin(x * 12.9898) * 43758.5453);
}

void fragment() {
\t// Apply curvature
\tvec2 uv = SCREEN_UV;
\tvec2 curved_uv = (uv - 0.5) * 2.0;
\tcurved_uv *= 1.0 + pow(abs(curved_uv.yx) / 4.0, vec2(2.0)) * curvature;
\tuv = (curved_uv / 2.0) + 0.5;
\t
\t// Clamp to bounds (instead of early return)
\tuv = clamp(uv, vec2(0.001), vec2(0.999));
\t
\t// Check if we're outside bounds for black border
\tfloat in_bounds = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
\t
\t// RGB offset (simulate shadow mask)
\tvec2 offset = SCREEN_PIXEL_SIZE * rgb_offset;
\tfloat r = texture(SCREEN_TEXTURE, uv + vec2(offset.x, 0.0)).r;
\tfloat g = texture(SCREEN_TEXTURE, uv).g;
\tfloat b = texture(SCREEN_TEXTURE, uv - vec2(offset.x, 0.0)).b;
\tvec3 color = vec3(r, g, b);
\t
\t// Scanlines
\tfloat scanline = sin(uv.y * 800.0) * 0.5 + 0.5;
\tscanline = pow(scanline, scanline_width * 10.0 + 0.0001);
\tcolor *= mix(1.0, scanline, scanline_opacity);
\t
\t// Brightness and contrast
\tcolor = (color - 0.5) * contrast + 0.5 + (brightness - 1.0);
\t
\t// Vignette
\tvec2 vig_uv = uv * (1.0 - uv.yx);
\tfloat vignette = vig_uv.x * vig_uv.y * 15.0;
\tvignette = pow(vignette, vignette_strength);
\tcolor *= vignette;
\t
\t// Flicker
\tcolor *= 1.0 - flicker * random(floor(TIME * 15.0));
\t
\t// Apply bounds mask
\tcolor *= in_bounds;
\t
\tCOLOR = vec4(clamp(color, 0.0, 1.0), 1.0);
}`,

	halftone: `shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform float dot_size : hint_range(1.0, 50.0) = 8.0;
uniform float contrast : hint_range(1.0, 5.0) = 1.0;
uniform float intensity : hint_range(0.0, 1.0) = 1.0;

// CMYK angles (standard print angles)
const float ANGLE_C = 15.0;
const float ANGLE_M = 75.0;
const float ANGLE_Y = 0.0;
const float ANGLE_K = 45.0;

vec2 rotate(vec2 uv, float angle_deg) {
    float angle = radians(angle_deg);
    float s = sin(angle);
    float c = cos(angle);
    return vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
}

float halftone_dot(vec2 uv, float angle) {
    // Rotate coordinates
    vec2 rotated_uv = rotate(uv, angle);
    
    // Scale to dots
    vec2 nearest = 2.0 * fract(rotated_uv * (1.0 / SCREEN_PIXEL_SIZE) / dot_size) - 1.0;
    float dist = length(nearest);
    
    // Create soft dot
    return 1.0 - smoothstep(0.7, 0.8, dist);
}

void fragment() {
    vec4 tex_color = texture(SCREEN_TEXTURE, SCREEN_UV);
    
    // High contrast input
    vec3 color = pow(tex_color.rgb, vec3(contrast));
    
    // CMYK approximation
    float k = 1.0 - max(max(color.r, color.g), color.b);
    float c = (1.0 - color.r - k) / (1.0 - k);
    float m = (1.0 - color.g - k) / (1.0 - k);
    float y = (1.0 - color.b - k) / (1.0 - k);
    
    // Check dots
    float dot_c = step(c, halftone_dot(SCREEN_UV, ANGLE_C));
    float dot_m = step(m, halftone_dot(SCREEN_UV, ANGLE_M));
    float dot_y = step(y, halftone_dot(SCREEN_UV, ANGLE_Y));
    float dot_k = step(k, halftone_dot(SCREEN_UV, ANGLE_K));
    
    // Recombine (subtractive mixing)
    vec3 result = vec3(1.0);
    result -= vec3(1.0, 0.0, 0.0) * (1.0 - dot_c); // Cyan absorbs Red
    result -= vec3(0.0, 1.0, 0.0) * (1.0 - dot_m); // Magenta absorbs Green
    result -= vec3(0.0, 0.0, 1.0) * (1.0 - dot_y); // Yellow absorbs Blue
    result *= dot_k; // Black darkens everything
    
    result = clamp(result, 0.0, 1.0);
    
    COLOR = vec4(mix(tex_color.rgb, result, intensity), tex_color.a);
}`,

	glitch: `shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform float glitch_intensity : hint_range(0.0, 1.0) = 0.1;
uniform float glitch_speed : hint_range(1.0, 60.0) = 10.0;
uniform float block_size : hint_range(5.0, 100.0) = 20.0;
uniform float color_drift : hint_range(0.0, 0.05) = 0.01;
uniform bool enable_scanline_shift = true;
uniform bool enable_color_separation = true;
uniform bool enable_noise = true;

float random(vec2 st) {
\treturn fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float random_block(float y, float t) {
\treturn random(vec2(floor(y * block_size), floor(t * glitch_speed)));
}

void fragment() {
\tvec2 uv = SCREEN_UV;
\tfloat t = TIME;
\t
\t// Block-based glitch probability
\tfloat block_noise = random_block(uv.y, t);
\t
\t// Horizontal shift glitch
\tif (enable_scanline_shift && block_noise < glitch_intensity * 0.5) {
\t\tfloat shift = (random(vec2(floor(t * glitch_speed * 2.0), floor(uv.y * block_size))) - 0.5) * 0.1;
\t\tuv.x += shift * glitch_intensity * 2.0;
\t}
\t
\t// Vertical block displacement
\tif (block_noise < glitch_intensity * 0.3) {
\t\tfloat block_shift = (random(vec2(floor(t * glitch_speed), 0.0)) - 0.5) * 0.05;
\t\tuv.y += block_shift * glitch_intensity;
\t}
\t
\tvec3 color;
\t
\t// Color channel separation
\tif (enable_color_separation && block_noise < glitch_intensity * 0.7) {
\t\tfloat drift = color_drift * glitch_intensity * (random(vec2(t, uv.y)) * 2.0 - 1.0);
\t\tcolor.r = texture(SCREEN_TEXTURE, uv + vec2(drift, 0.0)).r;
\t\tcolor.g = texture(SCREEN_TEXTURE, uv).g;
\t\tcolor.b = texture(SCREEN_TEXTURE, uv - vec2(drift, 0.0)).b;
\t} else {
\t\tcolor = texture(SCREEN_TEXTURE, uv).rgb;
\t}
\t
\t// Random noise overlay
\tif (enable_noise) {
\t\tfloat noise = random(uv * 1000.0 + vec2(t * 100.0, 0.0));
\t\tfloat noise_strength = glitch_intensity * 0.1 * step(0.95, random(vec2(floor(t * 10.0), 0.0)));
\t\tcolor = mix(color, vec3(noise), noise_strength);
\t}
\t
\t// Occasional color inversion
\tif (block_noise < glitch_intensity * 0.1) {
\t\tcolor = 1.0 - color;
\t}
\t
\tCOLOR = vec4(color, 1.0);
}`,

	chromaticAberration: `shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform float strength : hint_range(0.0, 30.0) = 3.0;
uniform vec2 direction = vec2(1.0, 0.0);
uniform bool radial = false;
uniform vec2 radial_center = vec2(0.5, 0.5);
uniform float radial_falloff : hint_range(0.0, 2.0) = 1.0;

void fragment() {
\tvec2 offset;
\t
\tif (radial) {
\t\t// Radial chromatic aberration (stronger at edges)
\t\tvec2 to_center = SCREEN_UV - radial_center;
\t\tfloat dist = length(to_center);
\t\toffset = normalize(to_center) * SCREEN_PIXEL_SIZE * strength * pow(dist, radial_falloff);
\t} else {
\t\t// Directional chromatic aberration
\t\toffset = normalize(direction) * SCREEN_PIXEL_SIZE * strength;
\t}
\t
\tfloat r = texture(SCREEN_TEXTURE, SCREEN_UV + offset).r;
\tfloat g = texture(SCREEN_TEXTURE, SCREEN_UV).g;
\tfloat b = texture(SCREEN_TEXTURE, SCREEN_UV - offset).b;
\t
\tCOLOR = vec4(r, g, b, 1.0);
}`,

	colorGrading: `shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

// Basic adjustments
uniform float brightness : hint_range(-1.0, 1.0) = 0.0;
uniform float contrast : hint_range(0.0, 2.0) = 1.0;
uniform float saturation : hint_range(0.0, 2.0) = 1.0;
uniform float gamma : hint_range(0.5, 2.0) = 1.0;

// Color temperature
uniform float temperature : hint_range(-1.0, 1.0) = 0.0; // -1 cool, +1 warm

// Tint
uniform vec4 tint_color : source_color = vec4(1.0, 1.0, 1.0, 1.0);
uniform float tint_strength : hint_range(0.0, 1.0) = 0.0;

// Shadows/Midtones/Highlights
uniform vec4 shadow_color : source_color = vec4(0.0, 0.0, 0.0, 1.0);
uniform vec4 highlight_color : source_color = vec4(1.0, 1.0, 1.0, 1.0);
uniform float shadow_strength : hint_range(0.0, 1.0) = 0.0;
uniform float highlight_strength : hint_range(0.0, 1.0) = 0.0;

// Preset modes
uniform int preset : hint_range(0, 5) = 0;
// 0 = custom, 1 = warm vintage, 2 = cool cinema, 3 = high contrast, 4 = sepia, 5 = noir

float luminance(vec3 c) {
\treturn dot(c, vec3(0.299, 0.587, 0.114));
}

void fragment() {
\tvec3 color = texture(SCREEN_TEXTURE, SCREEN_UV).rgb;
\t
\t// Apply preset overrides
\tfloat b = brightness;
\tfloat c = contrast;
\tfloat s = saturation;
\tfloat g = gamma;
\tfloat t = temperature;
\tvec3 tint = tint_color.rgb;
\tfloat ts = tint_strength;
\t
\tif (preset == 1) {
\t\t// Warm vintage
\t\tt = 0.3; ts = 0.2; tint = vec3(1.0, 0.9, 0.7);
\t\tc = 0.9; s = 0.8;
\t} else if (preset == 2) {
\t\t// Cool cinema
\t\tt = -0.2; ts = 0.15; tint = vec3(0.8, 0.9, 1.0);
\t\tc = 1.1; s = 0.9;
\t} else if (preset == 3) {
\t\t// High contrast
\t\tc = 1.4; s = 1.2;
\t} else if (preset == 4) {
\t\t// Sepia
\t\ts = 0.0; ts = 0.6; tint = vec3(1.0, 0.9, 0.7);
\t} else if (preset == 5) {
\t\t// Noir
\t\ts = 0.0; c = 1.3;
\t}
\t
\t// Brightness
\tcolor += vec3(b);
\t
\t// Contrast
\tcolor = (color - 0.5) * c + 0.5;
\t
\t// Saturation
\tfloat lum = luminance(color);
\tcolor = mix(vec3(lum), color, s);
\t
\t// Gamma
\tcolor = pow(max(color, vec3(0.0)), vec3(1.0 / g));
\t
\t// Temperature
\tif (abs(t) > 0.01) {
\t\tvec3 warm = vec3(1.0, 0.9, 0.7);
\t\tvec3 cool = vec3(0.7, 0.9, 1.0);
\t\tvec3 temp_tint = mix(cool, warm, t * 0.5 + 0.5);
\t\tcolor *= temp_tint;
\t}
\t
\t// Tint
\tcolor = mix(color, color * tint, ts);
\t
\t// Shadows/Highlights
\tif (shadow_strength > 0.0 || highlight_strength > 0.0) {
\t\tfloat l = luminance(color);
\t\t
\t\t// Shadows (darker areas)
\t\tfloat shadow_mask = 1.0 - smoothstep(0.0, 0.5, l);
\t\tcolor = mix(color, color * shadow_color.rgb, shadow_mask * shadow_strength);
\t\t
\t\t// Highlights (brighter areas)
\t\tfloat highlight_mask = smoothstep(0.5, 1.0, l);
\t\tcolor = mix(color, color * highlight_color.rgb, highlight_mask * highlight_strength);
\t}
\t
\tCOLOR = vec4(clamp(color, 0.0, 1.0), 1.0);
}`,

	blur: `shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;

uniform float blur_amount : hint_range(0.0, 10.0) = 2.0;

void fragment() {
\tvec4 color = vec4(0.0);
\tfloat total_weight = 0.0;
\tvec2 ps = SCREEN_PIXEL_SIZE * blur_amount;
\t
\tcolor += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(-2.0 * ps.x, -2.0 * ps.y)) * 0.0183;
\tcolor += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(-1.0 * ps.x, -2.0 * ps.y)) * 0.0821;
\tcolor += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(0.0, -2.0 * ps.y)) * 0.135;
\tcolor += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(1.0 * ps.x, -2.0 * ps.y)) * 0.0821;
\tcolor += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(2.0 * ps.x, -2.0 * ps.y)) * 0.0183;
\t
\tcolor += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(-2.0 * ps.x, -1.0 * ps.y)) * 0.0821;
\tcolor += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(-1.0 * ps.x, -1.0 * ps.y)) * 0.368;
\tcolor += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(0.0, -1.0 * ps.y)) * 0.606;
\tcolor += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(1.0 * ps.x, -1.0 * ps.y)) * 0.368;
\tcolor += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(2.0 * ps.x, -1.0 * ps.y)) * 0.0821;
\t
\tcolor += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(-2.0 * ps.x, 0.0)) * 0.135;
\tcolor += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(-1.0 * ps.x, 0.0)) * 0.606;
\tcolor += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(0.0, 0.0)) * 1.0;
\tcolor += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(1.0 * ps.x, 0.0)) * 0.606;
\tcolor += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(2.0 * ps.x, 0.0)) * 0.135;
\t
\tcolor += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(-2.0 * ps.x, 1.0 * ps.y)) * 0.0821;
\tcolor += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(-1.0 * ps.x, 1.0 * ps.y)) * 0.368;
\tcolor += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(0.0, 1.0 * ps.y)) * 0.606;
\tcolor += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(1.0 * ps.x, 1.0 * ps.y)) * 0.368;
\tcolor += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(2.0 * ps.x, 1.0 * ps.y)) * 0.0821;
\t
\tcolor += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(-2.0 * ps.x, 2.0 * ps.y)) * 0.0183;
\tcolor += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(-1.0 * ps.x, 2.0 * ps.y)) * 0.0821;
\tcolor += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(0.0, 2.0 * ps.y)) * 0.135;
\tcolor += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(1.0 * ps.x, 2.0 * ps.y)) * 0.0821;
\tcolor += texture(SCREEN_TEXTURE, SCREEN_UV + vec2(2.0 * ps.x, 2.0 * ps.y)) * 0.0183;
\t
\ttotal_weight = 6.2196;
\t
\tCOLOR = color / total_weight;
}`,

	bloom: `shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_linear_mipmap;
uniform float threshold : hint_range(0.0, 1.0) = 0.8;
uniform float intensity : hint_range(0.0, 5.0) = 1.5;
uniform float radius : hint_range(0.0, 10.0) = 3.0;

void fragment() {
    vec4 color = texture(SCREEN_TEXTURE, SCREEN_UV);
    vec3 bloom = vec3(0.0);
    
    // Simple 9-tap box blur approximation for single-pass performance
    vec2 ps = SCREEN_PIXEL_SIZE * radius;
    
    // Loop through 3x3 grid centered on current pixel
    for (float x = -1.0; x <= 1.0; x += 1.0) {
        for (float y = -1.0; y <= 1.0; y += 1.0) {
            vec2 offset = vec2(x, y) * ps;
            vec4 sample_col = texture(SCREEN_TEXTURE, SCREEN_UV + offset);
            
            // Calculate brightness
            float brightness = dot(sample_col.rgb, vec3(0.2126, 0.7152, 0.0722));
            
            // Only add to bloom if brightness exceeds threshold
            if (brightness > threshold) {
                // Soft knee curve for smoother threshold transition
                float factor = smoothstep(threshold, threshold + 0.1, brightness);
                bloom += sample_col.rgb * factor;
            }
        }
    }
    
    // Average the samples (9 samples total)
    bloom /= 9.0;
    
    // Add bloom to original color
    COLOR = vec4(color.rgb + bloom * intensity, color.a);
}`,

	ascii: `shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_nearest;
uniform float pixel_size : hint_range(4.0, 32.0) = 8.0;
uniform bool monochrome : hint_range(0, 1) = 0; // Use int/bool hint
uniform vec4 color : source_color = vec4(0.0, 1.0, 0.0, 1.0);

// Simple Signed Distance Functions for shapes
float sdCircle(vec2 p, float r) {
    return length(p) - r;
}

float sdBox(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

float sdCross(vec2 p, vec2 b, float r) {
    p = abs(p); p = (p.y > p.x) ? p.yx : p.xy;
    vec2  q = p - b;
    float k = max(q.y, q.x);
    vec2  w = (k > 0.0) ? q : vec2(b.y - p.x, -k);
    return sign(k) * length(max(w, 0.0)) + r;
}

void fragment() {
    // Quantize UV to grid
    vec2 resolution = 1.0 / SCREEN_PIXEL_SIZE;
    vec2 grid_uv = floor(SCREEN_UV * resolution / pixel_size) * pixel_size / resolution;
    
    // Sample luminance at grid center
    vec3 tex = texture(SCREEN_TEXTURE, grid_uv).rgb;
    float lum = dot(tex, vec3(0.299, 0.587, 0.114));
    
    // Get local UV within the cell (-0.5 to 0.5)
    vec2 cell_uv = fract(SCREEN_UV * resolution / pixel_size) - 0.5;
    
    // Determine shape based on luminance
    float dist = 1.0;
    
    if (lum > 0.8) {
        // Full block (Box)
        dist = sdBox(cell_uv, vec2(0.4));
    } else if (lum > 0.6) {
        // Hash / Cross
        dist = sdCross(cell_uv, vec2(0.4, 0.1), 0.0);
        float dist2 = sdCross(cell_uv, vec2(0.1, 0.4), 0.0); // Create plus
        dist = min(dist, dist2);
    } else if (lum > 0.4) {
        // Colon / Two dots
        dist = min(sdCircle(cell_uv - vec2(0.0, 0.2), 0.08), 
                  sdCircle(cell_uv + vec2(0.0, 0.2), 0.08));
    } else if (lum > 0.2) {
        // Single Dot
        dist = sdCircle(cell_uv, 0.08);
    } else {
        // Empty
        dist = 1.0; 
    }
    
    // Render shape (AA)
    float shape = 1.0 - smoothstep(-0.05, 0.05, dist);
    
    vec3 out_color = tex;
    if (monochrome) {
        out_color = color.rgb * shape * lum * 2.0; // Boost brightness
    } else {
        out_color = tex * shape;
    }
    
    COLOR = vec4(out_color, 1.0);
}`,

	// =========================================================================
	// GRID SHADER (godot_project/shaders/grid.gdshader)
	// =========================================================================

	grid: `shader_type spatial;
render_mode unshaded, blend_mix, depth_draw_opaque, cull_disabled;

varying vec3 world_pos;

uniform float grid_size = 1.0;
uniform float line_width = 0.02;
uniform vec4 color : source_color = vec4(0.5, 0.5, 0.5, 0.5);
uniform float fade_start = 20.0;
uniform float fade_end = 40.0;

void vertex() {
\tworld_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

float grid(vec2 pos, float scale) {
\tvec2 coord = pos * scale;
\tvec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
\tfloat line = min(grid.x, grid.y);
\treturn 1.0 - min(line, 1.0);
}

void fragment() {
\t// Base grid
\tfloat g = grid(world_pos.xz, 1.0 / grid_size);
\t
\t// Thicker lines every 10 units
\tfloat g_major = grid(world_pos.xz, 0.1 / grid_size); // 10x larger cells
\t
\t// Combine grids
\tfloat combined_grid = max(g * 0.5, g_major);
\t
\t// Distance fade
\tfloat dist = length(world_pos.xz - CAMERA_POSITION_WORLD.xz);
\tfloat alpha = smoothstep(fade_end, fade_start, dist);
\t
\t// Axes
\t// X axis (Z=0) is Red
\tfloat axis_x = step(abs(world_pos.z), line_width * 2.0);
\t// Z axis (X=0) is Blue
\tfloat axis_z = step(abs(world_pos.x), line_width * 2.0);
\t
\tvec3 final_color = color.rgb;
\tfloat final_alpha = combined_grid;
\t
\tif (axis_x > 0.5) {
\t\tfinal_color = vec3(0.8, 0.2, 0.2);
\t\tfinal_alpha = 1.0;
\t} else if (axis_z > 0.5) {
\t\tfinal_color = vec3(0.2, 0.2, 0.8);
\t\tfinal_alpha = 1.0;
\t}
\t
\tALBEDO = final_color;
\tALPHA = final_alpha * alpha * color.a;
}`,
};

// ---------------------------------------------------------------------------
// Lookup helper — resolves EffectType to inline GLSL
// ---------------------------------------------------------------------------

export function getShaderGlsl(effectType: string): string | null {
	return SHADER_LIBRARY[effectType] ?? null;
}

export function getShaderGlslStrict(effectType: EffectType): string {
	const glsl = SHADER_LIBRARY[effectType];
	if (!glsl) {
		throw new Error(`Unknown effect type in shader library: ${effectType}`);
	}
	return glsl;
}

export function getAvailableShaderKeys(): string[] {
	return Object.keys(SHADER_LIBRARY);
}
