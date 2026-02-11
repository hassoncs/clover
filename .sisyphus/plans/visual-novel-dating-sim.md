# Visual Novel + Dating Sim Integration

> **Prerequisite:** This plan assumes the modular bridge protocol from `modular-engine-architecture.md` is in place. Specifically: sectioned bridge loading (`setupWorld`, `registerTemplates`, `loadEntities`, `clearEntities`) and consolidated Zod validation.

## TL;DR

Add first-class VN/dating sim support to Slopcade by:

1. Extending `GameDefinition` with an optional `narrative` subsystem (additive, no regressions)
2. Building a narrative runtime that drives the game through dialogue/choices/branches
3. Adding VN-specific UI (dialogue box, choices, portraits, backlog)
4. Using the modular bridge to load VN scenes incrementally (one scene at a time)
5. Extending AI generation to produce valid narrative graphs

The narrative system follows the same pattern as existing subsystems (`containers`, `match3`, `tetris`) — optional config in the definition, dedicated runtime module, no changes to non-VN games.

---

## How VN Games Use the Modular Engine

A VN game compiled to a sectioned bundle looks like:

```
sections: {
  world: { ... },                    // Minimal — no physics needed for pure VN
  templates: {
    "portrait-maya": { visual: { type: "image" }, ... },
    "bg-cafe": { visual: { type: "image" }, ... },
    ...
  },
  entities: [                         // Initial scene entities (scene 1)
    { id: "bg", template: "bg-cafe", transform: {...} },
    { id: "maya-portrait", template: "portrait-maya", transform: {...} },
    ...
  ],
  narrative: {                        // NEW — narrative graph
    start: "scene-1-node-1",
    characters: { ... },
    scenes: { "scene-1": { nodes: [...] }, "scene-2": { nodes: [...] } },
    relationships: { ... },
  },
  rules: [],                          // VN games may use few/no physics rules
}
```

When the player advances to scene 2:
1. Narrative runtime resolves the next scene ID
2. `clearEntities()` — removes scene 1 entities
3. `loadEntities(scene2Entities)` — loads scene 2 entities via sectioned bridge
4. Narrative runtime continues executing nodes in scene 2

Templates (portraits, backgrounds) persist across scenes. Only entities swap. This is the lazy loading model — free from the modular bridge.

---

## Narrative Data Model

### Type Additions (additive to GameDefinition)

```ts
// shared/src/types/narrative.ts

interface NarrativeConfig {
  start: string;                                   // Entry node ID
  characters: Record<string, NarrativeCharacter>;
  scenes: Record<string, NarrativeScene>;
  relationships?: RelationshipConfig;
}

interface NarrativeCharacter {
  id: string;
  name: string;
  displayName?: string;                            // Localized display name
  portraitTemplate?: string;                        // Template ID for portrait entity
  expressions?: Record<string, string>;            // expression -> asset ref
}

interface NarrativeScene {
  id: string;
  nodes: NarrativeNode[];
  entities?: string[];                             // Entity IDs to load for this scene
  background?: string;                             // Background template or asset ref
}

type NarrativeNode =
  | LineNode
  | ChoiceNode
  | BranchNode
  | SetNode
  | JumpNode
  | ScriptNode
  | EndNode;

interface LineNode {
  type: 'line';
  id: string;
  speaker?: string;                                // Character ID
  text: string;
  expression?: string;                             // Portrait expression key
  next: string;                                    // Next node ID
  effects?: NarrativeEffect[];                     // Side effects on advance
}

interface ChoiceNode {
  type: 'choice';
  id: string;
  prompt?: string;                                 // Optional text above choices
  options: ChoiceOption[];
}

interface ChoiceOption {
  text: string;
  next: string;                                    // Node ID to jump to
  visibleWhen?: string;                            // Expression — hide if false
  enabledWhen?: string;                            // Expression — disable if false
  effects?: NarrativeEffect[];                     // Effects on selection
}

interface BranchNode {
  type: 'branch';
  id: string;
  conditions: Array<{
    when: string;                                  // Expression
    next: string;                                  // Node ID if true
  }>;
  fallback: string;                                // Default node ID
}

interface SetNode {
  type: 'set';
  id: string;
  effects: NarrativeEffect[];
  next: string;
}

interface JumpNode {
  type: 'jump';
  id: string;
  target: string;                                  // Node ID (can cross scenes)
  scene?: string;                                  // Scene ID (triggers scene transition)
}

interface ScriptNode {
  type: 'script';
  id: string;
  call: string;                                    // Script function name
  args?: Record<string, unknown>;
  next: string;
}

interface EndNode {
  type: 'end';
  id: string;
  ending?: string;                                 // Ending ID for tracking
}

type NarrativeEffect =
  | { type: 'set_var'; key: string; value: string | number | boolean }
  | { type: 'add_var'; key: string; amount: number }
  | { type: 'set_flag'; flag: string; value: boolean }
  | { type: 'add_relationship'; character: string; stat: string; amount: number }
  | { type: 'set_relationship'; character: string; stat: string; value: number }
  | { type: 'emit_event'; event: string; data?: Record<string, unknown> };

interface RelationshipConfig {
  stats: Record<string, RelationshipStat>;         // Stat definitions
  characters: Record<string, Record<string, number>>; // Initial values per character
}

interface RelationshipStat {
  name: string;
  min?: number;                                    // Default 0
  max?: number;                                    // Default 100
  default?: number;                                // Default 0
}
```

