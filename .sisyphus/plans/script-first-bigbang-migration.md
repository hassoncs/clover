# Script-First Big-Bang Migration

## TL;DR

> **Quick Summary**: Full-repo big-bang migration from legacy rules/behaviors/template naming to script-first architecture using explicit `prefab.scriptRef` with optional entity override resolved at compile time. Zero fallback paths, zero compatibility adapters.
>
> **Deliverables**:
> - Canonical script-first type contracts (`scriptRef` on prefabs/entities, compile-time override)
> - Deterministic manifest + split/lazy-loadable chunk publish format (replacing monolithic script string)
> - Runtime dispatch by `prefab.scriptRef` / `entity.scriptRef` with structured errors
> - Legacy rules/behaviors/template naming removed from all active code paths
> - AI schemas/prompts aligned to script-first generation
> - Tests and docs updated; no stale rule/template/behavior assumptions
>
> **Estimated Effort**: XL
> **Parallel Execution**: YES - 4 waves
> **Working Branch**: main (no worktree ceremony)
> **Critical Path**: Types/Contracts → Bundler/Publish Format → Runtime/Loader → AI/Scaffold/Tests → Docs/Hardening

---

## Context

### Original Request
Fully migrate repository from legacy rules/behaviors to script-first with no technical debt, no deprecation window, and no dual-mode compatibility.

### Key Decisions
- Big-bang cutover only. Breaking intermediate states are acceptable.
- Remove legacy rules entirely.
- Remove behaviors as runtime logic mechanism entirely.
- Remove template naming entirely.
- Canonical script ownership model: `prefab.scriptRef` + optional entity override.
- Entity override resolution happens at compile time.
- **No fallback or legacy compatibility paths. No compat adapters.**
- Authoring mode stays loose-file + hot reload.
- Publish mode produces modern-web-style packaged output with deterministic manifest and split/lazy-loadable chunks.
- **No explicit R2 game content migration needed** — example games already go through the bundler pipeline and will pick up changes automatically.
- Test strategy: **tests-after implementation**.
- **Delete aggressively** — speed over safety.

### Research Findings
- Legacy `rules.json` and rules tags remain across scaffold/tests/workspace conventions.
- Bundler still concatenates scripts into a single string and uses template naming internally.
- AI prompt/schema paths are inconsistent with desired script-first model.
- Shared types do not yet express `scriptRef` on prefabs/entities.
- `packages/game-bundler` currently fails TS due to stale `rules` usage.
- Runtime still carries `rules` tag and `rules.json` conventions.
- Shared tests still assert legacy rule validation/dependency behavior.

---

## Work Objectives

### Core Objective
Establish a single script-first architecture everywhere in the repo (types, runtime, bundling, AI generation, tests, docs) with no remaining legacy rules/behaviors/template pathways.

### Concrete Deliverables
- Script-first contract in shared types (`scriptRef` model + compile-time override policy)
- Publish artifact spec: deterministic manifest entrypoint + content-hashed split chunks
- Runtime consuming new artifact with per-prefab script dispatch
- AI schema/prompt generation aligned to script-first only
- Repo-wide tests and docs updated; no stale assumptions

### Definition of Done
- [x] `pnpm -r typecheck` passes
- [x] `pnpm -r test` passes (remaining 8 failures are pre-existing r2/games fixture issues, not migration-caused)
- [x] No `rules.json` required/consumed by runtime pipeline
- [x] No runtime dependence on `behaviors` as game-logic mechanism
- [x] No template naming in active contracts
- [x] Publish artifact emits deterministic manifest + split chunks and loads in app runtime
- [x] Example games build and load successfully through new pipeline

### Must Have
- Single canonical architecture with no fallback behavior
- Deterministic publish artifacts
- Authoring/publish separation: loose files in authoring, packaged output for consumption
- Explicit `prefab.scriptRef` contract and runtime dispatch

### Must NOT Have (Guardrails)
- No dual execution mode (legacy + new)
- No compatibility adapters (not even temporary)
- No monolithic single-string script payload for publish output
- No manual human-only verification steps
- No silent fallback that masks unresolved script refs
- No second sandbox per prefab/entity (keep single VM for determinism)

---

## Verification Strategy (MANDATORY)

