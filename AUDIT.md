# Slopcade Codebase Audit

**Date**: 2026-02-06
**Scope**: Complete monorepo — 698 TypeScript/TSX source files, 69 test files
**Purpose**: Comprehensive system inventory for refactoring

---

## 1. System Inventory

### 1.1 Monorepo Overview

| Workspace | Package Name | Purpose | LOC (approx) |
|-----------|-------------|---------|---------------|
| `shared/` | `@slopcade/shared` | Types, schemas, validation, expressions, systems | ~15,000 |
| `api/` | `@slopcade/api` | Cloudflare Workers backend (Hono + tRPC + D1) | ~12,000 |
| `app/` | `slopcade` | Expo/React Native frontend | ~20,000 |
| `godot_project/` | — | Godot 4 physics & rendering runtime (GDScript) | ~3,000 |
| `packages/game-bundler/` | `@slopcade/game-bundler` | Game definition compiler | ~1,500 |
| `packages/game-inspector-mcp/` | `@slopcade/game-inspector-mcp` | MCP server for AI game inspection | ~2,000 |
| `packages/theme/` | `@slopcade/theme` | NativeWind design tokens | ~200 |
| `packages/reggie/` | `@chriscode/reggie` | Auto-discovery registry codegen | ~500 |
| `r2/games/` | — | 9 game definitions with scripts/tests | ~5,000 |

---

### 1.2 System-by-System Breakdown

#### A. `shared/` — Shared Type System & Logic

**Purpose**: Single source of truth for all game types, validation schemas, expression evaluation, and cross-cutting utilities.

**Sub-systems**:

| Sub-system | Location | Purpose |
|------------|----------|---------|
| **Types** | `types/` (32 files) | GameDefinition, entities, rules, behaviors, physics, containers, state machines, world ops, etc. |
| **Schemas** | `schema/` (4 files) | Drizzle+Zod DB schemas for users, games, economy, agent-runs |
| **Expressions** | `expressions/` | Parser, tokenizer, evaluator for dynamic game formulas; computed value system; property watching |
| **Systems** | `systems/` (18+ dirs) | State machine, grid, inventory, checkpoint, path, wave, combo, spatial-query, container, slots, layout |
| **Validation** | `validation/` | GameDefinition validator with scoring, issue catalog, playability checks |
| **Events** | `events/` | Typed EventBus implementation |
| **Tags** | `tags/` | Numeric tag ID registry for entity classification |
| **Generator** | `generator/` | Level generators (AngryBurns, Slopeggle) |
| **Economy** | `economy/` | Currency type definitions |
| **Scripting** | `scripting/` | Script authoring types for QuickJS sandbox |
| **Utils** | `utils/` | Asset URL resolution, definition resolver, game helpers |

**Entry points**: Consumed by `app/`, `api/`, `packages/game-bundler/`, `r2/games/`
**Dependencies**: zod, drizzle-orm, drizzle-zod, quickjs-emscripten
**State**: Stateless library (pure types and functions)

**Known issues**:
- `types/index.ts` re-exports everything with duplicate type re-exports (lines 28-61 re-export types already exported by `*` on earlier lines)
- `GameDefinition.ts` (545 lines) has grown into a grab-bag — contains world config, camera, UI, sound, input, persistence, and asset system config all in one type
- Dual asset reference pattern: `imageUrl` (legacy string) coexists with `assetRef` (R2 UUID) — migration incomplete
- Expression system has its own token/AST/evaluator but no formal grammar spec
- Tag system uses numeric IDs requiring a resolution layer instead of direct string tags

---

#### B. `api/` — Backend (Cloudflare Workers)

**Purpose**: API server providing game CRUD, asset pipeline, economy system, AI game generation, and agent orchestration.

**Sub-systems**:

