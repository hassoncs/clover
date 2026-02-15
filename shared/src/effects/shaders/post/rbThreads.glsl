shader_type canvas_item;

uniform vec3 u_color : source_color = vec3(1.0, 1.0, 1.0);
uniform float u_amplitude : hint_range(0.0, 2.0) = 1.0;
uniform float u_distance : hint_range(-1.0, 1.0) = 0.0;
uniform vec2 u_mouse = vec2(0.5, 0.5);

#define PI 3.1415926538

const int U_LINE_COUNT = 40;
const float U_LINE_WIDTH = 7.0;
const float U_LINE_BLUR = 10.0;

float perlin2d(vec2 p) {
    vec2 pi = floor(p);
    vec4 pf_pfmin1 = p.xyxy - vec4(pi, pi + 1.0);
    vec4 pt = vec4(pi.xy, pi.xy + 1.0);
    pt = pt - floor(pt * (1.0 / 71.0)) * 71.0;
    pt += vec2(26.0, 161.0).xyxy;
    pt *= pt;
    pt = pt.xzxz * pt.yyww;
    vec4 hash_x = fract(pt * (1.0 / 951.135664));
    vec4 hash_y = fract(pt * (1.0 / 642.949883));
    vec4 grad_x = hash_x - 0.49999;
    vec4 grad_y = hash_y - 0.49999;
    vec4 grad_results = inversesqrt(grad_x * grad_x + grad_y * grad_y)
        * (grad_x * pf_pfmin1.xzxz + grad_y * pf_pfmin1.yyww);
    grad_results *= 1.4142135623730950;
    vec2 blend = pf_pfmin1.xy * pf_pfmin1.xy * pf_pfmin1.xy
        * (pf_pfmin1.xy * (pf_pfmin1.xy * 6.0 - 15.0) + 10.0);
    vec4 blend2 = vec4(blend, vec2(1.0 - blend));
    return dot(grad_results, blend2.zxzx * blend2.wwyy);
}

float pixel(float count, vec2 resolution) {
    return (1.0 / max(resolution.x, resolution.y)) * count;
}

float line_fn(
    vec2 st,
    float width,
    float perc,
    vec2 mouse,
    float time,
    float amplitude,
    float distance,
    vec2 resolution
) {
    float split_offset = perc * 0.4;
    float split_point = 0.1 + split_offset;

    float amplitude_normal = smoothstep(split_point, 0.7, st.x);
    float amplitude_strength = 0.5;
    float final_amplitude = amplitude_normal * amplitude_strength
        * amplitude * (1.0 + (mouse.y - 0.5) * 0.2);

    float time_scaled = time / 10.0 + (mouse.x - 0.5) * 1.0;
    float blur = smoothstep(split_point, split_point + 0.05, st.x) * perc;

    float xnoise = mix(
        perlin2d(vec2(time_scaled, st.x + perc) * 2.5),
        perlin2d(vec2(time_scaled, st.x + time_scaled) * 3.5) / 1.5,
        st.x * 0.3
    );

    float y = 0.5 + (perc - 0.5) * distance + xnoise / 2.0 * final_amplitude;

    float line_start = smoothstep(
        y + (width / 2.0) + (U_LINE_BLUR * pixel(1.0, resolution) * blur),
        y,
        st.y
    );

    float line_end = smoothstep(
        y,
        y - (width / 2.0) - (U_LINE_BLUR * pixel(1.0, resolution) * blur),
        st.y
    );

    return clamp(
        (line_start - line_end) * (1.0 - smoothstep(0.0, 1.0, pow(perc, 0.3))),
        0.0,
        1.0
    );
}

void fragment() {
    vec2 resolution = 1.0 / SCREEN_PIXEL_SIZE;
    vec2 uv = SCREEN_UV;

    float line_strength = 1.0;
    for (int i = 0; i < U_LINE_COUNT; i++) {
        float p = float(i) / float(U_LINE_COUNT);
        line_strength *= (1.0 - line_fn(
            uv,
            U_LINE_WIDTH * pixel(1.0, resolution) * (1.0 - p),
            p,
            u_mouse,
            TIME,
            u_amplitude,
            u_distance,
            resolution
        ));
    }

    float color_val = 1.0 - line_strength;
    COLOR = vec4(u_color * color_val, color_val);
}
