---
id: TASK-47
title: P1.1 — Refine Amen CSS variables toward white/yellow/gold
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
  - app/global.css
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Shift `.brand-amen` and `.brand-amen.dark` CSS variables in `app/global.css` from cream/navy to white/yellow/gold. Gold becomes primary, navy demoted to secondary. Add amen-specific glow vars (`--amen-glow-gold`, `--amen-warm-white`, `--amen-soft-yellow`, `--amen-golden-accent`).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Gold (#C9A84C) is primary color, navy (#1B3A6B) is secondary
- [ ] #2 Background is warm white (#FFFDF7) not cream
- [ ] #3 Four new amen-specific CSS vars defined (glow-gold, warm-white, soft-yellow, golden-accent)
- [ ] #4 Both light and dark theme blocks updated
- [ ] #5 No visual regressions in existing brand-amen pages
<!-- AC:END -->
