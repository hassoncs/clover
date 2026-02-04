# Games Package Migration

## TL;DR

> **Quick Summary**: Move all test games to a new top-level `games/` package (`@slopcade/games`), update all consumers (API, Game Inspector MCP, app), and enable support for pre-bundled JSON/JS game definitions that can be loaded by the game engine.
> 
> **Deliverables**:
> - `games/` package with all TypeScript game definitions
> - Support for `.bundle/` directories with pre-compiled JSON/JS
> - API live-scans games, bundles them, serves via `/test-games/:id` endpoint
> - Game Inspector MCP updated to use new package
> - All references to old `app/lib/test-games/` path removed
> 
> **Estimated Effort**: Medium (~1 day)
> **Parallel Execution**: YES - 3 waves

---

## Context

### Current State (What We've Done)

1. **Created `games/` directory** at project root
2. **Moved games** from `app/lib/test-games/games/` to `games/`:
   - `ballSort/` - Ball sorting puzzle with levels
   - `breakoutBouncer/` - Breakout with bouncing mechanics
   - `breakoutScripted/` - Scripted breakout variant
   - `flappyBird/` - Flappy Bird clone
   - `gemCrush/` - Match-3 style game
   - `slopeggle/` - Peggle-style physics game
3. **Created package structure**:
   - `games/package.json` - `@slopcade/games` workspace package
   - `games/src/registry.ts` - Game registry with dynamic imports
   - `games/src/index.ts` - Package exports
   - `games/tsconfig.json` - TypeScript config
4. **Updated API templateLoader** to import from `@slopcade/games`

### What Still Needs Work

| Component | Status | Issue |
|-----------|--------|-------|
| pnpm workspace | NOT REGISTERED | `games/` not in `pnpm-workspace.yaml` |
| API imports | BROKEN | Cannot resolve `@slopcade/games` |
| Game Inspector MCP | BROKEN | Still references `app/lib/test-games/games` |
| Old game.ts imports | BROKEN | Reference `../../../registry/types` which no longer exists |
| Bundle support | NOT IMPLEMENTED | Games should support `.bundle/` directories |
| API bundling | NEEDS UPDATE | Should compile TypeScript games to GameDefinition |

---

## Work Objectives

### Core Objective
Create a standalone `@slopcade/games` package that:
1. Contains all TypeScript game definitions
2. Exports a registry for discovering/loading games
3. Supports optional `.bundle/` directories for pre-compiled games
4. Can be imported by API, app, and Game Inspector MCP

### Concrete Deliverables
- `pnpm-workspace.yaml` updated with `games` package
- All game `game.ts` files fixed to not import from app paths
- `games/src/registry.ts` working with dynamic imports
- `packages/game-inspector-mcp/src/registry.ts` using new path
- API serving games from `@slopcade/games`
- Support for bundled JSON/JS game definitions

### Definition of Done
- [ ] `pnpm install` succeeds
- [ ] `pnpm --filter @slopcade/games tsc --noEmit` passes
- [ ] `pnpm --filter @slopcade/api tsc --noEmit` passes
- [ ] Game Inspector MCP can list/open all games
- [ ] `curl localhost:8789/test-games` returns list of games
- [ ] Opening any game in browser works

---

## TODOs

### WAVE 1: Package Setup (Foundation)

- [ ] 1. Register games package in pnpm workspace

  **What to do**:
  1. Add `'games'` to `pnpm-workspace.yaml` packages list
  2. Run `pnpm install` to link the package
  3. Verify `@slopcade/games` is resolvable

  **Acceptance Criteria**:
  - [ ] `pnpm install` completes without error
  - [ ] `pnpm list -r | grep @slopcade/games` shows package

---

- [ ] 2. Fix game.ts import paths

  **What to do**:
  1. Remove broken imports from `games/ballSort/game.ts`:
     - `import type { TestGameMeta } from "../../../registry/types"` - DELETE this, TestGameMeta not needed
  2. Ensure all games only import from `@slopcade/shared`
  3. Verify each game.ts exports:
     - `default` - GameDefinition
     - `metadata` (optional) - { title, description }
     - `createLevelGame` (optional) - For level-based games like ballSort

  **Files to check**:
  - `games/ballSort/game.ts`
  - `games/breakoutBouncer/game.ts`
  - `games/breakoutScripted/game.ts`
  - `games/flappyBird/game.ts`
  - `games/gemCrush/game.ts`
  - `games/slopeggle/game.ts`

  **Acceptance Criteria**:
  - [ ] No imports reference `../../../registry/` or other app paths
  - [ ] All games export `default: GameDefinition`
  - [ ] `pnpm --filter @slopcade/games tsc --noEmit` passes

---

- [ ] 3. Add metadata exports to all games

  **What to do**:
  1. Each game.ts should export metadata for the registry:
     ```typescript
     export const metadata = {
       title: "Ball Sort",
       description: "Sort colored balls into tubes"
     };
     ```
  2. This allows the registry to show titles without loading full game

  **Acceptance Criteria**:
  - [ ] All 6 games export `metadata` object

---

### WAVE 2: Consumer Updates

