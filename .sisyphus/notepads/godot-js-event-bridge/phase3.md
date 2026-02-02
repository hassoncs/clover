## Phase 3: Migrate Native Bridge + Adaptive Polling - COMPLETE

### Changes Made:

1. **Added NativeBridgeCore class**:
   - Extends `BridgeCore`
   - Implements `send()` using `callGameBridge`

2. **Implemented adaptive polling**:
   - Changed from `setInterval(16)` to recursive `setTimeout`
   - Tracks `consecutiveEmptyPolls` 
   - Delay formula: `Math.min(16 * Math.pow(2, consecutiveEmptyPolls), 100)`
   - Back off: 16ms → 32ms → 64ms → 100ms (max)
   - Reset to 16ms when events arrive

3. **Wired events through BridgeCore dispatch**:
   - `collision` / `collision_detailed` → `bridgeCore.dispatch({ type: 'collision', data })`
   - `destroy` → `bridgeCore.dispatch({ type: 'entity_destroyed', data })`
   - `entity_spawned` → `bridgeCore.dispatch({ type: 'entity_spawned', data })`
   - `sensor_begin` → `bridgeCore.dispatch({ type: 'sensor_begin', data })`
   - `sensor_end` → `bridgeCore.dispatch({ type: 'sensor_end', data })`

4. **Updated dispose**:
   - Changed `clearInterval` to `clearTimeout`
   - Added `bridgeCore.cancelAllPending('Bridge disposed')`

### Performance Improvement:
- When idle: polling backs off from 60fps to 10fps
- When active: maintains 60fps responsiveness
- CPU savings when no events flowing
