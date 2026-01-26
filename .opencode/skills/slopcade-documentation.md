# Slopcade Project Documentation System

> **Trigger**: When user says "add to roadmap", "add to todo", "document this", "work on today", "what's next", or when organizing/creating project documentation.
>
> **Purpose**: Unified system for managing docs, roadmaps, todos, human tasks, and daily plans across the Slopcade project.

---

## Overview

Slopcade uses a **three-tier documentation system**:

1. **Product Documentation** (`docs/`) - User-facing, component-specific, evergreen knowledge
2. **Project Management** (`.opencode/memory/`) - Roadmaps, tasks, active work tracking
3. **Daily Operations** (`docs/TODAY_*.md`) - Temporal daily/weekly plans

All three tiers follow strict organizational rules and must stay synchronized.

---

## Tier 1: Product Documentation (`docs/`)

### Structure

```
docs/
├── INDEX.md                    # Navigation hub for ALL docs
├── TODAY_YYYY-MM-DD.md         # Daily plan (temporal, lives here for visibility)
├── LAUNCH_ROADMAP.md           # High-level launch strategy
├── shared/                     # Cross-cutting project docs
│   ├── guides/                 # How-to tutorials (evergreen)
│   ├── reference/              # APIs, configs (evergreen)
│   ├── troubleshooting/        # Problem → solution (evergreen)
│   ├── log/YYYY/               # Status updates (temporal, archived)
│   └── plans/                  # Cross-component plans (temporal)
├── game-maker/                 # AI generation subsystem
│   ├── INDEX.md
│   ├── guides/
│   ├── reference/
│   ├── architecture/
│   ├── decisions/              # ADRs (permanent)
│   ├── research/               # Investigations (temporal)
│   ├── planning/               # Feature plans (temporal)
│   └── templates/              # Game templates catalog
├── asset-generation/           # Scenario.com integration
│   ├── INDEX.md
│   ├── guides/
│   ├── reference/
│   └── CONTINUATION.md         # Current work status
├── gallery-system/             # UI galleries for engine
│   ├── INDEX.md
│   └── GALLERY_MASTER_PLAN.md
└── archive/                    # Historical/deprecated docs
```

### Document Types & Placement Rules