| Sub-system | Location | Lines | Purpose |
|------------|----------|-------|---------|
| **tRPC Router** | `trpc/router.ts` | ~50 | Route composition |
| **Games Route** | `trpc/routes/games.ts` | 977 | Game CRUD, generation, validation, forking |
| **Asset System Route** | `trpc/routes/asset-system.ts` | **2,231** | Themes, asset packs, generation jobs, UI components |
| **Agent Runs Route** | `trpc/routes/agent-runs.ts` | 1,020 | AI agent run management |
| **Economy Route** | `trpc/routes/economy.ts` | ~400 | Wallet ops, codes, IAP |
| **RunCoordinatorDO** | `agent/RunCoordinatorDO.ts` | **1,803** | Durable Object for agent WebSocket coordination |
| **Wallet Service** | `economy/wallet-service.ts` | ~300 | Balance management with atomicity |
| **Agent Billing** | `economy/agent-billing-service.ts` | ~200 | Agent run cost reservation/settlement |
| **AI Generator** | `ai/game/generator.ts` | ~200 | LLM-based game generation |
| **AI Classifier** | `ai/game/classifier.ts` | ~300 | Game intent classification from prompts |
| **Game Validator** | `validation/gameValidator.ts` | ~200 | Server-side definition validation |
| **Context** | `trpc/context.ts` | ~100 | Auth, DB, R2 bindings |

**Entry points**: Hono HTTP routes → tRPC procedures; WebSocket upgrade for agent runs; webhook endpoints
**Dependencies**: hono, @trpc/server, @ai-sdk/anthropic, @ai-sdk/openai, drizzle-orm, sharp, superjson, zod
**External services**: Cloudflare D1, Cloudflare R2, Supabase Auth, OpenAI/Anthropic/OpenRouter, Scenario.com/ComfyUI, RevenueCat

**State it owns**:
- D1 database (SQLite): games, users, wallets, transactions, asset packs, agent runs/steps/events/checkpoints
- R2 bucket: game definitions, metadata, asset images
- Durable Object storage: agent run state, event streams, control ledger

**Known issues**:
- **`asset-system.ts` is 2,231 lines** — themes, packs, generation jobs, and UI components all in one file. Should be 4 separate route files.
- **`RunCoordinatorDO.ts` is 1,803 lines** — mixes WebSocket management, state machine, recovery logic, billing integration, and gate processing. Should be split.
- `WalletService` and `AgentBillingService` both create credit transactions with overlapping logic
- `games.ts` has `installedProcedure` marked DEPRECATED but still exported
- Daily login bonus in economy marked DISABLED
- Gem system (`gem-service.test.ts`) appears fully implemented but disconnected from main economy flow
- `listPublic` query uses OR on validation_valid with null coalescing — potentially inefficient
- Some routes don't validate ownership before R2 access
- No cascading cleanup for orphaned R2 files when games are deleted

---

#### C. `app/lib/game-engine/` — Game Engine

**Purpose**: Client-side game runtime orchestrating physics, behaviors, rules, scripting, and animations.

**Sub-systems**:

| Sub-system | Location | Lines | Purpose |
|------------|----------|-------|---------|
| **GameRuntime** | `GameRuntime.godot.tsx` | **2,288** | Main React component: initializes everything, runs game loop, handles input/events |
| **GameSystemRunner** | `systems/runner/GameSystemRunner.ts` | 155 | Phase-ordered system orchestrator |
| **RulesSystem** | `systems/runner/wrappers/RulesSystem.ts` | 755 | Trigger → condition → action evaluation |
| **ScriptSandbox** | `systems/runner/wrappers/ScriptSandboxRuntimeSystem.ts` | 586 | QuickJS script execution |
| **EntityManager** | `EntityManager.ts` | ~400 | Entity lifecycle, template spawning, tag queries |
| **BehaviorExecutor** | `BehaviorExecutor.ts` | ~300 | Entity behavior execution by phase |
| **TweenSystem** | `animation/TweenSystem.ts` | ~300 | Tween animations with easing |
| **GameLoader** | `GameLoader.ts` | ~130 | Initialization from GameDefinition |
| **GameLoopController** | `GameLoopController.ts` | ~180 | Fixed-timestep frame timing |
| **WorldOpsImpl** | `WorldOpsImpl.ts` | ~300 | High-level world manipulation API |
| **14 RuntimeSystems** | `systems/runner/wrappers/` | ~1,300 | Input, Viewport, Camera, Physics, Behaviors, Match3, Container, etc. |
| **22 Action Executors** | `rules/actions/` | ~800 | Spawn, destroy, physics, camera, sound, grid, inventory, etc. |
| **Trigger/Condition Evaluators** | `rules/triggers/`, `rules/conditions/` | ~500 | Collision, input, logic, physics, container evaluators |
| **Behaviors** | `behaviors/` | ~1,000 | Movement, visual, input, physics, lifecycle behaviors |

