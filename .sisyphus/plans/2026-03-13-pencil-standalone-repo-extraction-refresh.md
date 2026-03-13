# Pencil Standalone Repo Extraction Refresh

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Move Pencil out of the Slopcade monorepo into its own standalone repository named `pencil`, while keeping Slopcade as a consumer through explicit libraries and a thin adapter layer.

**Architecture:** Pencil already has the right directional seams: `pencil-core`, `pencil-server`, a documented local-first project/session model, and a documented anti-corruption boundary for Slopcade-specific storage. The missing step is to finish dependency inversion, move Pencil-owned packages into a standalone monorepo, and make Slopcade consume them through published or explicitly versioned packages instead of workspace-internal imports.

**Tech Stack:** pnpm monorepo, TypeScript, Expo/React Native, Skia, tRPC adapters where needed, private package publishing or tarball-based prerelease distribution, git history preservation via `git filter-repo`.

---

## Current Reality Check

This is the verified current state in `slopcade`:

- `apps/pencil` is still the canonical Pencil app: `apps/pencil/package.json`
- Pencil-specific packages already exist:
  - `packages/pencil-core/package.json`
  - `packages/pencil-server/package.json`
- Pencil is still hosted by the Slopcade monorepo root scripts and service topology:
  - `slopcade/package.json` includes `dev:pencil`, `web:pencil`, `ios:pencil`, `android:pencil`
- Pencil still has transitional Slopcade coupling:
  - `apps/pencil/lib/adapters/slopcade-store-adapter.ts` imports `@slopcade/api/trpc` and calls `chatThreads.*`
  - `apps/pencil/lib/pencilEmbed.ts` still supports `workspace:${gameId}` and `gameId`
  - `apps/pencil/lib/usePencilDocumentSync.ts` still carries `gameId` through sync identity
- Existing docs already describe the intended standalone direction:
  - `docs/pencil/architecture-boundaries.md`
  - `docs/pencil/deprecation-path.md`
  - `docs/pencil/api-runway.md`
  - `docs/pencil/session-registry-model.md`
  - `docs/pencil/project-folder-layout.md`
- Existing plans already anticipated this repo split:
  - `.sisyphus/plans/pencil-standalone-extraction.md`
  - `.sisyphus/plans/pencil-local-first-split.md`

Conclusion: the architecture migration happened inside Slopcade, but the final extraction into a standalone `pencil` repository has not happened yet.

---

## Target End State

Create a new standalone repo at:

- `/Users/hassoncs/Workspaces/personal/pencil`

Repo root requirements:

- root `.projectrc`:

```toml
name = "pencil"
emoji = "✏️"
group = "apps"
```

- standalone pnpm workspace
- its own git history
- its own CI/build scripts
- no compile-time dependency on `@slopcade/api`
- no canonical identity based on `gameId` or `workspace:${gameId}`

Steady-state package ownership:

- Pencil repo owns:
  - `apps/pencil`
  - `packages/pencil-core`
  - `packages/pencil-server`
  - `packages/design-canvas`
  - new protocol/contracts package for pen schema and session/file/store contracts
- Slopcade repo keeps:
  - Slopcade-specific adapter(s) that talk to `chatThreads.*`
  - consumer wiring for embedding/launching Pencil from Slopcade product surfaces

---

## Future Package Map

### Pencil Repo Packages

- `apps/pencil`
  - standalone app shell and runtime
  - no Slopcade-specific persistence assumptions
- `packages/protocol`
  - pen schema, parser, document/session/store contracts
  - source of truth for `PenDocument`-style types
- `packages/design-canvas`
  - Skia canvas runtime and rendering primitives
  - Pencil-owned, not Slopcade-owned
- `packages/pencil-core`
  - local-first session, project-folder, runtime-route, store abstractions
- `packages/pencil-server`
  - local daemon/session registry and MCP/session server

### Slopcade Repo Packages

- `packages/pencil-slopcade-adapter` or equivalent Slopcade-local module
  - implements Pencil-owned store/contracts using `chatThreads.readWorkspaceFile`, `writeWorkspaceFile`, and `listWorkspaceFiles`
  - only place where `gameId` remains during migration

---

## Recommended Distribution Strategy

### Steady State

- Pencil publishes versioned packages consumed by Slopcade:
  - `@pencil/protocol`
  - `@pencil/design-canvas`
  - `@pencil/core`
  - optional `@pencil/client` if app-facing shared hooks remain reusable
- Prefer explicit package consumption over git submodules.

