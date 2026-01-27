# Orphan Games Migration

## Context

### Original Request
"Find all games, figure out why they're not showing up, move all games to same structure, they should all be auto-registered if they're in the right spot, fix all games, they should all be listed if working."

### Interview Summary
**Key Discussions**:
- 23 games exist in proper structure at `app/lib/test-games/games/{gameId}/game.ts`
- 3 orphan JSON files in `app/assets/test-games/` are not detected by registry
- Registry generator scans for `export const metadata` pattern in `lib/test-games/games/`
- User confirmed: delete original JSON files after successful migration

**Research Findings**:
- Exact imports: `@slopcade/shared` for GameDefinition, `@/lib/registry/types` for TestGameMeta
- JSON files have full GameDefinition structure (metadata, world, camera, ui, templates, entities, rules, win/lose conditions)
- Folder name becomes game ID when file is named `game.ts`

### Orphan Files to Migrate

| JSON File | Directory | Title | Description |
|-----------|-----------|-------|-------------|
| `game-1-sports-projectile.json` | `sportsProjectile/` | "Sports projectile" | "A game where I launch balls at stacked blocks to knock them down" |
| `game-2-cats-platformer.json` | `catsPlatformer/` | "Cats platformer" | "A platformer where a cat jumps between clouds to collect stars" |
| `game-3-cats-falling-objects.json` | `catsFallingObjects/` | "Cats falling objects" | "A game where I catch falling apples but avoid the bombs" |

---

## Work Objectives

### Core Objective
Convert 3 orphan JSON game files to TypeScript modules following the canonical pattern so all 26 games appear on the browse page.

### Concrete Deliverables
- `app/lib/test-games/games/sportsProjectile/game.ts` (new)
- `app/lib/test-games/games/catsPlatformer/game.ts` (new)
- `app/lib/test-games/games/catsFallingObjects/game.ts` (new)
- Updated `app/lib/registry/generated/testGames.ts` (regenerated)
- Deleted orphan JSON files from `app/assets/test-games/`

### Definition of Done
- [ ] `pnpm generate:registry` runs without errors
- [ ] `pnpm tsc --noEmit` passes (no type errors)
- [ ] All 26 games appear on browse page at `http://localhost:8085/games`

### Must Have
- Proper TypeScript types (`GameDefinition`, `TestGameMeta`)
- Exact import paths matching existing games
- `export const metadata` named export (required for registry detection)
- `export default game` default export
- All game data preserved from JSON (world, templates, entities, rules, win/lose conditions)

### Must NOT Have (Guardrails)
- Do NOT modify existing 23 games
- Do NOT change registry generator logic
- Do NOT use `any` type or type suppressions
- Do NOT create additional files beyond game.ts per game
- Do NOT add/remove game features - preserve JSON exactly

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (TypeScript compiler + registry generator)
- **User wants tests**: Manual verification (registry regeneration + browse page check)
- **Framework**: None needed - this is a data migration, not logic

### Manual Verification Procedure

1. **Type Check**: `pnpm tsc --noEmit` → no errors
2. **Registry Regeneration**: `pnpm generate:registry` → no errors, registry updated
3. **Visual Verification**: Open `http://localhost:8085/games` → all 26 games visible
4. **Game Load Test**: Click each new game → loads without errors

---

## Task Flow

