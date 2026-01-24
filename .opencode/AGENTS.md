# Project Agents Configuration

## Service Management (Devmux)
- **ALWAYS** use the `devmux` skill for starting, stopping, or debugging services (api, metro, storybook).
- **NEVER** run `pnpm start` or `node server.js` directly for long-running processes.
- **NEVER** try to construct raw `tmux` commands manually. Use `devmux` abstraction.

## Codebase Context
- This is a monorepo using `pnpm` workspaces.
- `app/` contains the Expo/React Native app.
- `packages/` contains shared UI, logic, and configuration.
- `apps/storybook` contains the component library documentation.

## Roadmap System

The project uses a distributed roadmap managed by the **Chronicler** agent. See `.opencode/memory/` for the complete structure.

### Directory Structure

| Path | Purpose |
|------|---------|
| `.opencode/memory/roadmap/active/` | Features currently being built |
| `.opencode/memory/roadmap/completed/{date}/` | Completed features (archived by date) |
| `.opencode/memory/human-tasks/` | Blockers requiring human decision |
| `.opencode/plans/` | Oracle architectural decision documents |
| `.opencode/memory/graph.yaml` | Master knowledge graph (auto-generated) |

### "Add to Roadmap" Interpretation Guide

When user says "add this to the roadmap", use this decision tree:

| Context | Action |
|---------|--------|
| New feature/work to track | Create `.opencode/memory/roadmap/active/{name}.md` |
| Blocker requiring human decision | Create `.opencode/memory/human-tasks/ht-XXX.md` |
| Architectural decision to record | Create `.opencode/plans/{date}-{topic}-oracle.md` |
| Completed work | Update status and archive to `roadmap/completed/{date}/` |
| Checkbox-based task list | Use the **Prometheus** format (see `.opencode/plans/` examples) |

### Document Types

**1. Active Feature** (`.opencode/memory/roadmap/active/{name}.md`):
```markdown
# Feature Name

**Status**: Active | **Priority**: High/Medium/Low
**Started**: YYYY-MM-DD

## Description
Brief overview of what this feature does.

## Progress
- [x] Completed task 1
- [ ] Pending task 2
- [ ] Blocked task 3 (by ht-XXX)

## Human Tasks
- ht-XXX: Description (blocks task 3)
```

**2. Human Task** (`.opencode/memory/human-tasks/ht-XXX.md`):
```markdown
# ht-XXX: Task Title

**Priority**: High/Medium/Low
**Source**: `file:line` or component
**Status**: Open/In Progress|Resolved

## Issue
Description of what needs human decision or action.

## Context
Why this is blocking progress.

## Requirements
- What needs to be decided/built
```

**3. Oracle Plan** (`.opencode/plans/{date}-{topic}-oracle.md`):
```markdown
# Oracle Consultation: Topic

**Date**: YYYY-MM-DD
**Status**: completed

## Question
What architectural decision was needed.

## Analysis
Options considered and reasoning.

## Decision
The chosen approach with justification.

## Consequences
What this enables and any trade-offs.
```

### Querying the Roadmap

To understand current state:
```bash
# Run chronicler bootstrap --deep to regenerate graph.yaml
# Or manually read:
cat .opencode/memory/graph.yaml
ls .opencode/memory/roadmap/active/
ls .opencode/memory/human-tasks/
```

### Chronicler Commands

| Command | Action |
|---------|--------|
| `/chronicler` or `sync` | Quick scan of plans, update graph.yaml |
| `/chronicler bootstrap --deep` | Full repo scan, rebuild graph.yaml |
| `/chronicler audit` | Find inconsistencies, propose cleanup |

---

## Established Patterns

### Platform-Specific Modules
When code needs different implementations for web vs. native:

```
src/
  utils/
    index.ts          # Unified exports
    platform.ts       # Shared logic
    platform.web.ts   # Web-specific (React Native Web)
    platform.native.ts # Native-specific (iOS/Android)
```

**Usage**: Import from `index.ts` - the platform-appropriate file loads automatically via Metro bundler resolution.

### Asset Pipeline Debug Output
When debugging asset generation, save intermediate files to:
```
api/debug-output/{gameId}/{assetId}/
  1-original.png      # Input image
  2-masked.png        # After masking
  3-silhouette.png    # Silhouette result
  4-final.png         # Final output
  metadata.json       # Generation parameters
```

This enables visual inspection at each pipeline stage.