### Integration with GameDefinition

```ts
interface GameDefinition {
  // ... existing fields unchanged ...
  narrative?: NarrativeConfig;                     // NEW — optional
}
```

Non-VN games: `narrative` is undefined. Zero impact.

---

## Narrative Runtime

### Architecture

The narrative runtime is a new system module that integrates with the existing `GameSystemRunner`. It:

1. Maintains a cursor (`{ sceneId, nodeId }`) pointing to the current narrative position
2. Exposes `advance()` and `selectChoice(index)` APIs
3. Executes node effects (variable mutations, relationship changes, events)
4. Emits events that the existing rules engine can consume
5. Triggers scene transitions via the modular bridge (`clearEntities` + `loadEntities`)

### Runtime State

```ts
interface NarrativeState {
  cursor: { sceneId: string; nodeId: string };
  currentNode: NarrativeNode;
  flags: Record<string, boolean>;
  relationships: Record<string, Record<string, number>>;  // character -> stat -> value
  visitedNodes: Set<string>;
  backlog: BacklogEntry[];
  ended: boolean;
  endingId?: string;
}

interface BacklogEntry {
  nodeId: string;
  speaker?: string;
  text: string;
  timestamp: number;
}
```

### Integration Points

| Existing System | How Narrative Connects |
|---|---|
| **GameState / Variables** | Narrative effects write to `gameState.vars`. Narrative expressions read from `gameState.vars`. Same variable namespace. |
| **Rules Engine** | Narrative emits events (e.g., `narrative:advance`, `narrative:choice`, `narrative:scene_change`). Rules can trigger on these. |
| **Overlay System** | Narrative UI components render via the overlay layer. No new rendering path. |
| **Script Sandbox** | `ScriptNode` calls functions in the existing QuickJS sandbox. |
| **Asset System** | Portrait expressions and backgrounds reference asset pack entries via standard `assetRef`. |

### Scene Transition Flow

```
1. Player advances past a JumpNode with scene="scene-2"
2. NarrativeRuntime:
   a. Resolves scene-2 entity list from narrative.scenes["scene-2"].entities
   b. Calls bridge.clearEntities()
   c. Calls bridge.loadEntities(scene2Entities)
   d. Updates cursor to { sceneId: "scene-2", nodeId: jumpTarget }
   e. Emits "narrative:scene_change" event
3. UI updates portraits/background for new scene
4. Runtime continues executing nodes in scene-2
```

