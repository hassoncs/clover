# MVP Launch Plan: Amen.games + Slopbox — 3 Games

## Executive Summary

Launch both apps with **Quiplash**, **Fibbage (Truth Trap)**, and **Drawful (Drawful Animate)**. The infrastructure is 90%+ built. The remaining work is mostly **data/config**, **content gaps**, **visual polish**, **E2E tests**, and fixing a **critical brand ID mismatch**.

---

## LAUNCH BLOCKERS (Fix First)

### B1. Brand ID Mismatch — Slopbox Can't Find Its Games
- **Slopbox app** queries `brandId: "slopbox"` (`apps/slopbox/hooks/useBrowsePartyGames.ts:6`)
- **D1 templates** are stored as `brand_id: "slopcade"` (`api/migrations/20260219_slopcade_game_templates.sql`)
- **Content loader** queries `brand_id` from `party_content` table
- **Result**: Slopbox browse screen shows ZERO games
- **Fix**: Either update Slopbox app to query `"slopcade"`, OR migrate DB templates/content to use `"slopbox"`. Need to decide which is canonical.

### B2. Slopbox Content Existence Unknown
- Amen has confirmed content: 415 quip, 137 fibbage, 200 drawing items
- Slopbox/slopcade content status is **unverified** — need to query D1 to confirm
- If no content exists, `loadContentPackFromDB` will **throw** and crash the game on start
- Truth Trap server script has hardcoded fallback prompts, but Quiplash does NOT

---

## What You're NOT Thinking About

### 1. The "slopbox" vs "slopcade" brand identity crisis
This is the #1 blocker. The app says "slopbox", the DB says "slopcade", the migration file says "slopcade". Until this is resolved, Slopbox literally cannot show or play any games.

### 2. Template ID mapping disconnect  
Amen templates: `quiplash`, `truth-trap`, `drawful-animate`  
Slopcade templates: `s-quiplash`, `s-truth-trap`, `s-drawful-animate`  
The server-side `buildTemplateRegistry()` in `api/src/party/templates/registry.ts` maps `"quiplash"` → runner, NOT `"s-quiplash"`. If Slopbox rooms are created with template `"s-quiplash"`, the runner won't be found. Need to verify the create-room flow handles the `s-` prefix correctly.

### 3. No how-to-play steps for Drawful on Slopcade
The migration has full `how_to_play_steps` JSON for `s-quiplash` and `s-truth-trap`, but only tagline/format_tag for `s-drawful-animate`. Users clicking "How to Play" on Drawful will see nothing.

### 4. No thumbnail/hero images
The `thumbnail_url` and `hero_image_url` columns exist but there's no evidence they're populated with actual URLs. The browse carousel (`GameHallCarousel`) calls `getImageUrl={(t) => t.thumbnailUrl}` — if null, tiles will be blank.

### 5. Reconnection during long games
Drawful games can run 10-15 minutes. The reconnect window is 60 seconds (`RECONNECT_WINDOW_MS`). If a player's phone locks or loses connection for >60s mid-drawing, they lose their drawings and get kicked. Consider increasing this for launch.

### 6. Content pack scheduler / freshness
`api/src/party/content/pack-scheduler.ts` exists — suggesting there's a content rotation system. If it's active, it might be filtering OUT content, reducing the available pool. With only 137 fibbage items, aggressive scheduling could cause "no content" errors.

### 7. No error/empty state for "failed to load content"
If content loading fails (wrong brand, empty DB), the server script crashes. The client gets a WebSocket close with no meaningful error. Players see "Connecting..." forever. Need graceful error handling.

### 8. Audio assets for 3 games
The games-guide doc lists specific audio needs per game (countdown beeps, reveal stingers, "VS" announcements, "Pencils down!" for drawing). ElevenLabs TTS integration exists but the actual audio files may not be generated/stored yet.

### 9. Web deployment for phone players  
Jackbox-style = host on big screen, players on phones. Players need a web URL to join. `apps/landing-amen/` and `apps/landing-slopcade/` exist but need to route to the join flow. The join screen needs to work on mobile web browsers.

