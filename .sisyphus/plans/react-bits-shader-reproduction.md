# React Bits Shader Reproduction Plan

## TL;DR

> **Quick Summary**: Acquire React Bits source into `~/Workspaces`, produce a canonical shader inventory, and port a bounded set of high-value effects into Slopcade examples using existing effects architecture and schema-driven parameter controls.
>
> **Deliverables**:
> - Cloned upstream source in `~/Workspaces/react-bits`
> - Full shader inventory and priority-ranked port matrix (easy-support first)
> - New Slopcade example page(s) with configurable shader parameters
> - Verification evidence under `.sisyphus/evidence/`
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 -> Task 3 -> Task 5 -> Task 7
> **Depends On**: `shader-infra-glsl-files` plan (must complete first — provides .glsl file infrastructure and split monoliths)

---

## Context

### Original Request
Clone `git@github.com:DavidHDev/react-bits.git` into `~/Workspaces`, locate where shaders are kept, and reproduce those effects in Slopcade examples with configurable parameters.

### Interview Summary
**Key Discussions**:
- Work is planned only in this session; implementation happens after `/start-work`.
- User selected **Tests-after** strategy for this effort.
- Search mode required exhaustive local + remote research.

**Research Findings**:
- Slopcade compile/runtime pipeline already supports shader graph compilation and live param updates.
- React Bits stores most shaders inline in component files (template literal GLSL), concentrated in background/animation components. They use standard WebGL GLSL (`gl_FragColor`, `void main()`, etc.) — NOT Godot shading language.
- Best practice supports prop/uniform mapping, range clamping, and avoiding runtime recompilation for toggles.
- **Shader storage**: Ported shaders will be stored as individual `.glsl` + `.meta.ts` files using the infrastructure from the `shader-infra-glsl-files` plan. Shared GLSL utilities (noise, hash, SDF helpers) from React Bits go in `shared/src/effects/shaders/_lib/`.
- **GLSL dialect gap**: React Bits uses WebGL GLSL; Slopcade uses Godot Shading Language. Porting requires translating `void main()` → `void fragment()`, `gl_FragColor` → `COLOR`, `gl_FragCoord` → `FRAGCOORD`, adding `shader_type canvas_item;`, replacing `u_time` → `TIME`, etc. Bounded per-shader translation, not a transpiler project.

### Metis Review
**Identified Gaps** (addressed in this plan):
- Scope creep risk from unbounded port count -> constrained by "easy-support only" rubric and priority tiers.
- Missing fallback rules for non-portable effects -> explicit exclusion and downgrade policy.
- Missing objective acceptance criteria -> command/tool-driven checks per task.
- Missing perf guardrails -> minimum FPS and compatibility constraints included.

---

## Work Objectives

### Core Objective
Port all React Bits shader effects that are easy to support in current Slopcade architecture, prioritized by composability and visual leverage, while exposing safe configurable runtime parameters through existing effect-schema UI plumbing.

### Concrete Deliverables
- `~/Workspaces/react-bits` cloned and auditable.
- A mapping artifact from React Bits effects to Slopcade port strategy.
- Priority-ordered list of all easy-support candidate effects with rationale and tiering.
- Ported examples integrated under `app/app/examples/` following priority order until easy-support set is exhausted.
- Parameter schemas wired to live updates (`effectsUpdateParams` hot path).
- QA evidence (screenshots, logs, responses) in `.sisyphus/evidence/`.

### Definition of Done
- [ ] Clone exists and is readable at `~/Workspaces/react-bits`.
- [ ] Selected effects compile/run in Slopcade without shader runtime errors.
- [ ] Every ported effect exposes configurable params via schema/UI and hot-path updates.
- [ ] Tests-after suite updates pass for touched modules.
- [ ] Agent-executed QA scenarios pass with captured evidence files.

### Must Have
- Use the `.glsl` + `.meta.ts` file structure established by the `shader-infra-glsl-files` plan.
- Use existing Slopcade effects architecture (`shared/src/effects/*` + `godot_project/scripts/effects/*`).
- Translate React Bits WebGL GLSL to Godot Shading Language for each ported shader.
- Add shared utility functions (noise, hash, SDF helpers) to `_lib/` and use `#include` where applicable.
- Keep porting bounded to easy-support eligibility criteria and exclusion rules.
- Preserve stable runtime behavior on desktop and mobile preview targets.

