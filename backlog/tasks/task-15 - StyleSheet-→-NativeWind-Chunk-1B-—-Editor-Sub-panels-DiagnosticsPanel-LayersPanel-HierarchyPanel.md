---
id: TASK-15
title: >-
  StyleSheet → NativeWind: Chunk 1B — Editor Sub-panels (DiagnosticsPanel,
  LayersPanel, HierarchyPanel)
status: Done
assignee: []
created_date: '2026-02-13 07:00'
updated_date: '2026-02-13 07:13'
labels:
  - refactor
  - nativewind
  - theme
milestone: StyleSheet Migration
dependencies:
  - TASK-13
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Convert 3 editor sub-panel files. DiagnosticsPanel has error/warning colors. LayersPanel has indigo. HierarchyPanel has 1 white color.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All 3 files converted to className
- [ ] #2 No hardcoded hex colors in StyleSheet
- [ ] #3 tsc --noEmit passes
<!-- AC:END -->
