shader_type canvas_item;

uniform float u_hue : hint_range(0.0, 360.0) = 230.0;
uniform float u_x_offset : hint_range(-2.0, 2.0) = 0.0;
uniform float u_speed : hint_range(0.0, 5.0) = 1.0;
uniform float u_intensity : hint_range(0.0, 5.0) = 1.0;
uniform float u_size : hint_range(0.1, 5.0) = 1.0;

#define OCTAVE_COUNT 10

vec3 hsv2rgb(vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z * mix(vec3(1.0), rgb, c.y);
}

float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

mat2 rotate2d(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat2(c, -s, s, c);
}

float noise(vec2 p) {
    vec2 ip = floor(p);
    vec2 fp = fract(p);
    float a = hash12(ip);
    float b = hash12(ip + vec2(1.0, 0.0));
    float c = hash12(ip + vec2(0.0, 1.0));
    float d = hash12(ip + vec2(1.0, 1.0));

    vec2 t = smoothstep(0.0, 1.0, fp);
    return mix(mix(a, b, t.x), mix(c, d, t.x), t.y);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < OCTAVE_COUNT; i++) {
        value += amplitude * noise(p);
        p *= rotate2d(0.45);
        p *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

void fragment() {
    vec2 resolution = 1.0 / SCREEN_PIXEL_SIZE;
    vec2 uv = SCREEN_UV;

    uv = 2.0 * uv - 1.0;
    uv.x *= resolution.x / resolution.y;
    uv.x += u_x_offset;

    uv += 2.0 * fbm(uv * u_size + 0.8 * TIME * u_speed) - 1.0;

    float dist = max(abs(uv.x), 0.001);
    vec3 base_color = hsv2rgb(vec3(u_hue / 360.0, 0.7, 0.8));
    vec3 col = base_color * pow(mix(0.0, 0.07, hash11(TIME * u_speed)) / dist, 1.0) * u_intensity;

    COLOR = vec4(col, 1.0);
}