### Local Dual-Repo Development

- Do not commit cross-repo `link:` dependencies.
- Use a developer-only sync flow for prerelease testing:
  1. build the changed package(s) in `pencil`
  2. `pnpm pack` the changed package(s)
  3. install tarballs into Slopcade for integration verification
- Once the split stabilizes, replace tarball testing with private registry prereleases.

This keeps committed manifests clean while still allowing local iteration across both repos.

---

## Task Dependency Graph

- T1 -> T2, T3, T4
- T2 -> T3, T5, T6, T7
- T3 -> T4, T7, T9
- T4 -> T7, T8, T9
- T5 -> T7, T9
- T6 -> T7, T8
- T7 -> T8, T9, T10
- T8 -> T9, T10
- T9 -> T10

Critical path:

- T1 -> T2 -> T3 -> T4 -> T7 -> T8 -> T9 -> T10

---

## Parallel Execution Graph

Wave 1:

- T1 Freeze ownership boundary in Slopcade
- T5 Re-home `design-canvas` under Pencil ownership discovery and prep work

Wave 2:

- T2 Create Pencil-owned protocol package
- T6 Create standalone `pencil` repository skeleton

Wave 3:

- T3 Remove compile-time Slopcade API coupling
- T4 Make session/file identity canonical

Wave 4:

- T7 Extract code into the new repo with preserved history

Wave 5:

- T8 Stand up Pencil-owned runtime, server, and local-first session flow

Wave 6:

- T9 Convert Slopcade into a consumer repo

Wave 7:

- T10 Release, local-dev workflow, and rollback runbook

---

## Category + Skills Recommendations

- T1 `writing` + `writing-plans`
- T2 `deep` + `safe-ast-refactoring`, `testing-patterns`
- T3 `deep` + `agent-orchestration`, `testing-patterns`
- T4 `deep` + `testing-patterns`
- T5 `unspecified-high` + `editor-system`, `skia-web-startup-boundary`
- T6 `quick` + `bootstrap`, `workspace-repo-topology`
- T7 `unspecified-high` + `git-master`, `workspace-repo-topology`
- T8 `deep` + `editor-system`, `testing-patterns`
- T9 `deep` + `workspace-repo-topology`, `safe-ast-refactoring`
- T10 `writing` + `writing-plans`, `git-master`

---

## Execution Plan

### Task 1: Freeze the ownership boundary in Slopcade

**Files:**
- Modify: `docs/pencil/architecture-boundaries.md`
- Modify: `docs/pencil/deprecation-path.md`
- Modify: `docs/pencil/api-runway.md`
- Modify: `docs/pencil/session-registry-model.md`

**Step 1: Record the repo split as the next milestone**

- Add an explicit note that the target is a standalone repo named `pencil` at `/Users/hassoncs/Workspaces/personal/pencil`.

**Step 2: Lock the anti-coupling rule**

- State that `gameId`, `workspace:${gameId}`, and `chatThreads.*` are compatibility-only and forbidden in new Pencil-owned contracts.

**Step 3: Verify doc consistency**

Run targeted grep to confirm all Pencil architecture docs describe Slopcade as an adapter/integration, not Pencil's backend.

**Verification:**

```bash
rg "adapter|integration|standalone repo|standalone local Pencil" docs/pencil
```

Expected: docs reference Slopcade as an adapter/integration and mention standalone-local Pencil direction.

**Step 4: Commit**

```bash
git add docs/pencil/*.md
git commit -m "docs(pencil): lock standalone repo target and boundaries"
```

### Task 2: Create the Pencil-owned protocol package before any repo move

**Files:**
- Create: `packages/protocol/package.json`
- Create: `packages/protocol/src/index.ts`
- Create: `packages/protocol/src/pen.ts`
- Create: `packages/protocol/src/contracts/*.ts`
- Modify: `apps/pencil/lib/pencilEmbed.ts`
- Modify: `apps/pencil/lib/usePencilDocumentSync.ts`
- Modify: `packages/pencil-core/src/**`
- Modify: `packages/pencil-server/src/**`

**Step 1: Move pen schema/contracts into the protocol package**

- Re-home `PenDocument`, parser helpers, and store/session/file contracts into one Pencil-owned package.

**Step 2: Update all Pencil-owned imports**

- Replace imports from `@slopcade/shared/types/pen` in Pencil-owned code.

**Step 3: Run targeted tests and typecheck**

Run the protocol package test command plus targeted typecheck for Pencil-owned packages.

**Verification:**

