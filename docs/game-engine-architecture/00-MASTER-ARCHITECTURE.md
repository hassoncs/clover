# Slopcade Game Engine: Master Architecture

**Created**: 2026-01-26  
**Status**: Living Specification  
**Purpose**: Single source of truth for the entire game engine architecture

---

## 🎯 Vision Statement

**Build an AI-friendly, physics-based game engine where:**
- Natural language → playable games in <30 seconds
- Declarative JSON defines everything (AI-generatable)
- Composable systems enable complex mechanics
- Live tuning enables rapid iteration
- Progressive complexity (simple → advanced)

---

## 📐 Architectural Principles

### 1. **Declarative-First Design**
Everything that can be declared in JSON should be. This enables AI generation and serialization.

### 2. **Composability Over Monoliths**
Small, reusable systems that combine (behaviors, rules, variables, expressions, slots, hierarchy).

### 3. **Progressive Complexity**
Easy things should be easy (spawn a bouncing ball), complex things should be possible (boss with destructible parts).

### 4. **Separation of Concerns**
Each system solves ONE problem well. Don't conflate orthogonal concepts.

### 5. **AI-Native Architecture**
Design decisions favor what AI can generate reliably over developer convenience.

---

## 🏗️ System Architecture (High Level)

```
┌────────────────────────────────────────────────────────────────┐
│                        GAME DEFINITION                          │
│                     (JSON Specification)                        │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  Entities    │  │  Behaviors   │  │    Rules     │        │
│  │  Templates   │  │  Variables   │  │  Win/Lose    │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │    Slots     │  │  Hierarchy   │  │  Expressions │        │
│  │    Assets    │  │    Camera    │  │    Physics   │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└─────────────────────────┬──────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────────┐
│                      GAME ENGINE RUNTIME                        │
│                      (TypeScript + Godot)                       │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   Entity     │  │  Behavior    │  │    Rules     │        │
│  │   Manager    │  │  Executor    │  │  Evaluator   │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  Expression  │  │   Physics    │  │   Renderer   │        │
│  │   Evaluator  │  │  (Box2D)     │  │   (Godot)    │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└────────────────────────────────────────────────────────────────┘
```

---

## 📊 Five Layers of Customization

