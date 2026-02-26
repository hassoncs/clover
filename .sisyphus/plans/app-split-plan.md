# Slopcade Monorepo Split Plan

## Vision

The project has evolved into **two fundamentally different product categories** that happen to share an engine:

### Creator Tools — Build things
| App | Codename | Domain | Purpose |
|-----|----------|--------|---------|
| **Shader Editor** | `shader` | TBD | "TikTok of shaders" — AI chat + shader editor + social feed/fork. Shaders only, no game logic. |
| **Slopcade** | `slopcade` | slopcade.com | Full game builder — AI chat + game editor + shader editor + social feed. Eventually may include party features. |

### Party Players — Play things
| App | Codename | Domain | Purpose |
|-----|----------|--------|---------|
| **Slopbox** | `slopbox` | slopbox.tv | Party games (secular). Fixed set of pre-made games. No editor, no AI chat. |
| **Amen** | `amen` | amen.games | Party games (Christian). White-label of Slopbox with different content/branding. |

**Key distinction:** Party apps are **white-labeled fixed game sets** served by a shared party infrastructure. Creator tools are **distinct products** — they use the same engine but are NOT white-labels of each other. The shader editor is a strict subset of Slopcade (shaders only, no game builder).

**The brand/white-label system (`BrandId`, `x-brand-id`) applies to party apps.** Creator tools share packages but are architecturally independent products.

---

## Current State

### Apps
```
apps/slopcade/   — Has EVERYTHING: editor, party, social feed, browse, maker, lab, shaders
apps/amen/       — Party games only (no editor, no feed, no maker)
apps/admin/      — Admin dashboard
apps/landing-*/  — Marketing sites
apps/storybook/  — UI playground
```

### What's In Each Tab (Current)
| Slopcade (current, mixed) | Amen (party-only) |
|---------------------------|-------------------|
| Feed, Browse, Lab, Maker, Profile | Browse, Chat, Profile |
| + editor routes, party routes, social, effects | + party routes only |

### Feature → Code Location Map

| Feature | Current Location | Destination Package |
|---------|-----------------|---------------------|
| **Editor UI** (44 files: panels, dockview, toolbar, inspector) | `apps/slopcade/components/editor/` | `packages/editor/` |
| **Graph Editor** (node-based visual editor) | `apps/slopcade/components/editor/graph/` | `packages/editor/` |
| **AI Chat** (game/shader creation via chat) | `apps/slopcade/components/create-game/` | `packages/editor-ai/` |
| **Social Feed** (likes, comments, follows, fork) | `apps/slopcade/components/social/` (11 files) | `packages/social/` |
| **Effects Tuning UI** | `apps/slopcade/components/effects/` | `packages/editor/` or `packages/ui/` |
| **Shader System** (100+ GLSL, compiler, registry) | `shared/src/effects/` | Stays (shared by all) |
| **Graph Core Engine** | `shared/src/graph-core/` | Stays (shared by all) |
| **Party UI** (lobby, buzzer, scoreboard, phases) | 3 places — see below | `packages/party/` |
| **Party Logic** (context, WebSocket, phaseRegistry) | `apps/*/lib/party/` | `packages/party/` |
| **Party Backend** (PartyRoomDO, QuickJS) | `api/src/party/` | Stays (API-level) |
| **Game Runtime** (ECS, QuickJS sandbox) | `packages/game-runtime/` | Stays (shared by all) |
| **Godot Bridge** | `packages/godot-bridge/` | Stays (shared by all) |
| **Browse/Discover** | `packages/ui/src/browse/`, `discover/` | Stays in `packages/ui/` |
| **Auth/Billing** | `packages/ui/src/auth/`, `billing/` | Stays in `packages/ui/` |

### Duplication Problem
Near-identical code in BOTH `apps/slopcade/components/` AND `apps/amen/components/`:
- `AnimatedSplashScreen.tsx`, `WithGodot.tsx`, `FullScreenHeader.tsx`
- `auth/`, `billing/`, `browse/`, `economy/`, `effects/`, `game/`
- `navigation/`, `party/`, `shared/`, `themes/`, `toast/`, `ui/`

