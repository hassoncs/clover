# Image Asset Strategy: Faster, Cheaper, Better

> **Status:** Research complete, ready for decision  
> **Created:** 2026-02-07  
> **Goal:** Get game assets to users in <1 second for common cases, <5 seconds for everything else, at dramatically lower cost than current Scenario.com pipeline.

---

## Current State

**What we have today:**
- **Scenario.com** as primary provider (~$0.02/image, multi-second latency + polling)
- **Modal/ComfyUI** as experimental alternative (custom ComfyUI on Modal serverless, cold start issues)
- Full pipeline: silhouette → img2img → removeBg → R2 upload (entity assets)
- Theme Planner (LLM generates coherent prompts for entire asset packs)
- Asset packs stored in Cloudflare R2, tracked in D1
- No pre-built asset catalog, no search/browse experience
- Every asset is AI-generated from scratch, every time

**The pain:**
- Users wait 20-40+ seconds for common objects like "pizza" or "sword"
- Every generation costs ~$0.02-0.04 (Scenario) with markup to users (40 Sparks per entity)
- Cold starts on Modal make it worse
- No way to browse or pick from existing assets
- Kids' vocabulary is highly predictable — we're regenerating the same things constantly

---

## Strategy: Three-Tier Waterfall

The research is clear: **don't choose between catalogs and AI generation — layer both.**

```
User types "pizza"
  → Tier 1: Check bundled/cached assets (0ms)        → FOUND → Show instantly
  → Tier 2: Search external catalog APIs (200-500ms)  → FOUND → Show results
  → Tier 3: AI generate via fast model (1-3s)         → Generate → Show with spinner
```

### Tier 1 — Bundled + Pre-Generated Assets (0ms)

**Ship 500-1,000 curated game assets inside the app or on CDN.**

Kids' search vocabulary is surprisingly predictable. Pre-generate or license the top 500 terms and cache them. This handles 60-70% of searches with zero latency, zero network, zero cost.

| Source | Assets | License | Cost | Style Fit | Integration |
|--------|--------|---------|------|-----------|-------------|
| **Kenney.nl** | 60,000+ across ~200 packs | CC0 (public domain) | Free | ★★★★★ Game-native, clean, colorful, cartoon | Bulk download, self-index |
| **Game-icons.net** | ~4,170 game SVGs | CC BY 3.0 | Free | ★★★☆ Monochrome silhouettes, game-themed | GitHub bulk download |
| **Pre-generated (our own)** | 500+ top terms | We own them | ~$5-15 one-time | ★★★★★ Matches our style presets | Batch generate with FLUX Schnell |

**Kenney is the #1 move.** Clean, consistent, designed for game engines, CC0 (zero attribution needed), covers platformer tiles, characters, UI, vehicles, food, nature, and more. No official API, but the full collection is on GitHub at `github.com/KenneyNL/Kenney-Assets` for bulk clone. Download all packs, build a keyword-tagged SQLite/JSON index, bundle the most common ones in-app.

**Game-icons.net** is a nice complement — ~4,170 SVGs of weapons, potions, creatures, GUI elements, all on GitHub for bulk download. CC BY 3.0 (attribution required but manageable).

**Pre-generation** is the killer optimization: batch-generate 500 images for common terms ("pizza", "sword", "cat", "castle", "robot", etc.) using FLUX Schnell at ~$0.001-0.003/image = **$0.50-1.50 total**. Cache on R2/CDN. This turns Tier 3 into Tier 1 for the long tail.

### Tier 2 — External Catalog API Search (200-500ms)

**Query free APIs for anything not in the local bundle.**

| Service | API | Catalog Size | License | Cost | Style Fit | Best For |
|---------|-----|-------------|---------|------|-----------|----------|
| **Iconify** | REST (free) | 275,000+ icons | Varies (many MIT/Apache/CC0) | Free | ★★★☆ Icons, not sprites | Real-time icon search |
| **Flaticon** | REST (paid) | 18M+ stickers/icons | Royalty-free (Premium) | Paid API | ★★★★ Stickers are colorful/game-like | Stickers/illustrations |
| **Noun Project** | REST | ~10M icons | Royalty-free (paid tier) | $150/mo+ | ★★☆ Monochrome, too "icon-like" | Icons with safety filter |

