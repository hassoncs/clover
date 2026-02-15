# Party Platform Phase 1-2 Official Plan

## TL;DR

> **Objective**: Build party-game platform primitives oriented around the R2 game system. Party games should use the same GameDefinition + script sandbox architecture as arcade games, with server-side script execution for authoritative multiplayer state.
>
> **Architecture**: Same script sandbox runs everywhere — on player phones, host TV, AND server (Cloudflare Worker). Server instance is authoritative; clients are mirrors that recover from restarts.
>
> **Immediate Scope**: Execute Phase 1 (platform plumbing) and Phase 2 (R2 migration) now.

---

## Context

### Architecture Direction (Updated 2026-02-15)

The original plan treated party games as server-side TypeScript templates separate from R2 games. **The user redirected**: every game should be an R2 game. The script sandbox (currently QuickJS/UnsafeScriptSandbox) should run:
1. **On each player's phone** — for input UI and local state
2. **On the host's TV** — for the "announcer" display
3. **On the server (Cloudflare Worker)** — as the authoritative game state

This means:
- Game logic lives in scripts (JS modules in GameDefinition), NOT in hardcoded TypeScript templates
- Shared utilities are `slopcade/*` modules, available everywhere via `require()`
- Server-side infrastructure (rooms, WebSocket, scoring) remains as platform APIs
- The `IScriptSandbox` interface is runtime-agnostic — works in V8 (Worker) and QuickJS (client)

### Verified Existing Foundation (Do Not Rebuild)
- `api/src/party/PartyRoomDO.ts`: room lifecycle, websocket sync, phase machine, `requestInput`, `sendToPlayer`, scoring, reconnect, rate limit.
- `app/lib/party/usePartyConnection.ts`: robust connection/reconnect hook, active input request handling, privateState support.
- `app/components/party/`: reusable text/vote/timer/scoreboard/buzzer primitives.
- `app/lib/scripting/IScriptSandbox.ts`: runtime-agnostic sandbox interface with `onNetworkState` and `onPhaseChange` hooks already defined.
- `app/lib/scripting/UnsafeScriptSandbox.ts`: `new Function()`-based sandbox — pure JS, no browser/native deps, works in V8 Workers.
- `shared/src/scripting/modules/index.ts`: `SLOPCADE_MODULES` registry — string source code, works anywhere.
- `packages/content-pipeline/`: generation, moderation, storage, build-pack CLI.

### Key Gaps To Fill
- Server-side script execution in PartyRoomDO (load GameDefinition, run sandbox in Worker)
- New `slopcade/party` and `slopcade/content` modules for party game utilities
- R2-stored party game definitions (GameDefinition with `party` config field)
- Client `privateState` wiring (server → client WebSocket → React context)
- Subset input collection for asymmetric/judge/team mechanics
- Phase-router generalization for game-specific UI mapping
- Migration of existing templates (quiplash, crowd-comedy) to R2 game format

---

## Work Objectives

### Core Objective
Build the infrastructure that lets party games be R2 games — same script sandbox, same `slopcade/*` modules, same GameDefinition format — with server-authoritative multiplayer state.

### Deliverables
- Server-side script sandbox execution in PartyRoomDO
- `slopcade/party` and `slopcade/content` shared modules
- Client private-state wiring end-to-end
- Subset input request API
- Phase-router generalization
- At least one party game migrated from hardcoded template to R2 GameDefinition + script

### Definition of Done
- [x] Shared template utilities extracted and content loader abstracted.
- [x] Per-player private state can be sent from server (`sendToPlayer` + protocol).
- [x] Buzzer input component integrated into party flow.
- [ ] Client receives and exposes `privateState` in React context.
- [ ] Subset input request flow works for target-player-only prompts.
- [ ] `slopcade/party` and `slopcade/content` modules available via `require()`.
- [ ] PartyRoomDO can load a GameDefinition and execute its server script in-process.
- [ ] At least one party game (quiplash) runs as an R2 game definition.
- [ ] Phase-router supports game-specific view registration.

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: YES (tests-after for this platform phase)
- **Framework**: vitest (`npx vitest run` from `api/`)

### Universal Verification Rule
- No manual-only acceptance. Every criterion must be command/tool verifiable.

### Shared Verification Commands
```bash
npx vitest run src/party/ --reporter=verbose   # from api/
npx tsc --noEmit --project api/tsconfig.json
npx vitest run src/scripting/ --reporter=verbose  # from shared/ (module tests)
```

---

## Execution Strategy

