# Claude Code Skills Auto-Trigger (File-Backed)

## TL;DR

> **Quick Summary**: Add a small, deterministic, file-backed skills layer to chat streaming that auto-selects a skill from keywords, injects that skill description into the system prompt at runtime, and exposes a safe `readSkill` tool.
>
> **Deliverables**:
> - Deterministic skill matcher + registry
> - Runtime prompt augmentation in chat stream pipeline
> - Constrained `readSkill` tool (allowlist + path-safety)
> - Focused Vitest coverage (no VCR/network snapshots)
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 -> Task 2 -> Task 4 -> Task 5

---

## Context

### Original Request
"Build in support for our own version of Claude Code skills that auto-trigger based on keywords. Keep it simple but powerful. Unit test it."

### Interview Summary
**Key Discussions**:
- User wants Claude Code-like behavior but with deterministic, explainable matching.
- User wants a simple runtime model: inject skill descriptions dynamically and expose a tool to read skill files.
- User wants deterministic CI-safe testing; avoid VCR/network snapshot style.

**Research Findings**:
- AI SDK v6 (`ai@6.0.81`) has no first-class skills primitive; use prompt/tool orchestration.
- Existing keyword matching pattern: `api/src/ai/game/classifier.ts`.
- Existing prompt augmentation pattern: `api/src/ai/game/generator.ts`.
- Existing chat orchestration insertion point: `api/src/chat/stream-handler.ts` before `streamText(...)`.
- Existing tool factory pattern: `api/src/chat/chat-tools.ts`.
- Test infra exists: Vitest (`api/vitest.config.ts`) and chat tests in `api/src/chat/__tests__/`.

### Metis Review
**Identified Gaps (addressed in this plan)**:
- Clarified skill file format and location.
- Locked down anti-scope-creep boundaries (no marketplace, no model-based matching, no dynamic external loading).
- Added explicit tie-break and no-match behavior.
- Added edge-case coverage for malformed skill files and path traversal.

---

## Work Objectives

### Core Objective
Implement a deterministic, file-backed skill auto-trigger system for chat streaming that augments system context and safely exposes skill content to the model via tooling.

### Concrete Deliverables
- `api/src/ai/skills/` module with typed registry, matcher, and prompt assembler.
- `readSkill` tool integrated into chat tools with allowlist/path traversal protections.
- `api/src/chat/stream-handler.ts` integration before `streamText(...)`.
- Skill content files under a dedicated directory with frontmatter schema.
- Deterministic Vitest tests for matcher, registry safety, and stream integration.

### Definition of Done
- [ ] Keyword-triggered skill selection works deterministically in chat stream path.
- [ ] Skill description is injected into `system` prompt only when matched.
- [ ] `readSkill` can only read allowlisted skill files; traversal attempts fail.
- [ ] New tests pass in CI-style deterministic execution.

### Must Have
- Deterministic keyword scoring + explicit priority tie-break.
- One active skill per turn (v1), with documented fallback to base behavior.
- No network-dependent tests; no brittle snapshot-only validation.

### Must NOT Have (Guardrails)
- No LLM-based or embedding-based skill routing.
- No external skill marketplace/downloading.
- No unrestricted filesystem reads from `readSkill`.
- No message-history rewriting as part of skill injection.

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> All verification is command/tool executable. No manual visual checks required.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: Tests-after (focused)
- **Framework**: Vitest

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

Scenario: Skill keyword triggers prompt augmentation
  Tool: Bash (vitest)
  Preconditions: Test skill files present in fixture directory
  Steps:
    1. Run: `pnpm --filter @slopcade/api test:run -- src/ai/skills/__tests__/matcher.test.ts`
    2. Assert: case-insensitive match for keyword input (e.g., "GIT rebase help")
    3. Assert: highest score + priority selected when multiple skills match
  Expected Result: All matcher tests pass; deterministic selection verified
  Failure Indicators: Flaky order-dependent failures or nondeterministic selection
  Evidence: terminal output from test run

Scenario: Path traversal is blocked in readSkill
  Tool: Bash (vitest)
  Preconditions: `readSkill` tests include traversal payloads
  Steps:
    1. Run: `pnpm --filter @slopcade/api test:run -- src/ai/skills/__tests__/read-skill.test.ts`
    2. Assert: input `../../../etc/passwd` returns explicit error
    3. Assert: non-allowlisted path returns explicit forbidden result
  Expected Result: Unsafe paths rejected, allowlisted skill files readable
  Failure Indicators: Any read succeeds outside skill directory
  Evidence: terminal output from test run

