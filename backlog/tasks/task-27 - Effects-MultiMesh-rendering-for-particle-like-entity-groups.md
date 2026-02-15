---
id: TASK-27
title: 'Effects: MultiMesh rendering for particle-like entity groups'
status: To Do
assignee: []
created_date: '2026-02-15 03:36'
labels:
  - effects
  - performance
  - rendering
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
For games with hundreds of identical visual elements (particles, debris, projectiles, grid cells), each currently gets its own Polygon2D node and draw call. Godot's MultiMeshInstance2D can render 1000s of instances in a single draw call.

Implement:
1. Detect when multiple entities share the same prefab with identical visual properties
2. Replace individual Polygon2D/Sprite2D nodes with a MultiMeshInstance2D
3. Update transform data per frame via MultiMesh.set_instance_transform_2d()
4. Support per-instance color via MultiMesh.set_instance_color()

This is the nuclear option for draw call reduction — useful when entity count exceeds 200+.
<!-- SECTION:DESCRIPTION:END -->
