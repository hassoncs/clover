# Web input `targetEntityId` fix + cross-platform input/zone cleanup

## Context

### User request summary
- **Immediate**: Fix web tap events so they include `targetEntityId` (currently missing, breaking games like ball-sort that tap zone entities).
- **Comprehensive**: Clean up/refactor the input + zone system to be:
  - understandable for AI coding bots,
  - consistent across web + native,
  - free of confusing redundancies/inefficiencies,
  - well-documented.

### Relevant code facts (verified by file reads)
- Godot **does** include an entity id in web input events:
  - `godot_project/scripts/GameBridge.gd:177-247` emits JSON `{type,x,y,entityId}` and calls `_notify_js_input_event(type,x,y,entityId)`.
  - `godot_project/scripts/GameBridge.gd:817-827` serializes `{ type, x, y, entityId }`.
- Web TS bridge **parses** `entityId` and forwards it to callbacks:
  - `app/lib/godot/GodotBridge.web.ts:364-374` parses input JSON and calls callback `(type,x,y,entityId)`.
- Web runtime **drops** the `entityId` on the Godot-input path:
  - `app/lib/game-engine/GameRuntime.godot.tsx:589-606` registers `bridge.onInputEvent((type,x,y,_entityId)=>...)` and on tap sets `inputRef.current.tap` **without** `targetEntityId`.
- There is a *second* web click path that resolves `targetEntityId` via `bridge.queryPointEntity(world)`:
  - `app/lib/game-engine/GameRuntime.godot.tsx:1333-1350` sets `tap.targetEntityId` from query.
- Native input path resolves `targetEntityId` at touch start and carries it into tap:
  - `app/lib/game-engine/hooks/useGameInput.ts:50-109` uses `physics.queryPoint(worldPos)` then maps bodyId→entityId.
  - `app/lib/game-engine/hooks/useGameInput.ts:150-176` sets `tap.targetEntityId` from the dragStart value.
- Zones are created as sensor fixtures, but still get `bodyId` + `colliderId`:
  - `app/lib/game-engine/EntityManager.ts:408-432` sets `userData: { entityId, isZone: true }`, creates body + sensor fixture.
- Rules already assume `targetEntityId` exists for tap targeting:
  - `app/lib/game-engine/rules/triggers/InputTriggerEvaluator.ts:33-54` checks `tap.targetEntityId` and falls back to “find entity with tag at point”.
  - `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts:195-206` parses `tap.targetEntityId` to select a tube sensor.

### Risks / “Metis-style” gaps to explicitly guard against
- **Dual web tap sources** (Godot `_notify_js_input_event` vs DOM click→`queryPointEntity`) can fight each other, causing nondeterministic `targetEntityId` and making debugging impossible.
- **Zone hit-testing differences** across platforms (native `queryPoint` might not include sensors; web query does include areas) can lead to inconsistent behavior.
- **Trigger fallback logic** (`InputTriggerEvaluator.findEntityWithTagAtPoint`) appears to only consider `entity.physics` shapes, not `zone.shape`, so it may not reliably target zones.

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| 1. Fix web `targetEntityId` propagation (Godot input path) | None | Direct bug fix, unblocks game correctness and later refactors |
| 2. Add regression tests for tap targeting (incl. zone entity) | 1 | Tests should encode the corrected behavior |
| 3. Decide “single source of truth” for web tap events | 1 | Must first make the existing path correct before choosing consolidation |
| 4. Consolidate web tap handling into one pipeline | 3 | Implementation depends on decision of which path to keep |
| 5. Align zone hit-testing semantics across platforms | 4 | Requires knowing the unified pipeline contract |
| 6. Update/extend trigger fallback hit-testing to support zones | 5 | Needs clarified semantics + data available at runtime |
| 7. Documentation: input + zones architecture, invariants, troubleshooting | 4, 5, 6 | Docs should reflect the final shape of the system |
| 8. Add a minimal “AI bot guide” + diagrams for related files | 7 | Built on top of the architecture doc |

---

## Parallel Execution Graph

Wave 1 (Start immediately):
├── Task 1: Fix web `targetEntityId` propagation
└── Task 2 (prep): Identify existing test patterns/locations to extend (can be drafted, but final assertions depend on Task 1)

Wave 2 (After Wave 1 completes):
├── Task 2: Add regression tests (finalize + land)
└── Task 3: Choose single source of truth for web taps (decision task + small spike)

