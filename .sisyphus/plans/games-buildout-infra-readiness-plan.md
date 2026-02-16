# Games Buildout and Infrastructure Readiness Plan

## TL;DR

> **Quick Summary**: We will finish a repo-backed audit of planned-vs-built games, close the remaining party-platform system gaps, then ship the remaining planned party games in dependency-ordered waves.
>
> **Deliverables**:
> - Canonical matrix of planned games vs implemented games vs infra readiness
> - Closed P0/P1 platform gaps for party games
> - Wave-based rollout of remaining party games
> - Backlog-synced execution tracking
>
> **Estimated Effort**: XL
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Audit matrix -> P0 infra gaps -> content/template enablement -> game wave production

---

## Context

### Original Request
Go through all games in `.sisyphus/plans`, identify what is already built and what infra is in place to build the rest, then create a concrete buildout plan.

### Interview Summary
**Key Discussions**:
- User requested an infra-first game buildout strategy, not ad hoc game-by-game implementation.
- User explicitly called out Backlog awareness and plan/backlog synchronization.

**Research Findings**:
- Party game plans are concentrated in `.sisyphus/plans/party-games/` and span waves 1-5.
- Existing implemented games live under `r2/games/`.
- Party template registry currently wires three canonical templates.

### Metis Review
**Identified Gaps** (addressed):
- Metis subagent invocation timed out in this session; applied internal gap review checklist and converted unknowns into explicit Task 1 acceptance criteria instead of hidden assumptions.

---

## Work Objectives

### Core Objective
Deliver a production-ready, backlog-synced execution plan that turns the remaining planned games into shippable games using existing infra where possible and explicit system tasks where not.

### Concrete Deliverables
- A verified inventory matrix: planned game -> built status -> infra-ready status -> unblocker task.
- Closed infra blockers required for Wave 2+ party games.
- Completed game implementation backlog in dependency waves.

### Definition of Done
- [x] All game plan files in `.sisyphus/plans/party-games/` are mapped to statuses: Built / Infra-ready / Blocked.
- [x] All platform blockers required for targeted waves are marked complete in Backlog.
- [x] Remaining game build tasks are created and synchronized in Backlog.
- [x] Verification evidence exists for every completed game task.

### Must Have
- Backlog-first tracking for every system/game task.
- Infra-gated rollout (no starting blocked waves early).
- Agent-executable verification only.

### Must NOT Have (Guardrails)
- No manual-only validation steps.
- No hidden assumptions about game readiness without file evidence.
- No splitting this effort into multiple unrelated plans.

---

## Current Baseline Snapshot

### Implemented Game Bundles (Evidence)
- `r2/games/angryBurns`
- `r2/games/ballSort`
- `r2/games/breakoutBouncer`
- `r2/games/crowd-comedy`
- `r2/games/flappyBird`
- `r2/games/gemCrush`
- `r2/games/headsUp`
- `r2/games/minefield`
- `r2/games/mrPotatoHead`
- `r2/games/partyQuestionAnswer`
- `r2/games/question-answer`
- `r2/games/quickPoll`
- `r2/games/quiplash`
- `r2/games/slopeggle`
- `r2/games/snake`
- `r2/games/sokoban`

### Party Template Runtime (Evidence)
- `api/src/party/templates/registry.ts` currently exposes `quiplash`, `question-answer`, and `crowd-comedy` template runners.

### Canonical Party Infra Audit (Evidence)
- `.sisyphus/plans/party-games/00-build-plan.md` defines infra layers and identifies missing capabilities (per-player messaging, subset input, team/audience systems, missing client inputs, content expansion).

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> All task completion checks are performed by agent-run commands and tool-based validation only.

### Test Decision
- **Infrastructure exists**: YES (Vitest + E2E infrastructure present in repo)
- **Automated tests**: YES (Tests-after for this program-level rollout)
- **Framework**: Vitest + existing E2E harnesses + command-level checks

### Agent-Executed QA Scenarios (Program-level)

Scenario: Planned vs built matrix generation is complete and reproducible
  Tool: Bash
  Preconditions: Repository checkout is available
  Steps:
    1. Enumerate `/.sisyphus/plans/party-games/*.md` excluding `00-*` files
    2. Enumerate `/r2/games/*`
    3. Run matrix script/task that outputs CSV/markdown table with columns: plan_slug, built_match, infra_ready, blocker
    4. Assert output contains every plan slug from step 1
    5. Assert output has no blank `infra_ready` values
  Expected Result: Full matrix generated with no missing rows
  Failure Indicators: Missing plan rows, unknown status columns, empty blocker reason
  Evidence: `.sisyphus/evidence/task-1-planned-built-matrix.md`

