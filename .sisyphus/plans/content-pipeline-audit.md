
# Content Pipeline Audit

**Date:** 2026-02-19  
**Status:** Analysis Complete — Awaiting Decisions

---

## Executive Summary

The content pipeline is 70% sane. The schema, DB tables, admin CRUD, and audio infra are all solid. The rot is in 5 specific areas: (1) 4 game templates reference content types that don't exist anywhere, (2) the JSON pack files are still the live source of truth but the DB is supposed to be — there's no enforced transition, (3) the local-R2 two-way sync relies on `sync-r2-pull.ts` which pulls from miniflare SQLite, not actual R2, making it fragile, (4) audio coverage is wildly inconsistent (trivia: 1 of 490 files have audio), (5) the admin UI exists but has no audio playback or bulk operations.

---

## Current Architecture

### Brands
Two brands, each with independent content packs:
- **`amen`** — Bible/faith-themed content for the Amen app
- **`slopcade`** — General party game content for Slopcade

### Content Types (14 total, in DB schema)
| Type | Amen Pack | Slopcade Pack | Has Audio |
|------|-----------|---------------|-----------|
| `quip` | amen-quip.json (415) | quip.json (264) | ✗ (no audio) |
| `trivia` | amen-trivia.json (490) | trivia.json (303) | ✗ (1 of 490 amen, 0 slopcade) |
| `drawing` | amen-drawing.json (200) | drawing.json (158) | ✓ amen (200/200) |
| `dilemma` | amen-dilemma.json (110) | dilemma.json (94) | ✓ amen (110/110) |
| `wyr` | (same file as dilemma) | (same file as dilemma) | ✓ same |
| `estimation` | amen-wager.json (166) | wager.json (130) | ✗ |
| `fibbage` | amen-fibbage.json (137) | fibbage.json (114) | ✓ amen (137/137) |
| `caption` | **MISSING** | **MISSING** | ✗ |
| `wordgame` | **MISSING** | **MISSING** | ✗ |
| `wordlist` | amen-wordlist.json (220) | wordlist.json (2491) | ✗ (SKIP_VOICE) |
| `personal` | amen-personal.json (160) | personal.json (129) | ✓ amen (160/160) |
| `FakeWord` | (shared) fake-words.json | (shared) | ✗ (SKIP_VOICE) |
| `ranking` | amen-ranking.json (148) | ranking.json (134) | ✓ amen (74/148) |
| `headsup` | amen-headsup.json (25) | headsup.json (20) | ✗ (SKIP_VOICE) |

**Note on naming confusion:** The file `amen-wager.json` / `wager.json` stores `estimation` type content. The pack file name (`wager`) ≠ the content type (`estimation`). This is handled in `prompt-loader.ts` but is confusing.

### Game Templates → Content Packs

21 party game templates. Here's the full dependency map:

| Game | Content Type Needed | Status |
|------|-------------------|--------|
| `about-you-bluff` | `personal` | ✅ OK |
| `chain-reaction` | `wordlist` | ✅ OK |
| `chroma-clues` | **NONE** (has 98 items in `amen-chroma.json`, but chroma is NOT a registered ContentType and NOT in prompt-loader) | 🔴 BROKEN |
| `consensus-mine` | `ranking` | ✅ OK |
| `drawful-animate` | `drawing` | ✅ OK |
| `half-and-half` | `dilemma` | ✅ OK |
| `headsUp` | `headsup` | ✅ OK |
| `lexicon-ladder` | `FakeWord` | ✅ OK |
| `out-of-context` | `caption` | 🔴 BROKEN — no caption pack exists anywhere |
| `percent-panic` | `percentage-facts` | 🔴 BROKEN — not a registered ContentType |
| `punchline-ferry` | `joke-template` | 🔴 BROKEN — not a registered ContentType |
| `quickfire-qa` | `trivia` | ✅ OK (but only 1 amen audio file) |
| `quiplash` | `quip` | ✅ OK |
| `rival-roster` | (none) | ✅ OK (no content needed) |
| `role-replay` | `quip` | ✅ OK |
| `ruin-and-redeem` | `quip` | ✅ OK |
| `shirt-clash` | (none) | ✅ OK (no content needed) |
| `sketch-bluff` | `drawing` | ✅ OK |
| `spectrum-guess` | `NonsensoryScale` | 🔴 BROKEN — not a registered ContentType |
| `truth-trap` | `fibbage` | ✅ OK |
| `year-jinx` | `wager` | ✅ OK (wager → estimation in prompt-loader) |

