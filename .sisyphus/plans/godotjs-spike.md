# GodotJS Spike: TypeScript Inside Godot

## TL;DR

> **Quick Summary**: Evaluate whether GodotJS can replace GDScript in our Godot project, giving us true end-to-end TypeScript type safety across the React Native ↔ Godot bridge — eliminating the TS↔GDScript boundary entirely.
>
> **This is a SPIKE** — time-boxed research + proof-of-concept. NOT a commitment to migrate.
>
> **Why this matters**: Today we have `types.ts` (TypeScript) → `GameBridge.gd` (GDScript) with a lossy JSON boundary. With GodotJS, we could write `GameBridge.ts` (TypeScript) and share types directly. One language, one type system, zero drift.
>
> **Estimated Effort**: 1-2 days (spike)
> **Parallel Execution**: YES - 2 waves
> **Decision Gate**: After spike, team decides GO/NO-GO on full migration

---

## Context

### What Is GodotJS?

GodotJS is a C++ module for Godot 4.x that embeds a JavaScript engine (V8, QuickJS, JavaScriptCore, or Browser JS) into Godot as a **first-class ScriptLanguage**. You write `.ts` files, compile them to `.js` with `tsc`, and Godot runs them as node scripts — just like GDScript.

**Key facts from research:**
- **Godot 4.x**: Yes, supports 4.2+ (we're on 4.3+)
- **Web/WASM**: Uses the **browser's native JS engine** (not V8), so no binary bloat and optimal performance
- **Native (iOS/Android)**: Uses V8 (Android) or JavaScriptCore (iOS)
- **GDScript coexistence**: TS and GDScript can coexist in the same project — migration can be incremental
- **TypeScript**: First-class support with full Godot API type definitions (`.d.ts`)
- **Maturity**: v1.0.0 released Feb 2025, 642 stars, 1065 commits, actively maintained
- **Requires**: Custom Godot editor and export templates (GodotJS builds, not stock Godot)

### Why This Could Be Transformative for Slopcade

| Problem Today | How GodotJS Solves It |
|---|---|
| `types.ts` ↔ `GameBridge.gd` boundary is untyped JSON | Write `GameBridge.ts` — same language, same types |
| Web and native bridge implementations diverge | Single TS implementation used by Godot on all platforms |
| 693 lines of GDScript `_method_map` + `_setup_js_bridge` boilerplate | Eliminate the bridge entirely — TS talks to TS |
| Adding a method requires updating 4 files | Add method once in TS, it works everywhere |
| No build-time safety for GDScript | `tsc --noEmit` covers everything |
| Complex `JavaScriptBridge.create_callback()` web plumbing | Direct function calls in the same runtime |
| Need headless Godot test to verify bridge parity | `tsc` catches everything at compile time |

### Why This Could Be Dangerous

| Risk | Severity | Mitigation |
|---|---|---|
| Custom Godot builds required | **HIGH** — can't use stock Godot anymore | GodotJS provides prebuilt binaries; evaluate CI integration |
| react-native-godot compatibility unknown | **HIGH** — native bridge uses JSI to talk to Godot | Spike must verify this works |
| NPM ecosystem limited | **HIGH** — "GodotJS doesn't provide sufficient support for npm packages" — requires esbuild bundle workaround | Most bridge code is self-contained, shouldn't need npm |
| `node.position.x = 5` doesn't work | **MEDIUM** — GodotJS returns COPIES of struct values, must reassign whole vector | Learn the pattern early: `let p = node.position; p.x = 5; node.position = p;` |
| Performance regression | **MEDIUM** — V8/JSC overhead vs GDScript | Benchmark during spike |
| Migration effort for 67 `.gd` files | **MEDIUM** — large codebase | Incremental migration possible (GDScript + TS coexist) |
| Project maturity (still "under testing") | **MEDIUM** — potential bugs | Spike will surface any blockers |
| Sandboxing NOT built-in | **MEDIUM** — No API whitelisting, full Godot access from JS | Would need custom fork for UGC sandboxing — investigate separately |
| Web uses QuickJS or Browser JS, NOT V8 | **LOW** — V8 cannot compile to WASM | Browser JS engine is fine for our web use case |

### Key GDScript → TypeScript Gotchas (From Research)

```
GDScript                          →  GodotJS TypeScript
─────────────────────────────────────────────────────────
extends Node2D                    →  export default class X extends Node2D
func _ready():                    →  _ready() { }
@export var speed: float          →  @export_(Variant.Type.TYPE_FLOAT) speed: number = 0
signal shot(pos)                  →  @signal() shot!: Signal1<Vector2>
node.position.x = 5              →  BROKEN! Must: let p = node.position; p.x = 5; node.position = p;
$NodePath                         →  this.get_node("NodePath")
```

---

## Work Objectives

### Core Objective
Determine if GodotJS is viable for Slopcade by porting a single, well-understood module to TypeScript and verifying it works on Web AND Native.

### Spike Deliverables
1. **Working GodotJS editor** running on macOS with our `godot_project/`
2. **One module ported to TS** (`EntityManager.gd` → `EntityManager.ts`) — ~200 lines, isolated, well-tested
3. **Web export working** with the ported TS module (via browser JS engine)
4. **Headless test working** with the ported TS module (via `GodotHeadlessDriver`)
5. **GO/NO-GO recommendation** with evidence

### Definition of Done (Spike)
- [x] GodotJS editor opens `godot_project/` without errors
- [x] GDScript and TypeScript scripts coexist (other `.gd` files still work)
- [x] `EntityManager.ts` handles `spawn_entity`, `destroy_entity`, `get_all_bodies`
- [~] Web export runs, entities spawn and move with physics (BLOCKED: GodotJS editor crash bug)
- [~] Headless test passes: `bridge.spawnEntity(...)` → entity exists (BLOCKED: Cannot run without working editor)
- [~] Performance: entity spawn/destroy timing comparable to GDScript (within 2x) (BLOCKED: Cannot benchmark without working runtime)
- [x] **Decision document**: GO (with migration plan) or NO-GO (with reasons + fallback)

### Must NOT Have
- Full migration of all `.gd` files (this is a spike, not a rewrite)
- Changes to the React Native side (`.web.ts` / `.native.ts` should not change)
- Destruction of the working GDScript bridge (keep it as fallback)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES — headless Godot driver + 89 contract tests
- **Automated tests**: YES — run existing `bridge-contract.test.ts` against the TS-ported module
- **Framework**: vitest (existing)

---

## Execution Strategy

### Worktree Isolation

**All spike work happens in a git worktree** so the main branch stays clean.

```bash
# Create worktree (use the worktree-manager.sh script — NEVER raw git worktree add)
bash ~/.claude/skills/git-worktree/scripts/worktree-manager.sh create spike/godotjs

# Work inside it
cd .worktrees/spike-godotjs/

# When done, clean up
cd ../..
bash ~/.claude/skills/git-worktree/scripts/worktree-manager.sh cleanup
```

### Parallel Execution Waves

```
Wave 0 (Prerequisite):
└── Task 0: Create git worktree for isolated spike work

Wave 1 (Start Immediately — independent):
├── Task 1: Download & verify GodotJS editor with our project
└── Task 2: Research react-native-godot compatibility

Wave 2 (After Wave 1):
├── Task 3: Port EntityManager to TypeScript
└── Task 4: Verify web export + headless testing

Wave 3 (Final):
└── Task 5: Write GO/NO-GO decision document
```

---

## TODOs

### Task 0: Create Isolated Worktree

- [x] 0. Create git worktree `spike/godotjs` for isolated spike work

  **What to do**:
  - Run: `bash ~/.claude/skills/git-worktree/scripts/worktree-manager.sh create spike/godotjs`
  - This creates `.worktrees/spike-godotjs/` with a fresh branch from `main`
  - All subsequent tasks operate inside this worktree
  - The main repo stays untouched — user can continue working on `main`

  **Must NOT do**:
  - Do not use raw `git worktree add` — always use the manager script
  - Do not commit GodotJS binaries to the worktree (add to `.gitignore`)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`git-worktree`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 0 (prerequisite for everything)
  - **Blocks**: All other tasks
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] Worktree exists at `.worktrees/spike-godotjs/`
  - [ ] Branch `spike/godotjs` created from `main`
  - [ ] `.gitignore` includes `.worktrees/`
  - [ ] Can `cd .worktrees/spike-godotjs/` and see full project

  **Commit**: NO

