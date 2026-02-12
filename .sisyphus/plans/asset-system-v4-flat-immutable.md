# Storage V4: Git for Text, Content-Addressed Store for Binaries

## Status: DRAFT — Needs review before implementation

## The Vision

Every game is a **project directory** with two kinds of files:
- **Text files** (JSON definitions, scripts, configs) → versioned with **Git semantics** (commits, branches, forks, history)
- **Binary files** (images, sounds, shaders) → stored as **immutable, content-addressed blobs** shared across all games

This is the same split Git LFS uses: text in the tree, binaries out-of-band by hash. Forking a game = Git fork. The forked repo still points at the same binary assets until you regenerate/replace them.

## What We Have Today

The codebase is already halfway there:

| Concept | Current State | Target State |
|---------|--------------|--------------|
| Game files | `workspace/` dir in R2 with conventions (`slopcade.json`, `world.json`, `prefabs/*.json`, `scripts/*.js`) | Same files, but Git-versioned |
| Versioning | FNV1a64 hash of directory state; snapshot blobs in `versions/` | Git commit graph in D1 + tree objects in R2 |
| Forking | Copy `definition.json`, set `forked_from_id` | `git clone` (new ref, same objects) |
| Assets | Scattered across `packs/{remixId}/`, URLs in JSON blobs | Flat `blobs/{hash}` in R2, referenced by hash from text files |
| Asset references | 6 different fields (`url`, `imageUrl`, `assetUrl`, `assetRef`, `r2Key`, `localPath`) | One field: `assetId` everywhere |
| Rollback | `ArtifactManager` swaps version snapshots | `git checkout {commitSha}` |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    R2 Bucket                          │
│                                                       │
│  blobs/                                              │
│    {sha256}.png          ← content-addressed binary  │
│    {sha256}.mp3                                      │
│    {sha256}.glsl                                     │
│                                                       │
│  repos/{gameId}/                                     │
│    objects/                                           │
│      {sha}/              ← Git objects (trees,       │
│                            commits, text blobs)      │
│    pack/                 ← Optional: packed objects   │
│                                                       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                    D1 Database                        │
│                                                       │
│  assets        ← metadata for every binary blob      │
│  refs          ← Git branch/tag pointers per game    │
│  games         ← game metadata (unchanged)           │
│  generation_*  ← AI generation tracking (unchanged)  │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### Layer 1: The Blob Store (binaries)

Every image, sound, and shader is stored once, content-addressed by SHA-256.

```
R2 layout:
  blobs/{sha256-first-2}/{sha256}     e.g. blobs/a3/a3f2b8c9...

URL: https://cdn.slopcade.com/blobs/a3/a3f2b8c9...
```

```sql
CREATE TABLE assets (
  id TEXT PRIMARY KEY,                    -- UUID (for human-friendly references)
  content_hash TEXT NOT NULL UNIQUE,      -- SHA-256 of file contents
  r2_key TEXT NOT NULL UNIQUE,            -- "blobs/{hash-prefix}/{hash}"

  -- Type
  type TEXT NOT NULL CHECK (type IN ('image', 'sound', 'shader', 'data')),
  mime_type TEXT NOT NULL,
  file_size_bytes INTEGER,

  -- Image metadata
  width INTEGER,
  height INTEGER,

  -- Sound metadata
  duration_ms INTEGER,

  -- Provenance
  creator_user_id TEXT REFERENCES users(id),
  source TEXT NOT NULL DEFAULT 'generated'
    CHECK (source IN ('generated', 'uploaded')),
  compiled_prompt TEXT,
  model_id TEXT,
  theme_id TEXT REFERENCES themes(id),

  created_at INTEGER NOT NULL,
  deleted_at INTEGER
);
```

**Key properties:**
- **Immutable**: Once written, never modified. You generate a new asset, not edit an old one.
- **Deduped**: Upload the same file twice → get the same `content_hash` → same asset row. No wasted storage.
- **Shared**: Asset `abc` can be used by 1000 games. No copying.
- **Typed**: Query "all images created by user X with theme Y" — first-class relational data.

### Layer 2: The Git Store (text files)

Each game is a lightweight Git repository. We don't need the full Git wire protocol — just the **object model** (blobs, trees, commits) and **refs** (branches).

**Option A: Simplified Git in D1 + R2 (recommended)**

