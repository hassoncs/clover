# Learnings

## 2026-02-12 Session Start
- Plan: claude-code-skills-auto-trigger
- Session ID: ses_3af5a7538ffeSXFwY9574u8nTc

## Task 4: Stream Handler Integration

### Implementation
- Added imports: `matchSkill`, `assembleSystemPrompt`, `getSkills` from `@/ai/skills`
- Extracted last user message text from `messages: ModelMessage[]` array
  - Searched backwards for first `role === "user"` message
  - Handled both string content and array content (filtered for `type === "text"` parts)
- Called `matchSkill(lastUserText, getSkills())` before `streamText()`
- Replaced `system: CHAT_STAGE_PROMPT` with `system: assembleSystemPrompt(CHAT_STAGE_PROMPT, matchedSkill)`

### Key Patterns
- `ModelMessage.content` can be string or array of content parts
- Content parts have `type` field; text parts have `text` field
- Skill matching happens per-turn, not per-stream-chunk
- `assembleSystemPrompt` gracefully handles `null` skill (returns base prompt unchanged)

### Verification
- Type-check passed: `pnpm --filter @slopcade/api type-check`
- No type suppressions needed
- No changes to billing, persistence, or AG-UI mapping

## Unit Tests for Skills System (2026-02-11)

Created three deterministic unit test files:
- `matcher.test.ts` — Tests for `matchSkill()` function
- `registry.test.ts` — Tests for `getSkills()` and `getSkillById()`
- `read-skill.test.ts` — Tests for the `readSkill` tool

### Test Coverage

**matcher.test.ts (10 tests):**
- No-match text returns null
- Single keyword match returns correct skill
- Highest keyword count wins when multiple skills match
- Tie-breaking by priority (higher priority wins)
- Tie-breaking by lexical id (alphabetically first wins)
- Case-insensitive matching
- Empty text returns null
- Empty skills array returns null
- Whitespace trimming
- Partial keyword matching

**registry.test.ts (8 tests):**
- Returns non-empty array
- All skills have required fields with correct types
- All skill ids are unique
- Returns correct skill for each known id (game-design, sprite-art, scripting)
- Returns undefined for nonexistent/empty skill id

**read-skill.test.ts (5 tests):**
- Returns skill content for valid skill ids (all 3 skills tested)
- Returns error for unknown skill id
- Returns error for empty skill id
- Follows the `ExecutableTool` pattern from `chat-tools.test.ts`
- Uses mock `ArtifactService` with `vi.fn<ArtifactService["methodName"]>()`

### Test Patterns Used

1. **Pure unit tests** — No `@cloudflare/vitest-pool-workers` imports
2. **Standard vitest imports** — `import { describe, expect, it, vi } from "vitest"`
3. **ExecutableTool pattern** — Cast tools to `ExecutableTool<Input, Output>` for testing
4. **Mock service pattern** — `vi.fn<ServiceType["methodName"]>()` for type-safe mocks
5. **No snapshots** — All assertions are explicit
6. **No comments** — Self-documenting test names

### Verification

All tests pass:
```
✓ src/ai/skills/__tests__/registry.test.ts (8 tests)
✓ src/ai/skills/__tests__/matcher.test.ts (10 tests)
✓ src/ai/skills/__tests__/read-skill.test.ts (5 tests)
```

Type-check passes with no errors.