Wave 3 (After Wave 2 completes):
├── Task 4: Consolidate web tap handling
└── Task 5: Align zone hit-testing semantics (web/native)

Wave 4 (After Wave 3 completes):
├── Task 6: Fix/extend trigger fallback to support zones
└── Task 7: Documentation

Wave 5 (After Wave 4 completes):
└── Task 8: AI-bot guide + diagrams

Critical Path: Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7
Estimated Parallel Speedup: ~25% (Tasks 2 prep + Task 3 can overlap)

---

## Tasks

### Task 1: Fix web `targetEntityId` propagation for Godot input events

**Description**: Ensure the web runtime takes the `entityId` provided by Godot input events and stores it as `tap.targetEntityId` (and any other relevant input events like drag start if applicable).

**Delegation Recommendation**:
- Category: `quick` — small, localized change.
- Skills: [`typescript-programmer`, `git-master`]
  - `typescript-programmer`: implement the TSX fix with correct typing.
  - `git-master`: keep the fix atomic and conventionally committed.

**Skills Evaluation (all skills considered)**:
- ✅ INCLUDED `typescript-programmer`: core TS/TSX edit.
- ✅ INCLUDED `git-master`: best for atomic, conventional commits.
- ❌ OMITTED `dev-browser`: optional; can be used for web validation but not required for the code change itself.
- ❌ OMITTED `agent-browser`: optional; overlap with manual verification.
- ❌ OMITTED `frontend-ui-ux`: no UI/UX work.
- ❌ OMITTED `python-programmer`: not Python.
- ❌ OMITTED `svelte-programmer`: not Svelte.
- ❌ OMITTED `golang-tui-programmer`: not Go/TUI.
- ❌ OMITTED `python-debugger`: not Python.
- ❌ OMITTED `data-scientist`: not data processing.
- ❌ OMITTED `prompt-engineer`: not prompt work.

**Depends On**: None

**References**:
- `app/lib/game-engine/GameRuntime.godot.tsx:589-606` — bug site: callback receives `_entityId` but does not set `tap.targetEntityId`.
- `app/lib/godot/GodotBridge.web.ts:364-374` — proves the callback receives `entityId` from parsed JSON.
- `godot_project/scripts/GameBridge.gd:177-247` — proves Godot emits tap with `entityId` and uses areas + bodies.
- `app/lib/game-engine/BehaviorContext.ts:16-57` — contract for `tap.targetEntityId?: string`.

**Acceptance Criteria**:
- [ ] On web, a tap on an entity in Godot results in `context.inputEvents.tap.targetEntityId` being set for that frame.
- [ ] `BallSortActionExecutor` can parse a zone sensor id from tap on web (manual verification OK).
- [ ] Type-check passes (choose one):
  - [ ] `cd app && pnpm tsc --noEmit`
  - [ ] `pnpm --filter slopcade exec tsc --noEmit`

---

### Task 2: Add regression tests for tap targeting (including zone entities)

**Description**: Add/extend tests so that a tap event with a target entity id is propagated through rules evaluation/triggers. Include a test that matches the ball-sort-style expectation: tapping a zone entity id should be visible to rules/actions.

**Delegation Recommendation**:
- Category: `unspecified-low` — test design + mocking.
- Skills: [`typescript-programmer`, `git-master`]
  - `typescript-programmer`: implement Vitest tests in engine.
  - `git-master`: keep tests separate/atomic and aligned with repo conventions.

**Skills Evaluation (all skills considered)**:
- ✅ INCLUDED `typescript-programmer`: core test implementation.
- ✅ INCLUDED `git-master`: best for clean test-only commit.
- ❌ OMITTED `dev-browser`: not needed for unit tests.
- ❌ OMITTED `agent-browser`: not needed.
- ❌ OMITTED `frontend-ui-ux`: no UI.
- ❌ OMITTED `python-programmer`: not Python.
- ❌ OMITTED `svelte-programmer`: not Svelte.
- ❌ OMITTED `golang-tui-programmer`: not Go/TUI.
- ❌ OMITTED `python-debugger`: not Python.
- ❌ OMITTED `data-scientist`: not data.
- ❌ OMITTED `prompt-engineer`: not prompt work.

**Depends On**: Task 1

