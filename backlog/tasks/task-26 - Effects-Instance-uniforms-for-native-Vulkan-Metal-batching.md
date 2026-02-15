---
id: TASK-26
title: 'Effects: Instance uniforms for native (Vulkan/Metal) batching'
status: To Do
assignee: []
created_date: '2026-02-15 03:36'
labels:
  - effects
  - performance
  - native
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When many entities share the same shader but have different parameter values (e.g., 50 enemies each with a different glow color), the current approach creates one ShaderMaterial per unique param set. On native (Vulkan/Metal), Godot supports `instance uniform` which allows batching all these into a single draw call. 

Implement:
1. Detect when running on RenderingDevice backend (not Compatibility)
2. Rewrite entity effect GLSL to use `instance uniform` instead of regular `uniform` for per-entity params
3. Share one ShaderMaterial across all entities with the same shader, vary only instance uniforms

Note: This does NOT help on web (Compatibility renderer doesn't support instance uniforms). Web optimization relies on material sharing (already implemented).
<!-- SECTION:DESCRIPTION:END -->