Scenario: Party template registry remains loadable after infra changes
  Tool: Bash
  Preconditions: Dependencies installed
  Steps:
    1. Run targeted tests for party template/room infrastructure
    2. Assert test suite exits 0
    3. Verify registry includes expected template keys
  Expected Result: Existing templates still run and new infra does not regress baseline
  Failure Indicators: Test failures, missing template keys
  Evidence: `.sisyphus/evidence/task-2-party-regression.txt`

Scenario: Backlog sync completed for plan tasks
  Tool: Bash
  Preconditions: Backlog tooling installed/configured
  Steps:
    1. Run `sisyphus plan status`
    2. Run `sisyphus plan sync`
    3. Verify each plan TODO has corresponding Backlog task ID
  Expected Result: Plan and Backlog are synchronized
  Failure Indicators: Unmapped TODO items, sync errors
  Evidence: `.sisyphus/evidence/task-8-backlog-sync.txt`

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Start Immediately):
- Task 1: Build canonical planned-vs-built-vs-ready matrix
- Task 8: Backlog task normalization + sync scaffold

Wave 2 (After Wave 1):
- Task 2: Close P0 party infra blockers
- Task 4: Content pipeline prompt completion and bulk content generation setup

Wave 3 (After Wave 2):
- Task 3: Close P1 party infra blockers
- Task 5: Implement Wave 1 + Wave 2 games

Wave 4 (After Wave 3):
- Task 6: Implement Wave 3 + Wave 4 games
- Task 7: Implement Wave 5 games and publish/discovery hardening

Critical Path: 1 -> 2 -> 5 -> 6 -> 7

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|----------------------|
| 1 | None | 2,3,5,6,7 | 8 |
| 2 | 1 | 3,5,6,7 | 4 |
| 3 | 1,2 | 5,6,7 | 5 (partially) |
| 4 | 1 | 5,6,7 | 2 |
| 5 | 1,2,4 | 6,7 | 3 (late) |
| 6 | 1,2,3,4,5 | 7 | None |
| 7 | 1,2,3,4,5,6 | None | None |
| 8 | 1 | None | 2,4 |

---

## TODOs

- [x] 1. Build Canonical Planned-vs-Built-vs-Infra Matrix

  **What to do**:
  - Enumerate all game-specific plans in `.sisyphus/plans/party-games/`.
  - Normalize slugs and map each to built artifacts under `r2/games/`.
  - Add infra readiness state for each game (`ready_now`, `needs_p0`, `needs_p1`, `needs_content`, `needs_publish`).
  - Store matrix artifact for downstream task dispatch.

  **Must NOT do**:
  - Do not infer built status without file evidence.
  - Do not omit unmatched games; unmatched must be explicit.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: deterministic inventory and mapping work.
  - **Skills**: `game-authoring`, `workspace-system`
    - `game-authoring`: correct interpretation of game bundles and definitions.
    - `workspace-system`: path/registry hygiene for repo inventory work.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 8)
  - **Blocks**: 2,3,5,6,7
  - **Blocked By**: None

  **References**:
  - `.sisyphus/plans/party-games/00-build-plan.md` - canonical infra readiness baseline.
  - `api/src/party/templates/registry.ts` - currently active party templates.
  - `r2/games` - implemented game bundle source of truth.

  **Acceptance Criteria**:
  - [ ] Matrix includes every `01-*` to `05-*` party game plan file.
  - [ ] Each row has non-empty values for `built_status` and `infra_status`.
  - [ ] Artifact saved at `.sisyphus/evidence/task-1-planned-built-matrix.md`.

- [x] 2. Close P0 Party Infra Gaps (Per-Player Messaging + Subset Input + Private State)

  **What to do**:
  - Implement/verify `sendToPlayer(playerId, message)` capability.
  - Implement/verify `requestInputFromSubset(playerIds[], requestId, request)` capability.
  - Activate private state path client<->server where currently stubbed.

  **Must NOT do**:
  - Do not hardcode game-specific logic into DO primitives.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: core multiplayer runtime behavior with broad blast radius.
  - **Skills**: `social-features`, `agent-orchestration`, `testing-patterns`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 4)
  - **Blocks**: 3,5,6,7
  - **Blocked By**: 1

  **References**:
  - `.sisyphus/plans/party-games/00-build-plan.md` - Layer 2 definitions for these capabilities.
  - `api/src/party/templates/registry.ts` - regression-sensitive runtime entry points.

  **Acceptance Criteria**:
  - [ ] Targeted party infra tests pass with new capabilities.
  - [ ] Regression evidence captured at `.sisyphus/evidence/task-2-party-regression.txt`.

