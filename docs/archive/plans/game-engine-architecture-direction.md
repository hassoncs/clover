# Slopcade Engine: Architectural Vision

> **Status**: Draft v2 — reframed from "migration plan" to "platform architecture"
> **Origin**: Ball Sort bug exposed structural debt. Research surfaced the real question: how should games be authored for AI at scale?

---

## Part 1: What We're Building

### The One-Liner

Slopcade is an AI-powered game creation platform — a **mini Unity where AI is the developer**. Users describe what they want; AI writes, tests, debugs, and iterates on the game. Users browse the result, tweak parameters, and play. AI does the engineering.

### The Architecture Constraint

Everything in the engine must be optimized for one question: **can an AI agent, operating within a bounded context window, write correct code, find bugs, and grow a game's complexity over time?**

This means:
- **Bounded file scope**: When AI needs to change something, it edits 1-2 files, not 20.
- **Explicit contracts**: No implicit dependencies between files. If file A needs something from file B, it's an explicit import or parameter.
- **Fail loudly**: Every error surfaces with context — which script, which entity, which hook, what went wrong.
- **Progressive complexity**: A game starts simple (one script, five prefabs) and grows complex (ten scripts, fifty prefabs, multiple levels) without architectural rewrites.

### The Rendering + Logic Split

```
┌─────────────────────────────────────────────────┐
│                   User Device                    │
│                                                  │
│  ┌──────────────┐  ┌────────────┐  ┌──────────┐ │
│  │  React Native │  │   Godot    │  │ QuickJS  │ │
│  │  (UI overlay) │  │   (WASM)   │  │ (sandbox)│ │
│  │               │  │            │  │          │ │
│  │  HUD, dialogs │  │ Sprites,   │  │ Game     │ │
│  │  menus, toast │  │ physics,   │  │ logic,   │ │
│  │               │  │ colliders, │  │ state,   │ │
│  │               │  │ animations │  │ rules    │ │
│  └──────┬───────┘  └─────┬──────┘  └────┬─────┘ │
│         │     Bridge      │    Bridge    │       │
│         └────────────────┼──────────────┘       │
│                          │                       │
│               TypeScript Game Engine             │
│          (entity management, systems, I/O)       │
└─────────────────────────────────────────────────┘
```

Godot handles rendering and physics. QuickJS handles game logic. React handles UI. TypeScript orchestrates everything. The question this document answers: **how should game logic be organized inside QuickJS?**

---

## Part 2: Where We Are (The Problem)

### The Three-System Hybrid

The engine evolved from purely declarative JSON into a hybrid of three competing behavior systems:

```
                    ┌─────────────────────────┐
                    │     definition.json      │
                    │  (1000-line monolith)    │
                    └─────────┬───────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
   ┌──────▼──────┐    ┌──────▼──────┐    ┌───────▼──────┐
   │ Rules System │    │   Script    │    │   Custom     │
   │ (JSON decl.) │    │  Sandbox    │    │  Action      │
   │              │    │  (QuickJS)  │    │  Executors   │
   │ writes to:   │    │ writes to:  │    │  writes to:  │
   │ game.state   │    │ ctx copy ←  │    │  game.state  │
   │ .vars        │    │ BUG (lost)  │    │  via mutator │
   └──────────────┘    └─────────────┘    └──────────────┘
```

No clear rule for which system owns what. An AI agent built a 255-level ball sort game; level advancement broke because the script wrote `currentLevel` to an ephemeral copy that was discarded each frame. Finding the bug required tracing 8 layers across 20 files. The AI that wrote the game couldn't debug it.

### Current Game Inventory (14 games)

| Game | Architecture | Rules | Script Lines | Custom Actions | Complexity |
|:---|:---|:---:|:---:|:---|:---|
| **ballSort** | Hybrid | 8 | ~220 | ball_sort_pickup/drop/check_win | High |
| **slopeggle** | Declarative | 11 | 0 | camera_shake, set_time_scale | High |
| **breakoutBouncer** | Declarative | 7 | 0 | — | Medium |
| **snake** | Hybrid | 6 | ~60 | — | Medium |
| **sokoban** | Hybrid | 4 | ~60 | — | Medium |
| **minefield** | Script-only | 0 | ~100 | — | Medium |
| **gemCrush** | Engine component | 0 | 0 | match3 subsystem | Special |
| **flappyBird** | Declarative | 2 | 0 | — | Low |
| **mrPotatoHead** | Hybrid | 1 | ~25 | — | Low |
| **tweenToggleCube** | Hybrid | 1 | ~10 | — | Low |
| shaderCRT/Multi/Rainbow | Demo | 1-3 | 0 | — | — |
| headsUp | Demo | 0 | 0 | — | — |