**References**:
- `app/lib/game-engine/__tests__/RulesEvaluator.test.ts` — existing Vitest test patterns and mocking.
- `app/lib/game-engine/rules/triggers/InputTriggerEvaluator.ts:27-55` — exact logic that should succeed when `targetEntityId` matches.
- `app/lib/game-engine/BehaviorContext.ts:54-62` — defines `InputEvents.tap.targetEntityId`.

**Acceptance Criteria**:
- [ ] New/updated test asserts: when `inputEvents.tap.targetEntityId = "some-id"` and trigger targets that id/tag, the trigger matches.
- [ ] Tests pass (choose one):
  - [ ] `cd app && pnpm vitest run`
  - [ ] `cd app && pnpm vitest run lib/game-engine/__tests__/RulesEvaluator.test.ts`
- [ ] No new type suppressions.

---

### Task 3: Decide: unify web input paths (Godot event stream vs DOM click querying)

**Description**: Make an explicit decision and codify it:
- Option A (recommended): **Godot is the single source of truth** for pointer→entity hit testing on web, and JS only consumes `onInputEvent`.
- Option B: JS performs click handling and uses `queryPointEntity` directly; Godot input events are disabled/ignored.

This task should produce a short ADR-style note (can be in docs) and a concrete implementation approach for Task 4.

**Delegation Recommendation**:
- Category: `ultrabrain` — architecture decision.
- Skills: [`dev-browser`, `typescript-programmer`]
  - `dev-browser`: validate iframe/web event stream behavior.
  - `typescript-programmer`: translate decision into concrete code-level changes for Task 4.

**Skills Evaluation (all skills considered)**:
- ✅ INCLUDED `dev-browser`: best fit for validating browser/iframe event quirks.
- ✅ INCLUDED `typescript-programmer`: best for producing an implementable decision.
- ❌ OMITTED `git-master`: decision/ADR task.
- ❌ OMITTED `agent-browser`: redundant with `dev-browser`.
- ❌ OMITTED `frontend-ui-ux`: no.
- ❌ OMITTED `python-programmer`: not.
- ❌ OMITTED `svelte-programmer`: not.
- ❌ OMITTED `golang-tui-programmer`: not.
- ❌ OMITTED `python-debugger`: not.
- ❌ OMITTED `data-scientist`: not.
- ❌ OMITTED `prompt-engineer`: not.

**Depends On**: Task 1

**References**:
- `app/lib/game-engine/GameRuntime.godot.tsx:589-606` — Godot input event subscription.
- `app/lib/game-engine/GameRuntime.godot.tsx:1333-1350` — DOM click path using `queryPointEntity`.
- `godot_project/scripts/GameBridge.gd:177-247` — Godot’s own web input handling.

**Acceptance Criteria**:
- [ ] Written decision recorded (where/why, plus invariants: “tap target = entity at touch start” etc.).
- [ ] Clear guidance for Task 4: which path to remove/disable and what remains.

---

### Task 4: Consolidate web tap handling into one pipeline

**Description**: Implement the decision from Task 3:
- Remove redundant code paths.
- Ensure exactly one place is responsible for: coordinate conversion + `targetEntityId` assignment + writing `inputRef.current.tap`.
- Ensure drag/tap semantics match native (ideally “target determined at touch start”).

**Delegation Recommendation**:
- Category: `unspecified-high` — central runtime refactor.
- Skills: [`typescript-programmer`, `dev-browser`, `git-master`]
  - `typescript-programmer`: refactor TSX runtime safely.
  - `dev-browser`: verify the web pipeline end-to-end.
  - `git-master`: keep refactor commits disciplined.

**Skills Evaluation (all skills considered)**:
- ✅ INCLUDED `typescript-programmer`: core refactor.
- ✅ INCLUDED `dev-browser`: direct web runtime validation.
- ✅ INCLUDED `git-master`: best for refactor commit hygiene.
- ❌ OMITTED `agent-browser`: optional overlap.
- ❌ OMITTED `frontend-ui-ux`: no.
- ❌ OMITTED `python-programmer`: not.
- ❌ OMITTED `svelte-programmer`: not.
- ❌ OMITTED `golang-tui-programmer`: not.
- ❌ OMITTED `python-debugger`: not.
- ❌ OMITTED `data-scientist`: not.
- ❌ OMITTED `prompt-engineer`: not.

**Depends On**: Task 3