**Entry points**: `<GameRuntimeGodot>` React component mounted by game screens
**Dependencies**: GodotBridge, Physics2D adapter, @slopcade/shared types and systems
**State owned** (via React refs in GameRuntime):
- `gameRef`: LoadedGame (entities, physics, state)
- `gameSystemRunnerRef`: System orchestrator
- `bridgeRef`: Godot bridge instance
- `physicsRef`: Physics engine
- `eventQueueRef`: Frame event queue
- `inputRef`: Current input state
- `gameLoopControllerRef`: Frame timing

**Known issues**:
- **GameRuntime is 2,288 lines** — orchestrates initialization, input collection, event routing, lifecycle management, UI rendering. Should be split into at least 5 modules.
- **Heavy ref usage** bypasses React rendering model — hard to trace state mutations
- RulesSystem creates action executors twice (in constructor AND initialize) — constructor instances are dead code
- No system dependency graph — relies solely on phase ordering conventions
- Script sandbox errors silently swallowed (console.error only)
- Entity queries are O(n) with no spatial indexing
- New script context object created every frame (allocation pressure)
- Frame buffer producer/consumer contracts documented but not enforced
- Multiple state synchronization points: gameState, gameLoopController, timeControlRef track overlapping data

---

#### D. `app/lib/godot/` — Godot Bridge Layer

**Purpose**: Platform-specific bridge between React Native/Web and Godot 4 runtime for physics and rendering.

**Files**: 21 files with `.native.ts` / `.web.ts` platform splits

| File | Purpose |
|------|---------|
| `GodotBridge.native.ts` / `.web.ts` | Main bridge: entity management, physics, input, textures |
| `GodotView.native.tsx` / `.web.tsx` | React component rendering Godot viewport |
| `GodotPhysicsAdapter.ts` | Converts Godot physics events to engine format |
| `PropertySyncManager.ts` | Bi-directional entity property sync |
| `coordinateUtils.ts` | Screen ↔ world coordinate conversion |
| `query.ts` | Query builder for game state |
| `debug/` | Debug bridge, assertions, screenshots |

**Entry points**: Created by GameRuntime during initialization
**Dependencies**: `@borndotcom/react-native-godot` (native), Godot WASM + postMessage (web)
**State**: Entity registry mirrored from Godot, texture cache, physics state

**Known issues**:
- Near-identical code in `.native.ts` and `.web.ts` files — no shared base implementation
- String-based messaging to Godot with no type safety
- Bridge communication errors fail silently
- Y-axis flip (game Y-up → Godot Y-down) applied manually everywhere

---

#### E. `app/` — Expo/React Native Frontend (non-engine)

**Purpose**: Mobile/web app shell with navigation, editor, auth, economy UI.

**Sub-systems**:

| Sub-system | Location | Purpose |
|------------|----------|---------|
| **Navigation** | `app/app/` | Expo Router: tabs (lab, maker, browse, themes) + modals (editor, game, play) |
| **Editor** | `components/editor/` | Game editor with context+reducer state management, undo/redo, AI features |
| **Game UI** | `components/game/` | DevToolbar, GameDialog, TuningPanel |
| **Browse** | `components/browse/` | GameCard, FilterBar |
| **Themes** | `components/themes/` | ThemeCard, ThemeFilterBar |
| **Economy** | `components/economy/` | CreditBalance, CurrencySheet |
| **Auth** | `lib/supabase/`, `lib/auth/` | Supabase auth (platform-specific) |
| **tRPC Client** | `lib/trpc/` | React Query + tRPC setup |
| **Offline** | `lib/offline/` | Embedded game installation, offline storage |
| **Config** | `lib/config/env.ts` | Environment variable resolution |
| **Hooks** | `lib/hooks/` | useAuth, useBrowseGames, etc. |
| **Assets** | `lib/assets/` | Asset preloading, URL resolution |

**State management**:
- **Editor**: React Context + useReducer (EditorProvider) — document, selection, undo/redo, camera, dirty state
- **Server state**: tRPC + React Query (60s stale time, 5min GC)
- **Auth**: Supabase session in secure storage
- **Offline**: AsyncStorage for progress, FileSystem for bundled content

**Known issues**:
- Asset preloading temporarily disabled (`showLoadingOverlay = false`) — indicates freeze during preload
- `EditorProvider` uses `JSON.parse(JSON.stringify(...))` for undo/redo deep cloning — expensive for large definitions
- Max 50 undo entries hardcoded
- CDN URL hardcoded in `env.ts` with no fallback
- `munim-bluetooth-peripheral` dependency present but BLE native modules were deleted (git status shows `D` for `BLEPeripheralModule.m/swift`)

