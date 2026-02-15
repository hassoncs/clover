---
id: TASK-34
title: 'Font Rendering Support: Add font weight support to Godot'
status: To Do
assignee: []
created_date: '2026-02-15 18:43'
labels:
  - fonts
  - godot
  - audit-action
dependencies: []
references:
  - docs/reports/font-rendering-support-audit.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend `TextEffectSystem.gd` to handle `FontConfig.weight`. Currently the weight field is defined in types but ignored in Godot.

**Context**: FontConfig.weight exists in shared types but TextEffectSystem has no weight handling.

**Evidence**: `.sisyphus/evidence/task-3-gap-taxonomy.txt` - Gap #4
<!-- SECTION:DESCRIPTION:END -->
