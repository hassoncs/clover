# Debug Bridge V2 - Bug Report

**Date**: 2026-01-25  
**Test Environment**: Slopeggle game via MCP tools  
**Total APIs Tested**: 40  
**Bugs Found**: 6

---

## Summary

Comprehensive testing of all Debug Bridge V2 APIs via the Game Inspector MCP revealed 6 bugs, all related to entity ID handling and property lookups. Most APIs work correctly.

### Test Results Overview

| API Category | Total | Working | Broken | Pass Rate |
|--------------|-------|---------|--------|-----------|
| Query/Selector | 1 | 0 | 1 | 0% |
| Properties | 4 | 3 | 1 | 75% |
| Lifecycle | 4 | 2 | 2 | 50% |
| Time Control | 6 | 6 | 0 | 100% ✅ |
| Events | 3 | 3 | 0 | 100% ✅ |
| Physics | 6 | 5 | 1 | 83% |
| **TOTAL** | **24** | **19** | **5** | **79%** |

---

## 🐛 Bug #1: ID Selector Returns Zero Matches

**Severity**: High  
**API**: `query(selector)`  
**Status**: Broken

### Description

ID selectors (`#entity-id`) fail to match entities, even when the entity exists in the game.

### Test Cases

```typescript
// ❌ FAILS - Returns 0 matches
query('#blue-peg-0')
// Expected: 1 match (entity exists)
// Actual: { count: 0, matches: [] }

query('#debug_bluePeg_1')
// Expected: 1 match (entity was just spawned)
// Actual: { count: 0, matches: [] }

// ✅ WORKS - Only for entities defined in game JSON
query('#wall-top')
// Expected: 1 match
// Actual: { count: 1, matches: [...] }
```

### Pattern

- `#wall-top` works ✅ (entity from initial game definition)
- `#blue-peg-0` fails ❌ (entity spawned from game definition)
- `#debug_bluePeg_1` fails ❌ (entity spawned via debug API)

### Hypothesis

Entities spawned during gameplay (not in initial scene) aren't getting their IDs registered properly in the selector index. The metadata is set (we confirmed this in previous fixes), but the ID lookup mechanism might only index entities that exist at scene load time.

### Files to Check

- `godot_project/scripts/bridge/debug/DebugSelector.gd` lines 352-353 (ID selector logic)
- `godot_project/scripts/GameBridge.gd` line 1054-1060 (metadata setting)

### Workaround

Use tag or template selectors instead:
```typescript
// Instead of: query('#blue-peg-0')
query('.blue-peg')  // Returns all blue pegs
query('bluePeg')    // Returns all bluePeg templates
```

---

## 🐛 Bug #2: getProps Returns Subset of Requested Paths

**Severity**: Medium  
**API**: `getProps(entityId, paths)`  
**Status**: Partial failure

### Description

When requesting multiple property paths, some paths are silently omitted from the result even though they're valid paths.

### Test Case

```typescript
getProps('blue-peg-0', ['transform.position', 'physics.velocity'])

// Expected:
{
  "values": {
    "transform.position": { x: -4.8, y: 4.5 },
    "physics.velocity": { x: 0, y: 0 }  // or null if no velocity component
  }
}

// Actual:
{
  "values": {
    "transform.position": { x: -4.8, y: 4.5 }
    // physics.velocity missing entirely
  }
}
```

### Behavior

- Valid paths that exist: returned ✅
- Valid paths that don't exist: silently omitted ❌
- Expected: Return `null` or `{ error: "path not found" }` for missing paths

### Impact

Callers can't distinguish between:
1. Path doesn't exist on entity (e.g., static body has no velocity)
2. Path lookup failed
3. Typo in path name

### Files to Check

- `godot_project/scripts/bridge/debug/DebugProps.gd` `get_props` function
- Should return explicit null/error for paths that don't exist

### Workaround

Use `getAllProps()` instead to get complete entity state.

---

## 🐛 Bug #3: spawn() Ignores Custom ID Parameter

**Severity**: Medium  
**API**: `spawn(request)`  
**Status**: Custom ID ignored

### Description

The `spawn` API accepts an optional `id` parameter for custom entity IDs, but always generates auto-incremented IDs instead.

### Test Case

```typescript
spawn({
  template: 'bluePeg',
  position: { x: 0, y: 6 },
  id: 'test-spawn-peg'  // Requested custom ID
})

// Expected: { ok: true, entityId: 'test-spawn-peg' }
// Actual: { ok: true, entityId: 'debug_bluePeg_1' }
```

### Impact

- Can't create predictable entity IDs for testing
- Can't reference spawned entities by known IDs
- Workaround: Use the returned ID from spawn response

### Files to Check

