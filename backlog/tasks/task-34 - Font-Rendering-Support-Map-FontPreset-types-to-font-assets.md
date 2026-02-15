---
id: TASK-34
title: 'Font Rendering Support: Map FontPreset types to font assets'
status: To Do
assignee: []
created_date: '2026-02-15 18:43'
labels:
  - fonts
  - typescript
  - audit-action
dependencies: []
references:
  - docs/reports/font-rendering-support-audit.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the `FontPreset` type mapping to actual font files/URLs. The type exists in `shared/src/types/overlay.ts` but has no implementation.

**Context**: FontPreset defines 'pixel', 'retro', 'handwritten', 'monospace', 'system' but these are dead APIs.

**Evidence**: `.sisyphus/evidence/task-1-capability-inventory.md` - Gap #2
<!-- SECTION:DESCRIPTION:END -->
