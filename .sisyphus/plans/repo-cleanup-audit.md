# Repo Cleanup Audit — Action Plan

> Generated from conversation on Feb 15, 2026. Review before executing.

## Summary

This session covered: 3D engine test game migration, embedded games removal, and a full dead code audit via knip + manual research. This document captures everything we plan to do (and NOT do) so nothing gets lost.

---

## ALREADY DONE ✅

These changes were made during this session:

1. **Migrated 3D test games to r2/games/**
   - Created `r2/games/cubeWorld3D/` (definition.json, metadata.json, manifest.json, prefabs/all.json, entities/initial.json)
   - Created `r2/games/shapeGallery3D/` (same structure)

2. **Deleted old test game infrastructure**
   - `app/lib/test-games/` (entire directory)
   - `app/lib/registry/generated/testGames.ts`
   - Cleaned up `app/lib/registry/index.ts` and `types.ts`

3. **Deleted embedded games build-time bundling**
   - `app/assets/embedded-games/` (entire directory — 16 game copies)
   - `app/lib/offline/embedded-games-registry.ts`
   - `api/scripts/build-games.ts` (orphaned — build:games now points to sync-r2.ts)
   - `api/scripts/sync-templates.ts` (dead — depends on missing export-test-games.ts)
   - `api/scripts/migrate-legacy-games.ts` (dead scaffold with TODOs)
   - `api/scripts/watch-games.ts` (redundant with devmux games-watcher)

4. **Preserved runtime offline download** (user-triggered)
   - `app/lib/offline/download-manager.ts` ✅
   - `app/lib/offline/local-asset-server.ts` ✅
   - `app/lib/offline/settings.ts` ✅

---

## TO DELETE 🗑️

Confirmed dead code. No imports, no consumers.

### Packages
| Item | Reason |
|------|--------|
| `packages/mcp-hot-ops/` | Demo/experiment. Only self-references in package.json. |

### Dead files in shared/
| Item | Reason |
|------|--------|
| `shared/src/bundle/index.ts` | Empty tombstone file. Says "moved to @slopcade/game-bundler". Zero imports. |
| `shared/src/schemas/index.ts` | Dead barrel export. Nothing imports it. (Keep schemas dir, just delete the index.) |
| `shared/src/schemas/__tests__/debug-validation.ts` | Standalone debug script, not a real test. |

### Dead API scripts
| Item | Reason |
|------|--------|
| `api/scripts/routing-spike/` (5 files) | Experimental spike. All knip-flagged. |
| `api/scripts/generate-breakout-silhouettes.ts` | One-off, superseded by production `silhouetteStage` in pipeline. |
| `api/scripts/regenerate-test-silhouettes.ts` | One-off, superseded by production pipeline. |
| `api/scripts/ui-compare.ts` | One-off experiment. |
| `api/scripts/ui-experiment.ts` | One-off experiment. |
| `api/scripts/test-ai-call.ts` | Test script. |

### Duplicate example
| Item | Reason |
|------|--------|
| `app/app/examples/party_test/` (definition.json) | Duplicate of `app/examples/party_test/`. Different content, same concept. Delete this copy. |

---

## TO KEEP (confirmed active) ✅

| Item | Reason |
|------|--------|
| `packages/content-pipeline/` | Being enhanced, not hooked up yet. |
| `shared/src/generator/` (slopeggle, angryBurns) | Level generators for future use. |
| `shared/src/loader/` | Future use (LevelLoader, PackSource). |
| `shared/src/graph-adapters/` | **ACTIVE** — imported by Graph Editor UI. Not dead. |
| `shared/src/scripting/modules/*.js` | **ACTIVE** — loaded at runtime by QuickJS sandbox. Knip can't see dynamic loading. |
| `landing/` | Future marketing site. |
| `apps/storybook/` | Being built up. |
| `api/scripts/bench/` | **ACTIVE** — recent benchmarks from Feb 11. Tests LLM routing accuracy. |
| `api/scripts/theme-game.ts` | **ACTIVE** — CLI tool for applying visual themes via asset pipeline. |
| `api/src/lib/game-registry.ts` | **ACTIVE** — imported by theme-game.ts. |

---

## TO MOVE 📦

### Peg motion → slopeggle

Move `shared/src/motion/` (PegMotionAssigner, clustering, index, motion.example) into the slopeggle game directory or a shared lib for it. The slopeggle game exists at `r2/games/slopeggle/`. These motion files are specifically about peg board animation and only relevant to slopeggle-type games.

**Files to move:**
- `shared/src/motion/PegMotionAssigner.ts`
- `shared/src/motion/clustering.ts`
- `shared/src/motion/index.ts`
- `shared/src/motion/motion.example.ts`

**Destination:** TBD — could go in `r2/games/slopeggle/src/` or `shared/src/generator/slopeggle/motion/`. Need to decide.

### Party game prototypes → r2/games/ (with caveats)

The 3 party game prototypes (`app/examples/party_test/`, `app/examples/quick_poll/`, `app/examples/quiplash/`) have valid `definition.json` files that follow GameDefinition structure, BUT they use party-specific features:
- `party` field (maxPlayers, minPlayers)
- `overlay` field with role-based visibility (`role == 'host'`, `role == 'player'`)
- `script` with `onNetworkState` hook for syncing Durable Object state
- `text-input` overlay elements

**These CAN be moved to `r2/games/` as JSON**, but they won't be playable without the PartyRoomDO backend. They'd appear in the browse page but fail to launch without the party infrastructure.

**Recommendation:** Move them to `r2/games/` anyway to consolidate. Mark them with metadata indicating they need party mode. This way all game definitions live in one place.

---

## PARTY GAME CONSOLIDATION 🎉

All party-related code is scattered across the repo. Here's the full map:

### Backend (api/)
| Path | What |
|------|------|
| `api/src/party/PartyRoomDO.ts` | Durable Object — manages room state, WebSocket connections |
| `api/src/party/protocol.ts` | WebSocket message protocol types |
| `api/src/party/templates/registry.ts` | Game template registry |
| `api/src/party/templates/quiplash.ts` | Quiplash server-side game logic |
| `api/src/party/templates/crowd-comedy.ts` | Crowd Comedy server-side logic |
| `api/src/party/templates/question-answer.ts` | Q&A server-side logic |
| `api/src/party/content/prompt-loader.ts` | Loads/shuffles prompts from JSON |
| `api/src/party/__tests__/` | Tests for PartyRoomDO and protocol |
| `api/src/party/templates/__tests__/` | Tests for templates |
| `api/scripts/generate-party-content.ts` | AI content generation for party prompts |

### Frontend (app/)
| Path | What |
|------|------|
| `app/app/party/` | Party game UI pages (host, join, play) |
| `app/lib/party/` | Client-side connection logic, context |
| `app/components/party/` | Party game React components |

### Prototypes (to be moved)
| Path | What |
|------|------|
| `app/examples/party_test/` | Q&A prototype definition |
| `app/examples/quick_poll/` | Quick Poll prototype definition |
| `app/examples/quiplash/` | Quiplash prototype definition |

### Plans
| Path | What |
|------|------|
| `.sisyphus/plans/quiplash-mvp.md` | Quiplash implementation plan |
| `.sisyphus/plans/fibbage-mvp.md` | Fibbage implementation plan |
| `.sisyphus/plans/trivia-murder-party-mvp.md` | Trivia Murder Party plan |
| `.sisyphus/plans/crowd-comedy-mvp.md` | Crowd Comedy plan |
| `.sisyphus/plans/crowd-comedy-testing-guide.md` | Testing guide |
| `.sisyphus/plans/party-game-builder.md` | Party game builder plan |
| `.sisyphus/plans/party-game-content-pipeline-side-project.md` | Content pipeline plan |
| `.sisyphus/plans/party-live-announcer-prepare-play-api.md` | Live announcer API plan |

**Everything above is already consolidated by directory** — the backend is in `api/src/party/`, the frontend is in `app/app/party/` + `app/lib/party/`. The only things out of place are the 3 prototype definitions in `app/examples/` which should move to `r2/games/`.

---

## NEEDS DECISION (deferred from this session) ❓

These came up in the audit but aren't blocking the cleanup above:

### Economy / Social / Billing
| Module | Status |
|--------|--------|
| `api/src/economy/` | Gems, wallet, promo codes, IAP pricing |
| `api/src/social/` | Comments, follows, notifications, ratings |
| `api/src/billing/` | Generation tracking |

**Question:** Keep as planned features, or too premature?

### Seed scripts
| Script | Status |
|--------|--------|
| `api/scripts/seed-economy.ts` | Seeds economy data |
| `api/scripts/seed-system-user.ts` | Seeds system user |
| `api/scripts/seed-themes.ts` | Seeds theme data |

**Question:** Still needed for local dev setup?

### Sound/voice generation scripts
| Script | Status |
|--------|--------|
| `api/scripts/generate-sound.ts` | ElevenLabs sound CLI |
| `api/scripts/generate-voice.ts` | Voice generation CLI |
| `api/scripts/process-job.ts` | Job queue processor |

**Question:** Still used for manual generation?

### Examples page cleanup
17 examples in `app/app/examples/` — mix of engine demos, feature tests, and possibly-broken experiments. Displayed via Lab tab. Some could become real games, others should be deleted.

**Question:** Separate task — go through each example and decide keep/delete/convert?

### Plan files (.sisyphus/plans/)
69 plan files, many completed. Could archive to `docs/archive/plans/`.

**Question:** Want a cleanup pass to archive completed plans?

### Unused dependencies
Knip found 7 unused deps in api, 28 in app, plus others. Some may be false positives (Expo plugins, native modules).

**Question:** Separate careful dep cleanup pass after feature deletions settle?

---

## EXECUTION ORDER

If approved, I'll execute in this order:

1. Delete confirmed dead code (packages, files, scripts)
2. Delete duplicate `app/app/examples/party_test/`
3. Move party game prototypes from `app/examples/` → `r2/games/`
4. Move peg motion files to slopeggle-adjacent location
5. Verify tsc in all workspaces
6. Report results
