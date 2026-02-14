# Self-Improving Agent System

## Goal

Make the agent system automatically learn and improve from every session — without manual commands like `/diary` or `/reflect`. Knowledge flows into skills and AGENTS.md as a natural byproduct of working.

## Current State

| Asset | Location | Status |
|-------|----------|--------|
| Skill Self-Improvement | `AGENTS.md` lines 200-215 | Reactive only — triggers on explicit user correction |
| `/diary` command | `~/.claude/commands/diary.md` | Manual, rarely used |
| `/reflect` command | `~/.claude/commands/reflect.md` | Manual, rarely used — updates global AGENTS.md only |
| `/brain-sleep` command | `.opencode/commands/brain-sleep.md` | Batch doc audit — too heavy for session-level learning |
| Global AGENTS.md | `~/.config/opencode/AGENTS.md` | Auto-generated from reflect, last updated 2026-01-27 |
| 25 project skills | `.claude/skills/` | ~70% have `## Gotchas` sections, inconsistent format |
| opencode-mem | `~/.config/opencode/opencode-mem.jsonc` | `autoCaptureEnabled: true` — extracts knowledge automatically |

## Changes

### Change 1: Delete `/diary` and `/reflect` commands

**Files to delete:**
- `~/.claude/commands/diary.md`
- `~/.claude/commands/reflect.md`

**Rationale:** These are manual commands that never get invoked. The self-improvement loop replaces them. The `opencode-mem` auto-capture system already handles raw knowledge extraction. What's missing is the **skill update** loop, not the diary.

**Also delete/update:**
- `~/.claude/hooks/pre-compact.sh` — auto-triggers `/diary` before compaction. Delete this hook entirely.
- `~/.config/opencode/skill/oh-my-opencode/SKILL.md` lines 47-48 — remove `chronicler` and `reflector` agent definitions from the agent table
- Global AGENTS.md line 3: remove "*Auto-generated from diary reflections*" header

**Leave as archives (don't delete historical data):**
- `~/.claude/memory/diary/` (~15 session entries)
- `~/.claude/memory/reflections/` (1 reflection + processed.log)
- `~/.opencode/memory/diary/` (OpenCode session entries)

---

### Change 2: Rewrite AGENTS.md § "Skill Self-Improvement" → "Continuous Self-Improvement"

**Replace lines 200-215** with an expanded section that covers three behaviors:

#### A. Immediate Skill Correction (during work)

When you discover that information in a loaded skill is **wrong or outdated**:

1. Fix the incorrect information in-place immediately — don't wait
2. If you read a file path from a skill and it doesn't exist, grep for where it moved and update the skill
3. If a skill says "use X pattern" but the codebase has migrated to Y, update the skill to Y
4. Commit: `docs: update {skill} — {what changed}`

**Triggers:**
- Skill says file is at path A, but it's at path B
- Skill describes a pattern that no longer matches the code
- Skill references a type/interface/function that was renamed or deleted
- You try the skill's recommended approach and it fails due to codebase changes

#### B. Learning Capture (during work)

When you discover something through trial-and-error or research that a skill *should have told you*:

1. Identify which skill covers this domain (check `.claude/skills/INDEX.md`)
2. Add the learning to that skill's `## Gotchas` section using format: `- **{Issue}**: {explanation} → {fix/workaround}`
3. If no matching skill exists and the learning is cross-cutting, add to AGENTS.md § "Learned Patterns & Gotchas"
4. If no matching skill exists and the learning is domain-specific + substantial (3+ useful facts), create a new skill stub
5. Commit: `docs: add learned pattern to {skill}`

**Triggers:**
- You tried 2+ approaches before finding the right one
- You had to explore/grep for something that prior knowledge would have answered
- You hit a gotcha that will definitely recur (e.g., "this API silently fails when...")
- User corrects you about project-specific behavior

#### C. End-of-Session Reflection (before signing off)

Before your final response in any session where you did substantial work (created/edited 3+ files, or worked for 10+ tool calls), do a quick self-check:

1. **Scan for learnings:** Did I discover anything that isn't in our skills?
2. **Scan for corrections:** Did the user correct me about something? Did I correct myself?
3. **Scan for stale info:** Did any skill I loaded have wrong or outdated information?

If YES to any:
- Apply changes (A or B above) if not already done during the session
- Mention briefly what you updated: "Updated {skill} with {learning}" (one line, no ceremony)

If NO to all:
- Say nothing. Don't reflect for the sake of reflecting.

**Cost budget:** This step should take < 30 seconds and 0-2 tool calls. If there's nothing to update, skip entirely.

---

### Change 3: Add § "Skill Auto-Loading Protocol" to AGENTS.md

Insert after the "Project Context" table (after line 116):

```markdown
## Skill Auto-Loading Protocol

Before starting domain-specific work, proactively load the relevant skill:

1. Check the domain table above OR scan `.claude/skills/INDEX.md` for keyword matches
2. Load the skill BEFORE writing code — not after you're stuck
3. If the skill's "When to Use" keywords don't match your task but the content would help, that's a signal to update the skill's trigger keywords

### Auto-Loading Triggers

| You're about to... | Load skill |
|---------------------|------------|
| Touch physics config or collision | `physics` |
| Write or modify a game definition | `game-authoring` + relevant sub-skills |
| Work with the Godot bridge | `bridge-development` |
| Modify the editor UI | `editor-system` |
| Write/modify tRPC routes | `testing-patterns` (for test requirements) |
| Work with D1/R2/Supabase | `storage-ops` |
| Touch native build config | `native-infrastructure` |
| Modify chat/streaming | `agent-orchestration` |
| Generate or modify assets | `asset-pack-generation` |
| Work with sounds | `sound-generation` |

If you find yourself grepping for something that a loaded skill should have answered, that skill has a gap. Fill it (Change 2B above).
```

---

### Change 4: Update global AGENTS.md header

**File:** `~/.config/opencode/AGENTS.md`

Remove the diary-reference header. Change line 1-2 from:
```
*Auto-generated from diary reflections. Last updated: 2026-01-27*
```
To:
```
*User preferences. Updated automatically from session learnings.*
```

---

### Change 5: (Optional) Standardize skill Gotchas sections

Not blocking, but recommended as a follow-up `/brain-sleep` task:

- Skills without a `## Gotchas` section get one added (empty, ready for entries)
- Existing sections keep their format (don't churn working content)
- Standard format for new entries: `- **{Issue}**: {explanation} → {fix}`

**Skills currently missing Gotchas sections (8):**
- `economy-engine.md`
- `economy-iap.md`
- `game-authoring.md`
- `godot-engine.md`
- `native-infrastructure.md`
- `sound-generation.md`
- `agent-orchestration.md`
- `INDEX.md` (skip — index file)

---

## What This Does NOT Change

- `/brain-sleep` — still useful for batch doc audits, stays as-is
- `opencode-mem` auto-capture — orthogonal, keeps running
- Skill file format — no structural migration, just additive
- Global AGENTS.md — still the place for cross-project preferences (just remove diary ref)

## Implementation Order

1. Write the new AGENTS.md sections (Changes 2 + 3)
2. Update global AGENTS.md header (Change 4)  
3. Delete diary + reflect commands (Change 1)
4. Optionally add empty Gotchas sections to 7 skills (Change 5)

## Success Criteria

- Agent proactively loads skills before domain work (not after getting stuck)
- Agent fixes stale skill info the moment it discovers it (not on next brain-sleep)
- Agent captures novel learnings into skills during normal work
- End-of-session reflection is invisible when there's nothing to learn (~80% of sessions)
- No manual commands needed — the loop is fully automatic
