# Vector Shapes + SDF — Final Architecture

## The Key Insight: You Already Have SDF

Your effects system already has:
- **`_lib/sdf.glsl`** with `sdCircle`, `sdRoundedBox`, `sdRing`, `sdStar`, `sdHexagon`, `sdTriangle`, `smoothEdge`
- **`circle.glsl`** and **`rectangle.glsl`** generator shaders using those SDFs
- **`GraphExecutor`** + **`PingPongManager`** for multi-pass shader pipelines
- **`create_dynamic_shader`** for compiling GLSL at runtime
- **`apply_sprite_effect`** / **`apply_dynamic_shader_to_entity`** for per-entity shaders
- **70+ shaders** in the registry with AI hints, param schemas, and composability metadata

The SDF primitive library and the shader graph system are the same thing. The question isn't "do we add SDF" — it's "how do we make shapes a first-class input to the shader pipeline that already exists."

---

## Architecture: Shapes as Shader Inputs

```
Entity
│
│  shape data ─────┬────► Polygon2D (default renderer)
│  (JSON)          │      └─ Simple, fast, good enough
│                  │
│                  ├────► CollisionShape2D (physics)
│                  │      └─ Same shape data, always available
│                  │
│                  └────► SDF Texture (shader input)
│                         └─ Rendered to texture once, cached
│                         └─ Fed into effects graph as input
│                         └─ Shaders do glow/outline/morph/etc
│
│  effects ────────────► EffectGraphSpec (existing system)
│                        └─ Can consume SDF texture as input
│                        └─ Same pipeline, same shaders, no new infra
```

### The Two Paths Compose — They're Not Alternatives

**Path 1: Polygon2D Rendering (structural)**
- Shape data → Godot nodes (Polygon2D, Line2D)
- Physics reads shape data → CollisionShape2D
- Scripts read/write shape properties
- Animation targets per-shape
- This is the **scene graph** layer

**Path 2: SDF Rendering (aesthetic)**
- Shape data → SDF texture (rendered once per change)
- SDF texture → fed into effects graph as `externalInput`
- Effects graph does glow, outline, morph, blur, etc.
- This is the **post-processing** layer

**They stack**: An entity can have BOTH a Polygon2D visual AND an SDF-fed shader effect. The Polygon2D renders the shape. The shader adds the glow. Same entity, composing naturally.

---

## How SDF Integrates With Existing Effects

### Today: Entity Texture → Shader

```typescript
// Existing: apply a glow shader to an entity's sprite
effects: {
  entityEffects: [{
    entityId: "player",
    glsl: "glow",              // from shader library
    params: { glow_size: 8.0 } // shader uniforms
  }]
}
```

This already works. The `glow.glsl` shader reads the entity's texture and adds glow around non-transparent pixels.

### New: Shape SDF → Shader (Automatic)

```typescript
// Same thing, but the "texture" now has perfect edge distance info.
// The SDF gives the shader exact distance-to-edge per pixel,
// making glow/outline/shadow trivially cheap and pixel-perfect.
effects: {
  entityEffects: [{
    entityId: "player",
    glsl: "sdf_glow",         // NEW: SDF-aware variant
    params: { 
      glow_color: [0.0, 1.0, 1.0, 1.0],
      glow_spread: 15.0,
      glow_intensity: 2.0
    }
  }]
}
```

With a raster texture, glow samples neighboring pixels to find edges. With an SDF texture, distance-to-edge is literally the pixel value. This makes effects trivially cheap.

### New: Shape SDF → Custom Shader (Full Control)

```typescript
// Power user: write custom shader that receives the SDF
effects: {
  shaders: {
    "neon_pulse": {
      filename: "neon_pulse.gdshader",
      glsl: `
        shader_type canvas_item;
        uniform sampler2D sdf_texture;  // auto-bound by engine
        
        void fragment() {
          float d = texture(sdf_texture, UV).r;  // distance to edge
          
          // Pulsing neon outline
          float outline = smoothstep(0.02, 0.0, abs(d - 0.05));
          outline *= 0.5 + 0.5 * sin(TIME * 3.0);
          
          // Fill
          float fill = step(0.0, 0.5 - d);
          
          COLOR = vec4(fill * vec3(0.1), 1.0) 
                + vec4(outline * vec3(0.0, 1.0, 1.0), outline);
        }
      `
    }
  },
  entityEffects: [{ entityId: "player", glsl: "neon_pulse" }]
}
```

This is the "pass SDF so the shader can take over" mode. Same pipeline, same infrastructure.

### Composable: SDF → Effects Graph

```typescript
// Use existing effects graph with SDF as input source
effects: {
  graph: {
    id: "neon_world",
    scope: "entity",
    nodes: [
      {
        id: "sdf_source",
        type: "entitySDF",       // NEW node: generates SDF from entity shapes
        family: "generator",
        outputTarget: { bufferId: "sdf", format: "rgba8", resolution: "full" }
      },
      {
        id: "glow_pass",
        type: "glow",            // existing glow shader, unmodified
        family: "filter",
        inputSlots: [{ name: "input", dataType: "texture",
          connectedTo: { nodeId: "sdf_source", output: "output" } }],
        outputTarget: { bufferId: "final", format: "rgba8", resolution: "full" }
      }
    ],
    connections: [
      { from: { nodeId: "sdf_source", output: "output" },
        to: { nodeId: "glow_pass", input: "input" } }
    ]
  }
}
```

---

## The Two Easy Patterns

### Pattern 1: "Just Make It Glow" (Zero Shader Knowledge)

```json
{
  "prefabs": {
    "powerup": {
      "visual": {
        "type": "star",
        "outerRadius": 0.8,
        "points": 5,
        "innerRatio": 0.4,
        "fill": "#FFD700"
      },
      "effects": ["glow"]
    }
  }
}
```

Engine automatically:
1. Renders star as Polygon2D (visual)
2. Generates SDF texture from star shape data
3. Applies `glow.glsl` using SDF for edge detection
4. Result: perfectly glowing star, zero shader code

### Pattern 2: "Give Me the SDF" (Full Control)

```typescript
exports.onStart = async (ctx) => {
  await ctx.spawn("powerup", { x: 0, y: 0 });
  
  ctx.createShader("neon_pulse", `
    shader_type canvas_item;
    uniform sampler2D sdf_texture;
    void fragment() {
      float d = texture(sdf_texture, UV).r;
      float outline = smoothstep(0.02, 0.0, abs(d - 0.5));
      outline *= 0.5 + 0.5 * sin(TIME * 4.0);
      float fill = step(d, 0.5);
      COLOR = vec4(fill * vec3(0.05), 1.0)
            + vec4(outline * vec3(0.0, 1.0, 0.8), outline * 3.0);
    }
  `);
  ctx.applyShader("powerup_1", "neon_pulse");
};
```

Both use the same underlying shape data. No duplication.

---

## Shape Data Schema

