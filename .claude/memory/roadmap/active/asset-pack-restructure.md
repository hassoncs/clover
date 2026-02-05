# Asset Pack Restructure Plan

> **Status:** Ready to implement  
> **Created:** 2025-02-05  
> **Scope:** Restructure how compiled game asset packs are stored, built, and resolved at runtime.

---

## Problem Statement

The current asset system has several issues:

1. **Misleading directory name**: `generated/` under compiled games implies runtime generation, but these are pre-authored asset packs
2. **Redundant nesting**: `generated/ballSort/` inside the `ballSort/` game directory
3. **UUID-only filenames**: Compiled packs use UUID filenames that are unreadable in source control
4. **No multi-pack support**: Build pipeline discovers one flat blob of PNGs, doesn't understand pack boundaries
5. **`generated/` baked into R2 keys**: The R2 prefix `generated/` is unnecessary — packId is globally unique
6. **`activePackId` encodes gameId**: Values like `"ballSort-default"` are redundant since gameId is already known

## Target State

### R2 Key Pattern

```
OLD: generated/{gameId}/{packId}/{assetId}.png
NEW: {packId}/{assetId}.png
```

No prefix. PackId (UUID) is globally unique, so gameId is unnecessary in the path.

### Local Directory Layout

```
games/compiled/{gameId}/
  game.ts
  packs/
    default/                    # Human-readable directory name
      manifest.json             # Contains stable UUID packId
      cube.png                  # Human-readable filenames
    neon/                       # Optional alternative pack
      manifest.json
      neon-cube.png
```

### Manifest Schema (v1)

```json
{
  "version": 1,
  "packId": "f661beb6-1e5e-4b9e-a01f-314c87248b75",
  "name": "default",
  "assets": {
    "cube": {
      "file": "cube.png"
    }
  }
}
```

- **`version`**: Schema version for future-proofing
- **`packId`**: Stable UUID, generated once, committed to git. Never changes across builds.
- **`name`**: Human-readable name, matches directory name
- **`assets`**: Maps `templateId` → `{ file }`. Build script constructs R2 keys at build time.

### `activePackId` Convention

Game definitions use human-readable pack names:
```typescript
assetSystem: { activePackId: "default" }
```

The build pipeline resolves `"default"` → UUID from `packs/default/manifest.json` and embeds the UUID into the output game JSON. Runtime only sees UUIDs.

---

## Files to Change

### 1. Core (shared package)

#### `shared/src/utils/asset-url.ts`
- Remove `R2_PREFIX = 'generated/'`
- Change `buildR2Key(gameId, packId, assetId)` → `buildR2Key(packId, assetId)` returning `{packId}/{assetId}.png`
- Remove `isR2Key()` function (relied on the `generated/` prefix to detect R2 keys)
- Update `getAssetUrl()` if needed (should still work — just prepends CDN base to the key)

**Current code:**
```typescript
const R2_PREFIX = 'generated/';
export function buildR2Key(gameId: string, packId: string, assetId: string): string {
  return `${R2_PREFIX}${gameId}/${packId}/${assetId}.png`;
}
export function isR2Key(value: string): boolean {
  return value.startsWith(R2_PREFIX);
}
```

**New code:**
```typescript
export function buildR2Key(packId: string, assetId: string): string {
  return `${packId}/${assetId}.png`;
}
```

#### `shared/src/utils/__tests__/asset-url.test.ts`
- Update all test expectations from `generated/g1/p1/a1.png` to `p1/a1.png`
- Remove `isR2Key` tests

#### `shared/src/utils/definition-resolver.ts`
- Update `buildR2Key` call: remove `gameId` parameter (line 19)
- The function `resolveAssetReference` takes `gameId` and `packId` — drop `gameId` from the `buildR2Key` call

### 2. Games Package (build pipeline)

#### `games/scripts/build.ts` — Major rewrite

**`discoverAssets(gameId)`** → **`discoverPacks(gameId)`**

Old behavior: Looks for `assets/` then `generated/` dir, returns flat list of PNGs.

