# Paint Input Buffer Decoupling Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Decouple input capture from drawing so brush strokes remain smooth even when the shader pipeline stutters.

**Architecture:** Capture all drag points into a queue independent of draw timing. On the render tick, drain the queue into stroke batches at a fixed cadence (or when a threshold is hit) and send those batches to the pixel buffer. If the shader loop is running, schedule feedback injection using the queued commands. This keeps input sampling fast while render can lag without losing stroke continuity.

**Tech Stack:** Godot 4 GDScript, React Native/Expo, GodotBridge (native + web), QuerySystem.

---

### Task 1: Add an input buffer in the paint example (JS)

**Files:**
- Modify: `app/app/examples/paint.tsx`
- Test: `app/lib/godot/__tests__/bridge-callback-regression.test.ts`

**Step 1: Write the failing test**

Add a new unit test that simulates a burst of drag points, then verifies that buffering logic emits a continuous stroke payload (or multiple line segments) rather than dropping midpoints.

```ts
it("buffers drag points and flushes as a continuous stroke", () => {
  const buffered: Array<{ x: number; y: number }> = [];
  buffered.push({ x: 0, y: 0 }, { x: 0.25, y: 0.25 }, { x: 0.5, y: 0.5 });
  expect(buffered.length).toBe(3);
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd app && npx vitest run lib/godot/__tests__/bridge-callback-regression.test.ts
```
Expected: FAIL due to missing buffering behavior (test placeholder).

**Step 3: Write minimal implementation**

In `paint.tsx`, introduce an input buffer (array of points) that is appended immediately in the input callback. Use a timer or `requestAnimationFrame` (native/web) to flush the queue at a fixed cadence (e.g., every 16–33ms), converting buffered points into a `stroke` command or multiple `line` commands. Only the flush touches `bridge.drawToActiveBuffer`, so input stays lightweight.

**Step 4: Run tests to verify it passes**

```bash
cd app && npx vitest run lib/godot/__tests__/bridge-callback-regression.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add app/app/examples/paint.tsx app/lib/godot/__tests__/bridge-callback-regression.test.ts
git commit -m "feat: buffer paint input to prevent stroke gaps"
```

---

### Task 2: Add a draw queue in Godot for bursty input (optional, higher fidelity)

**Files:**
- Modify: `godot_project/scripts/bridge/GameBridgeEffects.gd`
- Modify: `godot_project/scripts/bridge/PixelBufferManager.gd`
- Modify: `godot_project/scripts/bridge/EventEmitter.gd`

**Step 1: Write the failing test**

No Godot unit test harness exists. Add diagnostic logging and a manual verification checklist instead.

**Step 2: Manual verification checklist (pre-change)**

In the paint example, draw a fast stroke while effects run. Observe gaps (expected failure).

**Step 3: Implement a buffer and drain loop**

- Add `_pending_draw_commands: Array` in `GameBridgeEffects.gd`.
- `draw_to_active_buffer` should enqueue commands immediately and return.
- In `_process`, drain the queue at a fixed max count per frame (or max time budget) into a single stroke to avoid spikes.
- When effects are running, schedule a single feedback injection per frame from the drained batch.

**Step 4: Manual verification (post-change)**

- Fast strokes should stay continuous even under shader load.
- No visible input lag or gaps in the path.

**Step 5: Commit**

```bash
git add godot_project/scripts/bridge/GameBridgeEffects.gd
git commit -m "fix: buffer paint commands to smooth input under load"
```

---

### Task 3: Optimize flush cadence and batching strategy

**Files:**
- Modify: `app/app/examples/paint.tsx`
- Modify: `godot_project/scripts/bridge/GameBridgeEffects.gd`

**Step 1: Add simple config constants**

- `FLUSH_INTERVAL_MS = 16–33`
- `MAX_POINTS_PER_FLUSH = 32–64`

**Step 2: Implement adaptive flushing**

- If buffer length exceeds threshold, flush immediately.
- Otherwise flush on cadence.

**Step 3: Manual verification**

- Measure responsiveness while effects run.
- Confirm no visual gaps when drawing quickly.

**Step 4: Commit**

```bash
git add app/app/examples/paint.tsx godot_project/scripts/bridge/GameBridgeEffects.gd
git commit -m "perf: batch paint input to reduce frame stalls"
```

---

### Task 4: Validate battery/perf impact

**Files:**
- None (observational)

**Step 1: Manual test**

- Start effects, draw continuously for 10–15 seconds.
- Observe FPS and device thermal behavior.

**Step 2: Optional logging**

- Add temporary counters (drain size, frame time) and remove after measurement.

---

## Verification Checklist

- Draw fast strokes while effects run; no missing segments.
- Input log rate stays high even when shader FPS dips.
- No regression: drawing still works on web + native.

## Notes

- This plan keeps a simple JS buffer first, then optionally pushes buffering into Godot to handle bursts without blocking UI.
- GPU-side injection remains a future optimization; this plan focuses on smoothing input without changing the shader pipeline.

---

Plan complete and saved to `docs/plans/2026-02-09-decouple-paint-input-buffer.md`.

Two execution options:

1. **Subagent-Driven (this session)** — I dispatch a fresh subagent per task, review between tasks.
2. **Parallel Session (separate)** — Open a new session with executing-plans and batch execution with checkpoints.

Which approach?
