---
title: "Oracle consultation on drag system architecture"
agent: oracle
created: 2026-01-22T17:28:37.361Z
session_id: ses_419408c85ffezT5rAbDm2FbNkZ
duration: 52s
---

# Oracle consultation on drag system architecture

**Bottom line**
- Redesign the drag hooks around an explicit two-part “around the physics step” contract: `beforePhysicsStep(dt)` + `afterPhysicsStep(dt)`. Make each mode a safe no-op in the “wrong” half (force uses mostly `before`, kinematic applies only in `after`), so callers never need to know timing rules.
- In the engine, don’t add a whole new global phase yet; instead, treat `draggable` as a split-phase behavior: force contribution runs in your existing “input” phase, kinematic setTransform runs in `post_physics`. This keeps JSON simple while making timing mechanically correct.

**Action plan**
1. Hooks: introduce a single primary hook/controller API that returns two functions:
   - `beforePhysicsStep(dt)` (accumulate forces / cache drag target)
   - `afterPhysicsStep(dt)` (apply kinematic `setTransform` / optional cleanup)
2. Make the functions mode-aware:
   - `mode: "force"`: `beforePhysicsStep` applies forces; `afterPhysicsStep` no-op (or minor smoothing/telemetry).
   - `mode: "kinematic"`: `beforePhysicsStep` stores target pose only; `afterPhysicsStep` calls `setTransform` (and optionally zeroes velocities).
3. Provide a tiny helper wrapper for standalone examples to make it nearly impossible to misuse:
   - `stepWithDrag(dt, stepPhysics)` that internally calls `drag.beforePhysicsStep(dt)`, then `stepPhysics(dt)`, then `drag.afterPhysicsStep(dt)`.
4. Engine: update `DraggableBehavior` execution so it schedules internally:
   - If `mode === "force"` run in current `input` phase (as today).
   - If `mode === "kinematic"` run its “apply” portion in `post_physics` (even if the behavior is declared under “input” in JSON).
5. Documentation/naming: standardize the vocabulary everywhere on “before/after physics step” (not “pre/post” and not “input”), and show the canonical loop snippet for hooks.

**Effort estimate**
- Short (1–4h) if you already have a centralized stepping function for examples; Medium (1–2d) if you need to refactor multiple examples and engine scheduling to unify around the split-phase contract.

**Why this approach**
- It’s the smallest change that makes timing a property of the API shape (call both halves around `world.step`) instead of a property of user knowledge.
- It unifies engine + hooks: the engine already has phases; you’re just mapping the same “before/after step” split onto existing phases rather than inventing new concepts.

**Watch out for**
- Kinematic drag usually also needs velocity handling (often set linear/angular velocity to 0 or compute from position delta). Decide and document one default to avoid “sticky” collisions or energy injection.
- If a standalone caller forgets to call `afterPhysicsStep`, kinematic drag will do nothing. Add a dev-only warning: if `mode==="kinematic"` and targets are being set but `afterPhysicsStep` hasn’t been called for N frames, log a clear message.
- Naming mismatch: your engine phase named “input” is currently *post-step*, which is counterintuitive. Even if you keep phases, document them as “post-step input” (or alias internally) to reduce future mistakes.

**Escalation triggers**
- Add a dedicated engine phase (e.g. `post_step_input`) only if you accumulate multiple behaviors that are *strictly* post-step (not just draggable kinematic). If “post-step-only” behaviors become common, a first-class phase becomes worth the extra complexity.

**Alternative sketch (if you want maximum foolproofing)**
- A higher-level hook `usePhysicsDrag({ registerBeforeStep, registerAfterStep, ... })` that self-registers into a provided physics-loop scheduler. This is very robust, but it requires you to own/standardize a loop registration mechanism across examples, which is more infrastructure than you likely need right now.
