---
description: "Audit docs against real code, consolidate knowledge upward, prune stale files — like the brain during sleep"
subtask: false
---

# Brain Sleep

You are the brain during sleep. Replay experiences, extract patterns, consolidate memories into long-term storage, prune what's no longer needed. Git has history — deletion is free.

## Phase 1: Load Previous State

Check if `.sisyphus/brain-sleep.md` exists. If it does, read it **in full**. It contains:
- Which files were reviewed previously and when
- Which files were kept and why
- What was consolidated and where
- **Learned Rules** — hard-won patterns from previous runs. These override built-in rules. Internalize them before proceeding
- **Self-Critique** — what went wrong last time. Don't repeat those mistakes

**Skip files that were reviewed within the last 14 days AND haven't been git-modified since.** Use `git log --since="YYYY-MM-DD" --name-only -- <file>` to check for modifications. This makes repeat runs fast.

If the manifest doesn't exist, this is the first run — process everything.

## Phase 2: Discover All Documentation Files

Find all `.md` files in the repo, excluding `node_modules/` and `.git/`. Categorize each into a **tier** based on its location:

### Memory Hierarchy (protect the top, prune the bottom)

| Tier | Location | Durability | Prune Bias |
|------|----------|-----------|------------|
| **T1 — Core Truth** | `AGENTS.md` (root + subdirs), `.claude/skills/` | Permanent | NEVER delete. Update only |
| **T2 — Reference** | `docs/shared/reference/`, `docs/operations/` | Long-lived | Keep if accurate |
| **T3 — Guides** | `docs/shared/guides/`, `docs/` top-level how-tos | Medium-lived | Keep if still works |
| **T4 — Decisions** | `docs/decisions/`, ADR-style docs | Archival | Keep (historical record) |
| **T5 — Plans** | `.sisyphus/plans/`, `.opencode/plans/` | Ephemeral | Delete when implemented |
| **T6 — Working Memory** | `.sisyphus/notepads/`, `.claude/memory/`, `docs/wip/` | Disposable | Delete aggressively |

**Process bottom-up: T6 first, T1 last.** This way, insights extracted from lower tiers get consolidated into higher tiers before you reach them.

## Phase 3: Evaluate Each File

For every file, apply the **Freshness Test**, then the **Consolidation Question**.

### The Freshness Test

Don't guess — verify against real code. Pick the most appropriate technique per file:

1. **Path Check**: Extract file paths mentioned in the doc (`src/...`, `api/...`, `app/...`). Glob them. If >50% don't exist → **STALE**
2. **Symbol Check**: Extract function/class/component names. Grep the codebase. If key ones are gone → **STALE**
3. **Cross-Reference Check**: Does the doc reference other docs that no longer exist? → **STALE**
4. **Git Delta**: `git log --oneline --since="$(git log -1 --format=%ci -- <doc>)" -- <paths-doc-describes>` — if the code changed 10+ times since the doc was last touched → **SUSPECT** (likely outdated even if not technically wrong)

For plans, path check is usually enough. For architecture docs, symbol check matters more.

### The Consolidation Question

Before deleting anything, ask: **"Does the knowledge in this file survive somewhere else?"**

| If the knowledge... | Then... |
|---------------------|---------|
| Already exists in a higher-tier file | **DELETE** — it's redundant |
| Is a useful pattern/gotcha not captured elsewhere | **EXTRACT** the insight into the appropriate T1/T2 file, then **DELETE** |
| Is specific to a completed task with no reusable insight | **DELETE** — the code is the documentation |
| Is still actively needed | **KEEP** |

### What "Extract" Means

Turn specific experiences into general knowledge. Only extract insights that would save a future AI session >10 minutes of debugging.

| Raw (notepad/memory) | Consolidated (AGENTS.md/skill) |
|----------------------|-------------------------------|
| "Chat streaming had CORS issues, spent 3 hours debugging. Had to add headers to the streaming response specifically, not just the initial request" | Add to AGENTS.md: "SSE streaming endpoints need CORS headers on the streaming response itself, not just the initial request" |
| "QuickJS sandbox silently swallows errors when you pass a Promise to a sync function" | Add to game-authoring skill: "QuickJS gotcha: passing Promise to sync function silently fails" |
| "Tried approach X, didn't work because Y, switched to Z" | Usually just DELETE — the code already reflects the final decision |

## Phase 3.5: Auto-Generate Skills (NEW)