```typescript
// shared/src/types/visual.ts

export type ShapeType = 
  | "rect" | "roundedRect" | "circle" | "polygon" 
  | "line" | "arc" | "star" | "hexagon" | "triangle"
  | "compound";

interface BaseShape {
  id?: string;           // animation/script targeting
  x?: number;            // local offset from entity
  y?: number;
  rotation?: number;
  scale?: number;
  zIndex?: number;
  opacity?: number;
  
  // Fill + Stroke
  fill?: string;         // hex color
  stroke?: string;       // hex color
  strokeWidth?: number;
  
  // Physics integration
  colliderId?: string;   // generates CollisionShape2D if present
  
  // SDF opt-in/out (default: auto based on whether entity has sdf-consuming effects)
  sdf?: boolean;
}

// --- Primitive shapes ---

interface RectShape extends BaseShape {
  type: "rect";
  width: number;
  height: number;
}

interface RoundedRectShape extends BaseShape {
  type: "roundedRect";
  width: number;
  height: number;
  cornerRadius: number;
  cornerRadii?: { topRight?: number; topLeft?: number; 
                  bottomLeft?: number; bottomRight?: number };
}

interface CircleShape extends BaseShape {
  type: "circle";
  radius: number;
}

interface PolygonShape extends BaseShape {
  type: "polygon";
  vertices: Vec2[];
}

interface LineShape extends BaseShape {
  type: "line";
  points: Vec2[];
  width: number;
  closed?: boolean;
  capMode?: "sharp" | "round" | "square";
  jointMode?: "sharp" | "bevel" | "round";
}

interface ArcShape extends BaseShape {
  type: "arc";
  radius: number;
  startAngle: number;
  endAngle: number;
}

interface StarShape extends BaseShape {
  type: "star";
  outerRadius: number;
  points: number;
  innerRatio: number;   // 0-1
}

interface HexagonShape extends BaseShape {
  type: "hexagon";
  radius: number;
}

interface TriangleShape extends BaseShape {
  type: "triangle";
  radius: number;       // circumscribed radius
}

// --- Compound ---

interface CompoundShape extends BaseShape {
  type: "compound";
  children: ShapeDefinition[];
}

export type ShapeDefinition = 
  | RectShape | RoundedRectShape | CircleShape | PolygonShape
  | LineShape | ArcShape | StarShape | HexagonShape | TriangleShape
  | CompoundShape;

// Backward compatible: existing visual types + new shapes
export type VisualComponent =
  | RectVisualComponent      // existing, unchanged
  | CircleVisualComponent    // existing, unchanged
  | PolygonVisualComponent   // existing, unchanged
  | ImageVisualComponent     // existing, unchanged
  | TextVisualComponent      // existing, unchanged
  | ShapeDefinition;         // NEW: all shape types valid as visuals
```

---

## SDF Texture Generation

SDF textures are generated on the GDScript side as a **viewport render** — not CPU-computed.

### Data Texture Trick (bypasses uniform array limits)

Instead of arrays of uniforms (limited to ~32-128 per GPU), pack shape data into a tiny texture:

```
Texture: Nx2 pixels (N = shape count)
Row 0: [type, x, y, rotation] per pixel
Row 1: [param0, param1, param2, param3] per pixel

32-shape compound = 32x2 texture = 256 bytes
```

This removes the uniform limit entirely. 500 shapes in one compound is fine.

### SDF Multi-Shape Shader

```glsl
// godot_project/shaders/sdf_multi_shape.gdshader
shader_type canvas_item;

// Reuse existing SDF library!
#include "res://shared/effects/shaders/_lib/sdf.glsl"

uniform int shape_count = 0;
uniform sampler2D shape_data_texture;  // packed shape params

void fragment() {
    vec2 p = UV - vec2(0.5);
    float min_d = 1e10;
    
    for (int i = 0; i < shape_count; i++) {
        vec4 info = texelFetch(shape_data_texture, ivec2(i, 0), 0);
        vec4 params = texelFetch(shape_data_texture, ivec2(i, 1), 0);
        
        int shape_type = int(info.x);
        vec2 offset = info.yz;
        float rot = info.w;
        
        vec2 lp = p - offset;
        float c = cos(rot); float s = sin(rot);
        lp = vec2(c*lp.x + s*lp.y, -s*lp.x + c*lp.y);
        
        float d;
        if (shape_type == 0)      d = sdCircle(lp, params.x);
        else if (shape_type == 1) d = sdRoundedBox(lp, params.xy, vec4(params.z));
        else if (shape_type == 2) d = sdStar(lp, params.x, int(params.y), params.z);
        else if (shape_type == 3) d = sdHexagon(lp, params.x);
        else if (shape_type == 4) d = sdTriangle(lp, params.x);
        else                      d = sdCircle(lp, params.x);
        
        min_d = min(min_d, d);
    }
    
    // Encode: 0.5 = edge, <0.5 = inside, >0.5 = outside
    float spread = 0.1;
    float encoded = clamp(min_d / spread * 0.5 + 0.5, 0.0, 1.0);
    COLOR = vec4(encoded, encoded, encoded, 1.0);
}
```

**Key**: This shader reuses the exact same `sdf.glsl` library that `circle.glsl` and `rectangle.glsl` already use. No new SDF math.

---

## What This Unlocks (Games)

| Feature | Shapes Only | Shapes + SDF Effects |
|---------|-------------|---------------------|
| Flat-style characters | Compound shapes | + neon outlines, glow |
| Physics per-shape | colliderId | + hit flash effects |
| Destructible objects | Remove children | + dissolve/explode via SDF |
| Ragdolls | Joint system | + per-limb effects |
| Geometry Wars aesthetic | — | SDF glow + feedback trails |
| Shape morphing | — | Lerp SDF fields |
| Card games | Rounded rects | + holographic/shine effects |
| Drawing games | Lines | + glow/blur on strokes |
| UI-heavy games | Shapes as buttons | + animated borders |

---

## Performance

### Polygon2D Rendering (shapes)

| Shape Count | GPU Time | Notes |
|-------------|----------|-------|
| 50 | ~0.1ms | Batched by Godot |
| 200 | ~0.4ms | Still fast |
| 500 | ~1ms | Fine for games |

### SDF Texture (per entity, cached)

| Shapes/Entity | SDF Gen | Frequency | Notes |
|---------------|---------|-----------|-------|
| 1-10 | ~0.05ms | Once on change | Trivial |
| 10-50 | ~0.1ms | Once on change | Data texture, still fast |
| 50+ | ~0.2ms | Cache aggressively | LOD if needed |

**Key**: SDF generated ONCE per shape change, not per frame. Static shapes = zero ongoing cost.

### Combined steady state

```
Per entity with SDF effect:
  Polygon2D:   ~0.02ms  (scene graph, always)
  SDF gen:     ~0.00ms  (cached, only on change)
  Effect pass: ~0.05ms  (per frame)
  Total:       ~0.07ms steady state

20 entities with effects: ~1.4ms — well within 16ms budget
```

---

## Integration Points (Existing Code)

### VisualRenderer.gd — extend match statement

```
Existing types:              New types:
  "rect" → Polygon2D          "roundedRect" → Polygon2D (arc vertices)
  "circle" → Polygon2D        "line" → Line2D
  "polygon" → Polygon2D       "arc" → Polygon2D (tessellated)
  "image" → Sprite2D          "star" → Polygon2D (computed vertices)
  "text" → Label              "hexagon" → Polygon2D (computed vertices)
                               "triangle" → Polygon2D (computed)
                               "compound" → Node2D + recursive children
```

### GameBridgeEffects.gd — add SDF as input source

```
Existing:                    New:
  apply_sprite_effect()        SDF texture as shader input
  create_dynamic_shader()      "entitySDF" graph node type
  GraphExecutor pipeline       SDF auto-cached per entity
```

### WorldOps — extend script API

```typescript
// New methods
addShape(entityId: string, shape: ShapeDefinition): Promise<string>;
removeShape(entityId: string, shapeId: string): Promise<void>;
setShapeProperty(entityId: string, shapeId: string, 
                 prop: string, value: unknown): Promise<void>;
applyEffect(entityId: string, effectName: string, 
            params?: Record<string, unknown>): Promise<void>;
removeEffect(entityId: string): Promise<void>;
```

---

## Implementation Phases

### Phase 1: New Shape Primitives (1 day)
- `roundedRect`, `line`, `arc`, `star`, `hexagon`, `triangle` in VisualComponent
- Polygon2D tessellation for each in VisualRenderer.gd
- Stroke rendering (fill Polygon2D + outline Line2D)
- Zod schemas, tests

