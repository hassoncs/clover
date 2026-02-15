---
description: "Audit docs against real code, consolidate knowledge upward, prune stale files — like the brain during sleep"
agent: "default"
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

## Phase 3: Plans Deep Analysis (CRITICAL - Do Before File Evaluation)

Plans require special treatment. They accumulate, supersede each other, and often have unclear completion status. This phase runs BEFORE general file evaluation.

### Step 3a: Discover All Plans

```bash
# Find all plans in T5 locations
find .sisyphus/plans -name "*.md" | sort
```

### Step 3b: Read and Categorize Each Plan

For each plan, extract:
1. **Title/Topic** - What is this plan about?
2. **Date** - When was it created? (from filename or frontmatter)
3. **Status** - Completion percentage via checkbox counting
4. **Scope** - What files/modules/components does it touch?
5. **Dependencies** - Does it reference other plans?
6. **Implementation Evidence** - Can you find the implemented code?

### Step 3c: Cross-Reference Analysis (The Key Step)

Build a dependency/overlap graph:

```
Plan A (DATE): "Implement feature X"
  → Plan B (DATE): "Feature X v2" [SUPERSEDES A]
  → Plan C (DATE): "Feature X extension" [EXTENDS B]
```

**Detection Rules:**

| Pattern | Detection Method | Action |
|---------|------------------|--------|
| **Superseded** | Newer plan with same topic + "v2", "revised", "updated" in title | DELETE older plan |
| **Merged** | Plan A's scope fully contained in Plan B | DELETE Plan A |
| **Abandoned** | Plan untouched for 30+ days, no matching code in repo | DELETE (or ASK if uncertain) |
| **Completed** | All checkboxes checked AND code exists | DELETE |
| **Partially Complete** | Some checkboxes checked, code partially exists | ASSESS: Is remaining work still needed? |
| **Active** | Recent edits (<14 days) OR has incomplete critical work | KEEP |

### Step 3d: Implementation Verification

**DO NOT trust checkboxes alone.** Verify:

```bash
# For each "completed" plan:
# 1. Extract key file paths mentioned
# 2. Check if those files exist and have recent changes
# 3. Grep for key function/component names
# 4. If code doesn't exist, plan is NOT complete regardless of checkboxes
```

**Example False Positive:**
```
Plan: "Implement feature X" - 15/15 checkboxes checked
But: `grep -r "featureX" packages/` returns nothing
→ Plan is INCOMPLETE, not complete
```

### Step 3e: Topic Clustering

Group plans by topic to identify redundancy:

```
### Topic Cluster: Authentication
- plan-v1.md (DATE) - SUPERSEDED
- plan-v2.md (DATE) - ACTIVE
- extension-plan.md (DATE) - ACTIVE, EXTENDS v2

### Topic Cluster: Feature Module
- initial-plan.md (DATE) - SUPERSEDED
- phase-1.md (DATE) - COMPLETE
- phase-2.md (DATE) - COMPLETE
- complete-plan.md (DATE) - ACTIVE
```

### Step 3f: Aggressive Deletion Recommendations

After analysis, produce a deletion report:

```markdown
## Plans Deletion Report

### DELETE (Superseded)
| Plan | Reason | Superseded By |
|------|--------|---------------|
| {plan-name}.md | Superseded by newer version | {newer-plan}.md |
| {old-plan}.md | Scope merged into larger plan | {combined-plan}.md |

### DELETE (Completed - Code Exists)
| Plan | Completion % | Evidence |
|------|--------------|----------|
| {plan}.md | 100% | Code exists at {path}/ |
| {plan}.md | 100% | Functions found in {module}/ |

### DELETE (Stale/Abandoned)
| Plan | Last Touched | Evidence of Abandonment |
|------|--------------|-------------------------|
| {plan}.md | {date} | No code, no references in 30+ days |
| {plan}.md | {date} | Speculative, never started |

### KEEP (Active)
| Plan | Status | Next Action |
|------|--------|-------------|
| {plan}.md | {progress}% complete | {remaining work} |
| {plan-dir}/* | In Progress | Multiple active items |

### INVESTIGATE (Uncertain)
| Plan | Why Uncertain | Action Needed |
|------|---------------|---------------|
| {plan}.md | No checkboxes, unclear status | Read and assess |
```

