# Universal Serializable State Model for Party Games

## TL;DR

> **Quick Summary**: Keep the current broadcasted `sharedData` flow for client-visible state, add a new persisted server-only state bag for secrets and resume bookkeeping, and formalize per-player private delivery. This gives save/restore durability across DO eviction without VM snapshot complexity.
>
> **Deliverables**:
> - Dual-lane persisted state model (public + server-only)
> - Clear script API naming that AI can infer without docs
> - Resume-safe lifecycle for DO restart and long-horizon games
> - Migration + verification across existing party games
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: API model + DO persistence -> QuickJS exposure -> script migration + verification

---

## Context

### Original Request
Design a complete, future-proof but simple state architecture for party games that supports save/restore over long time horizons, with self-documenting naming and clear privacy boundaries.

### Interview Summary
**Key Discussions**:
- Existing system already persists `phase`, `players`, and `sharedData` to Durable Object storage.
- `sharedData` is broadcast to all clients; this is not enough for hidden information (deck order, secret answers, per-player hidden content).
- User wants clean organization by scope, not replay/VM snapshot complexity.
- Naming must be self-documenting so AI places state in correct lane without extra documentation.

**Research Findings**:
- QuickJS runtime snapshot/resume is not practical in this stack.
- DO storage survives eviction; in-memory runtime does not.
- Existing scripts are linear async flows and can resume from persisted canonical state if designed correctly.
- Current transport already supports targeted per-player private messages (`sendToPlayer` + `private_state`).

### Metis/Oracle/Librarian Gap Review
**Identified Gaps (addressed in this plan)**:
- Ambiguity of "private" scope (private-to-server vs private-to-player) -> explicit multi-scope taxonomy.
- Leakage risk from accidental secret writes to broadcast path -> strict naming + guardrails + test checks.
- Reconnect behavior for private per-player state not explicitly modeled -> defined as phased behavior (v1 ephemeral, v2 optional persisted per-player bag).
- Scope creep risk into anti-cheat/full projection engine -> locked out of v1 scope.

---

## Work Objectives

### Core Objective
Implement a universal state model that cleanly separates client-visible state, server-only persisted state, and per-player private delivery, while preserving existing behavior and enabling durable resume after DO eviction.

### Concrete Deliverables
- `PartyRoomDO` supports persisted `serverState` alongside existing `sharedData`.
- `QuickJSServerRunner` exposes self-documenting APIs for public/server state lanes.
- Existing script interface remains backward-compatible (`updateSharedData` still works).
- Resume path on DO restart executes scripts with restored persisted state.
- Existing party templates validated to avoid secret leakage into public broadcast lane.

### Definition of Done
- [ ] Public state updates continue to broadcast to all clients and persist across DO restart.
- [ ] Server-only state persists across DO restart and never appears in client `state_update` payloads.
- [ ] Existing games run without modification under compatibility aliases.
- [ ] At least one game flow demonstrates resumed execution using restored server state.
- [ ] Tests and agent-executed QA scenarios pass.

### Must Have
- Dual persisted state lanes with explicit naming:
  - Public lane: broadcasted + persisted
  - Server lane: persisted only, never broadcasted
- Per-player private messaging preserved and clearly scoped as delivery channel.
- Backward compatibility for current script API.

### Must NOT Have (Guardrails)
- No VM snapshot/replay engine in v1.
- No introduction of additional state scopes (team/admin/audience) in v1.
- No schema explosion or generalized ACL framework.
- No breaking rename that forces all existing scripts to migrate immediately.

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> All verification must be agent-executable. No manual user testing steps are allowed in acceptance criteria.

### Test Decision
- **Infrastructure exists**: YES (`api/vitest.config.ts` workers pool)
- **Automated tests**: YES (Tests-after)
- **Framework**: Vitest (Cloudflare workers pool)

### Agent-Executed QA Scenarios (MANDATORY)

Scenario: Public state broadcasts and persists
  Tool: Bash (vitest)
  Preconditions: API test environment available
  Steps:
    1. Run the party DO test that updates public state and asserts broadcast payload
    2. Restart/recreate DO test context
    3. Load room state and assert previous public values exist
  Expected Result: Public state remains visible and persisted
  Failure Indicators: Missing values after reload, no broadcast payload
  Evidence: Vitest output log