---

#### F. `godot_project/` — Godot 4 Runtime

**Purpose**: Physics simulation, entity rendering, input handling — all visual game execution.

**Key scripts**:

| Script | Purpose |
|--------|---------|
| `Main.gd` | Scene setup, module initialization |
| `GameBridge.gd` | Entity registry, JS bridge setup, coordinate conversion, query system |
| `EntityFactory.gd` | Template merging, physics body creation (RigidBody2D/CharacterBody2D/Area2D) |
| `VisualRenderer.gd` | Texture loading, opacity, sprite rendering |
| `InputRouter.gd` | Hit testing, drag tracking, tap detection |
| `WorldSystem.gd` | Physics world setup (gravity, pixelsPerMeter) |
| `GameBridgeEffects.gd` | Shake, zoom, particle effects |

**Coordinate system**: Game (Y-up) ↔ Godot (Y-down) via `godot_y = -game_y * pixels_per_meter`

**Known issues**:
- GameBridge is the "god object" on the Godot side — entity registry, queries, coordinate conversion, module coordination
- No unit test coverage for GDScript
- Coordinate conversion done ad-hoc in multiple places rather than centralized

---

#### G. `packages/game-bundler/` — Game Compiler

**Purpose**: Compiles TypeScript game scripts + JSON definitions into unified GameDefinition bundles.

**Key files**: `compiler.ts`, `loader.ts`, `types.ts`
**Dependencies**: `@slopcade/shared`
**Tests**: 5 test files (FileReader, asset-resolution, script-scanning, unified-loader, virtual-bundle-integration)

---

#### H. `packages/game-inspector-mcp/` — MCP Inspector

**Purpose**: AI tooling for game debugging — provides MCP tools for listing, opening, inspecting, and interacting with games.

**Architecture**: Express HTTP server + Playwright browser automation + MCP SDK
**Dependencies**: playwright, sharp, express, @modelcontextprotocol/sdk, zod

**Known issues**:
- Depends on Playwright (heavy dependency) for headless browser automation
- Console log buffer (1000 entries) has no overflow strategy

---

## 2. Key End-to-End Flows

### Flow 1: Game Load & Play

```
User taps game → app/game/[id].tsx
  → trpc.games.getPublic(id) [fetches from D1 + R2]
  → AssetPreloader.preload(definition) [downloads textures - CURRENTLY DISABLED]
  → <GameRuntimeGodot definition={...} />
    → GameLoader.initialize(definition)
      → EntityManager.loadEntities()
      → Physics2D world creation
      → GameState initialization (variables, cooldowns)
    → GameSystemRunner.register(14 systems)
    → GameSystemRunner.initialize()
      → Each system.initialize() in phase order
      → ScriptSandbox compiles user scripts
    → GodotBridge.loadGame(definition)
      → Godot EntityFactory creates scene nodes
      → Godot VisualRenderer loads textures
    → GameLoopController starts at 60fps
      → Each frame: collect input → runner.update(ctx) → bridge sync
```

**Files touched**: `app/game/[id].tsx`, `lib/trpc/react.tsx`, `lib/assets/AssetPreloader.ts`, `lib/game-engine/GameRuntime.godot.tsx`, `lib/game-engine/GameLoader.ts`, `lib/game-engine/EntityManager.ts`, `lib/game-engine/systems/runner/GameSystemRunner.ts`, 14 wrapper systems, `lib/godot/GodotBridge.*.ts`, `godot_project/scripts/GameBridge.gd`

---

### Flow 2: Rule Evaluation (Per Frame)

```
GameSystemRunner.update(ctx) [GAME_LOGIC phase]
  → RulesSystem.update(ctx, state)
    → For each rule:
      → TriggerEvaluator.evaluate(trigger, ctx)
        → CollisionTriggerEvaluator (checks frame.collisions buffer)
        → InputTriggerEvaluator (checks frame.inputEvents buffer)
        → LogicTriggerEvaluator (timer, entity_count, event)
      → If triggered:
        → ConditionEvaluator.evaluateAll(conditions)
          → LogicConditionEvaluator
          → PhysicsConditionEvaluator
          → ContainerConditionEvaluator
        → If all conditions met:
          → ActionRegistry.execute(actions)
            → 22 specialized executors
    → WinLoseConditionEvaluator.check()
    → StateMachine transitions
```

