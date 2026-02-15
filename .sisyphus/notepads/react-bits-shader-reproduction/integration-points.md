# Slopcade Shader Integration Points

## How to Add a New Shader

### Step 1: Create `.glsl` file
- Location: `shared/src/effects/shaders/post/{name}.glsl` (for post-process) or `sprite/{name}.glsl` (for sprite)
- Must use Godot Shading Language, NOT WebGL GLSL
- Translation map:
  - `void main()` → `void fragment()`
  - `gl_FragColor` → `COLOR`
  - `gl_FragCoord` → `FRAGCOORD`
  - `uniform float u_time` → use built-in `TIME`
  - `uniform vec2 u_resolution` → use `1.0/SCREEN_PIXEL_SIZE`
  - Add `shader_type canvas_item;` at top
  - Uniforms declared as `uniform float param_name : hint_range(min, max) = default;`
- Can use `#include "../_lib/noise.glsl"` for shared utilities

### Step 2: Create `.meta.ts` sidecar
- Location: Same directory as `.glsl`, named `{name}.meta.ts`
- Pattern (from `bloom.meta.ts`):
```typescript
import type { ShaderLibraryEntry } from "../../shaderRegistry";
import glsl from "./{name}.glsl";

export const meta: ShaderLibraryEntry = {
  id: "{name}",
  glsl: glsl,
  paramsSchema: [
    {
      key: "paramKey",
      uniformName: "godot_uniform_name",
      type: "float",
      defaultValue: 1.0,
      ui: { displayName: "Display Name", min: 0.0, max: 5.0, step: 0.1 },
    },
  ],
  aiHints: {
    description: "...",
    aliases: ["..."],
    category: "distort" | "color" | "blur" | "generator" | "composite" | "glow" | "artistic" | "utility",
    combinability: ["otherShader1", "otherShader2"],
  },
};
```

### Step 3: Add to barrel `shared/src/effects/shaders/index.ts`
- Import the `.glsl` file: `import {name}Glsl from "./post/{name}.glsl";`
- Import the meta: `import { meta as {name}Meta } from "./post/{name}.meta";`
- Add to `SHADER_LIBRARY`: `{name}: {name}Glsl,`
- Add to `SHADER_REGISTRY`: `{name}: {name}Meta,`

### Step 4: Add to `EffectType` union in `shared/src/effects/types.ts`
- Add `| '{name}'` to the `EffectType` union type

### Step 5: (Optional) Add to example page
- Example pages under `app/app/examples/`
- Reference: `app/app/examples/vfx_showcase.tsx`

## Key Files Reference

| File | Role |
|------|------|
| `shared/src/effects/shaders/index.ts` | Barrel: assembles SHADER_LIBRARY + SHADER_REGISTRY from .glsl + .meta.ts files |
| `shared/src/effects/shaders/post/*.glsl` | Post-process shader GLSL source (Godot Shading Language) |
| `shared/src/effects/shaders/sprite/*.glsl` | Sprite shader GLSL source |
| `shared/src/effects/shaders/_lib/*.glsl` | Shared GLSL utilities (noise, math) |
| `shared/src/effects/types.ts` | EffectType union, EffectParamSchema, UniformType |
| `shared/src/effects/compiler.ts` | Graph → CompiledPlan (uses getShaderGlsl) |
| `shared/src/effects/shaderLibrary.ts` | Re-exports from barrel (thin wrapper) |
| `shared/src/effects/shaderRegistry.ts` | Re-exports from barrel (thin wrapper) |
| `godot_project/scripts/effects/GraphExecutor.gd` | Runtime uniform application, material setup |
| `app/components/effects/EffectTuningPanel.tsx` | UI control rendering from paramsSchema |
| `app/components/effects/EffectParamControl.tsx` | Individual input controls |

## Runtime Hot-Path

Param updates flow: UI slider → `effectsUpdateParams` → bridge → `GraphExecutor.gd` → `ShaderMaterial.set_shader_parameter()`
- NO graph rebuild needed for param changes
- Only uniform values are updated
- Schema `ui.min`, `ui.max` enforce clamping on the frontend

## ShaderLibraryEntry Shape

```typescript
interface ShaderLibraryEntry {
  id: string;
  glsl: string;
  paramsSchema: EffectParamSchema[];
  aiHints: {
    description: string;
    aliases: string[];
    category: ShaderCategory;
    combinability: string[];
  };
  previewThumbnail?: string;
}
```

## EffectParamSchema Shape

```typescript
interface EffectParamSchema {
  key: string;
  uniformName: string;
  type: "float" | "int" | "vec2" | "vec3" | "vec4" | "color" | "bool";
  defaultValue: number | number[] | string | boolean;
  ui: {
    displayName: string;
    min?: number;
    max?: number;
    step?: number;
  };
}
```
