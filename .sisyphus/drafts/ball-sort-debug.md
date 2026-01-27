# Draft: Ball Sort Debug & Layout Fix

## Requirements (confirmed)
- Fix column spacing so all 6 tubes fit horizontally on vertical phone screen
- Enable input/hit area debugging overlays
- Add console logging to tube touch events
- Implement oscillation animation for selected tube/ball
- Verify tube→tube ball movement game flow
- Manual QA testing of touch interactions

## Technical Findings

### Layout Issue (CONFIRMED CRITICAL)
- **Current calculation**: `TUBE_START_X (0.2) + NUM_TUBES (6) × TUBE_SPACING (2.8) = 17.0 units`
- **World width**: 12 units
- **Problem**: Total required width (17.0) exceeds WORLD_WIDTH (12)!
- **Result**: Rightmost tubes are off-screen

### Proposed Layout Fix
- Available horizontal space: WORLD_WIDTH = 12
- Need to fit 6 tubes + margins
- Each tube width: TUBE_WIDTH = 1.4

**Calculation approach**:
- Desired margins: ~0.5 units each side = 1.0 total
- Usable width: 12 - 1 = 11 units
- For 6 tubes: TUBE_SPACING = 11 / 5 = 2.2 (spacing between centers)
- Alternative: TUBE_SPACING = 11 / 6 ≈ 1.83 (with first tube centered at TUBE_START_X)
- Need to decide: edge-to-edge or center-to-center spacing

### Debug Overlay
- Enable via: `input: { debugInputs: true }` in game definition
- InputDebugOverlay shows:
  - Tappable entity highlights (cyan dashed borders)
  - Tap markers (green crosshairs)
  - Input log (TAP events + targetEntityId)
- Currently NOT enabled in ballSort/game.ts

### Console Logging Locations
- `BallSortActionExecutor.ts`:
  - `getTubeIndexFromInput()` - line 191-201: Parse tube index from targetEntityId
  - `executePickup()` - line 42-90: Pickup logic
  - `executeDrop()` - line 92-167: Drop logic

### Animation Patterns (CONFIRMED)
- **`scale_oscillate` behavior** exists in `VisualBehaviors.ts`
  - Uses sine wave to oscillate scaleX/scaleY between min and max
  - Example from gemCrush: `{ type: "scale_oscillate", min: 0.97, max: 1.06, speed: 5 }`
- **`sprite_effect` with pulse** exists for glow effects
- **`oscillate` behavior** moves entity position back and forth (not what we want for selection)

**Recommended approach for held ball**: 
- Use `scale_oscillate` behavior with conditional trigger when ball has "held" tag
- Add tag `sys.held` or similar when ball is picked up
- ConditionalBehavior triggers scale_oscillate when tag present

## Decisions Made (User Confirmed)
1. **Layout margins**: Tight fit (~0.5 unit margins each side)
2. **Selection animation**: Glow effect + scale pulse (both combined)
3. **Console logging**: Minimal (key events only)
4. **Test strategy**: Manual QA only (no unit tests)

## Scope Boundaries
- INCLUDE: Layout fix, debug overlay enable, console logging, glow+scale animation, manual QA
- EXCLUDE: Unit tests, other game changes, refactoring

## Research Findings
- Ball Sort uses `tubeSensor` entities for tap detection
- Regex pattern: `/tube-(\d+)-sensor/` extracts tube index
- State machine: idle ↔ holding (via events: ball_picked, ball_dropped, pickup_cancelled)
- Balls are kinematic bodies (not dynamic) - moved via setPosition()