New behavior:
1. Look for `games/compiled/{gameId}/packs/`
2. Scan subdirectories for `manifest.json`
3. Parse each manifest → extract `packId`, `name`, asset map
4. Return `PackInfo[]`:
```typescript
interface PackInfo {
  name: string;           // Directory name (e.g., "default")
  packId: string;         // UUID from manifest
  manifestPath: string;   // Full path to manifest.json
  assets: Record<string, { file: string; fullPath: string }>;
}
```

**`copyGameAssets()`** → pack-aware

Old behavior: Copies all PNGs into flat `assets/` dir under embed output.

New behavior:
1. For each pack, copy its assets to `app/assets/embedded-games/{gameId}/packs/{packName}/`
2. Generate a combined `packs-manifest.json` per game:
```json
{
  "packs": {
    "default": {
      "packId": "f661beb6-...",
      "assets": {
        "cube": {
          "file": "packs/default/cube.png",
          "r2Key": "f661beb6-.../some-asset-uuid.png"
        }
      }
    }
  }
}
```

**`generateEmbeddedRegistry()`** → multi-pack aware

Old behavior: Emits one `EMBEDDED_ASSET_MANIFESTS` entry per game and flat `EMBEDDED_ASSETS` require calls.

New behavior:
- Emit per-game, per-pack `require()` calls
- Structure: `EMBEDDED_ASSETS['gameId/packName/file.png']`

**`activePackId` resolution** — New step in build

When writing the game JSON to embedded output:
1. Read game definition's `activePackId` (e.g., `"default"`)
2. Look up pack named `"default"` from discovered packs
3. Replace `activePackId` with the pack's UUID in the output JSON
4. Runtime never sees the human-readable name

#### `games/compiled/ballSort/` — Migration

Current structure:
```
ballSort/
  generated/
    ballSort/
      f661beb6-1e5e-4b9e-a01f-314c87248b75/
        manifest.json       # { "tube": { "file": "assets/tube.png", "r2Key": "generated/ballSort/f661.../uuid.png" } }
        2c3ff5e6-....png    # UUID filenames
        ...
```

New structure:
```
ballSort/
  packs/
    default/
      manifest.json         # { "version": 1, "packId": "f661beb6-...", "name": "default", "assets": { "tube": { "file": "tube.png" }, ... } }
      tube.png              # Human-readable filename (renamed from UUID)
      tubeHoverHighlight.png
      ball0.png
      ball1.png
      ...
```

Steps:
1. Create `packs/default/`
2. Copy each PNG, renaming from UUID to human-readable name (use templateId from old manifest)
3. Create new `manifest.json` with `version: 1`, `packId` (keep existing UUID), mapped assets
4. Delete old `generated/` directory

#### All game definitions — Update `activePackId`

Every game currently has:
```typescript
assetSystem: { activePackId: "ballSort-default" }  // or "pong-default", etc.
```

Change to:
```typescript
assetSystem: { activePackId: "default" }
```

Games affected (16 total):
- `asteroids`, `ballSort`, `breakoutBouncer`, `chess`, `flappyBird`, `game2048`, `gemCrush`, `minefield`, `pacman`, `pong`, `simon`, `slopeggle`, `snake`, `sokoban`, `spaceInvaders`, `tetris`

#### `games/compiled/simple/game.ts`
Add:
```typescript
assetSystem: { activePackId: "default" },
```

### 3. API (asset generation)

#### `api/src/ai/assets.ts` (line ~980)

Current fallback R2 key construction:
```typescript
r2Key = `generated/${entityType}/${assetId}${fileSuffix}${extension}`;
```

Change to (uses pack context or falls back to a simple path):
```typescript
r2Key = `${entityType}/${assetId}${fileSuffix}${extension}`;
```

The `buildR2Key` call on line 977 will automatically use the new signature.

#### `api/src/ai/pipeline/stages/index.ts` (uploadR2Stage)
- Already uses `buildR2Key(run.meta.gameId, run.meta.packId, run.meta.assetId)` → update call to `buildR2Key(run.meta.packId, run.meta.assetId)`

#### `api/src/trpc/routes/asset-system.ts`
- Uses `buildR2Key` — will get new signature automatically. Search for all `buildR2Key` calls and update.

#### `api/src/ai/__tests__/scenario-integration.test.ts` (line 170)
- Update assertion from `expect(result.r2Key).toContain('generated/character/')` to new pattern

### 4. App (runtime)