Amen has **6 extra party components** + **5 extra phase files** — Amen is the more feature-complete party codebase.

### Party Code Ownership Problem
Party code exists in **three places**:
1. `packages/ui/src/party/` — 2,124 lines of shared party UI
2. `apps/slopcade/components/party/` — app-local party components
3. `apps/amen/components/party/` — app-local party components (most complete)

Plus `apps/*/lib/party/` with `PartyContext`, phase definitions, WebSocket connections.

---

## Target State

### Product → Package Composition

Each app is a **thin shell** that composes packages:

```
┌─────────────────────────────────────────────────────────────┐
│                     SHARED FOUNDATION                        │
│  packages/ui  ·  packages/app-lib  ·  packages/theme         │
│  packages/brands  ·  packages/game-runtime                   │
│  packages/godot-bridge  ·  shared/                           │
└──────────┬──────────────────────┬────────────────────────────┘
           │                      │
    ┌──────┴──────┐        ┌──────┴──────┐
    │ CREATOR PKG │        │  PARTY PKG  │
    │             │        │             │
    │ editor/     │        │ party/      │
    │ editor-ai/  │        │             │
    │ social/     │        │             │
    └──────┬──────┘        └──────┬──────┘
           │                      │
    ┌──────┴──────┐        ┌──────┴──────┐
    │ CREATOR APPS│        │ PARTY APPS  │
    │             │        │             │
    │ slopcade    │        │ slopbox     │
    │ shader-ed   │        │ amen        │
    └─────────────┘        └─────────────┘
```

### Package Architecture (End State)
```
apps/
  slopcade/              — Full game builder (editor + AI + social + shaders)
  shader-editor/         — Shader-only creator (editor + AI + social, NO game logic)
  slopbox/               — Party games (secular)
  amen/                  — Party games (Christian)
  admin/                 — Admin dashboard

packages/
  # ── Foundation (ALL apps) ──
  brands/                — Brand manifests + feature flags + app capability config
  theme/                 — Design tokens, Tailwind
  ui/                    — Shared UI primitives (Button, Input, auth, billing, browse, game, navigation)
  app-lib/               — Native utilities + shared hooks (useAuth, etc.)
  game-runtime/          — Game execution engine (ECS, QuickJS sandbox)
  godot-bridge/          — Godot ↔ TS communication
  game-bundler/          — Game compilation (source → GameDefinition)

  # ── Creator packages (Slopcade + Shader Editor) ──
  editor/                — Editor UI: panels, dockview, inspector, graph editor, code editor, toolbar
  editor-ai/             — AI chat: conversation UI, thread management, design document sync
  social/                — Social feed: likes, comments, follows, fork, discovery

  # ── Party packages (Slopbox + Amen) ──
  party/                 — ALL party code: components, context, phases, WebSocket, hooks

  # ── Specialized (specific consumers) ──
  codemirror-lang-glsl/  — GLSL language support (creator apps)
  economy-engine/        — Economy simulation (game builder)
  content-pipeline/      — Content processing (party content)

shared/                  — Core logic, types, schemas, effects (100+ GLSL), validation, scripting
api/                     — Single Cloudflare Worker (all brands)
```

### App → Package Dependencies

| Package | Slopcade | Shader Ed | Slopbox | Amen |
|---------|----------|-----------|---------|------|
| `ui` (foundation) | ✓ | ✓ | ✓ | ✓ |
| `app-lib` | ✓ | ✓ | ✓ | ✓ |
| `theme` | ✓ | ✓ | ✓ | ✓ |
| `brands` | ✓ | ✓ | ✓ | ✓ |
| `game-runtime` | ✓ | ✓* | ✓ | ✓ |
| `godot-bridge` | ✓ | ✓* | ✓ | ✓ |
| `editor` | ✓ | ✓ (subset) | ✗ | ✗ |
| `editor-ai` | ✓ | ✓ | ✗ | ✗ |
| `social` | ✓ | ✓ | ✗ | ✗ |
| `party` | ✗** | ✗ | ✓ | ✓ |
| `game-bundler` | ✓ | ✗ | ✗ | ✗ |
| `economy-engine` | ✓ | ✗ | ✗ | ✗ |
| `codemirror-lang-glsl` | ✓ | ✓ | ✗ | ✗ |

