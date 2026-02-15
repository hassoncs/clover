shader_type canvas_item;

uniform float u_amplitude : hint_range(0.0, 3.0) = 1.0;
uniform float u_blend : hint_range(0.0, 1.0) = 0.5;
uniform vec3 u_color_stop_a : source_color = vec3(0.3216, 0.1529, 1.0);
uniform vec3 u_color_stop_b : source_color = vec3(0.4863, 1.0, 0.4039);
uniform vec3 u_color_stop_c : source_color = vec3(0.3216, 0.1529, 1.0);

vec3 permute(vec3 x) {
    return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v) {
    const vec4 C = vec4(
        0.211324865405187,
        0.366025403784439,
        -0.577350269189626,
        0.024390243902439
    );
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);

    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));

    vec3 m = max(
        0.5 - vec3(
            dot(x0, x0),
            dot(x12.xy, x12.xy),
            dot(x12.zw, x12.zw)
        ),
        0.0
    );
    m = m * m;
    m = m * m;

    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);

    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

vec3 color_ramp(float t) {
    if (t <= 0.5) {
        float f = smoothstep(0.0, 0.5, t);
        return mix(u_color_stop_a, u_color_stop_b, f);
    }

    float f = smoothstep(0.5, 1.0, t);
    return mix(u_color_stop_b, u_color_stop_c, f);
}

void fragment() {
    vec2 uv = SCREEN_UV;
    vec3 ramp_color = color_ramp(uv.x);

    float height = snoise(vec2(uv.x * 2.0 + TIME * 0.1, TIME * 0.25)) * 0.5 * u_amplitude;
    height = exp(height);
    height = uv.y * 2.0 - height + 0.2;
    float intensity = 0.6 * height;

    float mid_point = 0.20;
    float aurora_alpha = smoothstep(mid_point - u_blend * 0.5, mid_point + u_blend * 0.5, intensity);
    vec3 aurora_color = intensity * ramp_color;

    COLOR = vec4(aurora_color * aurora_alpha, aurora_alpha);
}