#### `app/lib/offline/download-manager.ts`
- Update comments/doc strings from `generated/{gameId}/{packId}/*.png` to `{packId}/*.png`
- Update any path construction that prepends `generated/`

#### `app/lib/offline/local-asset-server.ts`
- Update doc strings and path comments
- `getLocalAssetPath()` — r2Key no longer has `generated/` prefix, so the path concatenation changes

### 5. Files to DELETE

| File | Reason |
|------|--------|
| `api/scripts/manual-asset-test.ts` | Standalone test with self-contained Scenario client. Not referenced by anything. |
| `api/scripts/restructure-local-assets.ts` | One-time migration script. Already executed. Superseded by this restructure. |

---

## Implementation Order

### Phase 1: Core type changes
1. Update `shared/src/utils/asset-url.ts` — new `buildR2Key` signature, remove `isR2Key`
2. Update `shared/src/utils/asset-url.test.ts` — fix tests
3. Update `shared/src/utils/definition-resolver.ts` — fix `buildR2Key` call
4. Find and fix ALL callers of `buildR2Key` across the monorepo (api, app)

### Phase 2: Migrate ballSort assets
1. Create `games/compiled/ballSort/packs/default/`
2. Rename UUID PNGs to human-readable names using old manifest mapping
3. Create new `manifest.json` (v1 schema)
4. Delete `games/compiled/ballSort/generated/`

### Phase 3: Update all game definitions
1. Change `activePackId` from `"{game}-default"` to `"default"` in all 16 games
2. Add `assetSystem: { activePackId: "default" }` to `simple/game.ts`

### Phase 4: Rewrite build pipeline
1. Rewrite `discoverAssets()` → `discoverPacks()` in `games/scripts/build.ts`
2. Rewrite `copyGameAssets()` for per-pack copying
3. Rewrite `generateEmbeddedRegistry()` for multi-pack support
4. Add `activePackId` resolution (name → UUID) at build time

### Phase 5: Update API asset generation
1. Update `api/src/ai/assets.ts` — remove `generated/` fallback prefix
2. Update `api/src/ai/pipeline/stages/index.ts` — fix `buildR2Key` calls
3. Update `api/src/trpc/routes/asset-system.ts` — fix `buildR2Key` calls
4. Update tests

### Phase 6: Update app runtime
1. Update `app/lib/offline/download-manager.ts` — paths and comments
2. Update `app/lib/offline/local-asset-server.ts` — paths and comments

### Phase 7: Cleanup
1. Delete `api/scripts/manual-asset-test.ts`
2. Delete `api/scripts/restructure-local-assets.ts`
3. Run full build: `pnpm build` in games package
4. Verify embedded registry looks correct
5. Type check: `pnpm tsc --noEmit`

---

## Verification Checklist

- [ ] `shared/src/utils/asset-url.ts` — `buildR2Key` takes 2 params, no prefix
- [ ] All `buildR2Key` callers updated (grep for old 3-param signature)
- [ ] `ballSort/packs/default/manifest.json` exists with v1 schema and stable UUID
- [ ] `ballSort/generated/` directory deleted
- [ ] All 16+ games have `activePackId: "default"`
- [ ] `games/scripts/build.ts` discovers `packs/` directories
- [ ] Build produces correct `embedded-games-registry.ts`
- [ ] `pnpm build` succeeds in games package
- [ ] `pnpm tsc --noEmit` passes across monorepo
- [ ] Deleted: `api/scripts/manual-asset-test.ts`
- [ ] Deleted: `api/scripts/restructure-local-assets.ts`

---

## Key Design Decisions

1. **R2 key format**: `{packId}/{assetId}.png` — flat, no prefix, no gameId
2. **Pack identity**: Always has a UUID (`packId`). Optionally has a human-readable `name`. Compiled packs use names for directories; UUIDs are in manifests.
3. **`activePackId` in game definitions**: Uses human-readable name (`"default"`). Build pipeline resolves to UUID for runtime.
4. **Manifest versioning**: `"version": 1` field for future-proofing
5. **Stable UUIDs**: Pack UUIDs are generated once and committed to git. Never regenerated across builds.
6. **No production data**: We're still in development, so changing R2 paths has zero migration cost.