**References**:
- `app/lib/game-engine/GameRuntime.godot.tsx` — both current web input paths live here.
- `app/lib/godot/GodotBridge.web.ts` — event stream contract.

**Acceptance Criteria**:
- [ ] Only one web tap input pipeline remains.
- [ ] Tapping a zone entity on web yields `targetEntityId` reliably (repeat 10x; no flakiness).
- [ ] Type-check passes: `pnpm --filter slopcade tsc --noEmit`.

---

### Task 5: Align zone hit-testing semantics across platforms

**Description**: Define and enforce consistent behavior:
- For a tap, hit-testing must consider **zones (sensors/areas)** and **bodies**.
- Ensure native hit testing includes zones, or document intentional differences.
- Prefer a single “hit-test” abstraction (even if implemented differently) that returns `{ targetEntityId?: string, targetKind?: 'body'|'zone' }`.

**Delegation Recommendation**:
- Category: `ultrabrain` — cross-platform contract + physics semantics.
- Skills: [`typescript-programmer`, `dev-browser`]
  - `typescript-programmer`: implement the contract in code.
  - `dev-browser`: validate web parity.

**Skills Evaluation (all skills considered)**:
- ✅ INCLUDED `typescript-programmer`: needed to implement the cross-platform contract.
- ✅ INCLUDED `dev-browser`: needed for web parity validation.
- ❌ OMITTED `git-master`: optional.
- ❌ OMITTED `agent-browser`: optional overlap.
- ❌ OMITTED `frontend-ui-ux`: no.
- ❌ OMITTED `python-programmer`: not.
- ❌ OMITTED `svelte-programmer`: not.
- ❌ OMITTED `golang-tui-programmer`: not.
- ❌ OMITTED `python-debugger`: not.
- ❌ OMITTED `data-scientist`: not.
- ❌ OMITTED `prompt-engineer`: not.

**Depends On**: Task 4

**References**:
- `app/lib/game-engine/hooks/useGameInput.ts:69-80` — native uses `physics.queryPoint(worldPos)` then matches by `bodyId`.
- `app/lib/game-engine/EntityManager.ts:408-432` — zones have `bodyId` + `colliderId` and `isSensor: true`.
- `godot_project/scripts/GameBridge.gd:190-200` — Godot query uses `collide_with_bodies=true` and `collide_with_areas=true`.

**Acceptance Criteria**:
- [ ] Documented contract: whether sensors are included in queries and what wins when overlapping.
- [ ] Native and web both satisfy the contract for zones.

---

### Task 6: Make trigger fallback hit-testing work for zones (or remove need for fallback)

**Description**:
- Either (preferred) make `targetEntityId` always available and treat fallback as a last-resort,
- Or extend fallback hit-testing so zones are correctly considered (zone shape support, not just `entity.physics`).

**Delegation Recommendation**:
- Category: `unspecified-low` — localized logic changes.
- Skills: [`typescript-programmer`, `git-master`]
  - `typescript-programmer`: implement fallback updates safely.
  - `git-master`: isolate the behavioral change and keep it reviewable.

**Skills Evaluation (all skills considered)**:
- ✅ INCLUDED `typescript-programmer`: core logic change.
- ✅ INCLUDED `git-master`: best for controlling scope of behavioral changes.
- ❌ OMITTED `dev-browser`: optional.
- ❌ OMITTED `agent-browser`: not needed.
- ❌ OMITTED `frontend-ui-ux`: no.
- ❌ OMITTED `python-programmer`: not.
- ❌ OMITTED `svelte-programmer`: not.
- ❌ OMITTED `golang-tui-programmer`: not.
- ❌ OMITTED `python-debugger`: not.
- ❌ OMITTED `data-scientist`: not.
- ❌ OMITTED `prompt-engineer`: not.

**Depends On**: Task 5

**References**:
- `app/lib/game-engine/rules/triggers/InputTriggerEvaluator.ts:31-69` — fallback hit-testing path.
- `app/lib/game-engine/EntityManager.ts:408-456` — zone shape definitions.

**Acceptance Criteria**:
- [ ] A tap trigger targeting a tag on a zone can match even if `targetEntityId` is missing (if fallback kept).
- [ ] Added/updated unit tests cover zone hit-testing.

---

### Task 7: Documentation: input + zones system (AI-friendly)