**Summary: 4 games have broken content pack references that will throw at runtime.**

### File Naming Issues
- `amen-wager.json` → stores `estimation` content type (confusing alias)
- `amen-chroma.json` / `chroma.json` — 98 items each, but `chroma` is not in `ContentType` enum
- `quiplash-prompts.json` and `trivia-prompts.json` in `/party/content/` — orphan legacy files, NOT referenced by any loader
- Easter special / Good Friday packs — both have 0 items (empty arrays)

---

## Data Model: What's Sane

### DB Schema (D1 — `api/migrations/20260218_party_content_schema.sql`)
```
party_content:         id, brand_id, content_type, body (JSON), category, difficulty, status, source, content_hash
party_content_assets:  id, content_id, r2_key, asset_type, role, mime_type, duration_ms, file_size
party_content_reviews: id, content_id, reviewer_user_id, quality_score, humor_score, notes
party_content_status_transitions: audit trail
party_content_snapshots: versioned publish snapshots (content_ids JSON blob)
```

This schema is **good**. The IDs are human-readable (`amen-triv-001`, `amen-pers-158`) — they're already in the right format.

### Source of Truth Problem
There are currently **two sources of truth** fighting each other:
1. **JSON pack files** (`api/src/party/content/packs/`) — currently what games actually read at runtime via `loadContentPack()`
2. **D1 database** — what `loadContentPackFromDB()` reads, but only if a snapshot exists

The `loadContentPackFromDB()` function falls back to JSON if no snapshot exists. This means the DB is optional right now. The goal (DB as source of truth) requires:
- Import packs to DB → `partyContentRouter.importPacks`  
- Publish snapshot → `partyContentRouter.publish`
- Switch `loadContentPack` calls to always use DB path (not fallback)

The API for this already exists — it just hasn't been enforced.

### R2 Two-Way Sync

**Current behavior:**
- `sync-r2.ts --watch` (devmux: `games-watcher`) — compiles game source → pushes to miniflare R2 (local wrangler state) → also copies files to `r2/` directory
- `sync-r2-pull.ts --watch` (devmux: `r2-pull-watcher`) — reads from miniflare SQLite state → copies binary blobs to `r2/` directory

**The gap:** Audio/image assets generated via the API (audio generation writes to `ctx.env.ASSETS.put()`) go into miniflare's R2 — but `sync-r2-pull.ts` only pulls files whose keys it knows about (manifest-based). If audio is generated server-side and its R2 key isn't in the pull manifest, it won't appear in `r2/`.

**What "magic two-way sync" needs:**
- Every R2 write (including audio generation) should be visible in `r2/` automatically
- The pull script needs to either (a) enumerate all R2 objects (not just manifest), or (b) the API write path should also write to local disk when in dev mode

### Audio Coverage Gap
```
Content type     Amen total    Audio files    Coverage
personal         160           160            100% ✅
drawing          200           200            100% ✅  
dilemma          110           110            100% ✅
fibbage          137           137            100% ✅
ranking          148           74             50% ⚠️
trivia           490           1              0.2% 🔴
quip             415           0              0% 🔴
estimation       166           0              0% 🔴
slopcade (all)   —             0              0% 🔴
```

---

## Admin UI Status

`apps/admin/src/pages/ContentReviewPage.tsx` exists with:
- ✅ Filter by brand, content type, status, category
- ✅ Paginated list
- ✅ Quality/humor score review form
- ✅ Status transition (draft → active → retired)
- ✅ Soft delete / restore
- ❌ No audio playback
- ❌ No bulk audio generation trigger
- ❌ No import packs button
- ❌ No publish snapshot button
- ❌ No "generate audio for all missing" workflow

---

## Issues Summary