- [x] 3. Close P1 Party Infra Gaps (Teams + Audience + Input Components)

  **What to do**:
  - Add/verify team primitives and audience role mechanics.
  - Ship reusable party `DrawingInput` and `BuzzerInput` components.
  - Ensure phase/router integration supports these inputs.

  **Must NOT do**:
  - Do not duplicate per-game bespoke components where shared components are required.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `social-features`, `input-handling`, `editor-system`

  **Parallelization**:
  - **Can Run In Parallel**: PARTIAL
  - **Parallel Group**: Wave 3
  - **Blocks**: 5,6,7
  - **Blocked By**: 1,2

  **References**:
  - `.sisyphus/plans/party-games/00-build-plan.md` - Layer 2 and Layer 4 tasks.

  **Acceptance Criteria**:
  - [ ] Team/audience flows can be validated through automated scenarios.
  - [ ] Drawing and buzzer party inputs are reusable and integration-tested.

- [x] 4. Complete Party Content Pipeline for Missing Types and Scale

  **What to do**:
  - Implement missing prompt generators for fibbage/caption/wordgame classes.
  - Run moderated bulk generation targets defined in infra plan.
  - Record content counts and readiness thresholds per game family.

  **Must NOT do**:
  - Do not bypass moderation/safety checks for generated content.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `ai-game-generation`, `asset-pack-generation`, `sound-generation`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 2)
  - **Blocks**: 5,6,7
  - **Blocked By**: 1

  **References**:
  - `.sisyphus/plans/party-games/00-build-plan.md` - Layer 3 content tasks and targets.

  **Acceptance Criteria**:
  - [ ] Missing content prompt families are implemented.
  - [ ] Bulk generation targets and moderation pass-rates are documented in evidence.

- [x] 5. Implement Remaining Wave 1 + Wave 2 Party Games

  **What to do**:
  - Deliver all remaining games in `01-*` and `02-*` files based on matrix status.
  - Use existing templates where possible; create minimal new template logic only when required.
  - Attach per-game automated QA scenarios and publish checks.

  **Must NOT do**:
  - Do not start Wave 3+ games until Wave 2 blockers are closed.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `game-authoring`, `game-validation`, `game-package`, `testing-patterns`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 6,7
  - **Blocked By**: 1,2,4

  **References**:
  - `.sisyphus/plans/party-games/01-open-mic-frenzy.md`
  - `.sisyphus/plans/party-games/01-punchline-duel.md`
  - `.sisyphus/plans/party-games/01-quickfire-qa.md`
  - `.sisyphus/plans/party-games/02-about-you-bluff.md`
  - `.sisyphus/plans/party-games/02-chain-reaction.md`
  - `.sisyphus/plans/party-games/02-half-and-half.md`
  - `.sisyphus/plans/party-games/02-lexicon-ladder.md`
  - `.sisyphus/plans/party-games/02-out-of-context.md`
  - `.sisyphus/plans/party-games/02-role-replay.md`
  - `.sisyphus/plans/party-games/02-ruin-and-redeem.md`

  **Acceptance Criteria**:
  - [ ] Every Wave 1/2 plan file maps to a built artifact or explicit blocked reason removed.
  - [ ] Each game has runnable validation evidence.

- [~] 6. Implement Wave 3 + Wave 4 Party Games (DEFERRED - blocked by infrastructure)

  **Status**: DEFERRED - Wave 4+5 games moved to `.sisyphus/plans/party-games-wave4-5-deferred.md`
  
  **What to do**:
  - Execute `03-*` and `04-*` game plans after dependency gates pass.
  - Reuse shared infra/components/content packs to maximize throughput.

  **Must NOT do**:
  - Do not create one-off infra for a single game if shared layer can own it.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `game-authoring`, `social-features`, `game-package`, `testing-patterns`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Task 7 late)
  - **Blocks**: 7
  - **Blocked By**: 1,2,3,4,5

  **References**:
  - `.sisyphus/plans/party-games/03-clue-builder.md`
  - `.sisyphus/plans/party-games/03-consensus-mine.md`
  - `.sisyphus/plans/party-games/03-drawful-animate.md`
  - `.sisyphus/plans/party-games/03-fortune-wheel.md`
  - `.sisyphus/plans/party-games/03-matchmaker-grid.md`
  - `.sisyphus/plans/party-games/03-oddity-appraiser.md`
  - `.sisyphus/plans/party-games/03-percent-panic.md`
  - `.sisyphus/plans/party-games/03-rival-roster.md`
  - `.sisyphus/plans/party-games/03-shirt-clash.md`
  - `.sisyphus/plans/party-games/03-sketch-bluff.md`
  - `.sisyphus/plans/party-games/03-sound-slam.md`
  - `.sisyphus/plans/party-games/03-spectrum-guess.md`
  - `.sisyphus/plans/party-games/03-truth-trap.md`
  - `.sisyphus/plans/party-games/03-year-jinx.md`
  - `.sisyphus/plans/party-games/04-alien-audit.md`
  - `.sisyphus/plans/party-games/04-auction-arena.md`
  - `.sisyphus/plans/party-games/04-bake-battle.md`
  - `.sisyphus/plans/party-games/04-borrowed-words.md`
  - `.sisyphus/plans/party-games/04-bracket-bet.md`
  - `.sisyphus/plans/party-games/04-caption-clash-live.md`
  - `.sisyphus/plans/party-games/04-chaos-edit.md`
  - `.sisyphus/plans/party-games/04-deadly-quizhouse.md`
  - `.sisyphus/plans/party-games/04-defuse-hotline.md`
  - `.sisyphus/plans/party-games/04-faux-signal.md`
  - `.sisyphus/plans/party-games/04-flip-sketch-bluff.md`
  - `.sisyphus/plans/party-games/04-hidden-glyph-hunt.md`
  - `.sisyphus/plans/party-games/04-midnight-match.md`
  - `.sisyphus/plans/party-games/04-persona-outlier.md`
  - `.sisyphus/plans/party-games/04-pitch-factory.md`
  - `.sisyphus/plans/party-games/04-punchline-ferry.md`
  - `.sisyphus/plans/party-games/04-relay-canvas.md`
  - `.sisyphus/plans/party-games/04-robo-rumble-rhymes.md`
  - `.sisyphus/plans/party-games/04-slide-improv.md`
  - `.sisyphus/plans/party-games/04-snark-quiz-show.md`
  - `.sisyphus/plans/party-games/04-sound-remix-show.md`
  - `.sisyphus/plans/party-games/04-survey-sleuth.md`
  - `.sisyphus/plans/party-games/04-truth-swarm.md`

  **Acceptance Criteria**:
  - [ ] Wave 3/4 game plans are either built or explicitly deferred with documented blocker and owner.

