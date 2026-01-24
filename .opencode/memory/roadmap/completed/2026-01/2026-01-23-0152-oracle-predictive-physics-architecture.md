---
title: "Oracle: predictive physics architecture"
agent: oracle
created: 2026-01-23T01:52:54.986Z
session_id: ses_41772d315ffeHT101YqZ4fGiHL
duration: 50s
---

# Oracle: predictive physics architecture

**Bottom line**
- Use a persistent **shadow/prediction Box2D world** and simulate **only the ball + all collision-relevant static geometry** (walls/pegs). This is the most practical way to get *exact* behavior without risky “snapshot/restore” hacks.
- Rebuild/sync the prediction world **only when static geometry changes** (level load, peg destroyed/moved), and during drag just **reset the predicted ball state** and run N fixed steps to produce the dotted path.

**Action plan**
1. **Introduce a first-class “prediction” component**
   - Add `TrajectoryPredictor` (engine-level) that depends on your existing `Physics2D` interface but is allowed to access a *prediction implementation* (still via adapter, but separate instance).
   - Keep it isolated: it should not mutate the main world.

2. **Create a persistent prediction world (Shadow World approach, optimized)**
   - Instantiate `PredictionPhysics2D` backed by its own `Box2DAdapter` + `b2World`.
   - Mirror **global settings** exactly: gravity, allowed sleep, continuous physics, warm starting, velocity/position iterations, contact flags, fixed timestep, unit scale.

3. **Build static geometry in the prediction world from a stable source of truth**
   - Best (simplest long-term): build both worlds from the same **level physics description** (list of bodies/fixtures with shape + material + filter bits). This avoids “copying Box2D internals” and avoids keeping adapter Maps in sync.
   - If you *must* copy from the live Box2D world, only do it at discrete sync points:
     - Iterate all bodies in the main world, select static/kinematic bodies that can affect the ball, and recreate their fixtures in prediction with identical `shape`, `density`, `friction`, `restitution`, `isSensor`, filter bits, and transforms.

4. **During drag: reset and simulate only the predicted ball**
   - Keep a single dynamic body `predBall` in the prediction world (created once).
   - Every frame while dragging:
     - `predBall.SetTransform(startPos, startAngle)`
     - `predBall.SetLinearVelocity(launchVelocity)`
     - `predBall.SetAngularVelocity(match)` (often 0)
     - Reset damping, gravity scale, bullet flag, fixed rotation, etc. to match the real ball.
     - Clear accumulated forces (and consider disabling sleep on `predBall`).
   - Run a fixed number of steps:
     - `for i in 0..N: predWorld.Step(dt, velIters, posIters)`
     - Sample positions every `k` steps (e.g., every 2–4 steps) to create evenly spaced dots without extra sim cost.

5. **Make “exactness” explicit**
   - Use the *same* fixed `dt` that your real physics uses (don’t use variable frame dt for prediction).
   - Use identical collision filtering and restitution/friction; mismatches here are the #1 reason previews “feel off.”
   - Ensure the ball uses the same CCD/bullet settings; otherwise high-speed peg hits will diverge.

6. **Handle moving objects deliberately**
   - If other dynamic bodies can affect the shot and you truly need exact preview, you must also include them in prediction (and keep them synced).
   - Pragmatic default: **ignore other dynamics** unless they are common/critical. In Peggle-like games, it’s usually acceptable because the only important collider set is static pegs/walls.

**Effort estimate**
- **Short (1–4h)** if you already have a level/scene physics definition you can reuse to build both worlds.
- **Medium (1–2d)** if you must extract/copy fixtures from the existing Box2D adapter and keep rebuild triggers correct.

---

**Why this approach**
- **Shadow world is the industry-standard “exact preview” technique** when the engine doesn’t support cloning/snapshotting. It’s predictable, debuggable, and keeps main-world state pristine.
- “Snapshot + restore” is rarely worth it in Box2D: you’d need to capture contacts, island state, broadphase proxies, sleeping, and internal solver caches to be truly exact—most implementations end up subtly wrong.

**How professional games typically do it (Peggle/Angry Birds style)**
- Common patterns:
  1. **Analytical arc only** when only gravity matters (no collisions).
  2. **Separate lightweight simulation** for accurate collision preview (your case).
- For games where collisions define the outcome (Peggle-like), teams usually accept the cost of a small forward simulation because it improves feel and trust.

**Performance budget (practical targets)**
- Aim for **~0.5–2.0 ms per frame** on desktop for preview (less on mobile), and cap work deterministically.
- Typical step counts:
  - Preview horizon: **1–2 seconds** of future motion is enough for a dotted line.
  - At 60 Hz fixed dt: that’s **60–120 steps**.
  - Sampling every 2–4 steps yields **15–60 dots** with the same sim cost.
- If you need more horizon, increase horizon only when the ball is slow or until first “important event” (e.g., first peg hit), rather than always simulating far.

**Persistent vs fresh each frame**
- **Persistent**. Create prediction world once, reuse every frame.
- Rebuild statics only on events (level load, geometry change). Recreating the world every frame will dominate CPU and GC and cause frame spikes—especially in JS/TS runtimes.

---

**Watch out for**
- **Determinism drift**: even with the same Box2D, tiny differences (CCD flags, body ordering, fixture friction/restitution, filter bits) cause divergence quickly after first collision.
- **Transform/scale mismatches**: if your adapter uses pixel↔meter conversion, prediction must use the exact same conversion path.
- **Rebuild triggers**: if pegs are removed/changed mid-aim, prediction must be notified to rebuild/update corresponding fixtures.

---

**Escalation triggers (when to add complexity)**
- You introduce meaningful moving colliders (rotating bumpers, moving walls, other balls) and preview must account for them reliably.
  - Then extend the predictor to also sync a small whitelist of dynamic bodies (positions/velocities) into prediction each frame, but keep the scope tight.

**Alternative sketch (only if needed)**
- If you later need “preview including dynamics” but want to limit sync complexity: maintain a **predictor whitelist** (IDs of bodies that matter) and mirror only those plus statics; everything else ignored. This keeps the mental model simple while covering the real gameplay cases.
