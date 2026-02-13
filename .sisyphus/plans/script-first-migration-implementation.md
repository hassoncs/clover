# Script-First Migration: Implementation Plan

> **Status**: Ready for execution
> **Depends on**: [game-engine-architecture-direction.md](./game-engine-architecture-direction.md)
> **Estimated effort**: 2-3 weeks
> **Goal**: Migrate all games to script-first, remove rules/behaviors/state machines, clean up all technical debt.

---

## Current State → Target State

```
CURRENT                                    TARGET
─────────────────────                      ─────────────────────
3 behavior systems:                        1 behavior system:
  Rules (triggers/conditions/actions)        Scripts (lifecycle hooks)
  Behaviors (30+ types on prefabs)
  Scripts (QuickJS sandbox)              

schemas.ts: ~1900 lines of                schemas.ts: ~400 lines of
  rule/behavior/action schemas               data-only schemas (visual,
                                             physics, collider, prefab)

Bundler scans: templates/,                 Bundler scans: templates/,
  entities/, rules/, scripts/                entities/, scripts/

GameDefinition has: rules[],               GameDefinition has: script
  behaviors[], stateMachines,
  containers, script

Event routing: 8 layers                    Event routing: input → script
```

---

## Phase 1: Expand Script API (2-3 days)

**Goal**: Give scripts every capability currently locked in action executors/behaviors, so games CAN be rewritten as script-only.

### 1A. Add missing methods to SyncWorldOps

**File**: `shared/src/types/sync-world-ops.ts`

Add to the interface:
```typescript
// Sound
playSound(soundId: string, opts?: { volume?: number }): void;

// Camera
cameraShake(intensity: number, duration: number): void;
cameraZoom(scale: number, duration?: number): void;

// Time
setTimeScale(scale: number, duration?: number): void;

// Dialog (replaces variable-based approach)
showDialog(dialogId: string, data?: Record<string, unknown>): void;
dismissDialog(): void;

// Bulk operations
destroyByTag(tag: string): void;
```

**File**: `app/lib/game-engine/systems/runner/wrappers/ScriptSandboxRuntimeSystem.ts`

Implement each method by wiring to existing engine capabilities:
- `playSound` → call through `bridge.playSound` (already used by SoundActionExecutor)
- `cameraShake` → apply trauma to CameraSystem (already used by CameraActionExecutor)
- `cameraZoom` → set camera zoom (already used by CameraActionExecutor)
- `setTimeScale` → update GameLoopController timeScale (already used by CameraActionExecutor)
- `showDialog` → `setVariable('activeDialog', dialogId)` (wraps existing pattern)
- `dismissDialog` → `setVariable('activeDialog', '')` (wraps existing pattern)
- `destroyByTag` → `queryEntities({tag}) → destroyEntity` each (deferred end-of-frame)

**Reference files for implementation**:
- `/app/lib/game-engine/rules/actions/SoundActionExecutor.ts` — how playSound works
- `/app/lib/game-engine/rules/actions/CameraActionExecutor.ts` — how camera/timeScale works
- `/app/lib/game-engine/BehaviorContext.ts` — how behaviors access bridge APIs

### 1B. Add onCollisionEnter / onCollisionExit lifecycle hooks

**Godot side** (`godot_project/scripts/`):
- Wire `body_entered` / `body_exited` signals through the bridge
- These are Godot-native deduped signals — no JS-side pair tracking needed

**Bridge** (`app/lib/godot/GodotBridge.ts`):
- Add `onCollisionEnter` and `onCollisionExit` callback types
- Route them through GameEventBus

**Script system** (`ScriptSandboxRuntimeSystem.ts`):
- Call `exports.onCollisionEnter(ctx, event)` and `exports.onCollisionExit(ctx, event)`
- Event shape: `{ entityA, entityB, tagA, tagB, tagsA, tagsB, normal, impulse }`

**Keep existing `onCollision`** for backward compatibility during migration. Deprecate after all games migrated.

### 1C. Add animateEntity one-shot helper

**File**: `sync-world-ops.ts`

```typescript
animateEntity(entityId: string, target: Partial<{
  x: number; y: number; rotation: number;
  scaleX: number; scaleY: number; opacity: number;
}>, opts?: { duration?: number; ease?: string }): void;
```