| Type | Purpose | Lifecycle | Naming | Location |
|------|---------|-----------|--------|----------|
| **guides/** | "How to do X" tutorials | Evergreen | `{action}-{subject}.md` | Any component |
| **reference/** | APIs, configs, lookups | Evergreen | `{subject}-{type}.md` | Any component |
| **architecture/** | System design docs | Evergreen | `{system}-architecture.md` | Component-specific |
| **decisions/** | ADRs ("we chose X") | Permanent | `{decision-topic}.md` | Component-specific |
| **troubleshooting/** | Symptoms → fixes | Evergreen | `{problem}-solution.md` | Any component |
| **research/** | Investigations | Temporal | `{topic}-investigation.md` | Component-specific |
| **planning/** | Feature roadmaps | Temporal | `{feature}-plan.md` | Component-specific |
| **templates/** | Reusable patterns | Evergreen | `{template-name}.md` | game-maker only |
| **log/** | Status updates | Temporal | `YYYY-MM-DD-{event}.md` | shared/log/YYYY/ |
| **archive/** | Outdated content | Archived | (original name) | docs/archive/ |

### Temporal Document Requirements

**All temporal docs MUST have YAML frontmatter:**

```yaml
---
status: draft | active | implemented | archived | abandoned
created: YYYY-MM-DD
updated: YYYY-MM-DD
owner: (optional)
related:
  - path/to/related-doc.md
---
```

**Closure rules:**
- `research/` docs → Must end with "Outcome" + link to resulting guide/ADR, OR "Open Questions" if ongoing
- `planning/` docs → When `status: implemented`, promote sections to guides/reference and move to archive
- `log/` docs → Never close, purely historical record

### Discoverability Rule

**Every document MUST be linked from an INDEX.md file.**

- Component docs → Component's INDEX.md
- Shared docs → docs/INDEX.md
- If not linked → Either add link or delete doc

---

## Tier 2: Project Management (`.opencode/memory/`)

### Structure

```
.opencode/
├── AGENTS.md                   # Project conventions (roadmap system documented here)
├── memory/
│   ├── ROADMAP.md              # Master roadmap (links to everything)
│   ├── graph.yaml              # Auto-generated knowledge graph
│   ├── chronicler-log.md       # Chronicler audit trail
│   ├── roadmap/
│   │   ├── active/             # Features currently being built
│   │   │   ├── {feature}.md    # One file per active feature
│   │   │   └── ...
│   │   ├── completed/YYYY-MM/  # Archived completed features
│   │   │   └── ...
│   │   └── plans/              # Cross-feature strategic plans
│   ├── human-tasks/            # Blockers requiring human decision
│   │   ├── ht-001.md           # Sequential numbering
│   │   ├── ht-002.md
│   │   └── ...
│   └── patterns/               # Discovered patterns/conventions
│       └── pattern-XXX.md
└── plans/                      # Oracle architectural decisions
    ├── YYYY-MM-DD-{topic}-oracle.md
    └── ...
```

### Document Types

#### 1. Active Feature (`.opencode/memory/roadmap/active/{feature}.md`)

**Purpose**: Track progress on a multi-step feature being actively developed.

**When to create**:
- User says "add {feature} to roadmap"
- Feature requires >5 tasks or >1 week of work
- Feature has dependencies or blockers

**Template**:
```markdown
# Feature Name

**Status**: Active | **Priority**: High/Medium/Low  
**Started**: YYYY-MM-DD  
**Blocks**: (optional - what depends on this)

---

## Description
Brief overview of what this feature does and why it's needed.

---

## Progress

### Phase 1: {Phase Name} (Started YYYY-MM-DD)
- [x] Completed task 1
- [x] Completed task 2
- [ ] Pending task 3
- [ ] Blocked task 4 (by ht-XXX)

### Phase 2: {Phase Name} (⏳ TODO)
- [ ] Task 1
- [ ] Task 2

---

## Human Tasks

- **ht-XXX**: Description (blocks Phase 1 Task 4)

---

## Key Files

### New Files
- `path/to/new/file.ts`
- `path/to/another/file.ts`

### Modified Files
- `path/to/existing/file.ts` (add X functionality)

---

## Dependencies

- **Blocks**: Feature Y, Feature Z
- **Depends On**: Feature A (completed), Feature B (in progress)
- **Related**: .opencode/plans/YYYY-MM-DD-architecture-oracle.md

---

## Testing Checklist

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing on iOS
- [ ] Manual testing on Android
- [ ] Manual testing on Web

---

## Completion Criteria

Feature is DONE when:
- [ ] All phases completed
- [ ] All tests passing
- [ ] Documentation updated in docs/
- [ ] No open human tasks blocking this feature

---

## Success Metrics

- Metric 1: Target value
- Metric 2: Target value

---

## References

- [Related Doc](../../docs/path/to/doc.md)
- [ADR](../../docs/game-maker/decisions/decision-name.md)
```

**Lifecycle**:
1. Create when feature starts
2. Update checkboxes as tasks complete
3. When `status: completed`:
   - Promote key sections to `docs/` (guides/reference)
   - Archive to `.opencode/memory/roadmap/completed/YYYY-MM/`
   - Update `ROADMAP.md` to mark completed
   - Link from `ROADMAP.md` to archived location

---

#### 2. Human Task (`.opencode/memory/human-tasks/ht-XXX.md`)

**Purpose**: Document blockers requiring human decision or action.

**When to create**:
- Hit a fork in the road requiring strategic decision
- Missing external input (API keys, design mockups, etc.)
- Architectural choice with significant trade-offs
- Implementation blocker outside AI scope

**Numbering**: Sequential (ht-001, ht-002, ...). Check existing files first.

**Template**:
```markdown
# ht-XXX: Task Title

**Priority**: High/Medium/Low  
**Source**: `file:line` or component  
**Status**: Open | In Progress | Resolved  
**Created**: YYYY-MM-DD

---

## Issue

Description of what needs human decision or action.

---

## Context

Why this is blocking progress. What have we tried? What's the current state?

---

## Requirements

What needs to be decided/built/provided:
- Requirement 1
- Requirement 2

---

## Options (if applicable)

| Option | Pros | Cons |
|--------|------|------|
| A: {Description} | ... | ... |
| B: {Description} | ... | ... |
| C: {Description} | ... | ... |

---

## Decision Criteria

What factors should guide this decision?
- Criterion 1
- Criterion 2

---

## Related Files

- `path/to/blocking/file.ts`
- `.opencode/memory/roadmap/active/{blocked-feature}.md`

---

## Resolution (fill when resolved)

**Decision**: (what was decided)

**Rationale**: (why)

**Action Items**:
- [ ] Task 1
- [ ] Task 2

**Status**: Resolved on YYYY-MM-DD
```

**Lifecycle**:
1. Create when blocker discovered
2. Update `Status` field as progress made
3. When resolved:
   - Fill "Resolution" section
   - Update `Status: Resolved`
   - Update blocking feature docs to unblock tasks
   - Keep file (permanent record)

---

#### 3. Oracle Plan (`.opencode/plans/YYYY-MM-DD-{topic}-oracle.md`)

**Purpose**: Record architectural decisions made via Oracle consultation.

**When to create**:
- After consulting Oracle agent on architecture
- When significant design decision needs documentation
- To record "why we chose X over Y"

**Template**:
```markdown
# Oracle Consultation: {Topic}

**Date**: YYYY-MM-DD  
**Status**: completed | active | abandoned

---

## Question

What architectural decision was needed.

---

## Analysis

Options considered and reasoning.

### Option A: {Description}
**Pros**:
- ...

**Cons**:
- ...

### Option B: {Description}
**Pros**:
- ...

**Cons**:
- ...

---

## Decision

The chosen approach with justification.

---

## Consequences

What this enables:
- ...

Trade-offs:
- ...

---

## Implementation Notes

Key points for developers:
- ...

---

## References

- [Related ADR](../docs/game-maker/decisions/decision-name.md)
- [Implementation](../path/to/implementation.ts)
```

**Lifecycle**:
1. Create during/after Oracle consultation
2. Set `status: completed` when decision made
3. Create corresponding ADR in `docs/{component}/decisions/` for evergreen reference
4. Keep file permanently (audit trail)

---

#### 4. Master Roadmap (`.opencode/memory/ROADMAP.md`)

**Purpose**: Single source of truth linking all active work, completed features, and human tasks.

**Structure**:
```markdown
# Slopcade Project Roadmap

**Last Updated**: YYYY-MM-DD
**Status**: Active Development

---

## Executive Summary

Brief project overview and current focus.

**LAUNCH TARGET**: [docs/LAUNCH_ROADMAP.md](../../docs/LAUNCH_ROADMAP.md)

---

## Today's Focus (YYYY-MM-DD)

**Current Sprint**: {Sprint Name}

See detailed plan: [docs/TODAY_YYYY-MM-DD.md](../../docs/TODAY_YYYY-MM-DD.md)

**Top Priorities**:
1. Priority 1
2. Priority 2
3. Priority 3

---

## Active Features

### 1. {Feature Name}

**Status**: 🟡 X% complete  
**Priority**: High  
**Started**: YYYY-MM-DD

#### Objective
What this feature does.

#### Progress (X/Y tasks)
- [x] Task 1
- [ ] Task 2

#### Documentation
- [Active Feature Doc](roadmap/active/{feature}.md)
- [Related Docs](../../docs/...)

---

## Completed Features (Recent)

| Feature | Completed | Status | Documentation |
|---------|-----------|--------|---------------|
| Feature A | 2026-01-24 | ✅ Done | [Link](roadmap/completed/2026-01/{feature}.md) |

---

## Human Tasks (Blockers)

### ht-XXX: {Task Title}

**Priority**: High  
**Status**: Open

Brief description. [Full details](human-tasks/ht-XXX.md)

---

## Architectural Decisions (Oracle Plans)

### Completed Decisions (X total)

| Date | Decision | Summary |
|------|----------|---------|
| 2026-01-22 | Decision Name | Brief summary |

#### Archived Plans
All plans stored in `.opencode/plans/`.

---

## Next Steps

### Immediate (This Week)
1. Task 1
2. Task 2

### Short-Term (This Month)
3. Task 3
4. Task 4
```

**Update frequency**: 
- Daily during active development
- After completing/starting features
- When creating/resolving human tasks

---

## Tier 3: Daily Operations (`docs/TODAY_*.md`)

### Purpose

Temporal daily/weekly work plans that are **highly visible** to users (live in `docs/` not `.opencode/`).

### When to Create

- User says "what should we work on today"
- User provides brain dump of tasks
- Starting a new work session
- Beginning of sprint/week

### Naming Convention

`docs/TODAY_YYYY-MM-DD.md` (always date-suffixed)

### Template

```markdown
# Today's Plan: {Brief Description}

**Date**: YYYY-MM-DD  
**Priority**: {Overall focus}

---

## High Priority: {Category}

### 1. {Task Name} ⚡ URGENT
Description of task.

- [ ] Subtask 1
- [ ] Subtask 2
- [ ] Subtask 3

**Files to check**:
- `path/to/file.ts`

**Expected outcome**: What success looks like.

---

## Medium Priority: {Category}

### 2. {Task Name} 🔧
Description.

- [ ] Subtask 1
- [ ] Subtask 2

---

## Meta Tasks

### X. Document Integration
Update roadmap documents with today's findings.

- [ ] After {Task N}, update `docs/{path}/doc.md`
- [ ] Create new active roadmap doc if needed

---

## Completion Criteria

**Today is successful if**:

✅ Criterion 1  
✅ Criterion 2  
✅ Criterion 3

---

## Parking Lot (Not Today)

These are important but can wait:
- Deferred item 1
- Deferred item 2

---

## Notes

- Contextual notes
- Links to related docs
- Questions to revisit
```

### Lifecycle

1. **Create** at start of day/session
2. **Update** checkboxes as work progresses
3. **Don't delete** - Keep as historical record
4. **Reference** from future TODAY docs ("Last session: ...")

### Integration with Roadmap

At end of day:
- Completed tasks → Update `.opencode/memory/roadmap/active/` features
- New discoveries → Create human tasks if needed
- Strategic decisions → Create Oracle plans
- Update `ROADMAP.md` "Today's Focus" for next day

---

## User Intent Parsing

When user says various phrases, here's what to do:

| User Says | Action |
|-----------|--------|
| "Add {X} to roadmap" | Create `.opencode/memory/roadmap/active/{x}.md` |
| "Add {X} to todo" | Add to current `docs/TODAY_*.md` or create if missing |
| "Work on {X} today" | Add to current `docs/TODAY_*.md` as high priority |
| "What should we work on today?" | Review `ROADMAP.md` → Create/update `docs/TODAY_*.md` |
| "What's next?" | Review `ROADMAP.md` Active Features → Suggest next task from highest priority incomplete feature |
| "Document this" | Determine doc type → Place in appropriate `docs/` location |
| "This is a blocker" | Create `.opencode/memory/human-tasks/ht-XXX.md` |
| "Add this decision" | Create `.opencode/plans/YYYY-MM-DD-{topic}-oracle.md` |
| "Update roadmap" | Update `.opencode/memory/ROADMAP.md` + relevant active feature docs |

---

## Workflow: Processing User Brain Dumps

When user provides unstructured task list:

### Step 1: Parse & Categorize

```
User input:
"We need to validate puzzle games, test BLE, add credit system, 
polish UI, hide labs tab, and figure out landing page."
```

**Categorize by**:
- **Urgency**: High (blocks launch) vs Medium (polish) vs Low (future)
- **Type**: Validation, Implementation, Decision, Research
- **Duration**: <1 hour (quick), 1-4 hours (medium), >4 hours (large)

### Step 2: Determine Document Location

| Task Scope | Document |
|------------|----------|
| Single-day tasks | `docs/TODAY_YYYY-MM-DD.md` |
| Multi-day feature (>5 tasks) | `.opencode/memory/roadmap/active/{feature}.md` |
| Blocker/decision needed | `.opencode/memory/human-tasks/ht-XXX.md` |
| Strategic planning | `docs/LAUNCH_ROADMAP.md` or `.opencode/plans/` |

### Step 3: Structure Output

1. **Create TODAY doc** with all single-day/quick tasks
2. **Create/update Active Feature docs** for multi-day work
3. **Create Human Task docs** for blockers
4. **Update ROADMAP.md** "Today's Focus" section
5. **Open TODAY doc in VS Code** for visibility

### Step 4: Integrate & Cross-Reference

- TODAY doc references active features
- Active features reference human tasks
- ROADMAP links to all above
- All docs reference related docs in `docs/`

---

## Workflow: "What's Next?" Query

When user asks "what should we work on next":

### Step 1: Check Current State

```bash
# Check active features
ls .opencode/memory/roadmap/active/

# Check human tasks
ls .opencode/memory/human-tasks/

# Check today's plan
ls docs/TODAY_*.md | tail -1
```

### Step 2: Prioritize

1. **Urgent blockers**: Open human tasks with Priority: High
2. **High-priority features**: Active features with Priority: High + incomplete tasks
3. **Medium-priority features**: Active features with Priority: Medium
4. **Polish/enhancement**: Low priority or nice-to-have items

### Step 3: Present Options

```markdown
## Recommended Next Steps

Based on the roadmap, here are your top options:

### Option A: Unblock {Feature X} (Recommended)
- **Why**: Blocks 2 other features
- **Tasks**:
  1. Resolve ht-XXX ({decision needed})
  2. Implement solution (2-3 hours)
- **Impact**: Unblocks Feature Y and Feature Z

### Option B: Continue {Feature Y}
- **Why**: 80% complete, momentum is high
- **Tasks**:
  1. Complete Phase 2 Task 3 (1 hour)
  2. Complete Phase 2 Task 4 (2 hours)
- **Impact**: Ship complete feature

### Option C: Start {Feature Z}
- **Why**: High priority, no dependencies
- **Tasks**:
  1. Create DB schema (1 hour)
  2. Implement cost estimator (2 hours)
- **Impact**: Foundation for credit system

Which would you like to tackle?
```

---

## Workflow: Documentation Pruning

Run periodically (monthly) to keep docs organized:

### Step 1: Identify Stale Temporal Docs

```bash
# Find research docs without "Outcome" or "Open Questions"
# Find planning docs with status: implemented but not archived
# Find log entries older than 6 months
```

### Step 2: Archive or Promote

| Doc Type | Action |
|----------|--------|
| `research/` with Outcome | Promote findings to guide/reference, archive original |
| `planning/` status: implemented | Promote sections to guide, archive original |
| `log/` older than 6 months | Move to `docs/archive/log/YYYY/` |
| Completed Oracle plans | Keep in place (permanent record) |

### Step 3: Verify Links

```bash
# Check all docs are linked from INDEX.md files
# Update broken links
# Remove links to archived docs (keep archive links in INDEX)
```

### Step 4: Update ROADMAP.md

- Move completed features to "Completed" section
- Archive old completed features to `.opencode/memory/roadmap/completed/YYYY-MM/`
- Update "Active Features" count
- Update "Last Updated" date

---

## Workflow: Feature Completion

When a feature is complete:

### Step 1: Update Active Feature Doc

```markdown
**Status**: ✅ Complete  
**Completed**: YYYY-MM-DD

## Completion Summary
- What was delivered
- Final metrics
- Links to key files
```

### Step 2: Promote Key Sections to docs/

- Implementation guides → `docs/{component}/guides/`
- API references → `docs/{component}/reference/`
- Architecture decisions → `docs/{component}/decisions/`

### Step 3: Archive

```bash
# Move to completed archive
mv .opencode/memory/roadmap/active/{feature}.md \
   .opencode/memory/roadmap/completed/YYYY-MM/
```

### Step 4: Update ROADMAP.md

- Move from "Active Features" to "Completed Features (Recent)"
- Update progress counts
- Check if any human tasks can now be resolved

### Step 5: Update Dependencies

- Check if this unblocks other features
- Update blocked feature docs
- Create new TODAY doc if next feature is ready

---

## Anti-Patterns

| Don't | Do Instead |
|-------|------------|
| Create TODO.md or TASKS.md | Use `docs/TODAY_YYYY-MM-DD.md` |
| Put roadmap in `docs/roadmap/` | Use `.opencode/memory/roadmap/` |
| Create ad-hoc task lists in random files | Centralize in TODAY doc or active feature doc |
| Skip updating ROADMAP.md | Update after every feature start/complete |
| Create unnumbered human tasks | Use sequential ht-XXX numbering |
| Archive active human tasks | Keep all human tasks (permanent record) |
| Put temporal docs in guides/ | Use research/, planning/, or log/ |
| Create docs without frontmatter (if temporal) | Always add status, dates |
| Skip linking from INDEX.md | Every doc must be discoverable |

---

## Quick Reference Cheat Sheet

### "Add to roadmap"
→ Create `.opencode/memory/roadmap/active/{feature}.md`  
→ Update `.opencode/memory/ROADMAP.md`

### "Add to todo" / "Work on today"
→ Add to `docs/TODAY_YYYY-MM-DD.md`  
→ Create if doesn't exist

### "This is a blocker"
→ Create `.opencode/memory/human-tasks/ht-XXX.md`  
→ Link from blocking feature doc

### "Document this decision"
→ Create `.opencode/plans/YYYY-MM-DD-{topic}-oracle.md`  
→ Create ADR in `docs/{component}/decisions/` for reference

### "What's next?"
→ Read `.opencode/memory/ROADMAP.md`  
→ Check active features with Priority: High  
→ Check open human tasks  
→ Suggest 2-3 options with rationale

### "Update docs"
→ Check temporal docs for closure  
→ Promote completed work to guides/reference  
→ Update ROADMAP.md  
→ Archive completed features

---

## Integration with Existing Systems

### With Chronicler Agent

- Chronicler maintains `graph.yaml` (auto-generated knowledge graph)
- Chronicler logs actions in `chronicler-log.md`
- Run `/chronicler` to sync plans, update graph
- Run `/chronicler bootstrap --deep` for full repo scan

### With Oracle Agent

- Oracle consultations → Create plan in `.opencode/plans/`
- Link plan from relevant active feature doc
- Create ADR in `docs/` for evergreen reference

### With Documentation Skill

- Documentation skill handles `docs/` structure
- This skill (slopcade-documentation) handles `.opencode/memory/` + `docs/` integration
- Both skills must stay synchronized

---

## Success Criteria

This system is working well when:

✅ User can ask "what's next" and get clear prioritized options  
✅ All active work is visible in ROADMAP.md  
✅ Brain dumps become structured TODO docs in <5 minutes  
✅ Completed features are properly archived with breadcrumbs  
✅ Human tasks are tracked and resolved systematically  
✅ No orphaned/undiscoverable documents  
✅ Temporal docs have clear lifecycle and closure  
✅ TODAY docs provide daily focus and historical record  

---

## Maintenance Schedule

- **Daily**: Update TODAY doc, check active features
- **Weekly**: Review human tasks, update ROADMAP.md
- **Monthly**: Prune temporal docs, archive completed features
- **Quarterly**: Run `/chronicler bootstrap --deep`, audit INDEX.md files

---

## References

- [Documentation Skill](.opencode/skills/documentation.md) - Base documentation rules
- [AGENTS.md](.opencode/AGENTS.md) - Roadmap system overview
- [ROADMAP.md](.opencode/memory/ROADMAP.md) - Master roadmap
- [docs/INDEX.md](../../docs/INDEX.md) - Documentation hub
