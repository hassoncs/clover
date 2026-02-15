shader_type canvas_item;

uniform float u_hue_shift : hint_range(0.0, 360.0) = 0.0;
uniform float u_hover_intensity : hint_range(0.0, 1.0) = 0.2;
uniform float u_rotation : hint_range(-6.2832, 6.2832) = 0.0;
uniform vec3 u_background_color : source_color = vec3(0.0, 0.0, 0.0);

vec3 rgb2yiq(vec3 c) {
    float y = dot(c, vec3(0.299, 0.587, 0.114));
    float i = dot(c, vec3(0.596, -0.274, -0.322));
    float q = dot(c, vec3(0.211, -0.523, 0.312));
    return vec3(y, i, q);
}

vec3 yiq2rgb(vec3 c) {
    float r = c.x + 0.956 * c.y + 0.621 * c.z;
    float g = c.x - 0.272 * c.y - 0.647 * c.z;
    float b = c.x - 1.106 * c.y + 1.703 * c.z;
    return vec3(r, g, b);
}

vec3 adjust_hue(vec3 color, float hue_deg) {
    float hue_rad = hue_deg * PI / 180.0;
    vec3 yiq = rgb2yiq(color);
    float cos_a = cos(hue_rad);
    float sin_a = sin(hue_rad);
    float i = yiq.y * cos_a - yiq.z * sin_a;
    float q = yiq.y * sin_a + yiq.z * cos_a;
    yiq.y = i;
    yiq.z = q;
    return yiq2rgb(yiq);
}

vec3 hash33(vec3 p3) {
    p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
    p3 += dot(p3, p3.yxz + 19.19);
    return -1.0 + 2.0 * fract(vec3(
        p3.x + p3.y,
        p3.x + p3.z,
        p3.y + p3.z
    ) * p3.zyx);
}

float snoise3(vec3 p) {
    const float K1 = 0.333333333;
    const float K2 = 0.166666667;
    vec3 i = floor(p + (p.x + p.y + p.z) * K1);
    vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
    vec3 e = step(vec3(0.0), d0 - d0.yzx);
    vec3 i1 = e * (1.0 - e.zxy);
    vec3 i2 = 1.0 - e.zxy * (1.0 - e);
    vec3 d1 = d0 - (i1 - K2);
    vec3 d2 = d0 - (i2 - K1);
    vec3 d3 = d0 - 0.5;
    vec4 h = max(0.6 - vec4(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3)), 0.0);
    vec4 n = h * h * h * h * vec4(
        dot(d0, hash33(i)),
        dot(d1, hash33(i + i1)),
        dot(d2, hash33(i + i2)),
        dot(d3, hash33(i + 1.0))
    );
    return dot(vec4(31.316), n);
}

vec4 extract_alpha(vec3 color_in) {
    float a = max(max(color_in.r, color_in.g), color_in.b);
    return vec4(color_in / (a + 1e-5), a);
}

void fragment() {
    vec2 resolution = 1.0 / SCREEN_PIXEL_SIZE;
    vec2 uv = SCREEN_UV;
    vec2 centered = (uv * resolution - resolution * 0.5) / min(resolution.x, resolution.y) * 2.0;

    float s = sin(u_rotation);
    float c = cos(u_rotation);
    centered = vec2(c * centered.x - s * centered.y, s * centered.x + c * centered.y);

    centered.x += u_hover_intensity * 0.1 * sin(centered.y * 10.0 + TIME);
    centered.y += u_hover_intensity * 0.1 * sin(centered.x * 10.0 + TIME);

    vec3 color1 = adjust_hue(vec3(0.611765, 0.262745, 0.996078), u_hue_shift);
    vec3 color2 = adjust_hue(vec3(0.298039, 0.760784, 0.913725), u_hue_shift);
    vec3 color3 = adjust_hue(vec3(0.062745, 0.078431, 0.6), u_hue_shift);

    float inner_radius = 0.6;
    float noise_scale = 0.65;
    float ang = atan(centered.y, centered.x);
    float len = length(centered);
    float inv_len = len > 0.0 ? 1.0 / len : 0.0;

    float bg_luminance = dot(u_background_color, vec3(0.299, 0.587, 0.114));
    float n0 = snoise3(vec3(centered * noise_scale, TIME * 0.5)) * 0.5 + 0.5;
    float r0 = mix(mix(inner_radius, 1.0, 0.4), mix(inner_radius, 1.0, 0.6), n0);
    float d0 = distance(centered, (r0 * inv_len) * centered);
    float v0 = (1.0 / (1.0 + d0 * 10.0)) * smoothstep(r0 * 1.05, r0, len);

    float a = -TIME;
    vec2 pos = vec2(cos(a), sin(a)) * r0;
    float d = distance(centered, pos);
    float v1 = (1.5 / (1.0 + d * d * 5.0)) * (1.0 / (1.0 + d0 * 50.0));

    float v2 = smoothstep(1.0, mix(inner_radius, 1.0, n0 * 0.5), len);
    float v3 = smoothstep(inner_radius, mix(inner_radius, 1.0, 0.5), len);

    float cl = cos(ang + TIME * 2.0) * 0.5 + 0.5;
    vec3 col_base = mix(color1, color2, cl);
    vec3 dark_col = clamp((mix(color3, col_base, v0) + v1) * v2 * v3, 0.0, 1.0);
    vec3 light_col = clamp(mix(u_background_color, (col_base + v1), v0), 0.0, 1.0);
    vec3 final_col = mix(dark_col, light_col, bg_luminance);

    vec4 alpha_col = extract_alpha(final_col);
    COLOR = vec4(alpha_col.rgb * alpha_col.a, alpha_col.a);
}