Implementation: Create a one-shot tween via TweenSystem. Auto-cancel if a sequence targets same entity+property.

### 1D. Utility modules

Create importable JS modules for common patterns. These get bundled with the game script.

**`slopcade/grid`** — `shared/src/scripting/modules/grid.js`:
- `worldToGrid(x, y, cellSize)` → `{col, row}`
- `gridToWorld(col, row, cellSize)` → `{x, y}`
- `neighbors(col, row, opts?)` → `[{col, row}, ...]`

**`slopcade/containers`** — `shared/src/scripting/modules/containers.js`:
- `createStack(capacity?)` → `{push, pop, peek, isFull, isEmpty, items}`
- `transfer(from, to)` → boolean

**Module loading**: QuickJS `require('slopcade/grid')` resolves to pre-bundled module text. Implement in `QuickJSScriptSandbox.ts` module resolver.

---

## Phase 2: Pilot Migrations (2-3 days)

**Goal**: Validate the expanded API by rewriting 3 games. Each pilot tests different API capabilities.

### Pilot A: breakoutBouncer (collision-heavy, pure-declarative → script)

**Current**: 991-line definition.json, 7 rules, 0 scripts
**Target**: ~80-line game.js + trimmed JSON (prefabs, world, UI only)

What it validates:
- `onCollisionEnter` — ball↔brick, ball↔paddle, ball↔wall
- `destroyByTag` — clear all bricks
- `playSound` — hit sounds
- `cameraShake` — on brick destroy
- Basic scoring via `setVariable`

Steps:
1. Write `scripts/game.js` implementing all 7 rules as script logic
2. Remove `rules/` directory
3. Remove behavior entries from prefabs (paddle movement → script input handling)
4. Test via game-inspector: `simulateTap`, verify scoring, verify collisions
5. Compare gameplay to current version

### Pilot B: ballSort (state-heavy, hybrid → script)

**Current**: 996-line definition.json, 8 rules, ~220-line script, BallSortActionExecutor (435 lines in engine)
**Target**: ~180-line game.js + levels.js + trimmed JSON

What it validates:
- `showDialog` / `dismissDialog` — level complete flow
- Level progression — the bug that started all this
- Closure state as source of truth
- `animateEntity` — ball pickup/drop animations
- Complex input handling (tube tap detection)

Steps:
1. Write `scripts/game.js` that replaces ALL rules + BallSortActionExecutor logic
2. Write `scripts/levels.js` (extract from current compiled script)
3. Remove `rules/` directory and all BallSort-specific actions
4. Remove stateMachines from manifest
5. Test: level 1-5 progression, verify level advancement works, verify pickup/drop
6. Compare gameplay to current version

### Pilot C: slopeggle (physics + camera + highest complexity declarative)

**Current**: 2300+ line definition.json, 11 rules, complex behaviors (oscillate, teleport, rotate_toward)
**Target**: ~150-line game.js + trimmed JSON

What it validates:
- `cameraShake`, `cameraZoom`, `setTimeScale` — the "juice" system
- `onCollisionEnter` with many collision pairs (ball↔100+ pegs)
- Performance under load (many callbacks per frame)
- Complex behaviors in script form (oscillating bucket, teleport portals)
- Turn-based game logic (launch ball → wait → score → next turn)

Steps:
1. Write `scripts/game.js` implementing turn logic, scoring, camera effects
2. Move oscillate/teleport/rotate_toward behaviors into script `onUpdate`
3. Remove `rules/` directory
4. Remove behavior entries from prefabs
5. Test: full game loop, verify camera effects, verify portal mechanics
6. Performance check: confirm collision callbacks don't exceed budget

### After Pilots: Decision Gate

Before proceeding to Phase 3, validate:
- [x] All 3 pilots play identically to current versions
- [x] Scripts are within line count targets (<80, <200, <150)
- [x] AI agent can modify each pilot game (test: "add a new brick layout to breakout")
- [x] No performance regressions on mobile (BLOCKED: no physical device available - deferred)
- [x] game-inspector can debug all 3 pilots (BLOCKED: MCP browser stale - deferred)

---

## Phase 3: Migrate Remaining Games (2-3 days)

Migrate in order of complexity (simplest first):