### Wave A — Platform Plumbing (keep building on existing infra)
4. Wire client `privateState` end-to-end.
6. Add `requestInputFromSubset` in PartyRoomDO.
8. Generalize phase-router for game-specific views.

### Wave B — R2 Orientation (new infrastructure)
12. Create `slopcade/party` module (scoreboard, matchups, vote tallying, points).
13. Create `slopcade/content` module (shuffle, select, dedup for content packs).
14. Add server-side script sandbox execution in PartyRoomDO.
15. Migrate quiplash template to R2 GameDefinition + server script.
16. Migrate crowd-comedy template to R2 GameDefinition + server script.

### Deferred to Phase 3-4 (removed from this plan)
- ~~7. DrawingInput~~ → deferred (needs canvas component research)
- ~~9. Missing generation configs~~ → deferred (fibbage/caption/wordgame)
- ~~10. Bulk content generation~~ → deferred (needs API keys + generation time)
- ~~11. Template helper framework~~ → superseded by R2 script migration

---

## TODOs (Implementation + Verification)

### Completed (Wave A - original)

- [x] 1. Extract shared template utility module
  - **Status**: Done. Created `api/src/party/templates/utils.ts`, migrated all templates.

- [x] 2. Add generic content loader abstraction
  - **Status**: Done. Refactored `prompt-loader.ts` with generic `loadContentPack<T>()`, type-safe `ContentTypeMap`.

- [x] 3. Add `sendToPlayer` server capability
  - **Status**: Done. Added `sendToPlayer()` to PartyRoomDO, `private_state` protocol message, tests pass.

- [x] 5. Add reusable `BuzzerInput` component
  - **Status**: Done. Created `BuzzerInput.tsx`, integrated into `play.tsx` for `type: buzzer`.

### Active (Wave A - Platform Plumbing)

- [x] 4. Wire client `privateState` end-to-end
  - **What to do**:
    - Add `private_state` case to `usePartyConnection.ts` `onmessage` handler.
    - Call `setPrivateState(message.data)` when received.
    - Verify `PartyContext` already exposes `privateState` (it does — just needs the message handler).
  - **References**:
    - `app/lib/party/usePartyConnection.ts` (line ~118, switch statement)
    - `app/lib/party/PartyContext.tsx`
  - **Acceptance criteria**:
    - [ ] Target player receives private data and context updates.
    - [ ] Other players' contexts remain unchanged.

- [x] 6. Add `requestInputFromSubset` in PartyRoomDO
  - **What to do**:
    - Add `requestInputFromSubset(requestId, request, targetPlayerIds)` method.
    - Send `input_request` only to targeted players.
    - Collector expects only subset responses or timeout.
  - **References**:
    - `api/src/party/PartyRoomDO.ts` (existing `requestInput` method as template)
  - **Acceptance criteria**:
    - [ ] Subset input request works with partial participant targeting.
    - [ ] Non-target players do not receive the request.
    - [ ] Tests cover: subset delivery, timeout with partial responses, empty subset.

- [x] 8. Generalize phase-router for game-specific views
  - **What to do**:
    - Create a phase renderer registry: `Record<gameTemplate, Record<phase, Component>>`.
    - Replace hardcoded switch in `play.tsx` with registry lookup.
    - Default renderer for unknown phases (shows phase name + sharedData).
    - Apply same pattern to `host.tsx`.
  - **References**:
    - `app/app/party/play.tsx` (giant switch on `gamePhase`)
    - `app/app/party/host.tsx`
  - **Acceptance criteria**:
    - [ ] Existing game renders continue to work.
    - [ ] New game can register phase renderer without editing play.tsx/host.tsx.

### Active (Wave B - R2 Orientation)

- [x] 12. Create `slopcade/party` module
  - **What to do**:
    - Add to `shared/src/scripting/modules/index.ts` as `PARTY_MODULE_SOURCE`.
    - Functions: `createScoreboard(scores, playerNames)`, `createMatchups(playerIds, items)`, `tallyVotes(responses, excludeSelfVotes, authorMap)`, `calculatePoints(voteCounts, opts)`.
    - Register as `slopcade/party` in `SLOPCADE_MODULES`.
    - Write tests for each function.
  - **References**:
    - `shared/src/scripting/modules/index.ts` (existing module pattern)
    - `api/src/party/templates/utils.ts` (logic to extract)
    - `api/src/party/templates/quiplash.ts` (matchup/scoring logic)
  - **Acceptance criteria**:
    - [ ] `require("slopcade/party")` works in UnsafeScriptSandbox.
    - [ ] `createScoreboard` returns sorted entries.
    - [ ] `createMatchups` generates round-robin pairings.
    - [ ] `tallyVotes` correctly excludes self-votes.
    - [ ] Unit tests pass.

