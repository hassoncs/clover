# Draft: Game Engine Redesign - Declarative-Imperative Hybrid

## User's Request

**Goal**: Design a clean, extensible game engine for an AI-powered children's game maker (ages 6-14) that supports both simple declarative games and complex imperative logic (like Match-3).

**Core Philosophy - "Unity Marketplace for Kids"**: 
- **Like Unity Editor**: Modular component system where everything is swappable
- **Like Unity Asset Store**: Marketplace of game systems, behaviors, assets, full games
- **Swap Anything**: Image pack, Match-3 system, entire game template
- **Generic Foundation**: Entity + Behavior + Rule system is the universal base
- **Everything Attaches**: All extensions hook into the core entity system
- **AI-Powered**: AI helps users discover, configure, and combine marketplace items

**Key Problem**: 
- Current Match-3 implementation mixes visual effects (80 lines of glow/scale code) with game logic
- Need clean separation: **imperative code manages WHEN state changes, declarative config defines WHAT visual feedback looks like**
- Systems aren't discoverable or composable yet

## The Unity Marketplace Mental Model

### Unity Asset Store Analogy

| Unity Asset Store Item | Slopcade Equivalent | How It Attaches |
|------------------------|---------------------|-----------------|
| **Image Pack** | Asset Pack (sprites, backgrounds) | `template.sprite.imageUrl = "marketplace://fantasy-pack/hero.png"` |
| **Particle System** | Behavior Plugin (`particle_emitter`) | `behaviors: [{ type: "particle_emitter", effect: "explosion" }]` |
| **Game System** (Inventory, Dialogue) | GameSystem Plugin (Match3, Tetris) | `gameDefinition.match3 = { ... }` + registers with GameSystemRegistry |
| **Complete Game Template** | Full GameDefinition JSON | Load entire template, swap assets/systems as needed |
| **Shader** | Sprite Effect (`sprite_effect` behavior) | `conditionalBehaviors: [{ when: {hasTag: "burning"}, behaviors: [{type: "sprite_effect", effect: "fire"}] }]` |
| **Audio Pack** | Sound Library | `rules: [{ actions: [{ type: "sound", soundId: "marketplace://retro-sounds/jump.mp3" }] }]` |
| **Physics Material** | Physics Preset | `physics: { preset: "marketplace://materials/ice" }` → sets friction/restitution |

### The Universal Interface - Everything Extends Entities

**Key Insight**: No matter what you add from the "marketplace", it **always interacts through the entity system**:

```typescript
// CORE FOUNDATION (never changes)
interface GameDefinition {
  metadata: GameMetadata;
  world: WorldConfig;
  templates: Record<string, EntityTemplate>;  // ← Universal extension point
  entities: GameEntity[];                     // ← Universal extension point
  rules: GameRule[];                          // ← Universal extension point
  
  // OPTIONAL SYSTEMS (marketplace add-ons)
  match3?: Match3Config;      // Adds Match3GameSystem
  inventory?: InventoryConfig; // Future: Adds InventorySystem
  dialogue?: DialogueConfig;   // Future: Adds DialogueSystem
  // ... infinite extensibility
}
```

**Every system, no matter how complex, ultimately**:
1. **Creates entities** (`entityManager.createEntity()`)
2. **Manages tags** (`entityManager.addTag("selected")`)
3. **Triggers rules** (`ruleEvaluator.triggerEvent("match_found")`)
4. **Uses behaviors** (via `conditionalBehaviors` or custom behavior types)

**Nothing bypasses the core**. Systems are **power users** of the entity API, not separate systems.

## Current Architecture Analysis

### Strengths
1. **Declarative Foundation**: Entities, behaviors, rules are all JSON-serializable
2. **AI-Friendly**: Simple enough for LLMs to generate correctly
3. **Composable**: Multiple behaviors can be combined
4. **Type-Safe**: TypeScript interfaces with Zod schemas
5. **Plugin System Exists**: `GameSystemRegistry` allows registering custom systems

### Current Components

| Component | Type | Status | AI-Generatable |
|-----------|------|--------|----------------|
| **Entities** | Declarative | ✅ Solid | ✅ Yes |
| **Behaviors** (20 types) | Declarative | ✅ Solid | ✅ Yes |
| **Rules** | Declarative | ✅ Solid | ✅ Yes |
| **Match3GameSystem** | Imperative | ⚠️ Mixed concerns | ❌ No |

### The Match-3 Problem (Lines 341-418 in Match3GameSystem.ts)