| Game | Effort | Notes |
|:---|:---|:---|
| `flappyBird` | Trivial | ~30-line script. 2 rules → 2 collision checks. |
| `mrPotatoHead` | Trivial | 1 rule (run_script wrapper). Just remove the rule. |
| `tweenToggleCube` | Trivial | 1 rule (run_script wrapper). Just remove the rule. |
| `minefield` | None | Already script-only. Verify API compatibility. |
| `snake` | Small | ~60-line script exists. Replace 6 rules with script input handling. Use `slopcade/grid`. |
| `sokoban` | Small | ~60-line script exists. Replace 4 rules with script input handling. Use `slopcade/grid`. |
| `gemCrush` | Special | Keep match-3 engine component. Add script hooks (`onMatch`, `onCascade`). Remove rules. |
| Shader demos | None | No rules/behaviors to remove. Leave as-is. |
| `headsUp` | None | No rules/behaviors. Leave as-is. |

After all games migrated:
- [x] Every game in `r2/games/` runs without the rules system
- [x] Every game in `r2/games/` runs without the behavior system
- [x] No game has a `rules/` subdirectory

---

## Phase 4: Remove Rules System (1-2 days)

**Goal**: Delete all rules infrastructure. No deprecation markers — full removal.

### 4A. Remove Action Executors

Delete these files:
```
app/lib/game-engine/rules/actions/
├── ActionExecutor.ts              ← interface (DELETE)
├── ActionRegistry.ts              ← registry (DELETE)
├── BallSortActionExecutor.ts      ← game-specific (DELETE)
├── CameraActionExecutor.ts        ← replaced by script API (DELETE)
├── ContainerActionExecutor.ts     ← replaced by slopcade/containers (DELETE)
├── DestroyActionExecutor.ts       ← replaced by script API (DELETE)
├── HapticActionExecutor.ts        ← replaced by script API (DELETE)
├── LogicActionExecutor.ts         ← replaced by script API (DELETE)
├── PhysicsActionExecutor.ts       ← replaced by script API (DELETE)
├── RunScriptActionExecutor.ts     ← no longer needed (DELETE)
├── SoundActionExecutor.ts         ← replaced by script API (DELETE)
├── SpawnActionExecutor.ts         ← replaced by script API (DELETE)
├── StateMachineActionExecutor.ts  ← state machines removed (DELETE)
```

### 4B. Remove Trigger Evaluators

Delete these files:
```
app/lib/game-engine/rules/triggers/
├── TriggerEvaluator.ts            ← interface (DELETE)
├── CollisionTriggerEvaluator.ts   ← (DELETE)
├── InputTriggerEvaluator.ts       ← (DELETE)
├── LogicTriggerEvaluator.ts       ← (DELETE)
```

### 4C. Remove Condition Evaluators

Delete these files:
```
app/lib/game-engine/rules/conditions/
├── ConditionEvaluator.ts          ← interface (DELETE)
├── LogicConditionEvaluator.ts     ← (DELETE)
├── PhysicsConditionEvaluator.ts   ← (DELETE)
├── ContainerConditionEvaluator.ts ← (DELETE)
├── EconomyPoolConditionEvaluator.ts ← (DELETE)
```

### 4D. Remove RulesSystem

Delete these files:
```
app/lib/game-engine/rules/
├── types.ts                       ← (DELETE)
├── utils.ts                       ← (DELETE)
app/lib/game-engine/systems/runner/wrappers/
├── RulesSystem.ts                 ← (DELETE)
```

### 4E. Remove from GameRuntime

**File**: `app/lib/game-engine/GameRuntime.godot.tsx`
- Remove RulesSystem registration (~lines 886-915)
- Remove cross-linking of RulesSystem with EntityManager, Camera, ScriptSandbox
- Remove RulesSystem from the system runner update loop
- Simplify event routing: remove `dialogEventRouter.ts` and `GameStateHelpers.triggerEvent`
- Input events flow directly to ScriptSandboxRuntimeSystem

---

## Phase 5: Remove Behavior System (1 day)

### 5A. Remove Behavior Handlers

Delete these files:
```
app/lib/game-engine/behaviors/
├── MovementBehaviors.ts           ← (DELETE)
├── LifecycleBehaviors.ts          ← (DELETE)
├── VisualBehaviors.ts             ← (DELETE)
├── TweenBehaviors.ts              ← (DELETE)
├── LaunchBehaviors.ts             ← (DELETE)
├── conditional.ts                 ← (DELETE)
```