---

## Narrative UI

### Components

All VN UI renders as overlay components on top of the Godot canvas. Uses the existing overlay rendering approach.

| Component | Responsibility |
|---|---|
| **DialogueBox** | Speaker name, text with typewriter effect, tap-to-advance |
| **ChoiceMenu** | Renders choice options. Supports visible/enabled gating. |
| **PortraitDisplay** | Shows character portrait with expression changes. Positioned via layout config. |
| **BacklogPanel** | Scrollable history of dialogue lines. Toggle via button/gesture. |
| **SaveLoadUI** | Slot-based save/load interface (if save system implemented). |

### Layout

```
┌─────────────────────────────────┐
│         [Background]            │
│                                 │
│  [Portrait L]    [Portrait R]   │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Speaker Name                │ │
│ │ Dialogue text appears here  │ │
│ │ with typewriter effect...   │ │
│ │                    [▼]      │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

When choices appear:
```
┌─────────────────────────────────┐
│ ┌─────────────────────────────┐ │
│ │  ❯ Choice A                 │ │
│ │    Choice B                 │ │
│ │    Choice C (locked 🔒)     │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Mobile Considerations
- Dialogue box respects safe area insets
- Tap anywhere to advance (except on choice buttons)
- Swipe up to open backlog
- Portrait positions adapt to screen width

---

## Relationship System

### How It Works

Relationships are a typed stat map per character. They integrate with the expression engine for condition evaluation.

```ts
// In narrative config:
relationships: {
  stats: {
    affection: { name: "Affection", min: 0, max: 100, default: 0 },
    trust: { name: "Trust", min: 0, max: 100, default: 0 },
  },
  characters: {
    maya: { affection: 0, trust: 10 },
    alex: { affection: 0, trust: 0 },
  }
}
```

Effects modify relationships:
```json
{ "type": "add_relationship", "character": "maya", "stat": "affection", "amount": 5 }
```

Conditions gate choices:
```json
{ "enabledWhen": "relationship('maya', 'affection') >= 40" }
```

Relationship values are stored in `NarrativeState.relationships` and persisted alongside game variables.

---

## Save/Load

### Save Snapshot

```ts
interface VNSaveSnapshot {
  formatVersion: number;
  contentHash: string;          // Bundle hash — detects version mismatch
  cursor: { sceneId: string; nodeId: string };
  variables: Record<string, unknown>;
  flags: Record<string, boolean>;
  relationships: Record<string, Record<string, number>>;
  visitedNodes: string[];
  backlog: BacklogEntry[];
  timestamp: number;
}
```

### Stable IDs Requirement

Save files reference node IDs and scene IDs. These must be author-specified and stable across versions. The compiler should enforce that:
- Every node has an explicit `id` (no auto-generated IDs)
- Node IDs are unique within a scene
- Scene IDs are unique globally
- Removing a referenced node is a compile warning

### Slots

Multiple save slots. Autosave on scene transitions. Manual save via UI button.

---

## AI Generation

### Extending the Pipeline

The AI generation pipeline (`api/src/ai/game/`) needs to:

1. **Classify VN intent.** Detect prompts like "create a dating sim" or "make a visual novel."
2. **Generate narrative graph.** Produce valid `NarrativeConfig` JSON with characters, scenes, nodes, relationships.
3. **Validate output.** Run the same semantic validator used by the compiler. Catch dead ends, missing refs, unreachable endings.
4. **Plan assets.** Output portrait expression requirements and background requirements for the asset generation pipeline.

### Generation Contract

AI outputs the same `NarrativeConfig` type that the compiler expects. Same validation. Same schema. No special "AI format."

### Asset Requirements

For a VN game, AI needs to generate/request:
- Character portraits (multiple expressions per character)
- Scene backgrounds
- Optional: CG images for key moments

These map to standard asset pack entries. The existing `scenario.com` pipeline handles image generation. The new requirement is generating expression variants (happy, sad, angry, etc.) for each character portrait.

