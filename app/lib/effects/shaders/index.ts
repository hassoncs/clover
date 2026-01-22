export const GLOW_SHADER = `
uniform vec2 iResolution;
uniform float iTime;
uniform vec3 glowColor;
uniform float radius;
uniform float intensity;
uniform float pulse;
uniform float pulseSpeed;

vec4 main(vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution;
  vec2 center = vec2(0.5, 0.5);
  float dist = length(uv - center);
  
  float normalizedRadius = radius / min(iResolution.x, iResolution.y);
  float glowFalloff = 1.0 - smoothstep(0.0, normalizedRadius * 2.0, dist);
  
  float pulseMultiplier = 1.0;
  if (pulse > 0.5) {
    pulseMultiplier = 0.7 + 0.3 * sin(iTime * pulseSpeed * 3.14159);
  }
  
  float alpha = glowFalloff * intensity * pulseMultiplier;
  return vec4(glowColor, alpha);
}
`;

export const OUTLINE_SHADER = `
uniform shader image;
uniform vec2 iResolution;
uniform vec3 outlineColor;
uniform float width;

half4 main(vec2 fragCoord) {
  half4 color = image.eval(fragCoord);
  
  float alpha = color.a;
  float maxAlpha = 0.0;
  
  for (float x = -5.0; x <= 5.0; x += 1.0) {
    if (abs(x) > width) continue;
    for (float y = -5.0; y <= 5.0; y += 1.0) {
      if (abs(y) > width) continue;
      if (x == 0.0 && y == 0.0) continue;
      vec2 offset = vec2(x, y);
      half4 neighbor = image.eval(fragCoord + offset);
      maxAlpha = max(maxAlpha, neighbor.a);
    }
  }
  
  float outline = maxAlpha * (1.0 - alpha);
  if (outline > 0.0) {
    return half4(outlineColor, outline);
  }
  return color;
}
`;

export const PIXELATE_SHADER = `
uniform shader image;
uniform vec2 iResolution;
uniform float pixelSize;

half4 main(vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution;
  vec2 pixelUV = floor(uv * iResolution / pixelSize) * pixelSize;
  return image.eval(pixelUV + pixelSize * 0.5);
}
`;

export const DISSOLVE_SHADER = `
uniform shader image;
uniform vec2 iResolution;
uniform float progress;
uniform float noiseScale;
uniform float edgeWidth;
uniform vec3 edgeColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

half4 main(vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution;
  half4 color = image.eval(fragCoord);
  
  float n = noise(uv * noiseScale);
  float threshold = progress;
  
  if (n < threshold - edgeWidth) {
    return half4(0.0, 0.0, 0.0, 0.0);
  } else if (n < threshold) {
    float edgeFactor = (threshold - n) / edgeWidth;
    return half4(edgeColor * (1.0 + edgeFactor), color.a);
  }
  return color;
}
`;

export const WAVE_DISTORTION_SHADER = `
uniform shader image;
uniform vec2 iResolution;
uniform float iTime;
uniform float amplitude;
uniform float frequency;
uniform float speed;
uniform float direction;

half4 main(vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution;
  
  float waveX = 0.0;
  float waveY = 0.0;
  
  if (direction < 0.5 || direction > 1.5) {
    waveX = sin(uv.y * frequency + iTime * speed) * amplitude;
  }
  if (direction > 0.5) {
    waveY = sin(uv.x * frequency + iTime * speed) * amplitude;
  }
  
  vec2 distortedUV = uv + vec2(waveX, waveY);
  distortedUV = clamp(distortedUV, vec2(0.0), vec2(1.0));
  
  return image.eval(distortedUV * iResolution);
}
`;

export const CHROMATIC_ABERRATION_SHADER = `
uniform shader image;
uniform vec2 iResolution;
uniform float iTime;
uniform float offsetX;
uniform float offsetY;
uniform float animated;
uniform float intensity;

half4 main(vec2 fragCoord) {
  vec2 offset = vec2(offsetX, offsetY) * intensity;
  
  if (animated > 0.5) {
    offset += vec2(
      sin(iTime * 10.0) * 2.0,
      cos(iTime * 8.0) * 2.0
    ) * intensity;
  }
  
  half4 r = image.eval(fragCoord + vec2(offset.x, offset.y));
  half4 g = image.eval(fragCoord);
  half4 b = image.eval(fragCoord - vec2(offset.x, offset.y));
  
  return half4(r.r, g.g, b.b, max(max(r.a, g.a), b.a));
}
`;

export const HOLOGRAPHIC_SHADER = `
uniform vec2 iResolution;
uniform float iTime;
uniform float speed;
uniform float saturation;
uniform float scanlines;
uniform float scanlineSpacing;

vec4 main(vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution;
  
  float angle = atan(uv.y - 0.5, uv.x - 0.5);
  float rainbow = angle / 3.14159 * 0.5 + 0.5;
  rainbow += iTime * speed;
  
  vec3 holo;
  holo.r = sin(rainbow * 6.28) * 0.5 + 0.5;
  holo.g = sin(rainbow * 6.28 + 2.09) * 0.5 + 0.5;
  holo.b = sin(rainbow * 6.28 + 4.18) * 0.5 + 0.5;
  
  holo = mix(vec3(0.5), holo, saturation);
  
  float scanlineEffect = 1.0;
  if (scanlines > 0.5) {
    scanlineEffect = 0.9 + 0.1 * sin(fragCoord.y / scanlineSpacing * 3.14159);
  }
  
  float alpha = 0.3 + sin(iTime * 2.0) * 0.1;
  
  return vec4(holo * scanlineEffect, alpha);
}
`;

export const VIGNETTE_SHADER = `
uniform vec2 iResolution;
uniform float intensity;
uniform float radius;
uniform float softness;
uniform vec3 vignetteColor;

vec4 main(vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution;
  vec2 center = uv - vec2(0.5);
  float dist = length(center) * 2.0;
  
  float vignette = smoothstep(radius, radius - softness, dist);
  float alpha = (1.0 - vignette) * intensity;
  
  return vec4(vignetteColor, alpha);
}
`;

export const SCANLINES_SHADER = `
uniform vec2 iResolution;
uniform float iTime;
uniform float spacing;
uniform float thickness;
uniform float animated;
uniform float speed;

vec4 main(vec2 fragCoord) {
  float y = fragCoord.y;
  
  if (animated > 0.5) {
    y += iTime * speed;
  }
  
  float line = mod(y, spacing);
  float alpha = line < thickness ? 0.2 : 0.0;
  
  return vec4(0.0, 0.0, 0.0, alpha);
}
`;

export const POSTERIZE_SHADER = `
uniform shader image;
uniform vec2 iResolution;
uniform float levels;
uniform float gamma;

half4 main(vec2 fragCoord) {
  half4 color = image.eval(fragCoord);
  
  vec3 c = pow(color.rgb, vec3(gamma));
  c = floor(c * levels) / (levels - 1.0);
  c = pow(c, vec3(1.0 / gamma));
  
  return half4(c, color.a);
}
`;

export const SHOCKWAVE_SHADER = `
uniform shader image;
uniform vec2 iResolution;
uniform vec2 center;
uniform float radius;
uniform float thickness;
uniform float strength;

half4 main(vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution;
  
  float dist = length(uv - center);
  float diff = abs(dist - radius);
  
  if (diff < thickness) {
    float factor = 1.0 - diff / thickness;
    vec2 direction = normalize(uv - center);
    vec2 offset = direction * strength * factor;
    return image.eval((uv + offset) * iResolution);
  }
  
  return image.eval(fragCoord);
}
`;