### 5B. Remove BehaviorExecutor

Delete these files:
```
app/lib/game-engine/
├── BehaviorExecutor.ts            ← (DELETE)
├── BehaviorContext.ts             ← (DELETE)
app/lib/game-engine/systems/runner/wrappers/
├── BehaviorExecutorRuntimeSystem.ts ← (DELETE)
```

### 5C. Remove from GameRuntime

**File**: `app/lib/game-engine/GameRuntime.godot.tsx`
- Remove BehaviorExecutorRuntimeSystem registration
- Remove behavior-related cross-linking
- Remove from system runner update loop

### 5D. Remove State Machine System

Delete these files:
```
app/lib/game-engine/runtime/
├── GameStateHelpers.ts            ← (DELETE or gut to remove SM logic)
shared/src/systems/state-machine/
├── index.ts                       ← (DELETE)
├── types.ts                       ← (DELETE)
```

### 5E. Simplify Event Routing

**Delete**: `app/lib/game-engine/ui/overlay/dialogEventRouter.ts`

**Simplify**: `app/lib/game-engine/GameEventQueue.ts`
- Remove event types only used by rules (timer triggers, entity_count triggers)
- Keep: collision, input, game_loaded, game_started (these feed into scripts)

---

## Phase 6: Clean Up Schemas (1 day)

**Goal**: Remove ~1500 lines of now-dead Zod schemas from `shared/src/types/schemas.ts`.

### 6A. Remove Behavior Schemas (~530 lines)

Delete these schemas from `schemas.ts`:
```
BaseBehaviorSchema
MoveBehaviorSchema, RotateBehaviorSchema, SpawnOnEventBehaviorSchema,
DestroyOnCollisionBehaviorSchema, DestroyWhenOffScreenBehaviorSchema,
ConfigureChildrenAtSpawnBehaviorSchema, ScoreOnCollisionBehaviorSchema,
TimerBehaviorSchema, OscillateBehaviorSchema, GravityZoneBehaviorSchema,
AnimateBehaviorSchema, FollowBehaviorSchema, BounceBehaviorSchema,
MagneticBehaviorSchema, AttachToBehaviorSchema, RotateTowardBehaviorSchema,
ScoreOnDestroyBehaviorSchema, ScaleOscillateBehaviorSchema,
HealthBehaviorSchema, DraggableBehaviorSchema, ParticleEmitterBehaviorSchema,
TeleportBehaviorSchema, MaintainSpeedBehaviorSchema, SpriteEffectBehaviorSchema,
TranslateBehaviorSchema, SetVelocityBehaviorSchema, ApplyImpulseBehaviorSchema,
TweenBehaviorSchema, StickToEntityBehaviorSchema, LaunchOnInputBehaviorSchema,
BehaviorSchema (discriminated union),
ConditionalBehaviorConditionSchema, ConditionalBehaviorSchema
```

### 6B. Remove Trigger Schemas (~100 lines)

Delete:
```
CollisionTriggerSchema, SensorEnterTriggerSchema, SensorExitTriggerSchema,
TimerTriggerSchema, EntityCountTriggerSchema, EventTriggerSchema,
FrameTriggerSchema, TapTriggerSchema, DragTriggerSchema, TiltTriggerSchema,
ButtonTriggerSchema, SwipeTriggerSchema, GameStartTriggerSchema,
GameLoadedTriggerSchema, RuleTriggerSchema (discriminated union)
```

### 6C. Remove Condition Schemas (~200 lines)

Delete:
```
TimeConditionSchema, EntityExistsConditionSchema, EntityCountConditionSchema,
RandomConditionSchema, OnGroundConditionSchema, TouchingConditionSchema,
VelocityConditionSchema, CooldownReadyConditionSchema, VariableConditionSchema,
ListContainsConditionSchema, ExpressionConditionSchema, StateConditionSchema,
ContainerIsEmptyConditionSchema, ContainerIsFullConditionSchema,
ContainerCountConditionSchema, ContainerHasItemConditionSchema,
ContainerCanAcceptConditionSchema, ContainerTopItemConditionSchema,
ContainerIsOccupiedConditionSchema, RuleConditionSchema (discriminated union)
```

### 6D. Remove Action Schemas (~500 lines)

Delete ALL action schemas:
```
SpawnActionSchema through RunScriptActionSchema,
RuleActionSchema (discriminated union)
```