---

## Execution Strategy

### Dependency on Modular Engine

| This plan's task | Requires from modular engine plan |
|---|---|
| Scene transitions | Sectioned bridge (Task 1) |
| Validation | Consolidated Zod pipeline (Task 2) |
| Incremental loading | `clearEntities` + `loadEntities` |
| Save/load | Stable entity IDs (enforced by compiler) |

If the modular engine plan hasn't shipped yet, Tasks 1-3 below can still proceed using `loadGameJson` for the whole definition. Scene transitions would require a full reload instead of incremental. Not ideal but functional.

### Waves

```
Wave 1 (Start Immediately):
├── Task 1: Add narrative type system + Zod schemas
├── Task 2: Add relationship type system
└── Task 5: External pattern synthesis notes

Wave 2 (After Wave 1):
├── Task 3: Build narrative runtime engine
└── Task 4: Add VN asset resolution (portrait expressions)

Wave 3 (After Wave 2):
├── Task 5: Build narrative UI (dialogue, choices, portraits, backlog)
└── Task 6: Add save/load slot persistence

Wave 4 (After Wave 3):
├── Task 7: Create sample VN game (3 scenes, 2 characters, 2 endings)
└── Task 8: Extend AI generation for narrative graphs

Wave 5 (After Wave 4):
└── Task 9: Integration testing + regression verification
```

**Critical Path:** Task 1 → Task 3 → Task 5 → Task 7 → Task 9

### Estimated Effort
- Wave 1: ~3 days (type definitions, schema work)
- Wave 2: ~1 week (runtime + asset resolver)
- Wave 3: ~1 week (UI components + persistence)
- Wave 4: ~1 week (sample game + AI extension)
- Wave 5: ~2 days (testing)
- **Total: ~4 weeks**

---

## TODOs

### Task 1: Add Narrative Type System + Zod Schemas

**What to do:**
- Create `shared/src/types/narrative.ts` with all narrative types
- Create Zod schemas for narrative types in `shared/src/schemas/`
- Extend `GameDefinition` with optional `narrative` field
- Extend the consolidated validation pipeline to cover narrative

**Must NOT do:**
- Do not break existing GameDefinition compatibility
- Do not duplicate expression language — reuse existing expression conventions

**References:**
- `shared/src/types/GameDefinition.ts` — extension point
- `shared/src/types/rules.ts` — existing trigger/condition/action patterns
- `shared/src/schemas/` — consolidated validation (from modular engine plan)

**Acceptance Criteria:**
- [ ] Narrative types compile
- [ ] Zod schemas validate and reject invalid structures
- [ ] GameDefinition with `narrative: undefined` passes unchanged
- [ ] `pnpm tsc --noEmit` passes

**Recommended Agent Profile:**
- **Category**: `unspecified-high`
- **Skills**: [`game-authoring`, `test-driven-development`]

---

### Task 2: Add Relationship Type System

**What to do:**
- Define relationship config, stats, and per-character initial values
- Add relationship effects to `NarrativeEffect` union
- Add relationship accessors for the expression engine (`relationship('maya', 'affection')`)

**Must NOT do:**
- Do not create a second expression language

**References:**
- `shared/src/expressions/types.ts` — expression engine to extend
- `shared/src/types/rules.ts` — condition/effect patterns

**Acceptance Criteria:**
- [ ] Relationship types defined and schema-validated
- [ ] Expression engine can evaluate `relationship()` function
- [ ] Relationship effects (add/set) are typed and validated

**Recommended Agent Profile:**
- **Category**: `unspecified-high`
- **Skills**: [`game-authoring`, `test-driven-development`]

---

### Task 3: Build Narrative Runtime Engine

**What to do:**
- Create narrative runtime module with node traversal
- Implement `advance()` and `selectChoice(index)` APIs
- Execute effects (variable mutations, relationship changes, events)
- Handle scene transitions via bridge (`clearEntities` + `loadEntities`)
- Integrate into GameSystemRunner lifecycle

