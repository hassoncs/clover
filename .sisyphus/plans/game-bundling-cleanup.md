# Game Bundling Pipeline — Cleanup & Simplification

## The Problem (in plain terms)

Every game in `r2/games/` has source files (`manifest.json`, `scripts/`, `prefabs/`, `entities/`) AND a pre-baked `definition.json`. These are supposed to mean the same thing, but nobody compiles source → definition automatically. So they drift apart. The source files are the truth but nothing reads them at runtime. The `definition.json` is what the app actually loads but it's manually maintained.

Meanwhile, we have a perfectly good bundler (`@slopcade/game-bundler`) that knows how to compile source files → GameDefinition. And we have `game-registry.ts` that calls the bundler on `r2/games/`. But nothing in the app imports `game-registry.ts`. It's dead code.

The result: a Rube Goldberg machine where 3 systems exist for the same job and none of them are connected.

## The Fix (straightforward)

**One build script. One source format. One output.**

```
Source files          →  Build step           →  definition.json (output)
manifest.json            compileBundle()          ↓
scripts/*.js                                      sync to R2
prefabs/*.json                                    ↓
entities/*.json                                   API reads it
effects.json                                      ↓
                                                  App plays it
```

The `games-watcher` devmux service already watches `r2/games/` and syncs to R2. We just add a compile step before the sync. That's it. No new services, no new abstractions.

## Current Mess → Clean State

### What exists today

| Thing | What it does | Status |
|-------|-------------|--------|
| `@slopcade/game-bundler` compileBundle() | Reads source files → GameDefinition | ✅ Works but has a bug: doesn't assign scripts to `modules` |
| `api/src/lib/game-registry.ts` | Calls compileBundle on r2/games/ | ❌ Dead code, nothing imports it |
| `api/scripts/sync-r2.ts` | Dumb file copy from r2/ to local R2 bucket | ✅ Works but no compilation |
| `packages/game-bundler/scripts/build-games.ts` | Compiles TypeScript games from `games/` dir | ❌ Dead code, `games/` dir doesn't exist |
| `r2/games/*/definition.json` | Hand-maintained baked game definitions | ⚠️ Gets stale |
| `r2/games/ballSort/bundle/` | Old migration artifact | ❌ Stale, confusing |
| `compileBundle()` JSON scanner | Recursively scans ALL .json including definition.json, metadata.json, bundle/ | ⚠️ Processes garbage silently |

### What we're building

| Thing | What it does |
|-------|-------------|
| `api/scripts/build-and-sync-r2.ts` | For each game: compile source → write definition.json + metadata.json → sync to R2 |

That's the only new file. Everything else is deletion or small fixes.

### What we're deleting

| Thing | Why |
|-------|-----|
| `api/src/lib/game-registry.ts` | Dead code. Compile logic moves into the build script. |
| `packages/game-bundler/scripts/build-games.ts` | Dead code. The `games/` directory it targets doesn't exist. |
| `r2/games/ballSort/bundle/` | Stale migration artifact. Confuses the compiler (it processes files from it). |
| `r2/games/*/definition.json` (from git) | Becomes a build output, gitignored. Still on disk, just not source-controlled. |
| `r2/games/*/metadata.json` (from git) | Same — derived from manifest.json, doesn't need to be hand-maintained. |

---

## Implementation Plan

### Phase 1: Fix the compiler (2 small changes)

**1a. Make compileBundle() produce complete GameDefinitions**

File: `packages/game-bundler/src/compiler.ts` (~line 842)

Right now, `compileBundle()` reads scripts into `rawData.scripts` but doesn't put them on `gameDefinition.modules`. The caller has to do it manually. This is surprising and error-prone.

Fix: after the effects assignment block, add:
```typescript
if (rawData.scripts != null && Object.keys(rawData.scripts).length > 0) {
    gameDefinition.modules = rawData.scripts;
}
```

Now `compileBundle()` returns a GameDefinition that actually has the scripts in it. No post-processing needed by the caller.

**1b. Make the JSON scanner skip known output files**

File: `packages/game-bundler/src/compiler.ts` (in `scanForJsonFiles` or in the processing loop)

The scanner recursively finds ALL `.json` files, including `definition.json`, `metadata.json`, and files in subdirectories like `bundle/`. These are either build outputs or stale artifacts. They should be skipped.

Add a skip list for the processing loop:
```typescript
const IGNORED_FILES = new Set(["definition.json", "metadata.json"]);
// ... in the loop:
if (IGNORED_FILES.has(relativePath)) continue;
```

And skip known non-source subdirectories:
```typescript
const IGNORED_DIRS = new Set(["bundle", "lib", "node_modules"]);
// ... in scanForJsonFiles:
if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue;
```

**1c. Run existing tests, fix any that break**

```bash
pnpm --filter @slopcade/game-bundler test
```

The `ballsort-migration.test.ts` points at `r2/games/ballSort/bundle` — update it to point at the real source dir `r2/games/ballSort`, and update the expected metadata.id from `"ballSort"` to the UUID.

### Phase 2: Delete stale artifacts

**2a. Delete `ballSort/bundle/` directory**

```bash
rm -rf r2/games/ballSort/bundle/
```

This is an old migration artifact. The real source files live at the root level. With Phase 1b's ignore list, this would be skipped anyway, but it's cleaner to just delete it.

**2b. Delete dead code**

- Delete `api/src/lib/game-registry.ts` — nothing imports it
- Delete `packages/game-bundler/scripts/build-games.ts` — targets a `games/` dir that doesn't exist

### Phase 3: Build the compile-and-sync script

