/s# Party Game Live Announcer Prepare/Play API

## TL;DR

> **Quick Summary**: Add a minimal, script-friendly runtime voice API for party games: prepare a phrase, await readiness, then play from cache.
>
> **Deliverables**:
> - New scripting primitives for `prepareVoice`, readiness checks/waits, and `playVoice`
> - Runtime voice preparation/cache service (no queue DSL)
> - Integration with existing `/audio/generate-voice` backend
> - Deterministic behavior for round restart/cancel and in-flight dedupe
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Contract types -> runtime service -> sandbox wiring -> bridge playback -> tests

---

## Context

### Original Request
User wants party-game orchestration where each player enters phrases each round, and scripts can:
1) request generation for a phrase with announcer voice,
2) know when each phrase is ready/cached,
3) play prepared phrases later with the same settings,
with minimal pre-generation and simple API ergonomics.

### Interview Summary
**Key discussions**:
- User explicitly rejected a highly prescriptive queue orchestration API.
- Preferred primitives are `prepare phrase -> await ready -> play`.
- Caching should be automatic and transparent to script authors.
- Billing policy is noted but deferred.

**Research findings**:
- Voice generation already exists server-side (`api/src/routes/audio.ts`, `api/src/services/ElevenLabsService.ts`).
- Script sandbox currently exposes `playSound` only; no runtime voice prep (`app/lib/game-engine/systems/runner/wrappers/ScriptSandboxRuntimeSystem.ts`).
- Script hooks are sync; async work belongs in `worldAsync` (`app/lib/scripting/types.ts`).

### Metis Review
**Identified gaps addressed in this plan**:
- Define explicit readiness semantics and failure states.
- Lock down scope to simple primitives (no queue DSL, no custom voice upload).
- Add concurrency/dedupe rules for identical phrase requests.
- Add lifecycle behavior for round/game reset and sequence cancel.

---

## Work Objectives

### Core Objective
Provide a minimal scripting API that makes round-level announcer voice orchestration trivial for party games while preserving deterministic engine behavior and avoiding API bloat.

### Concrete Deliverables
- Script API contract additions for voice preparation/readiness/playback.
- Runtime `VoicePrepareService` for handle state, in-flight dedupe, and local cache mapping.
- Sandbox wiring to expose new APIs in script context.
- Audio bridge support to play prepared dynamic audio assets.
- Automated tests and agent-executed QA scenarios.

### Definition of Done
- [x] Script can prepare N phrases, await readiness, then play each by handle.
- [x] Identical phrase+voice requests dedupe in-flight generation.
- [x] Failed preparations surface deterministic status and do not crash scripts.
- [x] Round reset cancels/cleans pending handles per policy.
- [x] Type-check and tests pass.

### Must Have
- Simple primitives only: `prepareVoice`, `isVoiceReady`/`waitForVoices`, `playVoice`.
- Automatic caching and reusable handles in the same runtime session.
- Explicit status model (`pending | ready | failed | cancelled`).
- Readiness semantics: `ready` means generated + downloaded/resolved to immediately playable source on current runtime.
- Default playback semantics: calling `playVoice` on non-ready/failed handle is a safe no-op and emits a diagnostic event.

### Must NOT Have (Guardrails)
- No queue-specific orchestration DSL.
- No manual human verification in acceptance criteria.
- No broad audio system redesign unrelated to voice handles.
- No custom voice cloning/upload in MVP.

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> All tasks must be verifiable by agent-run commands or automation. No manual clicking/listening required for acceptance.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: YES (tests-after) *(default applied; can be switched to TDD later)*
- **Framework**: Vitest + existing TypeScript checks

### Agent-Executed QA Scenarios (MANDATORY)

Scenario: Prepare and play three phrases successfully
  Tool: Bash
  Preconditions: API running locally; test auth token available (`dev-token` in dev)
  Steps:
    1. Run targeted test command for voice prepare/play flow.
    2. Assert all tests pass and include multi-phrase case.
    3. Assert no unhandled promise rejection logs.
  Expected Result: Handles transition to ready and playback invocation succeeds in-order.
  Failure Indicators: timeout waiting for ready, handle missing, thrown playback error.
  Evidence: test stdout/stderr capture.

