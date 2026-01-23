// Color utility functions for Godot shaders
// Cross-platform compatible (WebGL 2.0, OpenGL ES 3.0)

// RGB to HSV conversion
vec3 rgb_to_hsv(vec3 c) {
	vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
	vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
	vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
	
	float d = q.x - min(q.w, q.y);
	float e = 1.0e-10;
	return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

// HSV to RGB conversion
vec3 hsv_to_rgb(vec3 c) {
	vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
	vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
	return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// RGB to HSL conversion
vec3 rgb_to_hsl(vec3 c) {
	float maxc = max(c.r, max(c.g, c.b));
	float minc = min(c.r, min(c.g, c.b));
	float l = (maxc + minc) / 2.0;
	
	if (maxc == minc) {
		return vec3(0.0, 0.0, l);
	}
	
	float d = maxc - minc;
	float s = l > 0.5 ? d / (2.0 - maxc - minc) : d / (maxc + minc);
	
	float h;
	if (maxc == c.r) {
		h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
	} else if (maxc == c.g) {
		h = (c.b - c.r) / d + 2.0;
	} else {
		h = (c.r - c.g) / d + 4.0;
	}
	h /= 6.0;
	
	return vec3(h, s, l);
}

// Helper for HSL to RGB
float hue_to_rgb(float p, float q, float t) {
	if (t < 0.0) t += 1.0;
	if (t > 1.0) t -= 1.0;
	if (t < 1.0 / 6.0) return p + (q - p) * 6.0 * t;
	if (t < 1.0 / 2.0) return q;
	if (t < 2.0 / 3.0) return p + (q - p) * (2.0 / 3.0 - t) * 6.0;
	return p;
}

// HSL to RGB conversion
vec3 hsl_to_rgb(vec3 c) {
	if (c.y == 0.0) {
		return vec3(c.z);
	}
	
	float q = c.z < 0.5 ? c.z * (1.0 + c.y) : c.z + c.y - c.z * c.y;
	float p = 2.0 * c.z - q;
	
	return vec3(
		hue_to_rgb(p, q, c.x + 1.0 / 3.0),
		hue_to_rgb(p, q, c.x),
		hue_to_rgb(p, q, c.x - 1.0 / 3.0)
	);
}

// Luminance calculation (perceived brightness)
float luminance(vec3 c) {
	return dot(c, vec3(0.299, 0.587, 0.114));
}

// Linear luminance (more physically accurate)
float linear_luminance(vec3 c) {
	return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

// Desaturate (grayscale)
vec3 desaturate(vec3 c) {
	float gray = luminance(c);
	return vec3(gray);
}

// Adjust saturation
vec3 adjust_saturation(vec3 c, float amount) {
	float gray = luminance(c);
	return mix(vec3(gray), c, amount);
}

// Adjust contrast
vec3 adjust_contrast(vec3 c, float amount) {
	return (c - 0.5) * amount + 0.5;
}

// Adjust brightness
vec3 adjust_brightness(vec3 c, float amount) {
	return c + vec3(amount);
}

// Gamma correction
vec3 gamma_correct(vec3 c, float gamma) {
	return pow(c, vec3(1.0 / gamma));
}

// Inverse gamma (linear to sRGB)
vec3 gamma_inverse(vec3 c, float gamma) {
	return pow(c, vec3(gamma));
}

// Color temperature adjustment (Kelvin approximation)
vec3 color_temperature(vec3 c, float temp) {
	// temp: -1.0 (cool/blue) to 1.0 (warm/orange)
	vec3 warm = vec3(1.0, 0.9, 0.7);
	vec3 cool = vec3(0.7, 0.9, 1.0);
	vec3 tint = mix(cool, warm, temp * 0.5 + 0.5);
	return c * tint;
}

// Posterize (reduce color levels)
vec3 posterize(vec3 c, float levels) {
	return floor(c * levels) / levels;
}

// Sepia tone
vec3 sepia(vec3 c) {
	return vec3(
		dot(c, vec3(0.393, 0.769, 0.189)),
		dot(c, vec3(0.349, 0.686, 0.168)),
		dot(c, vec3(0.272, 0.534, 0.131))
	);
}

// Invert colors
vec3 invert(vec3 c) {
	return 1.0 - c;
}

// Blend modes
vec3 blend_multiply(vec3 base, vec3 blend) {
	return base * blend;
}

vec3 blend_screen(vec3 base, vec3 blend) {
	return 1.0 - (1.0 - base) * (1.0 - blend);
}

vec3 blend_overlay(vec3 base, vec3 blend) {
	return mix(
		2.0 * base * blend,
		1.0 - 2.0 * (1.0 - base) * (1.0 - blend),
		step(0.5, base)
	);
}

vec3 blend_soft_light(vec3 base, vec3 blend) {
	return mix(
		2.0 * base * blend + base * base * (1.0 - 2.0 * blend),
		sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend),
		step(0.5, blend)
	);
}

vec3 blend_hard_light(vec3 base, vec3 blend) {
	return blend_overlay(blend, base);
}

vec3 blend_color_dodge(vec3 base, vec3 blend) {
	return base / (1.0 - blend + 0.001);
}

vec3 blend_color_burn(vec3 base, vec3 blend) {
	return 1.0 - (1.0 - base) / (blend + 0.001);
}

// Color matrix transformation (4x4 matrix for RGBA)
vec4 apply_color_matrix(vec4 c, mat4 m) {
	return m * c;
}

// Hue rotation
vec3 rotate_hue(vec3 c, float angle) {
	vec3 hsv = rgb_to_hsv(c);
	hsv.x = fract(hsv.x + angle);
	return hsv_to_rgb(hsv);
}

// Vibrance (smart saturation that avoids oversaturation)
vec3 vibrance(vec3 c, float amount) {
	float mx = max(c.r, max(c.g, c.b));
	float mn = min(c.r, min(c.g, c.b));
	float sat = mx - mn;
	float amt = (1.0 - sat) * amount;
	return mix(vec3(luminance(c)), c, 1.0 + amt);
}

// Color lookup (1D gradient)
vec3 color_ramp(float t, vec3 c1, vec3 c2, vec3 c3) {
	if (t < 0.5) {
		return mix(c1, c2, t * 2.0);
	} else {
		return mix(c2, c3, (t - 0.5) * 2.0);
	}
}