**Current Visual Effect Code** (~80 lines):
- `showHoverHighlight()` - Applies rim light effect manually
- `showHighlight()` - Applies glow effect + pulse manually  
- `updateSelectionScale()` - Manual oscillation math (lines 543-559)
- `hideHighlight()` / `clearSelectionEffect()` - Manual cleanup

**What's Wrong**:
- Visual state management scattered across imperative code
- Same effect patterns duplicated (other games might want "glow on selection")
- Hard to AI-generate or tune
- Cleanup logic error-prone

**What Should Happen** (from doc):
```typescript
// DECLARATIVE (in game definition JSON)
templates: {
  candy: {
    conditionalBehaviors: [
      {
        when: { hasTag: "selected" },
        behaviors: [
          { type: "scale_oscillate", min: 0.97, max: 1.06, speed: 5 },
          { type: "sprite_effect", effect: "glow", params: { pulse: true } }
        ]
      }
    ]
  }
}

// IMPERATIVE (in Match3GameSystem.ts)
handleTap(row, col) {
  this.entityManager.removeTag(oldEntityId, "selected");
  this.entityManager.addTag(newEntityId, "selected");
  // That's it! Visual effects handled declaratively
}
```

## Research Findings (Complete Codebase Analysis)

### Entity System
- **Files**: 
  - Types: `shared/src/types/entity.ts`
  - Manager: `app/lib/game-engine/EntityManager.ts`
  - Runtime: `app/lib/game-engine/types.ts` (RuntimeEntity)
- **Current Features**:
  - Template-based with merge resolution
  - Static tags (`tags?: string[]`) set at creation
  - Query methods: `getEntity()`, `getEntitiesByTag()`, `getEntityCountByTag()`
  - Physics sync: `syncTransformsFromPhysics()`
  - Pooling for performance
- **Missing**: 
  - **Dynamic tag add/remove at runtime** (tags are immutable after creation)
  - Tag change events for performance optimization

### Behavior System (20 Built-in Types)
- **Files**: 
  - Types: `shared/src/types/behavior.ts`
  - Executor: `app/lib/game-engine/BehaviorExecutor.ts` (phase-based execution)
  - Context: `app/lib/game-engine/BehaviorContext.ts` (unified API)
  - Handlers: `behaviors/MovementBehaviors.ts`, `behaviors/LifecycleBehaviors.ts`
- **5 Execution Phases**: `input → timer → movement → visual → post_physics`
- **20 Behavior Types**:
  - Movement: move, rotate, rotate_toward, follow, bounce, oscillate, draggable, maintain_speed, attach_to
  - Lifecycle: spawn_on_event, destroy_on_collision, timer, health, teleport
  - Scoring: score_on_collision, score_on_destroy
  - Visual/FX: animate, particle_emitter, gravity_zone, magnetic
- **Missing**: 
  - **Conditional behaviors** (only run when tag present)
  - **scale_oscillate** behavior (oscillate exists but only for position)
  - **sprite_effect** behavior (currently done via direct bridge calls)
  - Behavior deactivation lifecycle hooks

### Rules System
- **Files**:
  - Types: `shared/src/types/rules.ts`
  - Evaluator: `app/lib/game-engine/RulesEvaluator.ts`
  - Actions: `rules/actions/ActionRegistry.ts` with specialized executors