Scenario: Duplicate phrase requests dedupe in-flight generation
  Tool: Bash
  Preconditions: Unit test with mocked generation adapter and call counter
  Steps:
    1. Trigger two `prepareVoice` calls with identical cache key before first resolves.
    2. Assert generation adapter called exactly once.
    3. Assert both handles report ready when generation resolves.
  Expected Result: Single generation request, multiple consumers resolved.
  Failure Indicators: adapter call count > 1.
  Evidence: test assertion output.

Scenario: Generation failure handled safely
  Tool: Bash
  Preconditions: Mock backend returns error once
  Steps:
    1. Prepare voice for phrase that triggers mocked failure.
    2. Wait for completion status.
    3. Assert handle status is `failed` and error metadata set.
    4. Assert `playVoice` on failed handle is deterministic no-op (or explicit false return per contract).
  Expected Result: Runtime stays stable; script does not crash.
  Failure Indicators: exception escapes to frame loop.
  Evidence: test output and assertion trace.

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Start Immediately):
- Task 1: Contract design and type additions
- Task 2: Runtime voice prepare/cache service scaffold

Wave 2 (After Wave 1):
- Task 3: Sandbox/context wiring
- Task 4: API adapter and voice preset mapping integration

Wave 3 (After Wave 2):
- Task 5: Bridge playback path for prepared dynamic audio
- Task 6: Tests and QA automation
- Task 7: Docs + sample usage snippet

Critical Path: 1 -> 3 -> 5 -> 6

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|----------------------|
| 1 | None | 3, 4, 6 | 2 |
| 2 | None | 3, 4, 6 | 1 |
| 3 | 1, 2 | 5, 6 | 4 |
| 4 | 1, 2 | 6 | 3 |
| 5 | 3 | 6 | 4 |
| 6 | 1,2,3,4,5 | 7 | None |
| 7 | 6 | None | None |

---

## TODOs

- [x] 1. Define minimal voice-handle scripting contract

  **What to do**:
  - Add shared/runtime types for `VoiceHandleId`, `VoicePrepareStatus`, and `VoicePrepareOptions`.
  - Add scripting surface matching user preference:
    - `prepareVoice(voicePreset, text, opts?) -> handleId`
    - `isVoiceReady(handleId) -> boolean`
    - `playVoice(handleId, opts?)`
    - `worldAsync.waitForVoices(handleIds, opts?) -> Promise<WaitResult>`
  - Define deterministic behavior for not-ready/failed handles.

  **Must NOT do**:
  - Add queue DSL APIs.
  - Add unrelated audio controls beyond this flow.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small but critical API contract changes across shared types.
  - **Skills**: [`game-authoring/scripting-api-reference`, `ecs-architecture`]
    - `game-authoring/scripting-api-reference`: align script API shape with existing context expectations.
    - `ecs-architecture`: preserve world/system contract boundaries.
  - **Skills Evaluated but Omitted**:
    - `sound-generation`: not required for pure contract typing.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: 3, 4, 6
  - **Blocked By**: None

  **References**:
  - `app/lib/scripting/types.ts:37` - canonical `ScriptContext` shape to extend safely.
  - `shared/src/types/world-ops.ts:84` - world operations conventions and naming style.
  - `shared/src/scripting/script-authoring-types.ts:21` - script authoring contract expectations.

  **Acceptance Criteria**:
  - [ ] New type definitions compile under `pnpm -r type-check` (or project equivalent).
  - [ ] API signatures exist and are discoverable from script-facing types.
  - [ ] Contract documents not-ready and failed playback behavior.

- [x] 2. Implement `VoicePrepareService` with caching and in-flight dedupe

  **What to do**:
  - Create service managing handle lifecycle states.
  - Cache key default: `(voicePreset + normalizedText + voiceOptions)`.
  - Deduplicate concurrent prepares for identical key.
  - Expose methods: `prepare`, `getStatus`, `awaitMany`, `getPlayableAsset`, `cancelByScope`.

  **Must NOT do**:
  - Persist cache beyond runtime session in MVP.
  - Add billing policy branching.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: state machine + concurrency edge cases.
  - **Skills**: [`sound-generation`, `testing-patterns`]
    - `sound-generation`: align with existing audio generation pipeline patterns.
    - `testing-patterns`: build deterministic tests for race conditions.
  - **Skills Evaluated but Omitted**:
    - `agent-orchestration`: not needed for runtime service internals.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: 3, 4, 6
  - **Blocked By**: None

  **References**:
  - `api/src/routes/audio.ts:124` - existing voice generation route contract and response shape.
  - `api/src/services/ElevenLabsService.ts:115` - generation options and defaults to mirror.
  - `shared/src/constants/voice-presets.ts:8` - canonical preset IDs and metadata.

  **Acceptance Criteria**:
  - [ ] Service transitions: pending -> ready|failed|cancelled are covered by tests.
  - [ ] Duplicate prepare requests produce one backend generation call.
  - [ ] `waitForVoices` returns deterministic aggregate result under mixed outcomes.