Scenario: Server state persists but is never broadcast
  Tool: Bash (vitest)
  Preconditions: Test creates room and writes server state
  Steps:
    1. Write `serverState.secretKey = "value"`
    2. Trigger broadcast-producing event
    3. Assert outgoing `state_update` payload does not contain `secretKey`
    4. Restart/reload and assert `serverState.secretKey` exists in storage-backed state
  Expected Result: Secret key survives persistence and is absent from public payload
  Failure Indicators: Secret key present in broadcast, or missing after reload
  Evidence: Serialized outgoing message assertion + storage assertion output

Scenario: Per-player private channel remains scoped
  Tool: Bash (vitest)
  Preconditions: Test room with multiple connected player sockets
  Steps:
    1. Call `sendToPlayer(playerA, { card: "AS" })`
    2. Assert only player A socket receives `private_state`
    3. Assert player B socket receives no equivalent message
  Expected Result: Private payload is delivered only to target player
  Failure Indicators: Message appears on non-target socket
  Evidence: Socket message capture assertions

Scenario: Backward compatibility alias works
  Tool: Bash (vitest)
  Preconditions: Existing script using `room.updateSharedData`
  Steps:
    1. Execute script through `QuickJSServerRunner`
    2. Assert data appears in public state as before
  Expected Result: Existing scripts pass without edits
  Failure Indicators: Existing script fails or state missing
  Evidence: Runner test output

Scenario: Resume from persisted server state
  Tool: Bash (vitest)
  Preconditions: Script writes progress marker to server state, DO test simulates restart
  Steps:
    1. Run script phase until marker written (e.g., `round = 3`)
    2. Reinitialize DO from storage
    3. Re-run start path and assert script sees restored marker and continues from expected stage
  Expected Result: Resume uses stored server state rather than reinitializing
  Failure Indicators: Script resets to initial state
  Evidence: State assertions + runner execution logs

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Start Immediately):
- Task 1: State taxonomy and API naming contract
- Task 2: Persistence model update in DO (add `serverState` storage lane)

Wave 2 (After Wave 1):
- Task 3: QuickJS API exposure + compatibility aliases
- Task 4: Broadcast leak prevention checks + payload tests

Wave 3 (After Wave 2):
- Task 5: Resume lifecycle path + integration tests
- Task 6: Script migration audit and examples

Critical Path: Task 1 -> Task 2 -> Task 3 -> Task 5
Parallel Speedup: ~35-40% vs fully sequential

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3, 6 | 2 |
| 2 | 1 | 3, 5 | 1 |
| 3 | 1, 2 | 4, 5 | None |
| 4 | 3 | 6 | 5 (partially) |
| 5 | 2, 3 | Done criteria | 4 |
| 6 | 1, 4 | Done criteria | 5 |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2 | quick / unspecified-low with `workspace-system`, `agent-orchestration` |
| 2 | 3, 4 | quick / unspecified-high with `agent-orchestration`, `testing-patterns` |
| 3 | 5, 6 | unspecified-high with `testing-patterns`, `game-authoring` |

---

## TODOs

- [ ] 1. Define final state scope contract and self-documenting names

  **What to do**:
  - Lock v1 scopes and names:
    - Public persisted + broadcast lane: `publicState` API (compat alias from existing sharedData flow)
    - Server-only persisted lane: `serverState`
    - Per-player private delivery: existing `sendToPlayer`/`private_state`
  - Define explicit access rules and transport rules in code-level comments/types.

  **Must NOT do**:
  - Introduce additional scopes in v1.
  - Break existing `updateSharedData` scripts.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: bounded API contract work with low implementation complexity.
  - **Skills**: [`agent-orchestration`, `workspace-system`]
    - `agent-orchestration`: messaging semantics and state channels.
    - `workspace-system`: safe interface evolution across API surface.
  - **Skills Evaluated but Omitted**:
    - `ultrabrain`: unnecessary for this bounded contract decision.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: 2, 3, 6
  - **Blocked By**: None

  **References**:
  - `api/src/party/PartyRoomDO.ts` - current persistence and broadcast flow.
  - `api/src/party/QuickJSServerRunner.ts` - script-facing room API surface.
  - `api/src/party/templates/registry.ts` - template execution path and config flow.
  - `@slopcade/shared/types/party` imports in runner/DO - state message contracts.

  **Acceptance Criteria**:
  - [ ] State scope contract documented in plan-linked implementation notes.
  - [ ] Final names chosen and reflected in function/type signatures.
  - [ ] Compatibility alias strategy defined.

  **Commit**: NO