*Shader editor needs Godot for rendering shader previews
**Slopcade may add party later — the dependency is simply not included yet

### Tab Structure (End State)

| Slopcade | Shader Editor | Slopbox | Amen |
|----------|---------------|---------|------|
| Feed, Browse, Lab, Maker, Profile | Feed, Browse, Maker, Profile | Browse, Chat, Profile | Browse, Chat, Profile |
| Full game editor | Shader-only editor | Party host/join/play | Party host/join/play |

---

## Phased Execution Plan

### Phase 0: Feature Flags + New Brands (~1-2 hours)
**Goal:** Single source of truth for what features each app supports.

**Changes:**
1. Expand `BrandManifest` in `packages/brands/src/types.ts`:
   ```typescript
   // App capability categories
   interface BrandFeatures {
     // Creator capabilities
     hasEditor: boolean;
     hasGameBuilder: boolean;   // full game builder (entities, physics, scripting)
     hasShaderEditor: boolean;  // shader/effects editor only
     hasSocialFeed: boolean;
     hasAIChat: boolean;
     
     // Party capabilities  
     hasPartyGames: boolean;
   }
   ```
2. Expand `BrandId`:
   ```typescript
   type BrandId = "slopcade" | "shader-editor" | "slopbox" | "amen";
   ```
3. Add feature configs:
   - `slopcade`: all creator features ✓, party ✗ (for now)
   - `shader-editor`: shader ✓, social ✓, AI ✓, gameBuilder ✗, party ✗
   - `slopbox`: party ✓, everything else ✗
   - `amen`: party ✓, everything else ✗
4. Create manifests:
   - `packages/brands/src/manifests/slopbox.ts` — secular party branding (sloppy/juicy/goo aesthetic, orange/green/purple on dark)
   - `packages/brands/src/manifests/shader-editor.ts` — creator branding (TBD, can be minimal)
5. Register all in `packages/brands/src/index.ts`

**Dependencies:** None
**Risk:** Low — additive only
**Acceptance:** `tsc --noEmit` passes, all existing brand lookups still work

---

### Phase 1: Extract `packages/party/` (~1-2 days)
**Goal:** Consolidate ALL party code into one package. Critical path.

**Why separate package?** Metro doesn't tree-shake. Party in `packages/ui` = party code in creator app bundles. Separate package = clean dependency boundary at `package.json` level.

**Structure:**
```
packages/party/
  package.json         — @slopcade/party
  tsconfig.json
  src/
    components/        — ALL party UI (consolidated from 3 sources)
    context/           — PartyContext (brand-parametrized, not forked)
    phases/            — All phase definitions
    hooks/             — usePartyNarration, etc.
    lib/               — WebSocket, phaseRegistry  
    index.ts
```

**Consolidation:**
1. Canonical base: `apps/amen/` party code (most complete — has 6 extra components, 5 extra phases)
2. Merge from: `apps/slopcade/` party code (check for unique additions)
3. Merge from: `packages/ui/src/party/` (2,124 lines — decide: merge or delete if stale)
4. Parametrize `PartyContext` via brand manifest (not forked files)
5. Fix `@/lib/party/*` → relative imports within package
6. Delete all three original sources

**Dependencies:** Phase 0 (brand config for parametrization)
**Risk:** High — largest code move
**Acceptance:** Both amen and slopcade build using `@slopcade/party` imports, party games work

---

### Phase 1b: Extract Creator Packages (~1-2 days, parallel with Phase 1)
**Goal:** Move creator-specific code from `apps/slopcade/components/` into packages that both Slopcade and the Shader Editor can import.

