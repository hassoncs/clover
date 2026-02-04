# Game Pipeline Verification — `physicsDrop` + `physicsDropBundle`

## TL;DR

Create **two minimal “cube falls onto floor” test games** to validate the full pipeline end-to-end:

- **TypeScript test game**: `physicsDrop` (standard `game.ts` GameDefinition).
- **Bundle-only test game**: `physicsDropBundle` (pre-bundled `.bundle/` JSON + `scripts/game.js`).

Add **shared vitest coverage** proving the bundle compiler can compile both:

1) a **virtual/in-memory** physics-drop bundle, and
2) the **on-disk** `physicsDropBundle/.bundle` directory.

Finally, regenerate the registry and verify both games load in the **test-games UI**.

**Estimated effort**: Short

---

## Context

### Original Request
Create two simple test games to verify the complete game pipeline works end-to-end:

1. **TypeScript Test Game** (`physicsDrop`) — minimal physics drop with an image-based cube template (`visual.type: "image"`) using `whatDescription`.
2. **Bundled JavaScript Test Game** (`physicsDropBundle`) — same scenario as a pre-bundled `.bundle/` directory with `scripts/game.js` exporting `exports.onStart`.

Both should validate:
- Bundling works (virtual bundle compiler + real bundle directory)
- Asset system integration signals exist (`whatDescription` + `visual.type: image`)
- Games can be loaded and run in the test-games UI

### Key Codebase References

- TypeScript test game pattern:
  - `app/lib/test-games/games/breakoutScripted/game.ts` — GameDefinition structure, template fields like `whatDescription`, `visual.type: "image"`.

- Bundle compiler + virtual file reader:
  - `shared/src/bundle/compiler.ts` — `compileBundle(bundlePath, { fileReader })`.
  - `shared/src/bundle/FileReader.ts` — `VirtualFileReader` requires an **absolute** bundle root; keys in the `files` map are **relative** paths.
  - `shared/src/bundle/__tests__/virtual-bundle-integration.test.ts` — idioms for `VirtualFileReader` bundles and assertions.

- Existing bundle-only test game format (legacy `.bundle/`):
  - `app/lib/test-games/games/ballSortScripted/.bundle/*` — manifest/templates/entities/rules/scripts file layout.

- Registry generation (auto-discovers test games + bundles):
  - `app/scripts/generate-registry.mjs` — `supportBundles: true`, `.bundle/` recognized.
  - Root scripts: `pnpm registry` / `pnpm registry:check`.

---

## Scope

### IN
- New game definition at `app/lib/test-games/games/physicsDrop/game.ts`.
- New bundle-only game at `app/lib/test-games/games/physicsDropBundle/.bundle/` (minimal required files).
- New shared tests at `shared/src/bundle/__tests__/physics-drop.test.ts`.
- Registry regeneration so both games show up in the UI.
- Manual UI verification steps for both games.

### OUT (Guardrails)
- No new dependencies.
- No engine changes; if something fails, fix inputs (bundle contents / game definitions / tests) first.
- Keep gameplay minimal: **only** cube + floor + gravity; no extra UI, rules, or behaviors.

---

## Verification Strategy

### Automated
- **Vitest** in `@slopcade/shared`:
  - Add a new test file that:
    1) Compiles a **virtual** bundle representing the physics drop scenario.
    2) Compiles the **real on-disk** bundle directory for `physicsDropBundle`.

### Manual (UI)
- Run dev server and load both games via `/test-games/[id]` routes.
- Observe cube falling due to gravity and coming to rest on floor.

---

## TODOs

> Each checkbox is intended to be **one atomic delegation unit** (one clear change set + verification).

