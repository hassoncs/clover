# Game Templates Overview

This document defines the 10 core game templates for the AI-powered game maker, along with the customization philosophy and template contract structure.

---

## Template Philosophy

### Core Principle: Identity + Creativity

Every game template has a **fixed identity** (what makes it feel like "that game") and **customizable aspects** (how users make it their own). The key is preserving the core experience while enabling meaningful personalization.

**Identity anchors:**
- **Player verbs**: The primary actions (jump, shoot, drag-aim, tilt-move)
- **Camera perspective**: Side-scroller vs top-down
- **Success condition**: What defines winning
- **Signature feedback loop**: The core satisfaction (combo scoring, destruction, distance chase)

**Customizable layers:**
- **Theme/Skin**: Visual appearance, sounds, names
- **Tuning**: Physics parameters within safe bounds
- **Content**: Level layouts, obstacles, enemy patterns

---

## Customization Levels

All templates support 3 customization tiers with a consistent UI:

### Level 1: Simple (Cosmetic)
*Target: Ages 6-9, instant gratification*

| Customizable | Examples |
|--------------|----------|
| Theme pack | Sprites, background, sounds |
| Character skin | Player appearance |
| Color scheme | Primary/secondary colors |
| Game name | Custom title |

### Level 2: Medium (Tuning)
*Target: Ages 8-12, experimentation*

| Customizable | Examples |
|--------------|----------|
| Jump Power | Affects jump impulse |
| Speed | Movement velocity |
| Bounciness | Restitution values |
| Lives/Attempts | Failure tolerance |
| Difficulty | Enemy count, obstacle density |

**Note:** "Kid-readable" sliders map to multiple physics params with safe clamps.

### Level 3: Deep (Content + Bounded Rules)
*Target: Ages 10-14, game design*

| Customizable | Examples |
|--------------|----------|
| Level layout | Obstacle/platform placement |
| Enemy patterns | Patrol paths, spawn points |
| Win condition | Score target, time survive, collect all |
| Power-ups | Which types appear |
| Challenge modes | Modifiers like wind zones |

**Guardrail:** Rules are chosen from 2-3 presets per template, not freeform.

---

## Template Tiers

Templates are classified by AI generation reliability:

### Tier 1: Fully AI-Generatable
AI can generate a complete, fun game from a natural language prompt.

| Template | Why Tier 1 |
|----------|------------|
| Endless Runner | Procedural segments, survives imperfect design |
| Breakout Bouncer | Pattern-based bricks, clear physics |
| Bumper Arena | Simple arena, minimal content needed |
| Physics Stacker | Straightforward drop mechanic |
| Ragdoll Goal Shot | Single-screen, clear objective |

### Tier 2: Template + Tuning Required
Requires careful level design or parameter tuning for optimal fun.

| Template | Why Tier 2 |
|----------|------------|
| Slingshot Destruction | Puzzle levels need validation |
| Rope Physics | Timing-sensitive, level design critical |
| Hill-Climb Vehicle | Vehicle stability requires tuning |
| Physics Platformer | Hand-authored levels matter |
| Pinball Lite | Table feel requires iteration |

---

## Template Contract Structure

Every template defines:

```typescript
interface GameTemplateContract {
  // Identity (FIXED - defines the game type)
  identity: {
    name: string;
    category: string;
    primaryVerb: string;           // "jump", "aim", "tilt", etc.
    perspective: "side" | "top-down" | "portrait";
    coreMechanic: string;
    signatureFeedback: string;
  };
  
  // Physics defaults (tunable within bounds)
  physics: {
    gravity: { x: number; y: number };
    worldSize: { width: number; height: number };
  };
  
  // Required entity templates
  requiredTemplates: string[];     // e.g., ["player", "ground", "obstacle"]
  
  // Required behaviors
  requiredBehaviors: string[];     // e.g., ["control", "destroy_on_collision"]
  
  // Win condition options (pick from preset list)
  winConditions: WinConditionType[];
  
  // Lose condition options
  loseConditions: LoseConditionType[];
  
  // Parameter bounds (safe ranges)
  parameterBounds: {
    [key: string]: { min: number; max: number; default: number };
  };
  
  // Customization allowances per level
  customization: {
    simple: string[];             // What's exposed at Level 1
    medium: string[];             // Added at Level 2
    deep: string[];               // Added at Level 3
  };
}
```

---

## The 10 Templates

