# Script-First Migration Learnings

## Phase 1B: Collision Enter/Exit Hooks

### Architecture Flow
- Collisions flow: Godot → Bridge (`onCollision` callback) → `GodotPhysicsAdapter` → `CollisionInfo[]` in `FrameData` → `ScriptSandboxRuntimeSystem`
- The script system reads collisions from `ctx.frame.collisions`, NOT directly from bridge callbacks
- Enter/exit semantics are derived by tracking collision pairs across frames in `ScriptSandboxRuntimeSystem`

### Key Files Modified
- `app/lib/scripting/types.ts` — Event types + lifecycle exports
- `app/lib/scripting/IScriptSandbox.ts` — Interface + hook names
- `app/lib/scripting/UnsafeScriptSandbox.ts` — Eval-based implementation
- `app/lib/scripting/QuickJSScriptSandbox.ts` — QuickJS implementation
- `app/lib/godot/types.ts` — Bridge-level event types
- `app/lib/godot/callback-registry.ts` — Callback arrays + methods
- `app/lib/godot/GodotBridgeBase.ts` — Base bridge callbacks
- `app/lib/game-engine/systems/runner/wrappers/ScriptSandboxRuntimeSystem.ts` — Pair tracking + hook dispatch

### Patterns Discovered
- Callback registry pattern: `BridgeCallbackArrays` + `createCallbackMethods()` in `callback-registry.ts`
- Hook registration: `ScriptHookName` union type + `hasHook()` check + `CompiledExports` interface
- Both sandbox implementations (Unsafe + QuickJS) need parallel updates for new hooks
- `ScriptReloadResult` tracks hook presence before/after reload — must include new hooks
- `ScriptErrorReport.phase` union must include new phase names

### Gotchas
- `IScriptSandbox.ts` has a duplicate `runCollision` declaration (pre-existing bug)
- Collision pair key uses null byte separator (`\0`) to avoid ambiguity with entity IDs
- Tags are copied (`[...tags]`) when building events to prevent mutation
- `activeCollisionPairs` is cleared in `destroy()` to prevent stale state on reload

## Phase 1C: animateEntity one-shot helper

### Key findings
- `WorldOpsImpl.animate()` is async (returns Promise) but the TweenSystem handles the actual animation over time
- Calling `worldOps.animate()` without awaiting is safe — it creates tweens that run in the background via TweenSystem
- `AnimateTarget` and `AnimateOptions` types already exist in `shared/src/types/world-ops.ts` — reuse them
- `SyncWorldOps` is extended by two `ScriptContext` interfaces: one in `app/lib/scripting/types.ts` and one in `shared/src/scripting/script-authoring-types.ts`
- Default duration of 300ms used when opts not provided (AnimateOptions.duration is required in the type)
- Typecheck command is `pnpm build:types` (runs `tsc -b`), not `bun run typecheck`

## Phase 1A: Adding SyncWorldOps Methods (playSound, camera, time, dialog, destroyByTag)

### Architecture Patterns Discovered

1. **Two event systems**: `GameEventQueue` (used by GameRuntime for frame-level events like collisions, input) vs `EventQueue` (used by systems for inter-system communication with subscribe/emit pattern).

2. **setTimeScale wiring**: In RulesSystem, `setTimeScale` is wired as a no-op `() => {}`. GameRuntime has a `useCallback` that calls `gameLoopControllerRef.current.setTimeScale()`. For scripts, we emit a `set_time_scale` event via EventQueue — GameRuntime or a listener can subscribe to this.

3. **Bridge methods available**: `bridge.playSound(resourcePath, volume?, pitch?)`, `bridge.screenShake(intensity, duration?)`, `bridge.zoomPunch(intensity?, duration?)` — all fire-and-forget.

4. **ScriptContext implementations**: Three places implement ScriptContext:
   - `ScriptSandboxRuntimeSystem.createScriptContext()` — primary implementation
   - `RunScriptActionExecutor.buildScriptContext()` — used when rules call `run_script` action
   - `UnsafeScriptSandbox.test.ts createMockScriptContext()` — test mock

