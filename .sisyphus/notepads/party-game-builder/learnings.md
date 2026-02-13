# Party Game Builder — Learnings

## Task 3: WebSocket Client Hook

### Implementation Notes
- Created `app/lib/party/types.ts` as re-export layer from shared types
- Followed `useGameWebSocket` pattern for connection management:
  - Exponential backoff (1s → 30s max)
  - Connection status tracking (connecting → connected → disconnected → reconnecting)
  - Automatic reconnection on close
  - Cleanup on unmount
- Input queueing during disconnection implemented via `inputQueueRef`
- Context provider follows `ChatStreamProvider` pattern with separate state/dispatch contexts
- Used existing `env.apiUrl` and `getAuthToken()` utilities

### Key Decisions
- `sendInput()` queues messages during disconnection, flushes on reconnect
- Connection status exposed for UI feedback (`networkStatus` variable)
- Role-aware connection: host uses `hostToken`, player uses `name`
- WebSocket URL construction: `ws://host/api/party/:code/ws?role=X&name=Y`

### Files Created
- `app/lib/party/types.ts` — Re-exports from shared
- `app/lib/party/usePartyConnection.ts` — WebSocket hook
- `app/lib/party/PartyContext.tsx` — React context provider

### Verification
- `cd app && npx tsc --noEmit` — PASSED ✓

## Task 7: Party Test Game (Question & Answer)

### Implementation Notes
- Server template at `api/src/party/templates/question-answer.ts` already existed from prior work; updated to use `qaPhase` (not `phase`) to avoid collision with `PartyRoomState.phase`, added `totalQuestions`, and serialized answers as `answersJson` string (not array) since `NetworkRuntimeSystem` only flattens primitive values from `sharedData`
- GameDefinition at `app/examples/party_test/definition.json` — pure JSON with overlay elements using `visibleWhen` expressions referencing `room.*` variables (set by NetworkRuntimeSystem from sharedData) and `role` variable
- Example entry at `app/examples/party_test/index.ts` — re-exports definition.json as typed `GameDefinition`
- Client script uses `onNetworkState` and `onPhaseChange` hooks to sync `room.*` variables into game variables

### Key Decisions
- Used `qaPhase` instead of `phase` for the Q&A-specific phase to avoid collision with the room-level `PartyRoomState.phase` (lobby/playing/ended)
- Answers serialized as JSON string (`answersJson`) since `sharedData` values must be primitives for NetworkRuntimeSystem to flatten them into `room.*` variables
- `visibleWhen` expressions use `role == 'host'` for host-only elements (role is set by NetworkRuntimeSystem)
- No physics entities needed — pure overlay-driven UI game

### Files Created/Modified
- `api/src/party/templates/question-answer.ts` — Updated server template
- `app/examples/party_test/definition.json` — GameDefinition with party config
- `app/examples/party_test/index.ts` — Example entry point

### Verification
- `cd api && npx tsc --noEmit` — PASSED ✓
- `cd app && npx tsc --noEmit` — PASSED ✓

## Task 9: Playwright E2E Test

### Implementation Notes
- Created `playwright.config.ts` at repo root with chromium project targeting `http://localhost:8085`
- Created `tests/e2e/party/question-answer.spec.ts` with 5 tests covering the full party flow
- Tests use direct WebSocket connections (not browser UI) since the party game UI requires Godot WASM rendering
- Test flow: create room via API → connect host WS → connect player WS → phase change → question broadcast → answer submission → answer forwarding verification
- Helper functions: `createRoom()`, `connectWebSocket()`, `waitForMessage()` with polling + timeout

### Key Decisions
- Used Node.js WebSocket (not browser page.evaluate) for WS connections — simpler and more reliable for protocol-level testing
- BDD-style Given/When/Then comments structure the main flow test for readability
- Host simulates the server template by sending state_update with question data (since `runQuestionAnswer` isn't wired into the DO yet)
- Screenshot taken by navigating to app root as evidence

### Blockers
- API server (port 8789) fails to start due to wrangler error: "PartyRoomDO is not exported in your entrypoint file" — despite being exported at `api/src/index.ts:368`. This is a pre-existing issue (none of the DOs extend the `DurableObject` base class, which newer wrangler versions may require)
- E2E tests cannot pass until the API server is running

### Files Created
- `playwright.config.ts` — Playwright configuration
- `tests/e2e/party/question-answer.spec.ts` — E2E test suite (5 tests)
- `.sisyphus/evidence/task-9-e2e.png` — Screenshot evidence

### Verification
- `npx playwright test --list` — Lists 5 tests correctly ✓
- `cd shared && npx tsc --noEmit` — PASSED ✓
- `cd api && npx tsc --noEmit` — PASSED ✓
- `cd app && npx tsc --noEmit` — PASSED ✓
- `pnpm test` — 1127 tests pass, 1 pre-existing failure (missing fixture file) ✓
- Playwright tests fail at `createRoom()` due to API server being down (pre-existing wrangler issue)

