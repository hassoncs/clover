---
id: TASK-19
title: >-
  StyleSheet → NativeWind: Chunk 2A — Complex Editor Panels (PropertiesPanel,
  AssetsPanel, DebugPanel, LiveStatePanel)
status: To Do
assignee: []
created_date: '2026-02-13 07:00'
labels:
  - refactor
  - nativewind
  - theme
milestone: StyleSheet Migration
dependencies:
  - TASK-13
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Convert 4 complex editor panels. PropertiesPanel has a color picker palette array (keep hardcoded). Others have mix of StyleSheet + inline colors. LiveStatePanel has Platform.select for fontFamily.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Files converted where possible
- [ ] #2 Color picker palette array kept as-is
- [ ] #3 tsc --noEmit passes
<!-- AC:END -->