### Must NOT Have (Guardrails)
- No standalone transpiler project — each shader is manually translated WebGL GLSL → Godot.
- No rewrite of GraphExecutor or foundational effects architecture.
- No hard-problem ports (unsupported external textures/extensions/complex multipass) in this phase.
- No acceptance criteria requiring manual human verification.
- No adding shaders to the old monolith files — all new shaders go in `.glsl` + `.meta.ts` files only.

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> All verification is agent-executed via tools/commands. No manual testing steps are allowed in acceptance criteria.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: Tests-after
- **Framework**: Existing repo test stack (Vitest/Bun/project commands used by touched areas)

### Agent-Executed QA Scenarios (applies to all tasks)
- Frontend/UI verification uses Playwright workflow (or project browser automation) with deterministic selectors.
- Runtime/API verification uses shell commands and structured assertion checks.
- Evidence captured in `.sisyphus/evidence/task-{N}-{scenario}.png|txt|json`.

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Start Immediately):
- Task 1: Clone and baseline inventory scaffold
- Task 2: Local Slopcade extension-point baseline

Wave 2 (After Wave 1):
- Task 3: React Bits shader catalog + easy-support priority ranking
- Task 4: Uniform normalization and parameter schema mapping

Wave 3 (After Wave 2):
- Task 5: Implement first port batch in examples
- Task 6: Integrate configurable controls and presets
- Task 7: Verification, tests-after, and evidence collation

Critical Path: Task 1 -> Task 3 -> Task 5 -> Task 7

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|----------------------|
| 1 | None | 3 | 2 |
| 2 | None | 4, 5 | 1 |
| 3 | 1 | 5 | 4 |
| 4 | 2 | 6 | 3 |
| 5 | 2, 3 | 7 | 6 |
| 6 | 4 | 7 | 5 |
| 7 | 5, 6 | None | None |

---

## TODOs

- [x] 1. Clone React Bits and create inventory workspace

  **What to do**:
  - Clone `git@github.com:DavidHDev/react-bits.git` into `~/Workspaces/react-bits`.
  - Record commit SHA, branch, and top-level shader-relevant directories.
  - Create a working inventory markdown artifact under `.sisyphus/plans/` (or linked plan section) with discovered shader component paths.

  **Must NOT do**:
  - Do not modify upstream React Bits source.
  - Do not use partial ad-hoc discovery; inventory must be exhaustive for selected directories.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: bounded setup and indexing task.
  - **Skills**: `git-master`, `effects-system`
    - `git-master`: clean repository acquisition and traceability.
    - `effects-system`: shader-domain file classification.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: 3
  - **Blocked By**: None

  **References**:
  - `https://github.com/DavidHDev/react-bits` - upstream repository to clone and inspect.
  - `app/app/examples/vfx_showcase.tsx` - local target style for final showcase behavior.

  **Acceptance Criteria**:
  - [ ] `test -d ~/Workspaces/react-bits/.git` returns exit code 0.
  - [ ] Inventory artifact includes component path list and shader-location notes.
  - [ ] Evidence file exists: `.sisyphus/evidence/task-1-clone-log.txt`.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Clone repository successfully
    Tool: Bash
    Preconditions: SSH GitHub auth available
    Steps:
      1. Run: git clone git@github.com:DavidHDev/react-bits.git ~/Workspaces/react-bits
      2. Run: git -C ~/Workspaces/react-bits rev-parse --short HEAD
      3. Assert: command exits 0 and SHA is non-empty
      4. Save output to: .sisyphus/evidence/task-1-clone-log.txt
    Expected Result: Repo is cloned and commit SHA recorded
    Evidence: .sisyphus/evidence/task-1-clone-log.txt

  Scenario: Fail fast when clone target already exists
    Tool: Bash
    Preconditions: ~/Workspaces/react-bits exists
    Steps:
      1. Run clone command again
      2. Assert: non-zero exit code or "already exists" message
      3. Save output to: .sisyphus/evidence/task-1-clone-negative.txt
    Expected Result: Safe failure without destructive overwrite
    Evidence: .sisyphus/evidence/task-1-clone-negative.txt
  ```

- [x] 2. Baseline Slopcade shader integration points

  **What to do**:
  - Confirm compile/runtime path details and extension points for new effects.
  - Document where new shader entries and param schemas must be added.

  **Must NOT do**:
  - No architecture rewrites.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: `effects-system`, `game-authoring/bundling-and-shaders`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: 4, 5
  - **Blocked By**: None

  **References**:
  - `shared/src/effects/compiler.ts` - graph to compiled pass transformation.
  - `shared/src/effects/shaderLibrary.ts` - canonical builtin shader source registry.
  - `shared/src/effects/shaderRegistry.ts` - parameter schema wiring for UI.
  - `godot_project/scripts/effects/GraphExecutor.gd` - runtime uniform application and material setup.
  - `app/components/effects/EffectTuningPanel.tsx` - UI control rendering from schema.

  **Acceptance Criteria**:
  - [ ] Integration-point checklist exists in plan notes.
  - [ ] All extension paths reference existing files.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Validate required extension-point files exist
    Tool: Bash
    Preconditions: Slopcade repo checkout available
    Steps:
      1. Run file existence checks for compiler, registry, runtime, panel files
      2. Assert all checks pass (exit code 0)
      3. Save output to: .sisyphus/evidence/task-2-file-baseline.txt
    Expected Result: All required integration points present
    Evidence: .sisyphus/evidence/task-2-file-baseline.txt

  Scenario: Detect missing extension path
    Tool: Bash
    Preconditions: Include one intentionally wrong path check
    Steps:
      1. Run check on nonexistent baseline path
      2. Assert non-zero result captured
    Expected Result: Validation catches invalid references
    Evidence: .sisyphus/evidence/task-2-negative.txt
  ```

