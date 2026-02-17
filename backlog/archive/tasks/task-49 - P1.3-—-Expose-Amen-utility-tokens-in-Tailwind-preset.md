---
id: TASK-49
title: P1.3 — Expose Amen utility tokens in Tailwind preset
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
  - packages/theme/src/tailwind.ts
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add amen glow/accent colors to `packages/theme/src/tailwind.ts` theme.extend.colors block. Available as `bg-amen-glow`, `text-amen-golden`, etc. Depends on P1.1 + P1.2 (TASK-47, TASK-48).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Amen-specific Tailwind color utilities available
- [ ] #2 Tailwind preset compiles without error
<!-- AC:END -->
