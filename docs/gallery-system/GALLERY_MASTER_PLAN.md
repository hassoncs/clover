# Master Plan: Discoverable Engine Capabilities via Visual Gallery

> **Goal**: Make every game-engine capability (visual, physics, logic, and configuration) *discoverable, previewable, and reusable* through a unified gallery experience that works for both developers (Storybook) and end-users (in-app on mobile).

This document inventories what exists, identifies gaps, and proposes a minimal architecture + file structure to implement:
- **Tier 1**: Game Templates (complete, editable games)
- **Tier 2**: Component Gallery (all building blocks)
- **Tier 3**: JSON Editor (power-user authoring)

---

## Executive Summary

**Primary recommendation**: Implement a **single shared "Gallery Registry" + "Gallery Runtime"** in shared code, and render it in **two surfaces**:
1. **In-app gallery** (user-facing, mobile-first)
2. **Storybook** (developer-facing, faster iteration, QA)

This avoids duplicating demos while still taking advantage of Storybook for rapid development. The in-app gallery becomes the "product surface" for discovery, while Storybook remains the "engineering surface" for verification and evolution.

**Effort estimate**: 
- Medium (1–2d) for foundation + Effects/Particles parity
- Large (3d+) to fully cover behaviors + physics interactives + templates + JSON editor polish

---

## 1. Capability Inventory (What the Engine Can Do)

### A) Visual Effects (18 types)

**Source**: `shared/src/types/effects.ts`  
**Existing Gallery**: `app/components/examples/EffectsGallery.tsx`

| Category | Effects |
|----------|---------|
| **Glow** | `glow`, `innerGlow`, `dropShadow`, `rimLight` |
| **Distortion** | `pixelate`, `dissolve`, `waveDistortion`, `shockwave`, `chromaticAberration` |
| **Color** | `tint`, `posterize`, `colorMatrix` |
| **Post-Process** | `vignette`, `scanlines`, `blur`, `motionBlur` |
| **Artistic** | `outline`, `holographic` |

**Capabilities**:
- Parameterized shader effects with `min/max/step` metadata
- Default values, displayName, description, category
- Full `EFFECT_METADATA` already exists

**Discoverability Status**: ✅ **Good** (has metadata + gallery)

---

### B) Particle Emitters (10 presets)

**Source**: `shared/src/types/particles.ts`  
**Existing Playground**: `app/components/examples/ParticlePlayground.tsx`

| Preset | Description |
|--------|-------------|
| `fire` | Flickering flames rising upward |
| `smoke` | Billowing clouds that drift and fade |
| `sparks` | Quick bright particles that spray out |
| `magic` | Sparkly particles that orbit and shimmer |
| `explosion` | Sudden burst of particles outward |
| `rain` | Falling droplets from above |
| `snow` | Gentle snowflakes drifting down |
| `bubbles` | Rising spheres that pop |
| `confetti` | Colorful celebration burst |
| `custom` | Configure your own particle effect |

**Capabilities**:
- CPU particle simulation presets + emitter configuration
- `PARTICLE_EMITTER_METADATA` includes displayName/description/icon
- Full config: emission, lifetime, speed, gravity, colors, shapes

**Discoverability Status**: ⚠️ **Partial**
- Has playground, but not "gallery item per preset" with consistent UI + JSON export

---

### C) Behaviors (17 types)

**Source**: `shared/src/types/behavior.ts`  
**Existing Gallery**: ❌ **None**

| Category | Behaviors |
|----------|-----------|
| **Movement** | `move`, `rotate`, `rotate_toward`, `follow`, `bounce`, `oscillate` |
| **Control** | `control` (tap_to_jump, tap_to_shoot, drag_to_aim, drag_to_move, tilt_to_move, tilt_gravity, buttons) |
| **Combat/Interaction** | `destroy_on_collision`, `score_on_collision`, `score_on_destroy`, `health` |
| **Spawning** | `spawn_on_event`, `timer` |
| **Physics-ish** | `gravity_zone`, `magnetic`, `draggable` |
| **Animation** | `animate` |

**Capabilities**:
- Entity logic modules (some require input, collisions, world events)
- Some are "systems" rather than "components" (e.g., control modes, triggers)

**Discoverability Status**: ❌ **Gap (major)**

---

### D) Physics System (Godot-based)

**Source**: `packages/physics/`, `shared/src/types/physics.ts`  
**Existing Stories**: `FallingBoxes.stories.tsx`, `Interaction.stories.tsx`

| Category | Features |
|----------|----------|
| **Bodies** | `static`, `dynamic`, `kinematic` |
| **Shapes** | `box`, `circle`, `polygon` |
| **Joints** | `revolute`, `distance`, `prismatic`, `mouse`, `weld` |
| **Material/Properties** | `density`, `friction`, `restitution`, `isSensor`, `fixedRotation`, `bullet` |
| **Forces** | `applyForce`, `applyImpulse`, `applyTorque` |
| **Queries** | Collision callbacks, raycasting, AABB queries |

