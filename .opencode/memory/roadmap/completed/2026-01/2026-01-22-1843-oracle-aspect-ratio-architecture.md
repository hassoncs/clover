---
title: "Oracle: Aspect ratio architecture"
agent: oracle
created: 2026-01-22T18:43:00.881Z
session_id: ses_418fcad15ffeiximiCmt2elLZW
duration: 1m 7s
---

# Oracle: Aspect ratio architecture

**Bottom line**
Pick a single “design viewport” aspect ratio and always render the *same world meters* into that viewport; then *fit that viewport into the device* using contain-style scaling with letterbox/pillarbox. Make the viewport rect a first-class output (offset + size + scale) that both rendering and input use, so physics tuning and feel stay consistent across screens.

**Action plan**
1. Standardize on portrait **9:16** as the default *design aspect ratio* for new games; keep existing games’ behavior by defaulting to **`bounds.width / bounds.height`** when `bounds` are present.
2. Add a small “viewport fitting” layer (a `ViewportSystem` or `LayoutSystem`) that, on every layout change, computes:
   - `screenSizePx` (full window)
   - `viewportRectPx` (x, y, width, height) that matches the target aspect ratio using `contain`
   - `metersToPx` (effective pixels-per-meter inside the viewport; can be derived from `viewportRectPx` and the chosen visible world meters)
3. Define the coordinate pipeline (single source of truth):
   - **World (meters)** → Camera (translate/zoom, still meters) → **Viewport (pixels, local)** → **Screen (pixels, global with offset)**
4. Implement letterboxing in layout (RN Views / web CSS) by centering a fixed-aspect canvas container; also pass `viewportRectPx` to Skia so rendering uses the correct pixel size.
5. Split HUD into two intentional layers:
   - `ScreenHUD` (anchored to full screen; system UI, menus)
   - `ViewportHUD` (anchored to `viewportRectPx`; game UI that should align with the game frame)
6. Update schema minimally to express intent without breaking old games (details below).
7. Route all pointer/touch input through the viewport mapping:
   - reject/ignore touches in the letterbox bars
   - convert screen px → viewport-local px → world meters (inverse camera)

**Effort estimate**
Medium (1–2d)

---

### Answers to your questions (with a single coherent design)

1. What aspect ratio should we standardize on for portrait mobile games?
Use **9:16** as the *default design ratio* (simple, familiar, predictable letterboxing across phones/tablets). Modern phones vary widely (19.5:9, etc.), so you will letterbox anyway; 9:16 minimizes cognitive overhead and keeps authoring consistent.

2. Should the aspect ratio be defined in the schema or be a global constant?
Primary recommendation: **schema with a default**, because you need backward compatibility and eventual landscape support.
- Default resolution order:
  1) `game.presentation.aspectRatio` (if provided)
  2) `world.bounds.width / world.bounds.height` (existing games)
  3) global default `9/16` (new games with no bounds)

This keeps old content stable and lets new games opt into a standard without hardcoding engine-wide assumptions.

3. How should we handle the coordinate transformation pipeline?
Make a dedicated “viewport fit” output and feed it into camera + input. Concretely, compute:
- `viewportRectPx`: where the game actually renders on the physical screen
- `viewportSizePx`: used to size Skia Canvas and set its drawing coordinate space
- `metersToPx`: effective scale (could be based on “visible world height in meters”)
Then:
- World→Viewport: `p_viewport = (p_world - cameraPosMeters) * (metersToPx * cameraZoom) + viewportCenterPx`
- Viewport→Screen: `p_screen = p_viewport + viewportRectPx.origin`
And invert for input.

Key point: **camera math should not need to know about letterboxing**, only about viewport pixel dimensions and scale.

4. Where should letterboxing be implemented (CSS, Canvas, or both)?
Do it in **layout (RN View / CSS)** as the canonical implementation:
- A parent fills screen.
- A centered child uses the game aspect ratio and `contain` sizing; its background shows bars.
- Skia canvas lives inside the child and simply matches the child’s measured pixel size.

Canvas/Skia should *not* decide sizing; it should only render into the size it is given.

5. How should HUD elements be positioned relative to the game canvas vs screen?
Provide two explicit coordinate spaces:
- **Viewport-relative HUD**: absolute-positioned inside the same container as the canvas (so `top: 0` means top of the game frame, not top of the phone).
- **Screen-relative HUD**: absolute-positioned at the app root for overlays that should ignore letterboxing (system menus, toasts, dev tools).

If you later need “world-following labels,” prefer drawing them in Skia (same transform) rather than trying reminder-driven RN layout updates.

6. What changes are needed to the GameDefinition schema?
Minimal, backward-compatible additions (defaults preserve old behavior):
- Add `presentation` block:
  - `aspectRatio?: { width: number; height: number } | number` (number = width/height)
  - `fit?: 'contain'` (start with only contain; add cover later only if needed)
  - `viewportMeters?: { width: number; height: number }` (optional, see note)
- Keep `world.bounds` as-is, but clarify semantics:
  - `world.bounds` remains “design world size” (and can continue to be used as your default visible meters if you don’t add `viewportMeters`)

Pragmatic default for MVP: **treat `world.bounds` as the visible design viewport in meters**. If you later want “world bounds” to mean “playfield limits” distinct from “camera viewport,” introduce `world.limits` later—don’t overcomplicate now.

7. How do we handle input coordinates with letterboxing?
Always map input through `viewportRectPx`:
- If pointer is outside `viewportRectPx`: ignore (or treat as UI-only)
- Else:
  - `p_viewport = p_screen - viewportRectPx.origin`
  - Convert to world meters with the inverse camera transform:
    - `p_world = (p_viewport - viewportCenterPx) / (metersToPx * zoom) + cameraPosMeters`

This guarantees that “tap at 25% from the left of the game frame” means the same world position on every device.

---

### Why this approach
- Keeps physics consistent by ensuring the *same number of world meters* are visible regardless of device.
- Avoids “two sources of truth” by making `viewportRectPx` the shared contract for render, input, and viewport-anchored HUD.
- Stays backward compatible by deriving aspect ratio from existing `bounds` unless a new `presentation` override is present.
- Minimizes new concepts: one new computed artifact (viewport rect) plus an optional schema block.

### Watch out for
- **Safe areas (notches)**: decide whether the viewport rect is computed inside the safe area or full screen. Minimal MVP: compute in full screen and let bars absorb the notch; refine later if needed.
- **Pixel density**: keep Box2D in meters only; never let DPR leak into physics. DPR affects Skia pixel resolution, not world scale.
- **Rounding/jitter**: keep transforms in floats; avoid snapping camera to integer pixels unless you explicitly want pixel-art behavior.
- **Resizing/orientation changes**: recompute viewport rect and update camera projection atomically to avoid one-frame “jump.”

---

### Escalation triggers (when to revisit with a more complex solution)
- You need split semantics between “camera visible area” vs “world limits” across many games (introduce `world.limits` vs `camera.viewportMeters`).
- You need dynamic UI scaling rules (e.g., anchor HUD to safe area but also align with viewport) across many screens (formalize layout anchors and safe-area aware viewport computation).
- You need “cover” behavior (cropping) for some games (add `fit: 'cover'` and accept that it changes what players can see, which can affect gameplay).