**Description**: Write documentation that makes the system legible to humans and AI bots:
- A single “Input & Hit Testing” page: event sources, coordinate spaces, and the final per-frame `InputEvents` shape.
- A “Zones” page: what a zone is, how it maps to physics (sensor), and how to target zones from rules.
- Add inline comments only where they encode invariants (avoid comment noise).

**Delegation Recommendation**:
- Category: `writing` — doc authoring.
- Skills: [`prompt-engineer`, `git-master`]
  - `prompt-engineer`: structure docs for AI-agent readability.
  - `git-master`: keep docs commits clean and reviewable.

**Skills Evaluation (all skills considered)**:
- ✅ INCLUDED `prompt-engineer`: optimize docs for AI agent consumption.
- ✅ INCLUDED `git-master`: clean docs commits.
- ❌ OMITTED `typescript-programmer`: doc-only task.
- ❌ OMITTED `dev-browser`: not.
- ❌ OMITTED `agent-browser`: not.
- ❌ OMITTED `frontend-ui-ux`: not.
- ❌ OMITTED `python-programmer`: not.
- ❌ OMITTED `svelte-programmer`: not.
- ❌ OMITTED `golang-tui-programmer`: not.
- ❌ OMITTED `python-debugger`: not.
- ❌ OMITTED `data-scientist`: not.

**Depends On**: Task 4, Task 5, Task 6

**References**:
- `docs/INDEX.md` (for placement conventions)
- `app/lib/game-engine/BehaviorContext.ts` (canonical types for input)
- `app/lib/game-engine/GameRuntime.godot.tsx` (runtime wiring)
- `app/lib/godot/GodotBridge.web.ts` and `godot_project/scripts/GameBridge.gd` (bridge contract)

**Acceptance Criteria**:
- [ ] New docs added under `docs/` in an appropriate location and linked from `docs/INDEX.md`.
- [ ] Each doc includes a “How to debug” section and “Common pitfalls”.

---

### Task 8: AI bot guide + diagrams (quick orientation)

**Description**: Add a short “AI agent orientation” doc section with:
- The minimal call graph for input and zones.
- Pointers to the 5–8 most important files with “why you care”.
- A checklist for verifying tap target correctness.

**Delegation Recommendation**:
- Category: `writing`.
- Skills: [`prompt-engineer`, `git-master`]
  - `prompt-engineer`: ensure bot-oriented structure and explicit invariants.
  - `git-master`: keep docs commits clean.

**Skills Evaluation (all skills considered)**:
- ✅ INCLUDED `prompt-engineer`: bot-oriented structure.
- ✅ INCLUDED `git-master`: clean docs commits.
- ❌ OMITTED `typescript-programmer`: doc-only task.
- ❌ OMITTED `dev-browser`: not.
- ❌ OMITTED `agent-browser`: not.
- ❌ OMITTED `frontend-ui-ux`: not.
- ❌ OMITTED `python-programmer`: not.
- ❌ OMITTED `svelte-programmer`: not.
- ❌ OMITTED `golang-tui-programmer`: not.
- ❌ OMITTED `python-debugger`: not.
- ❌ OMITTED `data-scientist`: not.

**Depends On**: Task 7

**Acceptance Criteria**:
- [ ] A new doc exists and is linked from the main input/zones doc.
- [ ] Includes explicit invariants (e.g., “tap target determined at touch start”, “zones are sensors”, “web uses Godot hit-test”).

---

## Commit Strategy

- Commit 1: `fix(input): propagate tap targetEntityId on web` (Task 1)
- Commit 2: `test(input): add regression coverage for tap targetEntityId` (Task 2)
- Commit 3: `refactor(input): unify web tap pipeline` (Tasks 3–4, if code changes)
- Commit 4: `refactor(zones): align hit testing across platforms` (Tasks 5–6)
- Commit 5: `docs(input): document input + zones architecture` (Tasks 7–8)

Each commit should run:
- `pnpm --filter slopcade tsc --noEmit`
- relevant test command(s) for changed package(s).

---

## Success Criteria

- [ ] On web, tapping zone entities reliably sets `targetEntityId` and ball-sort works.
- [ ] Web has a single, documented tap pipeline with no redundant/competing sources.
- [ ] Native and web share the same semantics for zone hit-testing (or an explicit documented divergence).
- [ ] Tests cover tap target propagation and (if retained) fallback hit-testing.
- [ ] Documentation clearly explains: coordinate conversions, hit testing, input event lifetimes, and zone mechanics.