**Discoverability Status**: ⚠️ **Partial**
- Exists in Storybook, but not organized as browsable "feature gallery"
- Not surfaced in-app

---

### E) Sprite Types

**Source**: `shared/src/types/sprite.ts`

| Type | Properties |
|------|------------|
| `rect` | width, height, color |
| `circle` | radius, color |
| `polygon` | vertices, color |
| `image` | imageUrl, imageWidth, imageHeight |

**Common Props**: color, strokeColor, strokeWidth, opacity, shadow, tint, effects

**Discoverability Status**: ❌ **Gap** (no sprite gallery)

---

### F) Game Configuration System

**Source**: `shared/src/types/schemas.ts`, `api/src/ai/schemas.ts`

| Config | Purpose |
|--------|---------|
| `GameDefinition` | metadata, world, camera, ui, templates, entities, rules, win/lose |
| `EntityTemplate` | Reusable entity blueprint |
| `WorldConfig` | gravity, pixelsPerMeter, bounds |
| `CameraConfig` | fixed/follow, zoom, bounds |
| `UIConfig` | showScore, showTimer, showLives |
| `Rules` | triggers + actions |
| `Win/Lose` | Conditions for game end |

**Discoverability Status**: ❌ **Gap** (no UI explaining/previewing configs)

---

### G) Existing Example Games (20)

**Source**: `app/app/examples/`

```
top_down_asteroids, slingshot, rope_swing, ragdoll, pendulum,
particle_playground, parallax_demo, newtons_cradle, magnet_playground,
liquid_illusion, interaction, effects_gallery, dominoes, destructible_tower,
car, bridge, pinball, avalanche
```

**Discoverability Status**: ⚠️ **Good raw content**, but:
- Not structured as "Templates" vs "Demos"
- No consistent "what does this demonstrate" metadata
- No JSON export/clone workflow

---

## 2. Gap Analysis

### Missing Galleries (Highest Impact)

| Capability | Gap | Priority |
|------------|-----|----------|
| **Behaviors** | No gallery at all - biggest blind spot | 🔴 High |
| **Sprite Types** | No preview grid + common props editor | 🟡 Medium |
| **Physics Features** | Needs structured coverage beyond 2 stories | 🟡 Medium |

### Existing But Not Standardized

| Capability | Issue |
|------------|-------|
| **Particles** | Playground exists, needs per-preset gallery + consistent controls + export |
| **Examples** | Exist, need metadata + template/demonstration separation |

### Cross-Cutting Gaps

- No shared "gallery item" contract (preview + controls + export + docs)
- No single navigation structure across all capability categories
- No consistent "copy JSON / insert into game definition" path

---

## 3. Proposed Gallery Architecture

### Primary Decision: In-app + Storybook, Powered by One Shared Registry

```
┌─────────────────────────────────────────────────────────┐
│                  Gallery Registry                        │
│  (shared/src/gallery/registry.ts)                       │
│  - Single source of truth for all gallery items         │
│  - Each item: id, title, description, params, makeScene │
└─────────────┬───────────────────────────┬───────────────┘
              │                           │
              ▼                           ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│     In-App Gallery      │   │       Storybook         │
│  (User-facing, mobile)  │   │  (Dev-facing, web)      │
│  - Discovery            │   │  - Fast iteration       │
│  - "Add to game" flows  │   │  - QA/regression        │
│  - JSON export          │   │  - Dev controls         │
└─────────────────────────┘   └─────────────────────────┘
```

### Gallery Item Contract (Minimal)

```typescript
interface GalleryItem {
  id: string;
  title: string;
  description: string;
  category: GalleryCategory;
  tags: string[];
  kind: 'effect' | 'particle' | 'behavior' | 'physics' | 'sprite' | 'template' | 'config';
  
  paramsSchema: ParamDefinition[];  // UI-friendly param definitions
  defaultParams: Record<string, unknown>;
  
  makeScene(params: Params): Scene;      // Returns runnable demo
  makeExport(params: Params): JSONExport; // Returns JSON snippet
}
```

### Making Behaviors Demonstrable

Behaviors are logic, not visual. Solution: **Behavior Sandbox** with:

1. **Canonical World**: Ground plane, bounds, camera
2. **Target Entity**: The "actor" with the behavior attached
3. **Secondary Entities**: Targets, obstacles as needed
4. **Input Simulation**: Virtual joystick/buttons, tap triggers, drag vectors
5. **Visual Debugging Overlays**:
   - Velocity/force/aim vectors
   - State labels (health, score, timers)
   - Event log (collision, trigger fired, action executed)