**Key finding**: 5 hybrids use rules mostly as thin `run_script` wrappers. The 4 pure-declarative games are the simplest ones. The most complex game (ballSort) is a hybrid — and it's the one that broke.

### What's Actually Broken

1. **Split variable ownership**: Three systems all write to different variable stores.
2. **26 action executors**: Including game-specific ones baked into the engine.
3. **8-layer event routing**: Button click → 8 hops → script execution.
4. **No clear ownership rule**: "This logic goes in rules" vs "this goes in scripts" vs "this goes in a custom executor" is undefined.
5. **AI can't maintain it**: The flow is distributed across 20+ files with implicit contracts.

---

## Part 3: The Architecture

### The Core Principle

**JSON defines what exists. Scripts define what happens.**

| Layer | Owns | Format | Example |
|:---|:---|:---|:---|
| **Prefabs** | Visual appearance, physics body, collider, tags, default params | JSON | `"sprite": "tube.png", "body": "static"` |
| **Levels** | Entity placement, level-specific configuration | JSON | `"entities": [{ "prefab": "tube", "x": 100 }]` |
| **UI** | HUD layout, dialog structure, variable bindings | JSON | `"text": "Level {{currentLevel}}"` |
| **Assets** | Image/sound references, asset pack metadata | JSON | `"break": "sounds/break.mp3"` |
| **Scripts** | ALL behavior — state, input, game rules, win/lose | JavaScript | `if (checkWin()) ctx.win();` |

### Game Project Structure

```
r2/games/ballSort/
├── game.json                 ← world config: physics, camera, viewport
├── prefabs/
│   ├── tube.json             ← data: sprite, collider, tags, script reference
│   ├── ball.json             ← data: sprite, physics body, color param
│   └── background.json       ← data: sprite, position
├── scripts/
│   ├── game.js               ← game-level logic: level loading, scoring, win/lose
│   ├── tube.js               ← tube behavior: pickup/drop validation, animation
│   └── levels.js             ← level data: tube configurations per level
├── assets/
│   ├── images.json           ← image asset references
│   └── sounds.json           ← sound asset references
├── ui/
│   ├── hud.json              ← HUD layout: score, level counter, move counter
│   └── dialogs.json          ← dialog layouts: levelComplete, paused
└── bundle/                   ← compiled single-file output
```

### The Script Model: Progressive Complexity

This is the key architectural decision. Scripts operate at **two levels**, adopted progressively as games grow:

#### Level 1: Game Script (Day 1 — every game starts here)

One `game.js` handles all behavior. Flat callbacks, closure state. This is the Love2D model.

```javascript
// scripts/game.js — owns ALL game logic
var state = { score: 0, lives: 3 };

exports.onStart = function(ctx) {
  state.score = 0;
  state.lives = 3;
  ctx.setVariable('score', 0);      // push to HUD
  ctx.setVariable('lives', 3);
};

exports.onCollisionEnter = function(ctx, event) {
  if (event.tagA === 'ball' && event.tagB === 'brick') {
    ctx.destroyEntity(event.entityB);
    state.score += 10;
    ctx.setVariable('score', state.score);
    ctx.playSound('break');
  }
};
```

**When this is enough**: Simple games (flappy bird, breakout, minefield). AI writes one file, debugs one file.

#### Level 2: Prefab Scripts (When complexity demands it)

When a game grows — more entity types, more behaviors, more reuse — logic splits into **per-prefab scripts**. Each script owns the behavior for one type of entity.

```json
// prefabs/enemy-slime.json
{
  "id": "enemy-slime",
  "visual": { "sprite": "slime.png" },
  "physics": { "body": "dynamic" },
  "tags": ["enemy", "slime"],
  "script": "enemy-slime",
  "scriptParams": {
    "speed": 2.0,
    "patrolRadius": 50
  }
}
```

```javascript
// scripts/enemy-slime.js — owns behavior for slime entities ONLY
exports.params = {
  speed: { type: 'number', default: 2.0, min: 0, max: 10 },
  patrolRadius: { type: 'number', default: 50, min: 10, max: 200 }
};

exports.onStart = function(ctx, entity) {
  var params = ctx.getParams(entity.id);
  entity.state = {
    origin: ctx.getEntityPosition(entity.id),
    direction: 1,
    speed: params.speed,
    radius: params.patrolRadius
  };
};

exports.onUpdate = function(ctx, entity, dt) {
  var s = entity.state;
  var pos = ctx.getEntityPosition(entity.id);
  // Patrol back and forth
  if (Math.abs(pos.x - s.origin.x) > s.radius) {
    s.direction *= -1;
  }
  ctx.setLinearVelocity(entity.id, { x: s.speed * s.direction, y: 0 });
};
```

