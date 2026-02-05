# Theming & Asset Pack System

> **Purpose:** Complete reference for how themed asset packs are created, generated, built, and rendered in games.  
> **Last updated:** 2026-02-05  
> **Audience:** AI agents working on this codebase.

---

## Architecture Overview

The system has **two parallel paths** for getting themed assets into a game:

```
PATH A: Full Pipeline (API-driven, production)
  Theme (DB) → CLI thin wrapper → tRPC API → Scenario.com → R2 → Download to disk → Build → App

PATH B: Direct Generation (dev/testing)
  Scenario MCP tool → PNG on disk → Pack directory → Build → App
```

**Path A is the canonical path.** The CLI is intentionally a thin wrapper around tRPC calls — all logic lives in the API. No duplicate code.

---

## Database Schema

Six tables power the asset system. All in Cloudflare D1, defined in `api/migrations/20260203_asset_system_v3.sql`.

### `themes`
Stores reusable visual themes (e.g., "Wooden Crate", "Space Metal").

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `name` | TEXT | Human-readable (e.g., "Halloween Horror") |
| `prompt_modifier` | TEXT | The actual AI prompt fragment injected into generation |
| `creator_user_id` | TEXT FK | Who created it |
| `is_public` | INTEGER | 0/1 — public themes visible to all users |
| `style` | TEXT | pixel, cartoon, 3d, flat (optional) |
| `created_at` | INTEGER | Epoch ms |
| `updated_at` | INTEGER | Epoch ms |
| `deleted_at` | INTEGER | Soft delete |

### `assets`
Individual generated/uploaded images stored in R2.

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `r2_key` | TEXT UNIQUE | Path in R2 bucket, e.g., `{packId}/{assetId}.png` |
| `width` | INTEGER | Pixel dimensions |
| `height` | INTEGER | |
| `owner_game_id` | TEXT FK | Which game this was generated for |
| `source` | TEXT | `generated` or `uploaded` |
| `theme_id` | TEXT FK | Which theme was used |
| `compiled_prompt` | TEXT | Full prompt used for generation |
| `model_id` | TEXT | Scenario.com model ID |
| `created_at` | INTEGER | Epoch ms |

### `asset_packs`
A collection of assets for a specific game + theme combination.

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `base_game_id` | TEXT FK | Game this pack is for |
| `name` | TEXT | Human-readable (e.g., "Theme: Wooden Crate") |
| `description` | TEXT | |
| `theme_id` | TEXT FK | Theme used to generate |
| `creator_user_id` | TEXT FK | |
| `is_complete` | INTEGER | 0/1 — all templates have assets |
| UNIQUE | | `(base_game_id, name)` |

### `pack_entries`
Links a template in a game to a specific asset within a pack.

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `pack_id` | TEXT FK CASCADE | Deleting pack deletes entries |
| `template_id` | TEXT | e.g., "cube", "ball0", "tube" |
| `asset_id` | TEXT FK | Points to `assets.id` |
| `placement_json` | TEXT | `{ scale, offsetX, offsetY }` |
| UNIQUE | | `(pack_id, template_id)` |

### `generation_jobs`
A batch generation request (one job per theme application).

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `game_id` | TEXT FK | |
| `pack_id` | TEXT FK | Target pack for results |
| `theme_id` | TEXT FK | Theme being applied |
| `status` | TEXT | queued → running → succeeded/failed/canceled |
| `style` | TEXT | pixel, cartoon, 3d, flat |
| `created_at`, `started_at`, `finished_at` | INTEGER | Timing |

### `generation_tasks`
One task per template within a job.

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `job_id` | TEXT FK CASCADE | |
| `template_id` | TEXT | Which game template |
| `status` | TEXT | queued → running → succeeded/failed |
| `compiled_prompt` | TEXT | Full prompt for this specific template |
| `compiled_negative_prompt` | TEXT | |
| `model_id` | TEXT | Scenario model |
| `target_width`, `target_height` | INTEGER | Output dimensions |
| `asset_id` | TEXT FK | Result asset (set on success) |
| `error_message` | TEXT | Set on failure |
| UNIQUE | | `(job_id, template_id)` |

---

## The Full Pipeline (Path A)