5. **pendingDestroys pattern**: ScriptSandboxRuntimeSystem uses a `Set<string>` for deferred entity destruction. Entities are added during script execution and destroyed at the start of the next frame's update cycle.

6. **Pre-existing typecheck errors**: The codebase has pre-existing errors around `runCollisionEnter`/`runCollisionExit` in IScriptSandbox — these are unrelated to our changes.

### Implementation Decisions

- `setTimeScale` → Emits `set_time_scale` event via EventQueue (not adding to SystemContext since that would require touching GameRuntime wiring)
- `showDialog`/`dismissDialog` → Sets `activeDialog` variable + emits events for UI reactivity
- `destroyByTag` → Uses `pendingDestroys` Set for deferred destruction (consistent with existing pattern)
- `cameraZoom` → Maps to `bridge.zoomPunch()` (the bridge method name differs from the script API name)
- `cameraShake` → Maps to `bridge.screenShake()` (same naming mismatch)

## Phase 1D: Utility Modules (slopcade/grid, slopcade/containers)

### Module System Architecture
- QuickJS sandbox is at `app/lib/scripting/QuickJSScriptSandbox.ts`
- No pre-existing `require()` mechanism — had to add one to both sandboxes
- QuickJS sandbox: module sources embedded as strings in a `require()` prelude injected into the IIFE wrapper
- Unsafe sandbox: `require()` function built as a closure with module cache, passed as parameter
- Module source strings live in `shared/src/scripting/modules/index.ts` as template literals
- Canonical `.js` files exist alongside for reference/testing but aren't imported directly (Metro doesn't support `?raw`)

### Import Path
- `@slopcade/shared/scripting/modules` requires both:
  - `shared/package.json` exports entry: `"./scripting/modules": "./src/scripting/modules/index.ts"`
  - `app/tsconfig.json` paths: `"@slopcade/shared/*": ["../shared/src/*"]`

### QuickJS Gotchas
- `new Function()` works inside QuickJS sandbox for module compilation
- JS files get linted — `var` declarations must be at function root level (no `var` inside for-loop bodies)

## Breakout Bouncer Migration

### Script System Input Limitations
- `ScriptInputEvent.type` only supports: `tap`, `dragStart`, `dragMove`, `dragEnd`, `gameStarted`, `gameRestarted`
- **No `button` or `tilt` event types** in the script system
- Button-held state (`InputState.buttons`) is NOT exposed to scripts via `ScriptContext`
- Tilt state (`InputState.tilt`) is NOT exposed to scripts via `ScriptContext`
- `ScriptContext.input` is `InputSnapshot | null` which only captures tap events (built at line 483-489 of ScriptSandboxRuntimeSystem)
- Tap zones in `input` config convert screen taps to button events, but scripts can't read button state

### Migration Strategy
- `onCollision` handles ball_drain (tag checking on both entityA/entityB)
- `onUpdate` handles lock_paddle_y (set position every frame)
- `onInput` handles tap-based paddle control (check `event.position.x < 0` for left/right)
- Button-held rules (paddle_left/paddle_right) and tilt_control cannot be migrated without engine changes
- Tap impulse replaces both tap rules and partially covers button-held behavior

### Compiler Notes
- `definition.json` is a compiled output, not a source file
- Compiler reads scripts from `scripts/*.js` and concatenates with `// --- {basename} ---` prefix
- Compiler validates `exports.\w+\s*=` pattern in script files
- Arrow functions work fine in QuickJS sandbox and are used by other games
- `var` declarations must be at function root level (linter enforced)
- `MANIFEST_PASSTHROUGH_KEYS` does NOT include `rules` — rules only come from `rules/` directory

### Phase 1 API Methods Used
- `ctx.cameraShake(0.3, 0.2)` — screen shake on ball drain
- `ctx.haptic("Medium")` — haptic feedback on ball drain
- `ctx.destroyByTag("ball")` — destroy all balls (deferred via pendingDestroys)

## Slopeggle Migration (Rules → Script)

