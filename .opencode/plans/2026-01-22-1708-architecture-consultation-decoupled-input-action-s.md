---
title: "Architecture consultation: decoupled input-action system"
agent: oracle
created: 2026-01-22T17:08:04.096Z
session_id: ses_41952f56cffeh4BwgiLwCiSEBa
duration: 14s
---

# Architecture consultation: decoupled input-action system

**Bottom line**
Adopt a 3-stage pipeline: (1) InputSystem produces raw `InputEvent`s + stable per-frame `InputState`; (2) BindingSystem evaluates JSON-defined `Binding`s (including conditions/chords/targeting) and emits `ActionCommand`s; (3) ActionSystem executes `ActionCommand`s against ECS/physics/spawn APIs. This keeps behaviors generic (“what to do”) and moves “when/how triggered” entirely into data-driven bindings without needing a global subscriber/event-bus free-for-all.

**Action plan**
1. Implement `InputSystem`: normalize platform inputs into `InputEvent[]` (tap/drag/tilt/button/key) and `InputState` (held buttons, current tilt, active pointers).
2. Implement `BindingSystem`: evaluate a list of `Binding` rules each frame; when a rule matches, emit an `ActionCommand` into a world-level queue or per-entity buffer.
3. Implement `ActionSystem`: execute `ActionCommand`s (apply impulse, spawn, set variable, play animation, etc.) with a small, closed set of action types.
4. Add a tiny condition DSL + resolver: conditions read only from `ctx` (world state), entity components, and binding-local derived values (e.g., tap position, hit-test target).
5. Add legacy loader migration: convert old `tap_to_jump`-style behaviors into equivalent bindings + actions at load time; keep executor fallback temporarily.

**Effort estimate**
Medium (1–2d) for a first working pass (tap/drag/buttons + applyImpulse/spawn/setVar + basic conditions), assuming existing ECS/physics hooks already exist.

---

**Why this approach**
- “Event vs variable vs signal”: use events for *edge-triggered* gestures (tap start/end, drag start/move/end) and state for *level-triggered* inputs (button held, tilt vector). Bindings consume both and produce *commands* (`ActionCommand`) that are the only thing gameplay execution cares about.
- It’s JSON-friendly: bindings are declarative rules; actions are parameterized commands.
- It’s ECS-friendly: actions target entities via selectors; execution stays in systems, not in input code.

---

**Recommended answers to your specific questions**

1) **Signal vs Event vs Variable**
- Primary recommendation: **Hybrid “events + state → commands”**.
  - Raw input: `InputEvent[]` (tap/drag/pointer/key/button transitions) + `InputState` (held/analog).
  - Output: `ActionCommand[]` (a command buffer), consumed by an `ActionSystem`.
- Avoid making behaviors read `ctx.input.tap` directly as the primary contract; it pushes binding logic back into behaviors and makes composition/conditions messy