- [ ] 1) Add TypeScript test game: `physicsDrop`

  **What to do**:
  - Create `app/lib/test-games/games/physicsDrop/game.ts` exporting a minimal `GameDefinition`.
  - Include:
    - `world.gravity` set so the cube falls (match existing conventions; default recommendation: `{ x: 0, y: -10 }`).
    - `cube` template:
      - `visual.type: "image"` + `imageWidth/imageHeight`.
      - `whatDescription` present (asset generation signal).
      - physics: `bodyType: "dynamic"`, density > 0.
      - collider: `box` matching size.
    - `floor` template:
      - `visual.type: "rect"`.
      - physics: `bodyType: "static"`.
      - collider: `box` spanning the world width.
    - Two entities: floor near bottom, cube above it.

  **Files**:
  - Create: `app/lib/test-games/games/physicsDrop/game.ts`

  **Acceptance criteria**:
  - Type-checkable (no TS errors).
  - Cube template includes `whatDescription` and `visual.type: "image"`.
  - Floor is static; cube is dynamic.

  **Recommended agent category**: `quick`

---

- [ ] 2) Create bundle-only game skeleton: `physicsDropBundle/.bundle/manifest.json`

  **What to do**:
  - Create a minimal manifest including `name`, `version`, and `title`.
  - Include `world` config in manifest so runtime behavior matches `physicsDrop` (gravity, pixelsPerMeter, bounds).

  **Files**:
  - Create: `app/lib/test-games/games/physicsDropBundle/.bundle/manifest.json`

  **Acceptance criteria**:
  - `manifest.json` parses.
  - Includes `name: "test-physics-drop-bundle"` (or similar unique id) and `title`.
  - Includes `world.gravity` and `world.bounds`.

  **Recommended agent category**: `quick`

---

- [ ] 3) Add bundled templates for cube + floor

  **What to do**:
  - Create `templates/templates.json` with two templates:
    - `cube`: `whatDescription` + `visual.type: "image"` + physics/collider.
    - `floor`: `visual.type: "rect"` + static physics/collider.

  **Files**:
  - Create: `app/lib/test-games/games/physicsDropBundle/.bundle/templates/templates.json`

  **Acceptance criteria**:
  - `compileBundle(<bundlePath>)` succeeds once the rest of the bundle files exist.
  - `gameDefinition.templates.cube.whatDescription` exists.
  - `gameDefinition.templates.cube.visual.type === "image"`.

  **Recommended agent category**: `quick`

---

- [ ] 4) Add bundled initial entities (cube starts above floor)

  **What to do**:
  - Create `entities/initial.json` with:
    - `floor` at bottom.
    - `cube` above it.
  - Ensure `template` refs match template IDs.

  **Files**:
  - Create: `app/lib/test-games/games/physicsDropBundle/.bundle/entities/initial.json`

  **Acceptance criteria**:
  - No `UNKNOWN_TEMPLATE` errors from compiler.
  - Entity IDs are unique.

  **Recommended agent category**: `quick`

---

- [ ] 5) Add bundled rules stub (empty)

  **What to do**:
  - Create empty array rules file.

  **Files**:
  - Create: `app/lib/test-games/games/physicsDropBundle/.bundle/rules/gameplay.json`

  **Acceptance criteria**:
  - `compileBundle` accepts the file.

  **Recommended agent category**: `quick`

---

- [ ] 6) Add bundled script: `scripts/game.js` with `exports.onStart`

  **What to do**:
  - Create `scripts/game.js` containing at least one `exports.<name> = ...`.
  - Required: `exports.onStart = function(ctx) { console.log("Game started"); }`.

  **Files**:
  - Create: `app/lib/test-games/games/physicsDropBundle/.bundle/scripts/game.js`

  **Acceptance criteria**:
  - `compileBundle` succeeds (no `SCRIPT_SYNTAX_ERROR`).
  - `result.gameDefinition.script` contains an `// --- game ---` block and `exports.onStart`.

  **Recommended agent category**: `quick`

---

- [ ] 7) Add minimal `assets.json` (explicitly empty object) for bundle game

  **What to do**:
  - Create `assets.json` as `{}` (or omit entirely if compiler + UI don’t require it; prefer explicit empty file for pipeline clarity).

  **Files**:
  - Create: `app/lib/test-games/games/physicsDropBundle/.bundle/assets.json`

  **Acceptance criteria**:
  - `compileBundle` still succeeds.

  **Recommended agent category**: `quick`

---