- [x] 3. Build complete React Bits shader catalog and rank easy-support ports

  **What to do**:
  - Enumerate shader-bearing components (Backgrounds + relevant Animations).
  - Score all candidates by portability, performance risk, and composability.
  - Build a complete priority list and mark eligibility tier:
    - Tier A: easy-support + highly composable
    - Tier B: easy-support + medium composability
    - Tier C: deferred (hard-problem / unsupported this phase)

  **Must NOT do**:
  - No inclusion of effects requiring unsupported external dependencies (unless explicitly supported).

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `effects-system`, `testing-patterns`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 4)
  - **Blocks**: 5
  - **Blocked By**: 1

  **References**:
  - `https://github.com/DavidHDev/react-bits/tree/main/src/content/Backgrounds` - main shader-rich source area.
  - `https://github.com/DavidHDev/react-bits/tree/main/src/content/Animations` - additional shader/interactive candidates.
  - `app/app/examples/vfx_showcase.tsx` - local showcase benchmark for parity expectations.

  **Acceptance Criteria**:
  - [ ] Full candidate list includes tier, rationale, and exclusion notes.
  - [ ] Each candidate has expected uniform list and risk classification.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Candidate scoring matrix generated
    Tool: Bash
    Preconditions: React Bits clone exists
    Steps:
      1. Run scripted extraction/search for shader-bearing files
      2. Produce matrix artifact under .sisyphus/evidence/
      3. Assert artifact contains full ranked list with Tier A/B/C classification
    Expected Result: Complete priority-ranked easy-support matrix
    Evidence: .sisyphus/evidence/task-3-candidate-matrix.md

  Scenario: Reject unsupported candidate
    Tool: Bash
    Preconditions: At least one unsupported effect identified
    Steps:
      1. Apply exclusion rule check
      2. Assert unsupported effect marked "excluded" with reason
    Expected Result: Scope guardrails enforced
    Evidence: .sisyphus/evidence/task-3-exclusions.md
  ```

- [x] 4. Define uniform normalization and parameter schema mapping

  **What to do**:
  - Map external uniform semantics (`iTime`, `iResolution`, channels) to Slopcade/Godot conventions.
  - Define per-effect `paramsSchema` with range-safe UI metadata.
  - Add fallback defaults for optional params.

  **Must NOT do**:
  - No dynamic shader recompilation for simple toggles.

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Skills**: `effects-system`, `input-handling`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: 6
  - **Blocked By**: 2

  **References**:
  - `shared/src/effects/types.ts` - `EffectParamSchema` contract.
  - `shared/src/effects/shaderRegistry.ts` - schema patterns and UI metadata conventions.
  - `docs/effects/EFFECTS_ARCHITECTURE.md` - hot-path param update expectations.

  **Acceptance Criteria**:
  - [ ] Mapping table exists for every Tier A and Tier B effect.
  - [ ] Every exposed param has min/max/step/default.
  - [ ] Toggle-like params mapped to uniforms instead of compile-time defines where possible.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Schema completeness validation
    Tool: Bash
    Preconditions: Mapping/spec files generated
    Steps:
      1. Run validation script/check to ensure each Tier A/B effect has schema rows
      2. Assert each row includes key, uniformName, type, default and ui bounds
    Expected Result: No schema gaps
    Evidence: .sisyphus/evidence/task-4-schema-check.txt

  Scenario: Bounds violation handling
    Tool: Bash
    Preconditions: Validation check available
    Steps:
      1. Inject out-of-range sample value into check input
      2. Assert validation fails or clamps with explicit output
    Expected Result: Unsafe values handled deterministically
    Evidence: .sisyphus/evidence/task-4-negative-bounds.txt
  ```

