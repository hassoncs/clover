shader_type canvas_item;

uniform vec3 u_color : source_color = vec3(1.0, 1.0, 1.0);
uniform float u_speed : hint_range(0.0, 5.0) = 1.0;
uniform float u_direction : hint_range(-1.0, 1.0) = 1.0;
uniform float u_scale : hint_range(0.1, 4.0) = 1.0;
uniform float u_opacity : hint_range(0.0, 1.0) = 1.0;

void fragment() {
    vec2 resolution = 1.0 / SCREEN_PIXEL_SIZE;
    vec2 center = resolution * 0.5;
    vec2 c = FRAGCOORD.xy;
    c = (c - center) / max(u_scale, 0.001) + center;

    float z = 0.0;
    float t = TIME * u_speed * u_direction;
    vec3 accum = vec3(0.0);

    for (float i = 1.0; i <= 48.0; i += 1.0) {
        vec3 p = z * normalize(vec3(c - 0.5 * resolution, resolution.y));
        p.z -= 4.0;
        vec3 s = p;
        float d = p.y - t;

        p.x += 0.4 * (1.0 + p.y) * sin(d + p.x * 0.1) * cos(0.34 * d + p.x * 0.05);
        float cs = cos(p.y - t);
        float sn = sin(p.y - t);
        mat2 m = mat2(cs, -sn, sn, cs);
        vec2 q = m * p.xz;

        d = abs(length(q) - 0.25 * (5.0 + s.y)) / 3.0 + 0.0008;
        z += d;

        vec3 sample_col = sin(vec3(s.y + p.z * 0.5 - length(s - p)) + vec3(2.0, 1.0, 0.0)) + 1.0;
        accum += sample_col / max(d, 0.0001);
    }

    vec3 rgb = tanh(accum / 10000.0);
    float intensity = (rgb.r + rgb.g + rgb.b) / 3.0;
    vec3 final_color = mix(rgb, intensity * u_color, step(0.0001, length(u_color - vec3(1.0))));
    float alpha = clamp(length(rgb) * u_opacity, 0.0, 1.0);

    COLOR = vec4(clamp(final_color, 0.0, 1.0), alpha);
}
