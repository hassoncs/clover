---
id: TASK-30
title: 'Effects: Render-to-texture masking — Phase 3 (Compiler + shader binding)'
status: To Do
assignee: []
created_date: '2026-02-15 03:37'
labels:
  - effects
  - render-texture
  - masking
  - compiler
dependencies:
  - TASK-29
documentation:
  - /.sisyphus/plans/render-to-texture-masking.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Wire render textures into the graph compiler so effect nodes can reference them as inputs.

Implement:
1. New input connection type: `connectedTo.renderTexture` in EffectGraphSpec
2. Compiler resolves renderTexture references to sampler2D uniform bindings
3. Runtime: GraphExecutor binds the named ViewportTexture as the uniform before each render pass
4. Validate at compile time that referenced render textures exist in the definition
5. Add test cases for render texture input compilation

This enables the full pipeline: particle system → B&W mask → dissolve shader on entity.
<!-- SECTION:DESCRIPTION:END -->
