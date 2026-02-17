---
id: TASK-51
title: P2.1 — Load Lora font for amen headings
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
  - packages/brands/src/manifests/amen.ts
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Download Lora (Google Fonts, OFL license) — Regular, Medium, SemiBold, Bold + Italic variants. Place in `app/assets/fonts/Lora-*.ttf`. Load via expo-font. Amen manifest already declares `fontFamily.heading: "Lora"`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Lora font files added to app/assets/fonts/
- [ ] #2 Font loads successfully on web, iOS, Android
- [ ] #3 Lora renders for heading text when BRAND_ID=amen
<!-- AC:END -->
