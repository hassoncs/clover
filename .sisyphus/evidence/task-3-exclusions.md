# Task 3 Exclusions

Excluded from implementation-first batch (Tier C / deferred):

1. `Backgrounds/LightPillar/LightPillar.jsx`
- Uses heavy raymarching (`MAX_ITER` up to 80, nested `WAVE_ITER`, break-on-distance marching).
- Includes runtime quality-profile branching (`low/medium/high`) tuned for browser hardware tiers.
- Portability is possible, but risk is performance stability rather than syntax conversion.

2. `Backgrounds/PixelSnow/PixelSnow.jsx`
- Fragment contains a 128-iteration traversal loop plus multiple hash/noise branches.
- Cost scales with resolution and density; post-process usage would significantly impact frame time.
- Better treated as a dedicated background effect with strict quality controls.

3. `Backgrounds/Dither/Dither.jsx`
- Not a single shader effect; architecture is: wave shader render + postprocessing dither pass.
- Depends on `@react-three/postprocessing` composition semantics (input buffer pass chain).
- Requires multi-pass graph assembly in Slopcade, outside Task 3/4 scope.

4. `Animations/LaserFlow/LaserFlow.jsx`
- Very large shader surface area, many coupled uniforms, and optional derivative-extension path.
- Contains multiple sub-systems (beam kernel, wisps, fog, edge masks, adaptive quality behavior).
- High migration and validation cost versus Tier A/B candidates.

Notes
- All excluded effects were still reviewed for portability.
- Deferral reason is implementation risk/cost priority, not impossibility.
