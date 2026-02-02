## Phase 2: Migrate Web Bridge - COMPLETE (Minimal Integration)

Added BridgeCore integration to GodotBridge.web.ts:

### Changes Made:
1. Imported `BridgeCore` and `BridgeMessage` from `./BridgeCore`
2. Created `WebBridgeCore` class extending `BridgeCore`:
   - Implements `send()` to use existing QuerySystem
   - Takes `getGodotBridge` function in constructor
3. Instantiated `bridgeCore` in `createWebGodotBridge()`
4. Wired Godot callbacks to also dispatch through BridgeCore:
   - `collision` → `bridgeCore.dispatch({ type: 'collision', data: event })`
   - `entity_destroyed` → `bridgeCore.dispatch({ type: 'entity_destroyed', data: { entityId } })`
   - `entity_spawned` → `bridgeCore.dispatch({ type: 'entity_spawned', data: event })`
   - `sensor_begin` → `bridgeCore.dispatch({ type: 'sensor_begin', data: event })`
   - `sensor_end` → `bridgeCore.dispatch({ type: 'sensor_end', data: event })`

### Backward Compatibility:
- Existing callback arrays still work unchanged
- New dispatch is additive (doesn't replace existing)
- No breaking changes to public API

### Future Work (Not Done Yet):
- Replace `_lastResult` patterns with `bridgeCore.request()`
- Expose `bridgeCore` for new consumers
- Consolidate duplicate callback handling
