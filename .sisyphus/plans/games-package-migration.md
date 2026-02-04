# Games Package Migration Plan: Standalone `@slopcade/games`

## Context

### User request summary
Migrate test games into a standalone workspace package `games/` (`@slopcade/games`) and fix the currently broken pieces:
- pnpm workspace registration (package resolution)
- broken `TestGameMeta` imports inside game modules
- inconsistent `metadata` exports across games
- Game Inspector MCP registry pointing to the deleted old location
- API missing `@slopcade/games` dependency
- Future-proof: allow `games/src/registry.ts` to load from `.bundle/` when present and add a bundle compilation script.

### Codebase facts (verified)
- `pnpm-workspace.yaml` currently does **not** include `games`.
- `games/package.json` exists with name `@slopcade/games`, exports `./registry` and `./*/game.ts`, but no scripts.
- `games/src/registry.ts` provides dynamic imports of `../<game>/game` and expects optional `GameModule.metadata?: { title; description? }` and optional `createLevelGame`.
- Broken type imports exist in all 6 game modules:
  - 5/6: `import type { TestGameMeta } from "../../../registry/types"`
  - 1/6: `import type { TestGameMeta } from "@/lib/registry/types"`
- `packages/game-inspector-mcp/src/registry.ts` (line ~27) points to `app/lib/test-games/games`.
- `api/src/dev/templateLoader.ts` already imports from `@slopcade/games`, but `api/package.json` is missing the dependency.

### Guardrails (scope control)
- Do **not** delete or refactor `api/scripts/sync-templates.ts`; it references `test-games.json` and an export script, but no direct path changes are required for this migration.
- Do **not** change the Cloudflare Workers runtime behavior for the API; keep API’s dynamic import loading path working.
- Bundle loading support in `@slopcade/games` must be **best-effort / Node-only** (fs-based) and must **fall back** to TS dynamic import when fs is unavailable (e.g., workers/browser runtimes).

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| 1. Register `games` workspace | None | Package resolution must work before downstream consumers can type-check/install.
| 2–7. Normalize each game module (imports + metadata + exports) | 1 | Type-checking the `@slopcade/games` package requires it to be a workspace package.
| 8. Add `@slopcade/games` dependency to API | 1 | API dependency must resolve via pnpm workspace.
| 9. Fix API dev templateLoader export mismatch (`isTestGameId`) | 8 | API must compile; routes import `isTestGameId` today.
| 10. Fix Game Inspector MCP registry path | None | Independent change; can be done in parallel.
| 11. Consumer verification (API + MCP) | 9, 10 | Requires consumer updates complete.
| 12. Add bundle loading support in `games/src/registry.ts` | 2–7 | Bundle loader should not mask basic module import problems.
| 13. Create bundle compiler script | 2–7 | Script imports/serializes game modules; needs normalized exports and metadata.
| 14. Add `compile` script to `games/package.json` | 13 | Script must exist before wiring it into package scripts.
| 15. Wave 3 verification (bundle compile + load) | 12–14 | Needs bundle load path and compile script wired.

## Parallel Execution Graph

Wave 1 (Foundation — start immediately after Task 1):
├── Task 1: Register workspace package (`pnpm-workspace.yaml`)
└── Tasks 2–7: Normalize each game module (can run in parallel per-game)

Wave 2 (Consumer Updates — after Wave 1):
├── Task 8: Add API dependency (`api/package.json`)
├── Task 9: Fix API dev templateLoader export mismatch (`api/src/dev/templateLoader.ts`)
├── Task 10: Fix MCP registry path (`packages/game-inspector-mcp/src/registry.ts`)
└── Task 11: Verify API + MCP flows (depends on 9 & 10)

Wave 3 (Bundle Support — after Wave 1, but best after Wave 2 to reduce churn):
├── Task 12: Add bundle-loading support (`games/src/registry.ts`)
├── Task 13: Add bundle compilation script (`games/scripts/compile-bundles.ts`)
├── Task 14: Wire `compile` script (`games/package.json`)
└── Task 15: Verify bundle compile + load

