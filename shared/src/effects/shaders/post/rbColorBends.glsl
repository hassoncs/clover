shader_type canvas_item;

uniform float u_speed : hint_range(0.0, 5.0) = 0.2;
uniform float u_scale : hint_range(0.1, 4.0) = 1.0;
uniform float u_frequency : hint_range(0.1, 4.0) = 1.0;
uniform float u_warp_strength : hint_range(0.0, 2.0) = 1.0;
uniform float u_mouse_influence : hint_range(0.0, 2.0) = 1.0;
uniform float u_parallax : hint_range(0.0, 2.0) = 0.5;
uniform float u_noise : hint_range(0.0, 1.0) = 0.1;
uniform vec2 u_mouse = vec2(0.5, 0.5);

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

void fragment() {
    vec2 resolution = 1.0 / SCREEN_PIXEL_SIZE;
    float t = TIME * u_speed;

    vec2 p = SCREEN_UV * 2.0 - 1.0;
    p.x *= resolution.x / resolution.y;
    p += (u_mouse - vec2(0.5, 0.5)) * u_parallax;

    vec2 q = p / max(u_scale, 0.0001);
    q /= 0.5 + 0.2 * dot(q, q);
    q += 0.2 * cos(t) - 7.56;
    q += ((u_mouse - vec2(0.5, 0.5)) * 2.0 - p) * u_mouse_influence * 0.2;

    vec3 col = vec3(0.0);
    vec2 s = q;

    for (int i = 0; i < 3; i++) {
        s -= 0.01;
        vec2 r = sin(1.5 * (s.yx * u_frequency) + 2.0 * cos(s * u_frequency));
        float m0 = length(r + sin(5.0 * r.y * u_frequency - 3.0 * t + float(i)) / 4.0);

        float k_below = clamp(u_warp_strength, 0.0, 1.0);
        float k_mix = pow(k_below, 0.3);
        float gain = 1.0 + max(u_warp_strength - 1.0, 0.0);

        vec2 disp = (r - s) * k_below;
        vec2 warped = s + disp * gain;
        float m1 = length(warped + sin(5.0 * warped.y * u_frequency - 3.0 * t + float(i)) / 4.0);
        float m = mix(m0, m1, k_mix);

        col[i] = 1.0 - exp(-6.0 / exp(6.0 * m));
    }

    if (u_noise > 0.0001) {
        float n = hash12(FRAGCOORD.xy + vec2(TIME));
        col += (n - 0.5) * u_noise;
    }

    COLOR = vec4(clamp(col, 0.0, 1.0), 1.0);
}