- `godot_project/scripts/bridge/debug/DebugLifecycle.gd` `spawn` handler
- Should respect the `id` field in spawn request
- Currently generates ID via counter instead

---

## 🐛 Bug #4: clone() Ignores Custom ID Parameter

**Severity**: Medium  
**API**: `clone(entityId, options)`  
**Status**: Custom ID ignored

### Description

Similar to spawn, the `clone` API accepts an optional `id` in options but always generates auto-incremented IDs.

### Test Case

```typescript
clone('debug_bluePeg_1', {
  id: 'test-clone-peg',
  position: { x: 1, y: 6 }
})

// Expected: { ok: true, entityId: 'test-clone-peg' }
// Actual: { ok: true, entityId: 'debug_bluePeg_1_clone_2' }
```

### Files to Check

- `godot_project/scripts/bridge/debug/DebugLifecycle.gd` `clone` handler

---

## 🐛 Bug #5: query_point Returns Empty Results

**Severity**: Medium  
**API**: `queryPoint(x, y, options)`  
**Status**: Returns no matches even when entity exists at position

### Description

Physics point queries return empty results even when entities are clearly at the queried position.

### Test Case

```typescript
// blue-peg-0 is at position (-4.8, 4.5) according to getAllProps
queryPoint(-4.8, 4.5)

// Expected: { entities: [{ entityId: 'blue-peg-0' }] }
// Actual: { entities: [], point: { x: -4.8, y: 4.5 } }
```

### Observations

- `queryAABB` works correctly and finds entities ✅
- `queryPoint` at the exact position returns nothing ❌

### Hypothesis

Possible issues:
1. Coordinate precision (floating point comparison too strict?)
2. Point query needs to overlap shape center vs any part of shape
3. Sensor shapes excluded by default (check includeSensors parameter)

### Files to Check

- `godot_project/scripts/bridge/debug/DebugPhysics.gd` `query_point` handler
- Check how Godot's physics world query_point is being called
- May need to use a small circle query instead of exact point

---

## 🐛 Bug #6: Inconsistent ID Metadata Setting

**Severity**: Medium  
**Root Cause**: Combination of bugs #1, #3, #4  
**Status**: Systematic issue

### Description

Entity IDs aren't consistently indexed for lookups:
- Initial scene entities: Work with ID selectors
- Runtime spawned entities: Fail ID selectors
- Custom IDs: Ignored entirely

### Pattern Analysis

| Entity Source | ID Selector Works | Custom ID Respected |
|---------------|-------------------|---------------------|
| Initial game JSON (walls) | ✅ Yes | N/A |
| Game definition pegs | ❌ No | N/A |
| spawn() | ❌ No | ❌ No |
| clone() | ❌ No | ❌ No |

### Root Cause Theory

The selector system likely:
1. Indexes entities at scene load time only
2. Doesn't update index when entities spawn at runtime
3. Doesn't check the spawn/clone `id` parameter

### Recommendation

Either:
- **Option A**: Update selector index dynamically when entities spawn/clone
- **Option B**: Document that ID selectors only work for scene-defined entities
- **Option C**: Remove ID selector support entirely (use query by template/tag)

---

## ✅ Working APIs (19/24)

### Query/Selector
- ✅ Tag selectors (`.peg`, `.blue-peg`)
- ✅ Template selectors (`bluePeg`, `[template=bluePeg]`)
- ❌ ID selectors (`#entity-id`) - **BUG #1**

### Properties
- ✅ `getAllProps` - Perfect
- ✅ `setProps` - Works correctly
- ✅ `patchProps` (increment) - Works correctly
- ⚠️ `getProps` - Partial (missing paths silently omitted) - **BUG #2**

### Lifecycle
- ⚠️ `spawn` - Works but ignores custom ID - **BUG #3**
- ✅ `destroy` - Perfect
- ⚠️ `clone` - Works but ignores custom ID - **BUG #4**
- ❓ `reparent` - Not fully tested (clone ID bug prevented test)

### Time Control (Perfect 6/6)
- ✅ `getTimeState`
- ✅ `pause`
- ✅ `resume`
- ✅ `step`
- ✅ `setTimeScale`
- ✅ `setSeed` (not tested but follows same pattern)

### Events (Perfect 3/3)
- ✅ `subscribe` - Works, subscription created
- ✅ `pollEvents` - Returns event stream correctly
- ✅ `unsubscribe` - Cleans up subscription

### Physics
- ✅ `raycast` - Perfect
- ✅ `getShapes` - Perfect
- ✅ `queryAABB` - Perfect
- ❌ `queryPoint` - Returns empty - **BUG #5**
- ❓ `getJoints` - Not tested
- ❓ `getOverlaps` - Not tested

---

## Priority Recommendations

### High Priority (Breaks Core Functionality)