### Step 1: Theme Exists in Database

Themes can be created via:
- **tRPC route:** `assetSystem.themes.create` — `{ name, promptModifier }`
- **Seed script:** `api/scripts/seed-themes.ts` — Inserts directly via D1 SQL
- **CLI (inline):** `theme-game.ts --theme-name="..." --prompt="..."` — Creates via tRPC

### Step 2: Apply Theme to Game

**CLI command:**
```bash
npx tsx api/scripts/theme-game.ts \
  --template=simple \
  --theme-name="Wooden Crate" \
  --prompt="Rustic wooden shipping crate, aged planks with visible grain, iron reinforcement bands, stamped markings" \
  --process
```

**What happens under the hood:**

1. CLI loads game from disk via `loadGame('simple')`
2. CLI calls `games.syncTemplates.mutate()` — upserts game definition into `games` table
3. CLI calls `assetSystem.applyThemeToGame.mutate()`:
   - Creates theme in `themes` table (if `--theme-name` used)
   - Creates pack in `asset_packs` table
   - Creates job in `generation_jobs` table
   - For each template in game definition:
     - Infers entity type from tags (player → character, wall → platform, etc.)
     - Gets physics shape + dimensions from template's collider
     - Computes target pixel dimensions (512-based, aspect-ratio-aware)
     - Builds structured prompt (shape + composition + subject + style)
     - Creates task in `generation_tasks` table
   - If `setAsActive`, updates game's `definition.assetSystem.activePackId`
   - Returns `{ themeId, packId, jobId, taskCount }`
4. If `--process` flag, CLI calls `assetSystem.processGenerationJob.mutate()`:
   - For each queued task:
     - Creates silhouette PNG from physics shape (box/circle)
     - Uploads silhouette to Scenario.com
     - Runs img2img (silhouette + compiled prompt, strength=0.95)
     - Downloads result
     - Removes background via Scenario.com
     - Uploads final PNG to Cloudflare R2
     - Creates `assets` row in DB
     - Creates/updates `pack_entries` row linking template → asset
   - Returns `{ successCount, failCount, status }`

### Step 3: Download Pack Assets to Disk

**CLI command:**
```bash
npx tsx api/scripts/download-pack-assets.ts \
  --pack=<packId> \
  --template=simple
```

**What it does:**
1. Calls `assetSystem.getPack.query({ id: packId })` — gets pack with entries
2. For each entry with an `imageUrl`:
   - Downloads the image from the API/R2
   - Saves to `games/compiled/{template}/assets/{templateId}.png`
3. Writes `manifest.json` mapping templateId → file path

> **Note:** The download script currently saves to `assets/` not `packs/`. It needs updating to match the new `packs/{packName}/` convention. See below.

### Step 4: Build Games

```bash
pnpm --filter @slopcade/games build
# Runs: games/scripts/build.ts
```

**Build script behavior** (`games/scripts/build.ts`):

1. For each game in `GAME_IDS`:
   - Loads `games/compiled/{gameId}/game.ts`
   - Bundles optional `script.ts` via esbuild
   - Calls `discoverPacks(gameId)`:
     - Scans `games/compiled/{gameId}/packs/*/manifest.json`
     - Parses each manifest → returns `PackInfo[]`
   - Calls `copyPackAssets(packs, gameOutputDir)`:
     - Copies each pack's images to `app/assets/embedded-games/{gameId}/packs/{packName}/`
     - Generates `asset-manifest.json` mapping `{packName}/{templateId}` → `{ file, r2Key }`
   - **Resolves `activePackId`:** If game has `activePackId: "default"` and a pack named "default" exists, replaces it with the pack's UUID in the output JSON
   - Writes compiled JSON to:
     - `games/dist/{gameId}.json`
     - `app/assets/embedded-games/{gameId}/game.json`
2. Generates `app/lib/offline/embedded-games-registry.ts`:
   - `EMBEDDED_GAME_JSONS` — require() calls for each game.json
   - `EMBEDDED_ASSET_MANIFESTS` — require() calls for each asset-manifest.json
   - `EMBEDDED_ASSETS` — require() calls for each individual image

### Step 5: Runtime Resolution

**Hook:** `app/lib/game-engine/hooks/useAssetResolution.ts`