- [ ] 8) Add shared bundle-compiler tests: virtual bundle + on-disk bundle

  **What to do**:
  - Create `shared/src/bundle/__tests__/physics-drop.test.ts`.
  - Test A: **virtual** bundle in memory using `VirtualFileReader` + a `Map<string,string>` including:
    - `manifest.json` (with world.gravity)
    - `templates/templates.json` (cube + floor, with `whatDescription` on cube)
    - `entities/initial.json`
    - `rules/gameplay.json` (empty)
    - `scripts/game.js` with `exports.onStart`
  - Test B: compile the **real** on-disk bundle directory:
    - Resolve repo root via `path.resolve(__dirname, '../../../..')` (see note below), then point to:
      `app/lib/test-games/games/physicsDropBundle/.bundle`
    - Call `compileBundle(bundlePath)` using default `NodeFileReader`.
  - Assertions for both tests:
    - `result.success === true`
    - `result.errors.length === 0`
    - `gameDefinition.metadata.id` matches manifest name
    - `gameDefinition.world.gravity` matches expected
    - `gameDefinition.templates.cube.visual.type === 'image'`
    - `gameDefinition.templates.cube.whatDescription` is present
    - `gameDefinition.entities` includes both `cube` and `floor`

  **Files**:
  - Create: `shared/src/bundle/__tests__/physics-drop.test.ts`

  **Acceptance criteria**:
  - `pnpm --filter @slopcade/shared test` → PASS.
  - The new test file executes both compile paths (virtual + on-disk) and asserts key fields.

  **Recommended agent category**: `unspecified-high`
  - Rationale: cross-package path correctness + compiler expectations.

---

- [ ] 9) Regenerate registry and confirm both games are discoverable

  **What to do**:
  - Run registry generation.
  - Confirm `physicsDrop` and `physicsDropBundle` appear in the test game registry output.

  **Files (expected to change via generator)**:
  - Modify (generated): `app/lib/registry/generated/testGames.ts`
  - Modify (generated): `api/dev-test-games.json`

  **Acceptance criteria**:
  - `pnpm registry:check` succeeds after generation.
  - `app/lib/registry/generated/testGames.ts` includes IDs:
    - `"physicsDrop"`
    - `"physicsDropBundle"`

  **Recommended agent category**: `quick`

---

- [ ] 10) Manual UI verification: both games load and run

  **What to do**:
  - Start dev servers via DevMux (`pnpm dev`).
  - In the app UI, navigate to:
    - `/test-games/physicsDrop`
    - `/test-games/physicsDropBundle`
  - Verify in both:
    - Cube spawns above floor.
    - Cube falls due to gravity.
    - Cube collides with floor and comes to rest (no tunneling through floor).
    - Cube uses an **image visual** (may be placeholder if assets aren’t generated yet; the key is that the template uses `visual.type: "image"` + `whatDescription`).

  **Acceptance criteria**:
  - Both routes load without runtime errors.
  - Visual/physics behavior matches the scenario.
  - Capture evidence:
    - Save screenshots to: `.sisyphus/evidence/game-pipeline-verification/{gameId}.png`

  **Recommended agent category**: `visual-engineering`

---

## Notes / Implementation Guidance (for executors)

- **Bundle paths in shared tests**: `__dirname` in `shared/src/bundle/__tests__` is 4 levels below repo root.
  - Repo root = `path.resolve(__dirname, '../../../..')`
  - Bundle dir = `path.resolve(repoRoot, 'app/lib/test-games/games/physicsDropBundle/.bundle')`

- **VirtualFileReader**:
  - `new VirtualFileReader('/virtual/test', files)` expects `/virtual/test` to be absolute.
  - Map keys must be **relative paths** like `manifest.json`, `templates/templates.json`, etc.

- **Script validation**: bundle scripts must contain at least one `exports.<name> = ...` assignment or compilation fails.

---

## Suggested Delegation Order

1. Tasks 2–7 (bundle files) → ensures on-disk bundle compiles.
2. Task 8 (shared tests) → locks in compiler expectations.
3. Task 1 (TS game) → standard GameDefinition path.
4. Task 9 (registry) → makes games show in UI.
5. Task 10 (manual UI) → end-to-end validation.
