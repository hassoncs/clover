---
id: TASK-52
title: P2.2 — Brand-aware typography helpers
status: To Do
assignee: []
created_date: '2026-02-17 03:47'
labels:
  - typography
  - phase-2
milestone: m-0
dependencies: []
references:
  - .sisyphus/plans/amen-presentation-ui-kit.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create typography helper that reads `activeBrand.theme.fontFamily` and returns the correct font family. Hook or Tailwind utility: `useBrandFont("heading")` → `"Lora"` or `"Inter"`. Depends on P2.1.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Brand font helper resolves correct font per brand
- [ ] #2 Works on both web and native
<!-- AC:END -->