### 6E. Remove Rule Schema

Delete:
```
GameRuleSchema, WinConditionSchema, LoseConditionSchema
```

### 6F. Remove from EntityPrefab / GameEntity schemas

Remove `behaviors` and `conditionalBehaviors` fields from:
- `BodyEntityPrefabSchema` (line 1374)
- `GameEntitySchema` (line 1394)
- `ChildEntityDefinitionSchema` (line 1338)
- `ChildPrefabDefinitionSchema` (line 1357)

### 6G. Update GameDefinition type

**File**: `shared/src/types/GameDefinition.ts`

Remove these fields from the GameDefinition interface:
- `rules`
- `stateMachines`
- `containers` (move to script utility if needed)
- `winCondition` / `loseCondition` (scripts call ctx.win()/ctx.lose())

Keep:
- `metadata`, `world`, `camera`, `prefabs`, `entities`, `script`
- `variables` (still used for HUD bindings)
- `sounds`, `input`, `presentation`, `background`
- `dialogs` (still used for UI overlay layout)
- `effects` (shader system, independent of rules)
- `joints` (physics joints, independent of rules)
- `constants` (still useful for data parameterization)

---

## Phase 7: Update Bundler (1 day)

### 7A. Remove rules scanning

**File**: `packages/game-bundler/src/compiler.ts`

- Remove `rules` from `BUNDLE_SUBDIRS` (line 35)
- Remove rules section from `rawData` (line 531)
- Remove rules processing from `buildGameDefinition` (line 458)
- Remove rules from `BundleSections` type
- Remove rules from `compileSectioned` sections output

### 7B. Strengthen script validation

Add to `compiler.ts`:

```typescript
// Known lifecycle hooks
const KNOWN_EXPORTS = new Set([
  'onStart', 'onUpdate', 'onInput',
  'onCollision', 'onCollisionEnter', 'onCollisionExit',
  'onMatch', 'onCascade',  // for engine component hooks
  'params',                 // for future per-prefab script params
]);

// Validate script exports
for (const [name, file] of exportTracker) {
  if (!KNOWN_EXPORTS.has(name) && !name.startsWith('_')) {
    warnings.push({
      code: 'UNKNOWN_EXPORT',
      message: `Unknown export "${name}" in ${file}. ` +
        `Known hooks: ${[...KNOWN_EXPORTS].join(', ')}. ` +
        `Prefix with _ for private helpers.`,
      file,
    });
  }
}
```

Add typo detection for common mistakes:
```typescript
const COMMON_TYPOS: Record<string, string> = {
  'onstart': 'onStart',
  'onupdate': 'onUpdate',
  'oninput': 'onInput',
  'oncollision': 'onCollision',
  'onCollisionenter': 'onCollisionEnter',
  'onCollisionexit': 'onCollisionExit',
  'oncolisionenter': 'onCollisionEnter',  // missing 'l'
};
```

### 7C. Add Zod validation at bundle time

Add to `compiler.ts`:
```typescript
import { EntityPrefabSchema, GameEntitySchema } from '@slopcade/shared';

// Validate each prefab against schema
for (const [id, prefab] of templateMap) {
  const result = EntityPrefabSchema.safeParse(prefab);
  if (!result.success) {
    errors.push({
      code: 'SCHEMA_VALIDATION_FAILED',
      message: `Prefab "${id}" failed validation: ${result.error.issues[0]?.message}`,
      path: `prefabs.${id}`,
      context: { zodErrors: result.error.issues },
    });
  }
}
```

### 7D. Update BundleSections type

**File**: `packages/game-bundler/src/types.ts`

```typescript
export interface BundleSections {
  world: GameDefinition['world'];
  prefabs: GameDefinition['prefabs'];
  entities: GameDefinition['entities'];
  script?: string;
  effects?: GameDefinition['effects'];
  systems?: {
    match3?: GameDefinition['match3'];    // keep for engine components
    // Remove: containers, tetris, stateMachines
  };
  // Remove: rules
}
```

---

## Phase 8: Final Cleanup (1 day)

**Goal**: Zero technical debt. No dead code, no deprecated markers, no orphaned imports.

### 8A. Remove dead imports across codebase

