# Plan: Split into Two Expo Apps with Shared Packages

## Status: DRAFT
## Created: 2026-02-18

---

## Decisions (Resolved)

1. **Auth:** Separate Supabase projects per app (separate auth, separate user pools). Users should never know the apps are related. But both apps share the **same underlying database** via the shared API.
2. **Package namespace:** `@slopcade/` (keeping existing namespace - no rename needed, internal detail).
3. **Shared screens:** Start with apps **totally separate**. Copy everything. Decide what to share later as patterns emerge. The only things shared from day one are the engine, game templates, and core packages.
4. **API:** Single shared API serves both apps. Same database, same schema. Domain hidden so users don't know it's the same server. Capability gating server-side.
5. **No `packages/app-core/`:** Since screens are separate and each app has its own auth (different Supabase projects), providers stay app-local. No premature abstraction of TRPCProvider/AuthProvider into a shared package.
6. **No `packages/app-routes/`:** Screens are app-specific. If we later find truly identical screens, we extract then.

---

## Context

We currently have a single Expo app (`app/`) that uses a `BRAND_ID` environment variable to switch between Slopcade and Amen at build time. This was expedient but is fundamentally the wrong architecture — the apps will feel very different, have different navigation structures, different feature sets, and different audiences. A runtime/build-time toggle creates a codebase where every screen has to ask "which brand am I?" instead of just being what it is.

**Decision: Two separate Expo apps. Shared code via workspace packages. No brand switching.**

### What We Proved (Spike)
`packages/shared-ui/` works with platform-split files (`.web.tsx` + `.native.tsx`), consumed by apps via `@chriscode/shared-ui`, with proper Metro resolution. Committed as `6bc675c`.

---

## Target Architecture

```
monorepo/
  apps/
    slopcade/              # Slopcade Expo app — full creator/social product
      app/                 # Expo Router routes (fully slopcade-specific)
      components/          # All slopcade components (editor, social, browse, etc.)
      lib/                 # Slopcade hooks, utils, providers, trpc, supabase
      assets/              # Slopcade icons, splash, fonts
      app.config.ts        # Hardcoded slopcade identity
      metro.config.js
      global.css           # Slopcade theme (dark, neon, chaotic)
      package.json         # @chriscode/slopcade
    amen/                  # Amen Expo app — party-focused product
      app/                 # Expo Router routes (fully amen-specific)
      components/          # All amen components (party, church, org, etc.)
      lib/                 # Amen hooks, utils, providers, trpc, supabase
      assets/              # Amen icons, splash, fonts
      app.config.ts        # Hardcoded amen identity
      metro.config.js
      global.css           # Amen theme (warm cream, gold, navy)
      package.json         # @chriscode/amen
  packages/
    shared/                # Core types, schemas, game logic → @chriscode/shared
    shared-ui/             # Platform-split shared components → @chriscode/shared-ui
    ui/                    # Button, Text, Input, Box → @chriscode/ui
    theme/                 # Tailwind preset, base tokens → @chriscode/theme
    brands/                # Brand metadata, content policy → @chriscode/brands
    game-bundler/          # Game compilation → @chriscode/game-bundler
    economy-engine/        # Economy logic → @chriscode/economy-engine
    content-pipeline/      # Asset generation → @chriscode/content-pipeline
    game-inspector-mcp/    # MCP debugging → @chriscode/game-inspector-mcp
    codemirror-lang-glsl/  # GLSL syntax → @chriscode/codemirror-lang-glsl
    reggie/                # Auto-discovery → @chriscode/reggie
    game-runtime/          # NEW: from app/lib/game-engine/ → @chriscode/game-runtime
    godot-bridge/          # NEW: from app/lib/godot/ → @chriscode/godot-bridge
  api/                     # Shared API — serves both apps, same DB
  shared/                  # @chriscode/shared (unchanged, already a package)
```

### Design Principle: Separate by Default, Share by Extraction

Each app is a **complete, self-contained Expo app**. It has its own screens, components, providers, hooks — everything. The apps don't know about each other.

Shared packages are for **genuinely shared infrastructure**: the game engine, Godot bridge, type schemas, game templates, and base UI primitives. NOT for screens, NOT for app-level providers.

If we later discover two screens are identical, we extract to a package then. The package boundary is clean enough to make this easy. But we don't force sharing upfront.

### What Each App Owns (Everything Except Engine/Types)
- **All routes/screens** — Complete Expo Router directory. No sharing.
- **All components** — Copied from current `app/components/`, each app keeps what it needs, deletes what it doesn't.
- **All providers** — TRPCProvider, AuthProvider, Supabase client. Each app has its own Supabase project (separate auth).
- **Theme/CSS** — Own `global.css` with own CSS variables. Own fonts, splash, icons.
- **App config** — Own `app.config.ts` with hardcoded identity. No env var switching.
- **Metro config** — Own `metro.config.js`.
- **Build config** — Own `eas.json`, bundle IDs, signing, store metadata.