**Files touched**: `RulesSystem.ts`, 3 trigger evaluators, 3 condition evaluators, `ActionRegistry.ts`, 22 action executors

---

### Flow 3: AI Game Generation

```
User enters prompt → app/components/editor/AIGenerateModal.tsx
  → trpc.games.generate({ prompt, ... })
    → api/src/trpc/routes/games.ts generate procedure
      → GameIntentClassifier.classify(prompt) [keyword-based]
      → AI Generator creates LLM prompt from intent
      → ai.generateObject({ schema: GameDefinitionSchema }) [OpenAI/Anthropic]
      → GameValidator.validate(result)
      → Store to D1 + R2
      → Return game + validation report
```

---

### Flow 4: Agent-Orchestrated Game Build

```
User starts agent run → trpc.agentRuns.create()
  → Reserve budget (WalletService)
  → Create DB row
  → RunCoordinatorDO.fetch(/start) [Durable Object]
    → Planning stage:
      → processGates() for core_game_loop, win_lose_conditions
      → gate_question events → WebSocket → client
      → User answers → RunCoordinatorDO
    → Build stage:
      → RunStepWorkerDO executes LLM call
      → step_completed event
      → settleStep() records actual cost
    → Refine stage (optional):
      → Iterative improvement
    → Theme/Asset stages (optional)
  → WebSocket streams events to client
```

**Files touched**: `trpc/routes/agent-runs.ts`, `agent/RunCoordinatorDO.ts`, `agent/engine/`, `economy/agent-billing-service.ts`, `economy/wallet-service.ts`

---

### Flow 5: Asset Generation Pipeline

```
User triggers asset generation → trpc.assetSystem.createGenerationJob()
  → economy.authorizeGeneration() [check balance + rate limit]
  → Create job + tasks in D1
  → For each template:
    → Compile prompt (theme + entity description)
    → Call image provider (Scenario.com txt2img)
    → Post-process (background removal, cropping)
    → Upload to R2
    → Update DB with asset references
  → Settle cost in wallet
```

**Files touched**: `trpc/routes/asset-system.ts` (2,231 lines — the entire pipeline lives here)

---

### Flow 6: Editor Save Flow

```
User edits game → EditorProvider dispatches actions
  → Reducer updates document + pushes to undoStack
  → User taps Save → EditorTopBar
    → trpc.games.update({ id, definition, ... })
      → Validate definition server-side
      → Write definition.json + metadata.json to R2
      → Update validation_report in D1
```

---

## 3. State Stores & Registries

### 3.1 Client-Side State

| Store | Location | Key Type | Value Type | Lifecycle |
|-------|----------|----------|------------|-----------|
| **Entity Map** | `EntityManager.entities` | `string (entityId)` | `RuntimeEntity` | Game session |
| **Template Map** | `EntityManager.templates` | `string (templateId)` | `EntityTemplate` | Game session |
| **Tag Index** | `EntityManager.tagIndex` | `number (tagId)` | `Set<string>` (entityIds) | Game session |
| **Game State vars** | `GameState.vars` | `string` | `VarValue (any)` | Game session |
| **Game State lists** | `GameState.lists` | `string` | `ListValue (any[])` | Game session |
| **Cooldowns** | `GameState.cooldowns` | `string (ruleId)` | `number (remaining)` | Game session |
| **Fired-once** | `GameState.firedOnce` | — | `Set<string>` (ruleIds) | Game session |
| **Pending Events** | `GameState.pendingEvents` | `string` | `any` | Per-frame |
| **Editor Document** | `EditorProvider.state.document` | — | `GameDefinition` | Editor session |
| **Undo Stack** | `EditorProvider.state.undoStack` | — | `HistoryEntry[]` (max 50) | Editor session |
| **React Query Cache** | `QueryClient` | `queryKey[]` | API responses | 60s stale, 5min GC |
| **Supabase Session** | `expo-secure-store` | `"supabase-session"` | Session JSON | Persistent |
| **Offline Games** | `expo-file-system` documentDir | `gameId` | GameDefinition JSON | Persistent |
| **Tween Registry** | `TweenSystem.activeTweens` | `string (tweenId)` | `Tween` | Game session |
| **Frame Buffers** | `GameSystemRunner` | — | `inputEvents[]`, `collisions[]` | Per-frame |
| **Event Queue** | `EventQueueImpl` | — | Queued events | Between frames |