Critical Path: Task 1 → Tasks 2–7 → Task 8 → Task 9 → Task 11
Estimated Parallel Speedup: ~35–45% vs fully sequential

## Tasks

### Task 1: Register `games` in pnpm workspace
**Description**: Add `games` to the `packages:` list in `pnpm-workspace.yaml` so `@slopcade/games` resolves as a workspace package.

**Exact change**:
- File: `pnpm-workspace.yaml`
- Add a new entry under `packages:`:
  - `'games'`
  - Keep ordering consistent (e.g., near `app`, `api`, etc.).

**Delegation Recommendation**:
- Category: `quick` — single-file config change.
- Skills: [`git-master`] — safe small diff + verification commands.

**Skills Evaluation**:
- ✅ INCLUDED `git-master`: helps keep change atomic and verified.
- ❌ OMITTED `agent-browser`: no browser automation required.
- ❌ OMITTED `frontend-ui-ux`: no UI work.
- ❌ OMITTED `dev-browser`: no web navigation needed.
- ❌ OMITTED `typescript-programmer`: no TS code changes.
- ❌ OMITTED `python-programmer`: not relevant.
- ❌ OMITTED `svelte-programmer`: not relevant.
- ❌ OMITTED `golang-tui-programmer`: not relevant.
- ❌ OMITTED `python-debugger`: not relevant.
- ❌ OMITTED `data-scientist`: not relevant.
- ❌ OMITTED `prompt-engineer`: not relevant.

**Depends On**: None

**Parallelization**:
- Can Run In Parallel: NO (this unblocks Wave 1 per-game tasks)

**Acceptance Criteria**:
- [ ] `pnpm install` succeeds
- [ ] `pnpm list -r | grep @slopcade/games` shows `@slopcade/games`

**Wave 1 Verification (after Task 1)**:
- [ ] `pnpm install` (or `pnpm -w install`) completes cleanly

---

### Task 2: Normalize `games/ballSort/game.ts`
**Description**: Remove broken `TestGameMeta` import and add consistent module-level `metadata` export. Ensure level support works with `games/src/registry.ts` by exporting `createLevelGame`.

**Exact changes** (file: `games/ballSort/game.ts`):
- Remove: `import type { TestGameMeta } from "../../../registry/types"`
- Add near top-level:
  - `export const metadata: { title: string; description?: string } = { title: "Ball Sort", description: "Sort colored balls into tubes - each tube should contain only one color" };`
- Bridge level loading:
  - Export `createLevelGame` that maps to the existing `createBallSortGame(level)`.
  - Keep existing `export default` intact.

**Delegation Recommendation**:
- Category: `unspecified-low` — single file, but needs careful export wiring (level support).
- Skills: [`slopcade-game-engine`] — TS export hygiene + game registry conventions.

**Skills Evaluation**:
- ✅ INCLUDED `slopcade-game-engine`: understands game module shape (`default`, `metadata`, `createLevelGame`) expected by `games/src/registry.ts`.
- ❌ OMITTED `git-master`: no complex git needed (optional).
- ❌ OMITTED `agent-browser`: no browser automation.
- ❌ OMITTED `frontend-ui-ux`: no UI.
- ❌ OMITTED `dev-browser`: not needed.
- ❌ OMITTED `python-programmer`: not relevant.
- ❌ OMITTED `svelte-programmer`: not relevant.
- ❌ OMITTED `golang-tui-programmer`: not relevant.
- ❌ OMITTED `python-debugger`: not relevant.
- ❌ OMITTED `data-scientist`: not relevant.
- ❌ OMITTED `prompt-engineer`: not relevant.

**Depends On**: Task 1

**Parallelization**:
- Can Run In Parallel: YES (Wave 1)
- With: Tasks 3, 4, 5, 6, 7

**Acceptance Criteria**:
- [ ] `games/ballSort/game.ts` has **no** imports from `registry/types` or app aliases
- [ ] Exports include: `default`, `metadata`, and `createLevelGame`
- [ ] `pnpm --filter @slopcade/games tsc --noEmit` passes

