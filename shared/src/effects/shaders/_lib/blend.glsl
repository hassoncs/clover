// ============================================================================
// Blend mode functions - common compositing operations
// Used by: compositing and color mixing shaders
// ============================================================================

// Blend mode functions - each takes base and blend colors, returns result
vec3 blendMultiply(vec3 base, vec3 blend) {
	return base * blend;
}

vec3 blendScreen(vec3 base, vec3 blend) {
	return 1.0 - (1.0 - base) * (1.0 - blend);
}

vec3 blendOverlay(vec3 base, vec3 blend) {
	return mix(
		2.0 * base * blend,
		1.0 - 2.0 * (1.0 - base) * (1.0 - blend),
		step(0.5, base)
	);
}

vec3 blendSoftLight(vec3 base, vec3 blend) {
	return mix(
		2.0 * base * blend + base * base * (1.0 - 2.0 * blend),
		sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend),
		step(0.5, blend)
	);
}

vec3 blendHardLight(vec3 base, vec3 blend) {
	return blendOverlay(blend, base);
}

vec3 blendDodge(vec3 base, vec3 blend) {
	return min(base / max(1.0 - blend, 0.001), vec3(1.0));
}

vec3 blendBurn(vec3 base, vec3 blend) {
	return 1.0 - min((1.0 - base) / max(blend, 0.001), vec3(1.0));
}

vec3 blendDifference(vec3 base, vec3 blend) {
	return abs(base - blend);
}

vec3 blendExclusion(vec3 base, vec3 blend) {
	return base + blend - 2.0 * base * blend;
}

vec3 blendAdd(vec3 base, vec3 blend) {
	return min(base + blend, vec3(1.0));
}

vec3 blendSubtract(vec3 base, vec3 blend) {
	return max(base - blend, vec3(0.0));
}

vec3 blendLinearLight(vec3 base, vec3 blend) {
	return clamp(base + 2.0 * blend - 1.0, vec3(0.0), vec3(1.0));
}
