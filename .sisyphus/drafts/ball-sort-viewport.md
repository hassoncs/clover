# Draft: Ball Sort viewport + scaling fixes

## Requirements (confirmed)
- Background image must fill the entire viewport (720x1280 portrait) with no gray areas; scale-to-cover.
- Tubes and other game elements must scale up proportionally to better use available screen space.
- Maintain 9:16 portrait aspect ratio.
- Game remains playable after scaling (touch targets, spacing, collision, readable).

## Context (from user exploration)
- Viewport: 720x1280 (mobile portrait).
- Current world bounds: 12x16 units at 50 px/m => 600x800 px.
- Background sprite centered at (0,0), scaled, but only covers ~600x800.
- Other games implement aspect-ratio-preserving scaling to fill viewport.

## Suspected Root Causes
- Background scaling uses viewport size but sprite anchoring/position/parent transform is wrong.
- World bounds are smaller than viewport-equivalent in game units.
- Tubes/elements are authored for current smaller world, so appear too small.

## Open Questions
- Confirm Godot version and whether the project uses a custom world-units abstraction vs pure pixels.
- Confirm whether Ball Sort uses Camera2D/Camera3D, and whether UI is separate CanvasLayer.
- Confirm whether other games share a common scaling utility we should reuse.

## Scope Boundaries
- INCLUDE: background scale-to-cover, world bounds recalculation, proportional scaling of tubes/elements, gameplay sanity pass, verification steps using game inspector.
- EXCLUDE (unless needed): new art assets, redesign of levels, major refactor of unrelated systems.