### Phase 2: Compound Shapes (2 days)
- `compound` type with recursive `children`
- Recursive Node2D tree creation in GDScript
- Local transforms, z-ordering (array order = back-to-front)
- Tests

### Phase 3: Per-Shape Physics (1 day)
- `colliderId` → auto-generate CollisionShape2D per shape
- Multiple colliders per entity body
- Tests

### Phase 4: SDF Texture Pipeline (2 days)
- SDF multi-shape shader (data texture encoding)
- SDFRenderer.gd: viewport-based generation + caching
- Expose SDF texture as `externalInput` to effects graph
- `entitySDF` generator node for effect graphs
- Tests

### Phase 5: Built-in SDF Effects (1 day)
- `sdf_glow.glsl` — SDF-aware glow
- `sdf_outline.glsl` — perfect variable-width outline
- `sdf_shadow.glsl` — soft shadow from distance field
- `effects: ["glow"]` shorthand on prefabs
- Register in shader library with param schemas + AI hints

### Phase 6: Script API (1 day)
- WorldOps: `addShape`, `removeShape`, `setShapeProperty`
- WorldOps: `applyEffect`, `removeEffect`
- Bridge method registration, tests

**Total: ~8 days, each phase shippable independently**

---

## Summary

| Decision | Rationale |
|----------|-----------|
| **Shapes are data** | Same JSON drives rendering, physics, AND SDF generation |
| **SDF is a rendering mode, not a replacement** | Polygon2D for structure, SDF texture for effects |
| **SDF feeds existing effects pipeline** | No new shader infra — GraphExecutor already handles it |
| **Two easy patterns** | `effects: ["glow"]` for simple, custom GLSL for advanced |
| **Data texture for shape packing** | Bypasses uniform limits, supports 500+ shapes |
| **Cache SDF textures** | Generate once, read every frame. Static = free. |
| **Skip SVG** | Wrong abstraction for games. AI-hostile syntax. No physics. |

**One shape definition drives three systems:**
Shape data → Polygon2D (visual) + CollisionShape2D (physics) + SDF texture (effects)

**No duplication. Full composability.**

---
---

# IMPLEMENTATION SPEC

Everything above is the "why." Everything below is the "what, where, how."

---

## 1. Backward Compatibility: Old Visual → New Shape

The existing `VisualComponent` types (`RectVisualComponent`, `CircleVisualComponent`, etc.) stay unchanged. New shape types are additive. The discriminant is `type`:

```
Old types (keep working):     New types (additive):
  "rect"  → RectVisualComponent     "roundedRect" → RoundedRectShape
  "circle" → CircleVisualComponent   "line" → LineShape
  "polygon" → PolygonVisualComponent "arc" → ArcShape
  "image" → ImageVisualComponent     "star" → StarShape
  "text" → TextVisualComponent       "hexagon" → HexagonShape
                                     "triangle" → TriangleShape
                                     "compound" → CompoundShape
```

Old visuals use `color` field. New shapes use `fill` field. VisualRenderer.gd handles both:

```gdscript
var fill_color = Color.from_string(
    visual_data.get("fill", visual_data.get("color", "#FF0000")),
    Color.RED
)
```

### Migration path (not required, but nice)

Old: `{ type: "rect", width: 2, height: 1, color: "#FF0000" }`
New: `{ type: "rect", width: 2, height: 1, fill: "#FF0000" }`

Both work. `color` is an alias for `fill` in the renderer.

---

## 2. File-by-File Changes

### Phase 1: New Shape Primitives

#### `shared/src/types/visual.ts` — Add types

```typescript
// ADD after existing types:

export interface RoundedRectShape {
  type: "roundedRect";
  width: number;
  height: number;
  cornerRadius: number;
  cornerRadii?: { topRight?: number; topLeft?: number;
                  bottomLeft?: number; bottomRight?: number };
  // BaseShape fields:
  id?: string; x?: number; y?: number; rotation?: number; scale?: number;
  zIndex?: number; opacity?: number;
  fill?: string; stroke?: string; strokeWidth?: number;
  colliderId?: string; sdf?: boolean;
}

export interface LineShape {
  type: "line";
  points: Vec2[];
  width: number;
  closed?: boolean;
  capMode?: "sharp" | "round" | "square";
  jointMode?: "sharp" | "bevel" | "round";
  // BaseShape fields (minus fill — lines use color directly):
  id?: string; x?: number; y?: number; rotation?: number; scale?: number;
  zIndex?: number; opacity?: number;
  color?: string; // Line color (alias: stroke)
  stroke?: string;
  colliderId?: string; sdf?: boolean;
}

export interface ArcShape {
  type: "arc";
  radius: number;
  startAngle: number;  // radians
  endAngle: number;    // radians
  id?: string; x?: number; y?: number; rotation?: number; scale?: number;
  zIndex?: number; opacity?: number;
  fill?: string; stroke?: string; strokeWidth?: number;
  colliderId?: string; sdf?: boolean;
}

export interface StarShape {
  type: "star";
  outerRadius: number;
  points: number;       // e.g. 5
  innerRatio: number;   // 0-1, ratio of inner to outer radius
  id?: string; x?: number; y?: number; rotation?: number; scale?: number;
  zIndex?: number; opacity?: number;
  fill?: string; stroke?: string; strokeWidth?: number;
  colliderId?: string; sdf?: boolean;
}

export interface HexagonShape {
  type: "hexagon";
  radius: number;
  id?: string; x?: number; y?: number; rotation?: number; scale?: number;
  zIndex?: number; opacity?: number;
  fill?: string; stroke?: string; strokeWidth?: number;
  colliderId?: string; sdf?: boolean;
}

export interface TriangleShape {
  type: "triangle";
  radius: number;       // circumscribed
  id?: string; x?: number; y?: number; rotation?: number; scale?: number;
  zIndex?: number; opacity?: number;
  fill?: string; stroke?: string; strokeWidth?: number;
  colliderId?: string; sdf?: boolean;
}

export interface CompoundShape {
  type: "compound";
  children: ShapeDefinition[];
  id?: string; x?: number; y?: number; rotation?: number; scale?: number;
  zIndex?: number; opacity?: number;
  colliderId?: string; sdf?: boolean;
}

export type ShapeDefinition =
  | RoundedRectShape | LineShape | ArcShape
  | StarShape | HexagonShape | TriangleShape
  | CompoundShape;

// UPDATE the VisualComponent union:
export type VisualComponent =
  | RectVisualComponent
  | CircleVisualComponent
  | PolygonVisualComponent
  | ImageVisualComponent
  | TextVisualComponent
  | ShapeDefinition;
```

#### `shared/src/types/schemas.ts` — Add Zod schemas