- [x] 5. Implement first shader port batch in Slopcade examples

  **What to do**:
  - For each Tier A/B effect, create a `.glsl` file (translated to Godot Shading Language) and `.meta.ts` sidecar in `shared/src/effects/shaders/post/` (or `sprite/` depending on scope).
  - Translate WebGL GLSL → Godot: `void main()` → `void fragment()`, `gl_FragColor` → `COLOR`, `gl_FragCoord` → `FRAGCOORD`, add `shader_type canvas_item;`, replace `u_time` → `TIME`, replace `u_resolution` → `1.0/SCREEN_PIXEL_SIZE`, etc.
  - Add shared utility functions (noise, hash, SDF helpers) to `_lib/` and reference via `#include`.
  - Update the barrel `shared/src/effects/shaders/index.ts` to include new entries.
  - Update `EffectType` union in `types.ts` for new shader IDs.
  - Create/extend example page(s) under `app/app/examples/` for easy-support effects in ranked order.
  - Ensure each effect is runnable and visible in preview.

  **Must NOT do**:
  - No migration of Tier C deferred effects in this phase.
  - No adding shaders to old monolith files — `.glsl` + `.meta.ts` only.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `effects-system`, `editor-system`, `game-authoring/bundling-and-shaders`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 6)
  - **Blocks**: 7
  - **Blocked By**: 2, 3

  **References**:
  - `shared/src/effects/shaders/` - new .glsl + .meta.ts file location (from infra plan).
  - `shared/src/effects/shaders/_lib/` - shared GLSL utility functions.
  - `shared/src/effects/shaders/index.ts` - barrel to update with new entries.
  - `shared/src/effects/types.ts` - EffectType union to extend.
  - `app/app/examples/vfx_showcase.tsx` - example composition and pass setup.
  - `app/app/examples/dynamic_shader.tsx` - live shader apply/error patterns.

  **Acceptance Criteria**:
  - [ ] Selected effects render in app example routes without runtime shader errors.
  - [ ] Example metadata and navigation expose the new/updated entries.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Ported effect renders successfully
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running
    Steps:
      1. Navigate to the example route for each ported effect
      2. Wait for preview canvas and effect selector to appear
      3. Assert no visible error banner and no shader compile error text
      4. Capture screenshot per effect
    Expected Result: Each Tier A/B implemented effect renders in preview
    Evidence: .sisyphus/evidence/task-5-render-{effect}.png

  Scenario: Invalid shader source handling remains safe
    Tool: Playwright (playwright skill)
    Preconditions: Dynamic shader path available
    Steps:
      1. Inject known-invalid shader input via existing test UI flow
      2. Assert error state appears and app remains responsive
      3. Capture screenshot
    Expected Result: Graceful failure, no crash
    Evidence: .sisyphus/evidence/task-5-invalid-shader.png
  ```

- [x] 6. Integrate configurable controls, hot-path updates, and presets

  **What to do**:
  - Wire controls via `EffectTuningPanel` / `EffectParamControl`.
  - Ensure runtime updates use hot-path param updates (no full graph rebuild per slider tick).
  - Add preset export/import (or copy preset) for reproducible configs.

  **Must NOT do**:
  - No manual-only tuning flow.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `effects-system`, `frontend-ui-ux`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 5)
  - **Blocks**: 7
  - **Blocked By**: 4

  **References**:
  - `app/components/effects/EffectTuningPanel.tsx` - parameter panel wiring.
  - `app/components/effects/EffectParamControl.tsx` - input control behavior.
  - `app/app/examples/vfx_showcase.tsx` - existing live update callback usage.
  - `docs/effects/EFFECTS_ARCHITECTURE.md` - hot-path update model.

  **Acceptance Criteria**:
  - [ ] Every implemented Tier A/B effect exposes controls for all schema params.
  - [ ] Slider/boolean/color changes reflect visually within one interaction cycle.
  - [ ] Preset copy/export returns deterministic payload.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Live param update works without rebuild lag
    Tool: Playwright (playwright skill)
    Preconditions: Ported effect page loaded
    Steps:
      1. Locate slider by label
      2. Set min, mid, max values in sequence
      3. Assert canvas output changes after each update
      4. Capture three screenshots and timing notes
    Expected Result: Immediate visual updates and stable UI
    Evidence: .sisyphus/evidence/task-6-live-update-{state}.png

  Scenario: Invalid parameter payload is rejected safely
    Tool: Bash + Playwright
    Preconditions: Parameter update hook accessible
    Steps:
      1. Send malformed/out-of-range param update
      2. Assert app does not crash and logs deterministic validation failure
      3. Capture output and screenshot
    Expected Result: Defensive handling of bad inputs
    Evidence: .sisyphus/evidence/task-6-negative-param.txt
  ```

