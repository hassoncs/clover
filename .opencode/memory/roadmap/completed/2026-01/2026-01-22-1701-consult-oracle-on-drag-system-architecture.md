---
title: "Consult Oracle on drag system architecture"
agent: oracle
created: 2026-01-22T17:01:03.548Z
session_id: ses_41959d02bffewmGAZSzHcMIrVI
duration: 53s
---

# Consult Oracle on drag system architecture

**Bottom line**
- For kinematic drag, treat it as “authoritative pointer position”: store a `desiredWorldPos` from the gesture, then in the physics tick drive the body to that pose (prefer kinematic body + velocity-from-delta; optionally `setTransform` for exactness).
- Build one shared “drag core” (state + coordinate conversion + tick application), then expose two thin public APIs: `force` and `kinematic` modes. In the engine, extend the existing `draggable` behavior with `mode: 'force' | 'kinematic'` to avoid duplicating selection/targeting logic.

**Action plan**
1. Add a small shared drag core (no React, no engine coupling)
   - `lib/physics2d/drag/dragTypes.ts`
     - `type DragMode = 'force' | 'kinematic'`
     - `type DragState = { active: boolean; pointerId?: number; targetId?: string; desiredWorldPos: Vec2; lastWorldPos: Vec2; }`
   - `lib/physics2d/drag/createDragController.ts`
     - Creates `{ state, beginDrag(..), updatePointer(..), endDrag(..), step(dt, { getBodyById, worldScale }) }`
     - `step` is where mode-specific behavior happens (force vs kinematic).
2. Implement kinematic stepping (recommended approach)
   - In `step` for `mode: 'kinematic'`:
     - Require/ensure the body is kinematic while dragging (either by contract or temporarily switch and restore on release).
     - Compute velocity to hit the desired point in one tick: `v = (desired - current) / dt`, set `body.setLinearVelocity(v)`.
     - If you truly need “pixel-perfect, no drift” (magnet cursor feel), also do `body.setTransform(desired, body.getAngle())` *after* setting velocity (so it’s exact this frame but still has a sane velocity for contacts).
     - On release: `setLinearVelocity(0)`; restore previous body type if you temporarily changed it.
3. Keep force drag as-is, but route through the same controller
   - In `step` for `mode: 'force'`, use your existing stiffness/damping math (from `useForceDrag`) and `applyForce`/`applyLinearImpulse`.
4. Expose two hooks that share the same gesture + controller wiring
   - `lib/physics2d/drag/useDragGesture.ts`
     - Returns a stable `Gesture` that only writes into refs (`controller.updatePointer(...)`) and never closes over mutable locals.
   - `lib/physics2d/drag/useDrag.ts`
     - `useDrag({ mode, pickTarget, screenToWorld, ... }) -> { gesture, controller }`
   - Optional convenience wrappers:
     - `lib/physics2d/useForceDrag.ts` becomes a thin wrapper around `useDrag({ mode: 'force' })` (or leave it, but implement new work using `useDrag`).
     - `lib/physics2d/useKinematicDrag.ts` wraps `useDrag({ mode: 'kinematic' })`.
5. Game engine integration: extend existing `draggable` behavior (recommended)
   - In `BehaviorExecutor.ts` (or wherever the draggable behavior lives):
     - Add `mode?: 'force' | 'kinematic'` (default `'force'`).
     - Reuse `ctx.input.drag.targetEntityId` selection exactly as today.
     - In the engine tick, call the shared controller’s `step(dt, ...)` for the active drag target.
6. Fix MagnetPlayground (closure bug + exact-follow)
   - Replace `let isDraggingMagnet = false` with refs:
     - `const draggingRef = useRef(false)`
     - `const desiredPosRef = useRef<Vec2>(initial)`
   - Create the gesture once (empty deps) and only mutate refs inside handlers.
   - In your physics loop, read `desiredPosRef.current` and apply kinematic step (velocity + optional setTransform).

**Effort estimate**
- Medium (1–2d) if you retrofit engine + both existing hooks + MagnetPlayground.
- Short (1–4h) if you only add kinematic drag + fix MagnetPlayground without refactoring force drag.

**Why this approach**
- It minimizes new concepts: you already have “gesture writes target, physics loop applies it”; the core just standardizes that contract for both modes.
- Kinematic “velocity-to-target (+ optional transform)” gives the tight cursor feel while still producing plausible contact behavior (dynamic bodies react because the kinematic has a meaningful velocity).
- Extending `draggable` avoids duplicated targeting/ID plumbing and keeps the engine’s behavior catalog simpler.

**Watch out for**
- `setTransform` can effectively “teleport” and may tunnel through thin objects; prefer velocity driving first, and only add `setTransform` when you truly need perfect cursor lock.
- Temporarily switching a dynamic body to kinematic during drag can change gameplay feel; if you do it, store/restore the prior type and clear velocities on release.
- Make sure `screenToWorld` uses the same camera/viewport transform as rendering, otherwise kinematic drag will feel “off” even if it’s exact.

**Escalation triggers**
- You need dragging to respect joints/constraints (e.g., dragging a connected ragdoll limb) without breaking the system: consider a MouseJoint-based mode as a third option (`mode: 'joint'`) but keep it opt-in.
- You see tunneling or instability at high pointer speeds: add simple CCD mitigation (substep while dragging, clamp max velocity, or raycast along the drag path and clamp desired position).

**Concrete file/code structure (suggested)**
- `lib/physics2d/drag/dragTypes.ts`
- `lib/physics2d/drag/createDragController.ts`
- `lib/physics2d/drag/useDragGesture.ts`
- `lib/physics2d/drag/useDrag.ts`
- `lib/physics2d/useKinematicDrag.ts` (wrapper)
- (Optional) refactor `lib/physics2d/useForceDrag.ts` to wrap `useDrag`
- Update engine `BehaviorExecutor.ts` draggable behavior to accept `mode`
- Update `components/examples/MagnetPlayground.tsx` to use `useKinematicDrag` (or the core controller directly) with refs-based gesture state
