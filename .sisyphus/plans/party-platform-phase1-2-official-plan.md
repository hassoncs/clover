# Party Platform Phase 1-2 Official Plan

## TL;DR

> **Objective**: Build reusable party-game platform primitives first (data + helpers + generic inputs), then use those primitives to rapidly author many games.
>
> **Immediate Scope**: Execute Phase 1 and Phase 2 now.
>
> **Deferred Scope**: Phase 3-4 captured separately in `.sisyphus/plans/party-platform-phase3-4-roadmap.md`.

---

## Context

### Request Summary
- Extract all generic/template-common logic from individual games.
- Build core platform data capabilities and reusable input systems.
- Reuse existing infrastructure; do not duplicate work.
- Complete Phase 1 + Phase 2 now.
- Preserve Phase 3 + 4 as scheduled deferred roadmap work.

### Verified Existing Foundation (Do Not Rebuild)
- `api/src/party/PartyRoomDO.ts`: room lifecycle, websocket sync, phase machine, `requestInput`, scoring, reconnect, rate limit.
- `app/lib/party/usePartyConnection.ts`: robust connection/reconnect hook, active input request handling.
- `app/components/party/`: reusable text/vote/timer/scoreboard primitives.
- `packages/content-pipeline/`: generation, moderation, storage, build-pack CLI.
- Audio and media infra already exists (ElevenLabs, mic capture, image pipeline).

### Key Gaps To Fill In Phase 1-2
- Shared template utility layer (currently duplicated in templates).
- Per-player messaging and per-player private state delivery.
- Subset input collection for asymmetric/judge/team mechanics.
- Reusable `DrawingInput` and `BuzzerInput` components.
- Generic phase-router architecture for game-specific UI mapping.
- Completion of missing content generation configs (fibbage/caption/wordgame).

---

## Work Objectives

### Core Objective
Create a reusable party-game platform layer that minimizes per-game custom code and prevents duplicate infrastructure work.

### Deliverables
- Shared template utility module and migration of existing templates.
- PartyRoomDO API enhancements (`sendToPlayer`, `requestInputFromSubset`).
- Client private-state wiring and reusable input components (drawing + buzzer).
- Generic game phase router pattern for player/host views.
- Content pipeline expansion for missing content families + bulk content generation.

### Definition of Done
- [ ] Existing templates (`quiplash`, `crowd-comedy`) run unchanged in behavior after utility extraction.
- [ ] Per-player private state can be sent from server and consumed in client context.
- [ ] Subset input request flow works for target-player-only prompts.
- [ ] Drawing and buzzer reusable components are integrated into party flow.
- [ ] Missing content generator configs are wired and output packs can be built.
- [ ] Bulk content inventory reaches target minimums (see Task 10 acceptance criteria).

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: YES (tests-after for this platform phase)
- **Framework**: existing project tests (`bun test`)

### Universal Verification Rule
- No manual-only acceptance. Every criterion must be command/tool verifiable.

### Shared Verification Commands
```bash
bun test api/src/party/__tests__/PartyRoomDO.test.ts
bun test api/src/party/templates/__tests__
pnpm content cli -- stats
```

---

## Execution Strategy (Phase 1-2)

### Wave A (Phase 1 foundation)
1. Extract shared template utilities.
2. Add generic content pack loader abstraction.
3. Add per-player send + private state protocol wiring.
4. Add reusable buzzer input.
5. Run bulk content generation for already-supported types.

### Wave B (Phase 2 core platform)
6. Add subset input request API.
7. Add reusable drawing input and integrate with party flow.
8. Generalize game phase rendering architecture.
9. Wire missing generation configs (fibbage/caption/wordgame).
10. Add template helper framework for new game authoring velocity.

---

## TODOs (Implementation + Verification)

- [x] 1. Extract shared template utility module
  - **What to do**:
    - Create `api/src/party/templates/utils.ts`.
    - Move duplicated helpers from `quiplash.ts` and `crowd-comedy.ts` (`shuffle`, `delay`, `startCountdown`, `buildScoreboard`, `generateId`).
    - Update templates to import utilities.
  - **References**:
    - `api/src/party/templates/quiplash.ts`
    - `api/src/party/templates/crowd-comedy.ts`
  - **Acceptance criteria**:
    - [ ] `bun test api/src/party/templates/__tests__/quiplash.test.ts` passes.
    - [ ] `bun test api/src/party/templates/__tests__/crowd-comedy.test.ts` passes.

- [x] 2. Add generic content loader abstraction
  - **What to do**:
    - Implement loader API for content packs by game/content type.
    - Remove hard-coupling to `quiplash-prompts.json` in templates where possible.
  - **References**:
    - `api/src/party/content/prompt-loader.ts`
    - `api/src/party/content/quiplash-prompts.json`
  - **Acceptance criteria**:
    - [ ] Existing templates load content through shared loader path.
    - [ ] No behavior regression in existing templates.

