## Ball Launch Mechanic Implementation (2026-01-31)

### New Behaviors Created
1. **stick_to_entity**: Attaches entity to another entity by tag
   - Follows target position with optional offset
   - Supports rotation inheritance
   - Sets velocity to zero while attached
   - Phase: 'movement'

2. **launch_on_input**: Launches entity on tap/click
   - Detects tap input via `ctx.input.tap`
   - Launches in random upward direction (configurable angle range)
   - Enables another behavior after launch (via index)
   - Disables itself after launch
   - Phase: 'input'

### Implementation Pattern
- Added new behavior types to `shared/src/types/Behavior.ts`
- Created `LaunchBehaviors.ts` following existing behavior file pattern
- Registered in `BehaviorExecutor.ts` with appropriate phases
- Used `runtime.state` for tracking launch state

### Game Configuration
Ball template now has 3 behaviors:
1. `stick_to_entity` - Active initially, keeps ball on paddle
2. `launch_on_input` - Active initially, waits for tap then launches
3. `maintain_speed` - Disabled initially, enabled after launch (index 2)

### Key Decisions
- Launch angle is random within range (45-135 degrees from vertical)
- Ball starts stuck to paddle with -0.5 Y offset
- Removed gameStart launch rule - now player-initiated
- Removed impulse from ball_drain respawn - ball sticks again

### TypeScript Patterns
- Used `ctx.resolveNumber()` for dynamic values
- Used `ctx.resolveVec2()` for vector values
- Followed existing behavior handler signature
- Added proper type exports to Behavior union type
