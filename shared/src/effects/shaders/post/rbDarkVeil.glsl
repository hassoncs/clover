shader_type canvas_item;

uniform float u_hue_shift : hint_range(-180.0, 180.0) = 0.0;
uniform float u_noise : hint_range(0.0, 0.3) = 0.0;
uniform float u_scan : hint_range(0.0, 1.0) = 0.0;
uniform float u_scan_freq : hint_range(0.0, 0.5) = 0.0;
uniform float u_warp : hint_range(0.0, 1.0) = 0.0;

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

mat2 rot(float a) {
    float c = cos(a);
    float s = sin(a);
    return mat2(c, -s, s, c);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    float a = hash12(i);
    float b = hash12(i + vec2(1.0, 0.0));
    float c = hash12(i + vec2(0.0, 1.0));
    float d = hash12(i + vec2(1.0, 1.0));

    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p = rot(0.6) * p * 2.0;
        a *= 0.5;
    }
    return v;
}

vec3 rgb2yiq(vec3 c) {
    return vec3(
        dot(c, vec3(0.299, 0.587, 0.114)),
        dot(c, vec3(0.596, -0.274, -0.322)),
        dot(c, vec3(0.211, -0.523, 0.312))
    );
}

vec3 yiq2rgb(vec3 c) {
    return vec3(
        c.x + 0.956 * c.y + 0.621 * c.z,
        c.x - 0.272 * c.y - 0.647 * c.z,
        c.x - 1.106 * c.y + 1.703 * c.z
    );
}

vec3 hue_shift_rgb(vec3 col, float deg) {
    vec3 yiq = rgb2yiq(col);
    float rad = deg * PI / 180.0;
    float c = cos(rad);
    float s = sin(rad);
    vec2 iq = vec2(yiq.y * c - yiq.z * s, yiq.y * s + yiq.z * c);
    return clamp(yiq2rgb(vec3(yiq.x, iq.x, iq.y)), 0.0, 1.0);
}

void fragment() {
    vec2 resolution = 1.0 / SCREEN_PIXEL_SIZE;
    vec2 uv = SCREEN_UV * 2.0 - 1.0;
    uv.x *= resolution.x / resolution.y;
    uv += u_warp * vec2(sin(uv.y * 6.283 + TIME * 0.5), cos(uv.x * 6.283 + TIME * 0.5)) * 0.05;

    float t = TIME * 0.4;
    float n0 = fbm(uv * 1.3 + vec2(t, -t * 0.7));
    float n1 = fbm(uv * 2.7 - vec2(t * 0.4, t));
    float veil = smoothstep(0.25, 0.85, n0 * 0.75 + n1 * 0.45);

    vec3 deep = vec3(0.02, 0.02, 0.05);
    vec3 neon = vec3(0.18, 0.55, 0.92);
    vec3 col = mix(deep, neon, veil);
    col = hue_shift_rgb(col, u_hue_shift);

    float scan = sin(FRAGCOORD.y * u_scan_freq) * 0.5 + 0.5;
    col *= 1.0 - (scan * scan) * u_scan;

    float grain = hash12(FRAGCOORD.xy + vec2(TIME));
    col += (grain - 0.5) * u_noise;

    COLOR = vec4(clamp(col, 0.0, 1.0), 1.0);
}
