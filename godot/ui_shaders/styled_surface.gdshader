shader_type canvas_item;

// Base texture (tileable material)
uniform sampler2D u_tex : source_color;

// Tiling and tint
uniform vec2 u_tile = vec2(1.0);
uniform vec4 u_tint : source_color = vec4(1.0);

// Rounded rectangle
uniform float u_radius_px = 18.0;
uniform float u_edge_soft_px = 1.0;

// Border
uniform float u_border_px = 2.0;
uniform vec4 u_border_color : source_color = vec4(1.0, 1.0, 1.0, 0.25);

// Drop shadow (outside)
uniform float u_shadow_px = 10.0;
uniform vec2 u_shadow_offset_px = vec2(0.0, 4.0);
uniform vec4 u_shadow_color : source_color = vec4(0.0, 0.0, 0.0, 0.35);

// Bevel / emboss
uniform float u_bevel_px = 6.0;
uniform float u_bevel_strength = 0.25;
uniform float u_bevel_light_angle = 2.2;

// Inner shadow/glow
uniform float u_inner_px = 8.0;
uniform float u_inner_strength = 0.25;
uniform vec4 u_inner_color : source_color = vec4(0.0, 0.0, 0.0, 1.0);

// Signed distance function for rounded rectangle
float sdRoundRect(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - (b - vec2(r));
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

// Anti-aliased step function
float aastep(float threshold, float value, float aa) {
    return smoothstep(threshold - aa, threshold + aa, value);
}

void fragment() {
    // Get control size in pixels
    vec2 size_px = vec2(textureSize(TEXTURE, 0));
    if (size_px.x <= 0.0 || size_px.y <= 0.0) {
        size_px = vec2(1.0) / SCREEN_PIXEL_SIZE;
    }

    vec2 uv = UV;
    vec2 px = uv * size_px;
    vec2 center = size_px * 0.5;
    vec2 p = px - center;
    vec2 half_size = size_px * 0.5;

    float aa = max(0.75, u_edge_soft_px);

    // Rounded rect SDF
    float d = sdRoundRect(p, half_size, u_radius_px);

    // Fill mask
    float fill = 1.0 - aastep(0.0, d, aa);

    // Border mask
    float d_in = d + u_border_px;
    float border = clamp((1.0 - aastep(0.0, d, aa)) - (1.0 - aastep(0.0, d_in, aa)), 0.0, 1.0);

    // Sample texture (tiled)
    vec2 tuv = fract(uv * u_tile);
    vec4 tex = texture(u_tex, tuv) * u_tint;

    // Bevel - calculate normal from SDF gradient
    vec2 e = vec2(1.0, 0.0);
    float d_x = sdRoundRect(p + e.xy, half_size, u_radius_px) - sdRoundRect(p - e.xy, half_size, u_radius_px);
    float d_y = sdRoundRect(p + e.yx, half_size, u_radius_px) - sdRoundRect(p - e.yx, half_size, u_radius_px);
    vec2 n = normalize(vec2(d_x, d_y) + 1e-6);

    vec2 light_dir = normalize(vec2(cos(u_bevel_light_angle), sin(u_bevel_light_angle)));
    float ndl = dot(n, light_dir);

    float bevel_band = 1.0 - aastep(u_bevel_px, abs(d), aa);
    vec3 bevel_lit = tex.rgb + (ndl * u_bevel_strength) * bevel_band;

    // Inner shadow/glow
    float inner_band = (1.0 - aastep(u_inner_px, -d, aa)) * fill;
    vec3 inner = mix(bevel_lit, u_inner_color.rgb, inner_band * u_inner_strength);

    // Drop shadow
    vec2 p_shadow = p - u_shadow_offset_px;
    float d_shadow = sdRoundRect(p_shadow, half_size, u_radius_px);
    float shadow_alpha = (1.0 - aastep(0.0, d_shadow, aa)) * (1.0 - fill);
    shadow_alpha *= smoothstep(u_shadow_px, 0.0, max(0.0, d_shadow));
    vec4 shadow = vec4(u_shadow_color.rgb, u_shadow_color.a * shadow_alpha);

    vec4 base = vec4(inner, tex.a) * fill;

    // Composite: shadow -> base -> border
    vec4 out_col = shadow;
    out_col = mix(out_col, base, base.a);
    out_col.rgb = mix(out_col.rgb, u_border_color.rgb, border * u_border_color.a);
    out_col.a = max(out_col.a, fill);

    COLOR = out_col;
}