### Key Decisions
- Used `onCollisionEnter` (not `onCollision`) for first-contact detection — avoids duplicate callbacks per frame for the same collision pair
- Kept `destroy_on_collision` and `score_on_collision` behaviors on peg prefabs — they handle marking/scoring with delayed destruction via `turn_end` event
- Script emits `turn_end` event which triggers the behavior system's delayed destruction
- `destroyMarked` is NOT available in script context — must rely on behavior system's `destroy_on_collision` with `delay: { type: "event", eventName: "turn_end" }`

### Collision Event Shape
- `ScriptCollisionEnterEvent` has `{ entityA, entityB, tagsA, tagsB, normal, impulse }` — use `tagsA`/`tagsB` arrays (not `tagA`/`tagB` strings)
- Must check both sides since collision order is not guaranteed

### Performance Notes
- 100+ pegs means many collision callbacks — used early returns and minimal work per callback
- `onUpdate` proximity check iterates all orange pegs every frame — acceptable since orange pegs are only 10

### Formatter Gotcha
- Biome auto-formats `function(ctx, event) {` to `(ctx, event) => {` — arrow functions work fine in QuickJS sandbox
- Other games (breakoutBouncer) also use arrow functions in exports

### Build System
- `scripts/main.js` files are auto-discovered by the game-bundler's `scanForScriptFiles()`
- Script content is prefixed with `// --- {basename} ---\n` and inlined into `definition.json`
- Removing `rules/` directory results in `"rules": []` in definition.json (empty array, not removed)
- Build command: `cd api && npx tsx scripts/build-games.ts --game=slopeggle`

## BallSort Migration (Rules + BallSortActionExecutor → Script)

### Dialog Event Routing (CRITICAL — Updated)
- Dialog button presses emit events via `triggerEvent` → `pendingEvents` on game state
- With the rules system deleted (Feb 2026 cleanup), `pendingEvents` are never processed
- **Original plan**: Keep 2 forwarding rules using `run_script` action — FAILED because:
  1. The compiler doesn't include `rules/` directory in definition.json (no rules support in bundler)
  2. The entire rules system (`app/lib/game-engine/rules/`) was deleted
- **Final solution**: Added `game_event` routing via EventQueue:
  1. `handleDialogButtonPress` in `GameRuntime.godot.tsx` now also emits `game_event` on the runner's EventQueue
  2. `ScriptSandboxRuntimeSystem` subscribes to `game_event` and calls `sandbox.callFunction(ctx, eventName)`
  3. Dialog button `eventName` values match script export names directly (e.g., `"nextLevel"` → `exports.nextLevel`)
  4. `callFunction` silently succeeds if the export doesn't exist (returns `{success: true, value: undefined}`)
- **Key files modified**:
  - `app/lib/game-engine/GameRuntime.godot.tsx` — emit `game_event` on EventQueue in `handleDialogButtonPress`
  - `app/lib/game-engine/systems/runner/wrappers/ScriptSandboxRuntimeSystem.ts` — subscribe to `game_event`, dispatch to script exports
- **Two different GameState types**: `BehaviorContext.GameState` (used in UpdateContext) vs `runtime/types.ts GameState` (has pendingEvents). The UpdateContext doesn't expose pendingEvents.
- **Two different event systems**: `GameEventQueue` (frame-level input/collision events) vs `EventQueue` (inter-system pub/sub). Dialog events now flow through the EventQueue.

### Script File Concatenation
- Scripts in `scripts/*.js` are concatenated alphabetically
- `levels.js` (l < m) loads before `main.js`, so `var LEVELS = [...]` is available as a global
- No `require()` for local files — only `slopcade/grid` and `slopcade/containers` modules

### State Management
- Use closure variables as source of truth (not `ctx.getVariable`/`ctx.setVariable`)
- `gameFlow` state machine in definition.json is now redundant but harmless
- `tubeStacks` object maps tube index → Stack instance from `slopcade/containers`

### Timing Without setTimeout
- QuickJS sandbox doesn't have `setTimeout`
- Use elapsed time tracking: set `winAtElapsed = ctx.elapsed + delay` in closure
- Check in `onUpdate`: `if (winAtElapsed > 0 && ctx.elapsed >= winAtElapsed)`

