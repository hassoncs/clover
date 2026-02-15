// ============================================================================
// Common math utilities - luminance, color conversion, geometry helpers
// ============================================================================

// Calculate luminance (perceived brightness) from RGB
float luminance(vec3 c) {
	return dot(c, vec3(0.299, 0.587, 0.114));
}

// Grayscale conversion (alias for luminance)
float grayscale(vec3 c) {
	return luminance(c);
}

// ============================================================================
// HSV/RGB Color Space Conversion
// Used by: rainbow
// ============================================================================

vec3 rgb_to_hsv(vec3 c) {
	vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
	vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
	vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
	float d = q.x - min(q.w, q.y);
	float e = 1.0e-10;
	return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv_to_rgb(vec3 c) {
	vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
	vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
	return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// ============================================================================
// 2D Geometry Helpers
// ============================================================================

// Rotate 2D point by angle (in degrees)
vec2 rotate2D(vec2 uv, float angle_degrees) {
	float angle = radians(angle_degrees);
	float s = sin(angle);
	float c = cos(angle);
	return vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
}

// Signed Distance Functions for shapes
// Used by: ascii

float sdCircle(vec2 p, float r) {
	return length(p) - r;
}

float sdBox(vec2 p, vec2 b) {
	vec2 d = abs(p) - b;
	return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

float sdCross(vec2 p, vec2 b, float r) {
	p = abs(p);
	p = (p.y > p.x) ? p.yx : p.xy;
	vec2 q = p - b;
	float k = max(q.y, q.x);
	vec2 w = (k > 0.0) ? q : vec2(b.y - p.x, -k);
	return sign(k) * length(max(w, 0.0)) + r;
}

// ============================================================================
// Dithering
// Used by: pixelateScreen
// ============================================================================

// 4x4 Bayer dithering matrix
float ditherMatrix(vec2 pos) {
	int x = int(mod(pos.x, 4.0));
	int y = int(mod(pos.y, 4.0));
	int index = x + y * 4;
	
	float matrix[16] = float[16](
		0.0, 8.0, 2.0, 10.0,
		12.0, 4.0, 14.0, 6.0,
		3.0, 11.0, 1.0, 9.0,
		15.0, 7.0, 13.0, 5.0
	);
	
	return matrix[index] / 16.0;
}
