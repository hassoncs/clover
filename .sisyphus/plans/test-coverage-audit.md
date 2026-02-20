# Test Coverage Audit — Slopcade & Amen

**Date**: 2026-02-20
**Status**: Assessment complete

---

## Summary

| Area | Test Files | Tests | Status |
|------|-----------|-------|--------|
| **API** (`api/`) | 77 | 838 (755 pass, 59 fail, 24 skip) | ⚠️ 26 files failing |
| **Shared** (`shared/`) | 54 | 1,209 (all pass) | ✅ Green |
| **game-runtime** | 24 | 337 (all pass, 5 file failures) | ⚠️ Import/config issues |
| **game-bundler** | 7 | 308 (275 pass, 33 fail) | ⚠️ |
| **godot-bridge** | 6 | 87 (73 pass, 14 fail) | ⚠️ |
| **economy-engine** | 4 | 84 (all pass) | ✅ Green |
| **content-pipeline** | 9 | 61 (60 pass, 1 fail) | ⚠️ 1 failure |
| **Apps/Amen** | 3 | ~small | Minimal coverage |
| **Apps/Slopcade** | 7 | ~small | Minimal coverage |
| **E2E** | 11 | — | Bridge + Editor + Party |

**Total**: ~185 test files, ~2,900+ tests

---

## What's Well Covered (High Confidence)

### API — Strong Coverage
- **Social features**: Comments, reactions, follows, bookmarks, extra — all have dedicated route tests
- **Games CRUD**: Create, list, get, update, delete, play count, public listing
- **Economy services**: Wallet, gems, promo codes, signup codes — service-level tests
- **Moderation**: Route tests + service tests
- **Notifications**: Route tests
- **AI pipeline**: Classifier, generator, validator, agent execution engine, theme planning, asset service, scenario client, skill system (13 test files)
- **Chat system**: AG-UI mapper, tools, lifecycle integration, stream integration
- **Party games**: PartyRoomDO (6 test files), 13 individual game templates, protocol, pack scheduler, QuickJS runner, chroma-clues
- **Services**: BlobStore, PackageCompiler, PackageValidator, WorkspaceCopyService, AuditService, Git (R2Fs, CachedR2Fs, GitService)

### Shared — Excellent Coverage (54 files, 1,209 tests, all green)
- **Effects system**: Compiler, authoring, budget, catalog, feedback, GLSL imports, registry, resources, snapshot, types, validator (14 test files)
- **Expressions**: ComputedValueSystem, EvalContextBuilder, expressions, property watching (DependencyAnalyzer, EntityContextProxy, PropertyCache, PropertyRegistry, TypeCoercion, WatchRegistry, integration)
- **Validation**: GameDefinition validator, semantic validator, mappers, playable, scoring, shader linter
- **Graph system**: Core (commands, integration, validator, benchmarks), adapters (contract, AI generation, e2e integration, registry, effects, narrative)
- **Chat**: Accumulator, AG-UI compat
- **Workspace**: Hash, module graph
- **Other**: EventBus, TagRegistry, SlotRegistry, layout helpers, asset-url utils, scripting modules (content, party), GameDefinition tuning, remix

### Packages — Good Coverage
- **economy-engine**: 4 test files, 84 tests, all green — integration, schema, simulation jobs, simulator
- **game-runtime**: 24 test files — SequenceManager, WorldOps, ArtifactResolver, EffectDispatcher, GameLoopController, PackageRuntimeAdapter/Orchestrator, PrefabInstantiator, event queue, logger, live preview, hot reload, effects handler, progress, reconcile, GameState, EconomyRuntimeSystem, NetworkRuntimeSystem, BindingEvaluator, ensureStateDialogs
- **game-bundler**: 7 test files — FileReader, asset resolution, compile-all-r2-games, script scanning, sectioned bridge regression, unified loader, virtual bundle integration
- **godot-bridge**: 6 test files — bridge smoke, callback registry, coordinate utils, effects bridge, native serialization, callback regression
- **content-pipeline**: 9 test files — dedup hash, ingest adapters (biblequizzle, opentriviaqa, scripture-validator, theographic), source attribution, license validator, registry

### E2E — Targeted Coverage
- **Bridge**: 4 tests (contract, parity, core, debug)
- **Editor**: 3 specs (multi-context, native soft reset, party preview)
- **Party**: 4 specs (chroma-clues, question-answer, quick-poll, quiplash)

---

## Current Failures (Need Fixing)