- [x] 3. Wire voice APIs into script sandbox runtime context

  **What to do**:
  - Extend `createScriptContext` to expose new voice primitives.
  - Keep hooks sync-safe: `prepareVoice` returns immediately.
  - Add async waiting path only via `worldAsync.waitForVoices`.
  - Scope cancellation/cleanup on game reset or runtime teardown.

  **Must NOT do**:
  - Block frame loop while waiting for generation.
  - Introduce async return from script lifecycle hooks.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: touches central runtime wrapper with high stability sensitivity.
  - **Skills**: [`ecs-architecture`, `game-authoring/scripting-api-reference`]
    - `ecs-architecture`: preserve runner/system invariants.
    - `game-authoring/scripting-api-reference`: maintain script ergonomics and compatibility.
  - **Skills Evaluated but Omitted**:
    - `physics`: no physics behavior changes.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 4)
  - **Blocks**: 5, 6
  - **Blocked By**: 1, 2

  **References**:
  - `app/lib/game-engine/systems/runner/wrappers/ScriptSandboxRuntimeSystem.ts:975` - context construction location.
  - `app/lib/game-engine/systems/runner/wrappers/ScriptSandboxRuntimeSystem.ts:1089` - current `worldAsync` shape to extend.
  - `app/lib/game-engine/systems/runner/wrappers/ScriptSandboxRuntimeSystem.ts:1371` - existing sync `playSound` pattern.
  - `app/lib/scripting/types.ts:85` - lifecycle hooks are void/sync only.

  **Acceptance Criteria**:
  - [ ] New methods are present on runtime context and callable from scripts.
  - [ ] Script hooks remain sync and pass existing sandbox constraints.
  - [ ] Runtime teardown clears pending voice state safely.

- [x] 4. Add generation adapter using existing backend route and preset mapping

  **What to do**:
  - Implement adapter call path for voice generation requests.
  - Use existing `/audio/generate-voice` semantics and preset-to-voiceId mapping.
  - Normalize request options to stable cache key.
  - Capture metadata for future billing attribution hooks (no policy logic).

  **Must NOT do**:
  - Introduce a new public API route for MVP if existing route suffices.
  - Change existing auth/billing contracts in this task.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: adapter/wiring work with existing backend surface.
  - **Skills**: [`sound-generation`, `storage-ops`]
    - `sound-generation`: reuse established voice generation integration.
    - `storage-ops`: preserve asset URL and metadata handling patterns.
  - **Skills Evaluated but Omitted**:
    - `agent-orchestration`: not part of runtime voice adapter path.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: 6
  - **Blocked By**: 1, 2

  **References**:
  - `api/src/routes/audio.ts:124` - `/generate-voice` input/output contract.
  - `api/src/routes/audio.ts:175` - generation tracking call site.
  - `shared/src/constants/voice-presets.ts:21` - announcer preset default support.

  **Acceptance Criteria**:
  - [ ] Adapter successfully returns playable asset info for valid prepare requests.
  - [ ] Adapter surfaces backend failures into handle `failed` status.
  - [ ] Cache key includes voice preset and text deterministically.