**When to split**: When `game.js` exceeds ~200 lines, or when the same behavior pattern applies to multiple prefabs (e.g., all enemies patrol), or when AI needs to work on one entity type without loading the entire game.

**The game script orchestrates; prefab scripts handle entity behavior:**

```javascript
// scripts/game.js — orchestration only
exports.onStart = function(ctx) {
  ctx.setVariable('score', 0);
  spawnWave(ctx, 1);
};

function spawnWave(ctx, waveNum) {
  for (var i = 0; i < waveNum * 3; i++) {
    ctx.spawnEntity('enemy-slime', {
      x: 50 + i * 30, y: 100
    }, { speed: 1 + waveNum * 0.5 });  // params override
  }
}
```

### Why This Works for AI

| AI Task | Files AI Reads | Files AI Edits |
|:---|:---|:---|
| "Make enemies faster" | `enemy-slime.json` | Edit `speed` param (no code) |
| "Add a new enemy type" | `enemy-slime.js` (as reference) | Create `enemy-bat.json` + `enemy-bat.js` |
| "Fix scoring bug" | `game.js` | Edit scoring logic in `game.js` |
| "Add level 5" | `levels.js` | Add level data to `levels.js` |
| "Change the background color" | `game.json` | Edit world config |
| "Make the win dialog show the score" | `ui/dialogs.json` | Add `{{score}}` binding |

**Bounded context**: Each task maps to 1-2 files. AI doesn't need to understand the entire game to make a change.

### Prefab Composition

Prefabs already support hierarchical composition via `children` and `slots`. This enables building complex entities from simple parts:

```json
// prefabs/tube.json
{
  "id": "tube",
  "visual": { "sprite": "tube.png" },
  "collider": { "type": "box", "width": 40, "height": 160 },
  "tags": ["tube"],
  "slots": {
    "ball0": { "offset": { "y": -60 }, "accepts": ["ball"] },
    "ball1": { "offset": { "y": -20 }, "accepts": ["ball"] },
    "ball2": { "offset": { "y": 20 }, "accepts": ["ball"] },
    "ball3": { "offset": { "y": 60 }, "accepts": ["ball"] }
  }
}
```

A tube is a tube. A ball is a ball. The tube has slots for balls. The game script decides which balls go where. Composition through structure, not code.

### Level Organization

Games with multiple levels/stages use a `levels/` directory:

```
r2/games/slopeggle/
├── ...
├── levels/
│   ├── level-1.json       ← entity placement for level 1
│   ├── level-2.json       ← different peg layout
│   └── level-3.json
├── scripts/
│   ├── game.js            ← level loading, turn logic, scoring
│   └── levels.js          ← OR: level data as importable JS (simpler)
```

Level files are pure data — where to place entities, with what parameters. The game script loads them. For simple games, levels can just be data arrays inside `levels.js`. For complex games with many entities, separate JSON files keep things navigable.

---

## Part 4: State Management

### The Problem With Two Buckets

The original plan proposed closure state (ephemeral) + engine variables (durable). Research identified the issue: **every piece of state now requires a "which bucket?" decision** that AI must get right.

### The Solution: Clear Ownership Rule

**Script closures are the source of truth for game logic. Engine variables are a one-way display channel to the UI.**

```
┌──────────────┐         setVariable()         ┌──────────────┐
│  Script State │ ─────────────────────────────▶│  UI Display  │
│  (closure)    │    one-way push, NOT sync     │  (HUD/Dialog)│
│               │                               │              │
│  state.score  │ ──▶ ctx.setVariable('score')──▶│  {{score}}   │
│  state.level  │ ──▶ ctx.setVariable('level')──▶│  {{level}}   │
│  state.held   │    (no variable needed,       │              │
│               │     UI doesn't display this)  │              │
└──────────────┘                                └──────────────┘
```

**Rules:**
1. Game logic reads/writes **only** closure state.
2. `ctx.setVariable()` is called **only** to update what the HUD/dialogs display.
3. Variables are never the source of truth for game decisions.
4. On game restart, `onStart` re-initializes all closure state from scratch. No restoration needed — the game starts fresh.

**What about hot reload during development?**

When AI edits a script mid-session, the engine calls `onStart` again. For development iteration, this is fine — the game resets to its initial state. If we later need finer-grained reload (preserving mid-game state), we add an `onReload(ctx, previousState)` hook. But we don't build that until we need it.

