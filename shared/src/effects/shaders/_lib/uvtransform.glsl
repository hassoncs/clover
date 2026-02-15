// ============================================================================
// UV transform utilities - rotation, scaling, tiling, polar transforms
// Used by: distortion, generator, and compositing shaders
// ============================================================================

const float UV_PI = 3.14159265359;
const float UV_TAU = 6.28318530718;

vec2 uvRotate(vec2 uv, float angle, vec2 center) {
	vec2 p = uv - center;
	float s = sin(angle);
	float c = cos(angle);
	return vec2(p.x * c - p.y * s, p.x * s + p.y * c) + center;
}

vec2 uvScale(vec2 uv, vec2 scale, vec2 center) {
	vec2 safe_scale = max(scale, vec2(0.0001));
	return (uv - center) / safe_scale + center;
}

vec2 uvTranslate(vec2 uv, vec2 offset) {
	return uv + offset;
}

vec2 uvTile(vec2 uv, vec2 tileCount) {
	return fract(uv * tileCount);
}

float mirrorCoord(float v) {
	float m = mod(v, 2.0);
	return (m <= 1.0) ? m : 2.0 - m;
}

vec2 uvMirror(vec2 uv, bool mirrorX, bool mirrorY) {
	vec2 out_uv = uv;
	if (mirrorX) {
		out_uv.x = mirrorCoord(out_uv.x);
	}
	if (mirrorY) {
		out_uv.y = mirrorCoord(out_uv.y);
	}
	return out_uv;
}

vec2 uvPolar(vec2 uv, vec2 center) {
	vec2 p = uv - center;
	float radius = length(p);
	float angle = atan(p.y, p.x) / UV_TAU + 0.5;
	return vec2(angle, radius);
}

vec2 uvKaleidoscope(vec2 uv, float segments, vec2 center) {
	vec2 p = uv - center;
	float r = length(p);
	float seg = UV_TAU / max(segments, 1.0);
	float angle = atan(p.y, p.x);
	angle = mod(angle, seg);
	angle = abs(angle - seg * 0.5);
	return center + vec2(cos(angle), sin(angle)) * r;
}

vec2 uvBarrelDistort(vec2 uv, float strength, vec2 center) {
	vec2 p = uv - center;
	float r2 = dot(p, p);
	return center + p * (1.0 + strength * r2);
}