```typescript
// ADD new shape schemas

export const RoundedRectShapeSchema = z.object({
  type: z.literal("roundedRect"),
  width: z.number().positive(),
  height: z.number().positive(),
  cornerRadius: z.number().min(0),
  cornerRadii: z.object({
    topRight: z.number().min(0).optional(),
    topLeft: z.number().min(0).optional(),
    bottomLeft: z.number().min(0).optional(),
    bottomRight: z.number().min(0).optional(),
  }).optional(),
  id: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  rotation: z.number().optional(),
  scale: z.number().optional(),
  zIndex: z.number().int().optional(),
  opacity: z.number().min(0).max(1).optional(),
  fill: z.string().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().min(0).optional(),
  colliderId: z.string().optional(),
  sdf: z.boolean().optional(),
});

export const LineShapeSchema = z.object({
  type: z.literal("line"),
  points: z.array(Vec2Schema).min(2),
  width: z.number().positive(),
  closed: z.boolean().optional(),
  capMode: z.enum(["sharp", "round", "square"]).optional(),
  jointMode: z.enum(["sharp", "bevel", "round"]).optional(),
  id: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  rotation: z.number().optional(),
  scale: z.number().optional(),
  zIndex: z.number().int().optional(),
  opacity: z.number().min(0).max(1).optional(),
  color: z.string().optional(),
  stroke: z.string().optional(),
  colliderId: z.string().optional(),
  sdf: z.boolean().optional(),
});

export const ArcShapeSchema = z.object({
  type: z.literal("arc"),
  radius: z.number().positive(),
  startAngle: z.number(),
  endAngle: z.number(),
  // ...base shape fields same pattern
});

export const StarShapeSchema = z.object({
  type: z.literal("star"),
  outerRadius: z.number().positive(),
  points: z.number().int().min(3).max(32),
  innerRatio: z.number().min(0.01).max(0.99),
  // ...base shape fields
});

export const HexagonShapeSchema = z.object({
  type: z.literal("hexagon"),
  radius: z.number().positive(),
  // ...base shape fields
});

export const TriangleShapeSchema = z.object({
  type: z.literal("triangle"),
  radius: z.number().positive(),
  // ...base shape fields
});

// Compound uses lazy() for recursive definition
export const CompoundShapeSchema: z.ZodType = z.lazy(() => z.object({
  type: z.literal("compound"),
  children: z.array(ShapeDefinitionSchema).min(1),
  // ...base shape fields
}));

export const ShapeDefinitionSchema = z.discriminatedUnion("type", [
  RoundedRectShapeSchema,
  LineShapeSchema,
  ArcShapeSchema,
  StarShapeSchema,
  HexagonShapeSchema,
  TriangleShapeSchema,
  CompoundShapeSchema,
]);

// UPDATE VisualComponentSchema to include new shapes
export const VisualComponentSchema = z.discriminatedUnion("type", [
  // ...existing entries...
  RoundedRectShapeSchema,
  LineShapeSchema,
  ArcShapeSchema,
  StarShapeSchema,
  HexagonShapeSchema,
  TriangleShapeSchema,
  CompoundShapeSchema,
]);
```

#### `godot_project/scripts/bridge/VisualRenderer.gd` — Add shape rendering

Add cases to the `match visual_type:` block in `_add_shape_sprite()`:

```gdscript
"roundedRect":
    var polygon = Polygon2D.new()
    var w = visual_data.get("width", 1.0) * _pixels_per_meter
    var h = visual_data.get("height", 1.0) * _pixels_per_meter
    var cr = visual_data.get("cornerRadius", 0.0) * _pixels_per_meter
    cr = min(cr, min(w, h) / 2.0)  # clamp to half smallest dimension
    var hw = w / 2.0
    var hh = h / 2.0
    var points: PackedVector2Array = []
    var segments = 8  # per corner
    # Top-right corner
    for i in range(segments + 1):
        var angle = -PI/2 + (PI/2) * float(i) / segments
        points.append(Vector2(hw - cr + cos(angle) * cr, -hh + cr + sin(angle) * cr))
    # Bottom-right corner
    for i in range(segments + 1):
        var angle = 0 + (PI/2) * float(i) / segments
        points.append(Vector2(hw - cr + cos(angle) * cr, hh - cr + sin(angle) * cr))
    # Bottom-left corner
    for i in range(segments + 1):
        var angle = PI/2 + (PI/2) * float(i) / segments
        points.append(Vector2(-hw + cr + cos(angle) * cr, hh - cr + sin(angle) * cr))
    # Top-left corner
    for i in range(segments + 1):
        var angle = PI + (PI/2) * float(i) / segments
        points.append(Vector2(-hw + cr + cos(angle) * cr, -hh + cr + sin(angle) * cr))
    polygon.polygon = points
    fill_color.a = opacity
    polygon.color = fill_color
    polygon.z_index = z_index_val
    node.add_child(polygon)
    _add_stroke_if_needed(node, points, visual_data, true)  # closed=true

"line":
    var line = Line2D.new()
    var points_data = visual_data.get("points", [])
    var pts: PackedVector2Array = []
    for p in points_data:
        pts.append(Vector2(float(p.get("x", p[0])), -float(p.get("y", p[1]))) * _pixels_per_meter)
    line.points = pts
    line.width = visual_data.get("width", 0.05) * _pixels_per_meter
    line.default_color = fill_color
    line.antialiased = true
    line.closed = visual_data.get("closed", false)
    var cap = visual_data.get("capMode", "round")
    match cap:
        "round": line.begin_cap_mode = Line2D.LINE_CAP_ROUND; line.end_cap_mode = Line2D.LINE_CAP_ROUND
        "square": line.begin_cap_mode = Line2D.LINE_CAP_BOX; line.end_cap_mode = Line2D.LINE_CAP_BOX
        _: line.begin_cap_mode = Line2D.LINE_CAP_NONE; line.end_cap_mode = Line2D.LINE_CAP_NONE
    var joint = visual_data.get("jointMode", "round")
    match joint:
        "round": line.joint_mode = Line2D.LINE_JOINT_ROUND
        "bevel": line.joint_mode = Line2D.LINE_JOINT_BEVEL
        _: line.joint_mode = Line2D.LINE_JOINT_SHARP
    line.z_index = z_index_val
    node.add_child(line)

"arc":
    var radius = visual_data.get("radius", 0.5) * _pixels_per_meter
    var start_angle = visual_data.get("startAngle", 0.0)
    var end_angle = visual_data.get("endAngle", TAU)
    var segments = 32
    var arc_points: PackedVector2Array = []
    for i in range(segments + 1):
        var angle = lerp(start_angle, end_angle, float(i) / segments)
        # Y-flip for Godot coordinates
        arc_points.append(Vector2(cos(angle), -sin(angle)) * radius)
    if visual_data.has("fill") or visual_data.has("color"):
        var polygon = Polygon2D.new()
        var fill_points = arc_points.duplicate()
        fill_points.insert(0, Vector2.ZERO)  # center for pie slice
        polygon.polygon = fill_points
        polygon.color = fill_color
        polygon.z_index = z_index_val
        node.add_child(polygon)
    _add_stroke_if_needed(node, arc_points, visual_data, false)

"star":
    var polygon = Polygon2D.new()
    var outer_r = visual_data.get("outerRadius", 0.5) * _pixels_per_meter
    var num_points = int(visual_data.get("points", 5))
    var inner_ratio = visual_data.get("innerRatio", 0.4)
    var inner_r = outer_r * inner_ratio
    var pts: PackedVector2Array = []
    for i in range(num_points * 2):
        var angle = float(i) * PI / num_points - PI / 2
        var r = outer_r if i % 2 == 0 else inner_r
        pts.append(Vector2(cos(angle), -sin(angle)) * r)
    polygon.polygon = pts
    polygon.color = fill_color
    polygon.z_index = z_index_val
    node.add_child(polygon)
    _add_stroke_if_needed(node, pts, visual_data, true)

"hexagon":
    var polygon = Polygon2D.new()
    var radius = visual_data.get("radius", 0.5) * _pixels_per_meter
    var pts: PackedVector2Array = []
    for i in range(6):
        var angle = float(i) * TAU / 6 - PI / 6  # flat-top orientation
        pts.append(Vector2(cos(angle), -sin(angle)) * radius)
    polygon.polygon = pts
    polygon.color = fill_color
    polygon.z_index = z_index_val
    node.add_child(polygon)
    _add_stroke_if_needed(node, pts, visual_data, true)

"triangle":
    var polygon = Polygon2D.new()
    var radius = visual_data.get("radius", 0.5) * _pixels_per_meter
    var pts: PackedVector2Array = []
    for i in range(3):
        var angle = float(i) * TAU / 3 - PI / 2  # point-up
        pts.append(Vector2(cos(angle), -sin(angle)) * radius)
    polygon.polygon = pts
    polygon.color = fill_color
    polygon.z_index = z_index_val
    node.add_child(polygon)
    _add_stroke_if_needed(node, pts, visual_data, true)

"compound":
    var container = Node2D.new()
    container.z_index = z_index_val
    var children = visual_data.get("children", [])
    for i in range(children.size()):
        var child_data = children[i]
        var child_node = Node2D.new()
        child_node.position = Vector2(
            float(child_data.get("x", 0)) * _pixels_per_meter,
            -float(child_data.get("y", 0)) * _pixels_per_meter
        )
        child_node.rotation = -float(child_data.get("rotation", 0))
        var child_scale = float(child_data.get("scale", 1.0))
        child_node.scale = Vector2(child_scale, child_scale)
        child_node.z_index = int(child_data.get("zIndex", i))  # array order default
        container.add_child(child_node)
        _add_shape_sprite(child_node, child_data)  # recursive!
    node.add_child(container)
```

