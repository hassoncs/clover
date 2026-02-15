shader_type canvas_item;

uniform float u_height : hint_range(0.5, 8.0) = 3.5;
uniform float u_base_width : hint_range(0.5, 10.0) = 5.5;
uniform float u_glow : hint_range(0.0, 3.0) = 1.0;
uniform float u_noise : hint_range(0.0, 1.0) = 0.5;
uniform float u_hue_shift : hint_range(-3.1416, 3.1416) = 0.0;
uniform float u_color_frequency : hint_range(0.1, 4.0) = 1.0;
uniform float u_bloom : hint_range(0.0, 3.0) = 1.0;

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

mat3 hue_rotation(float a) {
    float c = cos(a);
    float s = sin(a);
    mat3 w = mat3(
        vec3(0.299, 0.299, 0.299),
        vec3(0.587, 0.587, 0.587),
        vec3(0.114, 0.114, 0.114)
    );
    mat3 u = mat3(
        vec3(0.701, -0.299, -0.300),
        vec3(-0.587, 0.413, -0.588),
        vec3(-0.114, -0.114, 0.886)
    );
    mat3 v = mat3(
        vec3(0.168, 0.328, -0.497),
        vec3(-0.331, 0.035, 0.296),
        vec3(0.500, -0.500, 0.201)
    );
    return w + c * u + s * v;
}

float sd_prism(vec3 p, float h, float base_half) {
    vec3 q = vec3(abs(p.x) / base_half, abs(p.y) / h, abs(p.z) / base_half);
    float oct = (q.x + q.y + q.z - 1.0) * min(base_half, h) * 0.577350269;
    return max(oct, -p.y);
}

void fragment() {
    vec2 resolution = 1.0 / SCREEN_PIXEL_SIZE;
    float px_scale = 1.0 / (max(resolution.y, 1.0) * 0.1 * 3.6);
    vec2 f = (FRAGCOORD.xy - 0.5 * resolution) * px_scale;

    float z = 5.0;
    vec3 accum = vec3(0.0);
    float t = TIME * 0.5;

    for (int i = 0; i < 90; i++) {
        vec3 p = vec3(f, z);
        float c0 = cos(t + 0.3 * p.y);
        float s0 = sin(t + 0.3 * p.y);
        p.xz = mat2(c0, -s0, s0, c0) * p.xz;

        vec3 q = p;
        q.y += u_height * 0.25;

        float d = 0.1 + 0.2 * abs(sd_prism(q, max(u_height, 0.001), max(u_base_width * 0.5, 0.001)));
        z -= d;

        vec3 sample_col = sin((p.y + z) * u_color_frequency + vec3(0.0, 1.0, 2.0)) + 1.0;
        accum += sample_col / max(d, 0.0001);
    }

    vec3 col = tanh(accum * accum * (u_glow * max(u_bloom, 0.001)) / 100000.0);
    col = clamp(hue_rotation(u_hue_shift) * col, 0.0, 1.0);

    float n = hash12(FRAGCOORD.xy + vec2(TIME));
    col += (n - 0.5) * u_noise;
    col = clamp(col, 0.0, 1.0);

    COLOR = vec4(col, 1.0);
}