**`packages/editor/`** — `@slopcade/editor`
```
src/
  panels/            — HierarchyPanel, PropertiesPanel, ExplorerPanel, etc.
  graph/             — GraphCanvas, GraphEditor, GraphNode, NodePalette, InspectorPanel
  code-editor/       — Monaco/CodeMirror wrapper for GLSL + scripts
  inspector/         — ContextMenu, hover overlays
  layout/            — DockviewLayout, ResizablePanelLayout, ResponsiveEditorLayout
  toolbar/           — EditorToolbar, EditorTopBar, FileTabBar
  preview/           — PreviewControls, PreviewGate, StageArea, StageContainer
  assets/            — AssetGallery, AssetAlignment
  providers/         — EditorProvider (undo/redo, selection, modes)
  hooks/             — useEditorChatSession, useDesignDocument, useWorkspaceFiles, etc.
  index.ts
```
Source: `apps/slopcade/components/editor/` (44 files)

**`packages/editor-ai/`** — `@slopcade/editor-ai`
```
src/
  ChatConversation.tsx
  ChatMessage.tsx
  ChatMessageList.tsx
  ChatTextArea.tsx
  SharedDocumentPanel.tsx
  ThreadList.tsx
  useThreads.ts
  index.ts
```
Source: `apps/slopcade/components/create-game/` (8 files)

**`packages/social/`** — `@slopcade/social`
```
src/
  CommentItem.tsx
  CommentsBottomSheet.tsx
  FollowButton.tsx
  GameComments.tsx
  LikeButton.tsx
  LikersBottomSheet.tsx
  NotificationItem.tsx
  ReportModal.tsx
  SocialFeedCard.tsx
  StarRating.tsx
  index.ts
```
Source: `apps/slopcade/components/social/` (11 files)

**Dependencies:** None (independent of Phase 1)
**Risk:** Medium — import rewrites, but all consumers are in one app initially
**Acceptance:** `apps/slopcade` builds using `@slopcade/editor`, `@slopcade/editor-ai`, `@slopcade/social`

---

### Phase 1c: Consolidate Duplicated Foundation Code (~2-4 hours, parallel)
**Goal:** Move remaining duplicated components/hooks from both apps into packages.

**Move to `packages/ui/`:**
- Root: `AnimatedSplashScreen`, `WithGodot`, `FullScreenHeader`, `DownloadForOfflineButton`
- Dirs: `auth/`, `billing/`, `browse/`, `economy/`, `game/`, `navigation/`, `shared/`, `themes/`, `toast/`, `ui/`
- Re-export shims in apps during transition

**Move to `packages/app-lib/src/hooks/`:**
- `useAuth`, `useBrowseGames`, and other duplicated hooks

**Shared providers:**
- Extract `createAppProviders(brandId)` → `packages/ui/src/providers/`
- Extract `initSentry()` → `packages/app-lib/`
- Keep app-local `_layout.tsx` as thin composition (Expo Router constraint)

**Dependencies:** None
**Acceptance:** Both apps build, no duplicated source files remain

---

### Phase 2: Scaffold Party Apps (~2-4 hours)
**Goal:** Slopbox as a new party app (copy of thin amen shell).

After Phase 1, amen is a thin shell (~15 files) importing from `@slopcade/party` and shared packages.

**Steps:**
1. Copy `apps/amen/` → `apps/slopbox/`
2. Update config: name `Slopbox`, slug `slopbox`, scheme `slopbox`, bundleId `tv.slopbox.app`, domain `slopbox.tv`, brandId `slopbox`
3. Assets: `apps/slopbox/assets/brands/slopbox/` (icon + splash — sloppy goo aesthetic)
4. Metro port: **8087**
5. `pnpm-workspace.yaml`: add `'apps/slopbox'`
6. Root scripts: `dev:slopbox`, `ios:slopbox`, `android:slopbox`, `web:slopbox`, `ship:slopbox`
7. Devmux: `metro-slopbox` (port 8087)
8. Extract `createMetroConfig(port)` factory to share across all apps