#### New helper: `_add_stroke_if_needed()`

```gdscript
func _add_stroke_if_needed(node: Node2D, points: PackedVector2Array, 
                           visual_data: Dictionary, closed: bool) -> void:
    var stroke_color_str = visual_data.get("stroke", visual_data.get("strokeColor", ""))
    if stroke_color_str == "":
        return
    var stroke_color = Color.from_string(stroke_color_str, Color.BLACK)
    var stroke_width = float(visual_data.get("strokeWidth", 0.05)) * _pixels_per_meter
    var line = Line2D.new()
    line.points = points
    line.closed = closed
    line.width = stroke_width
    line.default_color = stroke_color
    line.antialiased = true
    line.joint_mode = Line2D.LINE_JOINT_ROUND
    line.z_index = 1  # above fill
    node.add_child(line)
```

---

## 3. Per-Shape Physics (`colliderId`)

#### `godot_project/scripts/bridge/EntityFactory.gd` (or wherever collision shapes are created)

When building an entity, after creating the visual, scan shape data for `colliderId`:

```gdscript
func _create_colliders_from_shapes(body: Node2D, visual_data: Dictionary) -> void:
    if visual_data.get("type", "") == "compound":
        for child_data in visual_data.get("children", []):
            _create_collider_for_shape(body, child_data)
    else:
        _create_collider_for_shape(body, visual_data)

func _create_collider_for_shape(body: Node2D, shape_data: Dictionary) -> void:
    var collider_id = shape_data.get("colliderId", "")
    if collider_id == "":
        return
    
    var collision = CollisionShape2D.new()
    collision.name = collider_id
    
    var shape_type = shape_data.get("type", "")
    match shape_type:
        "circle":
            var circle = CircleShape2D.new()
            circle.radius = float(shape_data.get("radius", 0.5)) * _pixels_per_meter
            collision.shape = circle
        "rect", "roundedRect":
            var rect = RectangleShape2D.new()
            rect.size = Vector2(
                float(shape_data.get("width", 1.0)) * _pixels_per_meter,
                float(shape_data.get("height", 1.0)) * _pixels_per_meter
            )
            collision.shape = rect
        "polygon", "star", "hexagon", "triangle":
            var convex = ConvexPolygonShape2D.new()
            # Use same vertex generation as VisualRenderer
            convex.points = _compute_shape_vertices(shape_data)
            collision.shape = convex
    
    # Position offset for compound children
    collision.position = Vector2(
        float(shape_data.get("x", 0)) * _pixels_per_meter,
        -float(shape_data.get("y", 0)) * _pixels_per_meter
    )
    collision.rotation = -float(shape_data.get("rotation", 0))
    
    body.add_child(collision)
```

#### Collision callbacks include shape ID

When a collision occurs, the `CollisionShape2D.name` field carries the `colliderId`. The bridge collision handler already reports which shapes collided — we just need to include the name:

```gdscript
# In collision signal handler, add:
var shape_name_a = body_a.shape_find_owner(shape_index_a)
var shape_name_b = body_b.shape_find_owner(shape_index_b)
# Include in collision event data sent to JS
```

---

## 4. Effects Shorthand (`effects: ["glow"]`)

#### `shared/src/types/entity.ts` — Add to EntityPrefab

```typescript
export interface EntityPrefab {
  // ...existing fields...
  
  /** Shorthand effect names applied to this entity's visual.
   *  Resolved at compile/load time into full entityEffects entries. */
  effects?: string[];
}
```

#### Resolution logic (compile time or load time)

```typescript
// shared/src/effects/resolveShorthand.ts

import { getShaderEntry } from "./shaderRegistry";

interface ResolvedEntityEffect {
  entityId: string;
  glsl: string;
  params: Record<string, unknown>;
  useSDF: boolean;  // hint to engine: generate SDF texture for this entity
}

export function resolveEffectShorthand(
  entityId: string,
  effectNames: string[]
): ResolvedEntityEffect[] {
  return effectNames.map(name => {
    const entry = getShaderEntry(name);
    if (!entry) throw new Error(`Unknown effect shorthand: ${name}`);
    
    // Build default params from schema
    const params: Record<string, unknown> = {};
    for (const p of entry.paramsSchema) {
      params[p.key] = p.defaultValue;
    }
    
    // Check if this effect benefits from SDF input
    const sdfEffects = ["sdf_glow", "sdf_outline", "sdf_shadow"];
    const useSDF = sdfEffects.includes(name) || name.startsWith("sdf_");
    
    return { entityId, glsl: name, params, useSDF };
  });
}
```

#### GDScript: auto-generate SDF when `useSDF` is true

In `GameBridgeEffects.gd`, when applying an entity effect with `useSDF`:

```gdscript
func _apply_entity_effect_with_sdf(entity_id: String, effect_data: Dictionary) -> void:
    if effect_data.get("useSDF", false):
        # Get shape data from entity
        var visual_data = _get_entity_visual_data(entity_id)
        # Render SDF texture
        var sdf_tex = _sdf_renderer.render_sdf(visual_data)
        # Bind as shader parameter
        effect_data["params"]["sdf_texture"] = sdf_tex
    
    # Apply effect using existing pipeline
    apply_sprite_effect(entity_id, effect_data.glsl, effect_data.params)
```

---

## 5. SDF Renderer Implementation

#### `godot_project/scripts/bridge/SDFRenderer.gd` — New file

