# Party Game Builder — Foundation

## TL;DR

> **Quick Summary**: Add multiplayer party game support as a MODE of the existing Godot-based game engine. A new `NetworkRuntimeSystem` receives shared state from a Cloudflare Durable Object over WebSocket and writes it into `gameState.variables` — the existing overlay, rules, and script systems react naturally. Host and player devices both run Godot games from the same GameDefinition, differentiated by role-based visibility.
>
> **Deliverables**:
> - `PartyRoomDO` — New Durable Object for room lifecycle, WebSocket connections, server-side game logic
> - `NetworkRuntimeSystem` — New game engine system (PRE_UPDATE phase) bridging network state → game variables
> - Extended `gameState.variables` with dot-path support for `room.*` namespace
> - New QuickJS script hooks: `onNetworkState`, `onPhaseChange`
> - `role` variable in `BindingContext` for host/player visibility
> - `PartyConfig` type added to `GameDefinition`
> - WebSocket client connection hook + protocol types
> - Minimal "Question & Answer" test game proving the full stack
>
> **Estimated Effort**: Medium-Large (2-3 weeks)
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Task 1 (types) → Task 2 (DO) → Task 4 (NetworkRuntimeSystem) → Task 7 (test game)

---

## Context

### Original Request
Build a "Party Game Builder" based on the February 2026 Research & Spec Brainstorm. Party games are Jackbox-style: host screen on TV shows shared game (questions, answers, scores via Godot), player phones show input widgets (also Godot), real-time via Durable Objects.

### Interview Summary
**Key Decisions**:
- Party games ARE Godot games — same engine, same editor, same GameDefinition. NOT a separate React-only pipeline.
- Host screen runs full Godot with rich visuals. Player phones run simpler Godot scenes for input.
- Shared state model — NOT entity sync. Host and player see different things from same GameDefinition.
- Server-authoritative: game script runs in DO (V8). Clients render from received state.
- Foundation scope only: prove the architecture. NOT full Quiplash yet.
- Role-based visibility via existing `visibleWhen` on overlays.
- Three abstraction levels coexist: Scripts → Declarative Bindings → Templates.

**Architecture (The Key Insight)**:
The game engine doesn't need a "multiplayer mode." It just needs a new data source. `NetworkRuntimeSystem` sits in `PRE_UPDATE` phase, receives state from WebSocket, writes to `gameState.variables`. Everything downstream (overlays, rules, state machines, scripts) reacts exactly as if a local script set those variables.

```
DO (Game Script, V8)
    ↓ pushes shared state via WebSocket
    ↓
NetworkRuntimeSystem (PRE_UPDATE, priority 90)
    ↓ writes to gameState.variables (room.*)
    ↓
Existing Frame Loop (unchanged):
  GAME_LOGIC: ScriptSandboxRuntimeSystem → onNetworkState hook
  GAME_LOGIC: RulesSystem → reacts to variable changes
  VISUAL: OverlayRenderer → binds to {{room.prompt}}, {{room.scores.alice}}
  GodotBridge → renders entities/animations
```

### Research Findings
- Existing `GameSystemRunner` supports registering new systems in any phase (PRE_UPDATE slot available)
- `BindingEvaluator` uses `expr-eval` with `allowMemberAccess: true` — dot-path `room.prompt` already works
- `visibleWhen` expressions on overlay elements already support arbitrary conditions
- `EventQueue` can carry network events (`network:phase_change`, `network:input_request`)
- `LivePreviewController` proves "external state → engine update" pattern (but for definitions, not runtime state)
- Per-frame React pull in `GameRuntimeGodot.stepGame()` propagates variable changes to overlay automatically
- Colyseus, PartyKit, boardgame.io all use state-sync + property listeners pattern — matches our approach

### Metis Review
**Incorporated**:
- Add `role` to `BindingContext` (host/player visibility)
- Add `networkStatus` variable (connected/connecting/disconnected) for connection state in overlay
- Debounce network updates (max 10Hz) to prevent sync storms
- Namespace `room.*` for network state — prevent collision with local variables
- `room.*` variables are READ-ONLY from client scripts (server-authoritative)
- Validate all state transitions server-side
- Build reconnection logic into foundation, not as afterthought
- Test game committed to `app/examples/` for ongoing manual verification

---

## Work Objectives