### Step 3g: Execute with Confirmation

**If 5+ plans recommended for deletion:**
1. Show the full deletion report
2. Ask user to confirm or modify
3. Execute deletions
4. Update manifest

**Automatic deletion (no confirmation needed):**
- Plans that are 100% complete AND code exists in repo
- Plans explicitly superseded by newer plans (same topic + newer date)

## Phase 4: Evaluate Each File

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

## Phase 5: Execute (Chunk by Chunk)

Process 8-12 files at a time. For each chunk:

1. Read the files
2. Run freshness tests (fire explore agents in parallel for verification)
3. Classify each: DELETE / EXTRACT+DELETE / UPDATE / KEEP
4. **If 5+ deletions in a chunk: show the list and ask for confirmation**
5. Execute the actions
6. Report: what was deleted, what was kept (1-line reason), what was consolidated (source → destination)

Move to the next chunk.

## Phase 6: Update Manifest

After processing, write/update `.sisyphus/brain-sleep.md`:

```markdown
# Brain Sleep Manifest
Last run: YYYY-MM-DD

## Reviewed Files
| File | Decision | Reason | Date |
|------|----------|--------|------|
| {path}/ | DELETED | Completed task, insight extracted to AGENTS.md | YYYY-MM-DD |
| docs/{file}.md | KEPT | Verified accurate against current code | YYYY-MM-DD |
| docs/{file}.md | DELETED | Code no longer exists | YYYY-MM-DD |

## Skills Created/Updated
| Skill | Action | Source Docs |
|-------|--------|-------------|
| {skill}.md | CREATED | {source docs} |
| {skill}.md | UPDATED | Added {content} from {source} |
| {skill}.md | UPDATED | Added patterns from {source} |

## Consolidated Knowledge
| Source | Destination | Insight |
|--------|-------------|---------|
| {notepad}/ | AGENTS.md § {section} | {brief insight} |
| {notepad}/ | {skill}.md | {brief insight} |
| {notepad}/ | {skill}.md | {brief insight} |

## Stats
- Files reviewed: {N}
- Deleted: {N}
- Kept: {N}
- Updated: {N}
- Insights extracted: {N}
- Skills created: {N}
- Skills updated: {N}
- Coverage: {category} {percent}%, {category} {percent}%

## Coverage Report
| Category | Before | After | Target | Status |
|----------|--------|-------|--------|--------|
| {category} | {percent}% | {percent}% | {percent}% | ✅/⚠️/🔴 {status} |
| {category} | {percent}% | {percent}% | {percent}% | ✅/⚠️/🔴 {status} |

## Plans Analysis Report
### Plans Reviewed: {N}
### Deleted (Superseded): {N} plans
| Plan | Reason | Superseded By |
|------|--------|---------------|
| {plan.md} | {why} | {newer-plan.md} |

### Deleted (Completed): {N} plans
| Plan | Evidence of Implementation |
|------|---------------------------|
| {plan.md} | {code paths that exist} |

### Deleted (Stale/Abandoned): {N} plans
| Plan | Last Touched | Evidence |
|------|--------------|----------|
| {plan.md} | {date} | {why abandoned} |

### Kept (Active): {N} plans
| Plan | Status | Remaining Work |
|------|--------|----------------|
| {plan.md} | {progress} | {what's left} |

### Investigated (Uncertain): {N} plans
| Plan | Issue | Resolution |
|------|-------|------------|
| {plan.md} | {uncertainty} | {what I did} |

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
- **Plans analysis quality**: Did I correctly identify superseded plans? Did I verify implementation before deleting completed plans?

## Learned Rules
<!-- Add rules discovered through running brain-sleep. These override built-in rules when they conflict. -->
<!-- Example: "docs/economy/ files reference API routes by description not path — use symbol check instead of path check" -->
<!-- Example: "T6 notepads never contain extractable insights in this repo — skip extraction step for T6" -->
```

## Phase 7: Self-Critique

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
