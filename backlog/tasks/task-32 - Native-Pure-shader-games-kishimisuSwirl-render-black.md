---
id: TASK-32
title: 'Native: Pure shader games (kishimisuSwirl) render black'
status: To Do
assignee: []
created_date: '2026-02-15 04:57'
labels:
  - native
  - shaders
  - effects
  - bug
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Shader-only games that have no entities (just effects/shaders) show as pure black on native iOS. The shader compilation may not be happening, or the effects pipeline isn't rendering to screen on native. Web works fine. Need to check if effects.applyGraph RPC is reaching GameBridgeEffects and if ShaderWarmer is running on native.
<!-- SECTION:DESCRIPTION:END -->