```bash
pnpm exec tsc --noEmit -p apps/pencil/tsconfig.json
pnpm exec vitest run packages/pencil-core
rg "@slopcade/shared/types/pen" apps/pencil packages/pencil-core packages/pencil-server packages/design-canvas
```

Expected: typecheck passes, targeted tests pass, and no Pencil-owned imports remain from `@slopcade/shared/types/pen`.

**Step 4: Commit**

```bash
git add packages/protocol apps/pencil packages/pencil-core packages/pencil-server
git commit -m "refactor(pencil): create protocol package for pen schema and contracts"
```

### Task 3: Remove compile-time Slopcade API coupling from Pencil-owned code

**Files:**
- Modify: `apps/pencil/lib/adapters/slopcade-store-adapter.ts`
- Modify: `apps/pencil/lib/store-context.tsx`
- Modify: `apps/pencil/lib/trpc/*.ts*`
- Create: `packages/pencil-core/src/contracts/document-store.ts`
- Create: `packages/pencil-core/src/contracts/host-adapter.ts`

**Step 1: Define a Pencil-owned adapter interface**

- Replace direct `AppRouter`/`TRPCClient<AppRouter>` dependency with a narrow interface describing only the required file operations.

**Step 2: Make the Slopcade adapter implement that interface**

- Keep `chatThreads.*` only in the Slopcade adapter.

**Step 3: Prove Pencil-owned packages typecheck without `@slopcade/api`**

- Targeted typecheck must pass with no direct Pencil-owned imports from `@slopcade/api/trpc`.

**Verification:**

```bash
rg "@slopcade/api/trpc" apps/pencil packages/pencil-core packages/pencil-server packages/design-canvas
pnpm exec tsc --noEmit -p apps/pencil/tsconfig.json
```

Expected: grep returns only Slopcade-side adapter locations or nothing; typecheck passes.

**Step 4: Commit**

```bash
git add apps/pencil packages/pencil-core
git commit -m "refactor(pencil): isolate slopcade api behind adapter interface"
```

### Task 4: Make session/file identity canonical and deprecate `gameId`

**Files:**
- Modify: `apps/pencil/lib/pencilEmbed.ts`
- Modify: `apps/pencil/lib/usePencilDocumentSync.ts`
- Modify: `apps/pencil/app/embed.tsx`
- Modify: `apps/pencil/app/index.tsx`
- Test: `apps/pencil/lib/pencilEmbed.test.ts`

**Step 1: Make `sessionId + projectRoot + filePath` the primary identity**

- Keep legacy `gameId` parsing only inside compatibility shims.

**Step 2: Move legacy URL semantics into one isolated translation layer**

- Legacy support can translate old params into the new identity model, but must not define core runtime shape.

**Step 3: Verify embed/runtime tests**

- Update tests to cover session/file identity and legacy translation.

**Verification:**

```bash
pnpm exec vitest run apps/pencil/lib/pencilEmbed.test.ts
rg "workspace:\$\{gameId\}|gameId" apps/pencil/lib
```

Expected: tests pass; remaining `gameId` usage is isolated to explicit compatibility code.

**Step 4: Commit**

```bash
git add apps/pencil
git commit -m "refactor(pencil): make session and project identity canonical"
```

### Task 5: Re-home `design-canvas` under Pencil ownership

**Files:**
- Modify: `packages/design-canvas/package.json`
- Modify: `packages/design-canvas/src/**`
- Modify: Pencil consumers in `apps/pencil/**`
- Modify: Slopcade consumers that depend on `design-canvas`

**Step 1: Remove Slopcade-owned pen/schema imports from `design-canvas`**

- Make `design-canvas` depend on the new Pencil-owned protocol package.

**Step 2: Verify web/native boundaries still hold**

- Keep existing Skia web startup-boundary rules intact.

**Verification:**

```bash
pnpm exec tsc --noEmit -p apps/pencil/tsconfig.json
rg "@shopify/react-native-skia|@slopcade/design-canvas" apps/pencil/app
```

Expected: typecheck passes; route files do not directly import Skia-poisoning modules except where the boundary policy explicitly allows it.

**Step 3: Confirm Slopcade becomes a consumer, not an owner**

- Slopcade may keep using `design-canvas`, but it should no longer define its source of truth.

**Step 4: Commit**

```bash
git add packages/design-canvas apps/pencil
git commit -m "refactor(pencil): move design canvas onto pencil-owned contracts"
```

### Task 6: Create the standalone `pencil` repository skeleton