For **template games** (embedded on disk):
1. Reads `EMBEDDED_ASSET_MANIFESTS[gameId]`
2. Converts manifest entries to `AssetConfig` objects with `imageUrl`, `scale`, `offsetX`, `offsetY`
3. Bundles into a "pack" keyed by pack name

For **database games** (fetched from API):
1. Queries `assetSystem.getPackByName({ name: activePackId })`
2. Converts DB pack entries to `AssetConfig` objects

**Resolution priority:**
1. Entity-specific `assetPackId` override
2. Game's `activePackId`
3. Fallback to template's color-based visual (rect/circle)

**Critical validation:** `validatePackCoverage()` checks that every template with `visual.type: 'image'` has a corresponding pack entry. Throws if missing.

---

## On-Disk Pack Structure

```
games/compiled/{gameId}/
  game.ts                    # Game definition (TypeScript source)
  packs/
    default/                 # Human-readable pack name
      manifest.json          # Pack metadata
      cube.png               # Asset image (named by templateId)
    space/                   # Alternative theme pack
      manifest.json
      cube.png
```

### manifest.json Schema (v1)

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

- **`packId`** — Stable UUID, generated once, committed to git. Never changes.
- **`name`** — Matches directory name. Used as `activePackId` in game.ts.
- **`assets`** — Maps `templateId` → `{ file }`. File is relative to the pack directory.

### Game Definition References

```typescript
// games/compiled/simple/game.ts
const game: GameDefinition = {
  assetSystem: { activePackId: "default" },  // Human-readable → resolved to UUID at build time
  templates: {
    cube: {
      visual: {
        type: "image",           // MUST be "image" for pack assets to apply
        imageWidth: CUBE_SIZE,   // World-unit dimensions
        imageHeight: CUBE_SIZE,
      },
      // ...
    },
  },
};
```

**Important:** If `visual.type` is `"rect"` or `"circle"`, the asset pack is ignored for that template. The template MUST use `visual.type: "image"` for pack assets to be resolved.

---

## Image Generation Details

### Prompt Structure

Built by `buildStructuredPrompt()` in `api/src/ai/assets.ts`:

```
=== SHAPE (CRITICAL - MUST MATCH EXACTLY) ===
PERFECT SQUARE. The object has equal width and height. The silhouette is a square shape.

=== COMPOSITION ===
The object FILLS THE ENTIRE FRAME. No empty space around it.

=== SUBJECT ===
A [themePrompt] themed [readableName] for a video game.
[entityType-specific description]

=== STYLE ===
[style aesthetic descriptor]

=== TECHNICAL REQUIREMENTS ===
Transparent background (alpha channel).
Game sprite asset.
[style technical descriptor]
Single object only, no duplicates.
No text, watermarks, or signatures.
```

### Entity Type Detection

Inferred from template tags:

| Tags | Entity Type |
|------|------------|
| `player`, `character` | character |
| `enemy` | enemy |
| `platform`, `wall`, `ground` | platform |
| `background` | background |
| `ui` | ui |
| (default) | item |

### Style Descriptors

| Style | Aesthetic | Technical |
|-------|-----------|-----------|
| `pixel` | pixel art, 16-bit retro game style, crisp pixels | no anti-aliasing, sharp pixel edges, limited color palette |
| `cartoon` | cartoon style, bold black outlines, vibrant saturated colors | cel-shaded, clean vector-like edges, flat color fills |
| `3d` | 3D rendered, stylized low-poly, soft ambient occlusion | clean geometry, subtle shadows, matte materials |
| `flat` | flat design, geometric shapes, modern minimal | no gradients, solid colors, clean vector shapes |

### Silhouette System

For entity assets, a silhouette PNG is created first as an img2img control image:

1. Physics shape (box/circle) is rendered as a solid gray shape on white background
2. Canvas is 512×512 pixels
3. Shape fills 90% of canvas, centered
4. Aspect ratio matches physics dimensions

The silhouette constrains the AI to generate within the physics bounds.

### Model Selection

`MODEL_MATRIX` in `api/src/ai/assets.ts` maps `{entityType}:{style}:{animated}` to Scenario.com model IDs:

| Key | Model |
|-----|-------|
| `character:pixel:static` | model_retrodiffusion-plus |
| `character:cartoon:static` | model_c8zak5M1VGboxeMd8kJBr2fn |
| `background:pixel:static` | model_uM7q4Ms6Y5X2PXie6oA9ygRa |
| `item:pixel:static` | model_retrodiffusion-plus |
| (fallback) | model_retrodiffusion-plus |

### Scenario.com API Flow

1. **Upload silhouette** → `POST /assets` → returns `assetId`
2. **img2img generation** → `POST /generate/img2img` with `{ image: assetId, prompt, strength: 0.95 }` → returns `jobId`
3. **Poll for completion** → `GET /jobs/{jobId}` → until `status: "success"` → returns `assetIds[]`
4. **Download result** → `GET /assets/{assetId}` → returns image URL → fetch image bytes
5. **Remove background** → `POST /generate/remove-background` with `{ image: assetId }` → poll → download transparent PNG
6. **Upload to R2** → `ASSETS.put(r2Key, buffer)` with key `{packId}/{assetId}.png`

---

## CLI Tools Reference

### `api/scripts/theme-game.ts` — Apply Theme to Game

**Purpose:** Thin wrapper around tRPC. Creates/applies a theme and optionally generates all assets.

```bash
# Create new theme and apply to template game:
npx tsx api/scripts/theme-game.ts \
  --template=simple \
  --theme-name="Wooden Crate" \
  --prompt="Rustic wooden shipping crate with iron bands" \
  --style=cartoon \
  --process

# Use existing theme by ID:
npx tsx api/scripts/theme-game.ts \
  --template=simple \
  --theme=<themeId> \
  --process

# Dry run (show what would happen):
npx tsx api/scripts/theme-game.ts \
  --template=simple \
  --theme-name="Test" \
  --prompt="test" \
  --dry-run
```

**Flags:**
- `--template=<name>` — Template game from disk (e.g., `simple`, `ballSort`)
- `--game=<uuid>` — Database game by ID (alternative to --template)
- `--theme=<uuid>` — Use existing theme
- `--theme-name=<str>` — Create new theme with this name
- `--prompt=<str>` — Theme prompt modifier (required with --theme-name)
- `--style=pixel|cartoon|3d|flat` — Style override
- `--process` — Generate images immediately (requires Scenario credentials)
- `--dry-run` — Preview without API calls
- `--local` — Use local API at localhost:8789 (default: true)
- `--production` — Use production API

**Requires running:** Local API server (`pnpm dev`)
**Requires for --process:** `SCENARIO_API_KEY` and `SCENARIO_SECRET_API_KEY` env vars (use `hush run --` prefix)

### `api/scripts/download-pack-assets.ts` — Download Pack to Disk

**Purpose:** Fetches generated assets from R2 via the API and saves them locally.

```bash
npx tsx api/scripts/download-pack-assets.ts \
  --pack=<packId> \
  --template=simple
```

**Output:** Saves to `games/compiled/{template}/assets/` with a manifest.json.

> **TODO:** This script saves to `assets/` but the build system expects `packs/{packName}/`. It needs updating to write to the correct location with the v1 manifest format.

### `api/scripts/seed-themes.ts` — Seed Public Themes

**Purpose:** Inserts pre-defined public themes directly into D1 via wrangler CLI.

```bash
npx tsx api/scripts/seed-themes.ts
```

Current seed themes: Halloween Horror, Candy Kingdom, Synthwave Arcade, Enchanted Forest, Deep Sea Adventure.

---

## tRPC Routes Reference

All routes are on `assetSystem.*`:

### Theme Management
| Route | Type | Input | Description |
|-------|------|-------|-------------|
| `themes.create` | mutation | `{ name, promptModifier }` | Create a new theme |
| `themes.list` | query | `{ limit?, offset?, query? }` | List user's themes |
| `themes.get` | query | `{ id }` | Get theme by ID |
| `themes.listPublic` | query | `{ limit?, offset? }` | List public themes |