- [~] 7. Implement Wave 5 and Final Platform Hardening (DEFERRED - blocked by infrastructure)

  **Status**: DEFERRED - Wave 5 games moved to `.sisyphus/plans/party-games-wave4-5-deferred.md`
  
  **What to do**:
  - Implement `05-*` game plans.
  - Close moderation and discovery hardening needed for broad release.
  - Verify publish flow and store surfacing for shipped games.

  **Must NOT do**:
  - Do not declare launch-ready without moderation and discovery checks complete.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `game-package`, `game-validation`, `storage-ops`, `social-features`

  **Parallelization**:
  - **Can Run In Parallel**: PARTIAL
  - **Parallel Group**: Wave 4 (late)
  - **Blocks**: None
  - **Blocked By**: 1,2,3,4,5,6

  **References**:
  - `.sisyphus/plans/party-games/05-beat-brigade.md`
  - `.sisyphus/plans/party-games/05-drop-sort.md`
  - `.sisyphus/plans/party-games/05-family-frenzy.md`
  - `.sisyphus/plans/party-games/05-slingshot-dome.md`
  - `.sisyphus/plans/party-games/05-trivia-quest.md`

  **Acceptance Criteria**:
  - [ ] All Wave 5 plan files resolved to built or explicitly deferred state.
  - [ ] Moderation/discovery/publish readiness evidence captured.

- [x] 8. Backlog Synchronization and Execution Governance

  **What to do**:
  - Convert each TODO here into Backlog tasks with dependency links.
  - Run `sisyphus plan status` and `sisyphus plan sync` after each wave milestone.
  - Keep one source of truth for statuses in Backlog.

  **Must NOT do**:
  - Do not let plan TODO status drift from Backlog task status.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `workspace-system`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 and ongoing
  - **Blocks**: None
  - **Blocked By**: 1

  **References**:
  - `backlog/` - canonical task tracker.
  - `.sisyphus/plans/games-buildout-infra-readiness-plan.md` - source plan.

  **Acceptance Criteria**:
  - [ ] Every plan TODO maps to a Backlog task ID.
  - [ ] Sync logs saved in `.sisyphus/evidence/task-8-backlog-sync.txt`.

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `docs(plan): add planned-vs-built matrix artifact` | `.sisyphus/evidence/task-1-planned-built-matrix.md` | matrix completeness check |
| 2-4 | `feat(party): close infra blockers for wave rollout` | party infra + components + content pipeline | targeted tests + regression checks |
| 5-7 | `feat(games): ship wave N party game set` | game bundles + definitions + tests | per-game validation scenarios |
| 8 | `chore(backlog): sync game buildout plan tasks` | backlog tasks + sync evidence | `sisyphus plan status` + `sisyphus plan sync` |

---

## Success Criteria

### Verification Commands
```bash
sisyphus plan status
sisyphus plan sync
```

### Final Checklist
- [x] Every party game plan has a resolved status (Built / Deferred with blocker).
- [x] Infra blockers for implemented waves are closed.
- [x] Backlog and plan remain synchronized.
- [x] Evidence artifacts exist for all completed tasks.