### API (59 failing tests across 26 files)
Most failures cluster around:
1. **Workspace/Git** (`workspace-snapshot.test.ts`, `GameRepoDO.test.ts`, `ForkService.test.ts`): `gitService.commitFiles is not a function` — mock is stale after a refactor
2. **Party templates** (13 template tests): All failing — likely a shared dependency/runner issue
3. **Pack scheduler**: Failing on seasonal content merge
4. **Games route tests**: Basic CRUD operations failing
5. **Users route tests**: syncFromAuth failing
6. **Blob assets**: batchResolve failing
7. **Chat tools**: File operations failing
8. **Scenario client**: API error handling test failing
9. **Signup code**: Max uses validation failing

### Packages
- **game-runtime**: 5 files with import/config issues (tests themselves pass)
- **game-bundler**: 33 test failures
- **godot-bridge**: 14 test failures
- **content-pipeline**: 1 test failure

---

## Major Gaps — What's NOT Tested

### tRPC Routes Without ANY Tests (Critical)

| Router | Endpoints | Risk Level | Notes |
|--------|-----------|------------|-------|
| **organizations** | create, get, getBySlug, update, delete, listMyOrgs, join, joinBySlug, leave, getMembers, removeMember, updateMemberRole, regenerateJoinCode | **HIGH** | Core amen.dev feature — churches join/manage |
| **billing** | getSubscriptionStatus, getFreeSessionsRemaining, createSubscriptionIntent, createPortalSession, org checkout/portal/webhook, getCatalog | **HIGH** | Only waitlist subtopic tested, core subscription untested |
| **economy** | getBalance, getTransactions, estimateCost, authorizeGeneration, getProducts, processPurchase | **MEDIUM** | Service-level tests exist but no route tests |
| **partyContent** | import, list, update, review, generate, audio, snapshots, status transitions | **MEDIUM** | Content management for party games |
| **partyTemplates** | listByBrand, getById, generateNarration | **MEDIUM** | Template serving |
| **search** | query | **MEDIUM** | Full-text search |
| **invites** | create, isEmailInvited, redeem | **MEDIUM** | Gating mechanism |
| **contentDiagnostics** | checkDrift | **LOW** | Admin tooling |
| **monitoring** | signup velocity, game sessions, org registrations, active users, revenue, health | **LOW** | Admin dashboards |
| **admin/adminDashboard/adminTools** | Various admin operations | **LOW** | Internal tooling |
| **packageCompiler** | compile | **LOW** | Route wraps tested service |
| **uiComponents** | generateUITheme | **LOW** | AI-driven, hard to unit test |

### Frontend — Severely Undertested

#### Amen App (3 test files only)
- `MicButton.test.tsx` — mic button component
- `useSpeechToText.test.ts` — speech-to-text hook
- `featureFlags.test.ts` — feature flags utility

**Missing**: Auth flow, party hosting/joining, game playing, browse/discover, profile management, org joining/management, subscription management, settings, theming, offline mode

#### Slopcade App (7 test files only)
- `ChatTextArea.test.tsx` — chat input component
- `WireframePanel.test.tsx` — editor wireframe panel
- `LayoutAdapter.test.ts` / `WireframeModeProvider.test.tsx` — editor wireframe internals
- `MicButton.test.tsx` — mic button component
- `useSpeechToText.test.ts` — speech-to-text hook
- `featureFlags.test.ts` — feature flags utility

**Missing**: Auth flow, game creation, editor (code/preview/AI chat), game playing, browse/feed, social features (follow, like, comment), profile, settings, notifications

### Packages Without Tests
| Package | Notes |
|---------|-------|
| `app-lib` | Shared app utilities |
| `brands` | Brand configuration |
| `codemirror-lang-glsl` | GLSL language support |
| `game-inspector-mcp` | MCP debugging tools |
| `reggie` | (unknown) |
| `shared-ui` | Shared UI components |
| `theme` | Theme system |

---

## Recommended Priority Plan

### P0 — Fix Broken Tests (Before Adding New)
Fix the 59 API failures + package failures. Likely a few shared mock/fixture issues causing cascading failures.

### P1 — High-Value Route Tests
These are customer-facing flows with money/access implications:

1. **`organizations` routes** — Core amen feature, manages church access, members, billing
2. **`billing` core** — Subscription status, checkout, portal sessions (money flows)
3. **`economy` routes** — Balance, transactions, purchase processing

### P2 — Party/Content Pipeline
4. **`partyContent` routes** — Content import, listing, generation
5. **`partyTemplates` routes** — Template serving
6. **`invites` routes** — Gating mechanism

### P3 — Frontend Integration Tests (One per Major Flow)
For both apps, aim for ONE integration test per critical user flow:

**Amen**:
- Auth → landing → join org
- Browse → select game → play
- Party → host → players join → play

**Slopcade**:
- Auth → landing → browse
- Create game → editor → preview
- Social → follow → feed

### P4 — Package Coverage
- `shared-ui` component tests
- `brands` config validation
- `app-lib` utility tests