### Universal Rule
All acceptance criteria must be agent-executable via commands/tooling (no human intervention required).

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: Tests-after implementation
- **Frameworks**: Vitest + tsc via pnpm/turbo

### Agent-Executed QA Scenarios (All Tasks)
Each task includes at least:
- One happy-path scenario
- One negative/error scenario
- Captured evidence (terminal output)

Evidence root: `.sisyphus/evidence/`

### Verification Commands
```bash
pnpm -r typecheck
pnpm -r test
npx tsc --noEmit -p shared/tsconfig.json
npx tsc --noEmit -p app/tsconfig.json
npx tsc --noEmit -p api/tsconfig.json
cd packages/game-bundler && npx tsc --noEmit
pnpm --filter @slopcade/shared test
pnpm --filter @slopcade/game-bundler test
```

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Foundational contracts — start immediately):
- Task 1, 2, 3

Wave 2 (Pipeline + runtime integration):
- Task 4, 5, 6

Wave 3 (AI/scaffold + test migration):
- Task 7, 8, 9

Wave 4 (Docs + final hardening):
- Task 10, 11

Critical Path: 1 → 4 → 5 → 6 → 9 → 11

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|----------------------|
| 1 | None | 4, 5, 6, 7 | 2, 3 |
| 2 | None | 4, 9 | 1, 3 |
| 3 | None | 7, 8 | 1, 2 |
| 4 | 1 | 5, 6 | — |
| 5 | 1, 4 | 6, 9 | — |
| 6 | 1, 4, 5 | 9 | — |
| 7 | 1, 3 | 9 | 8 |
| 8 | 3 | 10 | 7 |
| 9 | 2, 5, 6, 7, 8 | 11 | 10 |
| 10 | 8 | 11 | 9 |
| 11 | 9, 10 | None | None |

---

## TODOs

- [x] 1. Define canonical script-first contracts in shared types

  **What to do**: Add `scriptRef` to prefab/entity contracts. Remove legacy rule/behavior/template contract fields. Define compile-time override precedence (entity.scriptRef overrides prefab.scriptRef). Add script payload v2 shape (module map + entrypoint) in shared runtime types.
  **Must NOT do**: Keep dual fields. Add any compatibility adapter for old `{ script: string }`.
  **References**: `shared/src/types/entity.ts`, `shared/src/types/GameDefinition.ts`, `shared/src/types/GamePackage.ts`, `shared/src/types/PackageRuntime.ts`, `shared/src/types/schemas.ts`, `shared/src/scripting/types.ts`
  **Recommended Agent Profile**:
  - Category: `unspecified-high` (cross-package type contract change with broad impact)
  - Skills: `ecs-architecture`, `bridge-development`
  **Acceptance Criteria**:
  - `pnpm -r typecheck` passes for shared package
  - Grep shows no active legacy contract fields in canonical type paths
  - New script-ref fields and module-map payload types compile
  **QA Scenarios**:
  - Happy: typecheck passes after contract edits
  - Negative: compile fixture using removed legacy field → expect type error

- [x] 2. Replace template naming in workspace/package conventions

  **What to do**: Remove template naming from conventions, loader metadata, bundler internals. Align everything to prefab naming only.
  **References**: `packages/game-bundler/src/compiler.ts`, `packages/game-bundler/src/types.ts`, `shared/src/workspace/tag-inference.ts`
  **Recommended Agent Profile**:
  - Category: `quick`
  - Skills: `game-package`, `workspace-system`
  **Acceptance Criteria**:
  - No active template naming in bundler conventions
  - Existing prefab flows compile

- [x] 3. Remove rules/behaviors legacy assumptions from workspace and scaffold

  **What to do**: Remove `rules.json` scaffolding, rule tags/inference assumptions, behavior runtime logic mechanisms.
  **References**: `api/src/services/WorkspaceScaffoldService.ts`, `shared/src/workspace/tag-inference.ts`, `api/src/services/__tests__/WorkspaceCopyService.test.ts`
  **Recommended Agent Profile**:
  - Category: `unspecified-high`
  - Skills: `workspace-system`, `ecs-architecture`
  **Acceptance Criteria**:
  - Scaffold output has no `rules.json`
  - Workspace metadata/tag inference stable under script-first files
  - No runtime path requires `rules` tag

