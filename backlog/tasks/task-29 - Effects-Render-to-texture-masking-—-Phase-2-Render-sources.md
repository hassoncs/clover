---
id: TASK-29
title: 'Effects: Render-to-texture masking — Phase 2 (Render sources)'
status: To Do
assignee: []
created_date: '2026-02-15 03:37'
labels:
  - effects
  - render-texture
  - masking
dependencies:
  - TASK-28
documentation:
  - /.sisyphus/plans/render-to-texture-masking.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add render source types that can capture content into SubViewports created by Phase 1 (TASK-28).

Implement:
1. Entity capture — reparent entity subtree into SubViewport, or use CanvasItem.visibility_layer for selective capture
2. Particle capture — spawn GPUParticles2D inside SubViewport, they render there naturally
3. Procedural generators — ColorRect with generator shader inside SubViewport (reuses screen effect pattern)
4. Color mode conversion — luminance mode (RGB → grayscale for masking), alpha mode (alpha channel as mask)

Each source type renders into its named SubViewport every frame. The ViewportTexture updates automatically.
<!-- SECTION:DESCRIPTION:END -->