6. **Controls**: Deterministic Reset + Replay

| Behavior Category | Sandbox Recipe |
|-------------------|----------------|
| Movement | Show paths, easing, highlight target |
| Control | Display on-screen controls, input mapping |
| Combat/Interaction | Spawn colliders, show damage/score events |
| Spawning/Timer | Show timeline, spawned entities |
| Gravity/Magnetic/Draggable | Show field radius + force vectors |

### Showing Physics Interactively

Structured mini-scenes with:
- Direct manipulation (drag bodies, change joint anchors)
- Debug draw toggles (colliders, joints, contact points, AABBs)
- Parameter controls (density/friction/restitution, motor speed)
- Drop/Reset/Step controls

| Physics Section | Items |
|-----------------|-------|
| Bodies | static, dynamic, kinematic demos |
| Shapes | box, circle, polygon comparison |
| Joints | Each joint type with manipulation |
| Materials | density/friction/restitution playground |
| Collisions | Callbacks, filtering, sensors |
| Raycasting | Interactive raycast demo |

### Navigation Structure (Tier 2)

```
Gallery
├── Templates (Tier 1)
│   └── [template cards with preview]
│
├── Components (Tier 2)
│   ├── Sprites
│   │   └── rect, circle, polygon, image
│   ├── Effects
│   │   └── [18 effect types by category]
│   ├── Particles
│   │   └── [10 presets]
│   ├── Behaviors
│   │   └── [17 behavior types by category]
│   └── Physics
│       └── [bodies, shapes, joints, materials, collisions, raycasting]
│
├── Config
│   ├── World
│   ├── Camera
│   ├── UI
│   ├── Rules
│   └── Win/Lose Conditions
│
└── JSON Editor (Tier 3)
```

---

## 4. Proposed File Structure

### Shared Registry + Runtime

```
shared/src/gallery/
├── registry.ts          # Central registry of all items
├── types.ts             # GalleryItem, ParamDefinition, etc.
├── categories.ts        # Category definitions
│
├── items/
│   ├── effects/         # One file per effect or grouped
│   ├── particles/       # One file per preset
│   ├── behaviors/       # One file per behavior
│   ├── physics/         # Bodies, shapes, joints, etc.
│   ├── sprites/         # Sprite type demos
│   ├── templates/       # Game template definitions
│   └── config/          # World, camera, UI, rules items
│
└── runtime/
    ├── SceneHost.tsx    # Runs a scene
    ├── controls/        # Param control primitives
    ├── export/          # JSON/code formatting helpers
    └── sandbox/         # Behavior sandbox recipes, physics debug UI
```

### In-App Surface (Expo Router)

```
app/app/gallery/
├── _layout.tsx
├── index.tsx                    # Section grid
├── [section]/
│   ├── index.tsx               # Items grid
│   └── [id].tsx                # Item detail

app/components/gallery/
├── GalleryGrid.tsx
├── GalleryDetail.tsx
├── GalleryPreview.tsx
├── GalleryControls.tsx
└── GalleryExport.tsx
```

### Storybook Surface

```
packages/ui/src/stories/gallery/
├── effects.stories.tsx
├── particles.stories.tsx
├── behaviors.stories.tsx
├── physics.stories.tsx
├── sprites.stories.tsx
└── templates.stories.tsx
```

---

## 5. Gallery Item Detail Page (Standard Layout)

Every item detail page includes:

### 1. Visual Preview
- Live scene with stable camera
- "Reset" button
- Optional "Challenge mode" toggle

### 2. Parameter Controls
- Auto-generated from `paramsSchema`
- Numeric sliders, toggles, selects, color pickers
- "Restore defaults" button

### 3. Export
- **"Copy JSON"** (component snippet or entity template)
- **"Copy GameDefinition fragment"** when appropriate
- Optional: "Copy TS snippet"

### 4. Usage Examples
- "Where does this go?" mapping:
  - Effects → `sprite.effects`
  - Particles → entity emitter config
  - Behaviors → entity `behaviors[]`
  - Physics → entity `physics` / world settings
- Links to 1–2 existing demos that use it

**Completion criteria**: An item is "done" when it has **preview + controls + JSON export**.

---

## 6. The 3-Tier System

### Tier 1: Game Templates (High-Level)

**Definition**: Curated "starter games" users can customize with assets and small knobs.

**Implementation**:
1. Reclassify existing examples into:
   - "Template-ready" (clear gameplay loop, minimal dev-only controls)
   - "Showcase" (physics experiments, debugging demos)
2. Add template metadata:
   - title, description, difficulty, controls, key concepts, required assets
3. Provide flows:
   - "Create from template" → clones into user workspace
   - "Swap images" UI → updates `imageUrl` fields