Scenario: Stream handler injects matched skill into system prompt
  Tool: Bash (vitest)
  Preconditions: stream handler test mocks `streamText`
  Steps:
    1. Run: `pnpm --filter @slopcade/api test:run -- src/chat/__tests__/stream-skills.integration.test.ts`
    2. Assert: mocked `streamText` receives augmented `system` when skill matches
    3. Assert: `system` remains base prompt when no match
  Expected Result: Integration behavior validated without real LLM network calls
  Failure Indicators: Prompt unchanged on match or changed on no-match
  Evidence: terminal output from test run

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Start Immediately):
- Task 1: Skills domain model + registry format
- Task 3: `readSkill` tool (safe filesystem rules)

Wave 2 (After Wave 1):
- Task 2: Deterministic matcher + prompt assembler
- Task 4: Stream handler integration + tool merge
- Task 5: Test suite + verification commands

Critical Path: Task 1 -> Task 2 -> Task 4 -> Task 5
Parallel Speedup: ~30-40% vs sequential

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|----------------------|
| 1 | None | 2, 4, 5 | 3 |
| 2 | 1 | 4, 5 | 3 |
| 3 | None | 4, 5 | 1, 2 |
| 4 | 1, 2, 3 | 5 | None |
| 5 | 1, 2, 3, 4 | None | None |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|--------------------|
| 1 | 1, 3 | `task(category="unspecified-low", load_skills=["test-driven-development"])` |
| 2 | 2, 4 | `task(category="unspecified-low", load_skills=["systematic-debugging"])` |
| 2 | 5 | `task(category="quick", load_skills=["verification-before-completion"])` |

---

## TODOs

- [x] 1. Define skill file schema and registry loader

  **What to do**:
  - Add `api/src/ai/skills/types.ts` for skill contract (`id`, `name`, `description`, `keywords`, `priority`, `filePath`).
  - Add `api/src/ai/skills/registry.ts` to load skill metadata from local files under an allowlisted directory.
  - Define frontmatter format and parser behavior for malformed files (skip + log, no crash).

  **Must NOT do**:
  - No DB-backed registry
  - No external URL fetching

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: scoped backend infrastructure work with known patterns.
  - **Skills**: `test-driven-development`, `systematic-debugging`
    - `test-driven-development`: keep schema parsing behaviors explicit.
    - `systematic-debugging`: protect against malformed frontmatter edge cases.
  - **Skills Evaluated but Omitted**:
    - `brainstorming`: requirements already fixed.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 3)
  - **Blocks**: 2, 4, 5
  - **Blocked By**: None

  **References**:
  - `api/src/ai/game/classifier.ts:41` - deterministic typed matching style to mirror.
  - `api/src/chat/chat-tools.ts:11` - factory style and schema-driven tool definitions.
  - `api/src/__fixtures__/test-utils.ts:1` - test fixture idioms for deterministic setup.

  **Acceptance Criteria**:
  - [ ] Registry returns stable ordered skill list with valid parsed metadata.
  - [ ] Malformed skill files are skipped with explicit error object/log path.
  - [ ] No filesystem reads outside configured skill directory.

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Registry loads valid skill files
    Tool: Bash
    Preconditions: Fixture skills under api/src/ai/skills/__fixtures__
    Steps:
      1. Run: pnpm --filter @slopcade/api test:run -- src/ai/skills/__tests__/registry.test.ts
      2. Assert: parsed skills include expected ids and stable order
    Expected Result: PASS with deterministic ordering
    Evidence: terminal output capture

  Scenario: Malformed frontmatter is rejected safely
    Tool: Bash
    Preconditions: malformed fixture present
    Steps:
      1. Run same registry test file
      2. Assert: malformed file skipped and explicit parse error returned/logged
    Expected Result: PASS, no process crash
    Evidence: terminal output capture
  ```

- [x] 2. Implement deterministic skill matcher and prompt assembler

  **What to do**:
  - Add `api/src/ai/skills/matcher.ts` with case-insensitive keyword scoring.
  - Implement tie-break: highest score, then highest priority, then lexical `id` for determinism.
  - Add `api/src/ai/skills/prompt.ts` to append one selected skill description to base system prompt.
  - Define no-match fallback: base system prompt unchanged.

  **Must NOT do**:
  - No fuzzy search/embeddings/LLM routing
  - No multi-skill orchestration in v1

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: pure-function logic with bounded complexity.
  - **Skills**: `test-driven-development`
    - `test-driven-development`: ensures matching contract stays deterministic.
  - **Skills Evaluated but Omitted**:
    - `context7-auto-research`: no external API behavior required.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (after Task 1)
  - **Blocks**: 4, 5
  - **Blocked By**: 1

  **References**:
  - `api/src/ai/game/classifier.ts:84` - scoring and best-match pattern.
  - `api/src/ai/game/generator.ts:1` - conditional prompt guidance augmentation pattern.
  - `api/src/agent/engine/prompts.ts:1` - base prompt source contract.

  **Acceptance Criteria**:
  - [ ] Same input always yields same selected skill id.
  - [ ] Input without keywords yields null match and unchanged prompt.
  - [ ] Tie behavior proven by unit tests.

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Highest score + priority wins
    Tool: Bash
    Preconditions: matcher fixture with overlapping keywords
    Steps:
      1. Run: pnpm --filter @slopcade/api test:run -- src/ai/skills/__tests__/matcher.test.ts
      2. Assert: overlap case resolves to expected id
    Expected Result: deterministic winner
    Evidence: terminal output capture

  Scenario: No-match preserves base prompt
    Tool: Bash
    Preconditions: prompt assembler tests include no-match case
    Steps:
      1. Run matcher/prompt tests
      2. Assert: output system prompt equals base prompt
    Expected Result: unchanged prompt in no-match case
    Evidence: terminal output capture
  ```