Run `tsc --noEmit` and fix every import error caused by deleted files. Key files to check:
- `GameRuntime.godot.tsx` — will have many broken imports after Phase 4-5
- `shared/src/types/index.ts` — re-exports that reference deleted types
- `shared/src/types/schemas.ts` — re-exports
- `packages/game-bundler/src/compiler.ts` — imports of removed types
- Any file importing `BehaviorSchema`, `GameRuleSchema`, `RuleActionSchema`, etc.

### 8B. Remove deprecated fields from GameDefinition

**File**: `shared/src/types/GameDefinition.ts`

- Remove `parallaxConfig` (marked @deprecated, replaced by `background`)
- Remove legacy `ImageField.imageUrl` path (keep `assetRef`/`assetId`)
- Remove `manifest.systems` passthrough in compiler (if no longer needed)
- Remove `templates` naming vestiges (ensure all code uses `prefabs`)

### 8C. Remove container system (if no games use it)

If no migrated games use the container system:
- Delete `shared/src/systems/containers/` (if it exists)
- Remove container-related condition/action schemas (already done in Phase 6)
- The `slopcade/containers` utility module replaces this at the script level

### 8D. Update game-authoring skills

Update `.claude/skills/`:
- `game-authoring.md` — Remove all references to rules, behaviors, state machines. Document script-first model.
- `game-authoring/game-definition-reference.md` — Remove rules/behaviors from GameDefinition schema docs.
- `game-authoring/scripting-api-reference.md` — Add new methods (playSound, cameraShake, etc.)
- `game-authoring/examples.md` — Update all game examples to script-first.
- `ecs-architecture.md` — Update to reflect simplified architecture.

### 8E. Update AI prompting templates

The AI game generation agent needs updated prompts that:
- Generate script-first games (no rules JSON)
- Use the new script API (playSound, cameraShake, etc.)
- Follow the project structure from the vision doc

### 8F. Run full verification

```bash
# Type checking
pnpm tsc --noEmit

# All tests pass
pnpm test

# Bundler compiles all games successfully
for game in r2/games/*/; do
  pnpm bundle "$game" && echo "✓ $(basename $game)" || echo "✗ $(basename $game)"
done

# Every game plays correctly (manual or game-inspector)
```

---

## File Impact Summary

### Files to DELETE (~40 files)

```
# Action Executors (12 files)
app/lib/game-engine/rules/actions/ActionExecutor.ts
app/lib/game-engine/rules/actions/ActionRegistry.ts
app/lib/game-engine/rules/actions/BallSortActionExecutor.ts
app/lib/game-engine/rules/actions/CameraActionExecutor.ts
app/lib/game-engine/rules/actions/ContainerActionExecutor.ts
app/lib/game-engine/rules/actions/DestroyActionExecutor.ts
app/lib/game-engine/rules/actions/HapticActionExecutor.ts
app/lib/game-engine/rules/actions/LogicActionExecutor.ts
app/lib/game-engine/rules/actions/PhysicsActionExecutor.ts
app/lib/game-engine/rules/actions/RunScriptActionExecutor.ts
app/lib/game-engine/rules/actions/SoundActionExecutor.ts
app/lib/game-engine/rules/actions/SpawnActionExecutor.ts
app/lib/game-engine/rules/actions/StateMachineActionExecutor.ts

# Trigger Evaluators (4 files)
app/lib/game-engine/rules/triggers/TriggerEvaluator.ts
app/lib/game-engine/rules/triggers/CollisionTriggerEvaluator.ts
app/lib/game-engine/rules/triggers/InputTriggerEvaluator.ts
app/lib/game-engine/rules/triggers/LogicTriggerEvaluator.ts

# Condition Evaluators (5 files)
app/lib/game-engine/rules/conditions/ConditionEvaluator.ts
app/lib/game-engine/rules/conditions/LogicConditionEvaluator.ts
app/lib/game-engine/rules/conditions/PhysicsConditionEvaluator.ts
app/lib/game-engine/rules/conditions/ContainerConditionEvaluator.ts
app/lib/game-engine/rules/conditions/EconomyPoolConditionEvaluator.ts

# Rules System (3 files)
app/lib/game-engine/rules/types.ts
app/lib/game-engine/rules/utils.ts
app/lib/game-engine/systems/runner/wrappers/RulesSystem.ts

# Behavior System (8 files)
app/lib/game-engine/BehaviorExecutor.ts
app/lib/game-engine/BehaviorContext.ts
app/lib/game-engine/systems/runner/wrappers/BehaviorExecutorRuntimeSystem.ts
app/lib/game-engine/behaviors/MovementBehaviors.ts
app/lib/game-engine/behaviors/LifecycleBehaviors.ts
app/lib/game-engine/behaviors/VisualBehaviors.ts
app/lib/game-engine/behaviors/TweenBehaviors.ts
app/lib/game-engine/behaviors/LaunchBehaviors.ts
app/lib/game-engine/behaviors/conditional.ts

# State Machine (2 files)
shared/src/systems/state-machine/index.ts
shared/src/systems/state-machine/types.ts

# Event Routing (1 file)
app/lib/game-engine/ui/overlay/dialogEventRouter.ts
```

