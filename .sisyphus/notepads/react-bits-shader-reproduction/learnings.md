# Learnings - React Bits Shader Reproduction

## [2026-02-15] Session Start
- Dependency `shader-infra-glsl-files` is SATISFIED - 40 `.glsl` files exist in `shared/src/effects/shaders/`
- Infrastructure includes `_lib/` for shared utilities (math.glsl, noise.glsl)
- Post and sprite shader categories already established

## [2026-02-15] Task 3+4 Candidate Matrix
- Reviewed 24 React Bits shader components (14 easy-list + 10 medium-list) from actual `.jsx` shader sources.
- Tier result: A=12, B=8, C=4.
- Tier C deferred set is stable for now: `LightPillar`, `PixelSnow`, `Dither`, `LaserFlow` (perf/multipass complexity reasons).
- Uniform normalization baseline used across matrix:
  - time uniforms (`uTime`/`iTime`) -> Godot built-in `TIME`
  - resolution uniforms (`uResolution`/`iResolution`/`uCanvas`) -> derive from `SCREEN_PIXEL_SIZE`
  - mouse uniforms remain runtime-fed params where needed (`uMouse`/`iMouse` etc.)
- WebGL2 syntax appears in several candidates (`#version 300 es`), but does not block migration; requires syntax adaptation during Task 5.
- Evidence artifacts created:
  - `.sisyphus/evidence/task-3-candidate-matrix.md`
  - `.sisyphus/evidence/task-3-exclusions.md`
  - `.sisyphus/evidence/task-4-schema-check.txt`

## [2026-02-14] Tier A Port Batch 1 (6 shaders)
- Ported `rbIridescence`, `rbLiquidChrome`, `rbAurora`, `rbBalatro`, `rbLightning`, and `rbThreads` into `shared/src/effects/shaders/post/` as `.glsl` + `.meta.ts` pairs.
- Godot translation pattern held for all ports: `shader_type canvas_item`, `fragment()`, `COLOR`, `SCREEN_UV`, `TIME`, and resolution from `1.0 / SCREEN_PIXEL_SIZE`.
- Mouse-reactive source shaders were normalized with fallback uniform `u_mouse = vec2(0.5, 0.5)` so effects remain deterministic in non-pointer runtime contexts.
- Registry integration points required three updates for type-safe wiring: `shared/src/effects/shaders/index.ts`, `shared/src/effects/types.ts` (`EffectType` union), and `shared/src/effects/metadata.ts` (metadata map completeness).
- Shared package type-checking required explicit non-platform bridge entry points `shared/src/effects/shaderLibrary.ts` and `shared/src/effects/shaderRegistry.ts` to satisfy `tsc --noEmit` module resolution.

- Batch 2 added rbGalaxy/rbOrb/rbGradientBlinds/rbGrainient/rbMetaBalls/rbShapeBlur as split shader modules (.glsl + .meta.ts) and registered them in shader index, EffectType, and EFFECT_METADATA for exhaustive typing.
- Godot ports preserve React Bits controls by mapping uniforms to u_* names with hint ranges/source_color; time uses TIME, full-screen sampling uses SCREEN_UV, and resolution comes from 1.0 / SCREEN_PIXEL_SIZE.

## [2026-02-14] Tier B Port Batch (8 shaders)
- Ported `rbSilk`, `rbColorBends`, `rbDarkVeil`, `rbLightRays`, `rbPlasma`, `rbFloatingLines`, `rbFaultyTerminal`, and `rbPrism` as split `.glsl` + `.meta.ts` shader modules in `shared/src/effects/shaders/post/`.
- Followed existing React Bits port contract: Godot `canvas_item` shaders with `fragment()`, `TIME`, `SCREEN_UV`/`FRAGCOORD`, and no WebGL-only directives (`#version`, `precision`, `gl_FragColor`, `mainImage` wrappers at entry point).
- Registry wiring remains 3-touchpoint exhaustive: `shared/src/effects/shaders/index.ts` (library + registry), `shared/src/effects/types.ts` (`EffectType` union), and `shared/src/effects/metadata.ts` (`Record<EffectType, EffectMetadata>` coverage).
- Tier B effects continue using category mapping `generator` in shader meta AI hints, while `EFFECT_METADATA` keeps existing `postProcess` category convention for React Bits entries.
