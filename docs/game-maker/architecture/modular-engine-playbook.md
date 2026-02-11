# Modular Engine Migration Playbook

This document provides a comprehensive guide for migrating games from the legacy monolithic TypeScript format to the new modular bundle format, leveraging the sectioned bridge protocol for improved performance, lazy loading, and incremental AI generation.

## 1. Overview

### What Changed
- **Bridge Protocol**: The Godot bridge now supports sectioned loading, allowing independent updates to world config, templates, and entities.
- **Validation Pipeline**: Consolidated into a single Zod-driven pipeline with structural and semantic validation.
- **Compiler**: The `game-bundler` now outputs structured bundles that map directly to bridge sections.
- **Loader**: `GameLoader` supports `loadSectioned` for modular bundles and `swapEntities` for incremental updates.

### Why Modular?
- **Lazy Loading**: Enable sending scene chunks incrementally as the player progresses.
- **Scene Transitions**: Efficiently swap entities without re-sending world or template data.
- **Incremental AI Generation**: Generate and validate one scene at a time, allowing play to start before the entire game is generated.
- **Hot Reload**: Recompile and reload specific sections during development without a full game restart.

---

## 2. Bridge Protocol

The legacy `loadGameJson(entireDefinition)` protocol sent a single monolithic blob to Godot. The new protocol splits this into independent operations.

### New Bridge Methods
- `setupWorld(world, background)`: Configures gravity, bounds, and background.
- `registerTemplates(templates)`: Registers entity blueprints (visuals, physics, colliders).
- `loadEntities(entities)`: Spawns entity instances into the world.
- `clearEntities()`: Removes all entities from the scene while preserving world and template state.

### Implementation Details
- **GDScript**: Methods implemented in `GameBridge.gd` (e.g., `setup_world`, `register_templates`).
- **TypeScript**: Methods defined in `GodotBridge` interface (`app/lib/godot/types.ts`).
- **Backward Compatibility**: `loadGameJson` remains supported and internally delegates to the sectioned methods.

---

## 3. Migration Steps (How to Migrate a Game)

Follow these steps to migrate a monolithic `game.ts` to the modular bundle format:

1. **Create Bundle Directory**: Create a `bundle/` directory alongside your existing `src/`.
2. **Create Manifest**: Create `manifest.json` containing metadata (id, title, version), world config, and systems (e.g., stateMachines, containers).
3. **Extract Templates**: Move templates into `templates/` as JSON arrays. Group them logically (e.g., `balls.json`, `ui.json`).
4. **Extract Entities**: Move entity instances into `entities/` as JSON arrays (e.g., `level1.json`).
5. **Extract Rules**: Move rules into `rules/` as JSON arrays.
6. **Extract Scripts**: Move logic into `scripts/` as `.js` files. Ensure they use standard exports.
7. **Include Systems**: Add `stateMachines`, `containers`, or other system configs to `manifest.json` under the `systems` key.
8. **Verify Compilation**: Run `compileBundle` to ensure the directory structure is valid and constants resolve correctly.
9. **Verify Sectioned Output**: Run `compileSectioned` to generate the `SectionedBundle` with content hashes.
10. **Parity Check**: Compare the generated `definition.json` with your original to ensure no data was lost.

---

## 4. Bundle Directory Structure

```text
r2/games/{gameName}/bundle/
  manifest.json          # Metadata, world config, constants, systems
  templates/
    {group}.json         # Template arrays (e.g., characters.json)
  entities/
    {group}.json         # Entity arrays (e.g., scene1.json)
  rules/
    {group}.json         # Rule arrays (e.g., scoring.json)
  scripts/
    {name}.js            # QuickJS scripts
  assets.json            # Asset references (optional)
  constants.json         # Constants for value injection (optional)
```

---

## 5. Validation Pipeline

The engine uses a two-stage validation pipeline to ensure bundle integrity.

### Stage 1: Structural Validation (Zod)
- **Location**: `shared/src/types/schemas.ts`
- **Purpose**: Ensures JSON matches the expected schema (types, required fields, ranges).
- **Source of Truth**: TypeScript types are derived from these Zod schemas.

### Stage 2: Semantic Validation
- **Location**: `shared/src/validation/semantic.ts`
- **Purpose**: Cross-reference checks and integrity constraints.
- **Checks**:
  - Entity references valid templates.
  - No parent/child cycles in entity hierarchies.
  - Constants referenced in rules/templates exist in `constants.json`.
  - Duplicate IDs across different files.

---

## 6. Loader Integration

The `GameLoader` (`app/lib/game-engine/GameLoader.ts`) is the entry point for running games.

- **`GameLoader.load()`**: The existing path for flat `GameDefinition` objects.
- **`GameLoader.loadSectioned()`**: The new path for `SectionedBundle` objects. It orchestrates the bridge calls in the correct order: `setupWorld` → `registerTemplates` → `loadEntities`.
- **`GameLoader.swapEntities()`**: Used for scene transitions. It calls `clearEntities` followed by `loadEntities` with the new set.

---

## 7. Verification Report

The modular engine architecture was verified through extensive regression and migration testing.

### Accomplishments
- **Task 1: Bridge sectioned loading** ✅ (commit `c5fbf916`)
- **Task 2: Validation consolidation** ✅ (commit `0a06c73b`)
- **Task 3: Compiler sectioned bundles** ✅ (commit `30ea06b7`)
- **Task 4: Semantic validator** ✅ (commit `989cf535`)
- **Task 5: GameLoader sectioned protocol** ✅ (commit `c131084c`)
- **Task 6: ballSort migration** ✅ (commit `430914a5`)
- **Task 7: Regression test all 10 games** ✅ (commit `98b9c80d`)

### Test Results
- **Regression Tests**: 91 tests verifying all 10 existing games load via the sectioned protocol.
- **Migration Tests**: 12 tests verifying the `ballSort` modular bundle compilation.
- **Semantic Tests**: 15 tests verifying cross-reference and cycle detection.
- **Total**: 118 new tests, all passing.

---

## 8. Rollback Procedure

All changes were designed with backward compatibility as a primary constraint.

- **Compatibility**: `loadGameJson` and `GameLoader.load()` remain fully functional.
- **Rollback**: If issues arise with sectioned loading, revert to the monolithic `load()` path.
- **Git Revert**: Commits can be reverted in reverse order of the verification report.

---

## 9. What This Enables (Future)

- **Lazy Loading**: Send scene chunks incrementally to reduce initial load time.
- **Scene Transitions**: `clearEntities` → `loadEntities(newScene)` for seamless world traversal.
- **VN Integration**: Each narrative scene becomes a chunk loaded on demand.
- **Hot Reload**: Recompile a single section (e.g., rules) and update the running game instantly.
- **Incremental AI Generation**: Generate the first scene, start playing, and generate subsequent scenes in the background.