**Iconify is the only viable free API option.** It aggregates 200+ icon sets into one unified REST API with keyword search. Many included sets use permissive licenses (MIT, Apache 2.0, CC0). The game-relevant sets include:
- **game-icons** (~4,000 game-themed icons — swords, potions, shields)
- **twemoji** / **noto** (colorful emoji-style icons — food, animals, objects)
- **fluent-emoji** (3D-style colorful icons)
- **line-awesome**, **tabler** (clean line icons for UI)

**API is dead simple:**
```
GET https://api.iconify.design/search?query=pizza&limit=20
→ Returns icon identifiers

GET https://api.iconify.design/{prefix}/{name}.svg
→ Returns SVG content directly

GET https://api.iconify.design/{prefix}/{name}.svg?color=%23ff0000&width=64&height=64
→ Returns colored, sized SVG
```

**Game-relevant icon sets available through Iconify:**
- `game-icons` — 400+ RPG/fantasy icons (swords, shields, potions) — CC-BY 3.0
- `twemoji` / `noto` — Colorful emoji-style (food, animals, objects) — Apache 2.0 / OFL
- `fluent-emoji` — 3D-style colorful icons — MIT
- `mdi` — 7,000+ Material Design (UI elements, tools) — Apache 2.0
- `tabler` — 4,800+ clean line icons — MIT

**Limitation:** These are icons/SVGs, not photorealistic game sprites. Good for simple game objects, less good for detailed characters or complex scenes. Works great for the "quick pick" use case.

### Tier 3 — Fast AI Generation (1-3s)

**For truly novel queries that catalogs can't satisfy.**

| Model | Steps | Speed | Cost/image | License | Quality (512px) |
|-------|-------|-------|------------|---------|-----------------|
| **FLUX.1 Schnell** | 1-4 | 0.3-2s | $0.001-0.003 | Apache 2.0 | ★★★★ |
| **FLUX.2 Klein 4B** | 4 | 0.3-1.2s | ~$0.003 | Apache 2.0 | ★★★★ |
| SDXL Lightning | 4 | 1-2s | ~$0.0005 | Open weights | ★★★☆ |
| SD 3.5 Large Turbo | 4 | ~2s | $0.02-0.03 | Free <$1M rev | ★★★★ |
| **Scenario.com** (current) | ~28 | 5-20s | ~$0.02 | Commercial | ★★★★★ |

**FLUX Schnell on fal.ai or Together AI is the recommended replacement for real-time generation:**
- 10-20x faster than Scenario.com
- 10-20x cheaper per image
- Apache 2.0 license (no revenue caps)
- No cold start on fal.ai
- Together AI has a **free tier** for development

**Provider comparison for Tier 3:**

| Provider | Best For | Latency | Cold Start | Cost |
|----------|----------|---------|------------|------|
| **fal.ai** | Production (lowest E2E latency) | Sub-second | Near-zero | ~$0.003/image |
| **Together AI** | Dev/testing (free tier) | 315ms raw | Minimal | Free tier available |
| **Fireworks AI** | Cheapest per-image | 1-2s | Moderate | $0.0014/image |
| Replicate | Largest model library | 2-5s | 10-60s (community) | ~$0.003/image |
| RunPod | Batch pre-generation | Variable | ~20s | $1.65/hr (A100) |

**Background removal still needed.** No fast model generates transparent backgrounds natively. Pipeline: generate with white BG → rembg/SAM removal (~0.5s). Scenario.com's built-in bg removal is actually a nice feature we'd lose — need to replace with a lightweight removal step.

---

## Prioritized Action Plan

### Phase 0: Quick Win — Iconify API Integration (FREE, 1-2 days)

**Why first:** Zero cost, immediate value, simple REST API, no licensing complexity.

1. Add Iconify search endpoint to API (`/api/asset-search?q=pizza`)
2. Query `https://api.iconify.design/search?query={term}&limit=20`
3. Render SVG results in Asset Gallery as selectable options
4. When user picks an icon, convert SVG → PNG and store in pack

**Expected impact:** Instant results for ~20-25% of common game object searches (swords, shields, food, animals, etc.)

**Fits existing architecture:** Results go through the same pack_entries → R2 → CDN path. Just skips the generation pipeline.

### Phase 1: Kenney Asset Bundle (FREE, 2-3 days)

**Why second:** Highest quality free game assets, perfect style match, CC0 license.

1. Download Kenney's most game-relevant packs (platformer, puzzle, UI, food, nature, vehicles)
2. Build a tagged JSON index: `{ id, tags[], category, file, dimensions }`
3. Bundle top ~500 assets in-app (or serve from CDN)
4. Add local search in Asset Gallery (tag-based + fuzzy matching)
5. Allow "Use this asset" → stores into current pack

