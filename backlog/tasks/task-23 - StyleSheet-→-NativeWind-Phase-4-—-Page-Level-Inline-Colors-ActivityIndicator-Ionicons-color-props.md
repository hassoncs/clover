---
id: TASK-23
title: >-
  StyleSheet → NativeWind: Phase 4 — Page-Level Inline Colors
  (ActivityIndicator, Ionicons color props)
status: To Do
assignee: []
created_date: '2026-02-13 07:00'
labels:
  - refactor
  - nativewind
  - theme
milestone: StyleSheet Migration
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace hardcoded color="#xxx" props on ActivityIndicator, Ionicons, RefreshControl across ~8 page files. These have no StyleSheet — just inline color props that should use token imports instead.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All ActivityIndicator/Ionicons color props use semantic values
- [ ] #2 tsc --noEmit passes
<!-- AC:END -->