- [x] 5. Implement playback path for prepared dynamic audio handles

  **What to do**:
  - Add/extend bridge playback path to play prepared dynamic voice assets.
  - Ensure `playVoice(handle)` resolves to playable source expected by runtime bridge.
  - Keep existing `playSound` behavior unchanged for static resources.

  **Must NOT do**:
  - Break existing sound effect playback semantics.
  - Require manual asset registration by scripts.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: bridge/runtime/audio boundary changes.
  - **Skills**: [`bridge-development`, `godot-engine`]
    - `bridge-development`: safe TS<->Godot method wiring.
    - `godot-engine`: ensure playback path aligns with Godot runtime expectations.
  - **Skills Evaluated but Omitted**:
    - `native-infrastructure`: no build-pipeline changes expected.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 3)
  - **Blocks**: 6
  - **Blocked By**: 3

  **References**:
  - `app/lib/game-engine/systems/runner/wrappers/ScriptSandboxRuntimeSystem.ts:1371` - current bridge sound call path.
  - `app/lib/godot/GodotBridge.native.ts` - native playback bridge methods.
  - `app/lib/godot/GodotBridge.web.ts` - web playback bridge methods.
  - `godot_project/scripts/bridge/UIManager.gd` - Godot-side `play_sound` handler.

  **Acceptance Criteria**:
  - [ ] Prepared handle playback invokes correct bridge path on supported platforms.
  - [ ] Not-ready handle playback follows documented deterministic behavior.
  - [ ] Existing static `playSound` scripts remain functional in regression test.

- [x] 6. Add automated tests for prepare/wait/play flow and edge cases

  **What to do**:
  - Add unit tests for service state transitions and dedupe.
  - Add integration tests for sandbox API exposure and round flow.
  - Add regression tests for cancellation/reset behavior.

  **Must NOT do**:
  - Depend on manual listening as verification.
  - Leave race conditions untested.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: test-first validation and targeted assertions.
  - **Skills**: [`testing-patterns`, `verification-before-completion`]
    - `testing-patterns`: match repo testing conventions.
    - `verification-before-completion`: enforce evidence-backed completion.
  - **Skills Evaluated but Omitted**:
    - `editor-browser-testing`: browser UI not required for core runtime verification.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 3)
  - **Blocks**: 7
  - **Blocked By**: 1,2,3,4,5

  **References**:
  - `app/lib/game-engine/SequenceManager.integration.test.ts` - async sequence testing patterns.
  - `app/lib/game-engine/WorldOpsImpl.test.ts` - world ops test style.
  - `api/src/routes/audio.ts:124` - integration mock/contract target.

  **Acceptance Criteria**:
  - [ ] `pnpm -r type-check` passes.
  - [ ] Targeted unit/integration test command passes with zero failures.
  - [ ] Tests explicitly cover ready, failed, cancelled, and dedupe paths.

- [x] 7. Add script-author usage docs and example snippet for party rounds

  **What to do**:
  - Document the minimal flow in scripting docs/examples.
  - Include example: collect phrases -> prepare -> wait -> play by index.
  - Document readiness/failure semantics and cleanup behavior.

  **Must NOT do**:
  - Introduce unrelated docs changes.

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: API ergonomics and behavior clarity for script authors.
  - **Skills**: [`game-authoring/scripting-api-reference`, `compound-docs`]
    - `game-authoring/scripting-api-reference`: align with script authoring docs style.
    - `compound-docs`: structured capture of decisions and usage guidance.
  - **Skills Evaluated but Omitted**:
    - `every-style-editor`: not needed for this technical documentation style.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (final)
  - **Blocks**: None
  - **Blocked By**: 6

  **References**:
  - `docs/INDEX.md` - docs placement and cross-link conventions.
  - `shared/src/scripting/script-authoring-types.ts:21` - script API wording anchor.

  **Acceptance Criteria**:
  - [ ] Docs include concrete prepare/wait/play snippet with announcer preset.
  - [ ] Docs describe failure and readiness semantics unambiguously.

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|-------------|
| 1-2 | `feat(scripting): add voice prepare/play contracts and runtime cache service` | shared + app runtime types/service | type-check + unit tests |
| 3-5 | `feat(audio): wire sandbox voice handles to generation and playback bridge` | sandbox/runtime/bridge | integration tests |
| 6-7 | `test(docs): cover voice handle edge cases and add party-round usage docs` | tests + docs | full test run + type-check |

---

## Success Criteria

### Verification Commands

```bash
pnpm -r type-check
pnpm -r test -- --runInBand
```

### Final Checklist
- [x] All Must Have requirements implemented.
- [x] All Must NOT Have exclusions respected.
- [x] Automated tests and type-check pass.
- [x] Party round flow works with prepare -> wait -> play semantics.