### 3.2 Server-Side State

| Store | Location | Key Type | Value Type |
|-------|----------|----------|------------|
| **D1 `games`** | SQLite | `id (UUID)` | Game metadata, validation |
| **D1 `users`** | SQLite | `id` | Profile (synced from Supabase) |
| **D1 `user_wallets`** | SQLite | `user_id` | Balance, lifetime totals |
| **D1 `credit_transactions`** | SQLite | `id` | Immutable ledger entries |
| **D1 `agent_runs`** | SQLite | `id` | Run metadata, status, costs |
| **D1 `agent_steps`** | SQLite | `id` | Per-step tracking |
| **D1 `agent_events`** | SQLite | `id` | Event stream (seq ordered) |
| **D1 `agent_checkpoints`** | SQLite | `run_id + step_index` | Resumable state |
| **R2 `games/{id}/`** | Object storage | — | `definition.json`, `metadata.json` |
| **R2 `packs/{uuid}/`** | Object storage | — | Asset images + manifest |
| **DO Storage** | Durable Object KV | `STATE_KEY`, `event:*`, `control:*` | RunState, events, commands |

### 3.3 Overlapping State (Issues)

1. **Game definition in both D1 and R2**: D1 stores validation metadata while R2 stores the full JSON. If they drift, inconsistency is possible.
2. **Entity state**: EntityManager holds the canonical entity map, but Godot bridge maintains a parallel entity registry in GDScript (`GameBridge.gd`). These must stay in sync.
3. **Game state variables**: `GameState.vars` holds runtime values, but the `GameDefinition.variables` holds defaults. On reset, these must be re-initialized correctly.
4. **Agent run state**: Both D1 (`agent_runs` table) and Durable Object KV (`STATE_KEY`) store run status. DO is the live truth, D1 is the persistent record.
5. **Asset references**: `imageUrl` (legacy) and `assetRef` (new UUID-based) can both be populated on the same entity, with unclear precedence rules.

---

## 4. Public API Surface

### 4.1 tRPC Procedures (External API)

#### Games Router
| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `games.listPublic` | Query | Public | Browse public games |
| `games.getPublic` | Query | Public | Get single public game |
| `games.validateDefinition` | Mutation | Public | Client-side validation |
| `games.analyze` | Mutation | Public | Classify game prompt |
| `games.list` | Query | Protected | User's games |
| `games.get` | Query | Protected | Get game by ID |
| `games.create` | Mutation | Protected | Create new game |
| `games.update` | Mutation | Protected | Update game |
| `games.delete` | Mutation | Protected | Soft delete |
| `games.fork` | Mutation | Protected | Copy game |
| `games.generate` | Mutation | Protected | AI generate game |
| `games.refine` | Mutation | Protected | AI refine game |
| `games.validate` | Mutation | Protected | Re-validate |
| `games.getVersionHistory` | Query | Protected | R2 artifact versions |
| `games.syncTemplates` | Mutation | Protected | Admin utility |

#### Economy Router
| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `economy.getBalance` | Query | Protected | Current balance |
| `economy.getTransactions` | Query | Protected | Transaction history |
| `economy.redeemPromoCode` | Mutation | Protected | Redeem promo code |
| `economy.validateSignupCode` | Query | Public | Check code validity |
| `economy.hasRedeemedSignupCode` | Query | Protected | Check redemption |
| `economy.redeemSignupCode` | Mutation | Protected | Redeem signup code |
| `economy.estimateCost` | Query | Protected | Asset gen cost estimate |
| `economy.authorizeGeneration` | Mutation | Protected | Pre-auth check |
| `economy.getProducts` | Query | Public | IAP product list |
| `economy.processPurchase` | Mutation | Protected | Handle IAP |

#### Agent Runs Router
| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `agentRuns.create` | Mutation | Protected | Start agent run |
| `agentRuns.list` | Query | Protected | User's runs |
| `agentRuns.get` | Query | Protected | Get run details |
| `agentRuns.getEvents` | Query | Protected | Event stream |
| `agentRuns.getSnapshot` | Query | Protected | Current state snapshot |

#### Other Routers
- `users.me`, `users.syncFromAuth`
- `invites.create`, `invites.isEmailInvited`, `invites.redeem`
- `assetSystem.*` (themes, packs, generation jobs, UI components)
- `uiComponents.*` (UI asset generation)

