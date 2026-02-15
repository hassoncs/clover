shader_type canvas_item;

uniform float u_animation_speed : hint_range(0.0, 5.0) = 1.0;
uniform float u_bend_radius : hint_range(0.5, 20.0) = 5.0;
uniform float u_bend_strength : hint_range(-2.0, 2.0) = -0.5;
uniform float u_parallax_strength : hint_range(0.0, 1.0) = 0.2;
uniform vec2 u_mouse = vec2(0.5, 0.5);

mat2 rotate2d(float a) {
    float c = cos(a);
    float s = sin(a);
    return mat2(c, -s, s, c);
}

vec3 gradient_bg(vec2 uv) {
    vec3 pink = vec3(233.0, 71.0, 245.0) / 255.0;
    vec3 blue = vec3(47.0, 75.0, 162.0) / 255.0;
    float y = sin(uv.x - 0.2) * 0.3 - 0.1;
    float m = uv.y - y;
    vec3 col = vec3(0.0);
    col += mix(blue, vec3(0.0), smoothstep(0.0, 1.0, abs(m)));
    col += mix(pink, vec3(0.0), smoothstep(0.0, 1.0, abs(m - 0.8)));
    return col * 0.45;
}

float wave(vec2 uv, float offset, vec2 screen_uv, vec2 mouse_uv) {
    float t = TIME * u_animation_speed;
    float amp = sin(offset + t * 0.2) * 0.3;
    float y = sin(uv.x + offset + t * 0.1) * amp;

    vec2 d = screen_uv - mouse_uv;
    float influence = exp(-dot(d, d) * u_bend_radius);
    y += (mouse_uv.y - screen_uv.y) * influence * u_bend_strength;

    float m = uv.y - y;
    return 0.0175 / max(abs(m) + 0.01, 0.001) + 0.01;
}

void fragment() {
    vec2 resolution = 1.0 / SCREEN_PIXEL_SIZE;
    vec2 uv = (2.0 * FRAGCOORD.xy - resolution.xy) / resolution.y;
    uv.y *= -1.0;

    vec2 mouse_uv = (u_mouse * 2.0 - 1.0);
    mouse_uv.x *= resolution.x / resolution.y;
    uv += (u_mouse - vec2(0.5, 0.5)) * u_parallax_strength;

    vec3 col = gradient_bg(uv);

    for (int i = 0; i < 6; i++) {
        float fi = float(i);
        float t = fi / 5.0;
        vec3 line_col = mix(vec3(0.2, 0.4, 1.0), vec3(1.0, 0.4, 0.9), t) * 0.5;

        vec2 ruv = uv * rotate2d(0.2 * log(length(uv) + 1.0));
        col += line_col * wave(ruv + vec2(0.05 * fi + 1.2, -0.2), 1.0 + 0.2 * fi, uv, mouse_uv) * 0.18;

        vec2 ruv2 = uv * rotate2d(-0.25 * log(length(uv) + 1.0));
        col += line_col * wave(ruv2 + vec2(0.06 * fi + 0.4, 0.35), 1.8 + 0.15 * fi, uv, mouse_uv) * 0.12;
    }

    COLOR = vec4(clamp(col, 0.0, 1.0), 1.0);
}
