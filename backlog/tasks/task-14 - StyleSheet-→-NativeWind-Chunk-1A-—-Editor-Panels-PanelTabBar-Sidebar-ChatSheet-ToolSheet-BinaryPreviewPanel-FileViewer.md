---
id: TASK-14
title: >-
  StyleSheet → NativeWind: Chunk 1A — Editor Panels (PanelTabBar, Sidebar,
  ChatSheet, ToolSheet, BinaryPreviewPanel, FileViewer)
status: Done
assignee: []
created_date: '2026-02-13 07:00'
updated_date: '2026-02-13 07:10'
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
Convert 6 easy editor panel files from StyleSheet.create to NativeWind className. All have only static styles with hardcoded gray/white/indigo colors.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All 6 files converted to className
- [ ] #2 No hardcoded hex colors in StyleSheet
- [ ] #3 StyleSheet.create removed if fully converted
- [ ] #4 tsc --noEmit passes
- [ ] #5 Visual appearance unchanged
<!-- AC:END -->