**Output**: Templates become the friendly front door.

---

### Tier 2: Component Gallery (Mid-Level)

**Definition**: Exhaustive "what building blocks exist" inventory.

**Implementation**:
- Registry-driven sections (Sprites/Effects/Particles/Behaviors/Physics/Config)
- Each item offers copy/export to accelerate game composition

**Output**: Users can answer "what can the engine do?" in 2 minutes.

---

### Tier 3: JSON Editor (Low-Level)

**Definition**: Simple, safe editor for `GameDefinition` authoring.

**Implementation** (pragmatic path):
1. **Read-only viewer first**: Shows current game JSON, searchable, copyable
2. **Editable JSON**:
   - Schema-aware validation errors
   - "Apply & reload" button
   - Revert-to-last-good

**Output**: Power users can build and debug without leaving the app.

---

## 7. Implementation Priority

### Phase 0 — Foundation (Must-Have)
- Build shared registry/types
- Create single in-app gallery shell
- Implement standard Gallery Detail layout

**Effort**: Short (1–4h)

### Phase 1 — Quick Wins (Prove the System)
- Migrate Effects into registry-driven items (reuse existing metadata)
- Convert particle presets into individual gallery items

**Effort**: Short–Medium (1–2d)

### Phase 2 — Behaviors (Largest Gap)
- Implement Behavior Sandbox runtime
- Create first 6–8 behavior items
- Add input simulation + overlays + event log

**Effort**: Medium–Large (1–3d+)

### Phase 3 — Physics (Structured Coverage)
- Wrap existing physics stories into gallery items
- Add mini-scenes for joints/materials/raycasting
- Add debug draw + manipulation tools

**Effort**: Large (3d+)

### Phase 4 — Templates (Tier 1 Product Surface)
- Add template metadata + catalog UI
- Add "create from template" + asset swapper

**Effort**: Medium (1–2d)

### Phase 5 — JSON Editor (Tier 3)
- JSON viewer → editable editor with validation

**Effort**: Medium (1–2d)

---

## 8. Technical Considerations

### Storybook (Web) vs In-App (Mobile)

| Surface | Best For |
|---------|----------|
| **Storybook** | Engineering iteration, internal docs, QA |
| **In-App** | User discovery, touch-friendly, offline |

**Recommendation**: Support both, backed by shared registry.

### Performance

- Load gallery sections lazily (route-level code splitting)
- Grid uses thumbnails / lightweight previews
- Defer heavy demos until detail page
- Provide "reduced complexity" toggle for low-end devices

### Consistent UI Patterns

- One detail layout for all items: Preview → Controls → Export → Examples
- One param schema format everywhere
- One "Reset/Replay" affordance everywhere

### Determinism and Testability

- Use deterministic seeds for particle/physics demos
- Add "Step" mode for physics items (Storybook first)

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Behavior demos become ambiguous | Event log + overlays + reset + minimal scenes |
| Physics demos are performance-heavy | Cap body counts, quality toggles, lazy-load |
| Registry becomes a dumping ground | Keep item contract minimal; enforce "preview + export" as completion criteria |

---

## 10. Future Considerations

**Revisit architecture if**:
- User-generated gallery items needed (uploadable plugins)
- Remote catalogs / marketplace distribution
- Multi-document editing with references across JSON files

**Advanced path** (not recommended initially):
- Formal "capability DSL" with schema compilation
- Remote indexing + searchable documentation pipeline
- Snapshot testing for every gallery item preview

---

## Quick Reference

### Current Coverage

| Capability | Items | Gallery | Metadata | Priority |
|------------|-------|---------|----------|----------|
| Effects | 18 | ✅ | ✅ | Done |
| Particles | 10 | ⚠️ Playground | ✅ | Phase 1 |
| Behaviors | 17 | ❌ | ❌ | Phase 2 |
| Physics | Many | ⚠️ 2 stories | ❌ | Phase 3 |
| Sprites | 4 | ❌ | ❌ | Phase 1 |
| Config | Many | ❌ | ❌ | Phase 5 |
| Templates | 20 examples | ❌ | ❌ | Phase 4 |

### File Locations

| What | Where |
|------|-------|
| Effect types/metadata | `shared/src/types/effects.ts` |
| Particle presets/metadata | `shared/src/types/particles.ts` |
| Behavior types | `shared/src/types/behavior.ts` |
| Physics types | `shared/src/types/physics.ts` |
| Sprite types | `shared/src/types/sprite.ts` |
| Game schemas | `shared/src/types/schemas.ts`, `api/src/ai/schemas.ts` |
| Existing Effects Gallery | `app/components/examples/EffectsGallery.tsx` |
| Existing Particle Playground | `app/components/examples/ParticlePlayground.tsx` |
| Example games | `app/app/examples/*.tsx` |