### 10. Minimum viable content volume
- Quiplash uses ~12 prompts per session × 2 players each = needs 12+ unique prompts minimum. 415 is fine.
- Fibbage uses 3 rounds × 1 question = needs 3+ per session. 137 is fine.
- Drawful uses ~8 prompts per session (1 per player × rounds). 200 is fine.
- BUT: if Slopbox has ZERO content, it's a total blocker.

---

## Workstreams (Parallelizable)

### WS1: Data & Configuration (CRITICAL PATH)
**Goal**: Make both apps show exactly 3 games and have content to play them.

| Task | Details | Files | Complexity |
|------|---------|-------|------------|
| 1.1 Resolve brand ID | Decide: "slopbox" or "slopcade"? Update app OR DB to match | `apps/slopbox/hooks/useBrowsePartyGames.ts`, `apps/slopbox/app.config.ts`, D1 migrations | Low |
| 1.2 Deactivate non-MVP games | SQL: `UPDATE party_game_templates SET is_active=0 WHERE id NOT IN ('quiplash','truth-trap','drawful-animate')` for Amen, same with `s-` prefix for Slopbox | New migration SQL | Low |
| 1.3 Verify Slopbox content | Query D1: `SELECT content_type, COUNT(*) FROM party_content WHERE brand_id='slopcade' GROUP BY content_type` | curl to tRPC or direct D1 query | Low |
| 1.4 Generate Slopbox content if missing | Use content pipeline to generate secular quip/fibbage/drawing packs | `packages/content-pipeline/`, `partyContent.generateContent` tRPC | Medium |
| 1.5 Verify template→runner mapping | Ensure `s-quiplash` correctly maps to the quiplash runner in `buildTemplateRegistry` | `api/src/party/templates/registry.ts`, `api/src/party/PartyRoomDO.ts` | Medium |

**Category**: `quick` / **Skills**: `storage-ops`

### WS2: E2E Tests
**Goal**: Full automated test coverage for all 3 games on both brands.

| Task | Details | Files | Complexity |
|------|---------|-------|------------|
| 2.1 Extract shared test helpers | Move `createRoom`, `connectWebSocket`, `waitForMessage`, `sendInputResponse`, `getPlayerIdFromState` from quiplash.spec.ts into shared utils | New `tests/e2e/party/utils.ts` | Low |
| 2.2 Write Truth Trap E2E | Full flow: create room → 3 players join → writing lies → voting → reveal → scores → winner | New `tests/e2e/party/truth-trap.spec.ts` | Medium |
| 2.3 Write Drawful Animate E2E | Full flow: create room → 3 players join → draw frame 1 → draw frame 2 → bluffing → voting → reveal → winner. Drawing input is base64/JSON data. | New `tests/e2e/party/drawful-animate.spec.ts` | Medium-High |
| 2.4 Refactor Quiplash E2E | Update to use shared helpers from 2.1 | `tests/e2e/party/quiplash.spec.ts` | Low |
| 2.5 Add brand-parameterized tests | Run same 3 tests with both `amen` and `slopbox` brand configs | All 3 spec files | Low |
| 2.6 CI integration | Add Playwright job to `.github/workflows/ci.yml` that starts API + runs tests | `.github/workflows/ci.yml` | Medium |

**Category**: `deep` / **Skills**: `testing-patterns`, `social-features`

### WS3: Visual Polish & Graphics
**Goal**: Professional-looking game selection and in-game experience.

| Task | Details | Files | Complexity |
|------|---------|-------|------------|
| 3.1 Generate game thumbnails | Create 3 thumbnail images per brand (6 total) for the browse carousel | Asset generation pipeline or manual design | Medium |
| 3.2 Generate hero images | Larger images for the game detail panel | Same | Medium |
| 3.3 Populate thumbnail/hero URLs | Update D1 `party_game_templates` with actual R2 URLs | Migration SQL | Low |
| 3.4 How-to-play for Drawful (Slopbox) | Add `how_to_play_steps` JSON for `s-drawful-animate` | Migration SQL | Low |
| 3.5 Phase screen polish | Review all phase UIs (answering, voting, reveal, scores, winner) for visual completeness | `packages/party/src/lib/{quiplashPhases,truthTrapPhases,drawfulAnimatePhases}.tsx` | Medium-High |
| 3.6 Brand theming verification | Ensure Amen navy/gold/cream and Slopbox themes apply correctly to all game phases | `apps/amen/global.css`, `apps/slopbox/global.css`, `packages/ui/` | Medium |