**Files:**
- Create repo root: `/Users/hassoncs/Workspaces/personal/pencil`
- Create: `/Users/hassoncs/Workspaces/personal/pencil/.projectrc`
- Create: `/Users/hassoncs/Workspaces/personal/pencil/package.json`
- Create: `/Users/hassoncs/Workspaces/personal/pencil/pnpm-workspace.yaml`
- Create: `/Users/hassoncs/Workspaces/personal/pencil/tsconfig.json`
- Create: `/Users/hassoncs/Workspaces/personal/pencil/README.md`
- Create: `/Users/hassoncs/Workspaces/personal/pencil/AGENTS.md`

**Step 1: Initialize the standalone monorepo**

- Add root scripts for app, core, and server work.

**Step 2: Add the project jump config**

- Write `.projectrc` at the repo root with `name = "pencil"`.

**Step 3: Define package layout**

- `apps/pencil`
- `packages/protocol`
- `packages/design-canvas`
- `packages/pencil-core`
- `packages/pencil-server`

**Verification:**

```bash
test -f "/Users/hassoncs/Workspaces/personal/pencil/.projectrc"
test -f "/Users/hassoncs/Workspaces/personal/pencil/package.json"
test -f "/Users/hassoncs/Workspaces/personal/pencil/pnpm-workspace.yaml"
```

Expected: repo root scaffold files exist before code extraction begins.

**Step 4: Commit in the new repo**

```bash
git add .
git commit -m "chore: scaffold standalone pencil monorepo"
```

### Task 7: Extract code into the new repo with preserved history

**Files:**
- Extract from Slopcade:
  - `apps/pencil`
  - `packages/pencil-core`
  - `packages/pencil-server`
  - `packages/design-canvas`
  - new `packages/protocol`

**Step 0: Preserve app naming consistency**

- Keep the extracted app directory named `apps/pencil` in the new repo. Do not rename it to `apps/pencil-app`.

**Step 1: Use a history-preserving extraction command**

- Prefer `git filter-repo` over manual copy.

**Step 2: Verify path set completeness**

- Ensure no Pencil-owned directory is missing.

**Step 3: Verify history survived**

Run:

```bash
git log -- apps/pencil
git log -- packages/pencil-core
git log -- packages/design-canvas
```

**Verification:**

```bash
test -d "/Users/hassoncs/Workspaces/personal/pencil/apps/pencil"
git log -- apps/pencil
git log -- packages/pencil-core
git log -- packages/design-canvas
```

Expected: extracted repo contains `apps/pencil`, and git history is present for the extracted paths.

**Step 4: Commit any post-extraction path normalization**

```bash
git add .
git commit -m "chore: normalize extracted pencil repo structure"
```

### Task 8: Stand up Pencil-owned runtime, server, and local-first session flow in the new repo

**Files:**
- Modify: `apps/pencil/**`
- Modify: `packages/pencil-server/**`
- Modify: `packages/pencil-core/**`
- Create/Modify: runtime and daemon config files in the new repo

**Step 1: Make the standalone runtime boot without Slopcade**

- Local-first project folders and session registry become the default.

**Step 2: Implement or finish `pencil list/start/stop/attach`**

- Use the session-registry model already documented.

**Step 3: Verify multiple project sessions**

- Prove two project folders can run concurrently without collisions.

**Verification:**

```bash
pnpm install
pnpm typecheck
pnpm test
pencil list
pencil start /path/to/project-a/documents/main.pen
pencil start /path/to/project-b/documents/main.pen
pencil list
```

Expected: install/typecheck/tests pass; both sessions are listed distinctly with no collisions.

**Step 4: Commit**

```bash
git add apps/pencil-app packages/pencil-core packages/pencil-server
git commit -m "feat: make standalone pencil runtime local-first"
```

### Task 9: Convert Slopcade into a consumer repo

**Files:**
- Modify in Slopcade: package manifests that consume Pencil-owned packages
- Create/Modify in Slopcade: `packages/pencil-slopcade-adapter/**`
- Remove or deprecate embedded Pencil ownership assumptions from Slopcade root wiring

**Step 1: Introduce explicit Pencil package consumption**

- Replace workspace-internal ownership assumptions with versioned Pencil dependencies.

**Step 2: Keep Slopcade integration behind one adapter**

- `chatThreads.*` stays here, not in Pencil repo.

**Step 3: Verify Slopcade still resolves and builds against external Pencil packages**

- Run targeted typecheck/build in Slopcade after dependency rewiring.

**Verification:**