- [x] 3. Add constrained `readSkill` tool

  **What to do**:
  - Extend tool creation path to include `readSkill(skillId)` or allowlisted path input.
  - Resolve id/path strictly within skills directory; reject traversal and unknown ids.
  - Return safe text payload only (no arbitrary binary/large file reads).

  **Must NOT do**:
  - No write/delete tool behavior
  - No arbitrary workspace file access

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: security-sensitive but small-scope utility.
  - **Skills**: `systematic-debugging`
    - `systematic-debugging`: ideal for security edge-case testing.
  - **Skills Evaluated but Omitted**:
    - `rclone`: unrelated domain.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 4, 5
  - **Blocked By**: None

  **References**:
  - `api/src/chat/chat-tools.ts:20` - existing tool schema and execute pattern.
  - `api/src/chat/chat-handler.ts:289` - tool factory usage in generation.

  **Acceptance Criteria**:
  - [ ] Allowlisted skill read succeeds.
  - [ ] Unknown skill id returns clear error result.
  - [ ] Traversal patterns (`..`, absolute path) are rejected.

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Allowlisted read returns skill content
    Tool: Bash
    Preconditions: valid skill file exists in allowlisted directory
    Steps:
      1. Run: pnpm --filter @slopcade/api test:run -- src/ai/skills/__tests__/read-skill.test.ts
      2. Assert: readSkill(validId) returns expected content excerpt
    Expected Result: PASS with safe text payload
    Evidence: terminal output capture

  Scenario: Path traversal is blocked
    Tool: Bash
    Preconditions: traversal inputs in test cases
    Steps:
      1. Run same read-skill test file
      2. Assert: '../../../etc/passwd' returns forbidden error
    Expected Result: PASS with rejection path
    Evidence: terminal output capture
  ```

- [x] 4. Integrate skills in stream orchestration

  **What to do**:
  - Add skill match + prompt/tool augmentation in `api/src/chat/stream-handler.ts` immediately before `streamText(...)`.
  - Merge base tools with `readSkill` and activate as needed.
  - Preserve existing behavior when no skill matches.

  **Must NOT do**:
  - No changes to billing, persistence, or AG-UI mapping semantics.
  - No breaking changes in SSE response shape.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: central integration point needs careful minimal change.
  - **Skills**: `systematic-debugging`, `verification-before-completion`
    - `systematic-debugging`: guard against behavioral regressions.
    - `verification-before-completion`: ensures unchanged no-skill path.
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: backend-only change.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: 5
  - **Blocked By**: 1, 2, 3

  **References**:
  - `api/src/chat/stream-handler.ts:275` - exact stream call site for injection.
  - `api/src/index.ts:120` - message assembly pipeline before stream handler.
  - `api/src/chat/agui-mapper.ts:140` - stream semantics to keep intact.

  **Acceptance Criteria**:
  - [ ] Matched skill augments `system` prompt for that turn.
  - [ ] No-match path uses base prompt and existing tools unchanged.
  - [ ] Existing stream integration tests still pass.

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Skill match augments streamText system prompt
    Tool: Bash
    Preconditions: stream handler test mocks streamText call args
    Steps:
      1. Run: pnpm --filter @slopcade/api test:run -- src/chat/__tests__/stream-skills.integration.test.ts
      2. Assert: mocked streamText receives base prompt + skill section
    Expected Result: PASS and injected prompt segment present
    Evidence: terminal output capture

  Scenario: No-match keeps legacy behavior
    Tool: Bash
    Preconditions: no-match input fixture
    Steps:
      1. Run same integration test file
      2. Assert: tools/system equal legacy baseline for no-skill message
    Expected Result: PASS with unchanged behavior
    Evidence: terminal output capture
  ```