```
Task 1 (sportsProjectile) ─┬─→ Task 4 (regenerate registry)
Task 2 (catsPlatformer)  ──┤
Task 3 (catsFallingObjects)┘
                              ↓
                           Task 5 (verify all 26 games)
                              ↓
                           Task 6 (delete orphan JSONs)
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 1, 2, 3 | Independent file creation - no dependencies |
| B | 4 | Depends on all of A |
| C | 5 | Depends on 4 |
| D | 6 | Depends on 5 (verification passes) |

---

## TODOs

- [ ] 1. Create sportsProjectile/game.ts

  **What to do**:
  - Create directory `app/lib/test-games/games/sportsProjectile/`
  - Create `game.ts` with proper imports
  - Extract metadata from JSON: title="Sports projectile", description="A game where I launch balls at stacked blocks to knock them down"
  - Convert JSON content to TypeScript GameDefinition object (preserve all data exactly)
  - Add type annotations

  **Must NOT do**:
  - Modify game logic or physics values
  - Add coordinate helper functions unless already in JSON structure
  - Change entity IDs or template names

  **Parallelizable**: YES (with 2, 3)

  **References**:

  **Source File** (JSON to convert):
  - `app/assets/test-games/game-1-sports-projectile.json` - Full game definition (263 lines, projectile/destruction game type)

  **Pattern Reference** (template to follow exactly):
  - `app/lib/test-games/games/flappyBird/game.ts:1-7` - Import statements and metadata export pattern
  - `app/lib/test-games/games/flappyBird/game.ts:24-276` - GameDefinition structure and default export

  **Type References**:
  - `@slopcade/shared` (package) - GameDefinition type
  - `app/lib/registry/types.ts:40-52` - TestGameMeta interface definition

  **Acceptance Criteria**:
  - [ ] File exists at `app/lib/test-games/games/sportsProjectile/game.ts`
  - [ ] Contains `import type { GameDefinition } from "@slopcade/shared";`
  - [ ] Contains `import type { TestGameMeta } from "@/lib/registry/types";`
  - [ ] Contains `export const metadata: TestGameMeta = { title: "Sports projectile", description: "..." };`
  - [ ] Contains `const game: GameDefinition = { ... }` with all JSON content
  - [ ] Contains `export default game;`
  - [ ] `pnpm tsc --noEmit` passes (no type errors in this file)

  **Commit**: NO (batch with tasks 2, 3)

---

- [ ] 2. Create catsPlatformer/game.ts

  **What to do**:
  - Create directory `app/lib/test-games/games/catsPlatformer/`
  - Create `game.ts` with proper imports
  - Extract metadata: title="Cats platformer", description="A platformer where a cat jumps between clouds to collect stars"
  - Convert JSON content to TypeScript GameDefinition object

  **Must NOT do**:
  - Modify game logic, camera settings, or physics values
  - Change entity IDs or template names

  **Parallelizable**: YES (with 1, 3)

  **References**:

  **Source File** (JSON to convert):
  - `app/assets/test-games/game-2-cats-platformer.json` - Full game definition (352 lines, platformer with follow camera)

  **Pattern Reference**:
  - `app/lib/test-games/games/flappyBird/game.ts:1-7` - Import and metadata pattern

  **Type References**:
  - `@slopcade/shared` - GameDefinition
  - `app/lib/registry/types.ts:40-52` - TestGameMeta

  **Acceptance Criteria**:
  - [ ] File exists at `app/lib/test-games/games/catsPlatformer/game.ts`
  - [ ] Proper imports for GameDefinition and TestGameMeta
  - [ ] `export const metadata` with correct title/description
  - [ ] `export default game` with all JSON content
  - [ ] `pnpm tsc --noEmit` passes

  **Commit**: NO (batch with tasks 1, 3)

---

- [ ] 3. Create catsFallingObjects/game.ts

  **What to do**:
  - Create directory `app/lib/test-games/games/catsFallingObjects/`
  - Create `game.ts` with proper imports
  - Extract metadata: title="Cats falling objects", description="A game where I catch falling apples but avoid the bombs"
  - Convert JSON content to TypeScript GameDefinition object

  **Must NOT do**:
  - Modify game logic, spawning rules, or timer values
  - Change entity IDs or template names

  **Parallelizable**: YES (with 1, 2)

  **References**:

  **Source File** (JSON to convert):
  - `app/assets/test-games/game-3-cats-falling-objects.json` - Full game definition (293 lines, falling objects/catcher game type)

  **Pattern Reference**:
  - `app/lib/test-games/games/flappyBird/game.ts:1-7` - Import and metadata pattern

  **Type References**:
  - `@slopcade/shared` - GameDefinition
  - `app/lib/registry/types.ts:40-52` - TestGameMeta

  **Acceptance Criteria**:
  - [ ] File exists at `app/lib/test-games/games/catsFallingObjects/game.ts`
  - [ ] Proper imports for GameDefinition and TestGameMeta
  - [ ] `export const metadata` with correct title/description
  - [ ] `export default game` with all JSON content
  - [ ] `pnpm tsc --noEmit` passes

  **Commit**: YES
  - Message: `feat(games): add 3 migrated games from legacy JSON format`
  - Files: `app/lib/test-games/games/sportsProjectile/game.ts`, `app/lib/test-games/games/catsPlatformer/game.ts`, `app/lib/test-games/games/catsFallingObjects/game.ts`
  - Pre-commit: `pnpm tsc --noEmit`

---

- [ ] 4. Regenerate registry

  **What to do**:
  - Run `pnpm generate:registry`
  - Verify output shows 26 games (was 23)
  - Check `app/lib/registry/generated/testGames.ts` includes new game IDs

  **Must NOT do**:
  - Manually edit generated files
  - Modify registry generator script

  **Parallelizable**: NO (depends on 1, 2, 3)

  **References**:

  **Script to run**:
  - `app/scripts/generate-registry.mjs` - Registry generator (scans for `export const metadata`)

  **Output file to verify**:
  - `app/lib/registry/generated/testGames.ts` - Should contain sportsProjectile, catsPlatformer, catsFallingObjects

  **Acceptance Criteria**:
  - [ ] `pnpm generate:registry` completes without errors
  - [ ] `app/lib/registry/generated/testGames.ts` contains `sportsProjectile`
  - [ ] `app/lib/registry/generated/testGames.ts` contains `catsPlatformer`
  - [ ] `app/lib/registry/generated/testGames.ts` contains `catsFallingObjects`

  **Commit**: YES (registry changes are tracked)
  - Message: `chore: regenerate registry with 3 new games`
  - Files: `app/lib/registry/generated/testGames.ts`

---

- [ ] 5. Verify all 26 games on browse page

  **What to do**:
  - Ensure dev server is running (`pnpm dev`)
  - Navigate to `http://localhost:8085/games`
  - Count total games displayed
  - Verify new games are listed: "Sports projectile", "Cats platformer", "Cats falling objects"
  - Click each new game to verify it loads

  **Must NOT do**:
  - Modify any files during verification
  - Proceed to deletion if count is not 26

  **Parallelizable**: NO (depends on 4)

  **References**:

  **Page to check**:
  - `http://localhost:8085/games` - Game browse page

  **Acceptance Criteria**:
  - [ ] Dev server running at localhost:8085
  - [ ] Navigate to `/games` page
  - [ ] Total game count is 26 (was 23)
  - [ ] "Sports projectile" appears in list → click → game loads
  - [ ] "Cats platformer" appears in list → click → game loads
  - [ ] "Cats falling objects" appears in list → click → game loads

  **Commit**: NO (verification only)

