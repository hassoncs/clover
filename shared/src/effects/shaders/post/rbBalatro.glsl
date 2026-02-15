shader_type canvas_item;

uniform float u_spin_rotation : hint_range(-10.0, 10.0) = -2.0;
uniform float u_spin_speed : hint_range(0.0, 20.0) = 7.0;
uniform float u_contrast : hint_range(0.5, 8.0) = 3.5;
uniform float u_lighting : hint_range(0.0, 2.0) = 0.4;
uniform float u_spin_amount : hint_range(0.0, 1.0) = 0.25;
uniform vec3 u_color1 : source_color = vec3(0.8706, 0.2667, 0.2314);
uniform vec3 u_color2 : source_color = vec3(0.0, 0.4196, 0.7059);
uniform vec3 u_color3 : source_color = vec3(0.0863, 0.1373, 0.1451);

vec3 effect(vec2 screen_size, vec2 screen_coords) {
    float pixel_filter = 745.0;
    float spin_ease = 1.0;
    vec2 offset = vec2(0.0, 0.0);

    float pixel_size = length(screen_size) / pixel_filter;
    vec2 uv = (floor(screen_coords * (1.0 / pixel_size)) * pixel_size - 0.5 * screen_size) / length(screen_size) - offset;
    float uv_len = length(uv);

    float speed = u_spin_rotation * spin_ease * 0.2 + 302.2;
    float new_pixel_angle = atan(uv.y, uv.x) + speed - spin_ease * 20.0 * (u_spin_amount * uv_len + (1.0 - u_spin_amount));
    vec2 mid = (screen_size / length(screen_size)) / 2.0;
    uv = vec2(uv_len * cos(new_pixel_angle) + mid.x, uv_len * sin(new_pixel_angle) + mid.y) - mid;

    uv *= 30.0;
    speed = TIME * u_spin_speed;
    vec2 uv2 = vec2(uv.x + uv.y);

    for (int i = 0; i < 5; i++) {
        uv2 += sin(max(uv.x, uv.y)) + uv;
        uv += 0.5 * vec2(
            cos(5.1123314 + 0.353 * uv2.y + speed * 0.131121),
            sin(uv2.x - 0.113 * speed)
        );
        uv -= cos(uv.x + uv.y) - sin(uv.x * 0.711 - uv.y);
    }

    float safe_contrast = max(u_contrast, 0.001);
    float contrast_mod = 0.25 * safe_contrast + 0.5 * u_spin_amount + 1.2;
    float paint_res = min(2.0, max(0.0, length(uv) * 0.035 * contrast_mod));
    float c1p = max(0.0, 1.0 - contrast_mod * abs(1.0 - paint_res));
    float c2p = max(0.0, 1.0 - contrast_mod * abs(paint_res));
    float c3p = 1.0 - min(1.0, c1p + c2p);
    float light = (u_lighting - 0.2) * max(c1p * 5.0 - 4.0, 0.0) + u_lighting * max(c2p * 5.0 - 4.0, 0.0);

    vec3 mixed = u_color1 * c1p + u_color2 * c2p + (c3p * u_color3);
    return (0.3 / safe_contrast) * u_color1 + (1.0 - 0.3 / safe_contrast) * mixed + vec3(light);
}

void fragment() {
    vec2 resolution = 1.0 / SCREEN_PIXEL_SIZE;
    vec2 uv = SCREEN_UV * resolution;
    COLOR = vec4(effect(resolution, uv), 1.0);
}