- [x] 5. Add deterministic tests and run verification suite

  **What to do**:
  - Add unit tests:
    - `api/src/ai/skills/__tests__/matcher.test.ts`
    - `api/src/ai/skills/__tests__/registry.test.ts`
    - `api/src/ai/skills/__tests__/read-skill.test.ts`
  - Add one lightweight integration test:
    - `api/src/chat/__tests__/stream-skills.integration.test.ts`
  - Avoid VCR/network snapshots; mock `streamText` boundaries only.

  **Must NOT do**:
  - No snapshot-only assertions for core behavior.
  - No external API/network dependence.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: validation and test hardening phase.
  - **Skills**: `verification-before-completion`
    - `verification-before-completion`: evidence-first completion checks.
  - **Skills Evaluated but Omitted**:
    - `playwright`: no UI/browser verification required.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (final validation)
  - **Blocks**: None
  - **Blocked By**: 1, 2, 3, 4

  **References**:
  - `api/vitest.config.ts` - runner environment and workers setup.
  - `api/src/trpc/routes/__tests__/chat-threads.test.ts:1` - route-level deterministic test style.
  - `api/src/chat/__tests__/stream-integration.test.ts:1` - stream integration test conventions.

  **Acceptance Criteria**:
  - [ ] `pnpm --filter @slopcade/api test:run -- src/ai/skills/__tests__/matcher.test.ts` -> PASS
  - [ ] `pnpm --filter @slopcade/api test:run -- src/ai/skills/__tests__/registry.test.ts` -> PASS
  - [ ] `pnpm --filter @slopcade/api test:run -- src/ai/skills/__tests__/read-skill.test.ts` -> PASS
  - [ ] `pnpm --filter @slopcade/api test:run -- src/chat/__tests__/stream-skills.integration.test.ts` -> PASS
  - [ ] `pnpm --filter @slopcade/api type-check` -> PASS

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Deterministic suite passes in CI style
    Tool: Bash
    Preconditions: all implementation/test files present
    Steps:
      1. Run: pnpm --filter @slopcade/api test:run -- src/ai/skills/__tests__/matcher.test.ts src/ai/skills/__tests__/registry.test.ts src/ai/skills/__tests__/read-skill.test.ts src/chat/__tests__/stream-skills.integration.test.ts
      2. Run: pnpm --filter @slopcade/api type-check
      3. Assert: zero failing tests and zero TS errors
    Expected Result: PASS and deterministic output
    Evidence: terminal output capture

  Scenario: Negative guard against accidental network dependence
    Tool: Bash
    Preconditions: tests written without live API calls
    Steps:
      1. Run tests in offline-like environment (no external creds)
      2. Assert: tests still pass due to mocked boundaries
    Expected Result: PASS without network
    Evidence: terminal output capture
  ```

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1-3 | `feat(skills): add registry matcher and safe readSkill tool` | `api/src/ai/skills/*`, `api/src/chat/chat-tools.ts` | targeted unit tests |
| 4-5 | `test(chat): integrate skills in stream handler with deterministic coverage` | `api/src/chat/stream-handler.ts`, test files | full verification commands |

---

## Success Criteria

### Verification Commands
```bash
pnpm --filter @slopcade/api test:run -- src/ai/skills/__tests__/matcher.test.ts
pnpm --filter @slopcade/api test:run -- src/ai/skills/__tests__/registry.test.ts
pnpm --filter @slopcade/api test:run -- src/ai/skills/__tests__/read-skill.test.ts
pnpm --filter @slopcade/api test:run -- src/chat/__tests__/stream-skills.integration.test.ts
pnpm --filter @slopcade/api type-check
```

### Final Checklist
- [ ] Deterministic skill routing implemented.
- [ ] Runtime skill description injection implemented.
- [ ] `readSkill` path safety enforced.
- [ ] No-skill behavior unchanged.
- [ ] Tests deterministic and CI-safe (no VCR/network snapshot dependencies).