```gdscript
class_name SDFRenderer
extends RefCounted

var _viewport: SubViewport = null
var _rect: ColorRect = null
var _material: ShaderMaterial = null
var _cache: Dictionary = {}  # entity_id -> { texture, shape_hash }
var _sdf_shader: Shader = null

func _init() -> void:
    _sdf_shader = Shader.new()
    _sdf_shader.code = _get_sdf_shader_code()

func get_or_render(entity_id: String, shapes: Array, 
                   viewport_size: Vector2i) -> Texture2D:
    var shape_hash = _compute_shape_hash(shapes)
    if _cache.has(entity_id):
        var cached = _cache[entity_id]
        if cached.shape_hash == shape_hash:
            return cached.texture  # cache hit
    
    var texture = _render(shapes, viewport_size)
    _cache[entity_id] = { "texture": texture, "shape_hash": shape_hash }
    return texture

func invalidate(entity_id: String) -> void:
    _cache.erase(entity_id)

func _render(shapes: Array, size: Vector2i) -> ImageTexture:
    # Build data texture (Nx2, float32)
    var count = _count_leaf_shapes(shapes)
    var data_img = Image.create(max(count, 1), 2, false, Image.FORMAT_RGBAF)
    var idx = 0
    _pack_shapes_recursive(shapes, data_img, idx, Vector2.ZERO, 0.0)
    var data_tex = ImageTexture.create_from_image(data_img)
    
    # Setup viewport + shader
    if _viewport == null:
        _setup_viewport(size)
    _viewport.size = size
    _material.set_shader_parameter("shape_count", count)
    _material.set_shader_parameter("shape_data_texture", data_tex)
    
    # Render
    _viewport.render_target_update_mode = SubViewport.UPDATE_ONCE
    RenderingServer.force_draw()
    
    # Copy to ImageTexture (detach from viewport)
    var img = _viewport.get_texture().get_image()
    return ImageTexture.create_from_image(img)

func _pack_shapes_recursive(shapes: Array, img: Image, idx: int,
                            parent_offset: Vector2, parent_rotation: float) -> int:
    for shape in shapes:
        if shape.get("type", "") == "compound":
            var offset = parent_offset + Vector2(
                float(shape.get("x", 0)), float(shape.get("y", 0)))
            var rot = parent_rotation + float(shape.get("rotation", 0))
            idx = _pack_shapes_recursive(
                shape.get("children", []), img, idx, offset, rot)
            continue
        
        var type_id = _shape_type_to_int(shape.get("type", "circle"))
        var x = parent_offset.x + float(shape.get("x", 0))
        var y = parent_offset.y + float(shape.get("y", 0))
        var rot = parent_rotation + float(shape.get("rotation", 0))
        
        # Row 0: type, x, y, rotation (normalized to UV space)
        img.set_pixel(idx, 0, Color(float(type_id), x, y, rot))
        
        # Row 1: shape-specific params
        var p = _get_shape_params(shape)
        img.set_pixel(idx, 1, Color(p[0], p[1], p[2], p[3]))
        
        idx += 1
    return idx

func _shape_type_to_int(type: String) -> int:
    match type:
        "circle": return 0
        "rect", "roundedRect": return 1
        "star": return 2
        "hexagon": return 3
        "triangle": return 4
        _: return 0

func _get_shape_params(shape: Dictionary) -> Array:
    match shape.get("type", ""):
        "circle":
            return [float(shape.get("radius", 0.5)), 0.0, 0.0, 0.0]
        "rect":
            return [float(shape.get("width", 1.0)) / 2.0,
                    float(shape.get("height", 1.0)) / 2.0, 0.0, 0.0]
        "roundedRect":
            return [float(shape.get("width", 1.0)) / 2.0,
                    float(shape.get("height", 1.0)) / 2.0,
                    float(shape.get("cornerRadius", 0.0)), 0.0]
        "star":
            return [float(shape.get("outerRadius", 0.5)),
                    float(shape.get("points", 5)),
                    2.0 + 1.0 / max(float(shape.get("innerRatio", 0.4)), 0.01),
                    0.0]
        "hexagon":
            return [float(shape.get("radius", 0.5)), 0.0, 0.0, 0.0]
        "triangle":
            return [float(shape.get("radius", 0.5)), 0.0, 0.0, 0.0]
        _:
            return [0.5, 0.0, 0.0, 0.0]

func _setup_viewport(size: Vector2i) -> void:
    _viewport = SubViewport.new()
    _viewport.size = size
    _viewport.transparent_bg = true
    _viewport.render_target_update_mode = SubViewport.UPDATE_DISABLED
    
    _rect = ColorRect.new()
    _rect.size = Vector2(size)
    _material = ShaderMaterial.new()
    _material.shader = _sdf_shader
    _rect.material = _material
    _viewport.add_child(_rect)
    
    # Must be in tree to render
    Engine.get_main_loop().root.add_child(_viewport)

func _compute_shape_hash(shapes: Array) -> int:
    return JSON.stringify(shapes).hash()

func _count_leaf_shapes(shapes: Array) -> int:
    var count = 0
    for shape in shapes:
        if shape.get("type", "") == "compound":
            count += _count_leaf_shapes(shape.get("children", []))
        else:
            count += 1
    return count
```

---

## 6. Built-in SDF Effect Shaders

#### `shared/src/effects/shaders/sprite/sdfGlow.glsl` — New file

```glsl
shader_type canvas_item;

uniform sampler2D sdf_texture : hint_default_white;
uniform vec4 glow_color : source_color = vec4(0.0, 1.0, 1.0, 1.0);
uniform float glow_spread : hint_range(0.0, 0.3) = 0.08;
uniform float glow_intensity : hint_range(0.0, 5.0) = 2.0;
uniform vec4 fill_color : source_color = vec4(0.1, 0.1, 0.1, 1.0);
uniform float pulse_speed : hint_range(0.0, 10.0) = 0.0;

void fragment() {
    float d = texture(sdf_texture, UV).r;
    float edge = 0.5;
    
    // Fill: inside the shape
    float fill = smoothstep(edge + 0.005, edge - 0.005, d);
    
    // Glow: outside the shape, fading out
    float glow_factor = smoothstep(edge + glow_spread, edge, d);
    glow_factor -= fill;  // don't glow inside
    glow_factor = max(glow_factor, 0.0);
    
    // Optional pulse
    float intensity = glow_intensity;
    if (pulse_speed > 0.0) {
        intensity *= 0.7 + 0.3 * sin(TIME * pulse_speed);
    }
    
    vec4 result = fill_color * fill + glow_color * glow_factor * intensity;
    result.a = max(fill, glow_factor * intensity * 0.5);
    COLOR = result;
}
```

#### `shared/src/effects/shaders/sprite/sdfOutline.glsl` — New file

```glsl
shader_type canvas_item;

uniform sampler2D sdf_texture : hint_default_white;
uniform vec4 outline_color : source_color = vec4(1.0, 1.0, 1.0, 1.0);
uniform float outline_width : hint_range(0.0, 0.1) = 0.02;
uniform float outline_softness : hint_range(0.0, 0.05) = 0.005;
uniform vec4 fill_color : source_color = vec4(0.0, 0.0, 0.0, 0.0);

void fragment() {
    float d = texture(sdf_texture, UV).r;
    float edge = 0.5;
    
    // Fill
    float fill = smoothstep(edge + 0.003, edge - 0.003, d);
    
    // Outline band
    float outer = smoothstep(edge + outline_width + outline_softness,
                             edge + outline_width - outline_softness, d);
    float inner = smoothstep(edge - outline_softness, edge + outline_softness, d);
    float outline = outer * inner;
    
    vec4 result = mix(fill_color * fill, outline_color, outline);
    result.a = max(fill * fill_color.a, outline);
    COLOR = result;
}
```

#### `shared/src/effects/shaders/sprite/sdfShadow.glsl` — New file

```glsl
shader_type canvas_item;

uniform sampler2D sdf_texture : hint_default_white;
uniform vec4 shadow_color : source_color = vec4(0.0, 0.0, 0.0, 0.5);
uniform vec2 shadow_offset = vec2(0.02, 0.02);
uniform float shadow_blur : hint_range(0.0, 0.1) = 0.03;
uniform vec4 fill_color : source_color = vec4(1.0, 1.0, 1.0, 1.0);

void fragment() {
    float d = texture(sdf_texture, UV).r;
    float d_shadow = texture(sdf_texture, UV - shadow_offset).r;
    float edge = 0.5;
    
    // Fill
    float fill = smoothstep(edge + 0.003, edge - 0.003, d);
    
    // Shadow (offset + blurred)
    float shadow = smoothstep(edge + shadow_blur, edge - shadow_blur, d_shadow);
    shadow *= (1.0 - fill);  // don't show shadow under fill
    
    COLOR = fill_color * fill + shadow_color * shadow;
    COLOR.a = max(fill, shadow * shadow_color.a);
}
```

#### Register in shader library