### What Gets Shared (Packages Only)
- **Game engine + Godot bridge** — Both apps play games. Extract from `app/lib/game-engine/` and `app/lib/godot/`.
- **Types/schemas** — Already in `@chriscode/shared`.
- **Base UI primitives** — `@chriscode/ui` (Button, Text, etc.) and `@chriscode/shared-ui` (platform-split components).
- **Theme base** — `@chriscode/theme` provides the token system. Each app fills in its own values.
- **Game bundler + economy engine** — Already separate packages.

### What Gets Deleted (Eventually)
- `BRAND_ID` env var switching in `app.config.ts`
- Runtime `activeBrand` detection via expo-constants
- `brandCssClass` toggling in root layout
- `.brand-amen` CSS overrides in `global.css`
- `app/lib/brand/index.ts` (no more "which brand am I?" at runtime)
- Conditional tab hiding based on `activeBrand.features`
- The old `app/` directory (after migration complete)

---

## Phase Breakdown

### Phase 1: Namespace Migration — SKIPPED
**Decision:** Keep `@slopcade/` namespace. Internal detail, not worth the churn.

Tasks:
- [x] ~~Rename all `package.json` names~~ — SKIPPED (keeping @slopcade/)
- [x] ~~Update all imports~~ — SKIPPED
- [x] ~~Update `tsconfig.json` path aliases~~ — SKIPPED
- [x] ~~Update `pnpm-workspace.yaml`~~ — SKIPPED
- [x] ~~Verify build~~ — SKIPPED

---

### Phase 2: Scaffold Two Apps (Fork from Current `app/`)
**Goal:** Two fully functional Expo apps, each a complete fork of the current `app/`.

Rather than building from scratch, we fork the current app into both directories. Each app starts as a full copy, then we prune what it doesn't need.

Tasks:
- [x] Copy `app/` → `apps/slopcade/` (full copy, rename package to `@chriscode/slopcade`)
- [x] Copy `app/` → `apps/amen/` (full copy, rename package to `@chriscode/amen`)
- [x] Slopcade `app.config.ts`: hardcode slopcade identity (remove `BRAND_ID` switching)
- [x] Amen `app.config.ts`: hardcode amen identity (remove `BRAND_ID` switching)
- [x] Each app gets its own `metro.config.js` (copy current, adjust paths)
- [x] Slopcade `global.css`: keep slopcade theme, remove `.brand-amen` overrides
- [x] Amen `global.css`: use amen theme as the default (no `.brand-amen` class needed — it IS amen)
- [x] Remove `lib/brand/` from both apps (no brand detection needed — each app knows what it is)
- [x] Remove conditional brand checks from layouts (e.g., `activeBrand.features.socialFeed` → just show/hide directly)
- [x] Update `pnpm-workspace.yaml` to include `apps/slopcade` and `apps/amen`
- [x] Update root `package.json` scripts: `pnpm dev:slopcade`, `pnpm dev:amen`, etc.
- [x] Update devmux config: dedicated services per app (`metro-slopcade`, `metro-amen`, `ios-slopcade`, `ios-amen`, `web-slopcade`, `web-amen`)
- [x] Set up separate Supabase project credentials for each app
- [x] Verify both apps boot on web and iOS

**Parallel opportunities:** Slopcade setup (A) and Amen setup (B) are independent after the initial copy.

**Exit criteria:** Both apps render and function. Each has hardcoded identity. No `BRAND_ID` env var. `tsc -b` passes.

---

### Phase 3: Prune Each App
**Goal:** Each app only contains the code it actually needs.

Now that both apps are complete forks, we remove what doesn't belong in each.

#### From Slopcade, remove:
- [ ] Organization/church management code (if any)
- [ ] Amen-specific content packs
- [ ] Any amen-specific assets

#### From Amen, remove:
- [ ] Game editor (full creation environment) — amen is play-only
- [ ] Social feed
- [ ] AI Maker / Chat
- [ ] Web admin dashboard
- [ ] Dev tools / examples
- [ ] UGC-related code
- [ ] Slopcade-specific assets

#### In both apps:
- [ ] Remove the `@chriscode/brands` dependency for feature-flag gating. Each app just IS its features — no need to check `activeBrand.features.gameEditor` when you either have the editor or you don't.
- [ ] Simplify tab layout — each app defines its own tabs directly, no conditional showing/hiding

**Exit criteria:** Each app contains only its own code. No dead code from the other brand.

---

### Phase 4: Extract Game Runtime + Godot Bridge
**Goal:** The game engine and Godot bridge live in shared packages, imported by both apps.

This is the main shared code extraction. Both apps play games, so the engine must be shared.