### Per-Entity State (Prefab Scripts)

When using per-prefab scripts, each entity instance gets its own state object:

```javascript
// scripts/enemy-slime.js
exports.onStart = function(ctx, entity) {
  entity.state = { direction: 1, timeSinceLastTurn: 0 };
};

exports.onUpdate = function(ctx, entity, dt) {
  entity.state.timeSinceLastTurn += dt;
  // ... patrol logic using entity.state
};
```

`entity.state` is managed by the engine — it's a plain object attached to the entity instance. The script reads and writes it freely. When the entity is destroyed, its state is garbage collected. No sync, no buckets, no confusion.

---

## Part 5: Scripting API

### Current API (already works)

| Category | Methods |
|:---|:---|
| Entity lifecycle | `spawnEntity`, `destroyEntity`, `cloneEntity`, `reparentEntity` |
| Transform | `get/setEntityPosition`, `get/setEntityRotation`, `get/setEntityScale`, `setEntityVisible` |
| Physics | `get/setEntityVelocity`, `get/setEntityAngularVelocity`, `applyImpulse`, `applyForce` |
| Tags | `addTag`, `removeTag`, `hasTag`, `getEntityTags`, `getEntityPrefab` |
| Queries | `queryEntities({tag, prefab})`, `queryEntitiesWithData`, `queryPoint`, `queryAABB`, `raycast` |
| State | `getVariable`, `setVariable`, `getConstant`, `emit` |
| Game flow | `win()`, `lose()` |
| Haptics | `haptic()`, `hapticNotification()`, `hapticSelection()` |
| Timing | `ctx.dt`, `ctx.elapsed`, `ctx.frameId`, `ctx.random()`, `ctx.randomInt()` |
| Async | `startSequence(name, async fn)`, `isSequenceRunning()`, `cancelSequence()` |
| Input | `ctx.input`, `ctx.mouse`, `ctx.drag` (per-frame snapshots) |

### New API (gaps to fill)

| Category | Method | Design Notes |
|:---|:---|:---|
| **Sound** | `ctx.playSound(id, opts?)` | Replaces SoundActionExecutor |
| **Camera** | `ctx.cameraShake(intensity, duration)` | Replaces CameraActionExecutor |
| **Camera** | `ctx.cameraZoom(zoom, duration?)` | Replaces CameraActionExecutor |
| **Time** | `ctx.setTimeScale(scale, duration?)` | Replaces CameraActionExecutor |
| **Dialog** | `ctx.showDialog(id, data?)` | `data` is optional key-value for template bindings |
| **Dialog** | `ctx.dismissDialog()` | Clears active dialog |
| **Dialog** | Dialog button taps arrive as `onInput` events with `event.dialogId` + `event.buttonId` | No separate dialog callback system |
| **Bulk ops** | `ctx.destroyByTag(tag)` | Deferred to end of frame. Destroys all matching entities. |
| **Animate** | `ctx.animateEntity(id, target, opts)` | One-shot tween. Auto-cancelled if a sequence targets same entity+property. |
| **Collision** | `onCollisionEnter(ctx, event)` | Fires once when two bodies first touch. Uses Godot's native `body_entered` signal. |
| **Collision** | `onCollisionExit(ctx, event)` | Fires once when two bodies separate. Uses Godot's native `body_exited` signal. |
| **Params** | `ctx.getParams(entityId)` | Returns the scriptParams for a prefab-scripted entity |
| **Entity state** | `entity.state` | Plain object on entity instance for per-entity script state |

### Collision Event Shape

```javascript
// onCollisionEnter/Exit receive:
{
  entityA: 'ball_1',      // entity ID
  entityB: 'brick_42',    // entity ID
  tagA: 'ball',           // primary tag (first in tag list)
  tagB: 'brick',          // primary tag
  tagsA: ['ball', 'projectile'],  // all tags
  tagsB: ['brick', 'destructible'],
  normal: { x: 0, y: 1 },  // contact normal (enter only)
  impulse: 12.5             // impact force (enter only)
}
```