**Must NOT do:**
- Do not fork separate game loop — integrate as a system
- Do not bypass existing state/event patterns

**References:**
- `app/lib/game-engine/GameRuntime.godot.tsx` — lifecycle integration
- `app/lib/game-engine/systems/runner/GameSystemRunner.ts` — system registration
- `app/lib/game-engine/runtime/GameStateHelpers.ts` — variable mutation patterns

**Acceptance Criteria:**
- [ ] Runtime initializes only when `definition.narrative` exists
- [ ] Line nodes advance deterministically
- [ ] Choice nodes present options and branch correctly
- [ ] Branch nodes evaluate conditions and route
- [ ] Scene transitions swap entities via bridge
- [ ] Non-VN games run without narrative runtime

**Recommended Agent Profile:**
- **Category**: `unspecified-high`
- **Skills**: [`game-authoring`, `systematic-debugging`]

---

### Task 4: Add VN Asset Resolution (Portrait Expressions)

**What to do:**
- Define portrait expression mapping in narrative character data
- Add resolver that maps expression keys to asset pack entries
- Fallback to neutral expression if requested expression is missing
- Integrate with existing `useAssetResolution` hook

**Must NOT do:**
- Do not create competing asset storage schema
- Do not require DB migration for v1

**References:**
- `shared/src/types/asset-system.ts` — asset pack types
- `app/lib/game-engine/hooks/useAssetResolution.ts` — resolution hook
- `shared/src/utils/definition-resolver.ts` — definition-level resolution

**Acceptance Criteria:**
- [ ] Portrait expressions resolve via active asset pack
- [ ] Missing expression falls back to neutral/default
- [ ] No regression to existing image template resolution

**Recommended Agent Profile:**
- **Category**: `unspecified-high`
- **Skills**: [`asset-pack-generation`, `game-authoring`]

---

### Task 5: Build Narrative UI Components

**What to do:**
- DialogueBox: speaker name, typewriter text, tap-to-advance
- ChoiceMenu: option rendering with visible/enabled gating
- PortraitDisplay: character portrait with expression switching
- BacklogPanel: scrollable dialogue history
- Integrate with overlay rendering system

**Must NOT do:**
- Do not replace existing GameDialog for non-VN games
- Do not hardcode character IDs or game-specific strings

**References:**
- `app/components/game/GameDialog.tsx` — existing dialog pattern
- `app/lib/game-engine/ui/overlay/OverlayRenderer.tsx` — overlay conventions
- `app/lib/game-engine/TapZoneOverlay.tsx` — input overlay pattern

**Acceptance Criteria:**
- [ ] Dialogue box displays speaker + text + continue indicator
- [ ] Choice menu renders gated options correctly
- [ ] Portrait expressions update on node change
- [ ] Backlog panel shows recent lines
- [ ] Mobile safe area respected

**Recommended Agent Profile:**
- **Category**: `visual-engineering`
- **Skills**: [`frontend-ui-ux`, `game-authoring`]

---

### Task 6: Add Save/Load Slot Persistence

**What to do:**
- Define VN save snapshot schema
- Implement save/load for cursor, variables, flags, relationships, backlog
- Add autosave on scene transitions
- Add manual save slot UI trigger

**Must NOT do:**
- Do not break existing per-game persistence
- Do not store transient UI state in saves

**References:**
- `shared/src/types/progress.ts` — existing progress schema
- `app/lib/game-engine/progress/GameProgressManager.ts` — save/load integration

**Acceptance Criteria:**
- [ ] Save captures exact narrative position + all state
- [ ] Load restores to same scene/node/choice context
- [ ] Autosave triggers on scene transitions
- [ ] Corrupt save slot handled gracefully

**Recommended Agent Profile:**
- **Category**: `unspecified-high`
- **Skills**: [`game-authoring`, `test-driven-development`]

---