**Expected impact:** Instant results for 40-60% of common searches. Kids love platformer tiles, coins, hearts, stars, etc.

**Estimated bundle size:** ~500 PNGs at 512×512 ≈ 50-100MB (could compress or use WebP). Or serve from CDN and cache locally on first use.

### Phase 2: Fast Generation Backend — fal.ai + FLUX Schnell (LOW COST, 3-5 days)

**Why third:** Replaces Scenario.com for real-time generation at 10-20x less cost and latency.

1. Add `fal.ai` provider adapter implementing `ImageGenerationAdapter`
2. Wire FLUX Schnell for `txt2img` and `img2img` operations
3. Add lightweight background removal (rembg or SAM via fal.ai)
4. Keep Scenario.com as fallback for complex operations (layered decompose, custom models)
5. Update `IMAGE_GENERATION_PROVIDER` to support `'fal'` option

**Cost impact:**
| Operation | Scenario.com | fal.ai (FLUX Schnell) | Savings |
|-----------|-------------|----------------------|---------|
| Entity sprite | ~$0.02 | ~$0.003 | **85%** |
| Background | ~$0.02 | ~$0.003 | **85%** |
| Title hero | ~$0.02 | ~$0.003 | **85%** |

**Latency impact:**
| Operation | Scenario.com | fal.ai (FLUX Schnell) |
|-----------|-------------|----------------------|
| txt2img | 5-20s | 0.5-2s |
| img2img | 5-20s | 1-3s |
| removeBg | 2-5s | ~0.5s |
| **Total entity** | **15-45s** | **2-5s** |

### Phase 3: Pre-Generation Cache (VERY LOW COST, 1-2 days)

**Why fourth:** Turns Tier 3 into Tier 1 for the most common long-tail queries.

1. Compile list of top 500 search terms kids use (food, animals, vehicles, fantasy, sports, etc.)
2. Batch-generate with FLUX Schnell across our style presets (pixel, cartoon, 3D, flat)
3. Store on R2/CDN with content-addressed keys
4. Add cache lookup before generation: `prompt hash → existing image`

**Cost:** 500 terms × 4 styles × $0.003 = **$6.00 total**. One-time cost.

**Impact:** The vast majority of real-world usage becomes instant.

### Phase 4 (Future): Semantic Search + Smart Matching

Only pursue if Phases 0-3 leave gaps:
- Vector embeddings on asset tags for semantic matching ("italian food triangle thing" → pizza)
- User asset gallery: browse all previously generated assets across games
- Community asset sharing: use assets other players generated

---

## What to Keep vs Replace

| Component | Keep | Replace | Notes |
|-----------|------|---------|-------|
| Scenario.com | ★ Fallback | ★ Primary | Keep for layered decompose, custom model training |
| Modal/ComfyUI | | ★ Replace | Cold starts make it unsuitable; fal.ai solves this |
| Pipeline architecture | ★ Keep | | Stage-based design is solid |
| Theme Planner | ★ Keep | | LLM prompt generation is independent of image provider |
| `ImageGenerationAdapter` | ★ Keep | | Already provider-agnostic — just add fal.ai adapter |
| Asset pack system | ★ Keep | | Catalog results flow into same pack structure |
| R2 + CDN storage | ★ Keep | | All tiers ultimately store assets here |

**The existing `ImageGenerationAdapter` contract is perfectly set up for this.** Adding fal.ai is just implementing `txt2img`, `img2img`, `removeBackground`, `uploadImage`, and `downloadImage` against a new API. The pipeline, pack system, and frontend all remain unchanged.

---

## COPPA Considerations

Since this is a kids' app:
- **Anonymize all queries** to external APIs (strip user IDs)
- **Pre-moderate all AI-generated images** before display (Azure AI Content Safety or similar)
- **Constrain input** with autocomplete/allowlists where possible
- **Iconify icons are safe by nature** (curated open-source icon sets)
- **Kenney assets are safe by nature** (designed for game devs, no inappropriate content)
- **FLUX models have no built-in content filters** — server-side moderation required

---

## Decision Matrix

| Approach | Cost | Speed | Quality | Effort | Risk |
|----------|------|-------|---------|--------|------|
| **Phase 0: Iconify** | Free | Instant | ★★★ | 1-2 days | Very low |
| **Phase 1: Kenney bundle** | Free | Instant | ★★★★★ | 2-3 days | Very low |
| **Phase 2: fal.ai/FLUX** | ~$0.003/img | 1-3s | ★★★★ | 3-5 days | Low |
| **Phase 3: Pre-gen cache** | ~$6 one-time | Instant | ★★★★ | 1-2 days | Very low |
| Keep Scenario.com only | ~$0.02/img | 5-20s | ★★★★★ | 0 days | High (UX) |