**User Journey**: From simple to complex

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 0: PREFAB COMPOSITION (Structural)                    │
│ ─────────────────────────────────────────────────────────── │
│ WHO is connected to WHO                                     │
│                                                             │
│ Define multi-entity structures as reusable prefabs          │
│ • Parent-child entity hierarchies                           │
│ • Nested template instantiation                             │
│ • Cascade operations (destroy parent → children destroyed) │
│                                                             │
│ Status: ❌ NOT YET IMPLEMENTED (Critical Gap)              │
│ Example: Boss entity with arm, leg, core children          │
│ Doc: [00-HIERARCHY-AND-COMPOSABILITY-ANALYSIS.md]          │
└─────────────┬───────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: SLOTS (Spatial Anchors)                            │
│ ─────────────────────────────────────────────────────────── │
│ WHERE on entities children attach                           │
│                                                             │
│ Define attachment points with coordinates                   │
│ • Named slots with X/Y positions                            │
│ • Layer offsets for z-ordering                              │
│ • Used by attach_to behavior and hierarchy system          │
│                                                             │
│ Status: ✅ IMPLEMENTED                                     │
│ Example: Character has "head" slot at (0, 1.0)            │
│ Doc: [01-core-systems/entity-system.md]                   │
└─────────────┬───────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: ASSET SWAPPING (Visual Appearance)                 │
│ ─────────────────────────────────────────────────────────── │
│ WHAT entities look like                                     │
│                                                             │
│ Replace sprites without changing structure/behavior        │
│ • Asset pack system with themed sprites                     │
│ • Image URL replacement                                     │
│ • Animation frame swapping                                  │
│                                                             │
│ Status: ✅ IMPLEMENTED                                     │
│ Example: Swap knight.png for wizard.png                   │
│ Doc: [asset-integration-design.md]                        │
└─────────────┬───────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: TUNABLE VARIABLES (Behavioral Parameters)          │
│ ─────────────────────────────────────────────────────────── │
│ HOW FAST/STRONG entities behave                             │
│                                                             │
│ Adjust gameplay balance via live parameter editing         │
│ • Variables with metadata (min/max/step)                    │
│ • Categories for grouping (physics, gameplay, etc.)         │
│ • Live tuning UI with sliders                               │
│ • Expression-driven computed values                         │
│                                                             │
│ Status: 🚧 VARIABLES ✅, METADATA PLANNED                  │
│ Example: jumpForce = 15 (tunable 5-25)                    │
│ Doc: [tunables-vs-existing-systems-analysis.md]           │
└─────────────┬───────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: DYNAMIC EXPRESSIONS (Emergent Mechanics)           │
│ ─────────────────────────────────────────────────────────── │
│ HOW values change based on game state                       │
│                                                             │
│ Computed values that respond to gameplay                    │
│ • Expression language (math, logic, functions)              │
│ • Reference variables, score, time, entity properties       │
│ • Difficulty curves, stat modifiers, resource pools         │
│                                                             │
│ Status: ✅ PHASE 1 DONE, PHASE 2 IN PROGRESS              │
│ Example: speed: { expr: "5 + score * 0.1" }               │
│ Doc: [02-dynamic-mechanics/]                               │
└─────────────┬───────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 5: CUSTOM JAVASCRIPT (Unlimited Logic) - FUTURE       │
│ ─────────────────────────────────────────────────────────── │
│ Custom imperative logic beyond declarative systems          │
│                                                             │
│ Sandboxed JavaScript for truly custom mechanics            │
│ • User-written behavior scripts                             │
│ • Custom algorithms and AI                                  │
│ • Advanced patterns beyond engine primitives                │
│                                                             │
│ Status: 📋 PLANNED (Future Phase)                          │
│ Example: Custom enemy pathfinding script                   │
│ Doc: [TBD - Not yet designed]                              │
└─────────────────────────────────────────────────────────────┘
```

**Key Insight**: Each layer is **independent and composable**. You can use Layer 2 without Layer 0, or Layer 3 without Layer 4. Progressive complexity!

---

## 🧩 Core Systems (What Exists Today)

### 1. Entity System

**Purpose**: Define game objects with components (transform, sprite, physics, behaviors)

```typescript
GameDefinition.templates: Record<string, EntityTemplate>
GameDefinition.entities: GameEntity[]
```

**Key Features**:
- Template-based instancing
- Component-based (sprite, physics, behaviors)
- Tag-based queries (O(1) lookup)
- Conditional behaviors (tag-driven state)

**Status**: ✅ **Complete, Battle-Tested**

**Docs**:
- Reference: `01-core-systems/entity-system.md`
- Original: `docs/game-maker/reference/entity-system.md`

**Critical Gap**: ❌ NO parent-child hierarchy (entities are flat)

---

### 2. Behavior System

**Purpose**: Declarative entity logic (movement, spawning, destruction, etc.)

**27+ Behavior Types**:
- **Movement**: `move`, `rotate`, `follow`, `oscillate`, `maintain_speed`
- **Control**: `draggable`, `attach_to`
- **Spawning**: `spawn_on_event`, `particle_emitter`
- **Combat**: `destroy_on_collision`, `score_on_collision`, `health`
- **Effects**: `animate`, `scale_oscillate`, `sprite_effect`
- **Physics**: `bounce`, `gravity_zone`, `magnetic`, `teleport`
- **Timing**: `timer`

**Execution Order** (per frame):
1. Input processing (draggable, control)
2. Timers
3. Movement (move, oscillate, follow)
4. Visual (rotate, animate)
5. Post-physics (collision behaviors)

**Status**: ✅ **Complete, Widely Used**

**Docs**:
- Reference: `01-core-systems/behavior-system.md`
- Original: `docs/game-maker/reference/behavior-system.md`

---

### 3. Rules System

**Purpose**: Event-driven global game logic

**Pattern**: `When [Trigger] if [Condition] do [Action]`

**Triggers**: collision, timer, score threshold, entity count, tap, drag, button, swipe, game start  
**Conditions**: score range, time range, entity exists, variable check, random, on ground, touching  
**Actions**: spawn, destroy, score, game state (win/lose/restart), sound, modify entity, apply impulse/force, set velocity, camera effects

**Status**: ✅ **Complete, Core System**

**Docs**:
- Reference: `01-core-systems/rules-system.md`
- Original: `docs/game-maker/reference/game-rules.md`

---

### 4. Variables System

**Purpose**: Runtime game state + design-time configuration

```typescript
GameDefinition.variables: Record<string, GameVariableValue>
GameVariableValue = number | boolean | string | Vec2 | { expr: string }
```

**Current Uses**:
- Gameplay state (combo count, multiplier, player facing)
- System internal state (grid definitions, inventory items)
- Tunable parameters (jump force, enemy speed)
- Displayed to player (via `ui.variableDisplays`)

**Modification**: Rules can modify via `set_variable` action

**Status**: ✅ **Complete, Heavily Used**

**Docs**:
- Analysis: `tunables-vs-existing-systems-analysis.md`
- Reference: `02-dynamic-mechanics/variables-system.md`

**Planned Enhancement**: Add `variableMetadata` for live tuning UI

---

### 5. Expression Language

**Purpose**: Computed values based on game state

**Syntax**: Math/logic formulas evaluated at runtime

```typescript
{ expr: "5 + score * 0.1" }
{ expr: "jumpForce * (isCrit ? 2 : 1)" }
{ expr: "clamp(speed, minSpeed, maxSpeed)" }
```

**Context Available**:
- Game state: `score`, `lives`, `time`, `wave`, `frameId`, `dt`
- Variables: Direct reference by name
- Entity props: `self.health`, `self.transform.x`, `self.velocity.y`
- Functions: `min`, `max`, `clamp`, `abs`, `lerp`, `floor`, `ceil`, `sqrt`, `sin`, `cos`, `random`, `distance`, `angle`

**Status**: ✅ **Phase 1 Complete**, 🚧 **Phase 2 In Progress**

**Docs**:
- RFC: `05-rfcs/RFC-001-derived-values.md`
- Roadmap: `02-dynamic-mechanics/roadmap.md`
- Original: `docs/game-maker/roadmap/dynamic-mechanics-roadmap.md`

---

### 6. Slots System

**Purpose**: Named attachment points on entity templates

```typescript
EntityTemplate.slots: Record<string, SlotDefinition>
SlotDefinition = { x: number, y: number, layer?: number }
```

**Used By**:
- `attach_to` behavior (snaps entities to parent slots)
- Proposed hierarchy system (defines where children spawn)

**Status**: ✅ **Complete**

**Docs**:
- Included in: `01-core-systems/entity-system.md`
- Analysis: `00-HIERARCHY-AND-COMPOSABILITY-ANALYSIS.md`

**Key Distinction**: Slots are COORDINATES, not relationships. They answer "where" not "who".

---

### 7. Physics Integration

**Purpose**: Box2D physics via Godot bridge

**Features**:
- Body types: dynamic, static, kinematic
- Shapes: box, circle, polygon
- Joints: revolute, distance, weld, prismatic
- Collision filtering, sensors, CCD

**Platform**:
- Native: `react-native-godot` JSI bridge
- Web: Godot WASM + postMessage

**Status**: ✅ **Complete, Production-Ready**

**Docs**:
- Reference: `01-core-systems/physics-integration.md`
- Gap Analysis: `docs/godot/GAP_ANALYSIS.md`

---

## 🎨 Composable Systems (Advanced Features)

These are "helper systems" that layer on top of core primitives to enable specific game genres.

### Implemented Systems

| System | Purpose | Used For |
|--------|---------|----------|
| **Match3** | Grid-based matching | Candy Crush, Bejeweled |
| **Grid** | Cell-based state | Chess, Tic-Tac-Toe, Match3 |
| **Inventory** | Item management | RPGs, resource collection |
| **Combo** | Chain tracking | Fighting games, rhythm games |
| **Checkpoint** | Save/restore state | Platformers |
| **Wave** | Enemy spawning | Tower Defense |
| **Path** | Waypoint following | Tower Defense, Racing |
| **Progression** | XP/unlock system | Meta-game progression |
| **State Machine** | Entity/game FSM | Complex AI, game phases |

**How They Work**: 
- Store state in `variables` with special prefixes (`__gridStates`, `__comboStates`)
- Provide helper actions/functions (e.g., `grid_move`, `combo_increment`)
- Integrate seamlessly with core rules/behaviors

**Status**: ✅ **8 systems implemented**, 🚧 **More planned**

**Docs**:
- Master: `03-composable-systems/overview.md`
- Original: `docs/game-templates/00-COMPOSABLE-SYSTEMS-ARCHITECTURE.md`

---

## 🚀 Hierarchy of Customization

### For Game Designers (By Skill Level)

| Layer | User | What They Change | Tool | Complexity |
|-------|------|------------------|------|------------|
| **Layer 2** | Kids (6-9) | Asset swapping | Theme picker | ⭐ Easy |
| **Layer 3** | Tweens (8-12) | Tunable variables | Slider panel | ⭐⭐ Medium |
| **Layer 1** | Teens (10-14) | Slot positions | Visual editor | ⭐⭐⭐ Medium-Hard |
| **Layer 0** | Advanced (12+) | Prefab structure | Entity composer | ⭐⭐⭐⭐ Hard |
| **Layer 4** | Experts | Expressions | Formula editor | ⭐⭐⭐⭐⭐ Expert |
| **Layer 5** | Developers | Custom JS | Code editor | 🔒 Dev-only |

### For AI Generation

| Layer | AI Difficulty | Reliability | Notes |
|-------|---------------|-------------|-------|
| **Layer 2** | ⭐ Easy | 95%+ | AI is great at asset descriptions |
| **Layer 3** | ⭐⭐ Easy | 90%+ | AI can infer reasonable ranges |
| **Layer 1** | ⭐⭐ Easy | 85%+ | AI can place slots logically |
| **Layer 4** | ⭐⭐⭐ Medium | 75% | AI can write expressions but needs validation |
| **Layer 0** | ⭐⭐⭐⭐ Medium-Hard | 60%? | Nested structures are harder to reason about |
| **Layer 5** | ⭐⭐⭐⭐⭐ Hard | <50% | Custom code is risky |

---

## 📚 Documentation Structure

### New Consolidated Location

**`docs/game-engine-architecture/`** - Everything about how the engine works

```
game-engine-architecture/
│
├── INDEX.md                            # This navigation page
├── 00-MASTER-ARCHITECTURE.md           # This file
├── DOCUMENT-INVENTORY.md               # Complete list of 60+ source docs
│
├── 01-core-systems/                    # Foundational systems (exists today)
│   ├── entity-system.md
│   ├── behavior-system.md
│   ├── rules-system.md
│   ├── physics-integration.md
│   └── execution-flow.md
│
├── 02-dynamic-mechanics/               # Variables & expressions
│   ├── variables-system.md
│   ├── expression-language.md
│   ├── computed-values.md
│   ├── roadmap.md
│   └── live-tuning.md
│
├── 03-composable-systems/              # Genre-specific helpers
│   ├── overview.md
│   ├── match3.md
│   ├── grid.md
│   ├── inventory.md
│   ├── combo.md
│   └── [others].md
│
├── 04-hierarchy-and-composition/       # Multi-entity structures
│   ├── 00-HIERARCHY-AND-COMPOSABILITY-ANALYSIS.md  ✅ Created
│   ├── prefabs-vs-slots.md
│   ├── transform-propagation.md
│   └── implementation-plan.md
│
├── 05-game-templates/                  # 10 curated patterns
│   ├── overview.md
│   ├── projectile-games.md
│   ├── endless-runner.md
│   └── [others].md
│
├── 06-ai-integration/                  # How AI generates games
│   ├── generation-pipeline.md
│   ├── prompt-engineering.md
│   ├── validation.md
│   └── tier-1-templates.md
│
├── 07-rfcs/                            # Design proposals
│   ├── RFC-001-derived-values.md
│   ├── RFC-002-complementary-systems.md
│   └── [others].md
│
└── 08-roadmap/                         # Implementation timeline
    ├── q1-2026-foundation.md
    ├── q2-2026-expansion.md
    ├── q3-2026-polish.md
    └── future-vision.md
