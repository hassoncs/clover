I've updated **Breakout Bouncer** to support multiple input methods for controlling the paddle!

### New Controls Added:

1.  **Keyboard Control**:
    *   **Left Arrow** or **A key**: Move paddle left
    *   **Right Arrow** or **D key**: Move paddle right
    *   Works by holding down the key (continuous movement).

2.  **Touch/Tap Control**:
    *   **Tap Left Side** (x < 5): Move paddle left
    *   **Tap Right Side** (x >= 5): Move paddle right
    *   This is great for quick adjustments on mobile.

3.  **Drag Control** (Existing):
    *   The original "drag to move" logic is preserved, so you can still slide your finger to control the paddle precisely.

### Implementation Details
I modified `app/lib/test-games/games/breakoutBouncer.ts` to include new rules:
- `paddle_left` / `paddle_right`: Triggered by `button` events with state `held`.
- `tap_left` / `tap_right`: Triggered by `tap` events with conditions checking `input.tap.worldX`.

These changes leverage the existing game engine's rule system, ensuring consistent behavior across web and native platforms (now that the native input bridge is fixed!).

Give it a try—you should have full control over the paddle now!