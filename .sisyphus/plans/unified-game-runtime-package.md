# Unified Game Runtime Package Plan

## TL;DR

> **Quick Summary**: Move to one JSON/text-based game package model where `workspace/` holds editable source files and `build/` holds runtime artifacts consumed over the Godot bridge.
>
> **Core Rule**: Godot does not read editable workspace files directly. TS/API compiles/translates package files into bridge payloads.
>
> **Deliverables**:
> - Runtime package API contract
> - Compile + validate + preview gate loop
> - Tag-group/lazy-load runtime path
> - Full legacy path removal

---

## Architecture Decision (Locked)

### Authoring Format
- Runtime-authorable files are JSON/text only.
- `slopcade.json` is optional.
- Script-first package is first-class (JS + JSON fragments + assets + docs).

### Storage Layout
- Source of truth: `games/{gameId}/workspace/**`
- Runtime artifacts: `games/{gameId}/build/{buildId}/**`

### Bridge Strategy
- Keep Godot bridge-first ingestion (`load_game_json`, `setup_world`, `register_templates`, `load_entities`) as foundational path.
- Add package orchestrator APIs in TS that map to existing bridge primitives.
- Add Godot-native scene-backed prefabs as an opt-in lane, not the primary lane.

### Naming Taxonomy (Canonical)

Use these terms consistently across code/docs during migration.

- **prefab**: Runtime entity blueprint/archetype. Entities reference `prefab` IDs. Primary canonical term.
- **template**: Deprecated/legacy synonym. Migration goal is full removal from code/docs.
- **scene**: Authored composition of entity instances and setup context; may reference templates.
- **package**: Authoring container and lifecycle unit (`workspace/` + `build/`) for a game.
- **bundle**: Compiler/build artifact format and compiler domain term. A package can produce one or more build bundles.
- **tag group**: Named loading boundary represented by artifact tags (for partial/lazy load), such as `world`, `prefabs`, `entities`, `rules`, `scripts`, `assets`.

### Naming Rules (Enforced in this plan)

- Use `prefab` in runtime APIs and game data models.
- Do not introduce new `template`-named APIs in implementation code.
- Use `scene` only for composition/domain meaning, not as a synonym for package/bundle.
- Use `package` for lifecycle/source+build container semantics.
- Use `bundle` only for compiler output/format semantics.
- Do not use `section` in new APIs. Use artifact tags and tag groups for selective load/unload.

### Target Runtime Package API
- `loadPackage(manifest)`
- `loadByTag(tag)`
- `unloadByTag(tag)`
- `reloadChangedTags(changedTags[])`
- `instantiatePrefab(prefabId, opts)`
- `instantiatePrefabFromScene(sceneRef, opts)`
- `setTimeMode("paused" | "playing")`

---

## Work Objectives

- Unify game lifecycle to: edit -> compile -> validate -> preview.
- Make preview availability deterministic via readiness checks.
- Support composable lazy loading across tag groups (`world`, `prefabs`, `entities`, `rules`, `scripts`, `assets`).
- Enable runtime-friendly prefab/scene composition without binary authoring.
- Remove all legacy dual-path loading and compatibility debt.

---

## Verification Strategy

- Compile and validation must be agent-executable (API endpoints + tests).
- Preview gate must be enforced by backend readiness state.
- Runtime parity must be tested between adapter mode and section-native mode.
- No task may rely on manual-only verification.

---

## Parallel Execution Waves

### Wave 1 - Contracts and API Shape
1. Define package contract and runtime API schemas.
2. Define build artifact manifest and tag-group contracts.

### Wave 2 - Compiler Backbone
3. Implement R2 workspace compiler service to emit `build/{buildId}`.
4. Emit diagnostics and source mapping for compile failures.

### Wave 3 - Validation and Preview Gate
5. Validate compiled artifacts and expose preview readiness API.
6. Add editor diagnostics panel and disabled preview states.