Build a ~500-line "Git Lite" that stores:
- **Blobs** (text file contents, hashed) → R2 at `repos/{gameId}/objects/{sha}`
- **Trees** (directory listings, mapping filename → blob SHA) → R2 as JSON
- **Commits** (message, author, timestamp, tree SHA, parent SHA) → D1

```sql
-- One row per branch/tag per game
CREATE TABLE refs (
  game_id TEXT NOT NULL REFERENCES games(id),
  name TEXT NOT NULL,            -- "main", "remix/desert-theme", "checkpoint/auto-2026-02-12"
  commit_sha TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (game_id, name)
);

-- Commit metadata (the tree object lives in R2)
CREATE TABLE commits (
  sha TEXT PRIMARY KEY,          -- SHA-256 of (tree_sha + parent_sha + message + timestamp)
  game_id TEXT NOT NULL,
  tree_sha TEXT NOT NULL,        -- Points to tree object in R2
  parent_sha TEXT,               -- NULL for initial commit
  author_user_id TEXT,
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_commits_game ON commits(game_id, created_at DESC);
```

A **tree object** stored in R2 at `repos/{gameId}/objects/{tree_sha}`:
```json
{
  "slopcade.json": { "type": "blob", "sha": "abc123" },
  "world.json": { "type": "blob", "sha": "def456" },
  "entities.json": { "type": "blob", "sha": "789abc" },
  "rules.json": { "type": "blob", "sha": "fedcba" },
  "prefabs/": { "type": "tree", "sha": "111222" },
  "scripts/": { "type": "tree", "sha": "333444" }
}
```

A **blob object** stored in R2 at `repos/{gameId}/objects/{blob_sha}` — just the raw text content of the file.

**Option B: Full isomorphic-git with LightningFS**

Use `isomorphic-git` + `LightningFS` in-memory, serialize the entire `.git` directory to R2 as a single compressed blob. Deserialize on each Worker request.

- *Pro*: Full Git compatibility (merge, rebase, diff)
- *Con*: Cold-start latency (deserialize whole repo), CPU-intensive in Workers, 10MB repo limit before it hurts

**Recommendation: Option A.** We don't need merge/rebase — we need commits, branches, and fast reads. A simplified Git object model gives us that with minimal complexity. If we ever need full Git compat, we can add `isomorphic-git` as a frontend-only tool that speaks to our API.

### Layer 3: The Game Project (combining both layers)

A game project is a directory of text files where asset references use the `assetId` from the blob store.

```
workspace/
  slopcade.json          ← manifest (name, version, etc.)
  world.json             ← physics config
  entities.json          ← entity instances
  rules.json             ← game rules
  prefabs/
    ball.json            ← { visual: { type: "image", assetId: "abc", ... } }
    tube.json
    background.json
  scripts/
    main.js              ← game logic
  shaders/
    glow.glsl
```

Inside `prefabs/ball.json`:
```json
{
  "visual": {
    "type": "image",
    "assetId": "asset-uuid-abc",
    "whatDescription": "a red bouncy ball",
    "scale": 1,
    "offsetX": 0,
    "offsetY": 0
  },
  "collider": { "shape": "circle", "radius": 0.5 },
  "physics": { "bodyType": "dynamic", "density": 1 }
}
```

`assetId` points to the `assets` table. The text file is tiny. The binary lives in the blob store.

### How Operations Work

| Operation | What Happens |
|-----------|-------------|
| **Create game** | Create `games` row, create initial commit with default workspace files, set `refs(main)` |
| **Edit file** | Write new blob object → create new tree → create new commit → update `refs(main)` |
| **Save checkpoint** | Create a named ref: `refs(checkpoint/auto-{timestamp})` pointing at current commit |
| **Undo** | Move `refs(main)` back to `parent_sha` of current commit |
| **Fork game** | Create new `games` row with `forked_from_id`. Copy `refs(main)` to new game's `refs(main)`. Objects are shared (same SHAs). |
| **Generate assets** | AI creates images → hash → store in blob store → update `assetId` in prefab JSON → commit |
| **"Remix" (skin)** | Fork the game, only change the `assetId` fields in prefab JSONs. Everything else identical. |
| **View history** | Walk commit chain via `parent_sha`. Each commit has a tree → you can reconstruct any past state. |
| **Diff two versions** | Compare two tree objects → find changed blobs → diff the text content. |