- **Trigger Types**: collision, input (tap/drag/button/swipe), timer, score, entity_count, event, frame
- **Action Types**: score, spawn, destroy, apply_impulse, game_state, sound, variable, list operations
- **Current Design**: Global game-level logic (win/lose, scoring, spawning)
- **Gap**: No entity-specific state machines (that's what conditional behaviors will fill)

### Game Systems Registry
- **File**: `shared/src/systems/GameSystemRegistry.ts`
- **Purpose**: Register custom game systems (like Match3) with versioning
- **Current Match3 Status**: **NOT using registry pattern** - instantiated directly in GameRuntime
- **Capabilities**: 
  - Version compatibility checking (semver)
  - Custom expression functions
  - Custom action types
  - Custom behavior types
  - System lifecycle hooks (onGameLoad, onGameUnload)

### Match3 System (The Problem Case)
- **File**: `app/lib/game-engine/systems/Match3GameSystem.ts` (831 lines)
- **Board State**: 2D array `BoardCell[][]` with entity IDs and piece types
- **Match Detection**: `findMatches()` - standard grid scanning algorithm
- **Cascades**: `applyGravity()` + `finishFalling()` with recursive checking
- **Visual Effects Problem** (lines 341-418, 544-559):
  ```typescript
  // 80+ lines of imperative visual code
  showHoverHighlight() { this.bridge.applySpriteEffect("rim_light", ...) }
  showHighlight() { this.bridge.applySpriteEffect("glow", ...) }
  updateSelectionScale() { /* manual Math.sin oscillation */ }
  ```
- **Integration**: Uses EntityManager for spawning, GodotBridge for effects, bypasses Behavior system
- **Sample Game**: `app/lib/test-games/games/gemCrush/game.ts`

### Example Game Definitions
1. **Breakout Bouncer**: Kinematic paddle + dynamic ball with `maintain_speed` + collision rules
2. **Pinball Lite**: Gravity physics + impulse-based flippers + high-restitution bumpers
3. **Falling Catcher**: Automated spawning + timer win conditions + tag-based scoring

## Decisions Made

### 1. Tag System Enhancement
- **Decision**: Add dynamic tag management to EntityManager
- **Rationale**: Core primitive for state-driven visual feedback
- **API**:
  ```typescript
  entityManager.addTag(entityId: string, tag: string)
  entityManager.removeTag(entityId: string, tag: string)
  entityManager.hasTag(entityId: string, tag: string): boolean
  entityManager.getEntitiesWithTag(tag: string): Entity[]
  ```

### 2. Conditional Behaviors
- **Decision**: Support tag-based behavior activation
- **Structure**:
  ```typescript
  interface ConditionalBehavior {
    when: {
      hasTag?: string;
      hasAnyTag?: string[];
      hasAllTags?: string[];
      lacksTag?: string; // NEW: only when tag is absent
    };
    behaviors: Behavior[];
  }
  ```
- **Evaluation**: Check conditions every frame, activate/deactivate behaviors dynamically
- **Cleanup**: Behaviors must support `onDeactivate` hook for cleanup

### 3. New Visual Behaviors
- **`scale_oscillate`**: Like `oscillate` but affects scale instead of position
- **`sprite_effect`**: Declarative shader effects (glow, rim_light, etc.)
- **`tint_color`**: Color tinting based on state

### 4. System Plugin Architecture
- **Decision**: Match3 should be a proper GameSystem plugin
- **Benefits**:
  - Versioning and compatibility checking
  - Can provide custom expression functions (e.g., `match3.combo_multiplier()`)
  - Can register custom behaviors (e.g., `swap_pieces`)
  - Can register custom actions (e.g., `clear_matches`)

## Open Questions

### 1. Behavior Stacking
**Question**: If entity has both "selected" and "hovered" tags, do both conditional behaviors apply?

**User Decision**: **CSS-Style Specificity with State Precedence**

**Key Insights**:
- "Think like web design" - tags are like CSS classes
- Engine just manages tags (`addTag`, `removeTag`)
- **Designer/stylesheet decides what tags mean visually**
- **Precedence ladder**: normal < hover < selected < pressed
- For Match3 specifically: **Skip hover, just use 'selected'**
- Selected gem should:
  - Tint/highlight the sprite
  - Scale oscillate
  - Show continuous sparkle particle effect (optional polish)

**Implementation Approach**:
```typescript
// Conditional behaviors can have priority
conditionalBehaviors: [
  {
    when: { hasTag: "pressed" },
    priority: 3,  // Highest
    behaviors: [...]
  },
  {
    when: { hasTag: "selected" },
    priority: 2,  // Higher than hover
    behaviors: [
      { type: "sprite_effect", effect: "tint", params: { color: [1.2, 1.2, 1.0] } },
      { type: "scale_oscillate", min: 0.97, max: 1.06, speed: 5 },
      { type: "particle_emitter", effect: "sparkle", continuous: true }  // Optional
    ]
  },
  {
    when: { hasTag: "hover" },
    priority: 1,  // Lower priority, won't show if selected/pressed
    behaviors: [...]
  }
]
```

**Behavior**: When multiple tags match, **only the highest priority** conditional behavior group activates.

### 2. Game System Integration Pattern
**Question**: How should complex game logic integrate with the declarative engine?

**User Decision**: **Hybrid Approach**

**Design**:
- **System handles imperative logic**: Match detection, grid management, cascade algorithms
- **System uses standard primitives**: Tags for state, behaviors for visual feedback
- **Clear interface contract**:

```typescript
// In GameDefinition
{
  metadata: { ... },
  world: { ... },
  match3: {  // System-specific config block
    rows: 8,
    cols: 8,
    pieceTemplates: ["gem_red", "gem_blue", "gem_green"],
    minMatch: 3,
    gridId: "match3-grid"
  },
  templates: {
    gem_red: {
      tags: ["match3_piece"],
      conditionalBehaviors: [
        {
          when: { hasTag: "selected" },
          priority: 2,
          behaviors: [
            { type: "scale_oscillate", min: 0.97, max: 1.06, speed: 5 },
            { type: "sprite_effect", effect: "glow", params: { pulse: true } }
          ]
        }
      ]
    }
  }
}
```

**System Responsibilities**:
- Board state management (private)
- Match detection algorithm (private)
- Tag manipulation (`entityManager.addTag("selected")`) (public API)
- Spawning/destroying pieces (public API)

**Benefits**:
- Complex algorithms stay imperative (maintainable, testable)
- Visual feedback declarative (AI-generatable, tunable)
- Clear separation: WHEN state changes (system) vs WHAT feedback looks like (conditional behaviors)

### 3. AI Generation Strategy
**Question**: How much should AI understand about game systems?

**User Decision**: **Tiered Approach** (Start simple, expose depth as needed)

**AI Knowledge Levels**:

**Level 1 - Template User** (80% of games):
```typescript
// AI Prompt Context (Simple)
"For Match-3 games, use the Match3GameSystem template:
- Set match3.rows and match3.cols (typical: 8x8)
- Provide 3-6 piece templates
- Set match3.minMatch (default: 3)

Example:
{
  match3: { rows: 8, cols: 8, pieceTemplates: ['candy_red', 'candy_blue', 'candy_green'] }
}
"
```

**Level 2 - System Customizer** (15% of games):
```typescript
// AI has access to "Match3 System Spec"
"Available Match3 options:
- swapDuration: Animation speed (default: 0.15s)
- fallDuration: Gravity speed (default: 0.1s)
- cascadeScoring: true = combo multipliers
- specialPieces: { '4match': 'row_clear', '5match': 'bomb' }

For advanced Match-3 with power-ups, configure specialPieces."
```

**Level 3 - System Developer** (5% of games):
```typescript
// AI writes custom GameSystem (future)
"To create a new Tetris system, implement GameSystemDefinition:
- Register with GameSystemRegistry
- Provide config schema
- Handle update() lifecycle
- Use tags + conditional behaviors for visuals"
```

**Implementation for AI**:
```typescript
// In LLM system prompt
const GAME_SYSTEMS = {
  match3: {
    template: "Match3GameSystem",
    tier1Config: { rows: "number", cols: "number", pieceTemplates: "string[]" },
    tier2Docs: "docs/game-systems/match3-advanced.md",  // Optional
    examples: ["gemCrush", "candyBlast"]
  },
  // Future systems
  tetris: { ... },
  cards: { ... }
};
```

**Benefits**:
- AI starts with black-box templates (high success rate)
- Can graduate to customization when needed
- Prevents AI from generating invalid system configurations
- Clear error messages: "match3.rows must be between 4 and 12"

### 4. AI Ergonomics - Making Generation Reliable

**Core Principle**: **Layer the complexity, provide guard rails**

#### AI Generation Hierarchy (Easiest → Hardest)

```
Level 1: PURE DECLARATIVE (95% success rate)
├─ Entities with standard behaviors
├─ Rules with standard triggers/actions
└─ No custom systems
Example: "Breakout game with paddle and bricks"

Level 2: SYSTEM TEMPLATES (85% success rate)
├─ Use pre-built systems (match3, endless runner)
├─ Configure via simple parameters
└─ Visual customization via conditional behaviors
Example: "Candy Crush clone with 8x8 grid"

Level 3: CUSTOM SYSTEMS (60% success rate, future)
├─ AI writes new GameSystemDefinition
├─ Registers custom behaviors
└─ Advanced expression functions
Example: "Card battler with deck building"
```

#### AI Prompt Strategy

**Current Problem** (ht-001 Human Task):
- AI doesn't know WHEN to use behaviors vs rules vs systems
- No clear boundaries on what's possible
- Validation happens too late (after generation)

**Proposed Solution - Structured Prompts**:

```typescript
// System Prompt for Game Generator
const AI_CONTEXT = {
  // Always available
  primitives: {
    entities: "Use for all game objects",
    behaviors: "20 built-in types for entity logic",
    rules: "Global game events (scoring, win/lose)",
    templates: "Reusable entity definitions"
  },
  
  // Use when appropriate
  systems: {
    match3: {
      useWhen: "Grid-based matching games (Candy Crush, Bejeweled)",
      avoidWhen: "No swapping/matching mechanic",
      config: { rows: "4-12", cols: "4-12", pieceTemplates: "3-8 types" },
      visualCustomization: "Use conditionalBehaviors on piece templates"
    }
  },
  
  // Validation rules
  constraints: {
    maxEntities: 200,
    maxBehaviorsPerEntity: 10,
    requiredFields: ["metadata.title", "world", "entities"]
  }
};
```

**Generation Flow**:
1. **Classify Intent**: "Match-3 game" → Use match3 system
2. **Generate Structure**: Start with system config block
3. **Add Visual Layer**: Conditional behaviors for state feedback
4. **Validate Schema**: Zod schemas catch errors early
5. **Explain Choices**: "I used match3 system because..."

#### Concrete Example - AI Generates Gem Crush

**User Prompt**: "Make a gem matching game like Bejeweled"

**AI Internal Reasoning**:
```
1. Intent: Match-3 mechanic detected
2. System Selection: Use match3 system template
3. Configuration:
   - Grid: 8x8 (standard)
   - Pieces: 6 gem types (good variety)
   - Min match: 3 (standard)
4. Visual Design:
   - Selected gems: glow + scale oscillate
   - Matched gems: particle burst + fade out
5. Validation: ✓ All configs valid
```

**AI Output**:
```json
{
  "metadata": { "title": "Gem Crush" },
  "match3": {
    "rows": 8,
    "cols": 8,
    "pieceTemplates": ["gem_ruby", "gem_sapphire", "gem_emerald", "gem_topaz", "gem_amethyst", "gem_diamond"],
    "minMatch": 3
  },
  "templates": {
    "gem_ruby": {
      "sprite": { "type": "image", "imageUrl": "generated://gem_ruby.png" },
      "physics": { "bodyType": "dynamic", "shape": "circle", "radius": 0.4 },
      "conditionalBehaviors": [
        {
          "when": { "hasTag": "selected" },
          "priority": 2,
          "behaviors": [
            { "type": "scale_oscillate", "min": 0.95, "max": 1.08, "speed": 4 },
            { "type": "sprite_effect", "effect": "glow", "params": { "color": [1, 0.2, 0.2], "pulse": true } }
          ]
        },
        {
          "when": { "hasTag": "matched" },
          "priority": 3,
          "behaviors": [
            { "type": "particle_emitter", "effect": "sparkle_burst", "count": 20 },
            { "type": "sprite_effect", "effect": "fade_out", "duration": 0.3 }
          ]
        }
      ]
    }
  }
}
```

**Why This Works**:
- AI only needs to understand **high-level concepts** ("matching game")
- System handles **complex algorithms** (match detection, cascades)
- Conditional behaviors handle **visual polish** (declarative, tunable)
- Clear **validation** at each step
- **Explainable**: AI can say why it chose each option

## Marketplace Design Principles

### 1. **Everything is Hot-Swappable**

**Problem**: Currently, changing from simple physics to Match-3 requires rewriting the entire game.

**Solution**: Systems declare their **extension points** and **dependencies**.

```typescript
// User starts with simple physics game
const game: GameDefinition = {
  entities: [
    { id: "ball", template: "physics_ball" }
  ]
};

// SWAP 1: Change asset pack
game.templates.physics_ball.sprite.imageUrl = "marketplace://cartoon-pack/ball.png";
// ✅ Works immediately, no code changes

// SWAP 2: Add Match-3 system
game.match3 = { rows: 8, cols: 8, pieceTemplates: ["gem_red", "gem_blue"] };
delete game.entities; // Match-3 generates its own grid
// ✅ Compatible because both use entity foundation

// SWAP 3: Change visual feedback
game.templates.gem_red.conditionalBehaviors = [
  { when: { hasTag: "selected" }, behaviors: [{ type: "sprite_effect", effect: "marketplace://neon-glow" }] }
];
// ✅ Works because visual feedback is declarative
```

### 2. **AI as Marketplace Navigator**

**The AI's job isn't to write code—it's to browse the marketplace and configure the right pieces.**

```typescript
// User: "I want a Match-3 game with pixel art gems"

AI reasoning:
1. Intent: Match-3 mechanic → Search marketplace for "match3" system
2. Found: Match3GameSystem v1.0.0 (95% rating, 10k downloads)
3. Assets: Search marketplace for "pixel art gems"
4. Found: RetroGemsPack (128x128px, 8 colors, $0 free tier)
5. Configuration:
   - match3.rows = 8
   - match3.cols = 8
   - match3.pieceTemplates = RetroGemsPack.gems.slice(0, 6)
6. Visual Polish:
   - Add "selected" state with marketplace://vfx/pixel-glow
   - Add "matched" state with marketplace://vfx/pixel-burst
7. Validation: ✓ All marketplace items compatible
8. Generate: Complete GameDefinition
```

**Benefits**:
- AI doesn't need to understand Match-3 internals
- Users can **preview marketplace items** before AI generates
- **Upgrade** any piece later (swap gem pack, change glow effect)
- **Versioning**: "Use Match3GameSystem v2.0 instead" → one config change

### 3. **Dependency Resolution (Like npm)**

**Problem**: What if systems conflict? What if an asset requires a specific system version?

**Solution**: Marketplace items declare dependencies.

```typescript
// Marketplace item: "PowerUpExtension for Match3"
const PowerUpExtension: MarketplaceItem = {
  id: "match3-power-ups",
  type: "system_extension",
  version: "1.0.0",
  
  // DEPENDENCY CONTRACT
  requires: {
    systems: {
      match3: "^1.0.0"  // Compatible with Match3 v1.x
    },
    behaviors: ["sprite_effect", "particle_emitter"]
  },
  
  // WHAT IT ADDS
  provides: {
    behaviors: ["match4_row_clear", "match5_bomb"],
    templates: ["powerup_row_bomb", "powerup_color_bomb"],
    tags: ["powerup_active"]
  },
  
  // HOW TO USE
  install: (gameDefinition) => {
    // Adds power-up piece templates
    gameDefinition.templates.powerup_row = { ... };
    
    // Adds power-up logic to Match3 config
    gameDefinition.match3.specialMatches = {
      "4match": "powerup_row",
      "5match": "powerup_bomb"
    };
  }
};

// AI checks compatibility before adding
if (canInstall(PowerUpExtension, game)) {
  PowerUpExtension.install(game);
}
```

### 4. **Versioned Systems Prevent Breaking Changes**

```typescript
// GameSystemRegistry with versioning
const registry = new GameSystemRegistry();

registry.register({
  id: "match3",
  version: { major: 1, minor: 0, patch: 0 },
  configSchema: Match3ConfigV1Schema,  // Zod validation
  // ... system implementation
});

registry.register({
  id: "match3",
  version: { major: 2, minor: 0, patch: 0 },
  configSchema: Match3ConfigV2Schema,  // Breaking changes OK, new major version
  migrations: {
    "1.x": (oldConfig) => migrateV1toV2(oldConfig)  // Auto-upgrade path
  }
});

// Game specifies version
const game: GameDefinition = {
  systemManifest: {
    "match3": "1.0.0"  // Lock to v1.x for stability
  },
  match3: { ... }
};

// Validation at load time
const compatibility = registry.validateManifest(game.systemManifest);
if (!compatibility.compatible) {
  throw new Error(`Incompatible systems: ${compatibility.errors}`);
}
```

## Architectural Analysis: What's Missing vs What's Great

### ✅ What's Working Well

| Component | Strength | Keep/Enhance |
|-----------|----------|--------------|
| **Entity Templates** | Clean reusability, AI can generate easily | ✅ Keep as-is |
| **Behavior Catalog** | 20 behaviors cover most game needs, composable | ✅ Keep, add conditional triggers |
| **Rules System** | Declarative global logic, action registry extensible | ✅ Keep, document better |
| **Physics Integration** | Godot 4 sync works smoothly, good perf | ✅ Keep |
| **Type Safety** | Full TypeScript + Zod schemas | ✅ Keep |

### ⚠️ What Needs Redesign

| Gap | Current State | Proposed Solution |
|-----|---------------|-------------------|
| **Dynamic Tags** | Tags are static arrays, no runtime changes | Add `EntityManager.addTag()` / `removeTag()` |
| **Conditional Behaviors** | All behaviors always active | Add `when: { hasTag: 'X' }` wrapper |
| **Visual State Management** | Match3 has 80 lines of imperative glow/scale code | New behaviors: `scale_oscillate`, `sprite_effect` |
| **Game System Plugins** | Match3 not using registry, can't version or extend | Migrate to `GameSystemRegistry.register()` pattern |
| **Behavior Lifecycle** | No cleanup hooks when conditions change | Add `onActivate()` / `onDeactivate()` to behaviors |
| **State Machine Clarity** | Implicit states (idle → selected → swapping) | Make explicit via tags + conditional behaviors |

### 🎯 Core Insight: The "Slot Machine" Pattern

**Problem**: Complex games need **swappable logic modules** but we only support swapping **graphics**.

**Current**: You can swap sprites (`pieceTemplates` in Match3) but not the **selection behavior** or **match detection algorithm**.

**Proposed**: 
1. **Core Engine**: Entities + Behaviors + Rules (always present)
2. **Game Systems** (swappable plugins): Match3System, Tetris System, Card System, etc.
3. **Visual States** (declarative): Tag-based conditional behaviors

**Like Scratch for Kids**:
- **Blocks** = Behaviors (declarative, composable)
- **Costumes** = Sprites (swappable assets)
- **Broadcast Messages** = Tags (state changes)
- **Extensions** = Game Systems (complex logic plugins)

## System Composability - The "Slots" Design Pattern

**Key Insight**: Users should be able to **swap systems like LEGO blocks** without breaking the game.

### Current Problem
- Match3 is **monolithic** - you can't mix it with other systems
- No clear **extension points** for customization
- AI doesn't know **what's swappable**

### Proposed: "Slots" Architecture

Think of each game system as a **slot machine cartridge** with:
1. **Input Contract**: What it needs from the game
2. **Output Contract**: What it provides to entities
3. **Extension Slots**: Where users can customize

#### Example: Match3 System Slots

```typescript
const Match3System: GameSystemDefinition = {
  id: "match3",
  version: { major: 1, minor: 0, patch: 0 },
  
  // INPUT CONTRACT - What system needs
  requires: {
    gridLayout: "GridConfig",  // Must have a grid
    pieceTemplates: "EntityTemplate[]",  // Must have piece types
    entityManager: "EntityManager"  // Access to spawn/destroy
  },
  
  // OUTPUT CONTRACT - What system provides
  provides: {
    tags: ["selected", "matched", "falling"],  // States it manages
    events: ["match_found", "cascade_complete", "no_moves"],  // Events it fires
    expressionFunctions: {
      "combo_multiplier": "(cascadeLevel) => cascadeLevel * 50",
      "match_size_bonus": "(matchSize) => matchSize > 3 ? 200 : 100"
    }
  },
  
  // EXTENSION SLOTS - Where users customize
  slots: {
    matchDetection: {
      default: "standard_3_match",
      alternatives: ["diagonal_match", "shape_match", "color_chain"],
      signature: "(board) => Match[]"
    },
    scoreCalculation: {
      default: "cascade_multiplier",
      alternatives: ["fixed_score", "combo_bonus"],
      signature: "(matchCount, cascadeLevel) => number"
    },
    visualFeedback: {
      default: "conditional_behaviors",  // Uses the new system!
      customizable: true,
      via: "template.conditionalBehaviors"
    }
  }
};
```

### How This Helps AI

**AI can now reason about**:
1. **Compatibility**: "Can I use match3 + physics platformer?" → Check input contracts
2. **Customization**: "How do I make matches diagonal?" → Check available slots
3. **Composition**: "What events can I react to?" → Check provided events

**Example AI Logic**:
```typescript
// User: "Make a Match-3 game but with special diagonal matches"

AI reasoning:
1. Use match3 system ✓
2. Check slots.matchDetection → has "diagonal_match" alternative ✓
3. Generate config:
   match3: {
     matchDetection: "diagonal_match",  // Override default
     // ... other configs use defaults
   }
```

### Registry Pattern for Discoverability

```typescript
// Game System Registry
const SYSTEM_REGISTRY = {
  match3: Match3SystemDefinition,
  tetris: TetrisSystemDefinition,
  endless_runner: EndlessRunnerSystemDefinition
};

// AI can query at generation time
function canSystemsCoexist(systemA, systemB) {
  const conflictingTags = intersection(
    systemA.provides.tags,
    systemB.provides.tags
  );
  return conflictingTags.length === 0;
}

// Example
canSystemsCoexist(SYSTEM_REGISTRY.match3, SYSTEM_REGISTRY.physics_platformer)
  → false (both want to manage entity positions)
  
canSystemsCoexist(SYSTEM_REGISTRY.match3, SYSTEM_REGISTRY.particle_effects)
  → true (non-overlapping concerns)
```

### Scratch Analogy

| Scratch Concept | Slopcade Equivalent | AI Knows |
|-----------------|---------------------|----------|
| **Sprite** | Entity Template | ✓ Always available |
| **Costume** | Sprite Component | ✓ Swappable assets |
| **Blocks** | Behaviors | ✓ 20 built-in types |
| **Broadcast** | Tag + Event System | ✓ New: State management |
| **Extension** | Game System | ✓ New: Slot-based plugins |
| **My Blocks** | Custom Behaviors | ⚠️ Future: AI writes custom |

## Scope Boundaries

### IN SCOPE (This Redesign)
- Dynamic tag management system
- Conditional behaviors based on tags
- New visual effect behaviors (scale_oscillate, sprite_effect)
- Refactor Match3GameSystem to use tags + conditional behaviors
- GameSystem plugin registration pattern

### OUT OF SCOPE (Future Work)
- Visual programming UI (Scratch-like blocks)
- Animation state machines
- Complex AI prompt engineering for conditional behaviors
- Performance optimizations (start simple, measure, optimize)
- Other game systems beyond Match3

## Technical Approach Decided

### Phase 1: Core Tag System
1. Add tag management methods to EntityManager
2. Add tag change event system (optional, for perf)
3. Update entity schema to track dynamic tags separately from static tags

### Phase 2: Conditional Behaviors
1. Add ConditionalBehavior schema to shared types
2. Update BehaviorExecutor to evaluate conditions each frame
3. Implement behavior activation/deactivation lifecycle

### Phase 3: Visual Behaviors
1. Implement scale_oscillate behavior
2. Implement sprite_effect behavior (wraps bridge calls)
3. Test with simple examples

### Phase 4: Refactor Match3
1. Register Match3GameSystem with GameSystemRegistry
2. Move visual effects from imperative code to conditional behaviors
3. Update game definition JSON to use new pattern

### Phase 5: System Slots & Registry
1. Update GameSystemDefinition to include `slots` and contracts
2. Migrate Match3 to new slot-based pattern
3. Add system compatibility checker

### Phase 6: AI Prompt Engineering
1. Create tiered system documentation (Tier 1, 2, 3)
2. Add system selection logic to game generator
3. Update validation to check system contracts
4. Add examples for each system tier

### Phase 7: Documentation & Templates
1. Update behavior system docs with conditional behaviors
2. Create "State Machine Patterns" guide (idle → selected → matched)
3. Add Match3 refactor as case study
4. Expand template library with system-based games

## Incremental Migration Path (No Big Bang!)

### Milestone 1: Foundation (Week 1)
**Goal**: Tag system + conditional behaviors working in isolation

- [ ] Add `EntityManager.addTag()` / `removeTag()` / `hasTag()`
- [ ] Add `ConditionalBehavior` schema to types
- [ ] Implement priority-based conditional evaluation in BehaviorExecutor
- [ ] Create `scale_oscillate` behavior
- [ ] Create `sprite_effect` behavior
- [ ] **Test**: Simple entity with "selected" tag triggers glow effect

**Validation**: Can toggle tag, see effect activate/deactivate

### Milestone 2: Match3 Refactor (Week 2)
**Goal**: Prove the pattern works with real complex system

- [ ] Keep Match3 imperative logic (board, matching, cascades)
- [ ] **Remove** all visual effect code (showHighlight, updateSelectionScale, etc.)
- [ ] **Replace** with tag manipulation (`addTag("selected")`, `removeTag("matched")`)
- [ ] Add conditional behaviors to gem templates
- [ ] **Test**: Match3 game plays identically but uses new pattern

**Validation**: 80 lines of visual code deleted, works via tags

### Milestone 3: System Registry (Week 3)
**Goal**: Make Match3 a proper registered plugin

- [ ] Extend `GameSystemDefinition` with `slots` and contracts
- [ ] Implement Match3 as registered system
- [ ] Add system lifecycle hooks (onGameLoad, onUpdate, onUnload)
- [ ] Create system compatibility checker
- [ ] **Test**: Can enable/disable Match3 system dynamically

**Validation**: GameSystemRegistry.get("match3") returns definition with slots

### Milestone 4: AI Integration (Week 4)
**Goal**: AI can generate Match3 games reliably

- [ ] Create tiered documentation for Match3 system
- [ ] Update game generator to detect Match-3 intent
- [ ] Add Match3 config generation logic
- [ ] Add system validation to generator
- [ ] **Test**: "Make a gem matching game" → generates valid Match3 config

**Validation**: >85% success rate on Match-3 generation prompts

### Milestone 5: Second System (Week 5+)
**Goal**: Prove pattern generalizes

- [ ] Pick next complex game type (Tetris? Card game? Endless runner?)
- [ ] Implement as GameSystem using same pattern
- [ ] Add to registry
- [ ] Update AI generator
- [ ] **Test**: AI can choose between multiple systems

**Validation**: Two systems coexist, AI picks correct one based on prompt