```bash
pnpm exec tsc --noEmit -p tsconfig.json
pnpm test
```

Expected: Slopcade resolves external Pencil packages successfully and its test suite remains green or only shows pre-existing unrelated failures.

**Step 4: Commit**

```bash
git add package.json packages/pencil-slopcade-adapter
git commit -m "refactor: consume standalone pencil packages from slopcade"
```

### Task 10: Release, local-dev workflow, and rollback runbook

**Files:**
- Create in Pencil repo: `docs/release-and-consumption.md`
- Create in Slopcade repo: `docs/pencil-consumer-workflow.md`
- Create in both repos: migration notes and rollback checklist

**Step 1: Define prerelease package flow**

- local testing via packed tarballs
- stable path via registry-published versions

**Step 2: Write rollback steps**

- how to temporarily restore embedded workspace wiring if external package rollout fails

**Step 3: Verify documentation is sufficient for a cold start**

- A future executor should be able to bootstrap both repos from the runbook alone.

**Verification:**

```bash
test -f docs/release-and-consumption.md
```

Expected: runbook exists and includes bootstrap, prerelease, rollback, and consumer verification steps.

**Step 4: Commit**

```bash
git add docs
git commit -m "docs: add pencil split release and rollback runbook"
```

---

## Verification Commands

Run these during execution, not just at the end:

```bash
# Slopcade pre-split boundary verification
pnpm exec tsc --noEmit -p apps/pencil/tsconfig.json
pnpm exec vitest run apps/pencil/lib/pencilEmbed.test.ts

# Grep guards before repo split
rg "@slopcade/api/trpc" apps/pencil packages/pencil-core packages/pencil-server
rg "workspace:\$\{gameId\}|gameId" apps/pencil

# New pencil repo
pnpm install
pnpm typecheck
pnpm test

# Standalone runtime/session verification
pencil list
pencil start /path/to/project-a/documents/main.pen
pencil start /path/to/project-b/documents/main.pen
pencil attach <session-id>

# Slopcade consumer verification after reintegration
pnpm exec tsc --noEmit -p tsconfig.json
pnpm test
```

Success conditions:

- Pencil-owned packages no longer import `@slopcade/api/trpc`
- Pencil runtime no longer treats `gameId` as the canonical identity
- new repo exists at `/Users/hassoncs/Workspaces/personal/pencil`
- new repo root contains `.projectrc` with `name = "pencil"`
- Slopcade consumes Pencil through explicit packages and one adapter seam

---

## Recommendation

Do not restart from scratch. Use the existing architecture work and docs as the foundation, then execute only the remaining repo-extraction sequence:

1. finish dependency inversion inside Slopcade
2. create the standalone `pencil` monorepo
3. extract with history preserved
4. turn Slopcade into a consumer with one adapter boundary

That is the shortest path to the end state you described, and it matches the plans that were already partially executed.

---

## Actionable TODO List

> CALLER: Add these TODOs using TodoWrite/TaskCreate and execute by wave.

### Wave 1 (Start Immediately - No Dependencies)

- [ ] **1. Freeze the ownership boundary in Slopcade**
  - What: Update `docs/pencil/*.md` to reflect the standalone repo target and lock anti-coupling rules.
  - Depends: None
  - Blocks: 2
  - Category: `writing`
  - Skills: `writing-plans`
  - QA: `rg "adapter|integration|standalone repo|standalone local Pencil" docs/pencil` returns matches.

- [ ] **6. Create the standalone `pencil` repository skeleton**
  - What: Initialize `/Users/hassoncs/Workspaces/personal/pencil` with `.projectrc`, `package.json`, `pnpm-workspace.yaml`, `tsconfig.json`.
  - Depends: None
  - Blocks: 7
  - Category: `quick`
  - Skills: `bootstrap`, `workspace-repo-topology`
  - QA: `test -f "/Users/hassoncs/Workspaces/personal/pencil/.projectrc"` passes.

### Wave 2 (After Wave 1 Completes)

- [ ] **2. Create the Pencil-owned protocol package**
  - What: Create `packages/protocol`, move `PenDocument` from `shared/src/types/pen.ts`, update imports in Pencil packages.
  - Depends: 1
  - Blocks: 3, 5
  - Category: `deep`
  - Skills: `safe-ast-refactoring`, `testing-patterns`
  - QA: `pnpm exec tsc --noEmit -p apps/pencil/tsconfig.json` passes; `rg "@slopcade/shared/types/pen" apps/pencil packages/pencil-core packages/pencil-server packages/design-canvas` returns no results.

