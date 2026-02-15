shader_type canvas_item;

uniform vec3 u_color : source_color = vec3(1.0, 1.0, 1.0);
uniform vec3 u_cursor_color : source_color = vec3(1.0, 1.0, 1.0);
uniform float u_cursor_ball_size : hint_range(0.1, 8.0) = 3.0;
uniform float u_clump_factor : hint_range(0.1, 3.0) = 1.0;
uniform vec2 u_mouse = vec2(0.5, 0.5);

float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

float metaball_value(vec2 center, float radius, vec2 p) {
    vec2 d = p - center;
    float dist2 = max(dot(d, d), 0.0001);
    return (radius * radius) / dist2;
}

void fragment() {
    vec2 resolution = 1.0 / SCREEN_PIXEL_SIZE;
    vec2 fc = FRAGCOORD.xy;

    float animation_size = 30.0;
    float scale = animation_size / resolution.y;
    vec2 coord = (fc - resolution * 0.5) * scale;
    vec2 mouse_w = (u_mouse * resolution - resolution * 0.5) * scale;

    float m1 = 0.0;
    const int ball_count = 15;
    for (int i = 0; i < ball_count; i++) {
        float idx = float(i) + 1.0;
        float st = hash11(idx * 1.7) * TAU;
        float dt_factor = mix(0.1 * PI, 0.4 * PI, hash11(idx * 2.3));
        float base_scale = mix(5.0, 10.0, hash11(idx * 3.1));
        float toggle = floor(hash11(idx * 4.2) * 2.0);
        float radius = mix(0.5, 2.0, hash11(idx * 5.3));

        float dt = TIME * 0.3 * dt_factor;
        float th = st + dt;
        float x = cos(th);
        float y = sin(th + dt * toggle);
        vec2 pos = vec2(x, y) * base_scale * u_clump_factor;
        m1 += metaball_value(pos, radius, coord);
    }

    float m2 = metaball_value(mouse_w, u_cursor_ball_size, coord);
    float total = m1 + m2;
    float f = smoothstep(-1.0, 1.0, (total - 1.3) / max(min(1.0, fwidth(total)), 0.001));

    vec3 c_final = vec3(0.0);
    if (total > 0.0) {
        float alpha1 = m1 / total;
        float alpha2 = m2 / total;
        c_final = u_color * alpha1 + u_cursor_color * alpha2;
    }

    COLOR = vec4(c_final * f, f);
}
