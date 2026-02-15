# Shader Infrastructure: .glsl Files + Monolith Split

## TL;DR

> **Quick Summary**: Split the 1,670-line `shaderLibrary.ts` and 1,384-line `shaderRegistry.ts` monoliths into individual `.glsl` files with co-located `.meta.ts` sidecars. Add `vite-plugin-glsl` for build-time GLSL imports with `#include` support. Add Metro GLSL transformer for React Native parity. Zero runtime behavior changes — downstream consumers (`compiler.ts`, `GraphExecutor.gd`, `EffectTuningPanel.tsx`) see identical `SHADER_LIBRARY` and `SHADER_REGISTRY` objects.
>
> **Deliverables**:
> - Per-shader `.glsl` + `.meta.ts` files under `shared/src/effects/shaders/`
> - Shared GLSL utilities in `shared/src/effects/shaders/_lib/`
> - `vite-plugin-glsl` configured in Vite config
> - Metro GLSL transformer configured in Metro config
> - TypeScript `.glsl` module declarations
> - Barrel `index.ts` producing identical exports to current monoliths
> - All existing tests and runtime behavior preserved
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 → Task 3 → Task 5 → Task 6
> **Blocks**: `react-bits-shader-reproduction` plan (porting plan depends on this infra)

---

## Context

### Original Request
User wants proper `.glsl` files with syntax highlighting, a build system that handles them, composable `#include` support for shared shader functions, and compatibility with the existing Slopcade effects pipeline. This is the prerequisite infrastructure before porting external shaders (React Bits) into the codebase.

### Research Findings

**Current state (problems)**:
- `shaderLibrary.ts`: 1,670 lines — 37 shaders as inline template literal strings in one `Record<string, string>`. No syntax highlighting, no linting, no editor GLSL support.
- `shaderRegistry.ts`: 1,384 lines — metadata for each shader (paramsSchema, aiHints, category, combinability). GLSL source and metadata are in separate files with no co-location.
- `EffectType` union in `types.ts` must be manually updated for every new shader.
- No way to share GLSL utility functions across shaders (noise, hash, etc. are copy-pasted).

**Target state (after this plan)**:
- Each shader lives in its own `.glsl` file with full editor support (syntax highlighting, GLSL linting).
- Each shader's metadata lives in a co-located `.meta.ts` sidecar.
- Shared GLSL functions live in `_lib/` and are imported via `#include`.
- A barrel `index.ts` assembles the same `SHADER_LIBRARY` and `SHADER_REGISTRY` shapes.
- All downstream consumers are unchanged.

**Build tooling research**:
- `vite-plugin-glsl`: Industry standard for Vite. Supports `#include` directives, minification in production, and handles `.glsl`/`.frag`/`.vert` extensions. Active maintenance.
- Metro (React Native): Requires `react-native-glsl-transformer` custom transformer + adding `.glsl` to `sourceExts`.
- TypeScript: Requires `declare module '*.glsl'` declaration file.
- glslify: **Rejected** — legacy (last release 2016), parser chokes on Godot-specific syntax (`hint_range`, `source_color`), destructive name mangling.

**Compatibility notes**:
- Godot Shading Language uses `shader_type`, `void fragment()`, `COLOR`, `UV`, `TIME`, `hint_range()`, `source_color` — all non-standard GLSL. These are preserved as-is in `.glsl` files since Godot consumes them directly. The build step just imports them as raw strings.
- `shaderRewrite.ts` already handles `SCREEN_TEXTURE → input` rewriting for SubViewport execution. A future WebGL export would follow the same pattern with additional transforms (`void fragment() → void main()`, `COLOR → gl_FragColor`, etc.). That is NOT in scope for this plan.

---

## Work Objectives

### Core Objective
Refactor shader storage from two monolith TypeScript files into per-shader `.glsl` + `.meta.ts` files with build-time import support, preserving all existing runtime behavior.