---

## Recommendation

**Do Phases 0 and 1 first.** They're free, low-risk, and solve the biggest UX problem (waiting for common assets). Then do Phase 2 to slash costs and latency for the remaining AI generation cases. Phase 3 is the cherry on top.

**Total cost to implement Phases 0-3:** ~$6 in generation costs + engineering time.  
**Result:** 90%+ of asset requests resolve in <500ms. Remaining 10% in 1-3 seconds.  
**Cost reduction:** 85-100% reduction in per-image generation costs for most requests.

---

## Phase 1 Deep Dive: Kenney Ingestion Technical Plan

> Research completed 2026-02-07. No code written yet.

### Scope (Narrowed)

**Only sprite sheets and tile sheets** from Kenney. Not individual PNGs, not 3D, not audio, not vectors.

- **439 sheets** identified across all Kenney 2D/Icon/UI packs (PNG + XML atlas pairs)
- Source: `~/Downloads/Kenney Game Assets All-in-1 3.3.0`
- Skip: `@2x`/`Retina`/`HD` resolution variants, legacy/archive packs, SWF files

### Cost

Effectively **$0/month** on Cloudflare R2 free tier:
- Storage: ~200MB (well under 10GB free)
- Class A ops (writes): one-time ingest (~1,000 ops, free tier is 1M/month)
- Class B ops (reads): depends on usage but free tier is 10M/month
- Egress: free (R2 has zero egress fees)

### Database Schema (D1 with FTS5)

```sql
-- Source packs (e.g., "Kenney Platformer Pack")
CREATE TABLE library_packs (
  id TEXT PRIMARY KEY,          -- e.g., "kenney-platformer"
  source TEXT NOT NULL,         -- e.g., "kenney"
  name TEXT NOT NULL,
  description TEXT,
  license TEXT NOT NULL,        -- e.g., "CC0"
  version TEXT,
  pack_url TEXT,                -- link to source
  created_at TEXT DEFAULT (datetime('now'))
);

-- Individual sheets (sprite sheets + tile sheets)
CREATE TABLE library_sheets (
  id TEXT PRIMARY KEY,          -- e.g., "kenney-platformer/spritesheet_tiles"
  pack_id TEXT NOT NULL REFERENCES library_packs(id),
  name TEXT NOT NULL,           -- display name
  type TEXT NOT NULL,           -- "spritesheet" | "tilesheet"
  r2_key TEXT NOT NULL,         -- R2 object key for PNG
  atlas_r2_key TEXT,            -- R2 object key for XML atlas
  width INTEGER,
  height INTEGER,
  frame_count INTEGER,          -- number of sprites/tiles in sheet
  tags TEXT,                    -- comma-separated searchable tags
  created_at TEXT DEFAULT (datetime('now'))
);

-- Full-text search index
CREATE VIRTUAL TABLE library_sheets_fts USING fts5(
  name, tags, content='library_sheets', content_rowid='rowid'
);
```

### Ingestion Pipeline

1. Walk Kenney download directory, find all PNG+XML pairs
2. Parse XML atlas to extract frame count and metadata
3. Generate tags from filename, directory path, and atlas frame names
4. Upload PNG and XML to R2 under `library/{source}/{pack}/{filename}`
5. Insert rows into `library_packs` and `library_sheets`
6. Rebuild FTS5 index

Script: `api/scripts/ingest-asset-library.ts` (to be created)

### API (tRPC)

```
library.search({ query, type?, limit?, offset? })  → paginated sheet results
library.browse({ packId?, type?, limit?, offset? }) → browse by pack
library.sheet({ id })                                → single sheet detail
```

### UI

Asset browser with:
- Search bar with instant FTS5 results
- Type filter (sprite sheet / tile sheet)
- Infinite scroll grid of sheet thumbnails
- Tap to preview → see individual frames from atlas
- "Use in game" action

### What's NOT in scope yet

- **3D assets**: ~50 Kenney packs, deferred until Godot format finalized
- **Individual sprite PNGs**: Only compound sheet assets for now
- **Audio**: Kenney has audio packs but not prioritized
- **Non-Kenney sources**: Schema is source-agnostic but only Kenney data for Phase 1