Tasks:
- [ ] Create `packages/game-runtime/` (`@chriscode/game-runtime`) from `app/lib/game-engine/`
  - Public API: game loading, entity management, scripting sandbox, physics config
  - Platform-split where needed (`.web.ts` / `.native.ts`)
- [ ] Create `packages/godot-bridge/` (`@chriscode/godot-bridge`) from `app/lib/godot/`
  - Public API: `createGodotBridge()`, `GodotView` component
  - Already has platform-split pattern (`GodotBridge.web.ts`, `GodotBridge.native.ts`)
- [ ] Both apps depend on `@chriscode/game-runtime` and `@chriscode/godot-bridge`
- [ ] Remove duplicated engine code from both apps' `lib/` directories
- [ ] Validate iOS native module linking works from workspace package location (CocoaPods + Expo autolinking)
- [ ] Validate game plays correctly in both apps

**Risk:** Expo autolinking + react-native-godot native module resolution from a workspace package. Test early on iOS.

**Exit criteria:** Both apps can load and play a game. Engine code exists only in packages, not in either app.

---

### Phase 5: Per-App Design + Theming
**Goal:** Each app looks and feels intentionally different.

Tasks:
- [ ] Slopcade `global.css`: dark-first, neon/playful palette, chaotic energy
- [ ] Amen `global.css`: warm cream/gold/navy palette, dignified, reverent feel
- [ ] Audit shared packages (`@chriscode/ui`, `@chriscode/shared-ui`) to ensure they ONLY reference semantic tokens (`bg-theme-background`, `text-theme-primary`) — never hardcoded colors
- [ ] Per-app fonts loaded in each app's `_layout.tsx`
- [ ] Per-app splash screen and app icon assets
- [ ] Each app can customize navigation structure independently (Slopcade: browse-first with creator tools, Amen: party-first with curated catalog)

**Exit criteria:** Both apps are visually distinct. Shared components render correctly in both contexts.

---

### Phase 6: Build/Deploy Pipeline
**Goal:** Each app builds and deploys independently.

Tasks:
- [ ] Separate EAS project IDs per app
- [ ] CI matrix: build both apps + run shared package tests
- [ ] Separate Cloudflare Pages deployments (already partially set up: `slopcade` and `amen-games`)
- [ ] Separate App Store / Play Store listings
- [ ] Separate signing credentials
- [ ] Turbo pipeline updates for new app locations
- [ ] Separate Supabase projects fully configured (auth, storage, etc.)

**Exit criteria:** Both apps deploy to their respective stores/hosts independently. Separate release trains.

---

### Phase 7: Cleanup + Cutover
**Goal:** Remove the old `app/` monolith and all brand-switching plumbing.

Tasks:
- [ ] Delete `app/` directory
- [ ] Simplify `@chriscode/brands` — keep only what's still useful (content policy for API, basic metadata). Remove feature flags (each app just IS its features now).
- [ ] Remove old devmux services that referenced `app/`
- [ ] Update all documentation (AGENTS.md, skills, README)
- [ ] Final `tsc -b` + test pass across entire monorepo
- [ ] Clean up any `@slopcade/` references that slipped through

**Exit criteria:** No references to old `app/` directory or `@slopcade/` namespace. Both apps pass full test suite.

---

## Migration Strategy

**Incremental, not big-bang.** The old `app/` continues to work during the entire migration.

1. **Phase 1** (namespace) — Pure rename, no structural change
2. **Phase 2** (fork) — Additive, creates new directories alongside existing `app/`
3. **Phase 3** (prune) — Each app deletes what it doesn't need
4. **Phase 4** (extract) — Engine code moves from apps to packages (both apps import it)
5. **Phase 5-6** (polish) — Theming and CI
6. **Phase 7** (cutover) — Only after both apps have full feature parity with old `app/`

No flag day. Old `app/` is the fallback until Phase 7.

## Critical Path

```
Phase 1 (namespace) → Phase 2 (fork) → Phase 3 (prune) → Phase 4 (extract engine) → Phase 7 (cutover)
                                                         ↘ Phase 5 (theming)
                                      ↘ Phase 6 (CI/deploy) can start as soon as apps exist
```

## Effort Estimate

| Phase | Effort | Parallelism |
|-------|--------|-------------|
| 1 - Namespace | 0.5-1 day | 1 agent (mechanical rename) |
| 2 - Scaffold/Fork | 1-2 days | 2 agents (one per app) |
| 3 - Prune | 1-2 days | 2 agents (one per app) |
| 4 - Engine Extract | 3-5 days | 2 agents |
| 5 - Theming | 1-2 days | 2 agents |
| 6 - CI/Deploy | 2-3 days | 1-2 agents |
| 7 - Cleanup | 1 day | 1 agent |
| **Total** | **~2-3 weeks** | **High parallelism** |
