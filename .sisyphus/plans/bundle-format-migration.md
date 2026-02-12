# Bundle Format Migration Plan

Migrate all pre-made games from TypeScript (`src/game.ts`) to the JSON bundle format (`manifest.json` + directories), wire the bundle format into the build/registry pipeline, and write shader demo games.

## Wave 0: Contract Alignment

### T0.1 Fix `templates` → `prefabs` in game-bundler
- `packages/game-bundler/src/compiler.ts` returns `templates:` but `GameDefinition` uses `prefabs:`
- Update `buildGameDefinition()` to return `prefabs:` field
- Update `BundleSections` type to use `prefabs:`
- Update `compileSectioned()` to reference `prefabs`
- Fix all bundler tests to use `prefabs`
- **The bundle directory still uses `templates/` as the folder name** (maps to `prefabs` in output)

### T0.2 Add effects support to bundler compiler
- Add `effects.json` file support in `compileBundle()`
- Parse it into `gameDefinition.effects`
- Handle `effects.shaders` shape: `Record<string, { filename: string; glsl: string }>`

**Gate G0**: bundler tests pass with `prefabs` field and effects support

## Wave 1: Infrastructure (dual-path)

### T1.1 Update game-registry for bundle format
- Modify `api/src/lib/game-registry.ts` to detect both formats:
  - Bundle: directory has `manifest.json`
  - TS (temporary): directory has `src/game.ts`
- For bundle games, use `compileBundle()` from `@slopcade/game-bundler`

### T1.2 Update build-games.ts for bundle format
- For bundle games: compile via `compileBundle()`, handle scripts from `scripts/*.js`
- For TS games (temporary): existing `loadGame()` path
- Keep seed/sync behavior

**Gate G1**: both formats build and sync to local R2

## Wave 2: Convert all 10 games

Split into parallel groups:
- **A**: ballSort, snake, tweenToggleCube (scripted)
- **B**: slopeggle (complex scripted)
- **C**: breakoutBouncer, flappyBird, gemCrush
- **D**: minefield, mrPotatoHead, sokoban

Each game gets: `manifest.json`, `templates/all.json`, `entities/initial.json`, `rules/gameplay.json`, optional `scripts/main.js`

**Gate G2**: all games produce valid definition.json via bundle path

## Wave 3: Remove legacy TS path

- Update game-registry to bundle-only
- Remove/deprecate ts-compiler.ts
- Delete all `src/game.ts` files
- Update tests

**Gate G3**: no TS game code remains, pipeline works bundle-only

## Wave 4: Shader demo games

- shaderRainbow: rainbow sine wave via effects.shaders
- shaderCRT: CRT post-process screen effect
- shaderMulti: multiple shaders on different entities

**Gate G4**: shader demos load and render

## Wave 5: Final verification
- Full build pipeline
- TypeScript check
- Manual browser test