- [x] 7. Run tests-after, performance checks, backlog sync, and finalize evidence

  **What to do**:
  - Run relevant test commands for all touched packages/files.
  - Run targeted performance smoke checks for all implemented Tier A/B effects.
  - Sync plan state with backlog using `sisyphus plan sync` (or backlog MCP equivalent).
  - Assemble final evidence index.

  **Must NOT do**:
  - Do not claim completion without command evidence.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `testing-patterns`, `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential finalization
  - **Blocks**: None
  - **Blocked By**: 5, 6

  **References**:
  - `Backlog.md` - verify task/project visibility and status context.
  - `.sisyphus/plans/react-bits-shader-reproduction.md` - source of truth for completion checks.

  **Acceptance Criteria**:
  - [ ] All touched tests pass with recorded output.
  - [ ] Performance smoke check meets minimum threshold (target >=30 FPS equivalent behavior on preview path used).
  - [ ] Plan-to-backlog sync command executed and logged.
  - [ ] Evidence index exists: `.sisyphus/evidence/react-bits-shader-summary.md`.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Tests-after verification passes
    Tool: Bash
    Preconditions: Implementation tasks complete
    Steps:
      1. Run repo/package test commands relevant to touched files
      2. Assert zero failing tests
      3. Save logs to .sisyphus/evidence/task-7-tests.txt
    Expected Result: Clean test run
    Evidence: .sisyphus/evidence/task-7-tests.txt

  Scenario: Backlog synchronization succeeds
    Tool: Bash
    Preconditions: Plan exists and backlog is available
    Steps:
      1. Run: sisyphus plan status
      2. Run: sisyphus plan sync
      3. Assert commands complete without error
      4. Save output
    Expected Result: Plan/backlog state synchronized
    Evidence: .sisyphus/evidence/task-7-backlog-sync.txt
  ```

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 3 | `docs(plan): add react-bits shader selection matrix` | plan/evidence docs | matrix file exists |
| 5 | `feat(effects): add react-bits shader ports (batch-1)` | new .glsl + .meta.ts files, barrel, examples | targeted render checks |
| 6 | `feat(editor): add configurable controls for ported shaders` | effects UI/example wiring | live param scenario |
| 7 | `test(effects): verify shader ports and sync backlog` | tests/evidence artifacts | full tests-after run |

---

## Success Criteria

### Verification Commands
```bash
test -d ~/Workspaces/react-bits/.git
test -f .sisyphus/evidence/react-bits-shader-summary.md
sisyphus plan status
sisyphus plan sync
```

### Final Checklist
- [ ] All Must Have items satisfied
- [ ] All Must NOT Have violations absent
- [ ] All easy-support candidates are ranked; implemented set follows priority order
- [ ] Runtime controls are schema-driven and stable
- [ ] Tests-after checks pass
- [ ] Evidence artifacts are complete and linked