### Critical (games broken at runtime)
1. `out-of-context` needs `caption` content pack — doesn't exist for either brand
2. `percent-panic` needs `percentage-facts` content type — not in ContentType enum
3. `punchline-ferry` needs `joke-template` content type — not in ContentType enum
4. `spectrum-guess` needs `NonsensoryScale` content type — not in ContentType enum

### Data Hygiene
5. `chroma` content exists (98 items per brand) but is not a registered ContentType — chroma-clues game has `contentPacks: []` in manifest (it hardcodes its data?)
6. `quiplash-prompts.json` and `trivia-prompts.json` — orphan files not wired to any loader
7. `amen-easter-special.json` and `amen-good-friday.json` — both empty (0 items)
8. `wager` file name vs `estimation` type — confusing alias
9. Audio coverage: trivia (0.2%), quip (0%), estimation (0%), ranking (50%) — slopcade has zero audio

### Architecture
10. DB is not the enforced source of truth — JSON packs still power production
11. R2 pull sync doesn't auto-discover new audio files generated server-side
12. Admin UI missing audio playback and bulk operations

---

## Recommended Next Steps (in priority order)

### Phase 1: Fix Broken Games (immediate)

**Option A: Fix the content type references in the 4 broken manifests**
- `percent-panic`: rename `percentage-facts` → `estimation` (wager-style content fits)
- `punchline-ferry`: rename `joke-template` → `quip` (fill-in-the-blank prompts fit)
- `spectrum-guess`: rename `NonsensoryScale` → `estimation` or create new type
- `out-of-context`: create `caption` content pack for both brands (or rename to `drawing`)

**Option B: Create the missing content types**
- Add `percentage-facts`, `joke-template`, `NonsensoryScale`, `caption` to ContentType enum
- Create pack files for each
- Wire them into prompt-loader

Option A is faster. Option B is more semantically correct.

### Phase 2: DB as Source of Truth

1. Run `partyContentRouter.importPacks` for both brands → populates D1
2. Run `partyContentRouter.publish` → creates snapshot v1
3. Remove the JSON fallback from `loadContentPackFromDB` — make DB mandatory
4. Delete the JSON pack files from `api/src/party/content/packs/` (they become build artifacts/imports only for the initial seed)

Actually — **keep the JSON files as the canonical seed**. The workflow becomes:
- JSON files = authored source (in git, reviewed via PR)
- DB = runtime index (populated by importPacks)
- Snapshots = versioned production cuts

### Phase 3: Fix R2 Two-Way Sync

Modify `sync-r2-pull.ts` to enumerate ALL objects in the miniflare R2 bucket (not just manifest-tracked ones) and write them to `r2/`. This ensures audio generated via `generateAudio` appears in the local directory automatically.

### Phase 4: Complete Audio Coverage

1. Generate trivia audio for all 490 amen questions (big batch via `generateAudio`)
2. Generate quip audio for amen (415 items)
3. Generate estimation/wager audio for amen (166 items)
4. Decide: does slopcade need audio? (different brand, different UX)
5. Complete ranking coverage (74 of 148)

### Phase 5: Admin UI Completion

Add to `ContentReviewPage.tsx`:
- Audio player component (play/pause for `r2_key` assets)
- "Import Packs" button → calls `importPacks` mutation
- "Publish Snapshot" button → calls `publish` mutation  
- "Generate Audio" button per item (and bulk select)
- Coverage summary panel (% with audio per type)

---

## Questions for You Before Proceeding

1. **Broken games (Phase 1):** Do you want Option A (remap to existing types) or Option B (create new types with proper pack files)?

2. **caption for out-of-context:** This game needs image captions (funny/weird images that players write captions for). Do you have images for this, or should we create prompt-based captions instead?

3. **Slopcade audio:** Does slopcade need voice audio at all, or is audio only for Amen?

4. **chroma-clues:** Its manifest has `contentPacks: []` but there's a `chroma.json` with 98 items. How does this game actually get its content? Does the server script load it some other way?

5. **wager vs estimation naming:** Want to rename the files from `wager.json` → `estimation.json` for clarity, or leave the alias in prompt-loader as-is?

6. **Easter/Good Friday packs:** Should these be populated with actual content, or deleted?
