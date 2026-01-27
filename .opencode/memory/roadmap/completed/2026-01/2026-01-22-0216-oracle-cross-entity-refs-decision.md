---
title: "Oracle: Cross-entity refs decision"
agent: oracle
created: 2026-01-22T02:16:28.553Z
session_id: ses_41c84082dffeO80ljIw1x3wzuE
duration: 1m 17s
---

# Oracle: Cross-entity refs decision

**Bottom line**
- Q1: Yes, but only through a small, explicit “entity query” API—start with O(1) ID lookups and a couple of safe helpers; defer “nearest”/broad tag queries until you have caching/spatial support.
- Q2: Go with pull-based on-demand evaluation, plus optional per-frame memoization (`cache: 'frame'`); do not build automatic dependency tracking yet.

**Action plan**
1. Q1 (Cross-entity refs): expose a constrained set of built-ins to expressions (backed by `EntityManager`) rather than arbitrary graph traversal.
   - Start set: `entity.exists(id)`, `entity.pos(id)`, `distanceTo(id)`, `entities.count(tag)`
   - Semantics: missing entity/tag returns predictable defaults (e.g. `exists=false`, distances=`Infinity`, numeric reads=`0` only if explicitly wrapped by helper).
2. Add a “cost guardrail” for tag queries:
   - Cache common aggregates once per frame (e.g. `count(tag)` results) inside the evaluator so repeated reads are cheap.
   - Document “ID refs are cheap, tag queries are not” and keep tag-based queries out of per-entity hot loops unless cached.
3. Q2 (Evaluation strategy): implement `Value<T>` evaluation as on-demand, with `cache: 'none' | 'frame'` at first.
   - `frame` cache key = `(expressionId, frameId, entityId?)`.
4. Provide a simple escape hatch for “nearest” use cases without baking it into expressions yet:
   - Do target selection in behaviors/rules at a throttled rate (e.g. every 0.25s) and store `runtime.state.targetId`; expressions can then do `distanceTo(targetId)` cheaply.

**Effort estimate**
- Quick (<1h) for the decision + API shape; Short (1–4h) to implement the minimal query helpers + per-frame memoization once you’re in code.

**Why this approach**
- It matches your current engine: `EntityManager.getEntity(id)` is cheap and already used broadly; “nearest/tag scans” are where perf/complexity spikes.
- On-demand + per-frame memoization preserves a simple mental model and avoids the hardest part (dependency graphs) until you have real pressure to justify it.

**Watch out for**
- Null/missing references: do not silently coerce missing entities into `0` everywhere—prefer `exists()` + explicit fallback patterns to avoid “AI bugs” that look like valid numbers.
- Determinism: if you later add helpers that iterate entities, define stable ordering (by id/creation index) so results don’t flicker frame-to-frame.

**Escalation triggers (revisit with a more complex design)**
- You see lots of per-entity expressions doing `entities.*` queries each frame (CPU spikes), or you need “nearestEnemy.health” everywhere.
- You need cached-until-event semantics for expensive queries (spawn/despawn/score-change driven), or you want network/replay determinism with strict evaluation ordering.

**Alternative sketch (advanced path)**
- Add “generation counters” (e.g. `scoreGen`, `entitiesGen`, `transformGenByEntity`) and allow `cache: 'until:score' | 'until:entities' | 'until:entity:<id>'` (still simpler than full dependency graphs).
- Only if that’s not enough: compile-time dependency extraction + dirty-flag propagation (Option C), which is powerful but meaningfully higher complexity.
