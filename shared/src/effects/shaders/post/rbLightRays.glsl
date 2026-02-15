shader_type canvas_item;

uniform vec3 u_rays_color : source_color = vec3(1.0, 1.0, 1.0);
uniform float u_rays_speed : hint_range(0.0, 5.0) = 1.0;
uniform float u_light_spread : hint_range(0.05, 3.0) = 1.0;
uniform float u_ray_length : hint_range(0.1, 4.0) = 2.0;
uniform float u_fade_distance : hint_range(0.1, 3.0) = 1.0;
uniform float u_noise_amount : hint_range(0.0, 1.0) = 0.0;
uniform float u_distortion : hint_range(0.0, 2.0) = 0.0;

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float ray_strength(vec2 source, vec2 dir_ref, vec2 coord, float seed_a, float seed_b) {
    vec2 to_coord = coord - source;
    float dist = length(to_coord);
    vec2 dir_norm = to_coord / max(dist, 0.0001);

    float c = dot(dir_norm, normalize(dir_ref));
    float warped = c + u_distortion * sin(TIME * 2.0 + dist * 7.0) * 0.2;
    float spread = pow(max(warped, 0.0), 1.0 / max(u_light_spread, 0.001));

    float len_falloff = clamp((u_ray_length - dist) / max(u_ray_length, 0.001), 0.0, 1.0);
    float fade = clamp((u_fade_distance - dist) / max(u_fade_distance, 0.001), 0.0, 1.0);

    float pulse = 0.85 + 0.15 * sin(TIME * u_rays_speed * 3.0);
    float base = clamp(
        (0.45 + 0.15 * sin(warped * seed_a + TIME * u_rays_speed)) +
        (0.3 + 0.2 * cos(-warped * seed_b + TIME * u_rays_speed)),
        0.0,
        1.0
    );

    return base * len_falloff * fade * spread * pulse;
}

void fragment() {
    vec2 uv = SCREEN_UV;
    vec2 source = vec2(0.5, -0.2);
    vec2 dir = vec2(0.0, 1.0);
    vec2 coord = uv;

    vec3 rays = vec3(0.0);
    rays += ray_strength(source, dir, coord, 36.2214, 21.11349) * 0.5;
    rays += ray_strength(source, dir, coord, 22.3991, 18.0234) * 0.4;

    float brightness = 1.0 - uv.y;
    vec3 col = rays * vec3(0.1 + brightness * 0.8, 0.3 + brightness * 0.6, 0.5 + brightness * 0.5);
    col *= u_rays_color;

    if (u_noise_amount > 0.0001) {
        float n = hash12(FRAGCOORD.xy * 0.01 + vec2(TIME * 0.1));
        col *= 1.0 - u_noise_amount + u_noise_amount * n;
    }

    COLOR = vec4(clamp(col, 0.0, 1.0), 1.0);
}
