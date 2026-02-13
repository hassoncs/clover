---
id: TASK-21
title: >-
  StyleSheet → NativeWind: Chunk 2C — Editor Chrome (EditorTopBar,
  PreviewControls, ContextMenu, InspectOverlay)
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
Convert 4 editor chrome components. PreviewControls and InspectOverlay have rgba overlays. ContextMenu has 10 colors.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Files converted where possible
- [ ] #2 rgba overlays handled with Tailwind opacity modifiers
- [ ] #3 tsc --noEmit passes
<!-- AC:END -->
