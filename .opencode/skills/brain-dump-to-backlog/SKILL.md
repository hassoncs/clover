---
name: brain-dump-to-backlog
description: Convert a brain dump of ideas, tasks, or features into organized backlog tasks with proper labels, priorities, and dependencies. Use when the user says things like "brain dump", "I need to organize", "here are some things to do", or lists multiple ideas/tasks in one message.
---

# Brain Dump → Backlog Skill

## Purpose
Transform unstructured thoughts into organized, actionable backlog tasks.

## Workflow

### Step 1: Capture the Brain Dump
When the user brain-dumps, capture ALL items. Don't filter. Examples:
- "We need to fix the login bug, add dark mode, and refactor the API"
- "I was thinking about: 1) better onboarding 2) performance optimization 3) new dashboard"
- Random list of features, bugs, ideas, tech debt

### Step 2: Categorize Each Item
For each item, determine:
- **Type**: feature | bug | tech-debt | research | polish | infrastructure
- **Priority**: critical | high | medium | low
- **Area**: Which label(s) apply? (effects, 3d-engine, launch, architecture, ai-bundling, games, economy, multiplayer, etc.)

### Step 3: Create Tasks
Use `backlog task create` for each item:
```bash
backlog task create "Title" --desc "Description" --status "To Do" --priority {critical|high|medium|low} -l {label1} -l {label2}
```

### Step 4: Set Dependencies (if obvious)
If items clearly depend on each other:
```bash
backlog task edit {task-id} --dep {dependency-task-id}
```

### Step 5: Report Back
Show the user:
1. How many tasks were created
2. The organized board view
3. Any dependencies that were set

## Label Categories

Use these labels consistently:

| Label | Use For |
|-------|---------|
| effects | Effects system work (shaders, post-processing) |
| 3d-engine | 3D game engine features |
| launch | App Store launch blockers |
| architecture | Code refactoring, splitting god files |
| ai-bundling | AI game authoring infrastructure |
| games | Individual game polish/development |
| economy | Monetization, credits, IAP |
| multiplayer | BLE, networking, social features |
| ui-ux | User interface, design system |
| bridge | Godot bridge, native integration |
| performance | Optimization, memory, speed |
| testing | Test coverage, QA |
| docs | Documentation, guides |

## Example Brain Dump Response

User: "Okay so we need to: fix that crash in the shader compiler, add the new blur effect, make sure the 3D camera works on web, and oh yeah we should probably document the scripting API"

Response:
```
Created 4 tasks from your brain dump:

1. **TASK-11** - Fix crash in shader compiler (critical, effects)
2. **TASK-12** - Add new blur effect (high, effects)
3. **TASK-13** - 3D camera web compatibility (high, 3d-engine)
4. **TASK-14** - Document scripting API (medium, docs)

Board updated! View with: backlog board
```

## Tips
- Don't overthink categorization — use best judgment
- When in doubt, ask: "Should [item] be high or medium priority?"
- Group related items under the same label
- If >10 items, suggest creating a milestone