**Dependencies:** Phase 0 + Phase 1
**Acceptance:** `pnpm dev:slopbox` works, party games render with Slopbox branding

---

### Phase 3: Scaffold Shader Editor App (~half day)
**Goal:** New creator app for shaders-only.

**Bootstrap from Slopcade** (after Phase 1b extracted editor packages):

**Key differences from Slopcade:**
- NO `game-bundler`, `economy-engine`, game-specific panels
- NO physics/entity editing — shaders/effects only
- YES: shader editor, AI chat, social feed, browse
- Simplified editor: shader graph + code editor + preview. No hierarchy/entity panels.

**Steps:**
1. Create `apps/shader-editor/` with minimal Expo Router shell
2. Tabs: Feed, Browse, Maker, Profile
3. Editor route imports from `@slopcade/editor` but only mounts shader-relevant panels
4. Config: port **8088**, brandId `shader-editor`
5. Root scripts, devmux, workspace registration

**Dependencies:** Phase 1b (editor packages extracted)
**Acceptance:** Shader editor app builds, can edit shaders via AI chat, social feed works

---

### Phase 4: Remove Party from Slopcade (~1-2 hours)
**Goal:** Slopcade becomes creator-only (for now).

1. Delete `apps/slopcade/app/party/`
2. Remove party navigation from `_layout.tsx`
3. Remove `@slopcade/party` from `package.json`
4. Clean up party imports
5. Redirect stubs for removed deep links

**Dependencies:** Phase 2 (Slopbox exists)
**Acceptance:** Slopcade builds without party, creator features intact

---

### Phase 5: API Feature Gating (~1 hour)
**Goal:** API enforces capability boundaries per brand.

1. `requireFeature()` tRPC middleware using brand manifest
2. Gate creator routes (chat, social, fork) behind creator features
3. Gate party routes behind `hasPartyGames`
4. Add `slopbox` and `shader-editor` to API brand validation
5. Replace hardcoded brand checks with feature checks

**Dependencies:** Phase 0
**Acceptance:** API returns 403 for wrong brand → wrong feature

---

### Phase 6: Cleanup & Docs (~half day)
1. Delete re-export shims (codemod `@/` → package imports)
2. Delete stale `packages/ui/src/party/` (now in `packages/party/`)
3. Run `knip` for dead code
4. Update AGENTS.md: port table (8085-8088), scripts, app descriptions, product categories
5. Update CI/CD for 4-app builds
6. Start App Store provisioning for Slopbox + Shader Editor

---

## Execution Order

```
Phase 0 (Brands + Features)
       │
       ├── Phase 1  (Extract packages/party)    ─── sequential ──→ Phase 2 (Scaffold Slopbox)
       │                                                                     │
       ├── Phase 1b (Extract creator packages)  ─── sequential ──→ Phase 3 (Scaffold Shader Editor)
       │                                                                     │
       └── Phase 1c (Consolidate foundation)                                 │
                                                                             │
                                                          Phase 4 (Remove party from Slopcade)
                                                                             │
                                                          Phase 5 (API feature gating)
                                                                             │
                                                          Phase 6 (Cleanup + docs)
```

**Phases 1, 1b, 1c are independent — run in parallel.**
Phase 2 depends on Phase 1. Phase 3 depends on Phase 1b. Phase 4 depends on Phase 2.

**Total estimated effort: ~5-7 days** (more than the 3-app plan due to creator package extraction + 4th app)

---

## Key Architectural Decisions

### Two product categories, not one white-label system
Party apps (Slopbox, Amen) use the white-label brand system — same code, different content/branding. Creator tools (Slopcade, Shader Editor) are independent products that happen to share packages. Don't try to white-label the creator tools.

### Shader Editor = Slopcade minus game-builder
The shader editor imports `@slopcade/editor`, `@slopcade/editor-ai`, `@slopcade/social` — the same packages as Slopcade. But it skips `game-bundler`, `economy-engine`, entity/physics panels. This means the editor package needs to be composable (mount individual panels) rather than monolithic.

