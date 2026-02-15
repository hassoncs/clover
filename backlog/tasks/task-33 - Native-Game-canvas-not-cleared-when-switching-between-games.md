---
id: TASK-33
title: 'Native: Game canvas not cleared when switching between games'
status: To Do
assignee: []
created_date: '2026-02-15 04:57'
labels:
  - native
  - lifecycle
  - bug
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When navigating from one game to another on native, the previous game's entities/sprites remain visible behind the new game. The clear_game or soft_reset bridge call may not be firing, or Godot isn't properly removing children from the scene tree on native.
<!-- SECTION:DESCRIPTION:END -->
