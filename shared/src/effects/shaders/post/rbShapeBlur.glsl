shader_type canvas_item;

uniform float u_shape_size : hint_range(0.1, 3.0) = 1.2;
uniform float u_roundness : hint_range(0.0, 1.0) = 0.4;
uniform float u_border_size : hint_range(0.0, 0.2) = 0.05;
uniform float u_circle_size : hint_range(0.0, 1.0) = 0.3;
uniform float u_circle_edge : hint_range(0.0, 1.0) = 0.5;
uniform vec2 u_mouse = vec2(0.5, 0.5);

vec2 coord(vec2 p, vec2 resolution) {
    p = p / resolution;
    if (resolution.x > resolution.y) {
        p.x *= resolution.x / resolution.y;
        p.x += (resolution.y - resolution.x) / resolution.y / 2.0;
    } else {
        p.y *= resolution.y / resolution.x;
        p.y += (resolution.x - resolution.y) / resolution.x / 2.0;
    }
    p -= 0.5;
    p *= vec2(-1.0, 1.0);
    return p;
}

float sd_round_rect(vec2 p, vec2 b, float r) {
    vec2 d = abs(p - 0.5) * 4.2 - b + vec2(r);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - r;
}

float sd_circle(vec2 st, vec2 center) {
    return length(st - center) * 2.0;
}

float stroke_aa(float x, float size, float w, float edge) {
    float afwidth = length(vec2(dFdx(x), dFdy(x))) * 0.70710678;
    float d = smoothstep(size - edge - afwidth, size + edge + afwidth, x + w * 0.5)
        - smoothstep(size - edge - afwidth, size + edge + afwidth, x - w * 0.5);
    return clamp(d, 0.0, 1.0);
}

float fill_fn(float x, float size, float edge) {
    return 1.0 - smoothstep(size - edge, size + edge, x);
}

void fragment() {
    vec2 resolution = 1.0 / SCREEN_PIXEL_SIZE;
    vec2 st = coord(FRAGCOORD.xy, resolution) + 0.5;
    vec2 pos_mouse = coord(u_mouse * resolution, resolution) * vec2(1.0, -1.0) + 0.5;

    float sdf_circle = fill_fn(sd_circle(st, pos_mouse), u_circle_size, u_circle_edge);
    float sdf = sd_round_rect(st, vec2(u_shape_size), u_roundness);
    sdf = stroke_aa(sdf, 0.0, u_border_size, sdf_circle) * 4.0;

    COLOR = vec4(vec3(1.0), sdf);
}
