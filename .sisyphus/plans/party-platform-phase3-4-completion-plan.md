# Party Platform Phase 3-4 Completion Plan

## TL;DR

> **Quick Summary**: Finish the party platform with a server-authoritative, reconnect-safe model across cloud server, host TV, and player devices using gameplay-state sync only (no full physics/entity mirroring).
>
> **Deliverables**:
> - Stable reconnect identity model for host and players
> - Canonical state contract and protocol versioning
> - Reconnect replay path for active prompts/private state
> - Script/runtime lifecycle safeguards (timeouts/TTL)
> - Integration and reconnection test coverage for 3 migrated games
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: 1 -> 2 -> 3 -> 5 -> 6 -> 8 -> 9

---

## Context

### Original Request
User requested moving/removing `party-platform-summary.md` from plans and creating one cohesive completion plan for all remaining party-platform work, including Phase 3-4 and cleanup.

### Interview Summary
**Key decisions**:
- MVP reconnect target: host and any player can disconnect/refresh/rejoin with same room code and recover same participation spot.
- State authority: cloud server is source of truth.
- Scope boundary: do **not** implement MMO-style full entity/physics mirroring in MVP.
- Sync target: only key gameplay state variables, prompts, scores, phases, and per-player private data.
- Protocol strategy: big-bang MVP protocol upgrade is allowed now; backward compatibility is not required pre-launch.

**Research findings incorporated**:
- `PartyRoomDO` persists room snapshot but has ephemeral collectors/runtime concerns.
- Host reconnection token path exists; player identity reclaim is incomplete.
- `usePartyConnection` reconnect loop exists; token/session handoff for players needs formalization.
- Protocol already supports `state_update`, `phase_change`, `input_request`, `input_response`, `private_state` but lacks explicit state versioning/replay semantics.

### Metis Review (Addressed)
- Missing guardrail on over-syncing was added (explicitly excluded).
- Missing reconnect identity contract was promoted to first-wave deliverable.
- Missing acceptance criteria for "exact same spot" was made explicit via reconnect scenario tests.
- Scope creep from optional advanced systems is gated behind explicit out-of-scope list.

---

## Work Objectives

### Core Objective
Deliver a production-ready party platform where server, host, and players maintain coherent gameplay continuity through disconnect/reconnect events, while keeping MVP architecture simple and phase-driven.

### Concrete Deliverables
- Reconnect identity/session contract (host + guest players)
- Canonical synchronized state schema with versioning
- Replay-safe reconnect path for active input and private state
- Runtime lifecycle controls for long-running server scripts
- End-to-end test matrix validating reconnect behavior and game flow

### Definition of Done
- [ ] Host reconnect recovers same host control session after refresh.
- [ ] Player reconnect recovers same player identity/seat after refresh.
- [ ] Active prompt is restored on reconnect when input window still open.
- [ ] `state_update` includes monotonic state version.
- [ ] Integration tests pass for quiplash, crowd-comedy, question-answer reconnect paths.
- [ ] No MVP path depends on full entity or physics snapshot mirroring.

### Must Have
- Server-authoritative state contract with minimal synchronized data.
- Guest-player support with reconnect-safe identity token strategy.
- Deterministic behavior for disconnect windows and server cleanup TTL.

### Must NOT Have (Guardrails)
- No generic "sync all entities" architecture in MVP.
- No client-authoritative game-state mutation model.
- No hidden manual-only verification steps.
- No protocol stagnation that blocks future product evolution.

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: YES (tests-after)
- **Framework**: Vitest + command/API-level integration checks

### Agent-Executed QA Scenarios Rule
All tasks include command/tool-verifiable outcomes; no user-only actions are accepted as completion criteria.

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Foundations): Tasks 1, 4
Wave 2 (Identity + State Contract): Tasks 2, 3, 5
Wave 3 (Reconnect Recovery + Runtime Safety): Tasks 6, 7
Wave 4 (Validation + Cleanup): Tasks 8, 9, 10

### Dependency Matrix

| Task | Depends On | Blocks |
|---|---|---|
| 1 | None | 2, 3, 6 |
| 2 | 1 | 6, 8 |
| 3 | 1 | 6, 8 |
| 4 | None | 5 |
| 5 | 4 | 6, 8 |
| 6 | 2, 3, 5 | 8, 9 |
| 7 | 1 | 9 |
| 8 | 2, 3, 5, 6 | 10 |
| 9 | 6, 7 | 10 |
| 10 | 8, 9 | None |

---

## TODOs

