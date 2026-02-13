# Multi-Context Editor Runtime + Inspector Plan

## TL;DR

> **Quick Summary**: Build a unified editor workflow where users and AI can switch between authored context and running context, preview host/player (and future variants), hot-reload on both web and native without unnecessary engine teardown, and inspect/mutate live state in a dedicated panel.
>
> **Deliverables**:
> - Preview Context architecture (host/player/prefab/level variants)
> - Author/Live mode split in editor runtime UX
> - Native soft-reset path (remove definition-change hard teardown behavior)
> - Party preview with mock server-state injection (no real socket dependency)
> - Live State panel (variables, room state, entities, controlled mutation)
> - Inspector multi-targeting + in-editor agent chat tools for context/state control
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES (4 waves)
> **Critical Path**: Runtime refactor -> Native soft-reset -> Context UI -> State panel + Agent tools -> E2E verification

---

## Context

### Original Request
- Support seamless switching between configuring a prefab/scene and running it live with physics/time.
- Ensure this works across web and mobile.
- Fix native runtime behavior so context/definition switching does not require full engine destruction.
- Support party-game preview (host vs player) including server-side logic emulation.
- Add visibility into live state and editable variables.
- Expose enough tooling so in-editor AI can inspect/change/debug anything.

### Interview Summary
- User wants **one integrated loop**: edit -> run -> inspect -> mutate -> iterate.
- User wants clearer naming than current edit/playtest labels.
- User explicitly asked to include "preview party game" semantics and server-state considerations.
- User explicitly asked to include new in-editor agent capabilities.

### Research Findings
- `GameRuntime.godot.tsx` re-initializes around definition changes and cleanup calls `bridge.dispose()`.
- Native `GodotBridge.native.ts` `dispose()` currently calls `clear_game` then `RTNGodot.destroyInstance()`.
- Web `GodotBridge.web.ts` dispose only clears game/callbacks (no engine destroy).
- Runtime already has an in-place restart path (`clearGame()` + `loadGame(definition)`) via `handleRestart` logic.
- Party runtime currently injects host role by default; no preview-friendly mock network system yet.
- Editor layout already supports web dockview and mobile single-stage layout.

### Metis Review (Incorporated)
Addressed gaps from consultation:
- Added explicit guardrails to prevent scope creep into real production networking.
- Added acceptance criteria for native memory/leak checks under repeated soft resets.
- Added edge-case handling for rapid context switching and simulation reset semantics.
- Added explicit party mock fidelity boundary (state emulation only; no transport simulation).

---

## Work Objectives

### Core Objective
Create a platform-safe, role-aware, AI-operable multi-context editor runtime where users and AI can preview authored and live game behavior (single-player + party) and inspect/mutate state without leaving the editor.

### Concrete Deliverables
- `PreviewContext` model used by editor and runtime.
- Runtime mode rename and behavior split:
  - **Author Mode** (authored/static intent)
  - **Live Mode** (simulated/running intent)
- Native soft-reset implementation path for definition/context changes.
- `MockNetworkSystem` for party preview state injection.
- Live State panel with sectioned views: variables, party room state, entities.
- Inspector target registry and targeting controls.
- New in-editor chat tools for context switching, mode toggling, reading/writing state.
- Full integration tests for context switching and party preview correctness.

### Definition of Done
- [x] Switching contexts in editor does not destroy native engine instance for definition/context updates.
- [x] Web supports dual-pane host/player preview simultaneously.
- [x] Mobile supports single-pane context switching with no full engine teardown.
- [x] Party preview shows host/player differences using mock room state.
- [x] Live State panel reflects and mutates runtime values safely.
- [x] Agent tools can switch context, read state, update state, and run targeted inspector operations.
- [x] Integration tests pass for full author->live->inspect loop.

### Must Have
- Runtime context abstraction shared across UI/runtime/agent tools.
- Native soft-reset fix for current behavior.
- Party preview support without requiring real DO/WebSocket session.
- Inspectable and editable state panel.

### Must NOT Have (Guardrails)
- No production party protocol rewrites.
- No requirement for real multiplayer session in editor preview.
- No full editor redesign outside requested flow.
- No hidden, non-reversible state mutation from AI tools (all state edits must be explicit and scoped).

