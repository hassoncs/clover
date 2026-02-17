---
id: TASK-55
title: P3.2 — Build AmenIcon component with effect props
status: To Do
assignee: []
created_date: '2026-02-17 03:48'
labels:
  - icons
  - phase-3
milestone: m-0
dependencies: []
references:
  - .sisyphus/plans/amen-presentation-ui-kit.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create `packages/ui/src/amen/icons/AmenIcon.tsx` and `registry.ts`. Props: `name` (AmenIconName), `size`, `color`, `glow` (boolean or config), `pulse`, `float`, `draw`, `sparkle`. Registry maps icon names to SVG components. Wraps in effect components from Phase 4. Depends on P3.1.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 AmenIcon renders any registered icon by name
- [ ] #2 Effect props (glow, pulse, float, draw, sparkle) toggleable
- [ ] #3 TypeScript autocomplete works for icon names
- [ ] #4 Falls back gracefully for unknown icon names
<!-- AC:END -->