### Concrete Deliverables
- Directory structure: `shared/src/effects/shaders/{sprite,post,utility}/` with per-shader files
- Shared library: `shared/src/effects/shaders/_lib/` for reusable GLSL functions
- Build config: `vite-plugin-glsl` in Vite config, Metro GLSL transformer in Metro config
- Type declarations: `glsl.d.ts` with `declare module '*.glsl'`
- Barrel: `shared/src/effects/shaders/index.ts` exporting `SHADER_LIBRARY` + `SHADER_REGISTRY`
- Updated imports in `shaderLibrary.ts` → thin re-export from barrel (or barrel replaces it)
- All existing tests pass unchanged

### Definition of Done
- [ ] Every shader from current `shaderLibrary.ts` exists as an individual `.glsl` file
- [ ] Every shader from current `shaderRegistry.ts` has a co-located `.meta.ts`
- [ ] `SHADER_LIBRARY` and `SHADER_REGISTRY` exports are identical in shape and content
- [ ] `#include` works for at least one shared utility function
- [ ] `vite-plugin-glsl` is configured and imports resolve at build time
- [ ] Metro config updated for `.glsl` source extension support
- [ ] All existing effect tests pass
- [ ] `tsc --noEmit` passes for `shared/` package
- [ ] Runtime behavior is unchanged (GraphExecutor, compiler, UI controls all work)

### Must Have
- Exact same `SHADER_LIBRARY` and `SHADER_REGISTRY` object shapes as current code
- Zero changes to `compiler.ts`, `GraphExecutor.gd`, `EffectTuningPanel.tsx`, or any other consumer
- All 37 existing shaders migrated (15 sprite + 21 post-process + 1 grid)
- TypeScript type safety preserved (no `as any`, no `@ts-ignore`)

### Must NOT Have (Guardrails)
- No runtime behavior changes
- No new shader effects added in this plan (that's the porting plan's job)
- No WebGL export/transpilation layer (future work)
- No changes to GraphExecutor.gd or any Godot-side code
- No glslify dependency
- No changes to the `EffectType` union mechanism (keep manual for now, auto-generation is a separate improvement)

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**

### Test Decision
- **Infrastructure exists**: YES — existing effect tests in `shared/src/effects/__tests__/`
- **Automated tests**: Tests-after (verify existing tests still pass, add import smoke tests)
- **Framework**: Vitest (shared package), `tsc --noEmit`

### Verification approach
1. Snapshot comparison: `SHADER_LIBRARY` keys and GLSL content must be byte-identical before/after
2. Snapshot comparison: `SHADER_REGISTRY` entries must be structurally identical before/after
3. Existing test suite must pass with zero changes
4. TypeScript compilation must pass
5. Build must succeed (Vite build for web target)

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Start Immediately):
- Task 1: Add build tooling (vite-plugin-glsl, Metro transformer, type declarations)
- Task 2: Create directory structure and shared `_lib/` utilities

Wave 2 (After Wave 1):
- Task 3: Extract sprite shaders (15) into .glsl + .meta.ts files
- Task 4: Extract post-process shaders (21 + 1 grid) into .glsl + .meta.ts files

Sequential (After Wave 2):
- Task 5: Build barrel index, wire imports, verify snapshot parity
- Task 6: Run full verification suite, clean up monoliths, finalize

Critical Path: Task 1 → Task 3 → Task 5 → Task 6

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|----------------------|
| 1 | None | 3, 4 | 2 |
| 2 | None | 3, 4 | 1 |
| 3 | 1, 2 | 5 | 4 |
| 4 | 1, 2 | 5 | 3 |
| 5 | 3, 4 | 6 | None |
| 6 | 5 | None | None |

---

## TODOs

