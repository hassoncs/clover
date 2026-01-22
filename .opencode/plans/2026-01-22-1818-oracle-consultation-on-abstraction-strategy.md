---
title: "Oracle consultation on abstraction strategy"
agent: oracle
created: 2026-01-22T18:18:59.371Z
session_id: ses_419137286ffeC3TEnKsX5ltZ6C
duration: 1m 58s
---

# Oracle consultation on abstraction strategy

**Recommendation: C (Hybrid) — keep `usePhysicsExample` minimal, make the game engine the primary abstraction, and migrate/replace complex examples with engine-driven “recipes”.**

## Bottom line
Doubling down on `usePhysicsExample` turns it into a second game engine (imperative, bespoke APIs, hard for AI to target) and will inevitably diverge from your declarative/behavior system. Your current engine already covers most “complex example” needs (spawning, collisions, force fields, drag, gravity zones); the remaining gap is joints, which is a clean, bounded schema extension that aligns with the “high-level concepts easy to compose” goal.

## Action plan
1. **Draw a hard boundary for `usePhysicsExample`**
   - Keep it as: world lifecycle + step loop hooks + transform sync + (simple) drag + add/remove bodies.
   - Treat anything beyond that (collisions routing, joint graphs, complex input, gameplay rules) as engine territory.

2. **Make “engine games” the canonical examples for AI + composition**
   - For each complex example, create/maintain an equivalent `GameDefinition` in something like `app/lib/test-games/games/*`.
   - Use these as the reference set for “what AI should generate”.

3. **Close the key gap: add declarative joints to the engine (minimal set first)**
   - Add `joints: JointDefinition[]` to the game schema (start with `distance` and `revolute`; that covers RopeSwing + Pinball flippers).
   - Implement in the loader: after entities/bodies exist, create joints via the existing Physics2D joint support (you already have joint types in `app/lib/physics2d/types.ts` and adapter support in `app/lib/physics2d/Box2DAdapter.ts`).
   - Add just enough runtime addressing so behaviors/rules can reference joints when needed (e.g., `jointId`/`jointName` mapping).

4. **Fill only the missing behaviors you actually need**
   - **Slingshot**: implement as a small, explicit behavior (e.g., “drag_to_launch”) that reads `input.drag`/`input.dragEnd` and applies impulse; don’t generalize prematurely.
   - **Pinball flippers**: either a “flipper” behavior that drives a revolute motor, or a generic “joint_motor” behavior that sets motor speed/torque from input.

5. **Fix/align behavior typing so the engine is the single source of truth**
   - Right now there’s a clear mismatch: `shared/src/types/behavior.ts` doesn’t include `control`, but the gallery and API-side logic reference it (`shared/src/gallery/items/behaviors.ts`, `api/src/ai/*`). Make the shared type union match what the engine actually supports (or remove the dangling behavior definitions).

## What to do with existing examples
- **Keep the simple ones as raw-code demos** (they’re still valuable for teaching/debugging the Physics2D API and renderer integration).
- **Migrate the 7 complex examples into engine definitions** and present them as the “official” versions.
- **Deprecate (don’t delete) the old complex imperative examples**:
  - Keep them accessible under a “Legacy / Raw Physics Demos” section for reference.
  - Stop expanding `usePhysicsExample` to support them; point readers to the engine version as the recommended approach.

## Effort estimate
- **Medium (1–2d)** to add joints to the schema + loader + one end-to-end migrated joint-based game (RopeSwing or Pinball).
- **Large (3d+)** to migrate/polish all 7 complex examples and ensure the AI generator/examples/docs all align.

## Why this approach (key trade-off)
- **You avoid building two abstraction layers** (a power-user hook and a declarative engine) that solve the same problems differently.
- **You optimize for the future use case (AI generation)**: stable schema + composable behaviors beats bespoke imperative hooks every time.
- **You keep a clean escape hatch**: raw demos still exist when you need to show “how it works under the hood”.

## Watch out for
- **Schema sprawl**: keep joints minimal (distance + revolute first) and add more only when a real example requires it.
- **Behavior/type drift**: enforce that shared types reflect what `BehaviorExecutor` actually executes; otherwise AI, editor/gallery, and runtime will keep disagreeing.
- **Over-generalizing input**: implement Slingshot as one targeted behavior before inventing a full input DSL.

## Escalation triggers (when to revisit)
- If you routinely need “custom imperative logic per game” that can’t be expressed as a small number of behaviors/rules, consider adding a constrained “script behavior” (sandboxed expressions + strict capabilities). Until then, keep it declarative.