```

### Old Scattered Locations (To Be Organized)

- ✅ `docs/game-maker/reference/` → Extract to `01-core-systems/`
- ✅ `docs/game-maker/architecture/` → Organize into sections
- ✅ `docs/game-maker/rfcs/` → Move to `07-rfcs/`
- ✅ `docs/game-maker/roadmap/` → Move to `08-roadmap/`
- ✅ `docs/game-maker/templates/` → Move to `05-game-templates/`
- ✅ `docs/game-templates/` → Merge into `03-composable-systems/`
- ⚠️ `docs/game-maker/planning/` → Archive most, extract relevant to roadmap
- ⚠️ `docs/game-maker/decisions/` → Archive most, extract to appropriate sections

---

## 🔍 Critical Gaps Identified

### 1. Entity Hierarchy (Layer 0)

**Status**: ❌ **MISSING - Critical**  
**Impact**: Can't build complex multi-part entities  
**Effort**: ~10 days  
**Priority**: 🔴 **HIGH**

**What's Missing**:
- Parent-child relationships in entity structure
- Nested template definitions
- Transform inheritance/propagation
- Cascade operations (destroy, visibility)
- Prefab instantiation

**Recommendation**: Implement before Q2 2026

**Doc**: [00-HIERARCHY-AND-COMPOSABILITY-ANALYSIS.md](#)

---

### 2. Tunable Variables Metadata (Layer 3)

**Status**: 🚧 **Variables exist, metadata planned**  
**Impact**: Can't live-tune AI-generated games  
**Effort**: ~5 days  
**Priority**: 🟡 **MEDIUM**

**What's Missing**:
- `variableMetadata` field in GameDefinition
- Range (min/max/step) for each variable
- Category grouping
- Tunable flag for UI filtering
- Live tuning UI component

**Recommendation**: Implement alongside hierarchy

**Doc**: [tunables-vs-existing-systems-analysis.md](#)

---

### 3. Custom JavaScript Sandbox (Layer 5)

**Status**: 📋 **Not yet designed**  
**Impact**: Power users can't write custom logic  
**Effort**: ~20 days  
**Priority**: 🔵 **LOW** (future)

**What's Missing**:
- Sandboxed JS execution environment
- API for custom behaviors
- Security/performance boundaries
- AI integration for script generation

**Recommendation**: Defer to Phase 4 (post Q3 2026)

---

## 🎯 Implementation Priorities

### Q1 2026 (Weeks 1-8)

| Priority | Feature | Days | Dependencies |
|----------|---------|------|--------------|
| 🔴 P0 | Entity Hierarchy | 10d | None |
| 🟡 P1 | Variable Metadata + Tuning UI | 5d | Variables (done) |
| 🟢 P2 | Expression Phase 2 (more functions) | 8d | Phase 1 (done) |

**Goal**: Complete foundational composability (Layers 0-4)

### Q2 2026 (Weeks 9-16)

| Priority | Feature | Days | Dependencies |
|----------|---------|------|--------------|
| 🟡 P1 | Difficulty Curves | 5d | Expressions Phase 2 |
| 🟡 P1 | Resource Pools | 5d | Expressions Phase 2 |
| 🟢 P2 | Combo System refinement | 3d | Combo (done) |

**Goal**: Emergent mechanics via expressions

### Q3 2026 (Weeks 17-24)

| Priority | Feature | Days | Dependencies |
|----------|---------|------|--------------|
| 🟢 P2 | State Machines | 7d | Variables (done) |
| 🟢 P2 | Stat Modifiers | 5d | Expressions Phase 2 |
| 🟢 P2 | Developer Tooling | 5d | All systems |

**Goal**: Polish and advanced features

---

## 🧠 Mental Model

### Unity Developers

If you know Unity, here's the mapping:

| Unity Concept | Slopcade Equivalent |
|---------------|---------------------|
| **GameObject** | `GameEntity` |
| **Prefab** | `EntityTemplate` + Children (proposed) |
| **Component** | `SpriteComponent`, `PhysicsComponent`, `Behavior` |
| **MonoBehaviour** | `Behavior` (declarative) + `Rule` (event-driven) |
| **Transform Hierarchy** | Proposed (not yet implemented) |
| **Inspector Variables** | `variables` + `variableMetadata` |
| **Rigidbody** | `PhysicsComponent` → Box2D body |
| **Joint** | `GameJoint` (revolute, distance, weld, prismatic) |

### Key Difference

- **Unity**: Imperative C# scripts with full API access
- **Slopcade**: Declarative JSON with constrained expression language

**Why**: AI can generate/validate declarative configs but struggles with imperative code.

---

## 🔗 How Systems Interact

### Example: Player Character with Weapon

```typescript
{
  variables: {
    walkSpeed: 5,      // Layer 3: Tunable
    jumpForce: 15,     // Layer 3: Tunable
    weaponDamage: 10,  // Layer 3: Tunable
  },
  
  variableMetadata: {  // Layer 3: Metadata
    walkSpeed: { tunable: true, range: { min: 2, max: 10, step: 0.5 } },
  },
  
  templates: {
    player: {
      sprite: { type: 'image', url: 'knight.png' },  // Layer 2: Asset
      
      slots: { rightHand: { x: 0.3, y: 0 } },  // Layer 1: Slot
      
      children: [  // Layer 0: Hierarchy (proposed)
        { name: 'Weapon', template: 'sword', slot: 'rightHand' }
      ],
      
      behaviors: [  // Core: Behavior
        { type: 'move', speed: { expr: "walkSpeed" } },  // Layer 4: Expression
      ],
    },
    
    sword: {
      sprite: { type: 'image', url: 'sword.png' },
      behaviors: [
        { type: 'rotate', speed: 2 },
      ],
    },
  },
  
  rules: [  // Core: Rules
    {
      trigger: { type: 'tap' },
      actions: [
        { type: 'apply_impulse', target: { type: 'player' }, y: { expr: "jumpForce" } },
      ],
    },
  ],
}
```

**All 6 systems working together:**
1. **Entity** defines player
2. **Hierarchy** (proposed) makes sword a child
3. **Slot** defines where sword attaches
4. **Asset** determines knight.png appearance
5. **Variable** stores walkSpeed/jumpForce
6. **Expression** makes speed dynamic
7. **Behavior** implements movement
8. **Rule** implements jump on tap
9. **Physics** simulates forces

---

## 📖 How To Navigate This Documentation

### Quick Start (5 minutes)

1. Read this file (00-MASTER-ARCHITECTURE.md)
2. Skim [DOCUMENT-INVENTORY.md](#) for overview
3. Pick a core system that interests you
4. Dive into specific doc

### Learning Path (New Team Member)

**Week 1: Core Systems**
1. Read `01-core-systems/entity-system.md`
2. Read `01-core-systems/behavior-system.md`
3. Read `01-core-systems/rules-system.md`
4. Play with test games to see concepts in action

**Week 2: Dynamic Mechanics**
1. Read `02-dynamic-mechanics/variables-system.md`
2. Read `02-dynamic-mechanics/expression-language.md`
3. Try modifying variables in existing games
4. Write simple expressions

**Week 3: Advanced Features**
1. Read `03-composable-systems/overview.md`
2. Pick a system (Match3, Inventory, etc.) and dive deep
3. Study example game using that system

**Week 4: Architecture Decisions**
1. Read RFCs (`07-rfcs/`)
2. Read hierarchy analysis
3. Understand why systems are designed this way

### AI Prompt Engineering

**Include these docs in context:**
1. `06-ai-integration/generation-pipeline.md` - How to structure output
2. `01-core-systems/behavior-system.md` - Available behaviors
3. `01-core-systems/rules-system.md` - Trigger/action patterns
4. `05-game-templates/[game-type].md` - Template for specific genre
5. `tunables-vs-existing-systems-analysis.md` - How to use variables

---

## 🛠️ For Implementers

### Adding a New Behavior

1. Add type to `shared/src/types/behavior.ts`
2. Add schema to `shared/src/types/schemas.ts`
3. Implement handler in `app/lib/game-engine/behaviors/`
4. Register in `BehaviorExecutor.ts`
5. Add tests
6. Update `01-core-systems/behavior-system.md`

### Adding a New Composable System

1. Study `03-composable-systems/overview.md`
2. Define actions/conditions in `shared/src/systems/[system]/types.ts`
3. Implement executors in `shared/src/systems/[system]/index.ts`
4. Use `variables` for state storage
5. Integrate with rules/behaviors
6. Add to system registry
7. Document in `03-composable-systems/[system].md`

### Extending Expressions

1. Read `05-rfcs/RFC-001-derived-values.md`
2. Add functions to `shared/src/expressions/evaluator.ts`
3. Update AST types if needed
4. Add tests
5. Update `02-dynamic-mechanics/expression-language.md`

---

## 🎓 Key Architectural Insights

### 1. Slots ≠ Hierarchy ≠ Variables

**Three completely orthogonal concepts:**
- **Slots**: Spatial coordinates (WHERE)
- **Hierarchy**: Structural relationships (WHO)
- **Variables**: Behavioral parameters (HOW MUCH)

**Don't conflate them** - each solves a different problem. They compose beautifully.

### 2. Declarative > Imperative (for AI)

AI can reliably generate:
- ✅ JSON configs (behaviors, rules, templates)
- ✅ Math expressions (formulas, calculations)
- ❌ Imperative code (scripts, algorithms)

**Design philosophy**: Keep everything declarative until you hit the limit, then provide escape hatches (Layer 5).

### 3. Progressive Complexity

Systems should support:
- **Easy**: Single entity, basic behaviors
- **Medium**: Multiple entities, rules, variables
- **Hard**: Hierarchies, expressions, composable systems
- **Expert**: Custom scripts, advanced AI

Each layer is optional. Don't force complexity on simple games.

### 4. Flat Is Faster (But Limiting)

Current flat entity system:
- ✅ Simple to understand
- ✅ Fast queries (no tree traversal)
- ❌ Can't compose complex structures
- ❌ Manual relationship management

Adding hierarchy:
- ⚠️ Slightly more complex
- ⚠️ Requires tree operations
- ✅ Unlocks entire class of game mechanics
- ✅ Industry standard (Unity, Unreal, Godot all use it)

**Trade-off worth it** for games that need it, opt-in for games that don't.

---

## 🚨 Critical Decisions Needed

### 1. Should We Implement Entity Hierarchy?

**Analysis**: [00-HIERARCHY-AND-COMPOSABILITY-ANALYSIS.md](#)

**Recommendation**: ✅ **YES**
- Unlocks complex game types (boss fights, modular vehicles, dress-up)
- Industry standard approach
- ~10 days effort
- Backward compatible (opt-in)

**Next Step**: Oracle architectural review

---

### 2. Should Tunables Be Separate from Variables?

**Analysis**: [tunables-vs-existing-systems-analysis.md](#)

**Decision**: ❌ **NO** - 97% overlap
- Enhance Variables with `variableMetadata` instead
- Single concept, multiple use cases
- Simpler mental model for AI

**Next Step**: Implement metadata field

---

### 3. Where Should Custom JS Fit In?

**Status**: Not yet designed

**Questions**:
- Sandbox environment? (VM2, QuickJS, WebAssembly)
- API surface? (Read-only? Full entity access?)
- Security boundaries?
- Performance impact?

**Next Step**: Defer to Phase 4, focus on Layers 0-4 first

---

## 📈 Success Metrics

### Developer Experience

- ⏱️ **Compile Time**: <100ms for game definition validation
- 🎮 **Iteration Speed**: <5 seconds from change to test
- 🐛 **Error Clarity**: 90%+ errors self-diagnosable
- 📚 **Documentation**: 100% coverage of core systems

### Game Quality

- 🎯 **Generation Success**: 80%+ of AI games playable without edits
- 🎨 **Customization Depth**: 5 layers of user modification
- 🧩 **Composability**: 10+ reusable systems for genre patterns
- ⚡ **Performance**: 60fps on mid-range devices

### AI Integration

- 🤖 **Prompt Success**: 85%+ games from first prompt
- 🔧 **Tunability**: 90%+ generated games have useful tunables
- 🎲 **Variety**: AI can generate 20+ distinct game types

---

## 🔮 Future Vision (Post Q3 2026)

### Phase 4: Advanced Systems

- ✨ **Particle System Evolution**: Custom emitters, particle scripting
- 🎵 **Audio Synthesis**: Procedural sound effects, dynamic music
- 🌐 **Multiplayer**: Authoritative server, state sync, input prediction
- 💾 **Save/Load**: Game state persistence, cloud sync
- 🏆 **Achievement System**: Cross-game progression, meta-achievements

### Phase 5: AI Enhancement

- 🧠 **Auto-Balance**: ML-based parameter suggestions
- 🎨 **Style Transfer**: Learn from existing games
- 🐛 **Bug Detection**: AI identifies broken game logic
- 📊 **Analytics**: Playtest data → AI recommendations

---

## 📝 Maintenance

### Keeping This Updated

**When to update this doc:**
- ✅ Major architectural decision made
- ✅ New core system added
- ✅ Roadmap priorities change
- ✅ Critical gap identified/resolved

**When NOT to update:**
- ❌ Bug fixes
- ❌ Implementation details (those go in code)
- ❌ API reference changes (those go in TypeDoc)

### Review Cadence

- **Weekly**: Check roadmap progress
- **Monthly**: Review gaps and priorities
- **Quarterly**: Major architectural assessment

---

## 🎓 Required Reading

### For New Engineers

1. **This file** (00-MASTER-ARCHITECTURE.md) - Start here
2. `01-core-systems/entity-system.md` - How entities work
3. `01-core-systems/behavior-system.md` - Declarative logic
4. `00-HIERARCHY-AND-COMPOSABILITY-ANALYSIS.md` - Critical gap

### For AI Integration

1. `06-ai-integration/generation-pipeline.md` - How AI generates games
2. `tunables-vs-existing-systems-analysis.md` - Variables best practices
3. `05-game-templates/overview.md` - Template patterns

### For Architecture Decisions

1. `07-rfcs/RFC-001-derived-values.md` - Expression system design
2. `00-HIERARCHY-AND-COMPOSABILITY-ANALYSIS.md` - Hierarchy needs
3. `tunables-vs-existing-systems-analysis.md` - When to consolidate vs separate

---

## 📞 Getting Help

- **Architecture Questions**: Read relevant RFC or analysis doc first, then ask in #engineering
- **Implementation Questions**: Check reference docs in `01-core-systems/`
- **AI Generation Issues**: See `06-ai-integration/`
- **Missing Documentation**: File issue with `docs` label

---

## Summary

**What Slopcade Engine Is:**
- Declarative, JSON-driven game engine
- AI-native design with progressive complexity
- Composable systems (behaviors, rules, variables, expressions)
- Physics-based (Box2D via Godot)
- Cross-platform (iOS, Android, Web)

**What Makes It Unique:**
- Expression-driven dynamic values
- AI can generate 80%+ playable games
- 5 layers of user customization
- Composable genre-specific systems

**Critical Gap:**
- ❌ No entity hierarchy (yet)
- This is the #1 priority to implement

**Read This First:**
- This file (overview)
- [00-HIERARCHY-AND-COMPOSABILITY-ANALYSIS.md](#) (critical gap)
- [tunables-vs-existing-systems-analysis.md](#) (recent decision)

---

**Last Updated**: 2026-01-26  
**Next Review**: Weekly during implementation phases