---

- [ ] 6. Delete orphan JSON files

  **What to do**:
  - Delete `app/assets/test-games/game-1-sports-projectile.json`
  - Delete `app/assets/test-games/game-2-cats-platformer.json`
  - Delete `app/assets/test-games/game-3-cats-falling-objects.json`
  - Verify no other files exist in `app/assets/test-games/` (directory may be empty/deletable)

  **Must NOT do**:
  - Delete files before verification passes
  - Delete any other files

  **Parallelizable**: NO (depends on 5 verification passing)

  **References**:

  **Files to delete**:
  - `app/assets/test-games/game-1-sports-projectile.json` (now migrated to `sportsProjectile/game.ts`)
  - `app/assets/test-games/game-2-cats-platformer.json` (now migrated to `catsPlatformer/game.ts`)
  - `app/assets/test-games/game-3-cats-falling-objects.json` (now migrated to `catsFallingObjects/game.ts`)

  **Acceptance Criteria**:
  - [ ] `game-1-sports-projectile.json` deleted
  - [ ] `game-2-cats-platformer.json` deleted
  - [ ] `game-3-cats-falling-objects.json` deleted
  - [ ] `ls app/assets/test-games/` shows no JSON files (or directory is empty)

  **Commit**: YES
  - Message: `chore: remove legacy JSON game files (migrated to TypeScript)`
  - Files: `app/assets/test-games/*.json` (deleted)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 3 | `feat(games): add 3 migrated games from legacy JSON format` | 3 new game.ts files | `pnpm tsc --noEmit` |
| 4 | `chore: regenerate registry with 3 new games` | generated/testGames.ts | `pnpm generate:registry` |
| 6 | `chore: remove legacy JSON game files (migrated to TypeScript)` | 3 deleted JSON files | N/A |

---

## Success Criteria

### Verification Commands
```bash
# Type check
pnpm tsc --noEmit
# Expected: No errors

# Registry regeneration
pnpm generate:registry
# Expected: Completes, shows 26 games

# File structure check
ls app/lib/test-games/games/ | wc -l
# Expected: 26 directories

# Orphan files removed
ls app/assets/test-games/
# Expected: No .json files (or empty directory)
```

### Final Checklist
- [ ] All 3 new game.ts files created with proper structure
- [ ] All imports and exports match canonical pattern
- [ ] Registry regenerated with 26 games
- [ ] All 26 games visible on browse page
- [ ] All 3 new games load without errors
- [ ] Orphan JSON files deleted
- [ ] No type errors (`pnpm tsc --noEmit` passes)
