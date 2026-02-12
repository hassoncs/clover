# Backlog.md Integration Research & Recommendations

**Date:** 2026-02-12  
**Project:** Slopcade  
**Researcher:** Sisyphus (AI Agent)  
**Context:** Handoff document for Sisyphus system maintainers

---

## Executive Summary

This document captures a complete integration of [Backlog.md](https://github.com/MrLesk/Backlog.md) into the Slopcade project, including workflows, automation, and recommendations for deeper Sisyphus system integration. The goal is to establish Backlog.md as the shared memory between human developers and AI agents.

---

## 1. What Was Implemented

### 1.1 Package Installation
```bash
pnpm add -D -w backlog.md  # v1.35.7
```

Installed as workspace root devDependency. Available via:
- CLI: `backlog` (through node_modules/.bin)
- MCP Server: `backlog mcp start` (configured in .opencode/opencode.json)

### 1.2 Project Initialization
```bash
backlog init "Slopcade" --defaults --integration-mode mcp
```

Created directory structure:
```
backlog/
├── tasks/           # Individual task files (.md)
├── docs/            # Project documentation
├── decisions/       # ADRs (Architecture Decision Records)
├── drafts/          # Work in progress
├── milestones/      # Milestone definitions
├── archive/         # Archived items
├── completed/       # Completed work
├── config.yml       # Backlog configuration
└── Backlog.md       # Auto-generated kanban board
```

### 1.3 MCP Server Configuration

**Location:** `.opencode/opencode.json`

```json
{
  "mcp": {
    "backlog": {
      "type": "local",
      "command": ["backlog", "mcp", "start"]
    }
  }
}
```

**Note:** MCP servers are loaded by OpenCode CLI/TUI, not by Sisyphus agents directly. Agents use the CLI interface.

### 1.4 Devmux Integration

**Location:** `devmux.config.json`

```json
{
  "services": {
    "backlog": {
      "cwd": ".",
      "command": "backlog browser --no-open",
      "health": { "type": "port", "port": 6420 }
    }
  }
}
```

Web UI runs at `http://localhost:6420` — accessible via `devmux ensure backlog`.

### 1.5 Tasks Created

10 tasks imported from project plans:

| ID | Title | Labels | Priority |
|----|-------|--------|----------|
| TASK-3 | Effects System Phase 3: Render ordering | effects | High |
| TASK-4 | Effects System Phase 5: Param introspection | effects | High |
| TASK-5 | AI Bundling: Create validate-bundle CLI | ai-bundling | High |
| TASK-6 | Launch: Jumpy Cat Platformer Polish | launch, games | High |
| TASK-7 | Launch: Economy - RevenueCat IAP | launch, economy | High |
| TASK-8 | Launch: BLE Android Bridge Fix | launch, multiplayer | High |
| TASK-9 | Architecture: Split asset-system.ts | architecture, refactoring | High |
| TASK-10 | Architecture: Split GameRuntime.godot.tsx | architecture, refactoring | High |

### 1.6 Skill Created

**Location:** `.opencode/skills/brain-dump-to-backlog/SKILL.md`

Converts unstructured brain dumps into organized backlog tasks with:
- Automatic categorization (feature/bug/tech-debt/research/polish/infrastructure)
- Priority assignment (critical/high/medium/low)
- Label selection (effects, 3d-engine, launch, architecture, ai-bundling, games, economy, multiplayer, ui-ux, bridge, performance, testing, docs)
- Dependency linking when obvious

---

## 2. Current Workflow

### 2.1 Brain Dump → Tasks

**User says:** "We need to fix the login bug, add dark mode, refactor the API"

**Agent does:**
1. Parse each item
2. Determine type, priority, labels
3. Run: `backlog task create "Title" --desc "..." --priority high -l label`
4. Report: "Created 3 tasks: TASK-11 (critical), TASK-12 (high), TASK-13 (medium)"

### 2.2 Task Management

| Action | Command |
|--------|---------|
| Create task | `backlog task create "Title" --desc "..." --priority high -l label` |
| List tasks | `backlog task list` |
| View task | `backlog task {id}` |
| Edit task | `backlog task edit {id} --status "In Progress"` |
| View board | `backlog board` |
| Web UI | `backlog browser` (or `devmux ensure backlog`) |
| Export | `backlog board export --force` → updates `Backlog.md` |

### 2.3 Board State

```
To Do (8):
  - Effects System Phase 3: Render ordering + external inputs
  - Effects System Phase 5: Param introspection + live shader compilation
  - AI Bundling: Create validate-bundle CLI
  - Launch: Jumpy Cat Platformer Polish
  - Launch: Economy - RevenueCat IAP Integration
  - Launch: BLE Android Bridge Fix
  - Architecture: Split asset-system.ts (2,231 lines)
  - Architecture: Split GameRuntime.godot.tsx (2,288 lines)

In Progress (1):
  - Human Test Test

Done (1):
  - Test task from CLI
```

---

## 3. The Sisyphus Plans Integration Challenge

### 3.1 Current State

**Location:** `.sisyphus/plans/` (31 files)

Examples:
- `effects-complete-10-phase-plan.md` — 1,420 lines, 10 phases, ~35-45 days
- `3d-game-engine-plan.md` — 3D engine architecture, 18 phases
- `ai-ready-game-bundling.md` — 9 tasks across 3 phases
- `repo-hygiene-loop.md` — Daily automated cleanup

**Structure:**
- Plans are hierarchical (phases → tasks → subtasks)
- Written in markdown with YAML frontmatter
- Often 1,000+ lines with detailed implementation specs
- Include acceptance criteria, file paths, code examples

### 3.2 The Gap

| Sisyphus Plans | Backlog.md |
|----------------|------------|
| Source of truth for implementation details | Source of truth for current work status |
| Hierarchical (phases → tasks) | Flat (tasks with dependencies) |
| Comprehensive specs | Actionable units |
| Archived when complete | Kept for history |
| 31 files, ~20,000 lines | 10 tasks, ~200 lines |

**Problem:** Plans have tasks written upfront, but they're not synced to the backlog. Two sources of truth.

---

## 4. Integration Options

### Option 1: Plan-First, Auto-Sync to Backlog

**Workflow:**
1. Write plan in `.sisyphus/plans/`
2. Add "Backlog Tasks" section with task IDs
3. Run sync script: `pnpm sync-backlog`
4. Script extracts tasks, creates/updates backlog entries

**Pros:**
- Plans stay comprehensive
- Backlog stays actionable
- Can generate tasks from plan structure

**Cons:**
- Two sources of truth
- Sync complexity
- Risk of drift

**Implementation:**
```typescript
// scripts/sync-backlog.ts
// Parse .sisyphus/plans/*.md
// Extract ## Phase X Task Y headers
// Generate/update backlog tasks
// Update plan with task IDs
```

### Option 2: Backlog-First, Plans as Generated Docs

**Workflow:**
1. Create tasks in backlog (brain dump → tasks)
2. When starting work, generate plan from task cluster
3. Write plan to `.sisyphus/plans/`
4. Archive plan when done

**Pros:**
- Single source of truth (backlog)
- Plans are disposable/generated
- Simpler mental model

**Cons:**
- Lose big-picture view
- Hard to plan multi-phase work
- Plans become after-the-fact documentation

### Option 3: Hybrid — Bidirectional Sync (Recommended)

**Workflow:**
1. Write plan in `.sisyphus/plans/` with full detail
2. Plan includes `backlog-tasks:` YAML frontmatter listing task IDs
3. Each task file includes `plan-ref: effects-complete-10-phase-plan.md`
4. Sync command keeps them aligned:
   - New tasks in plan → create in backlog
   - Completed tasks in backlog → update plan progress
   - Mismatches → flag for review

**Pros:**
- Best of both worlds
- Clear linkage
- Can track plan progress via backlog

**Cons:**
- Most complex to implement
- Requires discipline

**Implementation:**
```yaml
# In .sisyphus/plans/effects-complete-10-phase-plan.md
---
name: effects-complete-10-phase-plan
backlog-tasks:
  - TASK-3  # Phase 3
  - TASK-4  # Phase 5
  - TASK-15 # Phase 6 (not created yet)
---
```

```yaml
# In backlog/tasks/task-3.md
---
id: TASK-3
title: Effects System Phase 3
plan-ref: effects-complete-10-phase-plan.md
phase: 3
---
```

---

## 5. Recommended Sisyphus System Integration

### 5.1 New Sisyphus Commands

```bash
# Create plan + sync initial tasks to backlog
sisyphus plan create "effects-phase-3" --from-backlog

# Sync plan tasks to backlog
sisyphus plan sync effects-phase-3

# Show plan progress from backlog state
sisyphus plan status effects-phase-3

# Complete plan, archive tasks
sisyphus plan complete effects-phase-3
```

### 5.2 Agent Behavior Changes

**Current:**
```
User: "Let's work on the effects system"
Agent: (reads .sisyphus/plans/effects-complete-10-phase-plan.md)
Agent: (creates tasks manually in backlog)
```

**Proposed:**
```
User: "Let's work on the effects system"
Agent: (reads plan)
Agent: (runs: sisyphus plan sync effects-complete-10-phase-plan)
Agent: "Plan has 10 phases, 47 tasks. 8 tasks already in backlog. 
         Created 39 new tasks. Ready to start Phase 1?"
```

### 5.3 Prompt Integration

**New system prompt additions:**

```
When working with plans:
1. Check if plan has backlog-tasks in frontmatter
2. If not, ask: "Should I sync this plan to the backlog?"
3. If yes, run sync before starting work
4. Update task status as work progresses
5. When plan phase completes, mark tasks done

When creating new work:
1. Prefer creating tasks in backlog first
2. If work is complex (>5 tasks), create a plan
3. Link plan and tasks bidirectionally
```

---

## 6. Project Context for Reference

### 6.1 Slopcade Overview

**Type:** React Native + Godot game maker platform  
**Architecture:** Monorepo with AI-powered game generation  
**Key Features:**
- 6 core game templates (Slopeggle, Pinball, Gem Crush, Jumpy Cat, Stack Attack, Breakout)
- AI asset generation (Scenario.com integration)
- Effects system (shaders, post-processing)
- 3D engine support (in planning)
- Economy system (Sparks/Gems currency)
- BLE multiplayer

### 6.2 Directory Structure

```
slopcade/
├── app/                    # React Native app
├── api/                    # Cloudflare Workers API
├── shared/                 # Shared types/utilities
├── games/                  # Game definitions
│   ├── compiled/           # TypeScript games
│   ├── bundled/            # JSON+JS games (AI-authored)
│   └── src/                # Game registry
├── packages/
│   ├── game-bundler/       # Bundle compiler
│   └── game-inspector-mcp/ # MCP server for game debugging
├── godot_project/          # Godot engine
├── .sisyphus/plans/        # Implementation plans (31 files)
├── backlog/                # Backlog.md data
│   ├── tasks/              # Task files
│   └── Backlog.md          # Kanban board
└── docs/                   # Documentation (80+ files)
```

### 6.3 Active Initiatives

| Initiative | Status | Plan File |
|------------|--------|-----------|
| Effects System | In Progress (Phase 3-5) | effects-complete-10-phase-plan.md |
| 3D Engine | Planning | 3d-game-engine-plan.md |
| AI Bundling | Planning | ai-ready-game-bundling.md |
| App Store Launch | Planning | LAUNCH_ROADMAP.md |
| Architecture Refactor | Planning | ARCHITECTURE.md |

---

## 7. Open Questions for Sisyphus Maintainers

1. **Should plan→backlog sync be automatic or explicit?**
   - Auto: Every plan read triggers sync
   - Explicit: Agent asks before syncing

2. **How should we handle plan updates?**
   - Append-only (add new tasks)
   - Full sync (add/remove/update)
   - Manual reconciliation

3. **Should completed plans be archived or kept?**
   - Archive to `.sisyphus/archive/`
   - Keep in place with `status: completed`
   - Move to `docs/archive/`

4. **What's the scope of Sisyphus integration?**
   - Global: All Sisyphus projects use Backlog.md
   - Opt-in: Projects configure integration
   - Project-specific: Slopcade-only customization

5. **How do we handle plan dependencies?**
   - Plan A must complete before Plan B
   - Tasks can depend on tasks in other plans
   - Milestones group plans

---

## 8. Files Created/Modified

### Created
- `.opencode/opencode.json` — MCP server config
- `.opencode/skills/brain-dump-to-backlog/SKILL.md` — Brain dump skill
- `devmux.config.json` — Added backlog service
- `backlog/` — Full Backlog.md directory structure
- `backlog/tasks/task-{3,4,5,6,7,8,9,10}.md` — 8 tasks

### Modified
- `package.json` — Added backlog.md devDependency
- `Backlog.md` — Auto-generated kanban board

---

## 9. Next Steps (Recommended)

### Immediate (This Week)
1. Decide on integration approach (Option 1, 2, or 3)
2. Create sync script prototype if Option 1 or 3
3. Import remaining 23 plans from .sisyphus/plans/

### Short Term (Next 2 Weeks)
1. Implement chosen sync mechanism
2. Train agents on new workflow
3. Document conventions in AGENTS.md

### Long Term (Next Month)
1. Measure: Are plans and backlog staying in sync?
2. Iterate on sync automation
3. Consider upstreaming to Sisyphus core

---

## 10. Contact & Resources

**Backlog.md:**
- GitHub: https://github.com/MrLesk/Backlog.md
- NPM: `backlog.md`
- Docs: README.md has full CLI reference

**Slopcade Project:**
- Location: `/Users/hassoncs/Workspaces/Personal/slopcade`
- Plans: `.sisyphus/plans/` (31 files)
- Backlog: `backlog/` (10 tasks)

**This Document:**
- Location: `.sisyphus/plans/backlog-integration-research.md`
- Purpose: Handoff to Sisyphus maintainers

---

*End of Document*
