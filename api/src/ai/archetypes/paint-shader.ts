import type { GameDefinition } from '@slopcade/shared/types/GameDefinition';

export interface ShaderArchetype {
  name: string;
  description: string;
  referenceDefinition: Partial<GameDefinition>;
  exampleShaders: Record<string, { filename: string; glsl: string }>;
  promptContext: string;
}

export const paintShaderArchetype: ShaderArchetype = {
  name: 'paint-shader',
  description: 'Interactive paint/drawing games where users paint on a canvas using touch/drag input with custom shaders',
  
  referenceDefinition: {
    world: {
      gravity: { x: 0, y: 0 },
      pixelsPerMeter: 50,
      bounds: { width: 12, height: 16 },
    },
    background: { type: 'static', color: '#ffffff' },
    camera: { type: 'fixed', zoom: 1 },
    prefabs: {
      canvas: {
        id: 'canvas',
        tags: ['canvas'],
        visual: {
          type: 'rect',
          width: 10,
          height: 14,
          color: '#ffffff',
        },
        physics: { bodyType: 'static', density: 0 },
      },
    },
    entities: [
      {
        id: 'canvas1',
        name: 'Canvas',
        prefab: 'canvas',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      },
    ],
    input: {
      tapZones: [],
      tilt: { enabled: false },
      virtualButtons: [],
    },
  },

  exampleShaders: {
    basicPaint: {
      filename: 'basic_paint.gdshader',
      glsl: `shader_type canvas_item;

// Brush parameters
uniform float brush_size : hint_range(0.01, 0.1) = 0.05;
uniform vec4 brush_color : source_color = vec4(1.0, 0.0, 0.0, 1.0);
uniform float brush_hardness : hint_range(0.0, 1.0) = 0.8;

// Touch position (normalized 0-1)
uniform vec2 touch_pos = vec2(-1.0, -1.0);
uniform bool is_touching = false;

// Canvas texture (previous frame)
uniform sampler2D canvas_texture : filter_linear;

void fragment() {
\tvec4 current_color = texture(canvas_texture, UV);
\t
\tif (is_touching && touch_pos.x >= 0.0) {
\t\t// Calculate distance from touch point
\t\tfloat dist = distance(UV, touch_pos);
\t\t
\t\t// Create soft brush with falloff
\t\tfloat brush_alpha = 1.0 - smoothstep(
\t\t\tbrush_size * brush_hardness,
\t\t\tbrush_size,
\t\t\tdist
\t\t);
\t\t
\t\t// Blend brush color with existing canvas
\t\tvec3 blended = mix(current_color.rgb, brush_color.rgb, brush_alpha * brush_color.a);
\t\tfloat alpha = max(current_color.a, brush_alpha * brush_color.a);
\t\t
\t\tCOLOR = vec4(blended, alpha);
\t} else {
\t\t// No touch, preserve canvas
\t\tCOLOR = current_color;
\t}
}`,
    },
    
    rippleEffect: {
      filename: 'ripple_effect.gdshader',
      glsl: `shader_type canvas_item;

// Ripple parameters
uniform vec2 ripple_center = vec2(0.5, 0.5);
uniform float ripple_time : hint_range(0.0, 10.0) = 0.0;
uniform float ripple_speed : hint_range(0.5, 5.0) = 2.0;
uniform float ripple_amplitude : hint_range(0.0, 0.1) = 0.03;
uniform float ripple_frequency : hint_range(1.0, 20.0) = 10.0;
uniform bool ripple_active = false;

// Canvas texture
uniform sampler2D canvas_texture : filter_linear;

void fragment() {
\tvec2 uv = UV;
\t
\tif (ripple_active && ripple_time > 0.0) {
\t\t// Calculate distance from ripple center
\t\tfloat dist = distance(UV, ripple_center);
\t\t
\t\t// Calculate ripple wave
\t\tfloat wave = sin(dist * ripple_frequency - ripple_time * ripple_speed);
\t\t
\t\t// Fade out over time and distance
\t\tfloat fade = exp(-ripple_time * 0.5) * exp(-dist * 2.0);
\t\t
\t\t// Apply distortion
\t\tvec2 direction = normalize(UV - ripple_center);
\t\tuv += direction * wave * ripple_amplitude * fade;
\t}
\t
\t// Sample canvas with distorted UV
\tCOLOR = texture(canvas_texture, uv);
}`,
    },
  },

  promptContext: `
# Paint/Shader Game Archetype

Paint games are interactive experiences where users draw, paint, or manipulate a canvas using touch/drag input. The core mechanic involves:

1. **Canvas Entity**: A static rectangular entity that serves as the drawing surface
2. **Shader-Based Rendering**: Custom Godot shaders that handle paint effects, blending, and visual effects
3. **Touch/Drag Input**: Users interact by touching and dragging on the canvas
4. **Persistent State**: The canvas maintains painted content across frames using texture feedback

## Key Components

### World Setup
- **Low/Zero Gravity**: Paint games typically don't need physics simulation (gravity: {x: 0, y: 0})
- **Static Canvas**: The canvas entity should have bodyType: 'static' and no collider
- **Fixed Camera**: Use camera type 'fixed' with zoom: 1 for consistent view

### Shader Structure (Godot Shading Language)
Paint shaders must use Godot's shading language syntax:
- Start with: \`shader_type canvas_item;\`
- Uniforms: \`uniform float brush_size : hint_range(0.01, 0.1) = 0.05;\`
- Main function: \`void fragment() { COLOR = ...; }\`
- Texture sampling: \`texture(TEXTURE, UV)\` or \`texture(canvas_texture, UV)\`

### Common Shader Uniforms
- **Brush properties**: size, color, hardness, opacity
- **Touch state**: touch_pos (vec2), is_touching (bool)
- **Canvas texture**: Previous frame's canvas state for persistence
- **Effect parameters**: speed, amplitude, frequency for animated effects

### Input Configuration
Paint games typically use:
- Drag input (phase: 'start', 'move', 'end')
- Tap input for single-point interactions
- No virtual buttons or tilt controls needed

### Shader Techniques
1. **Distance-based brushes**: Use \`distance(UV, touch_pos)\` with \`smoothstep\` for soft edges
2. **Texture feedback**: Sample previous frame's canvas to maintain painted content
3. **Blending**: Use \`mix()\` to blend new paint with existing canvas
4. **Effects**: Apply distortion, ripples, or other effects to UV coordinates before sampling

### Example Use Cases
- Drawing/painting apps
- Fluid simulation visualizations
- Interactive particle effects
- Generative art tools
- Texture manipulation games

## Important Notes
- Shaders must be valid Godot Shading Language (not WebGL GLSL)
- Use \`shader_type canvas_item;\` at the top of every shader
- Uniforms can have hints: \`hint_range(min, max)\`, \`source_color\`
- The \`fragment()\` function sets COLOR output
- UV coordinates are normalized (0-1) across the canvas
`,
};