```typescript
// shared/src/effects/shaders/sprite/sdfGlow.meta.ts
export const meta: ShaderLibraryEntry = {
  id: "sdfGlow",
  glsl: sdfGlowGlsl,
  paramsSchema: [
    { key: "glow_color", uniformName: "glow_color", type: "color",
      defaultValue: [0.0, 1.0, 1.0, 1.0], ui: { displayName: "Glow Color" } },
    { key: "glow_spread", uniformName: "glow_spread", type: "float",
      defaultValue: 0.08, ui: { displayName: "Glow Spread", min: 0.0, max: 0.3 } },
    { key: "glow_intensity", uniformName: "glow_intensity", type: "float",
      defaultValue: 2.0, ui: { displayName: "Intensity", min: 0.0, max: 5.0 } },
    { key: "fill_color", uniformName: "fill_color", type: "color",
      defaultValue: [0.1, 0.1, 0.1, 1.0], ui: { displayName: "Fill Color" } },
    { key: "pulse_speed", uniformName: "pulse_speed", type: "float",
      defaultValue: 0.0, ui: { displayName: "Pulse Speed", min: 0.0, max: 10.0 } },
  ],
  aiHints: {
    description: "SDF-powered glow effect with perfect edges, optional pulse",
    aliases: ["sdf glow", "neon", "vector glow", "shape glow"],
    category: "glow",
    combinability: ["sdfOutline", "sdfShadow"],
  },
};
```

---

## 7. Bridge Method Signatures

#### `godot_project/scripts/bridge/generated/BridgeMethodMap.gd` — Add entries

```gdscript
# Shape manipulation
"addShape": "add_shape",
"removeShape": "remove_shape",
"setShapeProperty": "set_shape_property",

# SDF
"renderEntitySDF": "render_entity_sdf",
"invalidateEntitySDF": "invalidate_entity_sdf",
```

#### `app/lib/godot/types.ts` — GodotBridge interface additions

```typescript
interface GodotBridge {
  // ...existing...
  
  // Shape manipulation
  addShape(entityId: string, shapeJson: string): void;
  removeShape(entityId: string, shapeId: string): void;
  setShapeProperty(entityId: string, shapeId: string, 
                   prop: string, value: string): void;
  
  // SDF
  renderEntitySDF(entityId: string): void;
  invalidateEntitySDF(entityId: string): void;
}
```

#### WorldOps implementation in ScriptContext

```typescript
// app/lib/game-engine/systems/runner/wrappers/WorldOpsImpl.ts

async addShape(entityId: string, shape: ShapeDefinition): Promise<string> {
  const id = shape.id ?? `shape_${Date.now()}`;
  shape.id = id;
  this.bridge.addShape(entityId, JSON.stringify(shape));
  return id;
}

async removeShape(entityId: string, shapeId: string): Promise<void> {
  this.bridge.removeShape(entityId, shapeId);
}

async setShapeProperty(
  entityId: string, shapeId: string, 
  prop: string, value: unknown
): Promise<void> {
  this.bridge.setShapeProperty(entityId, shapeId, prop, JSON.stringify(value));
}

async applyEffect(
  entityId: string, effectName: string, 
  params?: Record<string, unknown>
): Promise<void> {
  this.bridge.applySpriteEffect(entityId, effectName, 
    params ? JSON.stringify(params) : "{}");
}

async removeEffect(entityId: string): Promise<void> {
  this.bridge.clearSpriteEffect(entityId);
}
```

---

## 8. Animation Property Paths

For compound shapes, scripts and the expression system need to address sub-shapes:

```
// Direct shape properties (entity-level visual):
visual.fill         → entity fill color
visual.opacity      → entity opacity
visual.radius       → circle radius

// Compound child properties (by id):
visual.children.head.fill        → child "head" fill color
visual.children.head.rotation    → child "head" rotation
visual.children.arm_left.y       → child "arm_left" y offset

// Compound child properties (by index fallback):
visual.children[0].fill          → first child fill color
visual.children[2].rotation      → third child rotation
```

The bridge `setShapeProperty` method handles resolution:

```gdscript
func _js_set_shape_property(args: Array) -> void:
    var entity_id = str(args[0])
    var shape_id = str(args[1])  # id or index
    var prop = str(args[2])
    var value = args[3]
    
    var node = _get_entity(entity_id)
    if node == null: return
    
    var shape_node = _find_shape_node(node, shape_id)
    if shape_node == null: return
    
    match prop:
        "fill", "color":
            if shape_node is Polygon2D:
                shape_node.color = Color.from_string(str(value), Color.WHITE)
        "opacity":
            shape_node.modulate.a = float(value)
        "rotation":
            shape_node.rotation = -float(value)
        "x":
            shape_node.position.x = float(value) * _pixels_per_meter
        "y":
            shape_node.position.y = -float(value) * _pixels_per_meter
        "scale":
            var s = float(value)
            shape_node.scale = Vector2(s, s)
        "visible":
            shape_node.visible = bool(value)
    
    # Invalidate SDF cache for this entity
    if _sdf_renderer:
        _sdf_renderer.invalidate(entity_id)
```

---

## 9. Example Games

### Example 1: Flat-Style Platformer Character

```json
{
  "prefabs": {
    "player": {
      "archetype": "dynamic",
      "visual": {
        "type": "compound",
        "children": [
          { "id": "body", "type": "roundedRect", "width": 0.8, "height": 1.2,
            "cornerRadius": 0.15, "fill": "#4ECDC4", "colliderId": "body" },
          { "id": "head", "type": "circle", "y": 0.9, "radius": 0.35,
            "fill": "#FFE66D", "colliderId": "head" },
          { "id": "eye_left", "type": "circle", "x": -0.12, "y": 0.95,
            "radius": 0.08, "fill": "#333333" },
          { "id": "eye_right", "type": "circle", "x": 0.12, "y": 0.95,
            "radius": 0.08, "fill": "#333333" },
          { "id": "mouth", "type": "arc", "y": 0.8, "radius": 0.15,
            "startAngle": 3.5, "endAngle": 5.9, "stroke": "#333333", "strokeWidth": 0.04 }
        ]
      },
      "effects": ["sdfGlow"],
      "physics": { "bodyType": "dynamic", "gravityScale": 1.0 },
      "scriptRef": "PlayerController"
    }
  }
}
```

### Example 2: Geometry Wars-Style Game

```json
{
  "prefabs": {
    "player_ship": {
      "visual": {
        "type": "triangle",
        "radius": 0.4,
        "fill": "#00FFFF",
        "stroke": "#FFFFFF",
        "strokeWidth": 0.03
      },
      "effects": ["sdfGlow"],
      "physics": { "bodyType": "dynamic", "gravityScale": 0 }
    },
    "enemy_diamond": {
      "visual": {
        "type": "star",
        "outerRadius": 0.3,
        "points": 4,
        "innerRatio": 0.6,
        "fill": "#FF0066"
      },
      "effects": ["sdfGlow"]
    },
    "powerup": {
      "visual": {
        "type": "star",
        "outerRadius": 0.25,
        "points": 5,
        "innerRatio": 0.4,
        "fill": "#FFD700"
      },
      "effects": ["sdfGlow"]
    }
  },
  "effects": {
    "graph": {
      "id": "retro_screen",
      "scope": "screen",
      "nodes": [
        { "id": "bloom", "type": "bloom", "family": "filter",
          "params": { "intensity": 0.4 } },
        { "id": "scanlines", "type": "scanlines", "family": "filter",
          "params": { "intensity": 0.15 } }
      ]
    }
  }
}
```

### Example 3: Card Game with Holographic Effect

```json
{
  "prefabs": {
    "card": {
      "visual": {
        "type": "compound",
        "children": [
          { "id": "bg", "type": "roundedRect", "width": 2.5, "height": 3.5,
            "cornerRadius": 0.2, "fill": "#FFFFFF",
            "stroke": "#CCCCCC", "strokeWidth": 0.03 },
          { "id": "art", "type": "image", "y": 0.3,
            "whatDescription": "a fierce dragon" },
          { "id": "title_bg", "type": "roundedRect", "y": -1.2,
            "width": 2.2, "height": 0.4, "cornerRadius": 0.08,
            "fill": "#1A1A2E" },
          { "id": "cost_circle", "type": "circle", "x": -0.9, "y": 1.5,
            "radius": 0.25, "fill": "#E94560" }
        ]
      }
    },
    "card_rare": {
      "visual": { "type": "compound", "children": ["...same as card..."] },
      "effects": ["holographic"]
    }
  }
}
```