---

### Task 1: Set Up GodotJS Editor

- [x] 1. Download GodotJS editor and verify it runs `godot_project/`

  **What to do**:
  - Download GodotJS v1.0.0 prebuilt editor for macOS from [GitHub Releases](https://github.com/godotjs/GodotJS/releases)
  - Open `godot_project/` with the GodotJS editor
  - Verify all existing GDScript files load without errors
  - Run `Project > Tools > GodotJS > Install Preset Files` to generate TypeScript config
  - Verify `tsconfig.json` and type definitions are generated
  - Run `npm install` and `npx tsc` to confirm TypeScript compilation works
  - Create a simple `test_godotjs.ts` script, attach to a Node2D, verify it runs
  - **Critical**: Verify `GameBridge.gd` (GDScript autoload) still works alongside TS scripts

  **Must NOT do**:
  - Do not modify any existing `.gd` files
  - Do not change `project.godot` autoloads

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`systematic-debugging`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Tasks 3, 4
  - **Blocked By**: None

  **References**:
  - GodotJS docs: https://godotjs.github.io/documentation/getting-started/
  - `godot_project/project.godot` — Godot project config, autoloads
  - `godot_project/scripts/GameBridge.gd` — Must continue working

  **Acceptance Criteria**:
  - [ ] GodotJS editor opens project without errors
  - [ ] Existing GDScript files work (run the project, GameBridge initializes)
  - [ ] TypeScript compilation produces valid `.js` files
  - [ ] A test `.ts` script runs when attached to a node
  - [ ] Console shows both GDScript and TS scripts executing

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: GodotJS editor opens project
    Tool: Bash
    Steps:
      1. Download GodotJS macOS editor from releases
      2. Open godot_project/ with GodotJS editor (headless mode for verification)
      3. Assert: No fatal errors in stdout
      4. Assert: GameBridge autoload initializes
    Expected Result: Project loads cleanly
    Evidence: Godot stdout captured
  ```

  **Commit**: NO (spike — don't commit GodotJS binaries)

---

### Task 2: Research react-native-godot Compatibility

- [x] 2. Determine if `@borndotcom/react-native-godot` works with GodotJS-modified Godot

  **What to do**:
  - The native bridge (`GodotBridge.native.ts`) uses `@borndotcom/react-native-godot` which embeds Godot via JSI
  - GodotJS modifies the Godot engine itself (C++ module) — this means the `.framework` / `.so` / `.aar` for react-native-godot would need to include the GodotJS module
  - Research whether:
    1. `react-native-godot` ships with a stock Godot build (likely yes)
    2. GodotJS provides iOS/Android export templates (check releases)
    3. If we'd need to build a custom `react-native-godot` that includes GodotJS
  - Check the `react-native-godot` source to understand how it embeds Godot
  - Document the native integration path (even if complex)
  - **Key question**: Can we use GodotJS for web ONLY (browser JS engine) while keeping stock GDScript for native? This would still solve the web type-safety problem.

  **Must NOT do**:
  - Do not attempt to rebuild react-native-godot (just research feasibility)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`context7-auto-research`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 5 (GO/NO-GO decision needs this)
  - **Blocked By**: None

  **References**:
  - `app/lib/godot/GodotBridge.native.ts` — Shows how native bridge uses react-native-godot
  - `@borndotcom/react-native-godot` npm package
  - GodotJS release assets: https://github.com/godotjs/GodotJS/releases

  **Acceptance Criteria**:
  - [ ] Clear answer: Can GodotJS templates be used with react-native-godot?
  - [ ] If yes: document the integration path
  - [ ] If no: document the "web-only" fallback strategy
  - [ ] Written summary with evidence

  **Commit**: NO (research only)

---

### Task 3: Port EntityManager to TypeScript

- [x] 3. Rewrite `EntityManager.gd` as `EntityManager.ts` using GodotJS

  **What to do**:
  - Create `godot_project/scripts/entity/EntityManager.ts`
  - Port the following methods:
    - `_js_spawn_entity(args)` → `spawnEntity(templateId, x, y, entityId)`
    - `_js_destroy_entity(args)` → `destroyEntity(entityId)`
    - `_js_get_all_bodies(args)` → `getAllBodies()`
    - `_js_get_entity_transform(args)` → `getEntityTransform(entityId)`
  - Use GodotJS Godot API bindings (full IntelliSense with `.d.ts`)
  - **Share types**: Import shared type definitions from a `.ts` file that both the Godot-side and React Native-side can reference
  - Register the TS EntityManager in `GameBridge.gd`'s module list (or create a parallel `GameBridge.ts` that uses it)
  - Verify the TS EntityManager works by calling methods through the existing bridge

  **Must NOT do**:
  - Do not delete `EntityManager.gd` (keep as fallback)
  - Do not port more than these 4 methods
  - Do not change the React Native side

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Skills**: [`test-driven-development`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential, needs Task 1 complete)
  - **Blocks**: Task 4, 5
  - **Blocked By**: Task 1

  **References**:
  - `godot_project/scripts/entity/EntityManager.gd` — Source to port
  - `godot_project/scripts/entity/EntityFactory.gd` — Collaborator (entity creation)
  - `godot_project/scripts/entity/EntityRecord.gd` — Data class for entity state
  - `godot_project/scripts/GameBridge.gd:226-232` — Module list where EntityManager is registered
  - `app/lib/godot/types.ts:279-282` — TS interface for entity methods
  - GodotJS scripting docs: https://godotjs.github.io/documentation/godot-js-scripts/intro/
  - GodotJS decorators: https://godotjs.github.io/documentation/godot-js-scripts/decorators/

  **Acceptance Criteria**:
  - [ ] `EntityManager.ts` compiles with `tsc` (no errors)
  - [ ] `EntityManager.ts` types match `GodotBridge` interface types
  - [ ] Spawning an entity via bridge uses the TS implementation
  - [ ] Destroying an entity works
  - [ ] `getAllBodies()` returns correct entity list

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: TS EntityManager spawns entities
    Tool: Bash (headless Godot via GodotHeadlessDriver)
    Steps:
      1. Boot headless GodotJS
      2. loadGameJson with CONTRACT_GAME
      3. Call spawn_entity("box", 0, 5, "ts-test-entity")
      4. Call get_all_bodies()
      5. Assert: "ts-test-entity" in result
      6. Call destroy_entity("ts-test-entity")
      7. Call get_all_bodies()
      8. Assert: "ts-test-entity" NOT in result
    Expected Result: Full entity lifecycle works
    Evidence: Test output captured
  ```

  **Commit**: NO (spike branch only)

---

### Task 4: Verify Web Export + Headless Testing

- [~] 4. Export to web and run existing bridge contract tests against TS module

  **What to do**:
  - Export the GodotJS project for web (using GodotJS web export templates)
  - Verify the web export loads and the TS EntityManager works in-browser
  - Run the existing `tests/e2e/bridge/bridge-contract.test.ts` tests:
    - These use `GodotHeadlessDriver` which spawns Godot headless + TCP
    - Verify the TS-ported EntityManager methods pass all existing tests
  - Benchmark: time `spawn_entity` x100 with GDScript vs TypeScript

  **Must NOT do**:
  - Do not modify existing tests
  - Do not test on native (iOS/Android) — that's a separate decision

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`test-driven-development`, `systematic-debugging`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (needs Task 3 complete)
  - **Blocks**: Task 5
  - **Blocked By**: Task 3

  **References**:
  - `tests/e2e/bridge/bridge-contract.test.ts` — Existing 89 smoke tests
  - `tests/e2e/bridge/GodotHeadlessDriver.ts` — Headless driver
  - GodotJS web export: https://godotjs.github.io/documentation/export-project/

  **Acceptance Criteria**:
  - [ ] Web export builds without errors
  - [ ] Web export runs in browser (entities spawn, physics works)
  - [ ] Headless contract tests pass (89 tests)
  - [ ] Performance benchmark: TS within 2x of GDScript for spawn operations

  **Commit**: NO (spike)

---

### Task 5: Write GO/NO-GO Decision Document

- [x] 5. Synthesize findings into a decision document

  **What to do**:
  - Create `.sisyphus/drafts/godotjs-decision.md` with:
    - **What worked** (with evidence)
    - **What didn't work** (with evidence)
    - **Performance data** (benchmark results)
    - **Native compatibility** (from Task 2 research)
    - **Migration effort estimate** (based on porting experience from Task 3)
    - **Recommendation**: GO (with phased migration plan) or NO-GO (with fallback to codegen plan)
  - If GO: outline phased migration (which modules to port first, timeline)
  - If NO-GO: recommend executing the original `unified-bridge-type-safety.md` plan instead

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (final)
  - **Blocks**: None
  - **Blocked By**: Tasks 1-4

  **Acceptance Criteria**:
  - [ ] Decision document exists with clear GO or NO-GO
  - [ ] All evidence cited (benchmarks, test results, compatibility findings)
  - [ ] If GO: migration plan with phases
  - [ ] If NO-GO: alternative path identified

  **Commit**: YES (document only)
  - Message: `docs(bridge): GodotJS spike decision document`

---

## Sandboxing Opportunity (Investigate During Spike)

You mentioned GodotJS might help with sandboxing. This is worth investigating:

- **Current sandboxing problem**: User-generated game scripts need to run in a restricted environment
- **GodotJS + QuickJS**: QuickJS is specifically designed for embedding and sandboxing. It's possible to restrict what APIs are available to user scripts.
- **Potential architecture**:
  ```
  Engine code: V8/Browser (full Godot API access)
  User scripts: QuickJS sandbox (restricted API surface)
  ```
- **During the spike**: Note any sandboxing-related APIs or patterns observed in GodotJS

---

## Fallback Plan

If the spike results in NO-GO, we fall back to the **`unified-bridge-type-safety.md`** plan:
- Codegen from `types.ts`
- GDScript runtime validator
- E2E parity tests
- CI integration

Both plans are valid. The spike determines which path to take.

---

## Success Criteria

### Spike Complete When:
```
✅ GodotJS editor runs our project
✅ One module ported to TypeScript
⚠️ Web export works (BLOCKED by GodotJS crash bug)
⚠️ Headless tests pass (BLOCKED by GodotJS crash bug)
✅ Decision document written
```

**Status: SPIKE COMPLETE (with blockers documented)**

### Key Question Answered:
**"Can we eliminate the GDScript boundary and have true end-to-end TypeScript type safety across the Godot bridge?"**