### Core Objective
Prove that Slopcade's existing Godot game engine can be driven by networked shared state from a Cloudflare Durable Object, enabling Jackbox-style party games as a mode of the existing platform.

### Concrete Deliverables
- `api/src/party/PartyRoomDO.ts` — Room Durable Object
- `api/src/party/protocol.ts` — WebSocket message types and serialization
- `shared/src/types/party.ts` — Shared party types
- `shared/src/types/GameDefinition.ts` — `party?: PartyConfig` field (additive)
- `app/lib/game-engine/systems/runner/wrappers/NetworkRuntimeSystem.ts` — Network → engine bridge
- `app/lib/game-engine/ui/overlay/BindingEvaluator.ts` — `role` in context (small edit)
- `app/lib/scripting/types.ts` — New hook type definitions
- `app/lib/party/usePartyConnection.ts` — WebSocket connection hook
- `app/examples/party_test/` — Minimal test game (question → answer → reveal)

### Definition of Done
- [ ] A minimal game works end-to-end: host creates room → player joins → host shows question → player types answer → host shows answer
- [ ] Both host and player run Godot games from the same GameDefinition with role-based rendering
- [ ] Network state flows: DO → WebSocket → NetworkRuntimeSystem → gameState.variables → OverlayRenderer
- [ ] Script hook `onNetworkState` fires when server pushes state
- [ ] `visibleWhen: "role == 'host'"` correctly shows/hides overlay elements
- [ ] Player reconnects within 60 seconds and resumes
- [ ] `tsc --noEmit` passes in all workspaces
- [ ] vitest tests pass for DO state machine, NetworkRuntimeSystem, protocol

### Must Have
- PartyRoomDO with room codes, WebSocket endpoint, room lifecycle (lobby → playing → ended)
- NetworkRuntimeSystem writing `room.*` variables from WebSocket
- `role` available in BindingContext
- At least `onNetworkState` script hook working
- WebSocket client with reconnection (exponential backoff)
- One complete test game proving the full data flow
- `networkStatus` variable for connection state UI

### Must NOT Have (Guardrails)
- No modifications to OverlayRenderer, RulesSystem, or GodotBridge
- No entity-level sync (party games use shared state, not transform sync)
- No AI-generated content or prompts
- No sound effects or music for party mode
- No theming/styling system
- No spectator mode, host migration, or matchmaking
- No room persistence beyond DO lifetime
- No content moderation
- No monetization
- No voting/ranking mechanics in foundation (test game is just Q&A display)
- Do NOT repurpose existing `GameDefinition.multiplayer` field (different use case)
- Max 8 players hard limit
- `room.*` variables are READ-ONLY from client scripts (writes silently ignored)

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**

### Test Decision
- **Infrastructure exists**: YES (vitest)
- **Automated tests**: YES (tests after implementation)
- **Framework**: vitest for unit/integration, Playwright for E2E
- **Agent-Executed QA**: ALWAYS

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Shared party types + GameDefinition extension
├── Task 2: PartyRoomDO (room lifecycle, WebSocket, state broadcast)
└── Task 3: WebSocket client hook (usePartyConnection)

Wave 2 (After Wave 1):
├── Task 4: NetworkRuntimeSystem (network state → gameState.variables)
├── Task 5: Extended BindingContext (role, room.* paths)
└── Task 6: Script hooks (onNetworkState, onPhaseChange)

