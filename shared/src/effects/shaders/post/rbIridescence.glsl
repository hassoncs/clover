shader_type canvas_item;

uniform vec3 u_color : source_color = vec3(1.0, 1.0, 1.0);
uniform float u_amplitude : hint_range(0.0, 1.0) = 0.1;
uniform float u_speed : hint_range(0.0, 5.0) = 1.0;
uniform vec2 u_mouse = vec2(0.5, 0.5);

void fragment() {
    vec2 resolution = 1.0 / SCREEN_PIXEL_SIZE;
    float mr = min(resolution.x, resolution.y);
    vec2 uv = (SCREEN_UV * 2.0 - 1.0) * resolution / mr;

    uv += (u_mouse - vec2(0.5, 0.5)) * u_amplitude;

    float d = -TIME * 0.5 * u_speed;
    float a = 0.0;
    for (float i = 0.0; i < 8.0; i += 1.0) {
        a += cos(i - d - a * uv.x);
        d += sin(uv.y * i + a);
    }

    d += TIME * 0.5 * u_speed;

    vec2 xy = cos(uv * vec2(d, a)) * 0.6 + 0.4;
    vec3 col = vec3(xy, cos(a + d) * 0.5 + 0.5);
    col = cos(col * cos(vec3(d, a, 2.5)) * 0.5 + 0.5) * u_color;

    COLOR = vec4(col, 1.0);
}