### Example 4: Script-Driven Shape Animation

```javascript
// modules/PlayerController.js
exports.onStart = async (ctx) => {
  // Blink animation
  ctx.setInterval(async () => {
    // Close eyes
    await ctx.setShapeProperty(ctx.entityId, "eye_left", "scale", 0.1);
    await ctx.setShapeProperty(ctx.entityId, "eye_right", "scale", 0.1);
    await ctx.wait(150);
    // Open eyes
    await ctx.setShapeProperty(ctx.entityId, "eye_left", "scale", 1.0);
    await ctx.setShapeProperty(ctx.entityId, "eye_right", "scale", 1.0);
  }, 3000);
};

exports.onUpdate = (ctx) => {
  // Breathing animation on body
  const breathe = 1.0 + 0.02 * Math.sin(ctx.time * 2.0);
  ctx.setShapeProperty(ctx.entityId, "body", "scale", breathe);
};

exports.onCollision = async (ctx, other) => {
  if (other.tags.includes("enemy")) {
    // Flash red on hit
    ctx.setShapeProperty(ctx.entityId, "body", "fill", "#FF0000");
    await ctx.wait(100);
    ctx.setShapeProperty(ctx.entityId, "body", "fill", "#4ECDC4");
  }
};
```

---

## 10. Open Questions / Deferred Decisions

These can be decided during implementation:

1. **Compound + joints for ragdolls**: Deferred to a future phase. The `joint` field on compound children would auto-create PinJoint2D between shapes. Start with visual-only compounds first, add joints when a game needs them.

2. **SDF for polygons/lines**: The SDF shader currently handles circles, roundedRects, stars, hexagons, triangles (all have analytical SDFs). Arbitrary polygons and lines would need a polygon-SDF shader (more complex). Defer — these shapes can still get raster-based effects via existing `glow.glsl`.

3. **SDF texture resolution**: Default to entity bounding-box size × 2 (retina). Allow override via `sdfResolution` field if needed.

4. **Compound depth limit**: Start with unlimited recursion. If performance is an issue, add a depth limit (2-3 levels). In practice nobody will nest deeper than that.

5. **Shape removal physics**: When `removeShape()` removes a shape with a `colliderId`, the CollisionShape2D should also be removed. The entity's mass may need recalculation.

6. **SDF channel encoding**: Current plan uses R channel only (grayscale distance). Could encode per-shape color info in G/B/A channels later for multi-color SDF effects. Start with single-channel.

---

## 11. Implementation Checklist (Detailed)

### Phase 1: Shape Primitives ✦ 1 day

```
Files to create:
  (none — all changes to existing files)

Files to modify:
  shared/src/types/visual.ts
    □ Add RoundedRectShape, LineShape, ArcShape, StarShape, 
      HexagonShape, TriangleShape, CompoundShape interfaces
    □ Add ShapeDefinition union type
    □ Update VisualComponent union to include ShapeDefinition

  shared/src/types/schemas.ts
    □ Add Zod schemas for each new shape type
    □ Add ShapeDefinitionSchema (discriminatedUnion)
    □ Update VisualComponentSchema

  godot_project/scripts/bridge/VisualRenderer.gd
    □ Add match cases: roundedRect, line, arc, star, hexagon, triangle
    □ Add _add_stroke_if_needed() helper
    □ Handle fill/color alias in fill_color resolution

Tests:
  shared/src/types/__tests__/visual.test.ts
    □ Validate each new shape schema
    □ Validate backward compat (old rect/circle/polygon still work)
```

### Phase 2: Compound Shapes ✦ 2 days

```
Files to modify:
  godot_project/scripts/bridge/VisualRenderer.gd
    □ Add "compound" match case with recursive child creation
    □ Local transform application (position, rotation, scale)
    □ Z-ordering (array index = back-to-front)

  shared/src/types/schemas.ts
    □ CompoundShapeSchema with z.lazy() for recursion

Tests:
  □ Compound with 3+ children renders correctly
  □ Nested compounds (compound inside compound) work
  □ Local transforms compose correctly
```

### Phase 3: Per-Shape Physics ✦ 1 day

```
Files to modify:
  godot_project/scripts/bridge/EntityFactory.gd (or PhysicsBody.gd)
    □ _create_colliders_from_shapes() — scan visual for colliderId
    □ _create_collider_for_shape() — generate CollisionShape2D
    □ Support multiple colliders per body

  godot_project/scripts/bridge/GameBridge.gd
    □ Include shape name in collision event data

Tests:
  □ Entity with colliderId gets CollisionShape2D
  □ Compound with 2 colliderIds gets 2 CollisionShape2Ds
  □ Collision callback includes colliderId
```

### Phase 4: SDF Texture Pipeline ✦ 2 days

```
Files to create:
  godot_project/scripts/bridge/SDFRenderer.gd
    □ Full implementation (see section 5)

  godot_project/shaders/sdf_multi_shape.gdshader
    □ Multi-shape SDF shader with data texture input (see plan)

Files to modify:
  godot_project/scripts/bridge/GameBridgeEffects.gd
    □ Instantiate SDFRenderer
    □ _apply_entity_effect_with_sdf() — auto-generate SDF when needed
    □ Bind sdf_texture as shader parameter

  shared/src/effects/types.ts
    □ Add "entitySDF" to EffectType union (for graph node type)

Tests:
  □ SDF renders for single circle
  □ SDF renders for compound (3+ shapes)
  □ SDF cache hit when shapes unchanged
  □ SDF cache invalidates when shape property changes
```

### Phase 5: Built-in SDF Effects ✦ 1 day

```
Files to create:
  shared/src/effects/shaders/sprite/sdfGlow.glsl
  shared/src/effects/shaders/sprite/sdfGlow.meta.ts
  shared/src/effects/shaders/sprite/sdfOutline.glsl
  shared/src/effects/shaders/sprite/sdfOutline.meta.ts
  shared/src/effects/shaders/sprite/sdfShadow.glsl
  shared/src/effects/shaders/sprite/sdfShadow.meta.ts

Files to modify:
  shared/src/effects/shaders/index.ts
    □ Import and register sdfGlow, sdfOutline, sdfShadow
  
  shared/src/effects/types.ts
    □ Add "sdfGlow", "sdfOutline", "sdfShadow" to EffectType

  shared/src/types/entity.ts (or prefab type)
    □ Add optional effects?: string[] field to EntityPrefab

  shared/src/effects/resolveShorthand.ts (new file)
    □ resolveEffectShorthand() — maps effect names to full config

Tests:
  □ sdfGlow shader compiles
  □ sdfOutline shader compiles
  □ sdfShadow shader compiles
  □ effects: ["sdfGlow"] resolves to valid entity effect
```

### Phase 6: Script API ✦ 1 day

```
Files to modify:
  shared/src/types/world-ops.ts
    □ Add addShape, removeShape, setShapeProperty
    □ Add applyEffect, removeEffect

  app/lib/game-engine/systems/runner/wrappers/WorldOpsImpl.ts
    □ Implement addShape, removeShape, setShapeProperty
    □ Implement applyEffect, removeEffect

  godot_project/scripts/bridge/GameBridge.gd
    □ Register add_shape, remove_shape, set_shape_property methods

  godot_project/scripts/bridge/generated/BridgeMethodMap.gd
    □ Add camelCase → snake_case mappings

Tests:
  □ addShape creates visual node
  □ removeShape removes visual node
  □ setShapeProperty updates fill color
  □ setShapeProperty invalidates SDF cache
  □ applyEffect applies shader to entity
```