### Wave 3 (After Wave 2 Completes)

- [ ] **3. Remove compile-time Slopcade API coupling**
  - What: Define host adapter interface in `pencil-core`, make Slopcade adapter implement it, remove direct `@slopcade/api/trpc` imports.
  - Depends: 2
  - Blocks: 4
  - Category: `deep`
  - Skills: `safe-ast-refactoring`, `testing-patterns`
  - QA: `rg "@slopcade/api/trpc" apps/pencil packages/pencil-core packages/pencil-server packages/design-canvas` returns no results; `pnpm exec tsc --noEmit -p apps/pencil/tsconfig.json` passes.

- [ ] **5. Re-home `design-canvas` under Pencil ownership**
  - What: Modify `packages/design-canvas` to depend on the new protocol package. Verify Skia web boundaries.
  - Depends: 2
  - Blocks: 7
  - Category: `unspecified-high`
  - Skills: `skia-web-startup-boundary`, `safe-ast-refactoring`
  - QA: `rg "@shopify/react-native-skia|@slopcade/design-canvas" apps/pencil/app` confirms boundary rules; typecheck passes.

### Wave 4 (After Wave 3 Completes)

- [ ] **4. Make session/file identity canonical**
  - What: Refactor `pencilEmbed.ts` to use `sessionId + projectRoot + filePath` as primary identity. Deprecate `gameId`.
  - Depends: 3
  - Blocks: 7
  - Category: `deep`
  - Skills: `testing-patterns`
  - QA: `pnpm exec vitest run apps/pencil/lib/pencilEmbed.test.ts` passes; `rg "workspace:\$\{gameId\}|gameId" apps/pencil/lib` shows isolation.

### Wave 5 (After Wave 4 Completes)

- [ ] **7. Extract code into the new repo with preserved history**
  - What: Clone Slopcade into the new repo dir, use `git filter-repo` to extract Pencil packages while preserving history.
  - Depends: 4, 5, 6
  - Blocks: 8
  - Category: `unspecified-high`
  - Skills: `git-master`, `workspace-repo-topology`
  - QA: `cd /Users/hassoncs/Workspaces/personal/pencil && git log -- apps/pencil` shows history.

### Wave 6 (After Wave 5 Completes)

- [ ] **8. Stand up standalone runtime in new repo**
  - What: In the new repo, rename packages to `@pencil/*`, update imports, and implement `pencil list/start/stop/attach`.
  - Depends: 7
  - Blocks: 9
  - Category: `deep`
  - Skills: `safe-ast-refactoring`, `testing-patterns`
  - QA: `cd /Users/hassoncs/Workspaces/personal/pencil && pnpm install && pnpm typecheck && pnpm test` passes.

### Wave 7 (After Wave 6 Completes)

- [ ] **9. Convert Slopcade into a consumer repo**
  - What: In Slopcade, remove extracted packages, consume `@pencil/*` via local tarballs, rewire adapter.
  - Depends: 8
  - Blocks: 10
  - Category: `deep`
  - Skills: `workspace-repo-topology`, `safe-ast-refactoring`
  - QA: `cd /Users/hassoncs/Workspaces/Personal/slopcade && pnpm exec tsc --noEmit -p tsconfig.json` passes.

### Wave 8 (After Wave 7 Completes)

- [ ] **10. Release, local-dev workflow, and rollback runbook**
  - What: Write documentation in both repos detailing the release process, local dev workflow, and rollback steps.
  - Depends: 9
  - Blocks: None
  - Category: `writing`
  - Skills: `writing-plans`
  - QA: `test -f /Users/hassoncs/Workspaces/personal/pencil/docs/release-and-consumption.md` passes.

## Execution Instructions

1. **Wave 1**: Fire these tasks IN PARALLEL (no dependencies)
   ```
   task(category="writing", load_skills=["writing-plans"], run_in_background=false, prompt="Task 1: Freeze the ownership boundary in Slopcade...")
   task(category="quick", load_skills=["bootstrap", "workspace-repo-topology"], run_in_background=false, prompt="Task 6: Create the standalone pencil repository skeleton...")
   ```

2. **Wave 2**: After Wave 1 completes, fire next wave
   ```
   task(category="deep", load_skills=["safe-ast-refactoring", "testing-patterns"], run_in_background=false, prompt="Task 2: Create the Pencil-owned protocol package...")
   ```

3. Continue until all waves complete.

4. Final QA: Verify all tasks pass their QA criteria.