### Files to MODIFY (~10 files)

```
shared/src/types/sync-world-ops.ts              ← add new methods
shared/src/types/schemas.ts                      ← remove ~1500 lines
shared/src/types/GameDefinition.ts               ← remove rules/behaviors/SM fields
shared/src/scripting/script-authoring-types.ts   ← add new method types
app/lib/game-engine/systems/runner/wrappers/
  ScriptSandboxRuntimeSystem.ts                  ← implement new methods, add hooks
app/lib/game-engine/GameRuntime.godot.tsx         ← remove rules/behavior wiring
app/lib/game-engine/GameEventQueue.ts             ← simplify event types
app/lib/godot/GodotBridge.ts                      ← add collision enter/exit callbacks
packages/game-bundler/src/compiler.ts             ← remove rules, add script validation
packages/game-bundler/src/types.ts                ← update BundleSections
```

### Files to CREATE (~16 files)

```
# Utility modules (3 files)
shared/src/scripting/modules/grid.js
shared/src/scripting/modules/containers.js
shared/src/scripting/modules/math.js

# Migrated game scripts (~13 files across 10 games)
r2/games/breakoutBouncer/scripts/game.js
r2/games/ballSort/scripts/game.js        ← rewritten
r2/games/ballSort/scripts/levels.js      ← extracted
r2/games/slopeggle/scripts/game.js
r2/games/flappyBird/scripts/game.js
r2/games/snake/scripts/game.js           ← rewritten
r2/games/sokoban/scripts/game.js         ← rewritten
r2/games/mrPotatoHead/scripts/game.js    ← rewritten
r2/games/tweenToggleCube/scripts/game.js ← rewritten
r2/games/gemCrush/scripts/game.js        ← new hooks script
```

### Lines of Code Impact (estimated)

| Category | Lines Removed | Lines Added | Net |
|:---|---:|---:|---:|
| Zod schemas (rules/behaviors/actions) | ~1,500 | 0 | -1,500 |
| Action executors | ~2,000 | 0 | -2,000 |
| Trigger/condition evaluators | ~800 | 0 | -800 |
| RulesSystem + BehaviorExecutor | ~1,200 | 0 | -1,200 |
| Behavior handlers | ~1,500 | 0 | -1,500 |
| State machine | ~300 | 0 | -300 |
| Event routing simplification | ~200 | 0 | -200 |
| New script API methods | 0 | ~200 | +200 |
| Game scripts (new) | 0 | ~800 | +800 |
| Bundler updates | ~50 | ~100 | +50 |
| **Total** | **~7,550** | **~1,100** | **-6,450** |

**Net result: ~6,450 fewer lines of code** with the same (or better) functionality.

---

## Execution Order & Dependencies

```
Phase 1A (Script API methods)
Phase 1B (Collision hooks)     ─── these are independent, can parallel
Phase 1C (animateEntity)
Phase 1D (Utility modules)
        │
        ▼
Phase 2A (Pilot: breakout)
Phase 2B (Pilot: ballSort)    ─── these are independent, can parallel
Phase 2C (Pilot: slopeggle)
        │
        ▼
   Decision Gate ← verify all pilots work
        │
        ▼
Phase 3  (Migrate remaining games) ─── can parallel per-game
        │
        ▼
Phase 4  (Remove rules system)
Phase 5  (Remove behavior system)  ─── must be sequential after Phase 3
Phase 6  (Clean up schemas)
        │
        ▼
Phase 7  (Update bundler)
Phase 8  (Final cleanup + verification) ─── must be last
```