As docs are evaluated, automatically extract structured knowledge into skills.

### Skill Candidate Detection

For each doc flagged for extraction, check if it contains:
- **Actionable how-to information** (step-by-step procedures)
- **Common patterns** (repeated code structures)
- **Code examples** showing best practices
- **Warnings/gotchas** about mistakes to avoid
- **Configuration details** (valid values, defaults)

If YES to 2+ criteria → **Create or update skill**

### Skill Category Mapping

Map doc location to skill file:

| Doc Location | Skill File |
|--------------|------------|
| `docs/godot/*`, `docs/refactoring/*` § Bridge | `.claude/skills/bridge-development.md` |
| `docs/godot/WEB_INPUT_HANDLING.md` | `.claude/skills/input-handling.md` |
| `docs/godot/COORDINATE_SYSTEM_GUIDE.md` | `.claude/skills/coordinate-systems.md` |
| `docs/effects/*`, `docs/text-effects-implementation.md` | `.claude/skills/effects-system.md` |
| `docs/economy/*` | `.claude/skills/economy-engine.md` |
| `docs/chat/*`, `AGENTS.md` § Chat/Billing | `.claude/skills/chat-streaming.md` |
| `docs/testing/*`, `app/lib/**/__tests__/` | `.claude/skills/testing-patterns.md` |
| `docs/shared/guides/expo*`, `AGENTS.md` § Expo | `.claude/skills/expo-native.md` |
| `docs/game-inspector/*` | `.claude/skills/game-inspector.md` |
| `docs/game-maker/*`, `games/` | `.claude/skills/game-authoring.md` (append) |

### Content Extraction Rules

**Code Examples:**
- Must be complete and runnable
- Include imports and file path
- Add comments for key points
- Prefer TypeScript over pseudocode

**Gotchas:**
- Format: `**{Issue}**: {Explanation} → {Fix}`
- Include error messages if applicable
- Note when the issue occurs

**Procedures:**
- Numbered steps
- Include prerequisites
- Add verification step

**Configuration:**
- Tables for option reference
- Code blocks for examples
- Note defaults

### Skill Creation/Update

**If skill exists:**
- Read existing content
- Append new section with date header: `### Added {date} from {source}`
- Update "Last Updated" in frontmatter
- Add to Changelog

**If skill doesn't exist:**
- Create new file with template below
- Set Version: 1.0
- Set Last Updated: today
- Set Source Docs: [current doc]

**Skill Template:**
```markdown
# {Skill Name}

> **Skill for AI Agents**: {One-line description}
> **Version**: 1.0
> **Last Updated**: {YYYY-MM-DD}
> **Source Docs**: {comma-separated list}

## When to Use This Skill

Load this skill when:
- {Trigger 1}
- {Trigger 2}

## Key Concepts

### {Concept}
{Explanation with code example}

## Common Patterns

### {Pattern Name}
```typescript
{Code example}
```

## Gotchas & Warnings

- **{Issue}**: {Explanation} → {Fix}

## Quick Reference

| Task | Solution |
|------|----------|
| {Task} | {Answer} |

## Related Skills
- {skill-name} - {relationship}

## Changelog
- {YYYY-MM-DD}: Created from {source}
```

### Skill Index Maintenance

After processing all docs:
1. Create/update `.claude/skills/INDEX.md`
2. List all skills by category
3. Add "Recently Updated" section
4. Calculate coverage: {docs covered} / {total docs}
5. Cross-link related skills

## Phase 4: Execute (Chunk by Chunk)

Process 8-12 files at a time. For each chunk:

1. Read the files
2. Run freshness tests (fire explore agents in parallel for verification)
3. Classify each: DELETE / EXTRACT+DELETE / UPDATE / KEEP
4. **If 5+ deletions in a chunk: show the list and ask for confirmation**
5. Execute the actions
6. Report: what was deleted, what was kept (1-line reason), what was consolidated (source → destination)

Move to the next chunk.

## Phase 5: Update Manifest

After processing, write/update `.sisyphus/brain-sleep.md`:

```markdown
# Brain Sleep Manifest
Last run: YYYY-MM-DD

## Reviewed Files
| File | Decision | Reason | Date |
|------|----------|--------|------|
| .sisyphus/notepads/chat-migration/ | DELETED | Completed task, insight extracted to AGENTS.md | 2026-02-11 |
| docs/ARCHITECTURE.md | KEPT | Verified accurate against current code | 2026-02-11 |
| docs/godot/BRIDGE_REFACTOR.md | DELETED | Bridge was replaced, code no longer exists | 2026-02-11 |

## Skills Created/Updated
| Skill | Action | Source Docs |
|-------|--------|-------------|
| bridge-development.md | CREATED | docs/godot/BRIDGE_REFACTOR.md, docs/godot/BRIDGE_E2E_TESTING.md |
| chat-streaming.md | UPDATED | Added AG-UI event patterns from chat-streaming-migration |
| game-authoring.md | UPDATED | Added QuickJS gotchas from ai-game-dev-lifecycle |

## Consolidated Knowledge
| Source | Destination | Insight |
|--------|-------------|---------|
| .sisyphus/notepads/chat-streaming-migration/ | AGENTS.md § Chat Flow | SSE needs CORS on streaming response |
| .sisyphus/notepads/chat-streaming-migration/ | chat-streaming.md | AG-UI finish chunks fire per step |
| .sisyphus/notepads/ai-game-dev-lifecycle/ | agent-billing.md | Reservation/settlement/finalize pattern |

## Stats
- Files reviewed: 47
- Deleted: 23
- Kept: 20
- Updated: 4
- Insights extracted: 8
- Skills created: 3
- Skills updated: 5
- Coverage: Bridge 60%, Effects 20%, Chat 85%

## Coverage Report
| Category | Before | After | Target | Status |
|----------|--------|-------|--------|--------|
| Bridge | 40% | 60% | 90% | ⚠️ Needs work |
| Effects | 0% | 20% | 80% | ⚠️ Needs work |
| Chat | 70% | 85% | 90% | ✅ Good |
| Economy | 0% | 0% | 80% | 🔴 Missing |

## Self-Critique
After each run, answer honestly:
- False positives: Did I delete something that was still needed? What fooled me?
- False negatives: Did I keep something obviously stale? Why didn't my freshness test catch it?
- Extraction quality: Did I extract useful insights, or did I add noise to AGENTS.md/skills?
- Skill quality: Are skills actionable? Do they have code examples and gotchas?
- Coverage gaps: Which domains still need skill coverage?
- Skipped files: Did I run out of context and skip files? How many?
- Freshness test effectiveness: Which test (path/symbol/cross-ref/git-delta) was most useful? Which was wasted effort?
- Time sinks: What took disproportionately long? What should be faster next time?

## Learned Rules
<!-- Add rules discovered through running brain-sleep. These override built-in rules when they conflict. -->
<!-- Example: "docs/economy/ files reference API routes by description not path — use symbol check instead of path check" -->
<!-- Example: "T6 notepads never contain extractable insights in this repo — skip extraction step for T6" -->
```

## Phase 6: Self-Critique

After all chunks are processed, populate the **Self-Critique** and **Learned Rules** sections in the manifest. Answer each self-critique question honestly.

Also: if the manifest already has a **Learned Rules** section from a previous run, you MUST read those rules at the start (Phase 1) and follow them during this run. They override the built-in rules when they conflict. If this run reveals a new pattern, append it to Learned Rules.

The Learned Rules section is the command's long-term memory. It accumulates across runs.

## Rules

1. **Bottom-up processing.** T6 → T5 → T4 → T3 → T2 → T1. Extract before you reach the destination
2. **Verify before deleting.** Use grep/glob to confirm referenced code is gone. Don't guess
3. **Extract before deleting.** If it contains a reusable insight, consolidate it upward first
4. **Plans are not documentation.** Implemented plan = delete. The code IS the doc
5. **Ask before mass-deleting.** 5+ files in a chunk → confirm with user first
6. **Don't over-consolidate.** If two docs serve different audiences or purposes, keep both
7. **Git has history.** Deletion is free. Bias toward deletion over "keep just in case"
8. **Learned Rules take precedence.** If the manifest has Learned Rules from a prior run, follow them even if they contradict rules 1-7

## Scope Control

```
/brain-sleep                    # Full run (skips recently-reviewed via manifest)
/brain-sleep --fresh            # Ignore manifest, re-evaluate everything
/brain-sleep --tier=6           # Only T6 (notepads, memory, wip)
/brain-sleep --tier=5,6         # Plans + working memory
/brain-sleep --path=docs/godot  # Only audit a specific path
```

$ARGUMENTS