- [x] 1. Finalize MVP reconnect architecture contract (server/host/player)
  
  **What to do**:
  - Define canonical boundaries: durable, ephemeral, private, UI-derived state.
  - Define reconnect success semantics for host/player after refresh.
  - Encode explicit non-goal: no full entity/physics mirroring in MVP.

  **Must NOT do**:
  - Do not include advanced real-time generic state replication.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `agent-orchestration`, `auth-system`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 4)
  - **Blocks**: 2, 3, 6
  - **Blocked By**: None

  **References**:
  - `shared/src/types/party.ts` - Canonical room/player/input contracts.
  - `api/src/party/PartyRoomDO.ts` - Durable state and reconnect behavior source.
  - `app/lib/party/usePartyConnection.ts` - Client reconnect/retry behavior.

  **Acceptance Criteria**:
  - [ ] Contract doc section in plan is unambiguous for all three surfaces.
  - [ ] Explicit MVP exclusions list includes entity/physics mirroring.

- [ ] 2. Implement player reconnect identity reclaim flow

  **What to do**:
  - Add player reconnect token handshake (issue token, persist, return, reuse).
  - Ensure reconnect maps to existing `playerId` instead of creating a new one.
  - Keep host token flow compatible.

  **Must NOT do**:
  - Do not require full account auth for casual guests in MVP.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `auth-system`, `agent-orchestration`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with 3, 5)
  - **Blocks**: 6, 8
  - **Blocked By**: 1

  **References**:
  - `api/src/party/PartyRoomDO.ts` - Session storage and websocket upgrade path.
  - `api/src/party/protocol.ts` - Message additions/shape changes.
  - `app/lib/party/usePartyConnection.ts` - Reconnect query/token handling.

  **Acceptance Criteria**:
  - [ ] Player refresh rejoins same seat in <= reconnect window.
  - [ ] Duplicate "ghost player" entries no longer created for successful reclaim.

- [ ] 3. Define guest/auth session policy and storage lifecycle

  **What to do**:
  - Formalize host auth policy and guest player policy.
  - Define token TTL/cleanup and invalidation behavior.
  - Document security posture for room-scoped opaque tokens.

  **Must NOT do**:
  - Do not introduce cross-room reusable player tokens.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: `auth-system`, `storage-ops`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 6, 8
  - **Blocked By**: 1

  **References**:
  - `api/src/party/PartyRoomDO.ts` - Existing `session:*` storage keys.
  - `api/src/index.ts` - Room creation and token issuance path.

  **Acceptance Criteria**:
  - [ ] Policy defines host authenticated path + guest player path.
  - [ ] Token expiration aligns with room cleanup lifecycle.

- [x] 4. Establish canonical synchronized state schema (minimal gameplay state)

  **What to do**:
  - Define normalized keys in `sharedData` for phase/round/timer/view model.
  - Separate private per-player payloads from shared payloads.
  - Identify derived client-only fields (never synced).

  **Must NOT do**:
  - Do not embed private secrets inside broadcast shared state.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `agent-orchestration`, `testing-patterns`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 5
  - **Blocked By**: None

  **References**:
  - `shared/src/types/party.ts` - Types to tighten.
  - `app/lib/party/PartyContext.tsx` - Exposed client state model.
  - `app/lib/party/defaultPhases.tsx` - Current UI consumption pattern.

  **Acceptance Criteria**:
  - [ ] State contract clearly marks durable/ephemeral/private/derived fields.
  - [ ] Existing phase UIs can render from normalized schema.

- [ ] 5. Add state versioning and protocol compatibility safeguards

  **What to do**:
  - Add monotonic `stateVersion` on authoritative snapshots.
  - Perform big-bang protocol upgrade to the MVP contract (breaking changes allowed now).
  - Update server/client/message tests to match the new protocol surface.

  **Must NOT do**:
  - Do not preserve obsolete protocol paths solely for compatibility.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `agent-orchestration`, `testing-patterns`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 6, 8
  - **Blocked By**: 4

  **References**:
  - `api/src/party/protocol.ts` - Message constructors/parsers.
  - `api/src/party/__tests__/protocol.test.ts` - Existing round-trip coverage.

  **Acceptance Criteria**:
  - [ ] `state_update` carries a strictly increasing version.
  - [ ] Protocol tests validate only the new canonical MVP protocol.

- [ ] 6. Implement reconnect replay behavior for active gameplay context

  **What to do**:
  - On reconnect, send fresh room snapshot and restore active input request context.
  - Re-send targeted private state when required for current phase.
  - Define deterministic behavior if reconnect occurs near request timeout.

  **Must NOT do**:
  - Do not rely on client local cache as source of truth.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `agent-orchestration`, `testing-patterns`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: 8, 9
  - **Blocked By**: 2, 3, 5

  **References**:
  - `api/src/party/PartyRoomDO.ts` - Connect/disconnect/input collector flow.
  - `app/lib/party/usePartyConnection.ts` - Input request + reconnect state handling.

  **Acceptance Criteria**:
  - [ ] Reconnected player sees correct pending prompt when window remains open.
  - [ ] Reconnected host resumes control without room reset.