### 4.2 Non-tRPC HTTP Endpoints
| Path | Method | Purpose |
|------|--------|---------|
| `/health` | GET | Health check |
| `/ws/agent-run/:runId` | GET (upgrade) | WebSocket for agent run |
| `/assets/*` | GET | R2 asset serving with cache |
| `/webhooks/revenuecat` | POST | IAP webhook |
| `/api/text-grid` | POST | Text grid utility |

### 4.3 Game Engine Public API (Script Context)

The script sandbox exposes ~40 methods to user-authored game scripts:

**Entity ops**: `spawn`, `destroy`, `clone`, `query`, `reparent`, `getPosition/setPosition`, `getRotation/setRotation`, `getScale/setScale`, `getVelocity/setVelocity`, `getTags/addTag/removeTag`
**Physics**: `raycast`, `queryAABB`, `applyImpulse`, `applyForce`
**Variables**: `getVar`, `setVar`
**World async**: `animate`, `wait`
**Events**: `emit`, `win`, `lose`
**Utilities**: `random`, `clamp`, `lerp`, `distance`
**Input**: `tap`/`drag` snapshot, `mousePosition`

---

## 5. Dead Code & Legacy Artifacts

### 5.1 Confirmed Dead Code

| Item | Location | Evidence |
|------|----------|----------|
| BLE Peripheral modules | `app/ios/Slopcade/BLEPeripheralModule.m/swift` | Git status: deleted (`D`) |
| `munim-bluetooth-peripheral` dep | `app/package.json` | Native modules deleted, dep remains |
| fastlane config | `app/ios/fastlane/` | Git status: deleted (`D`) |
| `simple` game | `r2/games/simple/` | Git status: deleted (`D`) |
| `asteroids` game | `r2/games/asteroids/` | Git status: deleted (`D`) |
| Duplicate asset executor creation | `RulesSystem.ts` constructor | Executors created in constructor, then recreated in `initialize()` |
| Placeholder packs | `r2/packs/a1b2c3d4-*/` | Git status: deleted — test fixture packs |
| `installedProcedure` | `games.ts` | Marked `DEPRECATED` |
| Daily login bonus | Economy system | Marked `DISABLED` |
| Gem service | `economy/__tests__/gem-service.test.ts` | Full implementation, disconnected from main flow |

### 5.2 Massive Documentation Deletion

Git status shows ~80 documentation files in `docs/` being deleted. These appear to be legacy architecture docs being cleaned up. The deletion is in-progress (staged or unstaged).

### 5.3 Legacy Patterns

| Pattern | Location | Issue |
|---------|----------|-------|
| `imageUrl` field | Throughout types/definitions | Legacy; being replaced by `assetRef` UUID |
| `.claude/memory/` files deleted | `.claude/memory/` | Old memory system being cleaned up |
| `Gemfile`/`Gemfile.lock` | `app/ios/` | Ruby (CocoaPods) config deleted — likely moved to pod install directly |
| `test-games/[id].tsx` | `app/app/` | Test route deleted |

---

## 6. Dependency Graph

```
                    ┌──────────────────┐
                    │  @slopcade/shared │
                    │  (types, schemas, │
                    │   validation,     │
                    │   expressions)    │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
     ┌────────────┐  ┌─────────────┐  ┌──────────────────┐
     │ @slopcade/ │  │ @slopcade/  │  │    slopcade      │
     │    api     │  │game-bundler │  │   (app/)         │
     │            │  │             │  │                  │
     │ • Hono     │  │ • Compiler  │  │ • Expo/RN        │
     │ • tRPC     │  │ • Loader    │  │ • Game Engine    │
     │ • D1/R2    │  │             │  │ • Godot Bridge   │
     │ • AI SDKs  │  └─────────────┘  │ • Editor         │
     │ • DO       │                   │ • tRPC Client    │
     └──────┬─────┘                   └────────┬─────────┘
            │                                   │
            │         tRPC + REST               │
            ◄───────────────────────────────────┘
            │
    ┌───────┴───────────────────────────┐
    │        External Services          │
    ├───────────────────────────────────┤
    │ Supabase (Auth) │ R2 (Assets)    │
    │ D1 (SQLite)     │ AI APIs        │
    │ Scenario/ComfyUI│ RevenueCat     │
    └───────────────────────────────────┘

     ┌─────────────────────────────────┐
     │     godot_project/              │
     │  (Godot 4 GDScript)            │
     │  • Physics (Rapier2D)           │
     │  • Rendering                    │
     │  • Input routing                │
     │  ◄── Bridge ── app/lib/godot/  │
     └─────────────────────────────────┘

     ┌──────────────────┐  ┌───────────────┐
     │ game-inspector-  │  │ @slopcade/    │
     │ mcp              │  │ theme         │
     │ (Playwright +    │  │ (NativeWind   │
     │  MCP tools)      │  │  tokens)      │
     └──────────────────┘  └───────────────┘
```