### Invalid Feedback Pattern
- Old BallSortActionExecutor used `setTimeout(300ms)` to clear `invalid` tag
- Script uses `invalidClearAt` elapsed time tracking instead
- `showInvalidFeedback()` sets `invalidClearAt = ctx.elapsed + 0.3`
- `onUpdate` checks and clears when elapsed time passes

### Level Progression Bug Fix
- Original bug: level progression not working correctly
- Fix: `nextLevel()` properly increments `currentLevel` variable and calls `generateLevel()`
- `generateLevel()` clears existing tubes/balls and spawns new ones from `LEVELS[currentLevel]`

### Variables Cleanup
- Removed 22 closure-managed variables from definition.json:
  - `heldBallColor`, `sourceTubeIndex`, `heldBallId` → now in closure
  - `_winAtElapsed` → now in closure as `winAtElapsed`
  - `tube0_count` through `tube9_count` → now in `tubeStacks`
  - `tube0_topColor` through `tube9_topColor` → now in `tubeStacks`
- Kept variables still used by overlay bindings: `currentLevel`, `moveCount`, `activeDialog`

## Phase 2: Pilot Migrations Summary

### Script Input API Limitations
- `onInput` only receives: `tap`, `dragStart`, `dragMove`, `dragEnd`, `gameStarted`, `gameRestarted`
- NO `button` or `tilt` event types available to scripts
- Button-held state and tilt state are NOT exposed via `ScriptContext`
- Tap zones convert taps to button events, but scripts can't read button state
- **Impact**: Games requiring button-held or tilt input must either:
  1. Keep minimal rules for those inputs
  2. Use tap-based alternatives (impulse on tap instead of continuous force)
  3. Extend the script API (requires engine changes)

### Behavior Preservation Strategy
- Complex prefab behaviors (`destroy_on_collision` with delay, `oscillate`, `teleport`, `rotate_toward`) should remain on prefabs
- Script handles game flow, scoring, camera effects, input handling
- Behavior system handles entity-level effects (marking for destruction, movement patterns)
- `emit('turn_end')` from script triggers behavior system's delayed destruction

### Line Count Targets
- breakoutBouncer: 54 lines (target: <80) ✅
- ballSort: ~280 lines (target: <200) ⚠️ slightly over due to level generation complexity
- slopeggle: 135 lines (target: <150) ✅

## Shader Demo Games Migration (shaderCRT, shaderMulti, shaderRainbow)

Successfully migrated three shader demo games from rules to script-first:

### Games Migrated
- **shaderCRT**: 1 rule (tap → set ball velocity y=8) → onInput script
- **shaderMulti**: 3 rules (tap → spawn random prefab) → onInput script with random selection
- **shaderRainbow**: 1 rule (tap → spawn rainbowCube) → onInput script

### Build Process
- Games in `r2/games/` use JSON bundle format (not TypeScript)
- Compiler: `@slopcade/game-bundler/compiler` - `compileBundle()` function
- Scripts directory: `scripts/*.js` files are automatically discovered and concatenated
- Rules directory: `rules/*.json` files are automatically discovered and merged
- Removing `rules/` directory → compiler excludes rules from definition.json
- Adding `scripts/main.js` → compiler includes script in definition.json

### Compilation Command
```bash
cd api && npx tsx -e "
import { compileBundle } from '@slopcade/game-bundler/compiler';
import { writeFileSync } from 'fs';

const result = compileBundle('../r2/games/GAME_NAME');
if (result.success && result.gameDefinition) {
  writeFileSync('../r2/games/GAME_NAME/definition.json', 
    JSON.stringify(result.gameDefinition, null, 2));
}
"
```

### Script Patterns
- **Tap to modify velocity**: Query entities by tag, get velocity, set new velocity
- **Tap to spawn random**: Use Math.random() with thresholds for probability distribution
- **Tap to spawn at position**: Use `event.position` directly with `ctx.spawnEntity()`

### LSP Compliance
- JavaScript var declarations must be at function root (not inside if blocks)
- Pattern: Declare all vars at top, assign in conditional blocks

### Verification
- Check `definition.json` has `script` field (non-null)
- Check `definition.json` has `rules` array (length 0)
- Verify script content matches expected behavior

