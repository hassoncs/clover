shader_type canvas_item;

uniform float u_density : hint_range(0.1, 4.0) = 1.0;
uniform float u_hue_shift : hint_range(0.0, 360.0) = 140.0;
uniform float u_glow_intensity : hint_range(0.0, 2.0) = 0.3;
uniform float u_twinkle_intensity : hint_range(0.0, 2.0) = 0.3;
uniform float u_rotation_speed : hint_range(-2.0, 2.0) = 0.1;
uniform vec2 u_mouse = vec2(0.5, 0.5);

#define NUM_LAYER 4.0
#define STAR_COLOR_CUTOFF 0.2

float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float tri(float x) {
    return abs(fract(x) * 2.0 - 1.0);
}

float tris(float x) {
    float t = fract(x);
    return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0));
}

float trisn(float x) {
    float t = fract(x);
    return 2.0 * (1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0))) - 1.0;
}

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float star_fn(vec2 uv, float flare) {
    float d = max(length(uv), 0.0001);
    float m = (0.05 * u_glow_intensity) / d;
    float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
    m += rays * flare * u_glow_intensity;
    mat2 rot45 = mat2(0.7071, -0.7071, 0.7071, 0.7071);
    uv *= rot45;
    rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
    m += rays * 0.3 * flare * u_glow_intensity;
    m *= smoothstep(1.0, 0.2, d);
    return m;
}

vec3 star_layer(vec2 uv) {
    vec3 col = vec3(0.0);
    vec2 gv = fract(uv) - 0.5;
    vec2 id = floor(uv);

    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 offset = vec2(float(x), float(y));
            vec2 si = id + offset;
            float seed = hash21(si);
            float size = fract(seed * 345.32);
            float gloss_local = tri(TIME / (3.0 * seed + 1.0));
            float flare_size = smoothstep(0.9, 1.0, size) * gloss_local;

            float red = smoothstep(STAR_COLOR_CUTOFF, 1.0, hash21(si + 1.0)) + STAR_COLOR_CUTOFF;
            float blu = smoothstep(STAR_COLOR_CUTOFF, 1.0, hash21(si + 3.0)) + STAR_COLOR_CUTOFF;
            float grn = min(red, blu) * seed;
            vec3 base = vec3(red, grn, blu);

            float hue = atan(base.g - base.r, base.b - base.r) / (2.0 * PI) + 0.5;
            hue = fract(hue + u_hue_shift / 360.0);
            float sat = length(base - vec3(dot(base, vec3(0.299, 0.587, 0.114))));
            float val = max(max(base.r, base.g), base.b);
            base = hsv2rgb(vec3(hue, sat, val));

            vec2 pad = vec2(
                tris(seed * 34.0 + TIME / 10.0),
                tris(seed * 38.0 + TIME / 30.0)
            ) - 0.5;

            float star = star_fn(gv - offset - pad, flare_size);
            float twinkle = trisn(TIME + seed * 6.2831) * 0.5 + 1.0;
            twinkle = mix(1.0, twinkle, u_twinkle_intensity);
            col += star * twinkle * size * base;
        }
    }

    return col;
}

void fragment() {
    vec2 resolution = 1.0 / SCREEN_PIXEL_SIZE;
    vec2 uv = SCREEN_UV * 2.0 - 1.0;
    uv.x *= resolution.x / resolution.y;

    uv += (u_mouse - vec2(0.5)) * 0.1;

    float angle = TIME * u_rotation_speed;
    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    uv = rot * uv;

    vec3 col = vec3(0.0);
    for (float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYER) {
        float depth = fract(i + TIME * 0.05);
        float scale = mix(20.0 * u_density, 0.5 * u_density, depth);
        float fade = depth * smoothstep(1.0, 0.9, depth);
        col += star_layer(uv * scale + i * 453.32) * fade;
    }

    COLOR = vec4(col, 1.0);
}
