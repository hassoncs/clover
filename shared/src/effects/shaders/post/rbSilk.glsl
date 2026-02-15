shader_type canvas_item;

uniform vec3 u_color : source_color = vec3(0.4824, 0.4549, 0.5059);
uniform float u_speed : hint_range(0.0, 10.0) = 5.0;
uniform float u_scale : hint_range(0.1, 4.0) = 1.0;
uniform float u_rotation : hint_range(-6.2832, 6.2832) = 0.0;
uniform float u_noise_intensity : hint_range(0.0, 3.0) = 1.5;

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

mat2 rotate2d(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, -s, s, c);
}

void fragment() {
    vec2 resolution = 1.0 / SCREEN_PIXEL_SIZE;
    float min_res = min(resolution.x, resolution.y);
    vec2 uv = (SCREEN_UV * 2.0 - 1.0) * resolution / min_res;
    uv = rotate2d(u_rotation) * uv;
    uv *= u_scale;

    float t = TIME * u_speed;
    vec2 tex = uv;
    tex.y += 0.03 * sin(8.0 * tex.x - t);

    float pattern = 0.6 +
        0.4 * sin(5.0 * (tex.x + tex.y + cos(3.0 * tex.x + 5.0 * tex.y) + 0.02 * t)
        + sin(20.0 * (tex.x + tex.y - 0.1 * t)));

    float n = hash12(FRAGCOORD.xy + vec2(TIME));
    vec3 col = u_color * pattern;
    col -= (n / 15.0) * u_noise_intensity;
    col = clamp(col, 0.0, 1.0);

    COLOR = vec4(col, 1.0);
}