| # | Template | Inspiration | Tier | Primary Verb | Perspective |
|---|----------|-------------|------|--------------|-------------|
| 1 | Slingshot Destruction | Angry Birds | 2 | drag_to_aim | Side |
| 2 | Rope Physics | Cut the Rope | 2 | tap_to_cut | Portrait |
| 3 | Endless Runner | Subway Surfers | 1 | tap_to_jump | Side |
| 4 | Hill-Climb Vehicle | Hill Climb Racing | 1-2 | tilt_to_move | Side |
| 5 | Physics Platformer | Mario | 2 | tap_to_jump | Side |
| 6 | Breakout Bouncer | Arkanoid | 1 | drag_to_move | Portrait |
| 7 | Pinball Lite | Classic Pinball | 2 | tap_to_flip | Portrait |
| 8 | Bumper Arena | Sumo games | 1 | tilt_to_move | Top-down |
| 9 | Physics Stacker | Stack games | 1 | tap_to_drop | Portrait |
| 10 | Ragdoll Goal Shot | Basketball/Golf | 1 | drag_to_aim | Side/Portrait |

---

## Box2D Features by Template

| Template | Gravity | Joints | Motors | Sensors | Forces |
|----------|---------|--------|--------|---------|--------|
| Slingshot Destruction | Yes | Distance (sling) | No | Yes | Impulse |
| Rope Physics | Yes | Distance (rope) | No | Yes | No |
| Endless Runner | Yes | No | No | Yes | Velocity |
| Hill-Climb Vehicle | Yes | Revolute | Yes | No | Motor |
| Physics Platformer | Yes | Optional | Optional | Yes | Velocity |
| Breakout Bouncer | No | No | No | No | Velocity |
| Pinball Lite | Yes | Revolute | Yes | No | Impulse |
| Bumper Arena | No | No | No | Yes | Force |
| Physics Stacker | Yes | No | No | No | No |
| Ragdoll Goal Shot | Yes | No | No | Yes | Impulse |

---

## Guardrails & Validation

### Physics Parameter Clamps

| Parameter | Min | Max | Reason |
|-----------|-----|-----|--------|
| gravity.y | 0 | 30 | Prevent floating/crushing |
| density | 0.1 | 10 | Prevent invisible/immovable |
| restitution | 0 | 1 | >1 causes instability |
| friction | 0 | 1 | Standard range |
| linearDamping | 0 | 5 | Prevent frozen objects |
| velocity | -50 | 50 | Prevent tunneling |

### Entity Count Limits

| Entity Type | Max Count | Reason |
|-------------|-----------|--------|
| Dynamic bodies | 100 | Performance |
| Static bodies | 200 | Performance |
| Joints | 50 | Complexity |
| Spawned per second | 10 | Performance |

### Rule Validation

- **Win condition reachability**: Simulate that win is possible
- **Timeout presence**: Games must have a maximum duration
- **Spawn budget**: Prevent infinite spawning
- **No impossible goals**: Score targets must be achievable

---

## Template Documentation Structure

Each template document includes:

1. **Overview**: What the game is, inspiration, target age
2. **Identity Contract**: Fixed elements that define the game
3. **Entity Templates**: Required entities with full JSON schemas
4. **Behaviors**: Which behaviors are used and how
5. **Rules**: Win/lose conditions and scoring
6. **Customization Guide**: What's customizable at each level
7. **Parameter Reference**: Tunable parameters with bounds
8. **Example Game Definition**: Complete JSON example
9. **AI Generation Tips**: How AI should generate this template
10. **Variations**: Common themed variants

---

## File Index

| File | Description |
|------|-------------|
| [01_SLINGSHOT_DESTRUCTION.md](./01_SLINGSHOT_DESTRUCTION.md) | Angry Birds-style projectile destruction |
| [02_ROPE_PHYSICS.md](./02_ROPE_PHYSICS.md) | Cut the Rope-style delivery puzzle |
| [03_ENDLESS_RUNNER.md](./03_ENDLESS_RUNNER.md) | Side-scrolling auto-runner |
| [04_HILL_CLIMB_VEHICLE.md](./04_HILL_CLIMB_VEHICLE.md) | Physics-based vehicle driving |
| [05_PHYSICS_PLATFORMER.md](./05_PHYSICS_PLATFORMER.md) | Jump and collect platformer |
| [06_BREAKOUT_BOUNCER.md](./06_BREAKOUT_BOUNCER.md) | Brick-breaking paddle game |
| [07_PINBALL_LITE.md](./07_PINBALL_LITE.md) | Single-table pinball |
| [08_BUMPER_ARENA.md](./08_BUMPER_ARENA.md) | Top-down knockout arena |
| [09_PHYSICS_STACKER.md](./09_PHYSICS_STACKER.md) | Tower building/stacking |
| [10_RAGDOLL_GOAL.md](./10_RAGDOLL_GOAL.md) | Flick-to-goal physics game |
