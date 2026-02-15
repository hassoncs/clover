shader_type canvas_item;

uniform float u_angle : hint_range(-180.0, 180.0) = 0.0;
uniform float u_noise : hint_range(0.0, 1.0) = 0.3;
uniform float u_blind_count : hint_range(1.0, 64.0) = 16.0;
uniform float u_distort : hint_range(0.0, 4.0) = 0.0;
uniform float u_spotlight_opacity : hint_range(0.0, 2.0) = 1.0;
uniform vec2 u_mouse = vec2(0.5, 0.5);

float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

vec2 rotate2d(vec2 p, float a) {
    float c = cos(a);
    float s = sin(a);
    return mat2(c, -s, s, c) * p;
}

void fragment() {
    vec2 uv0 = SCREEN_UV;
    vec2 p = uv0 * 2.0 - 1.0;
    vec2 pr = rotate2d(p, radians(u_angle));
    vec2 uv = pr * 0.5 + 0.5;

    vec2 uv_mod = uv;
    if (u_distort > 0.0) {
        float a = uv_mod.y * 6.0;
        float b = uv_mod.x * 6.0;
        float w = 0.01 * u_distort;
        uv_mod.x += sin(a) * w;
        uv_mod.y += cos(b) * w;
    }

    vec3 color_a = vec3(1.0, 0.6235, 0.9882);
    vec3 color_b = vec3(0.3216, 0.1529, 1.0);
    vec3 base = mix(color_a, color_b, clamp(uv_mod.x, 0.0, 1.0));

    float d = length(uv0 - u_mouse);
    float dn = d / 0.5;
    float spot = (1.0 - 2.0 * pow(dn, 1.0)) * u_spotlight_opacity;

    float stripe = fract(uv_mod.x * max(u_blind_count, 1.0));
    vec3 col = vec3(spot) + base - vec3(stripe);
    col += (rand(FRAGCOORD.xy + TIME) - 0.5) * u_noise;

    COLOR = vec4(col, 1.0);
}
