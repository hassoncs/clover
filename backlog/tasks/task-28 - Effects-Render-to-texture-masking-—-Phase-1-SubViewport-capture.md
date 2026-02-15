---
id: TASK-28
title: 'Effects: Render-to-texture masking — Phase 1 (SubViewport capture)'
status: To Do
assignee: []
created_date: '2026-02-15 03:36'
labels:
  - effects
  - render-texture
  - masking
dependencies: []
documentation:
  - /.sisyphus/plans/render-to-texture-masking.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Core plumbing for render-to-texture masking. Create a RenderTextureManager that manages named SubViewports which capture live render output as textures.

Implement:
1. RenderTextureManager.gd autoload — manages named SubViewports
2. `create_render_texture(name, size, clear_mode)` → creates SubViewport, returns live ViewportTexture
3. `get_texture(name)` → returns ViewportTexture for binding to shaders
4. `destroy(name)` → cleanup
5. Bridge integration — register create/bind/destroy with GameBridgeEffects.gd
6. `bind_render_texture(name, target_graph)` → feeds ViewportTexture into GraphExecutor via set_input_buffer

Performance: SubViewports render on GPU. At half resolution, cost is ~25% of a full render pass per capture. Budget 4-6 render textures.
<!-- SECTION:DESCRIPTION:END -->