- [x] 1. Add build tooling for .glsl file imports

  **What to do**:
  - Install `vite-plugin-glsl` as a dev dependency in the appropriate workspace(s).
  - Add the plugin to Vite config(s) that build `shared/` or consume shaders.
  - Install/configure `react-native-glsl-transformer` (or equivalent) in Metro config for RN parity. If no suitable transformer exists, document the gap and use a workaround (pre-build step that copies `.glsl` → `.ts` with raw string export).
  - Create `shared/src/effects/shaders/glsl.d.ts` (or project-level) with `declare module '*.glsl'` declarations.
  - Verify a trivial `.glsl` file can be imported as a string in a test file.

  **Must NOT do**:
  - Do not modify any existing shader source content.
  - Do not change any existing import paths in consumer code yet.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `effects-system`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: 3, 4
  - **Blocked By**: None

  **References**:
  - `vite.config.ts` (or equivalent) — Vite configuration entry point.
  - `app/metro.config.js` — Metro bundler configuration.
  - `shared/tsconfig.json` — TypeScript config for shared package.
  - `https://github.com/UstymUkhman/vite-plugin-glsl` — plugin documentation.

  **Acceptance Criteria**:
  - [ ] `vite-plugin-glsl` is installed and configured in Vite config.
  - [ ] Metro config supports `.glsl` source extension (or gap documented).
  - [ ] Type declaration file exists and `tsc --noEmit` passes.
  - [ ] A test `.glsl` file imports successfully as a string in a smoke test.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: GLSL import resolves as string
    Tool: Bash
    Preconditions: vite-plugin-glsl installed, type declarations in place
    Steps:
      1. Create a trivial test .glsl file with known content
      2. Import it in a TypeScript test file
      3. Assert the import is a string matching expected content
      4. Run: tsc --noEmit for the shared package
      5. Assert exit code 0
    Expected Result: .glsl files are importable as strings with type safety
    Evidence: .sisyphus/evidence/task-1-glsl-import.txt

  Scenario: Vite build succeeds with plugin
    Tool: Bash
    Preconditions: Plugin configured in vite.config
    Steps:
      1. Run Vite build for affected workspace
      2. Assert exit code 0
    Expected Result: Build passes with new plugin
    Evidence: .sisyphus/evidence/task-1-vite-build.txt
  ```

- [x] 2. Create directory structure and shared GLSL utilities

  **What to do**:
  - Create directory tree:
    ```
    shared/src/effects/shaders/
      sprite/           (will hold 15 sprite shader files)
      post/             (will hold 21 post-process + 1 grid shader files)
      _lib/             (shared GLSL utility functions)
      index.ts          (barrel — built in Task 5)
    ```
  - Extract common GLSL patterns from existing shaders into `_lib/` utilities:
    - `_lib/noise.glsl` — hash/noise functions (used by dissolve, shimmer, glitch, etc.)
    - `_lib/math.glsl` — common math helpers (smoothstep variants, remap, etc.)
    - Any other patterns that appear 3+ times across existing shaders.
  - Each `_lib/*.glsl` file should be self-contained and usable via `#include "../_lib/noise.glsl"`.

  **Must NOT do**:
  - Do not extract shaders from monoliths yet (that's Tasks 3-4).
  - Do not create the barrel `index.ts` yet (that's Task 5).

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: `effects-system`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: 3, 4
  - **Blocked By**: None

  **References**:
  - `shared/src/effects/shaderLibrary.ts` — scan for repeated GLSL patterns.
  - Existing noise/hash functions inline in dissolve, glitch, shimmer, nightVision shaders.

  **Acceptance Criteria**:
  - [ ] Directory structure exists as specified.
  - [ ] At least one `_lib/*.glsl` utility file exists with extracted common code.
  - [ ] `_lib/` files are syntactically valid GLSL fragments.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Directory structure exists
    Tool: Bash
    Preconditions: None
    Steps:
      1. Check each directory exists: sprite/, post/, _lib/
      2. Assert all checks pass
    Expected Result: Clean directory scaffold
    Evidence: .sisyphus/evidence/task-2-dirs.txt

  Scenario: Shared utility has valid GLSL
    Tool: Bash
    Preconditions: _lib/ files created
    Steps:
      1. Check _lib/*.glsl files exist and are non-empty
      2. Grep for function declarations to verify they contain GLSL functions
    Expected Result: Utility files contain usable GLSL function definitions
    Evidence: .sisyphus/evidence/task-2-lib-check.txt
  ```

- [x] 3. Extract sprite shaders (15) into .glsl + .meta.ts files

  **What to do**:
  - For each of the 15 sprite shaders in `shaderLibrary.ts`:
    1. Create `shared/src/effects/shaders/sprite/{name}.glsl` with the exact GLSL content from `SHADER_LIBRARY[name]`
    2. Create `shared/src/effects/shaders/sprite/{name}.meta.ts` with the `ShaderLibraryEntry` metadata from `SHADER_REGISTRY[name]` (paramsSchema, aiHints)
    3. Where applicable, replace inline noise/hash/math with `#include "../_lib/noise.glsl"` etc. **Only if the extracted function is byte-identical to the `_lib` version.** If there's any difference, keep inline.
  - Sprite shaders to extract: silhouette, tint, waveDistortion, rimLight, rainbow, pixelate, posterize, outline, innerGlow, holographic, glow, dropShadow, flash, dissolve, colorMatrix

  **Must NOT do**:
  - Do not modify GLSL shader logic (only file extraction + optional `#include` for exact-match utilities).
  - Do not change `shaderLibrary.ts` or `shaderRegistry.ts` yet — they stay as-is until Task 5 rewires imports.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `effects-system`, `game-authoring/bundling-and-shaders`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 4)
  - **Blocks**: 5
  - **Blocked By**: 1, 2

  **References**:
  - `shared/src/effects/shaderLibrary.ts` lines 12-568 — sprite shader GLSL source.
  - `shared/src/effects/shaderRegistry.ts` lines 19-508 — sprite shader metadata.
  - `shared/src/effects/types.ts` — `EffectParamSchema`, `ShaderCategory` types.

  **Acceptance Criteria**:
  - [ ] 15 `.glsl` files exist in `sprite/`.
  - [ ] 15 `.meta.ts` files exist in `sprite/`.
  - [ ] Each `.glsl` file content matches the corresponding `SHADER_LIBRARY` entry exactly (or differs only by `#include` substitution of identical utility code).
  - [ ] Each `.meta.ts` exports a typed object matching the corresponding `SHADER_REGISTRY` entry.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: All 15 sprite shaders extracted
    Tool: Bash
    Preconditions: Wave 1 complete
    Steps:
      1. Count .glsl files in sprite/ directory
      2. Count .meta.ts files in sprite/ directory
      3. Assert both counts equal 15
      4. List filenames and verify against expected set
    Expected Result: Complete extraction with no missing shaders
    Evidence: .sisyphus/evidence/task-3-sprite-count.txt

  Scenario: GLSL content matches source
    Tool: Bash
    Preconditions: Extraction complete
    Steps:
      1. For each sprite shader, import the .glsl file as raw text
      2. Compare against the SHADER_LIBRARY[name] string value
      3. Assert exact match (or #include-only diff)
    Expected Result: Byte-identical GLSL content
    Evidence: .sisyphus/evidence/task-3-sprite-diff.txt
  ```

- [x] 4. Extract post-process shaders (21 + 1 grid) into .glsl + .meta.ts files

  **What to do**:
  - Same process as Task 3 but for the 22 post-process and utility shaders.
  - Post-process shaders: underwater, vignette, thermalVision, speedLines, shockwave, shimmer, ripple, scanlines, oldFilm, pixelateScreen, motionBlur, nightVision, fogOfWar, crt, halftone, glitch, chromaticAberration, colorGrading, blur, bloom, ascii
  - Utility shader: grid

  **Must NOT do**:
  - Same constraints as Task 3.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `effects-system`, `game-authoring/bundling-and-shaders`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: 5
  - **Blocked By**: 1, 2

  **References**:
  - `shared/src/effects/shaderLibrary.ts` lines 568-1670 — post-process shader GLSL source.
  - `shared/src/effects/shaderRegistry.ts` lines 510-1308 — post-process shader metadata.

  **Acceptance Criteria**:
  - [ ] 22 `.glsl` files exist in `post/` (21 post-process + 1 grid).
  - [ ] 22 `.meta.ts` files exist in `post/`.
  - [ ] Content matches source (same verification as Task 3).

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: All 22 post-process shaders extracted
    Tool: Bash
    Preconditions: Wave 1 complete
    Steps:
      1. Count .glsl and .meta.ts files in post/ directory
      2. Assert both counts equal 22
      3. List filenames and verify against expected set
    Expected Result: Complete extraction
    Evidence: .sisyphus/evidence/task-4-post-count.txt

  Scenario: Content parity verified
    Tool: Bash
    Preconditions: Extraction complete
    Steps:
      1. Same diff-based verification as Task 3 scenario
    Expected Result: Byte-identical content
    Evidence: .sisyphus/evidence/task-4-post-diff.txt
  ```

- [x] 5. Build barrel index, wire imports, verify snapshot parity

  **What to do**:
  - Create `shared/src/effects/shaders/index.ts` that:
    1. Imports all `.glsl` files as raw strings
    2. Imports all `.meta.ts` files
    3. Exports `SHADER_LIBRARY: Record<string, string>` with identical keys and values
    4. Exports `SHADER_REGISTRY: Record<string, ShaderLibraryEntry>` with identical entries
    5. Re-exports helper functions (`getShaderEntry`, `listShadersByCategory`, `searchShaders`, `getCombinableShaders`, `getAllShaderCategories`, `getShaderCount`, `getShaderGlsl`, `getShaderGlslStrict`, `getAvailableShaderKeys`)
  - Update `shaderLibrary.ts` and `shaderRegistry.ts` to re-export from the barrel (thin wrappers preserving the same public API) OR replace their imports throughout the codebase. Choose whichever approach touches fewer files.
  - Run snapshot parity test: programmatically verify the new barrel's `SHADER_LIBRARY` and `SHADER_REGISTRY` are structurally identical to the old monolith's.

  **Must NOT do**:
  - Do not change any consumer code behavior.
  - Do not delete the old monolith files until verification passes (Task 6 handles cleanup).

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `effects-system`, `testing-patterns`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: 6
  - **Blocked By**: 3, 4

  **References**:
  - `shared/src/effects/shaderLibrary.ts` — current export shapes to match.
  - `shared/src/effects/shaderRegistry.ts` — current export shapes to match.
  - `shared/src/effects/compiler.ts` — primary consumer of `getShaderGlsl`.
  - `shared/src/effects/index.ts` — package barrel that re-exports effects module.

  **Acceptance Criteria**:
  - [ ] `SHADER_LIBRARY` from barrel has identical keys and values to current monolith.
  - [ ] `SHADER_REGISTRY` from barrel has identical entries to current monolith.
  - [ ] All helper functions produce identical results.
  - [ ] `tsc --noEmit` passes for the shared package.
  - [ ] All existing imports resolve without errors.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Snapshot parity test passes
    Tool: Bash (Vitest)
    Preconditions: Barrel index built, all .glsl/.meta.ts files in place
    Steps:
      1. Write a test that imports both old monolith and new barrel
      2. Assert Object.keys(oldLib) deep-equals Object.keys(newLib)
      3. For each key, assert oldLib[key] === newLib[key] (string equality)
      4. Assert SHADER_REGISTRY entries are deep-equal
      5. Run test
    Expected Result: 100% parity — zero differences
    Evidence: .sisyphus/evidence/task-5-parity.txt

  Scenario: TypeScript compilation passes
    Tool: Bash
    Preconditions: All imports wired
    Steps:
      1. Run: tsc --noEmit for shared package
      2. Assert exit code 0
    Expected Result: No type errors introduced
    Evidence: .sisyphus/evidence/task-5-tsc.txt
  ```

- [ ] 6. Full verification, cleanup old monoliths, finalize

  **What to do**:
  - Run the full existing test suite for `shared/src/effects/`.
  - Run Vite build to verify bundle works.
  - Once all tests pass and parity is confirmed, **replace** the old monolith files:
    - `shaderLibrary.ts` becomes a thin re-export from the barrel (or is removed if all consumers are updated).
    - `shaderRegistry.ts` same treatment.
  - Run final `tsc --noEmit` and full test suite one more time after cleanup.
  - Assemble evidence index.

  **Must NOT do**:
  - Do not delete old files until ALL verification passes.
  - Do not claim done without command evidence.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `testing-patterns`, `verification-before-completion`, `effects-system`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential finalization
  - **Blocks**: None (but unblocks `react-bits-shader-reproduction` plan)
  - **Blocked By**: 5

  **References**:
  - `shared/src/effects/__tests__/` — existing test suite.
  - `shared/src/effects/shaderLibrary.ts` — old monolith to clean up.
  - `shared/src/effects/shaderRegistry.ts` — old monolith to clean up.

  **Acceptance Criteria**:
  - [ ] All existing tests pass with recorded output.
  - [ ] `tsc --noEmit` passes.
  - [ ] Vite build succeeds.
  - [ ] Old monolith files are either thin re-exports or removed.
  - [ ] No consumer code behavior has changed.
  - [ ] Evidence index exists: `.sisyphus/evidence/shader-infra-summary.md`.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Full test suite passes
    Tool: Bash
    Preconditions: Barrel wired, old monoliths cleaned up
    Steps:
      1. Run: pnpm test (or vitest for shared package)
      2. Assert zero failing tests
      3. Save output
    Expected Result: Clean test run
    Evidence: .sisyphus/evidence/task-6-tests.txt

  Scenario: Vite build succeeds
    Tool: Bash
    Preconditions: All cleanup complete
    Steps:
      1. Run Vite build for affected workspace
      2. Assert exit code 0
    Expected Result: Production build passes
    Evidence: .sisyphus/evidence/task-6-build.txt

  Scenario: TypeScript final check
    Tool: Bash
    Preconditions: Cleanup complete
    Steps:
      1. Run: tsc --noEmit
      2. Assert exit code 0
    Expected Result: No type errors
    Evidence: .sisyphus/evidence/task-6-tsc.txt
  ```

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `chore(effects): add vite-plugin-glsl and Metro GLSL transformer` | config files, type declarations | build passes |
| 2 | `chore(effects): create shader directory structure and shared _lib` | directory scaffold, _lib/*.glsl | directories exist |
| 3+4 | `refactor(effects): extract all shaders into .glsl + .meta.ts files` | 37 .glsl + 37 .meta.ts files | file counts match, content parity |
| 5 | `refactor(effects): wire barrel index for shader imports` | index.ts, updated imports | parity test + tsc |
| 6 | `refactor(effects): remove shader monoliths, finalize migration` | cleanup of old files | full test suite + build |

---

## Success Criteria

### Verification Commands
```bash
# File counts
ls shared/src/effects/shaders/sprite/*.glsl | wc -l  # should be 15
ls shared/src/effects/shaders/post/*.glsl | wc -l     # should be 22
ls shared/src/effects/shaders/_lib/*.glsl | wc -l      # should be >= 1

# Type check
tsc --noEmit

# Tests
pnpm test --filter shared

# Build
pnpm build --filter shared  # or relevant Vite workspace build
```

### Final Checklist
- [ ] All Must Have items satisfied
- [ ] All Must NOT Have violations absent
- [ ] 37 shaders extracted into individual files
- [ ] Barrel produces identical `SHADER_LIBRARY` and `SHADER_REGISTRY`
- [ ] `#include` works for shared utilities
- [ ] All tests pass
- [ ] TypeScript compiles cleanly
- [ ] Build succeeds
- [ ] Evidence artifacts complete