**Category**: `visual-engineering` / **Skills**: `frontend-ui-ux`, `nativewind-theming`

### WS4: Audio & Narration
**Goal**: Each game has phase-appropriate audio.

| Task | Details | Files | Complexity |
|------|---------|-------|------------|
| 4.1 Inventory existing audio | Check what's already in R2 under `audio/` | R2 bucket listing | Low |
| 4.2 Generate common audio | Lobby music, countdown beeps, timer ticking, victory fanfare | `partyTemplates.generateNarration` + manual | Medium |
| 4.3 Generate game-specific audio | Quiplash "VS!", Fibbage "Fooled!", Drawful "Pencils down!" | Same | Medium |
| 4.4 Wire audio to phases | Ensure `usePartyMusic` and `usePartyNarration` hooks play correct audio per phase | `packages/party/src/lib/usePartyMusic.ts`, `usePartyNarration.ts` | Medium |

**Category**: `unspecified-high` / **Skills**: `sound-generation`

### WS5: Production Readiness
**Goal**: Both apps deployable and accessible.

| Task | Details | Files | Complexity |
|------|---------|-------|------------|
| 5.1 Verify D1 prod has migrations | All party_game_templates + party_content tables exist in prod D1 | Cloudflare dashboard / wrangler | Low |
| 5.2 Seed prod content | Import content packs into production D1 | `partyContent.importPacks` tRPC | Medium |
| 5.3 Landing pages | Update landing-amen and landing-slopcade to showcase exactly 3 games | `apps/landing-amen/`, `apps/landing-slopcade/` | Medium |
| 5.4 Mobile web join flow | Verify the player join experience works on mobile Safari/Chrome | Manual testing + Playwright | Medium |
| 5.5 Error handling | Add graceful error states for content loading failures, room creation failures | `PartyRoomDO.ts`, phase renderers | Medium |

**Category**: `deep` / **Skills**: `storage-ops`, `social-features`

---

## Dependency Graph

```
WS1 (Data/Config) ─────────────────────────┐
  1.1 brand ID fix ──→ 1.2, 1.3, 1.5       │
  1.3 verify content ──→ 1.4 (if missing)   │
                                             │
WS2 (E2E Tests) ────────────────────────────┤ (needs WS1 done for Slopbox tests)
  2.1 extract helpers ──→ 2.2, 2.3, 2.4     │
  2.2 + 2.3 can run in parallel              │
  2.5 needs WS1.1 resolved                   │
                                             │
WS3 (Visual Polish) ──── independent ────────┤
  3.1 + 3.2 can run in parallel              │
  3.3 needs 3.1 + 3.2                        │
  3.5 + 3.6 can run in parallel              │
                                             │
WS4 (Audio) ──── independent ────────────────┤
  4.1 ──→ 4.2 ──→ 4.3 ──→ 4.4              │
                                             │
WS5 (Prod) ──── needs WS1 ──────────────────┘
  5.1 + 5.2 need WS1 done
  5.3 independent
  5.4 needs everything else
```

**Critical path**: WS1 (brand ID fix) → WS2 (tests validate everything) → WS5 (prod deploy)

**Fully parallel**: WS3 (visual) and WS4 (audio) can start immediately.

---

## Recommended Execution Order

1. **Immediately (parallel)**:
   - WS1.1: Fix brand ID mismatch
   - WS2.1: Extract shared E2E test helpers
   - WS3.1-3.2: Generate thumbnails/hero images
   
2. **After WS1.1**:
   - WS1.2: Deactivate non-MVP games
   - WS1.3: Verify Slopbox content exists
   - WS1.5: Verify template→runner mapping

3. **After helpers extracted**:
   - WS2.2 + WS2.3 in parallel: Write Fibbage + Drawful E2E tests
   
4. **Finishing wave**:
   - WS3.5-3.6: Phase screen polish
   - WS4: Audio pipeline
   - WS5: Production readiness

---

## Quick Wins (< 30 min each)

1. Fix brand ID mismatch (WS1.1)
2. Write `is_active=0` migration for non-MVP games (WS1.2)
3. Extract shared E2E helpers (WS2.1)
4. Add `how_to_play_steps` for `s-drawful-animate` (WS3.4)