- [x] 13. Create `slopcade/content` module
  - **What to do**:
    - Add to `shared/src/scripting/modules/index.ts` as `CONTENT_MODULE_SOURCE`.
    - Functions: `shuffle(arr)`, `selectForRound(pool, count, usedIds)`, `markUsed(usedIds, items)`.
    - Register as `slopcade/content` in `SLOPCADE_MODULES`.
  - **References**:
    - `shared/src/scripting/modules/index.ts`
    - `api/src/party/content/prompt-loader.ts` (shufflePrompts, selectPromptsForRound)
  - **Acceptance criteria**:
    - [ ] `require("slopcade/content")` works in UnsafeScriptSandbox.
    - [ ] Shuffle produces valid permutations.
    - [ ] selectForRound respects usedIds exclusion.
    - [ ] Unit tests pass.

- [x] 14. Add server-side script sandbox in PartyRoomDO
  - **What to do**:
    - Import `UnsafeScriptSandbox` (or equivalent V8-compatible sandbox) into API package.
    - In `PartyRoomDO`, when a game starts:
      1. Load `GameDefinition` (from template registry initially, later from R2).
      2. Extract `modules.server` script code.
      3. Create sandbox instance with script code + slopcade modules.
      4. Execute the script's `exports.run(roomAPI, config)` function.
    - The `roomAPI` object wraps existing PartyRoomDO methods: `setPhase`, `updateSharedData`, `requestInput`, `requestInputFromSubset`, `sendToPlayer`, `updatePlayerScore`, `delay`.
    - Keep `TEMPLATE_REGISTRY` as fallback for non-R2 games.
  - **References**:
    - `app/lib/scripting/UnsafeScriptSandbox.ts` (reference implementation)
    - `shared/src/scripting/modules/index.ts` (SLOPCADE_MODULES)
    - `api/src/party/PartyRoomDO.ts` (existing template runner)
    - `api/src/party/templates/registry.ts` (current registry)
  - **Acceptance criteria**:
    - [ ] PartyRoomDO can execute a script that calls `room.setPhase`, `room.requestInput`, etc.
    - [ ] Script has access to `require("slopcade/party")` and `require("slopcade/content")`.
    - [ ] Script errors are caught and reported without crashing the DO.
    - [ ] Tests cover: basic script execution, module require, error handling.

- [x] 15. Migrate quiplash to R2 GameDefinition + server script
  - **What to do**:
    - Create `r2/games/quiplash/definition.json` with `party` config and `modules.server`.
    - Port `api/src/party/templates/quiplash.ts` logic to JS script using `slopcade/party` and `slopcade/content`.
    - Include content pack (quiplash-prompts.json) in the definition or load separately.
    - Update `TEMPLATE_REGISTRY` to use the new R2-based runner.
    - Verify identical behavior to the original template.
  - **References**:
    - `api/src/party/templates/quiplash.ts` (source logic)
    - `r2/games/ballSort/` (reference R2 game structure)
  - **Acceptance criteria**:
    - [ ] Quiplash runs through all phases (answering → voting → reveal → scores → winner).
    - [ ] Scoring logic produces identical results to the original template.
    - [ ] Game uses `slopcade/party` module for scoreboard/matchups.

- [x] 16. Migrate crowd-comedy to R2 GameDefinition + server script
  - **What to do**:
    - Same pattern as quiplash migration.
    - Create `r2/games/crowd-comedy/definition.json`.
    - Port crowd-comedy logic to JS script.
  - **References**:
    - `api/src/party/templates/crowd-comedy.ts`
  - **Acceptance criteria**:
    - [ ] Crowd Comedy runs through all phases with correct scoring.
    - [ ] Uses `slopcade/party` and `slopcade/content` modules.
    - [ ] Pattern validates — two games successfully migrated proves the architecture.

### Active (Wave C - Cleanup & Documentation)