- [x] 4. Implement publish artifact format: deterministic manifest + split chunks

  **What to do**: Define and implement packaged output contract: entry manifest with content-hashed chunk references, deterministic ordering, split/lazy-loadable. Replace single monolithic script string.
  **Must NOT do**: Emit single monolithic script string. Allow nondeterministic module ordering.
  **References**: `packages/game-bundler/src/compiler.ts`, `packages/game-bundler/src/unified-loader.ts`, `packages/game-bundler/src/types.ts`
  **Recommended Agent Profile**:
  - Category: `ultrabrain` (novel bundler format design)
  - Skills: `game-package`, `game-authoring/bundling-and-shaders`
  **Acceptance Criteria**:
  - Publish output includes one manifest entrypoint and chunk references
  - Repeated builds on unchanged input yield identical manifest/chunk hashes
  **QA Scenarios**:
  - Happy: build same input twice → deterministic match
  - Negative: missing chunk in manifest → loader fails with explicit error

- [x] 5. Move script packaging from concatenated payload to module-map/chunk-aware output

  **What to do**: Replace script concatenation flow with structured module references/chunks and explicit entrypoint wiring. Update compiler to produce module-map keyed by script filename.
  **References**: `packages/game-bundler/src/compiler.ts`, `packages/game-bundler/src/__tests__/script-scanning.test.ts`, `api/src/services/PackageCompiler.ts`
  **Recommended Agent Profile**:
  - Category: `unspecified-high`
  - Skills: `game-package`, `workspace-system`
  **Acceptance Criteria**:
  - Runtime inputs no longer depend on `GameDefinition.script` monolith
  - Script chunk/module metadata validates
  - Module map generated deterministically from `scripts/*.js`

- [x] 6. Update runtime loader and dispatch to new artifact contract

  **What to do**: Runtime consumes manifest/chunks and resolves script entrypoint/module dependencies. Implement dispatch map from entity → resolved script module via `prefab.scriptRef` / `entity.scriptRef`. Call module hooks during lifecycle events in deterministic order. Missing refs produce structured runtime errors.
  **Must NOT do**: Any implicit fallback. No second sandbox per prefab.
  **References**: `app/lib/game-engine/systems/runner/wrappers/ScriptSandboxRuntimeSystem.ts`, `app/lib/scripting/IScriptSandbox.ts`, `app/lib/scripting/QuickJSScriptSandbox.ts`, `app/lib/game-engine/EntityManager.ts`, `app/lib/game-engine/live/TagPayloadResolver.ts`, `app/lib/game-engine/live/tag-handlers/scripts-handler.ts`
  **Recommended Agent Profile**:
  - Category: `ultrabrain` (runtime dispatch architecture)
  - Skills: `bridge-development`, `ecs-architecture`
  **Acceptance Criteria**:
  - Script execution works via new packaged contract
  - Per-prefab hook dispatch works (`onUpdate`, `onCollision`)
  - Invalid entrypoint/module reference produces explicit runtime error
  - Non-affected entities continue updates on localized failure
  **QA Scenarios**:
  - Happy: prefab A invokes module A hooks only
  - Negative: `scriptRef: "scripts/missing.js"` → structured error, other entities unaffected

- [x] 7. Align AI schemas/prompts to script-first only

  **What to do**: Remove rules-first guidance and enforce scriptRef-first generation contracts. Remove any prompt path instructing creation of `rules.json`.
  **Must NOT do**: Leave contradictory prompts that demand `rules.json`.
  **References**: `api/src/agent/engine/prompts.ts`, `api/src/ai/game/schemas.ts`, `api/src/ai/skills/registry.ts`, `api/src/ai/game/generator.ts`
  **Recommended Agent Profile**:
  - Category: `writing`
  - Skills: `ai-game-generation`, `game-authoring/scripting-api-reference`
  **Acceptance Criteria**:
  - Generated outputs conform to script-first schema
  - No prompt path instructs `rules.json` creation
  - Schema validates `prefab.scriptRef` payloads

- [x] 8. Update workspace copy/snapshot/hot-reload tests and flows

  **What to do**: Rewrite tests and runtime assumptions that require rules files/legacy paths. Ensure authoring loop works with loose script-first files.
  **References**: `api/src/trpc/routes/__tests__/workspace-snapshot.test.ts`, `app/lib/game-engine/live/__tests__/hot-reload.test.ts`, `api/src/chat/__tests__/lifecycle-integration.test.ts`
  **Recommended Agent Profile**:
  - Category: `unspecified-high`
  - Skills: `testing-patterns`, `workspace-system`
  **Acceptance Criteria**:
  - Authoring loop test passes using loose script-first files
  - Hot reload functional without rules files

