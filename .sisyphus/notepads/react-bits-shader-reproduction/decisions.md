# Decisions - React Bits Shader Reproduction

## [2026-02-15] Session Start
- Using `.glsl` + `.meta.ts` file structure from shader-infra plan
- WebGL GLSL → Godot Shading Language translation required per shader
- Shared utilities go in `_lib/` with `#include` references