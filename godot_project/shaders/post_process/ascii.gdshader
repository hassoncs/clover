shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_nearest;
uniform float pixel_size : hint_range(4.0, 32.0) = 8.0;
uniform bool monochrome : hint_range(0, 1) = 0; // Use int/bool hint
uniform vec4 color : source_color = vec4(0.0, 1.0, 0.0, 1.0);

// Simple Signed Distance Functions for shapes
float sdCircle(vec2 p, float r) {
    return length(p) - r;
}

float sdBox(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

float sdCross(vec2 p, vec2 b, float r) {
    p = abs(p); p = (p.y > p.x) ? p.yx : p.xy;
    vec2  q = p - b;
    float k = max(q.y, q.x);
    vec2  w = (k > 0.0) ? q : vec2(b.y - p.x, -k);
    return sign(k) * length(max(w, 0.0)) + r;
}

void fragment() {
    // Quantize UV to grid
    vec2 resolution = 1.0 / SCREEN_PIXEL_SIZE;
    vec2 grid_uv = floor(SCREEN_UV * resolution / pixel_size) * pixel_size / resolution;
    
    // Sample luminance at grid center
    vec3 tex = texture(SCREEN_TEXTURE, grid_uv).rgb;
    float lum = dot(tex, vec3(0.299, 0.587, 0.114));
    
    // Get local UV within the cell (-0.5 to 0.5)
    vec2 cell_uv = fract(SCREEN_UV * resolution / pixel_size) - 0.5;
    
    // Determine shape based on luminance
    float dist = 1.0;
    
    if (lum > 0.8) {
        // Full block (Box)
        dist = sdBox(cell_uv, vec2(0.4));
    } else if (lum > 0.6) {
        // Hash / Cross
        dist = sdCross(cell_uv, vec2(0.4, 0.1), 0.0);
        float dist2 = sdCross(cell_uv, vec2(0.1, 0.4), 0.0); // Create plus
        dist = min(dist, dist2);
    } else if (lum > 0.4) {
        // Colon / Two dots
        dist = min(sdCircle(cell_uv - vec2(0.0, 0.2), 0.08), 
                  sdCircle(cell_uv + vec2(0.0, 0.2), 0.08));
    } else if (lum > 0.2) {
        // Single Dot
        dist = sdCircle(cell_uv, 0.08);
    } else {
        // Empty
        dist = 1.0; 
    }
    
    // Render shape (AA)
    float shape = 1.0 - smoothstep(-0.05, 0.05, dist);
    
    vec3 out_color = tex;
    if (monochrome) {
        out_color = color.rgb * shape * lum * 2.0; // Boost brightness
    } else {
        out_color = tex * shape;
    }
    
    COLOR = vec4(out_color, 1.0);
}