- [ ] 2. Add persisted `serverState` to Durable Object storage lifecycle

  **What to do**:
  - Extend DO in-memory model with `serverState` bag.
  - Persist/load it in `saveState()`/`loadState()` adjacent to current `sharedData`.
  - Ensure state versioning and migration defaults (`serverState = {}` when absent).

  **Must NOT do**:
  - Include `serverState` in client `buildRoomState()` payload.
  - Add non-JSON structures to persisted shape.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: single-file bounded persistence extension.
  - **Skills**: [`storage-ops`, `agent-orchestration`]
    - `storage-ops`: durable storage shape evolution.
    - `agent-orchestration`: keep message boundaries correct.
  - **Skills Evaluated but Omitted**:
    - `native-infrastructure`: not relevant to DO storage changes.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 3, 5
  - **Blocked By**: 1

  **References**:
  - `api/src/party/PartyRoomDO.ts` - `saveState`, `loadState`, `buildRoomState`.

  **Acceptance Criteria**:
  - [ ] Restart test shows `serverState` survives DO rehydrate.
  - [ ] Public room payload remains unchanged by server state writes.

  **Commit**: YES
  - Message: `feat(party): persist server-only state in room storage`

- [ ] 3. Expose state-lane APIs in QuickJS room interface with compatibility aliases

  **What to do**:
  - Add script APIs for server-only state read/write.
  - Maintain existing public update API (`updateSharedData`) and add clear alias naming (`updatePublicState`) to aid AI codegen.
  - Wire both through async bridge in `QuickJSServerRunner`.

  **Must NOT do**:
  - Remove existing APIs in v1.
  - Introduce silent behavior divergence between alias and canonical path.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: interface + sandbox wiring + compatibility semantics.
  - **Skills**: [`agent-orchestration`, `ai-game-generation`]
    - `agent-orchestration`: robust tool-bridge API design.
    - `ai-game-generation`: optimize API clarity for AI-authored scripts.
  - **Skills Evaluated but Omitted**:
    - `effects-system`: unrelated domain.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: 4, 5
  - **Blocked By**: 1, 2

  **References**:
  - `api/src/party/QuickJSServerRunner.ts` - `RoomAPI`, `setupRoomAPI`, async bridge helpers.
  - `api/src/party/PartyRoomDO.ts` - server methods to invoke from runner.

  **Acceptance Criteria**:
  - [ ] Script can read/write server-only state through new APIs.
  - [ ] Existing scripts using `updateSharedData` still execute successfully.
  - [ ] Alias API behaves identically to canonical API.

  **Commit**: YES
  - Message: `feat(party): add public/server state APIs to quickjs room`

- [ ] 4. Add leak-prevention and transport boundary tests

  **What to do**:
  - Add tests asserting `serverState` never appears in `state_update` messages.
  - Add tests confirming per-player `private_state` remains targeted.
  - Add regression guard against accidental serialization of secret lane.

  **Must NOT do**:
  - Rely on manual packet inspection.
  - Leave transport boundaries untested.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: focused test additions.
  - **Skills**: [`testing-patterns`, `agent-orchestration`]
    - `testing-patterns`: durable regression tests.
    - `agent-orchestration`: message-shape assertions.
  - **Skills Evaluated but Omitted**:
    - `game-authoring`: not needed for transport tests.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: 6
  - **Blocked By**: 3

  **References**:
  - `api/src/party/PartyRoomDO.ts` - `broadcastToAll`, `sendToPlayer`, `buildRoomState`.
  - Existing party tests under `api/src/party/__tests__/` - assertion patterns.

  **Acceptance Criteria**:
  - [ ] Tests fail if `serverState` leaks into broadcast payload.
  - [ ] Tests fail if private payload is visible to non-target player.

  **Commit**: YES
  - Message: `test(party): enforce public vs server state boundaries`