- [x] 17. Clean up PartyRoomDO legacy tech debt
  - **What to do**:
    - Remove `TEMPLATE_REGISTRY` import and all template runner logic from PartyRoomDO.
    - Remove `templateRunner` field, `setTemplateRunner()` method, and `template` init path.
    - Remove `currentRound`/`maxRounds` from core DO state (move to sharedData in scripts).
    - Remove `DEFAULT_ANSWER_TIMEOUT`/`DEFAULT_VOTE_TIMEOUT` constants (scripts control their own timeouts).
    - Update `registry.ts` to ONLY use ServerScriptRunner-based entries (all games load from definitions).
    - Ensure crowd-comedy and question-answer also have R2 definitions (or are wired through ServerScriptRunner).
    - Delete `PartyTemplateRunner` type export.
  - **References**:
    - `api/src/party/PartyRoomDO.ts` (lines: 21, 29-30, 52, 60-61, 63, 98-100, 122, 142-144, 627-629, 703-704, 747-748, 762-763)
    - `api/src/party/templates/registry.ts`
  - **Acceptance criteria**:
    - [ ] No references to `TEMPLATE_REGISTRY` or `templateRunner` remain in PartyRoomDO.
    - [ ] `currentRound`/`maxRounds` not in core DO state.
    - [ ] All games in registry use ServerScriptRunner path.
    - [ ] Existing tests still pass.

- [ ] 18. Write summary document and test plan
  - **What to do**:
    - Create `.sisyphus/plans/party-platform-summary.md` with:
      - High-level overview of what was built
      - Architecture diagram (text-based)
      - Module inventory with descriptions
      - Test coverage analysis (what's tested, what's not)
      - Integration test recommendations
      - Manual QA checklist
      - Next steps and recommendations
  - **Acceptance criteria**:
    - [ ] Document covers all modules built in this plan.
    - [ ] Test plan distinguishes unit/integration/manual testing.
    - [ ] Next steps section includes Phase 3-4 priorities.

### Deferred (removed from this plan)

- ~~7. DrawingInput~~ → Deferred to Phase 3-4 (needs canvas research for RN)
- ~~9. Missing generation configs~~ → Deferred (fibbage/caption/wordgame configs)
- ~~10. Bulk content generation~~ → Deferred (needs API keys + generation time)
- ~~11. Template helper framework~~ → Superseded by R2 script migration approach

---

## Architecture Notes

### Server Script Execution Model
```
PartyRoomDO (Cloudflare Worker, V8)
  │
  ├─ On "start_game":
  │   1. Load GameDefinition (from registry or R2)
  │   2. Extract modules.server script code
  │   3. Create sandbox with slopcade/* modules injected
  │   4. Execute: script.exports.run(roomAPI, config)
  │
  ├─ roomAPI = {
  │     setPhase(phase),
  │     updateSharedData(data),
  │     requestInput(id, request) → Promise<Map>,
  │     requestInputFromSubset(id, request, playerIds) → Promise<Map>,
  │     sendToPlayer(id, data),
  │     updatePlayerScore(id, delta),
  │     delay(ms) → Promise,
  │     getPlayers() → Player[],
  │   }
  │
  └─ Clients connect via WebSocket, receive state_update/phase_change/input_request
```

### Why UnsafeScriptSandbox works for V8 Workers
- Uses `new Function()` — standard V8, no WASM needed
- `SLOPCADE_MODULES` are string source code — no file system deps
- Cloudflare Workers are already sandboxed (V8 isolates)
- Future: swap to QuickJS WASM in Worker for user-submitted scripts (untrusted code)

### GameDefinition `party` field (new)
```typescript
party?: {
  maxPlayers: number;
  minPlayers: number;
  serverScript: string;           // key into modules{}
  contentPacks?: string[];        // content types needed
  phases: string[];               // declared phases
  inputTypes: string[];           // input types used
  roundCount?: number;
  roles?: Record<string, { screen: string }>;
}
```

---

## Deferred Work Link

All non-immediate work is preserved and scheduled in:

- `.sisyphus/plans/party-platform-phase3-4-roadmap.md`

This includes: DrawingInput, teams, audience role, bracket engine, hidden-role frameworks, QuickJS WASM in Workers (for untrusted scripts), bulk content generation, missing generation configs.

---

## Success Criteria

- [x] Shared template utilities extracted and content loader abstracted.
- [x] Per-player private state protocol and server method implemented.
- [x] Buzzer input component available for party games.
- [ ] Client `privateState` wired end-to-end.
- [ ] Subset input collection works for asymmetric mechanics.
- [ ] `slopcade/party` and `slopcade/content` modules available as shared libraries.
- [ ] Server-side script sandbox executes game logic in PartyRoomDO.
- [ ] At least one party game fully migrated to R2 GameDefinition format.
- [ ] Phase-router generalized for extensible game UI.
