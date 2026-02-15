shader_type canvas_item;

uniform float u_scale : hint_range(0.5, 4.0) = 1.0;
uniform float u_digit_size : hint_range(0.5, 3.0) = 1.5;
uniform float u_scanline_intensity : hint_range(0.0, 1.0) = 0.3;
uniform float u_glitch_amount : hint_range(0.0, 2.0) = 1.0;
uniform float u_chromatic_aberration : hint_range(0.0, 8.0) = 0.0;
uniform float u_curvature : hint_range(0.0, 0.4) = 0.2;
uniform float u_brightness : hint_range(0.0, 2.0) = 1.0;

float hash21(vec2 p) {
    p = fract(p * 234.56);
    p += dot(p, p + 34.56);
    return fract(p.x * p.y);
}

vec2 barrel(vec2 uv) {
    vec2 c = uv * 2.0 - 1.0;
    float r2 = dot(c, c);
    c *= 1.0 + u_curvature * r2;
    return c * 0.5 + 0.5;
}

float digit_cell(vec2 uv) {
    vec2 grid = vec2(30.0, 20.0);
    vec2 cell = floor(uv * grid);
    vec2 local = fract(uv * grid) * u_digit_size;

    float n = hash21(cell + floor(TIME * 2.0));
    float glyph = step(0.45, n);

    float px = floor(local.x * 5.0);
    float py = floor((1.0 - local.y) * 7.0);
    float mask = step(0.0, px) * step(px, 4.0) * step(0.0, py) * step(py, 6.0);

    float stroke = step(0.4, hash21(cell + vec2(px, py) * 0.17 + vec2(13.0, 7.0)));
    return glyph * stroke * mask;
}

vec3 terminal_color(vec2 uv) {
    float scan = 1.0 - (sin(FRAGCOORD.y * 1.7) * 0.5 + 0.5) * u_scanline_intensity;

    float glitch_band = sin(TIME * 8.0 + uv.y * 80.0);
    float disp = glitch_band * 0.01 * u_glitch_amount;

    float middle = digit_cell(uv + vec2(disp, 0.0));
    float glow = (
        digit_cell(uv + vec2(disp - 0.002, -0.002)) +
        digit_cell(uv + vec2(disp + 0.002, -0.002)) +
        digit_cell(uv + vec2(disp - 0.002, 0.002)) +
        digit_cell(uv + vec2(disp + 0.002, 0.002))
    ) * 0.25;

    vec3 col = vec3(0.85, 0.95, 1.0) * middle + vec3(0.2, 0.45, 1.0) * glow * 0.8;
    col *= scan;
    return col;
}

void fragment() {
    vec2 uv = SCREEN_UV;
    uv = barrel(uv);
    uv *= u_scale;

    vec3 col = terminal_color(uv);

    if (u_chromatic_aberration > 0.0) {
        vec2 resolution = 1.0 / SCREEN_PIXEL_SIZE;
        vec2 ca = vec2(u_chromatic_aberration) / resolution;
        col.r = terminal_color(uv + ca).r;
        col.b = terminal_color(uv - ca).b;
    }

    float dither = hash21(FRAGCOORD.xy + vec2(TIME)) - 0.5;
    col += dither * 0.004;
    col *= u_brightness;

    COLOR = vec4(clamp(col, 0.0, 1.0), 1.0);
}
