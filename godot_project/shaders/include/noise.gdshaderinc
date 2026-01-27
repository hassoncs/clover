// Noise utility functions for Godot shaders
// Cross-platform compatible (WebGL 2.0, OpenGL ES 3.0)

// Simple hash function
float hash(vec2 p) {
	return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

// 2D hash
vec2 hash2(vec2 p) {
	return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}

// Value noise
float value_noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f); // Smoothstep
	
	float a = hash(i);
	float b = hash(i + vec2(1.0, 0.0));
	float c = hash(i + vec2(0.0, 1.0));
	float d = hash(i + vec2(1.0, 1.0));
	
	return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Fractal Brownian Motion (multiple octaves of noise)
float fbm(vec2 p, int octaves) {
	float value = 0.0;
	float amplitude = 0.5;
	float frequency = 1.0;
	
	for (int i = 0; i < octaves; i++) {
		value += amplitude * value_noise(p * frequency);
		frequency *= 2.0;
		amplitude *= 0.5;
	}
	
	return value;
}

// Simplex-like gradient noise (faster approximation)
float gradient_noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	
	vec2 u = f * f * (3.0 - 2.0 * f);
	
	return mix(
		mix(dot(hash2(i + vec2(0.0, 0.0)) * 2.0 - 1.0, f - vec2(0.0, 0.0)),
			dot(hash2(i + vec2(1.0, 0.0)) * 2.0 - 1.0, f - vec2(1.0, 0.0)), u.x),
		mix(dot(hash2(i + vec2(0.0, 1.0)) * 2.0 - 1.0, f - vec2(0.0, 1.0)),
			dot(hash2(i + vec2(1.0, 1.0)) * 2.0 - 1.0, f - vec2(1.0, 1.0)), u.x),
		u.y
	) * 0.5 + 0.5;
}

// Voronoi / cellular noise
float voronoi(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	
	float min_dist = 1.0;
	
	for (int y = -1; y <= 1; y++) {
		for (int x = -1; x <= 1; x++) {
			vec2 neighbor = vec2(float(x), float(y));
			vec2 point = hash2(i + neighbor);
			vec2 diff = neighbor + point - f;
			float dist = length(diff);
			min_dist = min(min_dist, dist);
		}
	}
	
	return min_dist;
}

// Worley noise (cellular, returns distance to closest point)
vec2 worley(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	
	float dist1 = 1.0;
	float dist2 = 1.0;
	
	for (int y = -1; y <= 1; y++) {
		for (int x = -1; x <= 1; x++) {
			vec2 neighbor = vec2(float(x), float(y));
			vec2 point = hash2(i + neighbor);
			float dist = length(neighbor + point - f);
			
			if (dist < dist1) {
				dist2 = dist1;
				dist1 = dist;
			} else if (dist < dist2) {
				dist2 = dist;
			}
		}
	}
	
	return vec2(dist1, dist2);
}

// Turbulence (absolute value FBM for fire/smoke effects)
float turbulence(vec2 p, int octaves) {
	float value = 0.0;
	float amplitude = 0.5;
	float frequency = 1.0;
	
	for (int i = 0; i < octaves; i++) {
		value += amplitude * abs(gradient_noise(p * frequency) * 2.0 - 1.0);
		frequency *= 2.0;
		amplitude *= 0.5;
	}
	
	return value;
}

// Ridged noise (inverted turbulence for lightning/cracks)
float ridged_noise(vec2 p, int octaves) {
	float value = 0.0;
	float amplitude = 0.5;
	float frequency = 1.0;
	float prev = 1.0;
	
	for (int i = 0; i < octaves; i++) {
		float n = 1.0 - abs(gradient_noise(p * frequency) * 2.0 - 1.0);
		n = n * n;
		value += n * amplitude * prev;
		prev = n;
		frequency *= 2.0;
		amplitude *= 0.5;
	}
	
	return value;
}