---

### Task 3: Normalize `games/breakoutBouncer/game.ts`
**Description**: Remove broken `TestGameMeta` import and inline the metadata type, keeping only `{ title, description }`.

**Exact changes** (file: `games/breakoutBouncer/game.ts`):
- Remove: `import type { TestGameMeta } from "../../../registry/types"`
- Change `export const metadata: TestGameMeta = { ... }` to:
  - `export const metadata: { title: string; description?: string } = { ... }`
- Ensure the metadata object contains only `title` and `description`.

**Delegation Recommendation**:
- Category: `quick` — simple type cleanup.
- Skills: [`slopcade-game-engine`]

**Skills Evaluation**:
- ✅ INCLUDED `slopcade-game-engine`: aligns module-level `metadata` shape with `GameModule`.
- ❌ OMITTED `git-master`: optional.
- ❌ OMITTED `agent-browser`: none.
- ❌ OMITTED `frontend-ui-ux`: none.
- ❌ OMITTED `dev-browser`: none.
- ❌ OMITTED `python-programmer`: none.
- ❌ OMITTED `svelte-programmer`: none.
- ❌ OMITTED `golang-tui-programmer`: none.
- ❌ OMITTED `python-debugger`: none.
- ❌ OMITTED `data-scientist`: none.
- ❌ OMITTED `prompt-engineer`: none.

**Depends On**: Task 1

**Parallelization**:
- Can Run In Parallel: YES (Wave 1)
- With: Tasks 2, 4, 5, 6, 7

**Acceptance Criteria**:
- [ ] No `TestGameMeta` import remains
- [ ] `export const metadata` exists and matches `{ title, description? }`
- [ ] `pnpm --filter @slopcade/games tsc --noEmit` passes

---

### Task 4: Normalize `games/breakoutScripted/game.ts`
**Description**: Remove broken `TestGameMeta` import and add module-level `metadata` export.

**Exact changes** (file: `games/breakoutScripted/game.ts`):
- Remove: `import type { TestGameMeta } from "../../../registry/types"`
- Add near top-level:
  - `export const metadata: { title: string; description?: string } = { title: "Breakout (Scripted)", description: "Breakout using direct script control - paddle follows mouse" };`

**Delegation Recommendation**:
- Category: `quick`
- Skills: [`slopcade-game-engine`]

**Skills Evaluation**:
- ✅ INCLUDED `slopcade-game-engine`: ensures metadata aligns with registry conventions.
- ❌ OMITTED `git-master`: optional.
- ❌ OMITTED `agent-browser`: none.
- ❌ OMITTED `frontend-ui-ux`: none.
- ❌ OMITTED `dev-browser`: none.
- ❌ OMITTED `python-programmer`: none.
- ❌ OMITTED `svelte-programmer`: none.
- ❌ OMITTED `golang-tui-programmer`: none.
- ❌ OMITTED `python-debugger`: none.
- ❌ OMITTED `data-scientist`: none.
- ❌ OMITTED `prompt-engineer`: none.

**Depends On**: Task 1

**Parallelization**:
- Can Run In Parallel: YES (Wave 1)
- With: Tasks 2, 3, 5, 6, 7

**Acceptance Criteria**:
- [ ] `export const metadata` exists
- [ ] No `TestGameMeta` import remains
- [ ] `pnpm --filter @slopcade/games tsc --noEmit` passes

---

### Task 5: Normalize `games/flappyBird/game.ts`
**Description**: Remove broken app-alias import for `TestGameMeta` and standardize `metadata` export shape.

**Exact changes** (file: `games/flappyBird/game.ts`):
- Remove: `import type { TestGameMeta } from "@/lib/registry/types"`
- Update `export const metadata: TestGameMeta = { ... }` to:
  - `export const metadata: { title: string; description?: string } = { title: "Flappy Bird", description: "Tap to fly through the pipes without hitting them" };`
- Remove non-supported fields from module-level metadata export (e.g., `status`) to match registry’s `metadata` type.