- [ ] 4. Update Game Inspector MCP registry

  **What to do**:
  1. Update `packages/game-inspector-mcp/src/registry.ts`:
     - Change `gamesDir` from `app/lib/test-games/games` to `games`
  2. Update `packages/game-inspector-mcp/src/utils.ts`:
     - Update URL patterns if needed
  3. Update `packages/game-inspector-mcp/src/cli.ts`:
     - Update any hardcoded paths

  **Acceptance Criteria**:
  - [ ] `discoverTestGames()` returns all 6 games
  - [ ] Game paths resolve correctly

---

- [ ] 5. Fix API templateLoader imports

  **What to do**:
  1. Verify `api/src/dev/templateLoader.ts` correctly imports from `@slopcade/games`
  2. Add `@slopcade/games` to `api/package.json` dependencies:
     ```json
     "dependencies": {
       "@slopcade/games": "workspace:*"
     }
     ```
  3. Ensure the test games API endpoint works

  **Acceptance Criteria**:
  - [ ] `pnpm --filter @slopcade/api tsc --noEmit` passes
  - [ ] API can load games via `getTestGameAsync()`

---

- [ ] 6. Delete old test-games references and files

  **What to do**:
  1. Delete `api/scripts/sync-templates.ts` (references old path)
  2. Remove any remaining `test-games.json` files
  3. Update `app/lib/registry/index.ts` if it exports test game types
  4. Delete `app/lib/registry/types.ts` if only used for test games (already gone based on grep)
  5. Search and remove any remaining references:
     ```bash
     grep -r "test-games" --include="*.ts" . | grep -v node_modules | grep -v games/
     ```

  **Acceptance Criteria**:
  - [ ] No references to old `app/lib/test-games/` path remain
  - [ ] No broken imports in codebase

---

### WAVE 3: Bundle Support (Future-Proofing)

- [ ] 7. Add bundle loading support to games package

  **What to do**:
  1. Update `games/src/registry.ts` to support two loading modes:
     - TypeScript mode (current): Dynamic import of `game.ts`
     - Bundle mode: Load from `.bundle/` directory if it exists
  2. Add helper function:
     ```typescript
     export async function loadGameFromBundle(gameId: string): Promise<GameEntry | null> {
       // Check if .bundle/ directory exists
       // If so, use compileBundle() from @slopcade/shared
       // Otherwise fall back to TypeScript import
     }
     ```
  3. This prepares for AI-generated pre-bundled games

  **Structure for bundled games**:
  ```
  games/
  ├── ballSort/
  │   ├── game.ts           # TypeScript definition (source of truth)
  │   └── .bundle/          # Optional pre-compiled bundle
  │       ├── manifest.json
  │       ├── templates/
  │       ├── entities/
  │       ├── rules/
  │       └── scripts/      # Optional JS scripts
  ```

  **Acceptance Criteria**:
  - [ ] Games with only `game.ts` still work
  - [ ] Games with `.bundle/` directory can be loaded
  - [ ] Bundle compilation uses `@slopcade/shared` compileBundle

---

- [ ] 8. Add bundle compilation option to games package

  **What to do**:
  1. Create `games/scripts/compile-bundles.ts`:
     ```typescript
     // Compiles TypeScript games to .bundle/ format
     // Useful for:
     // - Performance (pre-compiled)
     // - Testing bundle format
     // - Generating examples for AI
     ```
  2. Add to `games/package.json`:
     ```json
     "scripts": {
       "compile": "tsx scripts/compile-bundles.ts"
     }
     ```

  **Acceptance Criteria**:
  - [ ] `pnpm --filter @slopcade/games compile` generates bundles
  - [ ] Generated bundles can be loaded by the engine

---

## Verification Commands

```bash
# 1. Package registration
pnpm install
pnpm list -r | grep @slopcade/games

# 2. TypeScript compilation
pnpm --filter @slopcade/games tsc --noEmit
pnpm --filter @slopcade/api tsc --noEmit

# 3. No old references
grep -r "app/lib/test-games" --include="*.ts" . | grep -v node_modules
# Should return empty

# 4. Game Inspector can discover games
# (Test after MCP is updated)

# 5. API serves games
curl http://localhost:8789/test-games
# Should return list of games
```

---

## File Summary

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `pnpm-workspace.yaml` | MODIFY | Add `games` to packages |
| `games/ballSort/game.ts` | MODIFY | Remove broken imports |
| `games/*/game.ts` | MODIFY | Add metadata exports |
| `api/package.json` | MODIFY | Add `@slopcade/games` dependency |
| `packages/game-inspector-mcp/src/registry.ts` | MODIFY | Update games path |
| `packages/game-inspector-mcp/src/utils.ts` | MODIFY | Update URL patterns |
| `games/scripts/compile-bundles.ts` | CREATE | Bundle compiler script |

### Files to Delete

| File | Reason |
|------|--------|
| `api/scripts/sync-templates.ts` | References old test-games path |
| Any `.bundle/` dirs in `games/` | Will be regenerated if needed |

---

## Success Criteria

1. **Package Works**: `@slopcade/games` is a proper workspace package
2. **TypeScript Passes**: All packages compile without errors
3. **Games Load**: API can serve all 6 games
4. **MCP Works**: Game Inspector can discover and open games
5. **No Legacy**: Zero references to old `app/lib/test-games/` path
6. **Future Ready**: Bundle loading infrastructure in place
