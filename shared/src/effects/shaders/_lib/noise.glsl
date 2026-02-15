// ============================================================================
// Noise functions - hash and pseudo-random generation
// Used by: dissolve, ripple, holographic, speedLines, oldFilm, nightVision, glitch
// ============================================================================

// Hash function for 2D input - returns pseudo-random float in [0, 1]
float hash(vec2 p) {
	return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Hash function for 1D input - returns pseudo-random float in [0, 1]
float hash(float x) {
	return fract(sin(x * 12.9898) * 43758.5453);
}

// Simple 2D random - wrapper for hash(vec2)
float random(vec2 st) {
	return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Simple 1D random - wrapper for hash(float)
float random(float x) {
	return fract(sin(x * 12.9898) * 43758.5453);
}

// 2D Perlin-like noise - bilinear interpolation of hash values
float noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	
	// Smoothstep curve for interpolation
	f = f * f * (3.0 - 2.0 * f);
	
	// Get hash values at four corners
	float a = hash(i);
	float b = hash(i + vec2(1.0, 0.0));
	float c = hash(i + vec2(0.0, 1.0));
	float d = hash(i + vec2(1.0, 1.0));
	
	// Bilinear interpolation
	return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