**Delegation Recommendation**:
- Category: `quick`
- Skills: [`slopcade-game-engine`]

**Skills Evaluation**:
- ✅ INCLUDED `slopcade-game-engine`: ensures the alias removal + metadata normalization match package conventions.
- ❌ OMITTED `git-master`: optional.
- ❌ OMITTED `agent-browser`: none.
- ❌ OMITTED `frontend-ui-ux`: none.
- ❌ OMITTED `dev-browser`: none.
- ❌ OMITTED `python-programmer`: none.
- ❌ OMITTED `svelte-programmer`: none.
- ❌ OMITTED `golang-tui-programmer`: none.
- ❌ OMITTED `python-debugger`: none.
- ❌ OMITTED `data-scientist`: none.
- ❌ OMITTED `prompt-engineer`: none.

**Depends On**: Task 1

**Parallelization**:
- Can Run In Parallel: YES (Wave 1)
- With: Tasks 2, 3, 4, 6, 7

**Acceptance Criteria**:
- [ ] No `@/lib/...` imports remain in this game module
- [ ] `metadata` export is `{ title, description? }` only
- [ ] `pnpm --filter @slopcade/games tsc --noEmit` passes

---

### Task 6: Normalize `games/gemCrush/game.ts`
**Description**: Remove broken `TestGameMeta` import and add module-level `metadata` export.

**Exact changes** (file: `games/gemCrush/game.ts`):
- Remove: `import type { TestGameMeta } from "../../../registry/types"`
- Add near top-level:
  - `export const metadata: { title: string; description?: string } = { title: "Gem Crush", description: "Match 3 or more gems to clear them!" };`

**Delegation Recommendation**:
- Category: `quick`
- Skills: [`slopcade-game-engine`]

**Skills Evaluation**:
- ✅ INCLUDED `slopcade-game-engine`
- ❌ OMITTED `git-master`: optional.
- ❌ OMITTED `agent-browser`: none.
- ❌ OMITTED `frontend-ui-ux`: none.
- ❌ OMITTED `dev-browser`: none.
- ❌ OMITTED `python-programmer`: none.
- ❌ OMITTED `svelte-programmer`: none.
- ❌ OMITTED `golang-tui-programmer`: none.
- ❌ OMITTED `python-debugger`: none.
- ❌ OMITTED `data-scientist`: none.
- ❌ OMITTED `prompt-engineer`: none.

**Depends On**: Task 1

**Parallelization**:
- Can Run In Parallel: YES (Wave 1)
- With: Tasks 2, 3, 4, 5, 7

**Acceptance Criteria**:
- [ ] `export const metadata` exists
- [ ] No `TestGameMeta` import remains
- [ ] `pnpm --filter @slopcade/games tsc --noEmit` passes

---

### Task 7: Normalize `games/slopeggle/game.ts`
**Description**: Remove broken `TestGameMeta` import and inline metadata type.

**Exact changes** (file: `games/slopeggle/game.ts`):
- Remove: `import type { TestGameMeta } from "../../../registry/types"`
- Change `export const metadata: TestGameMeta = { ... }` to:
  - `export const metadata: { title: string; description?: string } = { ... }`

**Delegation Recommendation**:
- Category: `quick`
- Skills: [`slopcade-game-engine`]

**Skills Evaluation**:
- ✅ INCLUDED `slopcade-game-engine`
- ❌ OMITTED `git-master`: optional.
- ❌ OMITTED `agent-browser`: none.
- ❌ OMITTED `frontend-ui-ux`: none.
- ❌ OMITTED `dev-browser`: none.
- ❌ OMITTED `python-programmer`: none.
- ❌ OMITTED `svelte-programmer`: none.
- ❌ OMITTED `golang-tui-programmer`: none.
- ❌ OMITTED `python-debugger`: none.
- ❌ OMITTED `data-scientist`: none.
- ❌ OMITTED `prompt-engineer`: none.

**Depends On**: Task 1

**Parallelization**:
- Can Run In Parallel: YES (Wave 1)
- With: Tasks 2, 3, 4, 5, 6