- [x] 3. Add `sendToPlayer` server capability
  - **What to do**:
    - Add player-targeted send method in `PartyRoomDO`.
    - Add protocol message for private-state updates.
  - **References**:
    - `api/src/party/PartyRoomDO.ts`
    - `api/src/party/protocol.ts`
    - `shared/src/types/party.ts`
  - **Acceptance criteria**:
    - [ ] PartyRoomDO tests include targeted-send coverage.
    - [ ] Non-target players do not receive private payloads.

- [ ] 4. Wire client `privateState` end-to-end
  - **What to do**:
    - Handle new private-state message in websocket client.
    - Populate context `privateState` in `usePartyConnection` + `PartyContext`.
  - **References**:
    - `app/lib/party/usePartyConnection.ts`
    - `app/lib/party/PartyContext.tsx`
  - **Acceptance criteria**:
    - [ ] Target player receives private data and context updates.
    - [ ] Other players' contexts remain unchanged.

- [x] 5. Add reusable `BuzzerInput` component
  - **What to do**:
    - Build reusable party buzzer input component.
    - Integrate into party play rendering for `type: buzzer`.
  - **References**:
    - `app/components/party/`
    - `app/app/party/play.tsx`
  - **Acceptance criteria**:
    - [ ] Buzzer request renders buzzer UI.
    - [ ] Press emits correct `input_response` payload.

- [ ] 6. Add `requestInputFromSubset` in PartyRoomDO
  - **What to do**:
    - Implement subset-targeted input request/collection.
    - Ensure collector expects only subset responses or timeout.
  - **References**:
    - `api/src/party/PartyRoomDO.ts`
  - **Acceptance criteria**:
    - [ ] Subset input request works with partial participant targeting.
    - [ ] Non-target players do not receive the request.

- [ ] 7. Build reusable `DrawingInput` from paint example
  - **What to do**:
    - Extract drawing mechanics into reusable component under `app/components/party/`.
    - Integrate with party input flow (`type: drawing`).
  - **References**:
    - `app/app/examples/paint.tsx`
    - `app/app/party/play.tsx`
  - **Acceptance criteria**:
    - [ ] Drawing request renders canvas and submit flow.
    - [ ] Drawing payload reaches server and is captured in collector.

- [ ] 8. Generalize phase-router for game-specific views
  - **What to do**:
    - Replace hardcoded phase view logic with game-template phase renderer map.
    - Apply to both player and host screens.
  - **References**:
    - `app/app/party/play.tsx`
    - `app/app/party/host.tsx`
  - **Acceptance criteria**:
    - [ ] Existing game renders continue to work.
    - [ ] New game can register phase renderer without editing giant switch blocks.

- [ ] 9. Wire missing generation configs in content pipeline
  - **What to do**:
    - Add generation prompt configs for `fibbage`, `caption`, `wordgame`.
  - **References**:
    - `packages/content-pipeline/src/generate/prompts.ts`
    - `packages/content-pipeline/src/types/index.ts`
  - **Acceptance criteria**:
    - [ ] CLI generate command supports new types without errors.
    - [ ] Output validates against schemas.

- [ ] 10. Bulk content generation baseline for reusable data layer
  - **What to do**:
    - Generate and moderate baseline packs:
      - quip >= 500
      - trivia >= 500
      - drawing >= 200
      - wyr >= 200
      - estimation >= 200
  - **References**:
    - `packages/content-pipeline/README.md`
    - `packages/content-pipeline/src/commands/generate.ts`
    - `packages/content-pipeline/src/commands/moderate.ts`
    - `packages/content-pipeline/src/commands/build-pack.ts`
  - **Acceptance criteria**:
    - [ ] `pnpm content cli -- stats` shows target counts.
    - [ ] Generated pack files exist and are consumable by templates.

- [ ] 11. Build template helper framework (authoring acceleration)
  - **What to do**:
    - Add composable helper flow for common game loops (ready check, rounds, voting, reveal, scores, winner).
  - **References**:
    - `api/src/party/templates/`
  - **Acceptance criteria**:
    - [ ] At least one existing template migrated to helper framework.
    - [ ] Migration reduces duplicate boilerplate.

---

## Deferred Work Link

All non-immediate work is preserved and scheduled in:

- `.sisyphus/plans/party-platform-phase3-4-roadmap.md`

This includes teams, audience role, bracket engine, hidden-role frameworks, private messaging expansion, concurrent editing, and advanced media/real-time systems.

---

## Success Criteria

- [ ] Phase 1 + Phase 2 platform work complete with automated verification.
- [ ] No duplicated generic logic remains in initial templates.
- [ ] Party platform supports per-player and subset-targeted mechanics.
- [ ] Reusable drawing and buzzer inputs are available for any future game.
- [ ] Data/content infrastructure is broad enough to support rapid game catalog expansion.