### Wave 4 - Runtime Orchestration
7. Implement adapter mode (`build` -> runtime `GameDefinition` -> existing `loadGame`).
8. Add tag-driven lazy loading orchestration (`loadByTag`, `unloadByTag`, reload changed tags).
9. Add preview time mode (`paused|playing`).

### Wave 5 - Prefab/Scene Hybrid
10. Add JSON-described prefab graphs and scene-backed prefab references.
11. Keep prefab path backward-compatible while enabling scene-backed instantiation.

### Wave 6 - Migration and Debt Burn-down
12. Migrate existing legacy games to unified workspace/build pipeline.
13. Remove legacy direct definition/source runtime paths and temporary flags.
14. Final regression + release checklist + rollback playbook.

---

## TODOs

- [ ] 1. Define package file contract (`workspace`)
  - Required: package manifest, at least one runtime entrypoint.
  - Optional: `slopcade.json`, section files, docs, shader/assets metadata.
  - Acceptance: schema tests pass and docs published.

- [ ] 2. Define runtime package API contract
  - Specify payloads/errors for `loadPackage/loadByTag/unloadByTag/reloadChangedTags/instantiate*/setTimeMode`.
  - Acceptance: typed API contract in shared package and endpoint tests.

- [ ] 3. Implement compile service for workspace->build
  - Read all workspace files from R2 and compile with virtual file reader.
  - Write manifest + section artifacts into versioned build directory.
  - Acceptance: compile success and error fixtures validated.

- [ ] 4. Add validation readiness service
  - Validate compiled artifacts only.
  - Provide readiness status and diagnostics summary for editor.
  - Acceptance: invalid packages are blocked, valid packages marked ready.

- [ ] 5. Wire editor preview gate and diagnostics
  - Disable preview when readiness is false.
  - Show compile + validation diagnostics with source file references.
  - Acceptance: integration tests for blocked/allowed preview states.

- [ ] 6. Implement runtime adapter mode
  - Map build sections into runtime `GameDefinition` and call existing bridge load.
  - Acceptance: baseline games load from build artifacts only.

- [ ] 7. Implement section-native runtime mode (flagged)
  - Use tag-driven bridge orchestration for composable/lazy loading.
  - Acceptance: parity suite matches adapter mode outcomes.

- [ ] 8. Add paused/playing preview mode
  - Hook editor mode toggle to bridge physics time controls.
  - Acceptance: deterministic paused physics + resumable play.

- [ ] 9. Add prefab/scene hybrid support
  - JSON-described prefab graphs first; optional scene reference lane next.
  - Acceptance: scene-backed prefab instantiation API supports both data-backed and scene-backed entries.

- [ ] 10. Big-bang rename: `template` -> `prefab` across codebase and bridge contracts
  - Rename runtime fields, schemas, validators, debug selectors, and bridge method names.
  - Update persisted artifact schema and migration scripts for existing game data.
  - Remove legacy aliases after migration verification (no long-lived compatibility layer).
  - Acceptance: search for game-domain `template` usage returns zero active code paths.

- [ ] 11. Migrate legacy game set
  - Convert old assets/definitions into unified workspace/build artifacts.
  - Acceptance: migration report with per-game validation + runtime pass/fail.

- [ ] 12. Remove legacy and deprecated paths
  - Delete old runtime loading branches and temp compatibility flags.
  - Acceptance: no references remain in search/tests; release checklist complete.

---

## Guardrails

- Do not require binary scene authoring at runtime.
- Do not require TypeScript compilation on device.
- Do not rewrite Godot internals for this migration.
- Do not leave permanent compatibility flags at project end.
- Do not expand scope to cross-game shared asset architecture in this plan.

---

## Success Criteria

- All new games run through unified workspace/build lifecycle.
- Runtime package API is stable, typed, and covered by tests.
- Preview gate enforces compile + validation readiness.
- Lazy-loading and partial reload work via tag-group orchestration.
- Legacy dual-path architecture is fully removed.
- Game-domain terminology is fully consolidated to `prefab` with no active `template` usage.