### The Runtime Flow (Play Page)

```
1. Resolve game's current commit:  refs(game_id, "main") → commit_sha
2. Load tree from commit:          commit.tree_sha → tree object from R2
3. Recursively load all text files: tree → blob SHAs → file contents from R2
4. Compile into GameDefinition:     PackageCompiler already does this
5. Collect all assetIds:            Walk prefabs, background, sounds
6. Batch-resolve asset URLs:        SELECT r2_key FROM assets WHERE id IN (...)
7. Build preload manifest:          assetId → CDN URL
8. Pass enriched definition + URLs to Godot
```

## What Happens to Existing Concepts

| Current Concept | Fate |
|----------------|------|
| `remixes` table | **Becomes forks.** A remix = fork the game, change some `assetId`s. If we want "quick skin switching" without a full fork, keep a lightweight `remix_overrides` table. |
| `asset_overrides_json` | **Deleted.** Asset references live in the text files (prefab JSONs). No more JSON blobs. |
| `assetSystem.activeRemixId` | **Deleted.** The game definition IS the truth. No indirection. |
| `useAssetResolution` hook | **Replaced** by a single `resolveAssetUrls(assetIds[], cdnBase)` function. |
| `mergeAssetsIntoPrefabs` | **Unnecessary.** Assets are already in the prefab files. |
| `extractAssetManifest` | **Simplified.** Walk tree, collect `assetId` from every file, batch-resolve. |
| `definition.json` | **Replaced** by the compiled output of `PackageCompiler` reading from the Git tree. May still exist as a build cache. |
| `WORKSPACE_CONVENTIONS` | **Preserved exactly.** Already defines the right directory structure. |
| `PackageCompiler` | **Preserved.** Already turns workspace files into a runnable game. Now reads from Git tree instead of raw R2 prefix. |
| `ArtifactManager` | **Replaced** by Git commits. Versioning is native. |

## Migration Strategy

### Phase 0: Fix the immediate image loading bug (now)
- Fix the race condition in `[id].tsx` (already done)
- Fix the name-vs-ID bug in `useAssetResolution.ts` (already done)
- These fixes keep the current system working while we build V4

### Phase 1: Introduce the blob store (low risk, additive)
- Add `content_hash` column to `assets` table
- New upload path: hash file → check for existing → store in `blobs/{hash}` → return `assetId`
- Backfill `content_hash` for existing assets
- New `resolveAssetUrl(assetId)` utility — one function, everywhere

### Phase 2: Add `assetId` to game definitions (dual-write)
- Add `assetId` field alongside existing `url`/`imageUrl` fields
- Generation pipeline writes both `assetId` and legacy URL
- Resolution: prefer `assetId`, fall back to URL
- Verify all games load correctly

### Phase 3: Implement Git Lite for game repos
- Build the commit/tree/blob object model (~500 LOC)
- Create `refs` and `commits` tables
- Migrate existing `workspace/` files into initial commits
- Update `ArtifactService` to write through Git Lite
- Update editor to use revision = commit SHA

### Phase 4: Clean up legacy
- Remove `asset_overrides_json`, `useAssetResolution`, `assetPackId`
- Remove `url`/`imageUrl`/`assetUrl` fields from types
- Remove `activeRemixId` from game definitions
- Simplify `extractAssetManifest` to walk `assetId` fields only
- Drop `remixes` table (or keep as thin override layer if needed)

## Open Questions

1. **Full isomorphic-git vs Git Lite?** Git Lite (custom ~500 LOC) is simpler and faster for our needs. But if we ever want `git clone` from CLI or GitHub integration, we'd need the wire protocol. Start with Lite, add protocol later?

2. **Ref-counting for blob GC**: When no game references a binary asset, how do we garbage-collect? Options: (a) periodic scan, (b) ref-count column, (c) never delete (storage is cheap).

3. **Branch model**: Does every game start with just `main`? Do remixes become branches? Or are forks always separate games? The answer affects whether `refs` is per-game or cross-game.

4. **Auto-save semantics**: Currently `writeWorkspaceFile` overwrites immediately. With Git: should every keystroke be a commit? Or batch into "save points"? The CodeSandbox model (auto-commit on idle) is probably right.

5. **Offline/local dev**: Should `isomorphic-git` run in the app for local-first editing, syncing to the server via push/pull?