**Acceptance Criteria**:
- [ ] No `TestGameMeta` import remains
- [ ] `metadata` export is `{ title, description? }`
- [ ] `pnpm --filter @slopcade/games tsc --noEmit` passes

---

### Wave 1 Verification (after Tasks 1–7)
- [ ] `pnpm install`
- [ ] `pnpm --filter @slopcade/games tsc --noEmit`
- [ ] `grep -r "app/lib/test-games" --include="*.ts" . | grep -v node_modules` returns empty

---

### Task 8: Add `@slopcade/games` dependency to API
**Description**: Ensure API workspace explicitly depends on the games package.

**Exact change**:
- File: `api/package.json`
- Add under `dependencies`:
  - `"@slopcade/games": "workspace:*"`

**Delegation Recommendation**:
- Category: `quick`
- Skills: [`git-master`] — dependency hygiene + verification.

**Skills Evaluation**:
- ✅ INCLUDED `git-master`: safe dependency edit + verify lock/workspace.
- ❌ OMITTED `typescript-programmer`: no TS change needed.
- ❌ OMITTED `agent-browser`: none.
- ❌ OMITTED `frontend-ui-ux`: none.
- ❌ OMITTED `dev-browser`: none.
- ❌ OMITTED `python-programmer`: none.
- ❌ OMITTED `svelte-programmer`: none.
- ❌ OMITTED `golang-tui-programmer`: none.
- ❌ OMITTED `python-debugger`: none.
- ❌ OMITTED `data-scientist`: none.
- ❌ OMITTED `prompt-engineer`: none.

**Depends On**: Task 1

**Parallelization**:
- Can Run In Parallel: YES (Wave 2)
- With: Task 10

**Acceptance Criteria**:
- [ ] `pnpm install` succeeds
- [ ] `pnpm --filter @slopcade/api tsc --noEmit` passes

---

### Task 9: Fix API dev templateLoader export mismatch (`isTestGameId`)
**Description**: `api/src/trpc/routes/games.ts` imports `isTestGameId` from `@/dev/templateLoader`, but `api/src/dev/templateLoader.ts` currently exports `isValidGameId` and `TEST_GAME_IDS` only. Align exports so API compiles.

**Exact changes**:
- File: `api/src/dev/templateLoader.ts`
- Ensure it exports:
  - `export { GAME_IDS as TEST_GAME_IDS }` (already present)
  - `export function isTestGameId(id: string): boolean` that delegates to `isValidGameId(id)`
  - Keep `getTestGameAsync()` unchanged.

**Delegation Recommendation**:
- Category: `quick` — tiny TS export fix.
- Skills: [`slopcade-game-engine`]

**Skills Evaluation**:
- ✅ INCLUDED `slopcade-game-engine`: understands the dev-template loading flow and required exports.
- ❌ OMITTED `git-master`: optional.
- ❌ OMITTED `agent-browser`: none.
- ❌ OMITTED `frontend-ui-ux`: none.
- ❌ OMITTED `dev-browser`: none.
- ❌ OMITTED `python-programmer`: none.
- ❌ OMITTED `svelte-programmer`: none.
- ❌ OMITTED `golang-tui-programmer`: none.
- ❌ OMITTED `python-debugger`: none.
- ❌ OMITTED `data-scientist`: none.
- ❌ OMITTED `prompt-engineer`: none.

**Depends On**: Task 8

**Parallelization**:
- Can Run In Parallel: YES (Wave 2)
- With: Task 10 (after Task 8)

**Acceptance Criteria**:
- [ ] `api/src/dev/templateLoader.ts` exports `isTestGameId`
- [ ] `pnpm --filter @slopcade/api tsc --noEmit` passes

---

### Task 10: Fix Game Inspector MCP discovery path
**Description**: Update MCP registry to discover games from `PROJECT_ROOT/games`.

**Exact change**:
- File: `packages/game-inspector-mcp/src/registry.ts`
- Update line ~27:
  - From: `join(PROJECT_ROOT, "app/lib/test-games/games")`
  - To: `join(PROJECT_ROOT, "games")`

