# MultiPass Effect System — Test Plan

## The Problem

When drawing on the paint canvas and pressing "Start", everything turns gray instead
of showing the drawing being blurred. This means something is broken in the
SubViewport pipeline — likely the entity texture seeding, the read wiring, or the
warmup/cleanup sequence.

## Diagnosis: Why Gray?

The current simple-blur spec has **one buffer** (`canvas`) and **one pass** (`blur`)
that reads `current_buffer: "canvas"` and writes to `"canvas"`.

Since the pass is both the reader and writer of the same buffer, `_wire_buffer_reads`
resolves `current_buffer` → the pass's own viewport (it's the only writer, and it's
index >= pass_index, so `best_later = 0`). That means the shader reads its own output
from the previous frame — correct for feedback.

**But on the first frame**, the viewport is empty. The `start_effect()` code does:
1. Blits the entity texture via `_render_texture_into_viewport` (TextureRect)
2. Sets viewport to `UPDATE_ONCE` (renders the blit)
3. Then in `_process` warmup frame 1: removes the blit, sets `UPDATE_ALWAYS`
4. Frame 3: restores viewport textures, assigns display

**Possible bugs:**
- The `UPDATE_ONCE` blit may not actually render before the shader rect becomes visible
- The `CLEAR_MODE_NEVER` after blit + `CLEAR_MODE_NEVER` in warmup may clear the blit
- The shader rect reads `current_buffer` = own viewport texture, but after the blit is
  removed and the shader rect made visible, the first shader render may read an empty texture
  (the blit rendered into the viewport, but now the shader overwrites it immediately)

**Root issue**: The feedback loop has no "previous frame" on its first real render. The
shader reads the viewport texture, which the blit populated. But the shader then writes
back to the same viewport, overwriting it. On the NEXT frame, the shader reads what it
wrote last frame. If the blit was correctly captured, this works. If not → gray.

## Test Plan: Progressive Complexity

Build a single new example `multipass_test.tsx` with multiple test cases, selectable via
buttons. Each test isolates one layer of the system.

### Test 1: Passthrough — "Can we display a viewport at all?"

**What it tests**: Basic SubViewport → sprite texture assignment works.

```
Spec:
  buffers: { out: { initFrom: "clear" } }
  passes: [{ id: "fill", shader: RED_FILL, reads: {}, writes: "out" }]
  displayBuffer: "out"
```

Shader just outputs a solid color: `COLOR = vec4(1.0, 0.0, 0.0, 1.0);`

**Expected**: Entity turns solid red when started.
**Failure means**: SubViewport creation, tree parenting, or display texture swap is broken.

### Test 2: Entity Seed — "Can we read the pixel buffer into a viewport?"

**What it tests**: `initFrom: "entity"` seeding works. The viewport gets the pixel buffer content.

```
Spec:
  buffers: { img: { initFrom: "entity" } }
  passes: [{ id: "copy", shader: COPY_SHADER, reads: { src: "img" }, writes: "img" }]
  displayBuffer: "img"
```

Shader: `COLOR = texture(src, UV);` — pure passthrough.

**Setup**: Draw something on the pixel buffer first (like the paint example does).
**Expected**: When started, the drawing persists unchanged (it's copied each frame).
**Failure means**: Entity texture seeding or read wiring is broken.

### Test 3: Tint — "Can we read AND modify?"

**What it tests**: Reading the entity-seeded buffer AND applying a transform.

```
Spec:
  buffers: { img: { initFrom: "entity" } }
  passes: [{ id: "tint", shader: TINT_SHADER, reads: { src: "img" }, writes: "img" }]
  displayBuffer: "img"
```

Shader: `COLOR = texture(src, UV) * vec4(1.0, 0.5, 0.5, 1.0);` — red tint.

**Expected**: Drawing becomes red-tinted. Because of feedback, it gets MORE red every frame
(tint compounds). White stays white-ish, colors shift toward red.
**Failure means**: Feedback loop or shader parameter binding is broken.

### Test 4: Feedback Blur — "Does ping-pong feedback work?"

This is the exact test case that's currently failing. Same as the paint example's
simple blur spec.

```
Spec:
  buffers: { canvas: { initFrom: "entity" } }
  passes: [{ id: "blur", shader: BLUR_SHADER, reads: { current_buffer: "canvas" }, writes: "canvas" }]
  displayBuffer: "canvas"
```

**Expected**: Drawing gradually blurs/smears over time.
**Failure means**: The warmup/seed blit sequence has a timing issue.

### Test 5: Two Buffers — "Can passes read across buffers?"

**What it tests**: Multiple buffers, one pass writes to A reading B, another writes to B reading A.

```
Spec:
  buffers: {
    a: { initFrom: "entity" },
    b: { initFrom: "clear" }
  }
  passes: [
    { id: "a-to-b", shader: COPY_SHADER, reads: { src: "a" }, writes: "b" },
    { id: "show-b", shader: TINT_SHADER, reads: { src: "b" }, writes: "b" }
  ]
  displayBuffer: "b"
```

**Expected**: Entity drawing appears in buffer B with red tint applied.
**Failure means**: Cross-buffer read wiring is broken.

### Test 6: Dynamic Inputs — "Can we send per-frame uniforms?"

**What it tests**: `setMultiPassInput` works to inject values each frame.

```
Spec:
  buffers: { out: { initFrom: "clear" } }
  passes: [{ id: "dot", shader: DOT_SHADER, reads: {}, writes: "out",
             inputs: ["dot_pos", "dot_color"] }]
  displayBuffer: "out"
```

Shader: draws a dot at `dot_pos` with `dot_color`. The test sends input on drag events.

**Expected**: Dragging draws colored dots on a black background.
**Failure means**: Dynamic input pipeline is broken.

### Test 7: Stop & Capture — "Does stopping capture back to pixel buffer?"

**What it tests**: The stop → capture → restore flow.

1. Draw something
2. Start (blur begins)
3. Let it blur for a second
4. Stop
5. Drawing should now show the blurred result as a static pixel buffer
6. Draw MORE on top of the blurred result
7. Start again — new drawing + blurred old drawing should both be visible

**Expected**: Each start/stop cycle accumulates.
**Failure means**: `_capture_display_to_pixel_buffer` is broken.

## Implementation

Single file: `app/app/examples/multipass_test.tsx`

- Row of buttons at top: "T1", "T2", "T3", "T4", "T5", "T6", "T7"
- Each test configures a different spec
- "Start" / "Stop" / "Clear" buttons
- Drag to draw (for tests that need pixel buffer content)
- Status text showing which test is active and what to expect

## Debugging Approach

For each failing test, add `print()` statements in `MultiPassExecutor.gd`:
- `apply_effect`: log buffer count, pass count
- `start_effect`: log entity texture dimensions, whether blit was created
- `_process` warmup: log frame number and what's happening
- Display the viewport texture dimensions in the status text

Check the Godot web console for errors — shader compilation failures show there.