- [ ] 5. Implement DO restart/resume lifecycle using persisted state

  **What to do**:
  - On restart/re-entry while phase is active, execute template/script with restored persisted state context.
  - Ensure scripts can branch on restored state markers and continue.
  - Validate no duplicate side-effects on resume startup path.

  **Must NOT do**:
  - Attempt VM-level continuation or stack restore.
  - Block startup waiting on unavailable ephemeral collectors.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: lifecycle correctness and idempotency concerns.
  - **Skills**: [`agent-orchestration`, `workspace-system`, `testing-patterns`]
    - `agent-orchestration`: lifecycle and state coordination.
    - `workspace-system`: robust service-level restart path.
    - `testing-patterns`: restart/resume verification.
  - **Skills Evaluated but Omitted**:
    - `ultrabrain`: not necessary with bounded lifecycle model.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: final success criteria
  - **Blocked By**: 2, 3

  **References**:
  - `api/src/party/PartyRoomDO.ts` - startup, `handleStartGame`, `loadState`.
  - `api/src/party/templates/registry.ts` - template execution entrypoint.

  **Acceptance Criteria**:
  - [ ] Restart scenario resumes from persisted marker instead of full reset.
  - [ ] No secret data is broadcast during resume.

  **Commit**: YES
  - Message: `feat(party): add resume-safe lifecycle from persisted room state`

- [ ] 6. Migration audit for existing games and AI-authoring guidance defaults

  **What to do**:
  - Audit current party scripts for secret state currently in public lane.
  - Move obvious secret/internal values to server lane where needed.
  - Add concise script-author guidance snippet in relevant code reference (not broad docs churn).

  **Must NOT do**:
  - Rewrite all game scripts unnecessarily.
  - Expand to anti-cheat policy framework.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: targeted script and guidance cleanup.
  - **Skills**: [`game-authoring`, `ai-game-generation`]
    - `game-authoring`: practical script updates.
    - `ai-game-generation`: default conventions for generated scripts.
  - **Skills Evaluated but Omitted**:
    - `writing`: overkill for small embedded guidance.

  **Parallelization**:
  - **Can Run In Parallel**: YES (partially)
  - **Parallel Group**: Wave 3 (with Task 5)
  - **Blocks**: final polish only
  - **Blocked By**: 1, 4

  **References**:
  - `r2/games/chroma-clues/scripts/server.js`
  - `r2/games/spectrum-guess/scripts/server.js`
  - `r2/games/truth-trap/scripts/server.js`
  - `r2/games/punchline-duel/scripts/server.js`

  **Acceptance Criteria**:
  - [ ] At least one representative script uses server lane for hidden data.
  - [ ] Guidance exists in code-adjacent location for AI/human authors.

  **Commit**: YES
  - Message: `refactor(party): migrate hidden script state to server-only lane`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 2 | `feat(party): persist server-only state in room storage` | `api/src/party/PartyRoomDO.ts` | `cd api && npx vitest run src/party/**` (targeted) |
| 3 | `feat(party): add public/server state APIs to quickjs room` | `api/src/party/QuickJSServerRunner.ts`, DO wiring | runner tests |
| 4 | `test(party): enforce public vs server state boundaries` | party tests | targeted vitest |
| 5 | `feat(party): add resume-safe lifecycle from persisted room state` | DO + registry/tests | targeted vitest + lifecycle tests |
| 6 | `refactor(party): migrate hidden script state to server-only lane` | selected game scripts | relevant script tests/e2e |

---

## Success Criteria

### Verification Commands
```bash
cd api && npx vitest run src/party/__tests__/QuickJSServerRunner.test.ts
# Expected: pass

cd api && npx vitest run src/party/__tests__/chroma-clues.test.ts
# Expected: pass

cd api && npx vitest run src/party/__tests__
# Expected: no regressions in party room/message boundary tests
```

### Final Checklist
- [ ] Public lane remains the only broadcasted state bag.
- [ ] Server lane persists and survives DO restart.
- [ ] No server lane leakage in any client-visible payload.
- [ ] Private per-player messaging remains correctly scoped.
- [ ] Existing scripts keep working via compatibility APIs.
- [ ] Resume behavior validated for long-horizon gameplay.
- [ ] Zero acceptance criteria require human intervention.

