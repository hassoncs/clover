shader_type canvas_item;

uniform float u_time_speed : hint_range(0.0, 3.0) = 0.25;
uniform float u_warp_strength : hint_range(0.0, 3.0) = 1.0;
uniform float u_warp_frequency : hint_range(0.1, 20.0) = 5.0;
uniform float u_grain_amount : hint_range(0.0, 1.0) = 0.1;
uniform float u_contrast : hint_range(0.1, 4.0) = 1.5;
uniform float u_saturation : hint_range(0.0, 2.0) = 1.0;
uniform vec3 u_color1 : source_color = vec3(1.0, 0.6235, 0.9882);
uniform vec3 u_color2 : source_color = vec3(0.3216, 0.1529, 1.0);
uniform vec3 u_color3 : source_color = vec3(0.6941, 0.6196, 0.9373);

vec2 hash(vec2 p) {
    p = vec2(dot(p, vec2(2127.1, 81.17)), dot(p, vec2(1269.5, 283.37)));
    return fract(sin(p) * 43758.5453);
}

float noise_fn(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float n = mix(
        mix(dot(-1.0 + 2.0 * hash(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)), dot(-1.0 + 2.0 * hash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
        mix(dot(-1.0 + 2.0 * hash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)), dot(-1.0 + 2.0 * hash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
        u.y
    );
    return 0.5 + 0.5 * n;
}

mat2 rot(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
}

void fragment() {
    vec2 uv = SCREEN_UV;
    vec2 centered = uv - 0.5;
    float t = TIME * u_time_speed;

    float degree = noise_fn(vec2(t * 0.1, centered.x * centered.y) * 2.0);
    centered *= rot(radians((degree - 0.5) * 500.0 + 180.0));

    float ws = max(u_warp_strength, 0.001);
    float amplitude = 50.0 / ws;
    centered.x += sin(centered.y * u_warp_frequency + t * 2.0) / amplitude;
    centered.y += sin(centered.x * (u_warp_frequency * 1.5) + t * 2.0) / (amplitude * 0.5);

    float edge0 = -0.35;
    float edge1 = 0.25;
    vec3 layer1 = mix(u_color3, u_color2, smoothstep(edge0, edge1, centered.x));
    vec3 layer2 = mix(u_color2, u_color1, smoothstep(edge0, edge1, centered.x));
    vec3 col = mix(layer1, layer2, smoothstep(0.5, -0.35, centered.y));

    float grain = fract(sin(dot(uv * 2.0 + vec2(TIME * 0.05), vec2(12.9898, 78.233))) * 43758.5453);
    col += (grain - 0.5) * u_grain_amount;

    col = (col - 0.5) * u_contrast + 0.5;
    float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(vec3(luma), col, u_saturation);
    col = clamp(col, 0.0, 1.0);

    COLOR = vec4(col, 1.0);
}
