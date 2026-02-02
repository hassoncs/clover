## Task 3: Create TargetPositionRuntimeSystem - COMPLETE

File exists at: app/lib/game-engine/systems/runner/wrappers/TargetPositionRuntimeSystem.ts

Implementation includes:
- VISUAL phase, priority 50
- Supports multiple easing functions (linear, easeInQuad, easeOutQuad, easeInOutQuad, easeOutBounce)
- Interpolates position each frame
- Updates entity transform and calls bridge.setPosition()
- Clears movementTarget when animation completes
- Tracks active animation count in state