**Delegation Recommendation**:
- Category: `quick`
- Skills: [`slopcade-game-engine`]

**Skills Evaluation**:
- ✅ INCLUDED `slopcade-game-engine`: understands game discovery conventions and expected file layout.
- ❌ OMITTED `git-master`: optional.
- ❌ OMITTED `agent-browser`: not needed for this code change.
- ❌ OMITTED `frontend-ui-ux`: none.
- ❌ OMITTED `dev-browser`: none.
- ❌ OMITTED `python-programmer`: none.
- ❌ OMITTED `svelte-programmer`: none.
- ❌ OMITTED `golang-tui-programmer`: none.
- ❌ OMITTED `python-debugger`: none.
- ❌ OMITTED `data-scientist`: none.
- ❌ OMITTED `prompt-engineer`: none.

**Depends On**: None

**Parallelization**:
- Can Run In Parallel: YES (Wave 2)
- With: Task 8

**Acceptance Criteria**:
- [ ] Grep shows no remaining `app/lib/test-games/games` in MCP package
- [ ] MCP `discoverTestGames()` returns all directories that contain `games/<id>/game.ts`

---

### Task 11: Consumer verification (API + MCP)
**Description**: Verify consumers compile and can enumerate/load games.

**What to do**:
- Type-check:
  - `pnpm --filter @slopcade/api tsc --noEmit`
- Validate API template route via running API (dev):
  - Start service: `pnpm dev:api` (via devmux)
  - Verify endpoint:
    - `curl http://localhost:8789/test-games`
    - Expect: 200 + list that includes the 6 game IDs.
- MCP smoke:
  - Run MCP registry listing command(s) used by the Game Inspector toolchain (project-specific).

**Delegation Recommendation**:
- Category: `unspecified-low` — involves running services + smoke checks.
- Skills: [`dev-browser`, `agent-browser`] — if verification needs browser-based Game Inspector checks.

**Skills Evaluation**:
- ✅ INCLUDED `dev-browser`: persistent browser checks if needed.
- ✅ INCLUDED `agent-browser`: automate clicks/smoke if Game Inspector UI is involved.
- ❌ OMITTED `git-master`: not core to verification.
- ❌ OMITTED `frontend-ui-ux`: none.
- ❌ OMITTED `typescript-programmer`: verification-only.
- ❌ OMITTED `python-programmer`: none.
- ❌ OMITTED `svelte-programmer`: none.
- ❌ OMITTED `golang-tui-programmer`: none.
- ❌ OMITTED `python-debugger`: none.
- ❌ OMITTED `data-scientist`: none.
- ❌ OMITTED `prompt-engineer`: none.

**Depends On**: Tasks 9, 10

**Parallelization**:
- Can Run In Parallel: NO (verification step)

**Acceptance Criteria**:
- [ ] `pnpm --filter @slopcade/api tsc --noEmit` passes
- [ ] `curl http://localhost:8789/test-games` returns successfully
- [ ] MCP discovery does not log “Games directory not found” for `PROJECT_ROOT/games`

---

### Wave 2 Verification (after Tasks 8–10)
- [ ] `pnpm --filter @slopcade/api tsc --noEmit`
- [ ] `curl http://localhost:8789/test-games` includes: `ballSort`, `breakoutBouncer`, `breakoutScripted`, `flappyBird`, `gemCrush`, `slopeggle`

---

### Task 12: Add bundle loading support to `@slopcade/games` registry
**Description**: In `games/src/registry.ts`, prefer a precompiled bundle when `.bundle/manifest.json` and `.bundle/game.json` exist inside `games/<id>/.bundle/`, otherwise fall back to existing TS dynamic imports.

**Exact changes** (file: `games/src/registry.ts`):
- Add a `tryLoadBundledGame(id, level?)` path that:
  - Only runs in Node-like environments (guard with `typeof process !== 'undefined' && !!process.versions?.node`).
  - Uses dynamic `import('node:fs')` + `import('node:path')` to avoid bundler hard dependencies.
  - Reads:
    - `games/<id>/.bundle/manifest.json` for metadata
    - `games/<id>/.bundle/game.json` for the `GameDefinition`
  - Returns a `GameEntry` using manifest title/description.