### Party: separate package, not `packages/ui`
Metro doesn't tree-shake. Separate `packages/party/` means creator apps never ship party code. Package-level dependency boundary > hoping for tree-shaking.

### Creator packages: extract NOW, not "later"
With 2 creator apps from day 1, editor code MUST be in packages. Can't leave it in `apps/slopcade/components/` and import across apps — Metro doesn't resolve cross-app imports.

### Slopcade may add party later
The architecture supports it: just add `@slopcade/party` to Slopcade's `package.json` and mount the party routes. The separation is at the dependency level, not hardcoded exclusion.

### Import strategy: re-export shims
Don't mass-codemod `@/` imports. Create 1-line re-export shims → clean up in Phase 6.

---

## What "Party Creation" vs "Party Serving" Means

| Concern | Where It Lives | Who Uses It |
|---------|---------------|-------------|
| **Party serving** (hosting, playing, lobby, phases, WebSocket) | `packages/party/` | Slopbox, Amen |
| **Party content pipeline** (generating trivia, quips, prompts) | `packages/content-pipeline/`, `api/src/party/content-generation/` | Admin tools, API |
| **Game engine** (physics, rendering, sprites) | `packages/game-runtime/`, `packages/godot-bridge/`, `shared/` | All apps (party games use the engine too) |
| **Game builder** (creating new game definitions) | `packages/editor/`, `packages/editor-ai/` | Slopcade, Shader Editor |
| **Shader authoring** (GLSL editing, effect graphs) | `packages/editor/` (graph + code editor), `shared/src/effects/` | Slopcade, Shader Editor |

Party apps consume **pre-built games**. Creator apps **build games and shaders**. Both use the same engine to run them.

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Editor package needs to be composable (shader-only vs full) | High | Design editor as panel composition, not monolith. Shader Editor mounts subset of panels. |
| Party code has hidden `@/lib/speech`, `@/lib/audio` deps | High | Audit all imports before moving; extract or pass as context |
| PartyContext divergence between apps | Medium | Parametrize via brand manifest, not forked files |
| 4 metro instances in dev | Low | Devs run 1-2 at a time; ports pre-assigned (8085-8088) |
| `packages/ui/src/party/` 2,124 lines — stale? | Medium | Decide canonical source NOW; merge or delete |
| Apple/Google provisioning for 2 new apps | High | Start in Phase 0 — takes weeks |
| Cross-app import issues with Metro | Medium | All shared code in `packages/`, never cross-app |

---

## Open Questions

1. **Shader Editor codename/domain?** Currently using `shader-editor` — want something catchier?
2. **Slopbox content:** Own party packs, or share Slopcade's default set?
3. **Slopcade party transition:** Redirect existing users to Slopbox, or silently remove?
4. **Shader Editor scope:** Just shaders/effects, or also simple visual compositions (no physics)?
5. **Do party apps need Godot?** If party games are purely UI-driven, stripping Godot saves ~15-20MB per app. But if any party game uses the physics engine for rendering, they need it.
6. **Timeline priority:** Which app first? Slopbox (simpler, copy of amen) or Shader Editor (requires package extraction)?

---

## TODOs (Executable Checklist)

> Status key: `- [ ]` pending, `- [x]` done.
> Rule: update these checkboxes as execution progresses.

### Wave 1 - Foundations (can run in parallel)

- [x] 1. Add creator/party capability flags to `BrandManifest` in `packages/brands/src/types.ts`.
- [x] 2. Expand `BrandId` to include `shader-editor` and `slopbox`.
- [x] 3. Add `shader-editor` manifest in `packages/brands/src/manifests/shader-editor.ts`.
- [x] 4. Add `slopbox` manifest in `packages/brands/src/manifests/slopbox.ts`.
- [x] 5. Register new manifests in `packages/brands/src/index.ts`.
- [x] 6. Validate brand defaults for all four apps (`slopcade`, `shader-editor`, `slopbox`, `amen`).