---

## Naming Decision

### Defaults Applied
- Applied user-facing terms:
  - **Author Mode** = configure/layout/inspect authored state
  - **Live Mode** = run/simulate physics+rules+time
- Internal compatibility alias can remain `design/simulate` temporarily for migration.

Rationale:
- "Author" maps directly to creation intent.
- "Live" maps directly to running behavior intent.

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> All verification is executable by agent tooling (Playwright, tmux, curl, game-inspector MCP).

### Test Decision
- **Infrastructure exists**: YES (Playwright + existing e2e suite + inspector MCP).
- **Automated tests**: YES (tests-after for this refactor-heavy change, with targeted integration/e2e coverage).
- **Framework**: Playwright + project test runners.

### Agent-Executed QA Scenarios (Mandatory)

#### Scenario A: Native soft-reset path no teardown
Tool: Bash + logs/assertions
1. Start app/editor in native target test environment.
2. Trigger 50 consecutive context/definition switches.
3. Assert no `destroyInstance()` invocation in definition-switch path logs.
4. Assert runtime remains responsive (entity queries still return).
Expected: Context changes succeed without full engine destroy.
Evidence: `.sisyphus/evidence/task-soft-reset-native.log`

#### Scenario B: Web dual-pane host/player
Tool: Playwright
1. Open editor web route for party-capable game.
2. Enable split preview panes.
3. Set pane A context to host, pane B to player.
4. Assert host-only overlay element visible in pane A and hidden in pane B.
5. Assert player-only overlay element visible in pane B and hidden in pane A.
Expected: Role-based divergence visible simultaneously.
Evidence: `.sisyphus/evidence/task-web-dual-pane-host-player.png`

#### Scenario C: Mobile single-pane context switch
Tool: Playwright/native automation harness
1. Open editor on mobile layout.
2. Switch context Host -> Player -> Host while staying in same stage pane.
3. Assert context badge updates and role-dependent overlay updates.
4. Assert no full engine reload indicator / teardown event.
Expected: Smooth single-pane switching with stable runtime process.
Evidence: `.sisyphus/evidence/task-mobile-context-switch.log`

#### Scenario D: Party preview server-state emulation
Tool: Inspector + chat tool + state panel API
1. Set mock room state to lobby.
2. Assert `room.phase == lobby` in state panel and runtime variables.
3. Update mock room state to voting/results.
4. Assert overlay transitions and `room.*` values update.
Expected: Party flow testable without real sockets.
Evidence: `.sisyphus/evidence/task-party-mock-state.json`

#### Scenario E: AI tool loop (edit/run/inspect/mutate)
Tool: agent chat + inspector MCP
1. Agent writes a visibleWhen change.
2. Agent switches context to player and verifies target element hidden.
3. Agent mutates variable in live state panel/tool.
4. Agent runs inspector query against targeted context and validates effect.
Expected: End-to-end agentic iteration works in-editor.
Evidence: `.sisyphus/evidence/task-agent-loop-transcript.md`

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Foundation)
- Task 1: PreviewContext model + shared types
- Task 2: Runtime mode rename mapping (Author/Live) + compatibility layer

Wave 2 (Runtime Fix)
- Task 3: Native soft-reset path and dispose split
- Task 4: GameRuntime definition/context update flow refactor

Wave 3 (Feature Layer)
- Task 5: MockNetworkSystem + party preview state injector
- Task 6: Context switcher UI (web split + mobile single-pane)
- Task 7: Live State panel (read + controlled write)

Wave 4 (Agent + Verification)
- Task 8: Inspector multi-target registry/targetId
- Task 9: In-editor agent chat tools for context/state control
- Task 10: Integration tests + regression checks

Critical Path: 1 -> 3 -> 4 -> 6 -> 8 -> 9 -> 10

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|----------------------|
| 1 | None | 3,4,5,6,8,9 | 2 |
| 2 | None | 6,9 | 1 |
| 3 | 1 | 4,10 | 5 |
| 4 | 1,3 | 6,7,10 | 5 |
| 5 | 1 | 6,7,10 | 3,4 |
| 6 | 1,2,4,5 | 8,9,10 | 7 |
| 7 | 4,5 | 9,10 | 6 |
| 8 | 1,6 | 9,10 | 7 |
| 9 | 2,6,7,8 | 10 | None |
| 10 | 3,4,5,6,7,8,9 | None | None |