- [ ] 7. Add runtime timeout/TTL and cleanup policy hardening

  **What to do**:
  - Define room-level inactivity timeout and script execution timeout boundaries.
  - Ensure cleanup policy is explicit and test-covered.
  - Ensure long-lived stuck games terminate safely.

  **Must NOT do**:
  - Do not allow unbounded server script lifetime.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `storage-ops`, `agent-orchestration`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with 6)
  - **Blocks**: 9
  - **Blocked By**: 1

  **References**:
  - `api/src/party/PartyRoomDO.ts` - Alarm/cleanup/disconnect window constants.
  - `api/src/party/ServerScriptRunner.ts` - Script execution boundaries.

  **Acceptance Criteria**:
  - [ ] Timeout values and behavior are documented and enforced.
  - [ ] Expired rooms clear state/session keys deterministically.

- [ ] 8. Build reconnect integration test matrix (host + players)

  **What to do**:
  - Add integration tests for host refresh, player refresh, and mid-input reconnect.
  - Add negative cases for invalid/expired token reconnect attempts.
  - Verify no duplicate player seat on successful reconnect reclaim.

  **Must NOT do**:
  - Do not mark complete with unit-only coverage.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `testing-patterns`, `agent-orchestration`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4
  - **Blocks**: 10
  - **Blocked By**: 2, 3, 5, 6

  **References**:
  - `api/src/party/__tests__/PartyRoomDO.test.ts` - Existing reconnect/disconnect patterns.
  - `api/src/party/__tests__/PartyRoomDO.requestInputFromSubset.test.ts` - Input timing edge patterns.

  **Acceptance Criteria**:
  - [ ] Automated tests cover happy + failure reconnect scenarios.
  - [ ] Reconnect tests validate exact-seat restoration.

- [ ] 9. Add end-to-end game flow stability tests for migrated games

  **What to do**:
  - Add/expand R2 execution integration tests for quiplash, crowd-comedy, question-answer.
  - Validate reconnect within active rounds does not corrupt score/phase progression.

  **Must NOT do**:
  - Do not leave any migrated game without at least one reconnect-aware flow test.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `testing-patterns`, `game-validation`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with 8)
  - **Blocks**: 10
  - **Blocked By**: 6, 7

  **References**:
  - `api/src/party/templates/__tests__/registry-quiplash-r2.test.ts` - Existing baseline.
  - `r2/games/crowd-comedy/definition.json` - Target game script flow.
  - `r2/games/question-answer/definition.json` - Target game script flow.

  **Acceptance Criteria**:
  - [ ] All 3 games have reconnect-resilient automated flow tests.
  - [ ] Score and winner outcomes remain deterministic after reconnect events.

- [ ] 10. Cleanup, docs alignment, and production readiness gate

  **What to do**:
  - Remove/update legacy template-era failing tests.
  - Align docs and plan artifacts to new completion plan.
  - Run full verification command set and capture evidence.

  **Must NOT do**:
  - Do not leave contradictory docs/plans in active plans folder.

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: `testing-patterns`, `compound-docs`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Final
  - **Blocks**: None
  - **Blocked By**: 8, 9

  **References**:
  - `api/src/party/templates/__tests__/quiplash.test.ts` - Legacy candidate for delete/update.
  - `api/src/party/templates/__tests__/crowd-comedy.test.ts` - Legacy candidate for delete/update.
  - `.sisyphus/plans/party-platform-phase1-2-official-plan.md` - Completed baseline context.

  **Acceptance Criteria**:
  - [ ] No known legacy failing tests remain in active suite.
  - [ ] Verification commands pass and results are captured.

---

## Commit Strategy

| After Task Group | Message Pattern | Verification |
|---|---|---|
| 2-3 | `feat(party): add reconnect identity contract` | party tests + protocol tests |
| 4-6 | `feat(party): add versioned state sync and reconnect replay` | party tests + typecheck |
| 7-9 | `test(party): add reconnect and flow integration coverage` | full party test matrix |
| 10 | `chore(party): cleanup legacy tests and docs alignment` | full verification run |

---

## Success Criteria

### Verification Commands
```bash
# from api/
npx vitest run src/party/ --reporter=verbose
npx vitest run src/party/__tests__/protocol.test.ts --reporter=verbose
npx vitest run src/party/__tests__/PartyRoomDO.test.ts --reporter=verbose

# from repo root
npx tsc --noEmit --project api/tsconfig.json
```

### Final Checklist
- [ ] Host refresh/reconnect preserves control role and room continuity.
- [ ] Player refresh/reconnect restores same seat identity.
- [ ] No full entity/physics mirroring introduced for MVP.
- [ ] Reconnect reliability validated across all migrated party games.
- [ ] Cleanup/documentation consistency completed.