### Task 7: Create Sample VN Game

**What to do:**
- Build a small but complete VN: 3 scenes, 2 characters, 2+ endings
- Include relationship effects and condition-gated choices
- Include at least one scene transition
- Use abbreviated dialogue (not full prose)

**Must NOT do:**
- Do not create large content corpus
- Do not rely on unpublished assets (use placeholder images)

**Acceptance Criteria:**
- [ ] Game compiles and loads
- [ ] Both endings reachable through different choices
- [ ] Relationship gating works (high affection unlocks a branch)
- [ ] Save/load roundtrip preserves state
- [ ] Scene transition works via modular bridge

**Recommended Agent Profile:**
- **Category**: `writing`
- **Skills**: [`game-authoring`, `writing-plans`]

---

### Task 8: Extend AI Generation for Narrative Graphs

**What to do:**
- Add VN/dating sim classification to game type classifier
- Add narrative graph generation stage
- Validate AI output with same semantic validator as compiler
- Support partial regeneration (regenerate one scene)

**Must NOT do:**
- Do not generate freeform text without schema constraints
- Do not skip validation on AI output

**References:**
- `api/src/ai/game/classifier.ts` — classification extension
- `api/src/ai/game/generator.ts` — generation composition
- `api/src/ai/game/schemas.ts` — generation schemas (should now import from shared)

**Acceptance Criteria:**
- [ ] AI generates valid NarrativeConfig for VN prompts
- [ ] Validator catches dead ends and missing refs in generated content
- [ ] Generated content includes characters, scenes, and endings

**Recommended Agent Profile:**
- **Category**: `ultrabrain`
- **Skills**: [`context7-auto-research`, `test-driven-development`]

---

### Task 9: Integration Testing + Regression

**What to do:**
- Verify sample VN game end-to-end
- Verify all existing non-VN games still work
- Run `pnpm tsc --noEmit` across workspace
- Capture evidence

**Must NOT do:**
- Do not claim completion without evidence

**Acceptance Criteria:**
- [ ] Sample VN: both endings reachable
- [ ] Sample VN: save/load works
- [ ] All 10 existing games: no regressions
- [ ] Workspace typecheck passes
- [ ] Evidence in `.sisyphus/evidence/`

**Recommended Agent Profile:**
- **Category**: `unspecified-high`
- **Skills**: [`verification-before-completion`, `requesting-code-review`]

---

## Commit Strategy

| After Task | Message | Files |
|---|---|---|
| 1 | `feat(narrative): add narrative type system and schemas` | `shared/src/types/narrative.ts`, `shared/src/schemas/` |
| 2 | `feat(narrative): add relationship type system` | `shared/src/types/`, `shared/src/expressions/` |
| 3 | `feat(runtime): add narrative runtime engine` | `app/lib/game-engine/` |
| 4 | `feat(assets): add portrait expression resolution` | `shared/`, `app/lib/game-engine/hooks/` |
| 5 | `feat(ui): add narrative dialogue and choice overlay` | `app/components/game/narrative/` |
| 6 | `feat(persistence): add VN save slots` | `shared/src/types/progress.ts`, `app/lib/game-engine/progress/` |
| 7 | `feat(vn): add sample VN game` | `r2/games/sampleVN/` |
| 8 | `feat(ai): add narrative graph generation` | `api/src/ai/game/` |
| 9 | `chore(vn): integration verification and regression` | `.sisyphus/evidence/` |

---

## Non-Negotiables

1. **Additive only.** No modifications to existing GameDefinition fields. Narrative is optional.
2. **Same validation path.** Narrative schemas use the consolidated Zod pipeline. No separate validation.
3. **No new rendering path.** VN UI renders via existing overlay system.
4. **Stable node IDs.** Every narrative node must have an explicit, author-specified ID. Required for save/load.
5. **Existing games unaffected.** All 10 non-VN games must pass regression after every task.
6. **Expressions reuse existing engine.** No second expression language for conditions/gating.
