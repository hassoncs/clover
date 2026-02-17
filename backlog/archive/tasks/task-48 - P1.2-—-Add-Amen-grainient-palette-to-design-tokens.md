---
id: TASK-48
title: P1.2 — Add Amen grainient palette to design tokens
status: To Do
assignee: []
created_date: '2026-02-17 03:47'
labels:
  - theme
  - phase-1
milestone: m-0
dependencies: []
references:
  - .sisyphus/plans/amen-presentation-ui-kit.md
  - packages/theme/src/tokens.ts
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add `amen` and `amenWarm` palettes to `grainient.palettes` in `packages/theme/src/tokens.ts`. Map corresponding CSS vars in `app/global.css` under `.brand-amen`. Gold/cream/warm-white gradients with grain texture.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Two new grainient palettes (amen, amenWarm) in tokens.ts
- [ ] #2 Matching CSS vars in global.css under .brand-amen
- [ ] #3 Grainient surfaces render warm gold gradients
<!-- AC:END -->