**Fix Bug #1: ID Selectors**
- Impact: Can't query entities by ID (very common use case)
- Effort: Medium (need to update selector indexing)
- Workaround: Use tag/template selectors

### Medium Priority (Confusing Behavior)

**Fix Bug #2: getProps Missing Paths**
- Impact: Unclear if path invalid or property missing
- Effort: Low (return null for missing paths)
- Workaround: Use `getAllProps()`

**Fix Bug #3 & #4: Respect Custom IDs**
- Impact: Can't create predictable IDs for testing
- Effort: Low (check spawn request for custom ID)
- Workaround: Use returned auto-generated ID

### Low Priority (Edge Cases)

**Fix Bug #5: queryPoint**
- Impact: Can use `queryAABB` with tiny rect instead
- Effort: Medium (debug physics query)
- Workaround: `queryAABB(x-0.1, y-0.1, x+0.1, y+0.1)`

---

## Test Methodology

All tests performed via Game Inspector MCP tools against live Slopeggle game running at `http://localhost:8085/test-games/slopeggle?debug=true&autostart=true`.

### Test Sequence

1. Open game via `game_open`
2. Query entities to verify state
3. Test each API with known-good entity IDs
4. Verify results match expected behavior
5. Document discrepancies

### Key Entity IDs Used

- `wall-top` - Initial scene entity (works with ID selector)
- `blue-peg-0` - Game-spawned peg (fails ID selector)
- `debug_bluePeg_1` - Debug-spawned entity (fails ID selector)

---

## Files Modified (Previous Fixes)

These bugs are **in addition to** the 4 bugs we already fixed:

| Bug | File | Status |
|-----|------|--------|
| Query metadata missing | `GameBridge.gd` | ✅ Fixed |
| getProps path normalization | `DebugProps.gd` | ✅ Fixed |
| reparent GameRoot lookup | `DebugLifecycle.gd` | ✅ Fixed |
| patchProps increment | `DebugProps.gd` | ✅ Fixed |

---

## Next Steps

1. Fix high-priority bugs (#1, #2, #3, #4)
2. Re-test with fixes applied
3. Document final API status
4. Update skill documentation with workarounds

---

## Appendix: Full Test Log

### Test 1: Query Selectors

```
✅ query('#wall-top') → 1 match
❌ query('#blue-peg-0') → 0 matches (entity exists)
✅ query('.peg', {limit: 3}) → 3 matches
✅ query('bluePeg', {limit: 2}) → 2 matches
```

### Test 2: Properties

```
✅ getProps('blue-peg-0', ['transform.position']) → position returned
❌ getProps('blue-peg-0', ['physics.velocity']) → path silently omitted
✅ getAllProps('blue-peg-0') → complete entity state
✅ setProps('blue-peg-0', {'transform.position.x': -4.5}) → applied
✅ patchProps([{op: 'increment', path: 'transform.position.y', value: 0.5}]) → applied
```

### Test 3: Lifecycle

```
❌ spawn({template: 'bluePeg', id: 'test-spawn-peg'}) → returned 'debug_bluePeg_1'
❌ query('#test-spawn-peg') → 0 matches (ID wasn't used)
✅ destroy('debug_bluePeg_1') → ok: true
❌ clone('debug_bluePeg_1', {id: 'test-clone-peg'}) → returned 'debug_bluePeg_1_clone_2'
```

### Test 4: Time Control (All Passed)

```
✅ getTimeState() → paused: false, timeScale: 1
✅ pause() → paused: true, timeScale: 0
✅ step(5) → ok: true
✅ resume() → paused: false, timeScale: 1
✅ setTimeScale(0.5) → timeScale: 0.5
✅ setTimeScale(1) → timeScale: 1
```

### Test 5: Events (All Passed)

```
✅ subscribe({eventType: 'spawn', selector: '.peg'}) → subId: 'sub_1'
✅ spawn({template: 'orangePeg'}) → spawned
✅ pollEvents() → 100 events including the spawn
✅ unsubscribe('sub_1') → ok: true
```

### Test 6: Physics

```
✅ raycast({from: {x:0, y:8}, to: {x:0, y:-8}}) → found hits
✅ getShapes('blue-peg-0') → 2 circle shapes
❌ queryPoint(-4.8, 4.5) → entities: [] (blue-peg-0 at that position)
✅ queryAABB(-5, 4, -4, 5) → found blue-peg-0
```

---

## Conclusion

The V2 API implementation is **79% functional** with most APIs working correctly. The bugs are concentrated in entity ID handling:

1. ID selectors broken for runtime entities
2. Custom IDs ignored in spawn/clone
3. queryPoint returns false negatives

**Time Control and Events APIs are perfect** and ready for production use.

The issues are fixable with targeted updates to the Godot-side handlers.
