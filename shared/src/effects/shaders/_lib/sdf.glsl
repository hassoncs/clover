// ============================================================================
// Signed distance functions (SDF) for procedural geometry generation
// Used by: generator shaders and shape masks
// ============================================================================

const float SDF_PI = 3.14159265359;

// Circle SDF (duplicated for local shape library convenience)
float sdCircle(vec2 p, float r) {
	return length(p) - r;
}

// Rounded rectangle SDF with per-corner radii
// r order: top-right, top-left, bottom-left, bottom-right
float sdRoundedBox(vec2 p, vec2 b, vec4 r) {
	vec4 rr = r;
	rr.xy = (p.x > 0.0) ? rr.xy : rr.wz;
	rr.x = (p.y > 0.0) ? rr.x : rr.y;
	vec2 q = abs(p) - b + rr.x;
	return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - rr.x;
}

// Ring SDF: negative in the annulus between innerR and outerR
float sdRing(vec2 p, float outerR, float innerR) {
	float outer = length(p) - outerR;
	float inner = innerR - length(p);
	return max(outer, inner);
}

// N-point star SDF
float sdStar(vec2 p, float r, int n, float m) {
	float points = max(float(n), 2.0);
	float m_safe = max(m, 2.01);
	float an = SDF_PI / points;
	float en = SDF_PI / m_safe;
	vec2 acs = vec2(cos(an), sin(an));
	vec2 ecs = vec2(cos(en), sin(en));
	float bn = mod(atan(p.y, p.x), 2.0 * an) - an;
	p = length(p) * vec2(cos(bn), abs(sin(bn)));
	p -= r * acs;
	p += ecs * clamp(-dot(p, ecs), 0.0, r * acs.y / max(ecs.y, 0.001));
	return length(p) * sign(p.x);
}

// Regular hexagon SDF
float sdHexagon(vec2 p, float r) {
	const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
	p = abs(p);
	p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
	p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
	return length(p) * sign(p.y);
}

// Equilateral triangle SDF
float sdTriangle(vec2 p, float r) {
	const float k = 1.732050808;
	p.x = abs(p.x) - r;
	p.y = p.y + r / k;
	if (p.x + k * p.y > 0.0) {
		p = vec2(p.x - k * p.y, -k * p.x - p.y) * 0.5;
	}
	p.x -= clamp(p.x, -2.0 * r, 0.0);
	return -length(p) * sign(p.y);
}

// Signed-distance edge smoothing helper
float smoothEdge(float d, float smoothness) {
	float s = max(smoothness, 0.0001);
	return 1.0 - smoothstep(-s, s, d);
}