---

## TODOs

- [x] 1. Implement PreviewContext shared model
  - What to do:
    - Add shared `PreviewContext`, `RuntimeIntentMode`, and helper mappers.
    - Add serializer-safe shape for MCP/chat tools.
  - Must NOT do:
    - No feature-specific logic in shared type file.
  - Recommended Agent Profile:
    - Category: `quick`
    - Skills: `ecs-architecture`, `agent-orchestration`
  - Parallelization: Wave 1
  - Acceptance Criteria:
    - Types compile and imported in editor/runtime/inspector paths.

- [x] 2. Add Author/Live naming migration layer
  - What to do:
    - Introduce Author/Live labels and map legacy edit/playtest states.
    - Update controls and mode badges.
  - Must NOT do:
    - No broad visual redesign.
  - Recommended Agent Profile:
    - Category: `visual-engineering`
    - Skills: `frontend-ui-ux`
  - Parallelization: Wave 1
  - Acceptance Criteria:
    - Mode switch controls reflect Author/Live in web and mobile.

- [x] 3. Implement native soft-reset path (fix current issue)
  - What to do:
    - Split native dispose behavior into soft reset vs full teardown.
    - Ensure definition/context switches call soft reset path.
  - Must NOT do:
    - No regression in true unmount cleanup.
  - Recommended Agent Profile:
    - Category: `unspecified-high`
    - Skills: `native-infrastructure`, `bridge-development`
  - Parallelization: Wave 2
  - Acceptance Criteria:
    - Definition/context changes no longer trigger `destroyInstance` path.

- [x] 4. Refactor GameRuntime context/update lifecycle
  - What to do:
    - Use in-place clear/load flow for context and definition updates.
    - Keep full setup/teardown only for true mount/unmount.
  - Must NOT do:
    - No changes to unrelated gameplay system semantics.
  - Recommended Agent Profile:
    - Category: `unspecified-high`
    - Skills: `ecs-architecture`, `godot-engine`
  - Parallelization: Wave 2
  - Acceptance Criteria:
    - Runtime remains stable through repeated context switches.

- [x] 5. Build MockNetworkSystem for party preview
  - What to do:
    - Inject `role` and `room.*` variables from mock room state.
    - Preserve event compatibility with network-related logic.
  - Must NOT do:
    - No real socket handshakes in preview mode.
  - Recommended Agent Profile:
    - Category: `unspecified-high`
    - Skills: `ecs-architecture`, `agent-orchestration`
  - Parallelization: Wave 3
  - Acceptance Criteria:
    - Party overlays and rules react to mocked room state changes.

- [x] 6. Implement context switcher UI across platforms
  - What to do:
    - Web: dual-pane optional split for host/player contexts.
    - Mobile: single-pane context switch without teardown.
    - Add per-pane runtime intent controls.
  - Must NOT do:
    - No breaking changes to existing non-party editor workflow.
  - Recommended Agent Profile:
    - Category: `visual-engineering`
    - Skills: `frontend-ui-ux`, `input-handling`
  - Parallelization: Wave 3
  - Acceptance Criteria:
    - Context switching works in both web and mobile layouts.

- [x] 7. Add Live State panel (variables/room/entities)
  - What to do:
    - Add panel sections:
      - Runtime variables (read/write scoped)
      - Party room snapshot (phase, players, sharedData)
      - Entity list with quick inspect hooks
    - Include change source annotations (user/agent/system).
  - Must NOT do:
    - No silent auto-mutations.
  - Recommended Agent Profile:
    - Category: `visual-engineering`
    - Skills: `frontend-ui-ux`, `game-inspector`
  - Parallelization: Wave 3
  - Acceptance Criteria:
    - Panel values reflect live runtime and allow controlled updates.

- [x] 8. Add inspector multi-target support
  - What to do:
    - Register per-context debug handles.
    - Add optional `targetId` to inspector operations.
    - Add `list_targets` operation.
  - Must NOT do:
    - No breaking API changes for current single-target clients.
  - Recommended Agent Profile:
    - Category: `unspecified-high`
    - Skills: `game-inspector`, `agent-orchestration`
  - Parallelization: Wave 4
  - Acceptance Criteria:
    - Inspector can query/mutate specific preview context by ID.