### Inter-System Communication

| From → To | Mechanism |
|-----------|-----------|
| App → API | tRPC over HTTP (React Query) |
| App → Godot | Platform bridge (native module / postMessage) |
| API → D1 | Drizzle ORM SQL |
| API → R2 | Cloudflare R2 binding |
| API → AI | @ai-sdk HTTP calls |
| API → DO | Durable Object bindings |
| Client ← DO | WebSocket (agent run events) |
| Godot → App | Callbacks (collision, spawn, input) |
| GameEngine systems | EventQueue (inter-system), direct method calls (intra-phase) |

---

## 7. Sizing & Test Coverage

### File Counts by Area
| Area | Source Files | Test Files | Test Ratio |
|------|-------------|------------|------------|
| `shared/` | ~120 | 19 | 16% |
| `api/` | ~80 | 22 | 28% |
| `app/lib/game-engine/` | ~100 | 16 | 16% |
| `app/lib/godot/` | 21 | 1 | 5% |
| `app/components/` | 67 | 0 | 0% |
| `packages/game-bundler/` | ~10 | 5 | 50% |
| `r2/games/` | ~30 | 3 | 10% |

### Largest Files (Refactoring Candidates)

| File | Lines | Issue |
|------|-------|-------|
| `GameRuntime.godot.tsx` | 2,288 | God component — init, loop, input, events, UI all here |
| `asset-system.ts` (route) | 2,231 | 4 sub-domains crammed into 1 file |
| `RunCoordinatorDO.ts` | 1,803 | WebSocket + state machine + recovery + billing |
| `agent-runs.ts` (route) | 1,020 | Route + orchestration mixed |
| `games.ts` (route) | 977 | CRUD + generation + validation mixed |
| `RulesSystem.ts` | 755 | Trigger/condition/action + state machines |
| `rules.ts` (types) | 618 | Massive union types |
| `ScriptSandboxRuntimeSystem.ts` | 586 | Sandbox + context creation + hook dispatch |
| `GameDefinition.ts` | 545 | Everything-bag type |

---

## 8. Critical Observations

### 8.1 Biggest Problems

1. **God files/objects**: GameRuntime (2,288 lines), asset-system route (2,231 lines), RunCoordinatorDO (1,803 lines). These are the primary maintenance bottlenecks.

2. **Duplicate/overlapping state**: Game definition in D1 + R2 with potential drift. Entity state mirrored in EntityManager + Godot bridge. Agent run state in DO + D1.

3. **No type safety across the bridge**: Godot communication uses string messages. The bridge layer is a significant source of potential runtime errors.

4. **Asset system monolith**: 2,231 lines handling themes, packs, generation jobs, AND UI components. This should be 4 files minimum.

5. **Missing test coverage**: Zero tests for 67 React components. Only 1 test for 21 Godot bridge files. The game engine's most complex system (RulesSystem at 755 lines) has only 1 test file.

### 8.2 Architecture Strengths (Preserve)

1. **6-phase system runner pattern** — elegant and extensible
2. **Idempotent transactions** — wallet system is well-designed
3. **Declarative game definitions** — powerful JSON-based game format
4. **Platform abstraction** — `.native.ts`/`.web.ts` pattern works well
5. **tRPC type safety** — end-to-end types from API to client
6. **Durable Object pattern** — good fit for agent run coordination
7. **Expression system** — sophisticated formula evaluation

### 8.3 Open Questions

1. Is the gem service (`gem-service.test.ts`) being actively developed or abandoned?
2. Is the daily login bonus feature planned for reactivation?
3. What is the intended precedence when both `imageUrl` and `assetRef` are populated?
4. Are the 80+ deleted docs being archived elsewhere or truly abandoned?
5. Is the BLE peripheral feature planned for future use or fully abandoned?
6. What is the `landing/` workspace — is it actively maintained?