Wave 3 (After Wave 2):
├── Task 7: Minimal test game (GameDefinition + server script + proof-of-concept)
├── Task 8: Integration tests
└── Task 9: E2E test
```

### Dependency Matrix

| Task | Depends On | Blocks | Parallelize With |
|------|------------|--------|-----------------|
| 1 | None | 2, 3, 4, 5, 6, 7 | 2, 3 |
| 2 | 1 | 7, 8 | 1, 3 |
| 3 | 1 | 4, 7 | 1, 2 |
| 4 | 1, 3 | 7, 8 | 5, 6 |
| 5 | 1 | 7 | 4, 6 |
| 6 | 1 | 7 | 4, 5 |
| 7 | 2, 4, 5, 6 | 9 | 8 |
| 8 | 2, 4 | 9 | 7 |
| 9 | 7, 8 | None | None (final) |

---

## TODOs

---

- [x] 1. Shared Party Types + GameDefinition Extension

  **What to do**:
  - Create `shared/src/types/party.ts` with all shared types:
    - `PartyConfig` — room settings (maxPlayers, role assignment)
    - `PartyRoomState` — lobby/playing/ended with shared data
    - `PartyPlayer` — { id, name, avatar, connected }
    - `PartyMessage` — discriminated union for WebSocket protocol: `state_update`, `player_joined`, `player_left`, `input_request`, `input_response`, `phase_change`, `error`, `host_reconnect`, `player_reconnect`
    - `PartyInputRequest` — { type: "text" | "choice" | "drawing" | "buzzer", prompt, timeLimit, options? }
    - `PartyInputResponse` — { playerId, value, timestamp }
  - Add `party?: PartyConfig` field to `GameDefinition` interface (additive, optional)
  - Export from `shared/src/index.ts`

  **Must NOT do**:
  - Do not modify any existing types — additive only
  - Do not add runtime code — types only

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`game-authoring/game-definition-reference`]

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 2-9
  - **Blocked By**: None

  **References**:
  - `shared/src/types/GameDefinition.ts:326-334` — Existing `MultiplayerConfig` pattern (DO NOT extend — create separate `PartyConfig`)
  - `shared/src/types/GameDefinition.ts:471-543` — `GameDefinition` interface to add `party?` field
  - `shared/src/types/overlay.ts` — Overlay element types (for understanding UI binding model)

  **Acceptance Criteria**:
  - [ ] `shared/src/types/party.ts` exists with all listed types
  - [ ] `GameDefinition` has `party?: PartyConfig` field
  - [ ] `PartyMessage` is discriminated union on `type` field
  - [ ] Types exported from `shared/src/index.ts`
  - [ ] `tsc --noEmit` passes in shared/

  **Agent-Executed QA**:
  ```
  Scenario: Types compile
    Tool: Bash
    Steps:
      1. Run: cd shared && npx tsc --noEmit
      2. Assert: exit code 0
    Expected Result: Clean compile
  ```

  **Commit**: YES
  - Message: `feat(shared): add party game types and PartyConfig to GameDefinition`

---

- [x] 2. PartyRoomDO — Room Lifecycle + WebSocket

  **What to do**:
  - Create `api/src/party/PartyRoomDO.ts` — Durable Object class
  - Room lifecycle: lobby → playing → ended → cleanup
  - WebSocket handling: accept connections tagged as `host` or `player:{id}`
  - Room code: DO keyed by `idFromName(roomCode)`, code generated by Worker route
  - Player management: join (name, avatar preset), leave, reconnect within 60s (session tokens in `state.storage`)
  - Host reconnection: host token + full state snapshot
  - State broadcast: when game script updates shared state, broadcast `state_update` to all connections
  - Per-player state: send `player_state` only to that player's connection
  - Host-only state: send only to host-tagged connection
  - Input collection: server sends `input_request`, collects `input_response` from players, resolves with timeout
  - Rate limiting: 10 msg/sec per player
  - Cleanup: DO alarm at 4 hours, also when all disconnect
  - Register in `api/wrangler.toml`
  - Worker routes: `POST /api/party/create`, `GET /api/party/:code/ws`
  - Create `api/src/party/protocol.ts` — message serialization/deserialization

  **Must NOT do**:
  - No matchmaking or room discovery
  - No D1 persistence
  - No host migration
  - No spectator connections
  - No game template execution yet (Task 7 wires that up)

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Complex stateful DO with WebSocket management, reconnection, concurrency
  - **Skills**: [`game-authoring/scripting-api-reference`]

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 1 (with Tasks 1, 3)
  - **Blocks**: Tasks 7, 8
  - **Blocked By**: Task 1

  **References**:
  - `api/src/durable-objects/GameRepoDO.ts` — Existing DO pattern (WebSocket upgrade, `state.acceptWebSocket`, broadcasting)
  - `api/src/agent/RealtimeRelayDO.ts` — WebSocketPair creation, alarm cleanup
  - `api/src/index.ts:93-149` — WebSocket route pattern with auth
  - `api/wrangler.toml` — DO binding registration format

  **Acceptance Criteria**:
  - [ ] `api/wrangler.toml` has `PARTY_ROOM` DO binding for `PartyRoomDO`
  - [ ] `POST /api/party/create` returns `{ code: "XXXX-XXXX", hostToken: "..." }` with 201
  - [ ] `GET /api/party/:code/ws?role=host&token=...` upgrades to WebSocket
  - [ ] `GET /api/party/:code/ws?role=player&name=Alice` upgrades to WebSocket
  - [ ] Room broadcasts `player_joined` when player connects
  - [ ] Room broadcasts `state_update` when shared state changes
  - [ ] Host reconnect with valid token receives full state snapshot
  - [ ] Player reconnect within 60s resumes their slot
  - [ ] Room self-destructs via alarm after 4 hours
  - [ ] `tsc --noEmit` passes in api/

  **Agent-Executed QA**:
  ```
  Scenario: Create room
    Tool: Bash (curl)
    Steps:
      1. curl -s -X POST http://localhost:8789/api/party/create -H "Content-Type: application/json"
      2. Assert: HTTP 201
      3. Assert: response.code matches /^[A-Z0-9]{4}-[A-Z0-9]{4}$/
    Expected Result: Room created with valid code

  Scenario: Player joins via WebSocket
    Tool: Bash (node script with ws)
    Steps:
      1. Connect to ws://localhost:8789/api/party/TEST-1234/ws?role=player&name=Alice
      2. Wait for message
      3. Assert: first message type is "state_update"
    Expected Result: Connected and received state
  ```

  **Commit**: YES
  - Message: `feat(api): add PartyRoomDO with room lifecycle and WebSocket support`

---

- [x] 3. WebSocket Client Hook (usePartyConnection)

  **What to do**:
  - Create `app/lib/party/usePartyConnection.ts` — React hook
  - Manages WebSocket lifecycle: connect, disconnect, reconnect with exponential backoff
  - Role-aware: takes `role: "host" | "player"` parameter
  - Exposes: `roomState`, `privateState`, `connectionStatus`, `players`, `sendInput()`
  - `connectionStatus`: `connecting | connected | disconnected | reconnecting`
  - Queues inputs during brief disconnection, sends on reconnect
  - Create `app/lib/party/PartyContext.tsx` — React context for party state
  - Provides `role`, `roomState`, `sendInput` to child components

  **Must NOT do**:
  - No UI components — data layer only
  - No hardcoded API URL — use existing `env.apiUrl`

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 1 (with Tasks 1, 2)
  - **Blocks**: Tasks 4, 7
  - **Blocked By**: Task 1

  **References**:
  - `app/lib/editor/hooks/useGameWebSocket.ts` — Existing WebSocket hook with auth, reconnection, exponential backoff
  - `app/lib/chat/ChatStreamProvider.tsx` — Context provider pattern
  - `app/lib/config/env.ts` — API URL config
  - `app/lib/auth/token.ts` — `getAuthToken()`

  **Acceptance Criteria**:
  - [ ] `usePartyConnection({ code, role, name? })` returns `{ roomState, connectionStatus, sendInput, players }`
  - [ ] `connectionStatus` transitions through expected states
  - [ ] `sendInput(data)` sends message over WebSocket
  - [ ] Context provider wraps children with party state
  - [ ] `tsc --noEmit` passes in app/

  **Commit**: YES
  - Message: `feat(app): add party WebSocket connection hook and context`

---

- [x] 4. NetworkRuntimeSystem — Network State → Game Variables

  **What to do**:
  - Create `app/lib/game-engine/systems/runner/wrappers/NetworkRuntimeSystem.ts`
  - Implements `RuntimeSystem` interface
  - Phase: `PRE_UPDATE`, Priority: `90` (runs before InputSystem and all game logic)
  - On each frame `update()`:
    - If pending network state exists, write each key into `ctx.gameState.variables` with `room.` prefix
    - Set `ctx.gameState.variables["networkStatus"]` to current connection state
    - Set `ctx.gameState.variables["role"]` to "host" or "player"
    - Fire pending network events into `ctx.eventQueue` as `network:{type}` events
    - Clear pending buffers
  - Receives messages from WebSocket (outside frame loop) via `onMessage(msg)` — buffers until next frame
  - Exposes `sendInput()` for player → server communication
  - Register in `GameRuntime.godot.tsx` when `definition.party` is defined
  - Debounce: max 10 state updates per second (drop intermediates, keep latest)

  **Must NOT do**:
  - Do not modify GameSystemRunner — just register a new system
  - Do not modify OverlayRenderer or RulesSystem
  - Do not modify GodotBridge
  - `room.*` variables are read-only from scripts — `setVariable("room.X", ...)` silently ignored

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Core architectural piece, careful integration with frame loop, concurrency between WebSocket thread and game loop
  - **Skills**: [`game-authoring/scripting-api-reference`, `ecs-architecture`]

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 2 (with Tasks 5, 6)
  - **Blocks**: Tasks 7, 8
  - **Blocked By**: Tasks 1, 3

  **References**:
  - `app/lib/game-engine/systems/runner/GameSystemRunner.ts` — Phase loop, system registration
  - `app/lib/game-engine/systems/runner/wrappers/ScriptSandboxRuntimeSystem.ts` — Existing RuntimeSystem pattern (constructor, initialize, update, destroy, getState)
  - `app/lib/game-engine/systems/runner/types.ts` — RuntimeSystem interface, SystemContext, UpdateContext
  - `app/lib/game-engine/GameRuntime.godot.tsx:1111` — `stepGame()` where systems are updated and state pulled
  - `app/lib/game-engine/systems/runner/EventQueue.ts` — EventQueue for emitting network events
  - `shared/src/systems/SystemPhase.ts` — Phase enum including PRE_UPDATE

  **Acceptance Criteria**:
  - [ ] `NetworkRuntimeSystem` implements `RuntimeSystem` with phase `PRE_UPDATE`, priority `90`
  - [ ] When server sends `{ type: "state_update", data: { phase: "voting", prompt: "What is...?" } }`, next frame has `gameState.variables["room.phase"] == "voting"` and `gameState.variables["room.prompt"] == "What is...?"`
  - [ ] `gameState.variables["networkStatus"]` reflects connection state
  - [ ] `gameState.variables["role"]` is "host" or "player"
  - [ ] Network events appear on EventQueue as `network:phase_change`, `network:input_request`, etc.
  - [ ] Writes to `room.*` via script `ctx.setVariable("room.X", ...)` are silently ignored
  - [ ] System registered only when `definition.party` is defined
  - [ ] `tsc --noEmit` passes

  **Agent-Executed QA**:
  ```
  Scenario: Network state reaches game variables
    Tool: Bash (vitest)
    Steps:
      1. Run: cd app && npx vitest run lib/game-engine/systems/runner/wrappers/__tests__/NetworkRuntimeSystem.test.ts
      2. Assert: "writes room.* variables from network state" passes
      3. Assert: "ignores client writes to room.* namespace" passes
      4. Assert: "sets networkStatus and role variables" passes
    Expected Result: All tests pass
  ```

  **Commit**: YES
  - Message: `feat(engine): add NetworkRuntimeSystem for party game state sync`

---

- [x] 5. Extended BindingContext — Role + Room Namespace

  **What to do**:
  - Edit `app/lib/game-engine/ui/overlay/BindingEvaluator.ts`:
    - Add `role: string` to `BindingContext` interface
    - Add `room: Record<string, unknown>` to `BindingContext` (built from `room.*` variables)
    - Update `buildBindingContext()` to extract `role` from variables and build `room` object from `room.*` prefix
  - Edit `app/lib/game-engine/GameRuntime.godot.tsx`:
    - Pass `role` when building binding context (from `gameState.variables["role"]`)
  - Verify: `visibleWhen: "role == 'host'"` works on overlay elements
  - Verify: `{{room.prompt}}` resolves in text bindings
  - Verify: `{{room.scores.alice}}` resolves (dot-path into nested object)

  **Must NOT do**:
  - Do not modify OverlayRenderer component — only BindingEvaluator and context building
  - Do not modify expr-eval configuration (memberAccess already enabled)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small targeted edits to existing files
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 2 (with Tasks 4, 6)
  - **Blocks**: Task 7
  - **Blocked By**: Task 1

  **References**:
  - `app/lib/game-engine/ui/overlay/BindingEvaluator.ts:7-17` — `BindingContext` interface to extend
  - `app/lib/game-engine/ui/overlay/BindingEvaluator.ts:42-57` — `buildBindingContext()` to update
  - `app/lib/game-engine/ui/overlay/BindingEvaluator.ts:63` — expr-eval Parser with `allowMemberAccess: true` (already supports dot paths)
  - `app/lib/game-engine/ui/overlay/OverlayRenderer.tsx:46-49` — Where context is built (calls `buildBindingContext`)

  **Acceptance Criteria**:
  - [ ] `BindingContext` has `role: string` field
  - [ ] `BindingContext` has `room: Record<string, unknown>` field
  - [ ] `buildBindingContext()` extracts role from variables
  - [ ] `buildBindingContext()` builds room object from `room.*` variables
  - [ ] `evaluateCondition("role == 'host'", ctx)` returns true when role is "host"
  - [ ] `evaluateTemplate("{{room.prompt}}", ctx)` resolves correctly
  - [ ] Existing tests still pass: `vitest run ui/overlay/__tests__/BindingEvaluator.test.ts`

  **Agent-Executed QA**:
  ```
  Scenario: BindingEvaluator tests pass with new fields
    Tool: Bash (vitest)
    Steps:
      1. Run: cd app && npx vitest run lib/game-engine/ui/overlay/__tests__/BindingEvaluator.test.ts
      2. Assert: All existing tests pass
      3. Assert: New tests for role and room.* pass
    Expected Result: Full green
  ```

  **Commit**: YES
  - Message: `feat(engine): extend BindingContext with role and room namespace for party games`

---

- [x] 6. Script Hooks — onNetworkState + onPhaseChange

  **What to do**:
  - Add `onNetworkState` and `onPhaseChange` to `ScriptHookName` type in `IScriptSandbox.ts`
  - Add `runNetworkState(runtime, state)` and `runPhaseChange(runtime, phase, data)` to `IScriptSandbox` interface
  - Implement in `QuickJSScriptSandbox.ts` — same pattern as `runInput`/`runCollision`
  - Update `ScriptSandboxRuntimeSystem.ts`:
    - Check for `network:state_update` events in EventQueue during `update()`
    - If found, call `sandbox.runNetworkState()` with state data
    - Check for `network:phase_change` events, call `sandbox.runPhaseChange()`
  - Update `app/lib/scripting/types.ts`:
    - Add to `ScriptLifecycleExports`: `onNetworkState?(ctx, state): void` and `onPhaseChange?(ctx, phase, data): void`
  - Enforce: `room.*` variables are read-only from script context:
    - In `ScriptSandboxRuntimeSystem.createScriptContext()`, wrap `setVariable` to reject `room.*` keys

  **Must NOT do**:
  - Do not allow scripts to send WebSocket messages directly
  - Do not expose raw player connection data to scripts

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Extends existing QuickJS sandbox with new hooks, medium complexity
  - **Skills**: [`game-authoring/scripting-api-reference`]

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 2 (with Tasks 4, 5)
  - **Blocks**: Task 7
  - **Blocked By**: Task 1

  **References**:
  - `app/lib/scripting/IScriptSandbox.ts:46` — `ScriptHookName` type to extend
  - `app/lib/scripting/IScriptSandbox.ts:55-132` — `IScriptSandbox` interface
  - `app/lib/scripting/QuickJSScriptSandbox.ts:164-187` — `runInput`/`runCollision` pattern to follow
  - `app/lib/game-engine/systems/runner/wrappers/ScriptSandboxRuntimeSystem.ts:289-685` — `createScriptContext` (wrap setVariable)
  - `app/lib/game-engine/systems/runner/wrappers/ScriptSandboxRuntimeSystem.ts:609-621` — Existing `setVariable` implementation

  **Acceptance Criteria**:
  - [ ] `ScriptHookName` includes `onNetworkState` and `onPhaseChange`
  - [ ] `IScriptSandbox` has `runNetworkState` and `runPhaseChange` methods
  - [ ] QuickJS sandbox implements both hooks
  - [ ] ScriptSandboxRuntimeSystem calls hooks when network events arrive via EventQueue
  - [ ] `ctx.setVariable("room.anything", ...)` is silently ignored in script context
  - [ ] `tsc --noEmit` passes in app/
  - [ ] Existing script tests still pass

  **Agent-Executed QA**:
  ```
  Scenario: Script hooks compile and register
    Tool: Bash
    Steps:
      1. Run: cd app && npx tsc --noEmit
      2. Assert: exit code 0
    Expected Result: Clean compile with new hooks
  ```

  **Commit**: YES
  - Message: `feat(scripting): add onNetworkState and onPhaseChange hooks for party games`

---

- [x] 7. Minimal Test Game — "Question & Answer"

  **What to do**:
  - Create a complete test game proving the full stack works end-to-end
  - **Server script** (`api/src/party/templates/question-answer.ts`):
    - Hardcode 5 questions
    - Flow: lobby → host starts → show question → collect text answers → show answers → next question → done
    - Uses `room.setState()` to push: `{ phase, prompt, answers, timerRemaining }`
  - **GameDefinition** (`app/examples/party_test/definition.json`):
    - Overlay elements:
      - Room code display (host-only, lobby phase): `visibleWhen: "role == 'host' and room.phase == 'lobby'"`
      - Question text (all, question phase): `bindings: { text: "room.prompt" }`
      - Timer bar (all, question phase): `bindings: { value: "room.timerRemaining", max: "30" }`
      - Answer list (host-only, reveal phase): dynamic text elements showing submitted answers
      - "Start Game" button (host-only, lobby): fires event
      - Text input prompt text (player-only, question phase)
    - No physics, minimal entities (maybe a background entity for visual)
    - `party: { maxPlayers: 8 }`
  - **Client script** (inside GameDefinition `script` field):
    - `onNetworkState(ctx, state)`: sets local variables from state
    - `onPhaseChange(ctx, phase)`: handles transitions
  - **Input widget**: For foundation, player text input can be a React Native TextInput in an overlay button-press flow. The player presses the overlay button, a React Native modal opens for text entry, and submits via `sendInput()`.
  - Wire up: `POST /api/party/create` → loads `question-answer` template → PartyRoomDO runs it
  - Register as example in `app/examples/party_test/`

  **Must NOT do**:
  - No voting mechanics
  - No scoring
  - No animations or effects
  - No custom theming
  - No AI-generated questions — hardcode them
  - Keep it MINIMAL — this proves architecture, not polish

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: First end-to-end integration of all previous tasks, debugging cross-system issues
  - **Skills**: [`game-authoring`, `game-authoring/scripting-api-reference`, `game-authoring/examples`]

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 3 (with Task 8)
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 2, 4, 5, 6

  **References**:
  - `app/examples/` — Existing example game patterns (metadata export, file structure)
  - `shared/src/types/GameDefinition.ts` — Full schema for definition JSON
  - `shared/src/types/overlay.ts` — Overlay element types (Text, Bar, Button, Container)
  - `api/src/party/PartyRoomDO.ts` (Task 2) — Room to host the game
  - `api/src/party/PartyApi.ts` (if created in Task 2) — API for server scripts
  - Research doc Section 5 — Quiplash example game script (simplified for test)

  **Acceptance Criteria**:
  - [ ] Game definition exists at `app/examples/party_test/`
  - [ ] Server template exists at `api/src/party/templates/question-answer.ts`
  - [ ] Host creates room, sees room code on screen
  - [ ] Player joins, sees lobby
  - [ ] Host presses "Start", question appears on both host and player screens
  - [ ] Player submits text answer
  - [ ] Host screen shows submitted answer within 1 second
  - [ ] After timeout, next question loads
  - [ ] After all questions, game shows "Done" state
  - [ ] Role-based visibility works: host sees room code, player doesn't. Player sees input prompt, host doesn't.

  **Agent-Executed QA**:
  ```
  Scenario: Full test game flow
    Tool: Playwright (playwright skill) — multi-page
    Preconditions: pnpm dev running
    Steps:
      1. Create room via API: POST /api/party/create
      2. Open host page at localhost:8085/examples/party_test?code=XXXX&role=host
      3. Assert: Room code visible on host screen
      4. Open player page at localhost:8085/examples/party_test?code=XXXX&role=player&name=Alice
      5. Assert: Player sees lobby / "waiting" state
      6. Host: click "Start Game" overlay button
      7. Assert: Both host and player see question text
      8. Player: submit answer "Test answer"
      9. Assert: Host shows "Test answer" within 2 seconds
      10. Screenshot: .sisyphus/evidence/task-7-test-game.png
    Expected Result: Full Q&A cycle works
    Evidence: .sisyphus/evidence/task-7-test-game.png
  ```

  **Commit**: YES
  - Message: `feat: add minimal party test game proving network → engine → Godot flow`

---

- [ ] 8. Integration Tests

  **What to do**:
  - `api/src/party/__tests__/PartyRoomDO.test.ts` — DO state machine tests
  - `api/src/party/__tests__/protocol.test.ts` — Message serialization
  - `app/lib/game-engine/systems/runner/wrappers/__tests__/NetworkRuntimeSystem.test.ts` — Network → variable flow
  - `app/lib/game-engine/ui/overlay/__tests__/BindingEvaluator.test.ts` — Extended context tests (add to existing file)
  - Test scenarios:
    - Room creation → player join → player leave → cleanup
    - Network state → gameState.variables mapping
    - `room.*` read-only enforcement
    - Role in BindingContext
    - Reconnection within/after 60s window
    - Rate limiting

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`testing-patterns`]

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 3 (with Task 7)
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 2, 4

  **Acceptance Criteria**:
  - [ ] `cd api && npx vitest run src/party/__tests__/` → all pass
  - [ ] `cd app && npx vitest run lib/game-engine/systems/runner/wrappers/__tests__/NetworkRuntimeSystem` → all pass
  - [ ] `cd app && npx vitest run lib/game-engine/ui/overlay/__tests__/BindingEvaluator` → all pass (including new tests)
  - [ ] At least 12 test cases total

  **Commit**: YES
  - Message: `test: add party game integration tests`

---

- [x] 9. E2E Test + Verification

  **What to do**:
  - Create Playwright E2E test for the test game
  - Multi-page: 1 host browser + 1 player browser
  - Full flow: create room → join → start → answer → verify display
  - Verify `tsc --noEmit` across all workspaces
  - Verify no regressions in existing game engine (run existing tests)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`playwright`, `testing-patterns`]

  **Parallelization**:
  - **Can Run In Parallel**: NO — Sequential (final)
  - **Blocks**: None
  - **Blocked By**: Tasks 7, 8

  **Acceptance Criteria**:
  - [ ] E2E test passes
  - [ ] `tsc --noEmit` passes in shared/, api/, app/
  - [ ] Existing game engine tests still pass (no regressions)
  - [ ] No new lint errors

  **Agent-Executed QA**:
  ```
  Scenario: Full E2E
    Tool: Playwright
    Steps:
      1. Create room, open host and player pages
      2. Start game, player submits answer
      3. Assert: host shows answer
      4. Assert: no console errors
    Expected Result: Clean end-to-end pass
    Evidence: .sisyphus/evidence/task-9-e2e.png
  ```

  **Commit**: YES
  - Message: `test(e2e): add party game end-to-end test`

---

## Commit Strategy

| After Task | Message | Verification |
|------------|---------|--------------|
| 1 | `feat(shared): add party game types and PartyConfig to GameDefinition` | `tsc --noEmit` |
| 2 | `feat(api): add PartyRoomDO with room lifecycle and WebSocket support` | `tsc --noEmit` |
| 3 | `feat(app): add party WebSocket connection hook and context` | `tsc --noEmit` |
| 4 | `feat(engine): add NetworkRuntimeSystem for party game state sync` | vitest |
| 5 | `feat(engine): extend BindingContext with role and room namespace` | vitest |
| 6 | `feat(scripting): add onNetworkState and onPhaseChange hooks` | `tsc --noEmit` |
| 7 | `feat: add minimal party test game proving network → engine → Godot flow` | Playwright |
| 8 | `test: add party game integration tests` | vitest |
| 9 | `test(e2e): add party game end-to-end test` | Playwright |

---

## Success Criteria

### Verification Commands
```bash
cd shared && npx tsc --noEmit    # Expected: 0 errors
cd api && npx tsc --noEmit       # Expected: 0 errors
cd app && npx tsc --noEmit       # Expected: 0 errors
cd api && npx vitest run src/party/__tests__/    # Expected: all pass
cd app && npx vitest run lib/game-engine/        # Expected: all pass (no regressions)
npx playwright test tests/e2e/party/             # Expected: full game flow passes
```

### Final Checklist
- [x] All "Must Have" items present and working
- [x] All "Must NOT Have" items confirmed absent
- [x] Minimal test game playable: host + 1 player, question → answer → display
- [x] No modifications to OverlayRenderer, RulesSystem, or GodotBridge
- [x] Existing game engine tests still pass
- [x] `room.*` variables flow from DO → WebSocket → NetworkRuntimeSystem → overlay
- [x] Role-based visibility works via `visibleWhen`
- [x] Script `onNetworkState` hook fires on state updates

---

## Design Document Reference

The full architectural design document is at `.sisyphus/drafts/party-networking-architecture.md`. It covers:
- Why variables are the bridge (not entity sync)
- The three abstraction levels (scripts → bindings → templates)
- How the NetworkRuntimeSystem slots into the existing frame loop
- Comparison with Colyseus, PartyKit, and Jackbox architectures
- The host/player role-tag approach
