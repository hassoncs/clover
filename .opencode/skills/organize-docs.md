# Skill: Organize Documentation

Systematically clean up, verify, and organize all markdown documentation in this repository.

---

## Scope

**INCLUDE:**
- `/docs/**/*.md`
- `/.opencode/**/*.md` 
- `/.sisyphus/**/*.md`
- Root-level `*.md` files
- `/app/*.md`, `/godot_project/**/*.md`

**EXCLUDE (never touch):**
- `/packages/docs/**` (auto-generated API docs - ~1400 files)
- `node_modules/`
- Any `README.md` inside `ios/` or `android/` folders (Fastlane auto-generated)

---

## Classification Reference

| Type | Criteria | Action |
|------|----------|--------|
| **Completed Plan** | In `completed/` folder, or contains "✅ COMPLETE", "DONE", describes past-tense work | **DELETE** |
| **Stale Plan** | In `plans/`, `drafts/`, `roadmap/` with no recent activity, references merged PRs, or describes work that's clearly done | **DELETE** |
| **Temporal/Daily** | Filename contains date like `TODAY_2026-01-26.md`, session logs, diary entries | **DELETE** |
| **Reference** | Describes how something works, architecture, API usage | **KEEP**, verify accuracy |
| **Decision Record** | Documents why a choice was made | **KEEP** |
| **Guide** | How-to instructions, setup docs | **KEEP**, verify still works |
| **Active Plan** | In-progress work with clear next steps | **KEEP** |
| **Entry Point** | `AGENTS.md`, `CLAUDE.md`, `INDEX.md` | **KEEP** |

---

## Phase 1: Bulk Deletion (Do All at Once)

Delete all of the following in one pass - no auditing needed, these are categorically deletable:

```bash
# 1. Everything in completed/ directories
find . -path "*/completed/*" -name "*.md" -not -path "*/node_modules/*" -not -path "*/packages/docs/*" -delete

# 2. Diary/session logs
find . -path "*/diary/*" -name "*.md" -not -path "*/node_modules/*" -delete

# 3. Notepads (working scratch)
find . -path "*/notepads/*" -name "*.md" -not -path "*/node_modules/*" -delete

# 4. Dated daily files older than 7 days
find . -name "TODAY_*.md" -not -path "*/node_modules/*" -delete
find . -name "*2026-01-[0-2][0-9]*.md" -not -path "*/node_modules/*" -not -path "*/packages/docs/*" -mtime +7 -delete
```

**Before running**: List files first with same commands minus `-delete` to confirm. Then delete all at once.

Report total count deleted and proceed to Phase 2.

---

## Phase 2: Audit Active Plans (Chunked or Subagent)

**This phase requires reading files and checking code - do in chunks or spawn subagents.**

Directories to audit:
- `/.sisyphus/plans/`
- `/.sisyphus/drafts/`
- `/.opencode/memory/roadmap/active/`
- `/.opencode/memory/roadmap/plans/`

### Per-file process:
1. Read the plan file
2. Identify what it claims to implement
3. Check if that code/feature exists in the codebase
4. If done → DELETE
5. If still needed → KEEP
6. If unclear → FLAG

### Subagent approach (preferred):
```
Spawn a subagent for each directory:
- "Audit /.sisyphus/plans/ - for each file, verify if the planned work is done. Delete completed plans, keep active ones."
- "Audit /.sisyphus/drafts/ - same process"
- etc.
```

### Manual chunk approach:
Process max 5 files at a time, report, then continue.

---

## Phase 3: Audit /docs/ (Chunked or Subagent)

**This phase requires reading docs and verifying code references - do in chunks or spawn subagents.**

### Subagent approach (preferred):

Spawn one subagent per subdirectory:

```
"Audit /docs/architecture/ - verify each doc's code references exist, fix inaccuracies, delete obsolete files"

"Audit /docs/game-engine-architecture/ - same process"

"Audit /docs/game-maker/ - same process"

"Audit /docs/asset-generation/ - same process"

"Audit /docs/game-inspector/ - same process"

"Audit /docs/economy/ - same process"

"Audit /docs/plans/ - verify if plans are done, delete completed ones"
```

For root `/docs/*.md` files, process directly or spawn one subagent for all of them.

### Per-file audit process:
1. Skim content for code references (file paths, function names, imports)
2. Spot-check 2-3 references actually exist
3. If file is mostly wrong → DELETE
4. If minor issues → FIX inline
5. If major issues but valuable content → FLAG with `<!-- NEEDS_VERIFICATION: [issue] -->`

---

## Phase 4: Consolidation (After Audits Complete)

Look for merge opportunities in `/docs/`:
- Multiple `asset-generation-*.md` files → merge into one
- Multiple `*-complete.md` or `*-summary.md` → likely redundant
- Files <200 words → should be sections in larger docs

Propose merges, get confirmation, execute.

---

## Phase 5: Final Report

Create `/.sisyphus/reports/docs-cleanup-[DATE].md`:

```markdown
# Docs Cleanup Report - [DATE]

## Summary
- Bulk deleted: X files (completed, diary, notepads, dated)
- Audit deleted: Y files (stale plans, obsolete docs)
- Verified/updated: Z files
- Flagged for review: W files

## Bulk Deletions
- /.sisyphus/completed/* (N files)
- /.opencode/memory/diary/* (N files)
- etc.

## Audit Deletions
- [file]: [reason]

## Updated
- [file]: [what changed]

## Flagged
- [file]: [concern]

## Merges
- [files] → [merged file]
```

---

## Key Principles

1. **Delete aggressively** - Git has history
2. **Bulk delete what's categorically stale** - No need to read completed/ files
3. **Audit in chunks/subagents** - Verification requires context
4. **No archives** - Delete, don't move
5. **Subagents are preferred** - They have fresh context for each directory