### Pack Management
| Route | Type | Input | Description |
|-------|------|-------|-------------|
| `getPack` | query | `{ id }` | Get pack with entries |
| `getPackByName` | query | `{ name }` | Get pack by name |
| `listPacks` | query | `{ gameId }` | List packs for a game |
| `createPack` | mutation | `{ gameId, name, themeId? }` | Create empty pack |
| `setPackEntry` | mutation | `{ packId, templateId, assetId }` | Add/update entry |

### Generation
| Route | Type | Input | Description |
|-------|------|-------|-------------|
| `applyThemeToGame` | mutation | `{ gameId, themeId?, newTheme?, setAsActive? }` | Create pack + job for theme |
| `processGenerationJob` | mutation | `{ jobId }` | Execute generation (calls Scenario.com) |
| `getJob` | query | `{ id }` | Get job status with tasks |

### Resolution
| Route | Type | Input | Description |
|-------|------|-------|-------------|
| `getResolvedForGame` | query | `{ gameId, packId }` | Get resolved entries by template |
| `getCompatiblePacks` | query | `{ gameId }` | List packs with completeness info |
| `offlineManifest` | query | `{ gameId, packId? }` | Get all assets for offline preloading |

---

## Direct Image Generation (Path B)

For testing or bootstrapping, you can bypass the API and generate images directly:

### Using Scenario.com MCP Tool

The `mcp_scenario-image-gen_generate_image` tool is available for direct text-to-image generation:

```
generate_image(
  prompt="A rustic wooden shipping crate, game asset sprite, ...",
  output_path="/path/to/games/compiled/simple/packs/default/cube.png",
  width=512,
  height=512
)
```

After generating:
1. Create the `manifest.json` in the pack directory
2. Run `pnpm --filter @slopcade/games build`
3. The build pipeline picks up the pack automatically

### Important: Visual Type Must Be "image"

Templates with `visual.type: "rect"` will NOT use pack assets. You must change to:

```typescript
visual: {
  type: "image",
  imageWidth: 1,    // World units (matches physics size)
  imageHeight: 1,
},
```

The fallback color (`color: "#4ade80"`) is only used when no pack asset is available.

---

## Key Files

| File | Purpose |
|------|---------|
| `games/compiled/{gameId}/game.ts` | Game definition source |
| `games/compiled/{gameId}/packs/{packName}/manifest.json` | Pack asset manifest |
| `games/scripts/build.ts` | Build pipeline — discovers packs, copies assets, generates registry |
| `api/scripts/theme-game.ts` | CLI — thin wrapper to apply themes |
| `api/scripts/download-pack-assets.ts` | CLI — download generated assets |
| `api/scripts/seed-themes.ts` | CLI — seed public themes in DB |
| `api/src/trpc/routes/asset-system.ts` | tRPC routes — all asset system logic (~2000 lines) |
| `api/src/ai/assets.ts` | AssetService — prompt building, silhouette creation, Scenario orchestration |
| `api/src/ai/scenario.ts` | Scenario.com API client |
| `shared/src/types/asset-system.ts` | Shared TypeScript types |
| `app/lib/game-engine/hooks/useAssetResolution.ts` | Runtime hook — resolves pack assets for entities |
| `app/lib/offline/embedded-games-registry.ts` | Auto-generated — require() calls for embedded assets |

---

## Troubleshooting

### "Asset pack missing required assets for templates"
The `validatePackCoverage()` function throws when a template has `visual.type: 'image'` but no pack entry exists. Fix: ensure every image template has a corresponding asset in the active pack.

### Pack not discovered during build
Build script looks for `games/compiled/{gameId}/packs/*/manifest.json`. Check:
- Directory is under `packs/`, not `assets/` or `generated/`
- `manifest.json` exists with valid JSON
- Manifest has `version`, `packId`, `name`, and `assets` fields

### Generated images not appearing
1. Check `activePackId` in game.ts matches a pack directory name
2. Check template `visual.type` is `"image"` (not `"rect"`)
3. Run build after adding/changing packs
4. Check `app/assets/embedded-games/{gameId}/asset-manifest.json` was generated

### Scenario.com generation fails
- Check `SCENARIO_API_KEY` and `SCENARIO_SECRET_API_KEY` env vars
- Use `hush run --` prefix to inject secrets
- Check rate limits (configurable in `api/src/economy/pricing.ts`)