**3a. Replace `sync-r2.ts` with `build-and-sync-r2.ts`**

File: `api/scripts/sync-r2.ts` → rename/rewrite to make the name match what it does

New logic (pseudocode):
```
function buildGames():
    for each dir in r2/games/:
        if has manifest.json:
            result = compileBundle(dir)
            if result.success:
                write definition.json to dir
                write metadata.json to dir (derived from result.gameDefinition.metadata)
            else:
                log errors, skip
        else if has definition.json (legacy standalone):
            derive metadata.json from definition.json if missing
        else:
            skip

function syncToR2():
    // existing sync logic — walk all files, hash, upload changed ones

// Main:
buildGames()
syncToR2()

// Watch mode:
watch r2/games/ for changes:
    ignore definition.json, metadata.json changes (they're outputs)
    on source file change: buildGames() then syncToR2()
```

This is intentionally one flat script. No abstractions, no registries, no caches. Read source files → write outputs → sync. You can read it top to bottom and understand what happens.

**3b. Update devmux.config.json**

Change the `games-watcher` command to use the new script name (if renamed).

**3c. Add content types for `.js` and `.ts`**

In the sync script's `contentTypeForExt()`:
```typescript
case ".js": return "application/javascript";
case ".ts": return "text/typescript";
case ".mp3": return "audio/mpeg";
case ".wav": return "audio/wav";
```

### Phase 4: Gitignore build outputs

**4a. Create `r2/games/.gitignore`**

```gitignore
# Build outputs — generated by games-watcher from source files.
# Edit manifest.json, scripts/, prefabs/, entities/ instead.
**/definition.json
**/metadata.json

# Exception: legacy games that only have definition.json as source
!crowd-comedy/definition.json
!firstPersonExplorer/definition.json
!question-answer/definition.json
```

**4b. Remove build outputs from git tracking**

```bash
git rm --cached r2/games/*/definition.json r2/games/*/metadata.json
# Re-add the 3 legacy exceptions
git add r2/games/crowd-comedy/definition.json
git add r2/games/firstPersonExplorer/definition.json
git add r2/games/question-answer/definition.json
```

The files stay on disk (the build step regenerates them), they just aren't source-controlled anymore.

### Phase 5: Handle the 3 legacy standalone games

`crowd-comedy` (43 lines), `firstPersonExplorer` (248 lines), `question-answer` (33 lines) — these only have `definition.json`, no source files. Two options:

**Option A (recommended): Leave them as-is for now.** They're small, simple, and work fine. The build script already handles them (the "else if has definition.json" branch just passes through). The `.gitignore` exceptions keep them tracked. Convert them to bundle format later if/when they need editing.

**Option B: Convert to bundle format.** Extract manifest.json, prefabs/, entities/, scripts/ from each definition.json. More work, more risk, no immediate benefit.

### Phase 6: Testing & Verification

**6a. Add a "compile all games" test**

File: `packages/game-bundler/src/__tests__/compile-all-r2-games.test.ts`

```typescript
// For every game in r2/games/ that has manifest.json:
//   - compileBundle() succeeds with no errors
//   - gameDefinition has metadata.title
//   - games with scripts/ have gameDefinition.modules
```

This catches regressions across all 22 bundle-format games.

**6b. Verify end-to-end**

1. Restart `games-watcher` → verify it compiles all games and syncs
2. Open ballSort in browser → verify it loads and plays (tap to pick up ball, tap to drop)
3. Edit `r2/games/ballSort/scripts/main.js` (trivial change) → verify `definition.json` auto-updates → verify game reflects change
4. Run `pnpm test` and `pnpm typecheck`

**6c. Update ballsort-migration test**

Point it at the real source dir, update expected values.

### Phase 7: Docs & Skills

**7a. Update `game-authoring/bundling-and-shaders` skill**

- Remove the note about `definition.json` being something you edit
- Add: "`definition.json` is auto-generated. Edit source files instead."
- Update the Build Pipeline section to describe the new compile-and-sync flow

**7b. Update AGENTS.md**

Add under "Established Patterns":
```
### Game Source Files (r2/games/)
Games are authored as directories of source files. `definition.json` and `metadata.json` are
auto-generated build outputs — never edit them directly. Edit manifest.json, scripts/, prefabs/,
entities/ instead. The games-watcher service recompiles on change.
```

---

## Order of Execution

| # | Phase | Risk | Files |
|---|-------|------|-------|
| 1 | Fix compiler (modules + ignore list) | Low — isolated, has tests | `compiler.ts` |
| 2 | Delete stale artifacts | Zero — removing dead code | `game-registry.ts`, `build-games.ts`, `ballSort/bundle/` |
| 3 | Build compile-and-sync script | Medium — core change | `sync-r2.ts` (rewrite) |
| 4 | Gitignore build outputs | Low — git-only change | `.gitignore`, git rm --cached |
| 5 | Legacy games | Zero — leave as-is (option A) | Nothing |
| 6 | Testing | Low — verification only | New test file, existing tests |
| 7 | Docs | Zero | Skill files, AGENTS.md |

**Total: ~4 files modified, ~3 files deleted, ~2 new files. No new abstractions.**

---

## What This Gets Us

**Before:** 3 separate systems (game-registry, game-bundler, sync-r2) that don't talk to each other. `definition.json` is manually maintained and drifts from source files. New developer opens the code and has to trace through dead-code paths to understand what's actually used.

**After:** One build script that does one thing: compile source files → write outputs → sync to R2. You look at `games-watcher` in devmux.config.json, you see the script, you open it, you read it top to bottom, you understand the entire pipeline. No dead code, no magic, no registries, no caches.
