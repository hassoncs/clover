shader_type canvas_item;

uniform vec3 u_base_color : source_color = vec3(0.1, 0.1, 0.1);
uniform float u_amplitude : hint_range(0.0, 1.0) = 0.3;
uniform float u_frequency_x : hint_range(0.1, 10.0) = 3.0;
uniform float u_frequency_y : hint_range(0.1, 10.0) = 3.0;
uniform vec2 u_mouse = vec2(0.5, 0.5);

vec4 render_image(vec2 uv_coord, vec2 resolution) {
    vec2 frag_coord = uv_coord * resolution;
    vec2 uv = (2.0 * frag_coord - resolution) / min(resolution.x, resolution.y);

    for (float i = 1.0; i < 10.0; i += 1.0) {
        uv.x += u_amplitude / i * cos(i * u_frequency_x * uv.y + TIME + u_mouse.x * 3.14159);
        uv.y += u_amplitude / i * cos(i * u_frequency_y * uv.x + TIME + u_mouse.y * 3.14159);
    }

    vec2 diff = uv_coord - u_mouse;
    float dist = length(diff);
    float falloff = exp(-dist * 20.0);
    float ripple = sin(10.0 * dist - TIME * 2.0) * 0.03;
    uv += (diff / (dist + 0.0001)) * ripple * falloff;

    float denom = max(abs(sin(TIME - uv.y - uv.x)), 0.01);
    vec3 color = u_base_color / denom;
    return vec4(color, 1.0);
}

void fragment() {
    vec2 resolution = 1.0 / SCREEN_PIXEL_SIZE;
    vec4 col = vec4(0.0);
    int samples = 0;

    for (int i = -1; i <= 1; i++) {
        for (int j = -1; j <= 1; j++) {
            vec2 offset = vec2(float(i), float(j)) * (1.0 / min(resolution.x, resolution.y));
            col += render_image(SCREEN_UV + offset, resolution);
            samples += 1;
        }
    }

    COLOR = col / float(samples);
}