- [x] 9. Expose new in-editor agent chat tools
  - What to do:
    - Add tools:
      - `editor.listContexts`
      - `editor.switchContext`
      - `editor.setRuntimeIntentMode`
      - `editor.readState`
      - `editor.updateState`
      - `editor.inspectTarget`
    - Update agent prompts/tool docs for safe use.
  - Must NOT do:
    - No unrestricted arbitrary execution.
  - Recommended Agent Profile:
    - Category: `unspecified-high`
    - Skills: `agent-orchestration`, `game-inspector`
  - Parallelization: Wave 4
  - Acceptance Criteria:
    - Agent can complete edit->run->inspect->mutate loop from chat only.

- [x] 10. Add integration tests and regression suite
  - What to do:
    - Add end-to-end tests for web split preview, mobile switching, party mock state, and agent tool loop.
    - Add stress test for repeated native soft resets.
  - Must NOT do:
    - No manual-only verification steps.
  - Recommended Agent Profile:
    - Category: `unspecified-high`
    - Skills: `testing-patterns`, `game-inspector`
  - Parallelization: Wave 4
  - Acceptance Criteria:
    - All new tests pass in CI and local verification runs.

---

## References

### Runtime + Bridge
- `app/lib/game-engine/GameRuntime.godot.tsx` - Current lifecycle, restart flow, network system registration.
- `app/lib/godot/GodotBridge.native.ts` - Native dispose behavior with current destroy path.
- `app/lib/godot/GodotBridge.web.ts` - Web dispose behavior for soft clear path.
- `app/lib/godot/generated/bridge-methods.ts` - `clearGame/loadGame` bridge contracts.

### Editor Layout
- `app/components/editor/ResponsiveEditorLayout.tsx` - Platform layout routing.
- `app/components/editor/StageArea.tsx` - Preview tab/surface composition.
- `app/components/editor/StageContainer.tsx` - Runtime mounting and controls integration.
- `app/components/editor/EditorProvider.tsx` - Editor mode/state management.

### Party + Networking
- `app/lib/game-engine/systems/runner/wrappers/NetworkRuntimeSystem.ts` - Current room variable injection.
- `api/src/party/PartyRoomDO.ts` - Real party room server implementation (reference only; not modified for preview flow).

### Inspector + Agent
- `packages/game-inspector-mcp/src/tools/game-management.ts` - Targeting/open lifecycle.
- `packages/game-inspector-mcp/src/types.ts` - Inspector state shape.
- `api/src/chat/chat-tools.ts` - In-editor agent tool registration.
- `api/src/agent/engine/prompts.ts` - Agent runtime/system guidance.

---

## Commit Strategy

| After Task(s) | Commit Message | Verification |
|---------------|----------------|--------------|
| 1-2 | `feat(editor): add preview context model and author/live mode mapping` | typecheck + editor smoke |
| 3-4 | `fix(native-runtime): use soft reset for definition/context updates` | native stress log checks |
| 5-7 | `feat(editor): add party mock preview and live state panel` | web/mobile preview tests |
| 8-9 | `feat(agent-inspector): add multi-target context tooling` | MCP op checks + chat tool tests |
| 10 | `test(editor): add multi-context runtime integration coverage` | full test suite |

---

## Success Criteria

### Verification Commands

```bash
# 1) Core tests
pnpm test

# 2) Type safety
pnpm tsc --noEmit

# 3) Party flow integration
npx playwright test tests/e2e/party

# 4) New multi-context integration tests
npx playwright test tests/e2e/editor/multi-context.spec.ts

# 5) Inspector target checks (example)
# game-inspector_call_op(operation="list_targets")
```

### Final Checklist
- [x] Author/Live mode split is clear and operational.
- [x] Native context/definition switch uses soft-reset path.
- [x] Party preview works with mock room state and role differentiation.
- [x] Live State panel supports read + controlled write.
- [x] Agent chat can operate context/state/inspector loop end-to-end.
- [x] No regressions in existing single-preview workflows.