Collision pairs are tracked **engine-side** (Godot's native `body_entered`/`body_exited` signals), not in JavaScript. No JS-side pair tracking overhead.

### Destroy Semantics

`ctx.destroyEntity(id)` and `ctx.destroyByTag(tag)`:
- Queued for end of current frame (not immediate)
- Per-prefab scripts on destroyed entities receive no further callbacks after the frame
- Physics bodies removed from simulation at end of frame
- Safe to call during `onCollisionEnter` — entity persists for the rest of the frame

### Animation Authority

Each entity property (position, scale, rotation, opacity) has **one authority per frame**:
- If a `startSequence` is animating an entity's position, `animateEntity` targeting the same entity's position auto-cancels the `animateEntity` (sequence wins)
- If `animateEntity` is running and a sequence starts targeting the same property, the one-shot is cancelled (last-writer wins)
- Scripts setting properties directly (`setEntityPosition`) always win (immediate override)

### Utility Modules (NOT engine API)

Pure-logic helpers shipped as importable modules:

| Module | Purpose | Example |
|:---|:---|:---|
| `slopcade/grid` | Grid math: worldToGrid, gridToWorld, neighbors, pathfinding | Snake, Sokoban, Minefield |
| `slopcade/containers` | Stack/queue operations: push, pop, peek, transfer, isFull | Ball Sort, card games |
| `slopcade/math` | Easing functions, angle math, interpolation | Any game with animation |

These are **script-level code**, not engine API. They don't need native access. This avoids recreating the 26-action-executor sprawl.

### Engine Component Pattern

For algorithmically complex mechanics that are reusable across games:

| Criteria | Engine Component | Script/Utility |
|:---|:---|:---|
| Needs native performance | ✅ | ❌ |
| Complex algorithm, simple interface | ✅ | ❌ |
| Reusable across 3+ games | ✅ | ❌ |
| Game-specific logic | ❌ | ✅ |

**Current engine components**: match-3 (gemCrush). Scripts subscribe to engine events:

```javascript
exports.onMatch = function(ctx, match) {
  state.score += match.count * 10;
  ctx.setVariable('score', state.score);
  ctx.playSound('match');
};
```

Future candidates: card-game dealing, word-puzzle validation, tile-map rendering. Only promoted to engine component when 3+ games need it.

---

## Part 6: Validation & Error Handling

### Multi-Layer Validation

Errors must be caught as early as possible, with clear messages that include enough context for AI to fix them.

#### Build Time (bundler)

| Check | Error Message |
|:---|:---|
| Script has no exports | `game.js: No exports found. Scripts must export at least one lifecycle hook (onStart, onUpdate, onInput, onCollisionEnter).` |
| Unknown lifecycle export | `game.js: Unknown export 'onColision'. Did you mean 'onCollisionEnter'?` |
| Prefab references nonexistent script | `tube.json: Script 'tbe' not found. Available scripts: tube, game, levels.` |
| Prefab references nonexistent asset | `tube.json: Asset 'tube.png' not found in assets/images.json.` |
| Script params type mismatch | `enemy-slime.json: scriptParams.speed is "fast" but enemy-slime.js declares speed as type 'number'.` |
| Duplicate entity IDs in level | `level-1.json: Duplicate entity ID 'player'. Entity IDs must be unique within a level.` |

#### Load Time (engine startup)

| Check | Error Message |
|:---|:---|
| Script hook returns Promise | `game.js: onUpdate returned a Promise. All hooks must be synchronous. Use startSequence() for async flows.` |
| Script exceeds budget | `game.js: onUpdate exceeded 16ms execution budget (took 45ms). Optimize or split logic.` |
| Script hook wrong arity | `game.js: onCollisionEnter(ctx, event) expects 2 args but script declares 3.` |

#### Runtime (per-frame)

| Check | Error Message |
|:---|:---|
| Script throws | `game.js:42 onInput: TypeError: Cannot read property 'x' of undefined. Entity: ball_1, Event: tap at (120, 340). Last 3 variable writes: score=10, lives=2, combo=3.` |
| Entity not found | `game.js:58: ctx.destroyEntity('brick_99') — entity not found. It may have been destroyed earlier this frame.` |
| Infinite loop detected | `game.js: onUpdate exceeded 100,000 instruction limit. Possible infinite loop.` |

### Error Reporting Contract

When a script throws at runtime:
1. The **specific hook** is disabled (not the entire script) — other hooks keep running
2. Error is logged with: **file, line number, hook name, entity context, event that triggered it, recent variable writes**
3. Error is surfaced via **game-inspector MCP** so AI agents can query `getErrors()` and see exactly what failed
4. The game continues running in degraded mode (missing the disabled hook) rather than freezing

This is critical for the AI debug loop: **AI runs game → observes error → reads error context → fixes script → hot reloads → tests again.**

---

## Part 7: AI Authoring Experience

### How AI Writes a Game

```
User: "Make a breakout game"

AI Agent:
1. Creates game.json (world config, physics, camera)
2. Creates prefabs/ (paddle, ball, brick, walls)
3. Creates scripts/game.js from breakout template
4. Creates assets/ (references generated sprites + sounds)
5. Creates ui/ (score display, lives, win/lose dialogs)
6. Bundles and tests via game-inspector
```

The AI has a **clear checklist** of files to create. Each file has a defined schema. Templates give a working starting point. The game-inspector validates the result.

### How AI Debugs a Game

```
AI Agent:
1. Opens game in game-inspector
2. Runs game: simulateTap(100, 200)
3. Checks state: getSnapshot() → sees score didn't increment
4. Checks errors: getErrors() → "game.js:34 onCollisionEnter: 
   event.tagB is 'Brick' but script checks for 'brick' (case mismatch)"
5. Fixes: changes 'brick' to case-insensitive check
6. Hot reloads script
7. Retests: score increments correctly
```

**Key tools for AI debugging:**
- `getSnapshot()` — full world state (entities, positions, variables, script states)
- `getErrors()` — all runtime errors with context
- `getConsoleLog()` — script console.log output
- `simulateTap/Drag/Swipe` — synthetic input injection
- `step(n)` — advance N physics frames deterministically
- `getEntityState(id)` — inspect one entity's script state and components
- `callScriptFunction(fn, args)` — call an exported helper for testing

### How AI Grows a Game

```
Week 1: Simple breakout (1 script, 5 prefabs, 1 level)
  scripts/game.js — 60 lines
  
Week 2: Add power-ups (new prefab type with behavior)
  prefabs/powerup-expand.json + scripts/powerup.js — 30 lines
  game.js grows to 80 lines (spawning logic)

Week 3: Add multiple levels (different brick layouts)
  levels/level-1.json through level-5.json
  scripts/levels.js — level progression logic
  game.js grows to 100 lines

Week 4: Add boss battles (complex entity with AI)
  prefabs/boss.json + scripts/boss.js — 50 lines
  game.js grows to 120 lines (boss wave logic)

Week 5: Add particle effects, screen shake, slow-mo
  game.js grows to 140 lines (juice calls)
```

At each step, AI adds 1-2 files. The game.js grows linearly, not exponentially. When game.js gets too large, AI splits entity-specific logic into per-prefab scripts. The architecture supports this split without restructuring.

---

## Part 8: What This Looks Like (Ball Sort)

### Before (hybrid, 1000-line definition.json + 435-line engine executor)

```
definition.json (monolith)
├── 15 prefabs
├── 8 rules (event routing, state machine transitions)
├── 220-line compiled script (level generation only)
├── stateMachines: gameFlow
├── dialogs: levelComplete
├── variables: 20+ shared between rules/scripts/executors
└── BallSortActionExecutor.ts (435 lines baked into ENGINE code)
```

### After (script-first, clean separation)

```
r2/games/ballSort/
├── game.json                    ← 30 lines: physics, camera
├── prefabs/
│   ├── tube.json                ← sprite, collider, slots
│   ├── ball.json                ← sprite, physics, color param
│   └── background.json          ← sprite
├── scripts/
│   ├── game.js                  ← ~180 lines: ALL game logic
│   └── levels.js                ← level data array
├── assets/
│   ├── images.json
│   └── sounds.json
├── ui/
│   ├── hud.json                 ← level display, move counter
│   └── dialogs.json             ← levelComplete dialog
└── bundle/
```

### The Level Advancement Flow

```javascript
// BEFORE: 8 layers
// Button → dialogEventRouter → triggerEvent → pendingEvents →
// LogicTriggerEvaluator → RulesSystem → ActionRegistry →
// ScriptSystem.callExport → writes to wrong variable store

// AFTER: 3 lines in scripts/game.js
if (event.buttonId === 'btn-next') {
  state.level++;
  loadLevel(ctx, state.level);
}
```

**The ball sort level bug is structurally impossible.** `state.level` is a closure variable. There's no copy, no sync, no boundary crossing.

---

## Part 9: Migration Plan

### Phase 0: Foundation Fixes (in progress)
- [x] Fix script variable writes going to ephemeral copy
- [ ] Fix game-inspector operations (Playwright import failure)
- [ ] Update game-inspector skill documentation

### Phase 1: Expand Scripting API (1-2 days)

Add missing methods to `ScriptSandboxRuntimeSystem.createScriptContext`:

**Core methods:**
- `playSound(id, opts?)`
- `cameraShake(intensity, duration)`
- `cameraZoom(zoom, duration?)`
- `setTimeScale(scale, duration?)`
- `showDialog(id, data?)` / `dismissDialog()`
- `destroyByTag(tag)` (deferred end-of-frame)
- `animateEntity(id, target, opts)` (one-shot with authority rules)

**Collision hooks:**
- Wire Godot's `body_entered` / `body_exited` signals through bridge
- Expose as `onCollisionEnter` / `onCollisionExit` lifecycle hooks
- Event includes entity IDs, tags, contact normal, impulse

**Utility modules:**
- `slopcade/grid` — gridToWorld, worldToGrid, neighbors
- `slopcade/containers` — push/pop/transfer/peek

### Phase 2: Pilot Migrations (2-3 days)

Rewrite three games as script-first to validate the API across complexity tiers:

**Pilot A — breakoutBouncer** (collision-heavy, currently pure-declarative)
- Validates: `onCollisionEnter`, `destroyByTag`, `playSound`, `cameraShake`
- Success: Game plays identically, script is <80 lines, AI can modify and debug it

**Pilot B — ballSort** (container/state-heavy, currently hybrid)
- Validates: `showDialog`/`dismissDialog`, level progression, closure state, `animateEntity`
- Success: Level advancement works, no split variable bugs, script is <200 lines

**Pilot C — slopeggle** (physics + camera effects + complex rules, highest complexity declarative game)
- Validates: `cameraShake`, `cameraZoom`, `setTimeScale`, many collision pairs, `onCollisionEnter` performance
- Success: Turn-based peggle physics works, camera juice matches current version, AI can modify peg layouts

### Phase 3: Migrate Remaining Games (2-3 days)

- `flappyBird` → script (trivial, ~30 lines)
- `snake` → script with `slopcade/grid`
- `sokoban` → script with `slopcade/grid`
- `gemCrush` → keep engine component, add script hooks
- `minefield` → already script-only, verify API compatibility
- Remaining hybrids → trivial script conversions
- Demos → leave as-is

### Phase 4: Deprecate Rules System (1 day)

- Mark rules system as deprecated in engine
- Remove `BallSortActionExecutor` and other game-specific executors
- Keep `ActionRegistry` and `RulesSystem` code but stop loading for new games
- Update game-authoring skills and AI prompting templates

### Phase 5: Per-Prefab Scripts (1-2 weeks, after Phase 4 ships)

Once script-first is validated and stable:
- Add `script` and `scriptParams` fields to prefab schema
- Implement per-entity script lifecycle (entity receives its own `onStart`, `onUpdate`, etc.)
- Add `entity.state` for per-entity closure state
- Add `ctx.getParams(entityId)` for reading script parameters
- Add `exports.params` schema for build-time validation of scriptParams
- Pilot: refactor one game to use per-prefab scripts (ball sort — split tube.js from game.js)
- Update game-authoring skills

### Phase 6: Build-Time Validation (1 week, after Phase 5)

- Schema validation for all JSON files (prefabs, levels, UI, assets)
- Script export checking (known hooks only, arity checking)
- Cross-file reference validation (prefab → script, prefab → asset, level → prefab)
- Friendly error messages with suggestions (typo detection, "did you mean?")
- Integrate into bundler pipeline

### Phase 7: Enhanced AI Debugging (ongoing)

- `getErrors()` inspector operation — runtime errors with full context
- `getEntityState(id)` — inspect per-entity script state
- `callScriptFunction(fn, args)` — call exported helpers for testing
- Script console.log output capture with entity/hook context
- Hot reload with error recovery (re-enable disabled hooks after fix)

### Phase 8: Templates & SDK (ongoing)

- Script templates per genre (puzzle, physics, platformer, endless-runner)
- Publish scripting API as `.d.ts` + AI-consumable skill documentation
- Ship utility modules for common patterns
- Game-inspector cookbook for AI agents

---

## Part 10: How This Compares

| | Godot | Unity | Love2D | **Slopcade** |
|:---|:---|:---|:---|:---|
| **Script model** | 1 script per node | MonoBehaviour per GO | Flat callbacks | Game script + optional per-prefab scripts |
| **Lifecycle** | `_ready`, `_process` | `Start`, `Update` | `love.load`, `love.update` | `onStart`, `onUpdate`, `onInput`, `onCollisionEnter` |
| **State** | Node properties | Component fields | Global Lua tables | Closure vars (game), `entity.state` (prefab) |
| **Composition** | Scene tree | GameObject hierarchy | Manual | Prefabs with children/slots |
| **Who writes code** | Humans | Humans | Humans | **AI agents** |
| **Debug model** | Editor + breakpoints | Editor + profiler | print() | **game-inspector MCP + error telemetry** |

The key differentiator: **Slopcade is the only engine where the primary author is an AI agent.** Every design decision optimizes for AI context windows, AI error recovery, and AI iteration speed — not human ergonomics.

---

## Part 11: Open Questions

### Resolved by This Document

| Question | Resolution |
|:---|:---|
| One script or many? | Progressive: game.js first, per-prefab scripts when complexity demands |
| Closure state vs engine variables? | Closure is source of truth; variables are one-way UI push |
| Where do collision pairs get tracked? | Engine-side (Godot signals), not JS-side |
| What qualifies as an engine component? | Needs native perf + reusable by 3+ games + complex algorithm |
| Does this scale to big games? | Yes — per-prefab scripts + levels + composition provide growth path |
| Hot reload? | `onStart` re-fires. Full state reset. `onReload` hook deferred until needed. |

### Deferred (Build When Needed)

| Question | When to Revisit |
|:---|:---|
| Asset GUIDs (content-addressed, rename-safe) | When asset reorganization becomes a pain point |
| Scene system (distinct from levels) | When games need fundamentally different screens (menu vs gameplay) |
| Script inheritance / mixins | When per-prefab scripts show code duplication patterns |
| `onReload` for preserving mid-game state | When AI iteration loop needs faster-than-restart reload |
| Multiplayer state sync | When multiplayer is implemented |
| Visual script editor | Probably never — AI writes code |

---

## Appendix A: Decision Log

| Decision | Rationale | Opinions Incorporated |
|:---|:---|:---|
| Script-first, not full ECS rewrite | Solves immediate pain (3-system hybrid) while preserving shipping velocity. Full ECS is the right long-term direction but 4-8 weeks of architecture work delays all game development. | Oracle, Critical Analysis |
| Progressive script model (game.js → per-prefab) | Avoids the "monolith game.js" problem without requiring component architecture on day 1. Games start simple, split when they grow. | Unity Re-Analysis, Oracle |
| Closure state as sole source of truth | Eliminates the "which bucket?" decision entirely. Variables become a display-only channel. No two-tier sync burden. | Critical Analysis, Second Opinion |
| Godot-native collision signals | `body_entered`/`body_exited` are already deduped by the physics engine. JS-side pair tracking would be redundant and slower. | Second Opinion |
| Deferred entity destruction | Prevents "entity destroyed mid-collision-callback" bugs. Standard pattern in Unity, Godot, and most game engines. | Critical Analysis |
| Animation authority (last-writer wins) | Simple mental model. Sequences cancel one-shots, direct sets override everything. | Second Opinion |
| Slopeggle as third pilot | Tests collision-heavy + camera effects + highest current complexity. Breakout and ballSort alone don't validate the full API surface. | Critical Analysis |
| Error telemetry for AI debug loop | This is the single most important tooling feature. AI can't debug what it can't observe. Per-hook error isolation means one broken hook doesn't freeze the game. | Second Opinion, Critical Analysis |
| Engine component criteria (3+ games, native perf, complex algo) | Prevents the slippery slope of "is this complex enough?" by requiring all three criteria. | Critical Analysis |
| Per-prefab scripts deferred to Phase 5 | Phase 1-4 validates the core script model. Adding per-prefab scripts too early means designing the entity-script API before understanding real usage patterns. | Oracle |
| No visual script editor | AI is the author. Visual editors optimize for humans. Our editor shows the result and lets users tweak parameters, not author logic. | Original Plan |

## Appendix B: Performance Budgets

| Metric | Target | Enforcement |
|:---|:---|:---|
| Script execution per frame (all hooks) | ≤ 4ms on mobile | QuickJS instruction budget (100k default) |
| Max entities per game | 500 | Soft limit, warning in bundler |
| Max collision callbacks per frame | 100 | Engine-side throttle, warning log |
| Script memory | ≤ 1MB | QuickJS memory budget |
| Bundle size (compiled) | ≤ 500KB (excluding assets) | Bundler warning |
| Asset lazy-load threshold | > 2MB total assets triggers lazy loading | Bundler auto-splits |

## Appendix C: Glossary

| Term | Definition |
|:---|:---|
| **Game script** | `scripts/game.js` — game-level orchestration (level loading, scoring, win/lose) |
| **Prefab script** | `scripts/enemy.js` — behavior attached to a specific prefab type |
| **Prefab** | JSON definition of an entity's appearance, physics, and default configuration |
| **Level** | JSON or JS data defining which entities to spawn and where |
| **Engine component** | Native mechanic module (like match-3) with script hooks |
| **Utility module** | Pure-JS helper (`slopcade/grid`) importable by scripts |
| **Script params** | Configurable values defined in script, set per-instance in prefab JSON |
| **Game-inspector** | MCP-based debug bridge for AI agents to inspect and control running games |
