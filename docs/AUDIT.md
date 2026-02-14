Slopcade Codebase Audit

 2026-02-06
 Complete monorepo 698 TypeScript/TSX source files, 69 test files
 Comprehensive system inventory refactoring



. System Inventory

. Monorepo Overview

 Workspace Package Name Purpose

 `shared/@slopcade/shared` Types, schemas, validation, expressions, systems ~15,
 `api/@slopcade/api Cloudflare Workers backend (Hono tRPC D1),
 `app `slopcade Expo/React Native frontend,
 `godot_project/ Godot 4 rendering runtime (GDScript),
 `packages/game-bundler Game definition compiler,
/game-inspector-mcp server AI game inspection,
 `packages/theme/@slopcade NativeWind design tokens
 `packages/reggie Auto-discovery registry codegen
 `r2/games/ 9 game definitions scripts/tests ~5,



. System-by-System Breakdown

.Type System Logic

 source truth game types, validation schemas, evaluation, cross-cutting utilities.



Sub-system Location Purpose

  **Types** (32 files GameDefinition, entities, scripts, physics, containers, world ops,.
 **Schemas** (4 files Drizzle DB schemas users, games, economy, agent-runs
 Parser, tokenizer, evaluator dynamic game formulas computed value system property watching
 **Systems** (18 dirs State machine, grid, inventory, checkpoint, path,,, spatial-query, container, slots, layout
 GameDefinition validator scoring, issue catalog, playability checks
 EventBus implementation
 Numeric tag ID registry entity classification
 Level generators, Slopeggle
 **Economy** Currency type definitions
 authoring types QuickJS sandbox
 Asset URL resolution, definition resolver, game helpers

 `app,, `packages-bundler,
,,, quickjs
 Stateless library types


. re-exports duplicate 28-61 exported
 `GameDefinition. ts (545 lines grab-bag contains world config, camera, UI, sound, input, persistence, asset system type
 Dual reference pattern `imageUrl `assetRef migration incomplete
 Expression system token no grammar spec
 Tag system uses numeric IDs resolution layer string tags



. Backend Workers

 API server game CRUD, asset pipeline, economy system, AI game generation, agent orchestration.



Sub-system Location Lines Purpose

 **tRPC Router**/router. Route composition
 **Games Route**/routes/games. Game CRUD, generation, validation,
 **Asset System Route**/routes/asset-system., Themes, asset packs, generation, UI components
 **Agent Runs Route**/routes/agent-runs., AI agent run management
 **Economy Route**/routes/economy. ~400 Wallet ops, codes,
 **RunCoordinatorDO**/RunCoordinatorDO., 803** Durable Object agent WebSocket coordination
 **Wallet Service**/wallet-service. Balance management atomicity
 **Agent Billing** `economy/agent-billing-service. Agent run cost reservation/settlement
 **AI Generator**/game/generator. LLM-based game generation
 **AI Classifier**/game/classifier. Game intent classification prompts
 **Game Validator**/gameValidator. Server-side definition validation
 **Context** `trpc/context., DB, R2 bindings

HTTP routes tRPC procedures WebSocket upgrade agent runs webhook endpoints
 hono,,-sdk,,-orm,,,
 Cloudflare D1, R2, Supabase Auth, OpenAI,., RevenueCat


 D1 database games, users, wallets, transactions, asset packs, agent runs
 R2 bucket game definitions, metadata, images
 Durable Object storage agent run state, event streams, control ledger


-system., 231 themes, packs, generation jobs, UI components. 4 separate route files.
., 803 WebSocket management, state machine, recovery, billing integration, gate processing..
 credit transactions overlapping logic
. DEPRECATED exported
 Daily login bonus DISABLED
 Gem system.. implemented disconnected economy
 query validation inefficient
 routes't validate ownership before R2 access
 No cascading cleanup orphaned R2 files deleted



.-engine

  Client-side game runtime, scripts, animations.



Sub-system Location Lines Purpose

 **GameRuntime**.., Main React component initializes, runs game loop, handles input/events
 **GameSystemRunner**. 155 Phase-ordered system orchestrator
  **ScriptSandbox** `systems/runner/wrappers. QuickJS script execution
  **EntityManager**. ~400 Entity lifecycle, prefab spawning, tag queries
  **TweenSystem**. Tween animations
  **GameLoader**. ~130 Initialization GameDefinition
  **GameLoopController**. ~180 Fixed-timestep frame timing
  **WorldOpsImpl**. ~300 High-level world manipulation API
  RuntimeSystems** `systems/runner/wrappers, 300 Input, Viewport, Camera, Physics, Match3, Container,.
  ~1, 000 Movement,,,, lifecycle scripts

React component game screens
 GodotBridge, Physics2D adapter, types systems
 React refs
 LoadedGame,,
 System orchestrator
 Godot bridge instance
 engine
 queue
 Current input state
 Frame timing


, 288 orchestrates initialization, input collection, event routing, lifecycle management, UI rendering. split 5 modules.
 ref bypasses React rendering model hard trace state mutations
 RulesSystem creates action executors dead
 No system dependency phase ordering conventions
 Script sandbox errors.
 Entity queries no spatial indexing
 New script context object frame
 Frame buffer producer contracts enforced
 Multiple state synchronization points gameState, gameLoopController, timeControlRef track overlapping data



./godot Bridge Layer

 Platform-specific bridge between React Native/Web Godot 4 runtime rendering.

 21 files. native.. web. platform splits

File Purpose

 `GodotBridge. native.. web. Main bridge entity management, physics,, textures
.... React component rendering viewport
 `GodotPhysicsAdapter. Converts Godot events engine format
 `PropertySyncManager. Bi-directional entity property sync
 `coordinateUtils. Screen world coordinate conversion
 `query. Query builder game state
,, screenshots

 Created GameRuntime initialization
@borndotcom/react-native-godot, WASM postMessage
 Entity registry mirrored Godot, texture cache, physics state


 Near-identical code. native... files no shared base implementation
 String-based messaging Godot no type safety
 Bridge communication errors fail
 Y-axis flip-down manually



. Expo/React Native Frontend-engine

 Mobile/web app shell navigation, editor,,.



Sub-system Location Purpose

 `app Expo Router tabs, maker, browse, themes modals (editor, game, play
 Game editor context+reducer state management, undo/redo, AI features
 **Game `components DevToolbar, GameDialog, TuningPanel
 **Browse** GameCard, FilterBar
,
 **Economy** CreditBalance, CurrencySheet
 **Auth**/supabase,-specific
 **tRPC React Query tRPC setup
 **Offline** Embedded game installation, offline storage
 **Config**/config/env. Environment variable resolution
 **Hooks** useAuth, useBrowseGames,.
 **Assets** Asset preloading, URL resolution

 **State
 React Context useReducer document, selection, undo/redo, camera, dirty state
 tRPC React Query (60s stale time, 5min GC
 **Auth** Supabase session secure storage
AsyncStorage, FileSystem bundled content


 Asset preloading disabled false indicates freeze during preload
 uses. parse.... for undo deep cloning expensive large definitions
 Max 50 undo entries hardcoded
 CDN URL hardcoded. no fallback
-bluetooth-peripheral dependency native modules deleted status shows `BLEPeripheralModule.



._project 4 Runtime

 Physics simulation, entity rendering, input handling visual game execution.





. Scene setup, module initialization
. Entity registry, setup, coordinate conversion, query
. Template merging, physics body creation
 `VisualRenderer. Texture loading, opacity, sprite rendering
. Hit testing, drag tracking, tap detection
. Physics world setup, pixelsPerMeter
 `GameBridgeEffects. Shake, zoom, particle effects

 Game (Y-up Godot (Y-down_y -game_y pixels_per_meter


GameBridge object side entity registry,, coordinate conversion,
 No unit test coverage GDScript
 Coordinate conversion ad-hoc multiple places



.-bundler Game Compiler

Compiles TypeScript game scripts JSON definitions GameDefinition bundles.

.,.,.
/shared
 5 files, asset-resolution, script-scanning, unified-loader, virtual-bundle-integration



.-inspector

 tooling game debugging MCP tools listing, opening, inspecting, interacting games.

 Express HTTP server Playwright browser automation MCP SDK
 playwright,, express,/sdk,


 Depends Playwright browser automation
 Console log buffer entries no overflow



. End-to-End Flows

 Game Load Play


 User taps game app.
.. getPublic(id D1 R2]
 AssetPreloader. textures DISABLED
 <GameRuntimeGodot definition...
 GameLoader. initialize
 EntityManager. loadEntities
 Physics2D world creation
 GameState initialization, cooldowns
 GameSystemRunner. register(14 systems
. initialize
 system. initialize phase order
 ScriptSandbox compiles scripts
  GodotBridge. loadGame(definition
  EntityFactory creates scene nodes
  VisualRenderer loads textures
  GameLoopController starts 60fps
  frame collect input. update sync


/game[id.,.,/AssetPreloader.,-engine/GameRuntime..,.,/EntityManager.,/GameSystemRunner., 14 wrapper systems,/GodotBridge..,/scripts/GameBridge.



  Flow 3: AI Game Generation


 User enters/AIGenerateModal.
.. generate,...
.
 GameIntentClassifier. classify(prompt
 Generator creates prompt
. generateObject GameDefinitionSchema
 GameValidator. validate(result
 Store D1 R2
 Return game validation report




 4: Agent-Orchestrated Game


 User starts agent run.. create
 Reserve budget
 Create DB row
. fetch Object
 Planning stage
 processGates( core_game_loop, win_lose_conditions
 gate_question events WebSocket
 User answers RunCoordinatorDO
 stage
 executes LLM call
_completed event
 settleStep( records cost
 Refine stage
 Iterative improvement
 Theme/Asset stages
 WebSocket streams events client


/routes/agent-runs.,.,,-billing-service.,.



 Flow 5 Asset Generation Pipeline


 User triggers generation.. createGenerationJob
. authorizeGeneration( balance rate limit
 Create job tasks
 template
 Compile prompt entity description
 Call image provider.
 Post-process removal, cropping
 Upload R2
 Update DB references
 Settle cost wallet


/routes/asset-system., lines pipeline



 Flow 6 Editor Save Flow


 User edits EditorProvider dispatches
 Reducer updates undoStack
 Save EditorTopBar
.. update, definition,...
 Validate definition server
 Write definition.. R2
 Update validation D1




. State Stores Registries

. Client-Side

Store Location Key Type Value Type Lifecycle



 **Entity Map** `EntityManager. entities (entityId) `RuntimeEntity Game session

  **Prefab `EntityManager. prefabs (prefabId) `EntityPrefab Game session

 **Tag `EntityManager. tagIndex `number (tagId) `Set<string> (entityIds) Game session

 **Game State vars**. `VarValue (any) Game

 State lists**. `ListValue (any[

  **Pending `GameState. pendingEvents `string Per-frame

 **Editor Document** `EditorProvider.. `GameDefinition Editor session

 **Undo Stack** `EditorProvider.. `HistoryEntry[] (max 50 Editor session

**React Query `QueryClient `queryKey[ API responses 60s, 5min GC

 **Supabase `expo-secure-store-session JSON Persistent

 **Offline `expo-file-system `gameId GameDefinition JSON

 **Tween `TweenSystem. activeTweens (tweenId) Game session

 **Frame Buffers** `GameSystemRunner `inputEvents[, `collisions[] Per-frame

**Event Queued events Between frames

. Server-Side State

 Store Location Key Type Value Type

 **D1 `games SQLite `id Game metadata, validation
 **D1 `users SQLite Profile Supabase
 **D1 `user_wallets `user_id Balance, lifetime totals
 **D1 `credit_transactions SQLite `id Immutable ledger entries
 **D1 `agent_runs SQLite `id Run metadata,,
 **D1 `agent_steps SQLite Per-step tracking
 **D1 `agent_events SQLite Event stream ordered
 **D1 `agent_checkpoints `run_id step_index Resumable state
 **R2 `games/{id Object storage.,.
 **R2 `packs/{uuid}/`** Object storage Asset images manifest
 **DO Durable Object `STATE_KEY,,: RunState, events, commands

. Overlapping State (Issues

. definition D1 D1 stores validation metadata R2 full JSON., inconsistency possible.
. EntityManager holds canonical entity map, Godot maintains parallel entity registry GDScript.. stay sync.
. state. holds runtime values,. holds defaults. reset, re-initialized.
. run D1 Durable Object KV store run status. DO live truth, D1 persistent record.
. `imageUrl `assetRef UUID populated same entity, unclear precedence rules.



. Public API Surface

. tRPC Procedures (External API

Games Router
 Procedure Type Auth Description

 `games. listPublic Query Browse public games
 `games. getPublic Query Get single public game
 `games. validateDefinition Mutation Client-side validation
 `games. analyze Classify game prompt
 `games. list Query Protected User's games
 `games. get` Get game by ID
. create Create new game
 `games. update Update game
. delete Mutation Protected Soft delete
 `games. fork Copy game
. generate AI generate game
 `games. refine AI refine game
 `games. validate Mutation Protected Re-validate
 `games. getVersionHistory Query Protected R2 artifact versions
 `games. syncTemplates Mutation Protected Admin utility 

Economy Router
 Procedure Type Auth Description

 `economy. getBalance Query Protected Current balance
 `economy. getTransactions Protected Transaction history
. redeemPromoCode Mutation Protected Redeem promo code
. validateSignupCode Check code validity
. hasRedeemedSignupCode Check redemption
. redeemSignupCode Mutation Redeem signup code
. estimateCost Query Protected Asset cost estimate
. authorizeGeneration` Mutation Protected Pre-auth check
 `economy. getProducts Query Public IAP product list
 `economy. processPurchase Mutation Protected Handle IAP

 Agent Runs Router
 Procedure Type Auth Description

 `agentRuns. create Mutation Protected Start agent run
 `agentRuns. Query Protected User's runs
 `agentRuns. run details
. getEvents Event stream
 `agentRuns. getSnapshot Protected Current state snapshot

Routers
.,. syncFromAuth
 `invites. create,.,. redeem
 `assetSystem. (themes, generation, UI components
 `uiComponents. generation

4. Non-tRPC HTTP Endpoints
 Path Method Purpose

/health Health check
/agent-run:runId (upgrade WebSocket agent run
/assets/* R2 asset serving cache
/webhooks/revenuecat IAP webhook
/api/text-grid Text utility

. Game Engine Public API Context

 script sandbox exposes ~40 methods user-authored game scripts

 **Entity `spawn, `destroy, `clone, `query,, `getPosition,,, `getVelocity,/removeTag
 `raycast, `queryAABB, `applyImpulse, `applyForce
 `getVar,
 `animate, `wait
 `emit,,
 `random, `clamp,,
 `tap`drag, `mousePosition



. Dead Code Legacy Artifacts

. Confirmed Dead Code

Item Location Evidence

 BLE Peripheral modules `app/ios/Slopcade/BLEPeripheralModule. Git status deleted
 `munim-bluetooth-peripheral dep/package. Native modules deleted, dep
 fastlane config `app/ios/fastlane Git status deleted
 `simple game deleted
 `asteroids game deleted
 Duplicate asset executor creation `RulesSystem. constructor Executors created, recreated `initialize()
 Placeholder packs `r2/packs/a1b2c3d4- Git deleted test fixture packs
 `installedProcedure `games. `DEPRECATED
 Daily login bonus Economy system `DISABLED
 Gem service `economy/gem-service.. implementation, disconnected main flow

. Massive Documentation Deletion

 ~80 documentation files `docs/ deleted. legacy architecture docs cleaned. deletion in-progress.

. Legacy Patterns

Pattern Location Issue

 `imageUrl field types Legacy replaced `assetRef UUID
. claude/memory files deleted. Old memory system cleaned
 `Gemfile. lock `app/ios Ruby (CocoaPods) deleted moved pod install
 `test-games. `app/app/ Test route deleted



. Dependency Graph


 ┌──────────────────┐
 @slopcade/shared
 (types, schemas,
 validation,
 expressions
 └────────┬─────────┘

 ┌──────────────┼──────────────┐



 @slopcade
 api │game-bundler (app

 Hono Compiler Expo/RN
 tRPC Loader Game Engine
 D1/R2 Godot Bridge
 AI SDKs Editor
 DO tRPC Client
 └──────┬─────┘

 tRPC + REST
 ◄───────────────────────────────────┘

 ┌───────┴───────────────────────────┐
 External Services
 ├───────────────────────────────────┤
 Supabase (Auth) R2 (Assets)
 D1 (SQLite) AI APIs
 Scenario/ComfyUI│ RevenueCat
 └───────────────────────────────────┘


 godot_project
 (Godot 4 GDScript
 Physics (Rapier2D)
 Rendering
 Input routing
 Bridge app/lib/godot



 game-inspector @slopcade
 mcp theme
 (Playwright (NativeWind
 MCP tools tokens



 Inter-System Communication

 From → To Mechanism

 App → API tRPC over HTTP (React Query
 Godot Platform (native module postMessage
 API → D1 ORM SQL
 R2 Cloudflare R2 binding
 → AI @ai-sdk HTTP calls
 Durable Object bindings
 Client DO WebSocket (agent run events
 Godot → App Callbacks,,
 GameEngine systems EventQueue (inter-system, direct method calls (intra-phase



. Sizing Test Coverage

 File Counts by Area
 Source Files Test Files Ratio

 `shared ~120  19  16%
`api/ 22 28%
 `app/lib/game-engine 16 16%
 `app/lib/godot/ 21  1 5%
 `app/components/ 67 0%
 `packages/game-bundler/ 5 50%
 `r2/games/ 3 10%

 Largest Files (Refactoring Candidates

File Lines Issue

 `GameRuntime.. 2, 288 component init, loop,, events,
 `asset-system., 231 4 sub-domains 1 file
 `RunCoordinatorDO., 803 WebSocket state machine recovery billing
 `agent-runs., 020 Route orchestration mixed
 `games. CRUD generation validation mixed
  `GameDefinition. 545 Everything-bag type



. Critical Observations

. Problems

. files GameRuntime, 288 lines, asset-system route, 231 lines, RunCoordinatorDO, 803 lines. primary maintenance bottlenecks.

./overlapping Game definition D1 R2 potential drift. Entity state EntityManager bridge. Agent run state D1.

. safety communication uses string messages. bridge runtime errors.

. system, 231 lines themes,, generation jobs, UI components. 4 files minimum.

.test Zero tests 67 components. 1 test 21 files. complex system 755 lines 1 test file.

. 3 Open Questions

. gem service.. developed or abandoned?
. daily login bonus feature reactivation?
. precedence `imageUrl `assetRef` populated?
. 80+ deleted docs archived or abandoned?
. BLE peripheral feature future use abandoned?
. `landing workspace maintained?
