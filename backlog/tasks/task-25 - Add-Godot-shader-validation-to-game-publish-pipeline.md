---
id: TASK-25
title: Add Godot shader validation to game publish pipeline
status: In Progress
assignee: []
created_date: '2026-02-15 03:08'
updated_date: '2026-02-15 03:25'
labels:
  - validation
  - shaders
  - ai-generation
  - developer-experience
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement pre-publish shader validation to catch WebGL/GLSL syntax that doesn't work in Godot 4. AI-generated shaders often use Shadertoy/WebGL conventions (TEXTURE_SIZE, texture2D, gl_FragColor) that cause runtime errors in Godot.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Shader validation runs during `validateGame()`
- [x] #2 Common WebGL→Godot gotchas detected with helpful error messages
- [ ] #3 AI shader stage can retry on validation failure
- [ ] #4 Documentation updated with Godot shader built-ins reference
<!-- AC:END -->