- Update `loadGame(id, level?)` to:
  1) Attempt `tryLoadBundledGame(id, level)`
  2) If null → existing module dynamic import path

**Important edge cases / rules**:
- If `level` is provided and the bundled format does not support levels, fall back to TS module loading (to keep Ball Sort level support working).
- If bundle read/parse fails, log once and fall back (do not crash).

**Delegation Recommendation**:
- Category: `unspecified-low` — careful runtime-guarded fs usage.
- Skills: [`slopcade-game-engine`] — safe dynamic imports/types + familiarity with existing shared bundle conventions.

**Skills Evaluation**:
- ✅ INCLUDED `slopcade-game-engine`: aligns bundle loading behavior with existing `shared/src/bundle/*` conventions and game registry expectations.
- ❌ OMITTED `git-master`: optional.
- ❌ OMITTED `agent-browser`: none.
- ❌ OMITTED `frontend-ui-ux`: none.
- ❌ OMITTED `dev-browser`: none.
- ❌ OMITTED `python-programmer`: none.
- ❌ OMITTED `svelte-programmer`: none.
- ❌ OMITTED `golang-tui-programmer`: none.
- ❌ OMITTED `python-debugger`: none.
- ❌ OMITTED `data-scientist`: none.
- ❌ OMITTED `prompt-engineer`: none.

**Depends On**: Tasks 2–7

**Parallelization**:
- Can Run In Parallel: YES (Wave 3)
- With: Tasks 13, 14

**Acceptance Criteria**:
- [ ] `pnpm --filter @slopcade/games tsc --noEmit` passes
- [ ] In Node runtime, if `.bundle/game.json` exists for a game, `loadGame(id)` returns successfully without importing TS module
- [ ] In non-Node runtime (or if bundle missing), TS dynamic import behavior is unchanged

---

### Task 13: Create bundle compilation script
**Description**: Create a Node script to generate per-game bundles as:
```
games/<id>/.bundle/
  manifest.json
  game.json
```

**Exact changes**:
- Create: `games/scripts/compile-bundles.ts`
- Behavior:
  - Enumerate game IDs from `games/src/registry.ts` (or hardcode the same list to avoid circular import).
  - For each id:
    - Dynamically import the TS module `../<id>/game`.
    - Extract:
      - `definition` from `default`
      - module-level `metadata` export (preferred), else `definition.metadata.title/description`.
    - Write `.bundle/manifest.json` (title/description/id/version fields).
    - Write `.bundle/game.json` = JSON serialized `GameDefinition`.
  - Allow a `--clean` option to remove existing `.bundle` directories before regenerating (optional but recommended).

**Delegation Recommendation**:
- Category: `unspecified-low` — new script + file IO.
- Skills: [`slopcade-game-engine`] — TS + Node ESM + game definition serialization awareness.

**Skills Evaluation**:
- ✅ INCLUDED `slopcade-game-engine`
- ❌ OMITTED `git-master`: optional.
- ❌ OMITTED `agent-browser`: none.
- ❌ OMITTED `frontend-ui-ux`: none.
- ❌ OMITTED `dev-browser`: none.
- ❌ OMITTED `python-programmer`: none.
- ❌ OMITTED `svelte-programmer`: none.
- ❌ OMITTED `golang-tui-programmer`: none.
- ❌ OMITTED `python-debugger`: none.
- ❌ OMITTED `data-scientist`: none.
- ❌ OMITTED `prompt-engineer`: none.

**Depends On**: Tasks 2–7

**Parallelization**:
- Can Run In Parallel: YES (Wave 3)
- With: Task 12

**Acceptance Criteria**:
- [ ] Script runs end-to-end without throwing
- [ ] For each game id, `.bundle/manifest.json` and `.bundle/game.json` are created

---