### Wave 2 - Package extraction (maximum parallelism)

- [x] 7. Create `packages/party/` workspace package scaffold (`package.json`, `tsconfig.json`, `src/index.ts`).
- [x] 8. Consolidate party UI/components into `packages/party/src/components/` using Amen as canonical base.
- [x] 9. Consolidate party phases into `packages/party/src/phases/` and unify phase registry usage.
- [x] 10. Move `PartyContext` and party hooks into `packages/party/src/context/` and `packages/party/src/hooks/`.
- [x] 11. Rewire party-internal imports to package-local paths (remove app-local `@/lib/party/*` coupling).
- [x] 12. Create `packages/editor/` scaffold and export surface.
- [x] 13. Move editor panels/layout/toolbar/preview/assets/providers/hooks from `apps/slopcade/components/editor/` to `packages/editor/src/`.
- [x] 14. Create `packages/editor-ai/` scaffold and move chat/thread/shared-doc components from `apps/slopcade/components/create-game/`.
- [x] 15. Create `packages/social/` scaffold and move social feed components from `apps/slopcade/components/social/`.
- [ ] 16. Consolidate duplicated foundation components from app-local folders into `packages/ui/`.
- [ ] 17. Consolidate duplicated hooks into `packages/app-lib/src/hooks/`.
- [ ] 18. Extract shared provider composition (`createAppProviders`) and shared app init (`initSentry`) into packages.

### Wave 3 - Consumer migration

- [ ] 19. Migrate `apps/amen` imports to `@slopcade/party` and shared package paths.
- [ ] 20. Migrate `apps/slopcade` creator imports to `@slopcade/editor`, `@slopcade/editor-ai`, `@slopcade/social`.
- [ ] 21. Remove old party code sources from `apps/slopcade/components/party/`, `apps/amen/components/party/`, and stale `packages/ui/src/party/` once migrated.
- [x] 22. Add temporary re-export shims where needed to keep migration incremental and low risk.

### Wave 4 - New app shells

- [x] 23. Scaffold `apps/slopbox/` from thin `apps/amen/` shell.
- [x] 24. Configure Slopbox app identity (name, slug, scheme, bundle ID, domain, brand ID).
- [x] 25. Add Slopbox assets under `apps/slopbox/assets/brands/slopbox/`.
- [x] 26. Register Slopbox workspace/scripts/devmux (port 8087) and shared Metro config factory usage.
- [x] 27. Scaffold `apps/shader-editor/` shell with tabs (Feed, Browse, Maker, Profile).
- [x] 28. Mount shader-only editor composition from `@slopcade/editor` in shader editor routes.
- [x] 29. Register shader editor workspace/scripts/devmux (port 8088).

### Wave 5 - Product boundary enforcement

- [x] 30. Remove party routes/navigation/dependencies from `apps/slopcade` (creator-only state).
- [ ] 31. Add API `requireFeature()` middleware and replace hardcoded brand gates with feature gates.
- [ ] 32. Register `slopbox` and `shader-editor` in API brand validation.

### Wave 6 - Verification and cleanup

- [ ] 33. Run type checks/build checks for all affected packages and apps.
- [ ] 34. Validate party flows end-to-end in `amen` and `slopbox`.
- [ ] 35. Validate creator flows end-to-end in `slopcade` and `shader-editor`.
- [ ] 36. Run dead-code cleanup (`knip`) and remove migration shims.
- [x] 37. Update `AGENTS.md`/ops docs for ports/scripts/app matrix.
- [ ] 38. Prepare CI/CD updates for four app targets.
- [ ] 39. Track App Store/Play provisioning kickoff for Slopbox and Shader Editor.

### Exit Criteria

- [ ] 40. All checkboxes complete.
- [ ] 41. No party code ships in creator app dependency graph.
- [ ] 42. No creator code ships in party app dependency graph.
- [ ] 43. All four apps boot with correct branding and capability boundaries.