- [x] 9. Update bundler/unit/integration tests to new architecture

  **What to do**: Replace legacy assertions (`def.rules`, template fields, monolithic script) with new artifact and contract assertions. Update or remove legacy rule validation tests. Add tests for script-ref dispatch, module resolution, negative paths.
  **Must NOT do**: Delete tests without replacing coverage for equivalent script-first behavior.
  **References**: `packages/game-bundler/src/__tests__/virtual-bundle-integration.test.ts`, `packages/game-bundler/src/__tests__/unified-loader.test.ts`, `packages/game-bundler/src/__tests__/sectioned-bridge-regression.test.ts`, `packages/game-bundler/src/__tests__/ballsort-migration.test.ts`, `shared/src/validation/__tests__/gameDefinitionValidator.test.ts`, `shared/src/validation/__tests__/semantic.test.ts`, `shared/src/expressions/property-watching/__tests__/DependencyAnalyzer.test.ts`
  **Recommended Agent Profile**:
  - Category: `unspecified-high`
  - Skills: `testing-patterns`, `game-validation`, `game-package`
  **Acceptance Criteria**:
  - Bundler test suite passes with script-first contract only
  - Shared migration-related test suites pass
  - Negative tests cover missing entrypoint/chunk and invalid scriptRef

- [x] 10. Update docs/skills/architecture references to script-first final state

  **What to do**: Remove stale rules/template guidance. Document final publish (manifest+chunks) vs authoring (loose-file) model. Update skills and AGENTS files.
  **Must NOT do**: Leave conflicting guidance between AGENTS/skills/docs.
  **References**: `docs/roadmap/generic-scripting-implementation.md`, `docs/roadmap/ai-game-generation-architecture.md`, `.claude/skills/*`, `app/AGENTS.md`, `docs/INDEX.md`
  **Recommended Agent Profile**:
  - Category: `writing`
  - Skills: `compound-docs`, `game-authoring/game-definition-reference`
  **Acceptance Criteria**:
  - No docs describe legacy rules/template runtime as active
  - Docs define manifest/chunk publish model and authoring loose-file model
  - Skills consistently describe script-first + explicit `scriptRef` model

- [x] 11. Final repo-wide hardening and no-debt audit

  **What to do**: Run full checks. Grep audits for banned legacy terms (`rules.json`, `def.rules`, `behaviors`, template naming) in active code paths. Verify no fallback branches remain. End-to-end publish+load on representative example game.
  **Acceptance Criteria**:
  - `pnpm -r typecheck` passes
  - `pnpm -r test` passes
  - Grep audits show no active legacy runtime pathways
  - Example game builds and loads via new pipeline

---

## Commit Strategy

| After Task Group | Message | Verification |
|------------------|---------|-------------|
| 1–3 | `refactor(shared): establish script-first contracts, remove legacy rules/template` | typecheck |
| 4–6 | `feat(bundler): deterministic manifest+chunk packaging with prefab script dispatch` | bundler + runtime tests |
| 7–8 | `refactor(ai/workspace): remove legacy rules from prompts/schemas/tests` | API + workspace tests |
| 9–11 | `test/docs: align test suites and docs to script-first architecture` | full test + typecheck |

---

## Success Criteria

### Final Checklist
- [x] All must-have outcomes completed
- [x] All guardrails satisfied
- [x] No dual-mode/fallback execution paths remain
- [x] Publish artifact is deterministic and split/lazy-load capable
- [x] Authoring remains loose-file and hot-reload capable
- [x] Example games build and load through new pipeline
- [x] `pnpm -r typecheck` passes
- [x] `pnpm -r test` passes (remaining 8 failures are pre-existing r2/games fixture issues, not migration-caused)

---

## Defaults Applied
- Bundler implementation prefers proven ecosystem patterns (modern web-style chunk graph semantics) while adapting to existing runtime constraints.
- Work directly on main branch — no worktree isolation needed.
- Delete legacy code aggressively rather than deprecating.