### Task 14: Add `compile` script to `games/package.json`
**Description**: Add a `compile` script entry and ensure required dev deps are available.

**Exact changes** (file: `games/package.json`):
- Add:
  - `"scripts": { "compile": "tsx scripts/compile-bundles.ts" }`
- If execution fails due to missing `tsx` in package scope, add to `devDependencies`:
  - `"tsx": "workspace:*"` (or a pinned version matching root)

**Delegation Recommendation**:
- Category: `quick`
- Skills: [`git-master`]

**Skills Evaluation**:
- ✅ INCLUDED `git-master`
- ❌ OMITTED `typescript-programmer`: json edit only.
- ❌ OMITTED `agent-browser`: none.
- ❌ OMITTED `frontend-ui-ux`: none.
- ❌ OMITTED `dev-browser`: none.
- ❌ OMITTED `python-programmer`: none.
- ❌ OMITTED `svelte-programmer`: none.
- ❌ OMITTED `golang-tui-programmer`: none.
- ❌ OMITTED `python-debugger`: none.
- ❌ OMITTED `data-scientist`: none.
- ❌ OMITTED `prompt-engineer`: none.

**Depends On**: Task 13

**Parallelization**:
- Can Run In Parallel: NO (blocks on Task 13 existing)

**Acceptance Criteria**:
- [ ] `pnpm --filter @slopcade/games compile` runs successfully

---

### Task 15: Wave 3 verification (bundle compile + bundle load)
**Description**: Validate that bundles can be compiled and that registry prefers bundles in Node.

**What to do**:
- Generate bundles:
  - `pnpm --filter @slopcade/games compile`
- Verify `@slopcade/games` type-check still passes:
  - `pnpm --filter @slopcade/games tsc --noEmit`
- Bundle-load smoke (Node):
  - Run a small `tsx` one-liner that imports `loadGame` and calls `await loadGame('breakoutBouncer')`.

**Delegation Recommendation**:
- Category: `unspecified-low`
- Skills: [`slopcade-game-engine`]

**Skills Evaluation**:
- ✅ INCLUDED `slopcade-game-engine`
- ❌ OMITTED `git-master`: optional.
- ❌ OMITTED `agent-browser`: none.
- ❌ OMITTED `frontend-ui-ux`: none.
- ❌ OMITTED `dev-browser`: none.
- ❌ OMITTED `python-programmer`: none.
- ❌ OMITTED `svelte-programmer`: none.
- ❌ OMITTED `golang-tui-programmer`: none.
- ❌ OMITTED `python-debugger`: none.
- ❌ OMITTED `data-scientist`: none.
- ❌ OMITTED `prompt-engineer`: none.

**Depends On**: Tasks 12–14

**Parallelization**:
- Can Run In Parallel: NO (verification step)

**Acceptance Criteria**:
- [ ] Bundles exist on disk under `games/*/.bundle/`
- [ ] `loadGame(id)` succeeds when bundle exists (Node)

## Commit Strategy

Make atomic commits per wave:

1) `fix(workspace): register games package`  
   - Files: `pnpm-workspace.yaml`

2) `fix(games): normalize game module metadata exports`  
   - Files: `games/*/game.ts`

3) `fix(mcp): discover games from top-level games dir`  
   - Files: `packages/game-inspector-mcp/src/registry.ts`

4) `fix(api): add @slopcade/games workspace dependency`  
   - Files: `api/package.json`

5) `feat(games): add bundle loading and compile script`  
   - Files: `games/src/registry.ts`, `games/scripts/compile-bundles.ts`, `games/package.json`

## Success Criteria

Final verification commands:
```bash
# 1. Package registration
pnpm install
pnpm list -r | grep @slopcade/games

# 2. TypeScript compilation
pnpm --filter @slopcade/games tsc --noEmit
pnpm --filter @slopcade/api tsc --noEmit

# 3. No old references
grep -r "app/lib/test-games" --include="*.ts" . | grep -v node_modules

# 4. API serves games (after starting api)
curl http://localhost:8789/test-games
```
