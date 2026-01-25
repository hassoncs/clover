# Debug Bridge V2 Test Results

**Test Date**: 2026-01-25
**Test Environment**: Web (localhost:8085/test-games/slopeggle?debug=true)

## Test Summary

**Total APIs**: 24
**Passed**: 19
**Failed**: 5

## Detailed Results

### ✅ PASSING APIS (19)

| API | Status | Notes |
|-----|--------|-------|
| `getAllProps` | ✅ PASS | Returns full entity data |
| `setProps` | ✅ PASS | Correctly blocks unsafe properties |
| `spawn` | ✅ PASS | Creates entities successfully |
| `destroy` | ✅ PASS | Removes entities with queueFree |
| `clone` | ✅ PASS | Duplicates entities with offset |
| `getTimeState` | ✅ PASS | Returns time/physics state |
| `pause` | ✅ PASS | Sets timeScale to 0 |
| `resume` | ✅ PASS | Restores timeScale to 1 |
| `step` | ✅ PASS | Advances N frames |
| `setTimeScale` | ✅ PASS | Changes time speed |
| `setSeed` | ✅ PASS | Sets RNG seed + deterministic mode |
| `subscribe` | ✅ PASS | Returns subscription ID |
| `unsubscribe` | ✅ PASS | Cleans up subscription |
| `pollEvents` | ✅ PASS | Returns event array |
| `raycast` | ✅ PASS | Physics raycast with hits |
| `getShapes` | ✅ PASS | Returns shape data (rect/circle) |
| `getJoints` | ✅ PASS | Returns joint array (empty in test) |
| `queryPoint` | ✅ PASS | Physics point query |
| `queryAABB` | ✅ PASS | Found 42 entities in AABB |

### ❌ FAILING APIS (5)

#### 1. **`query` (CSS-like selector)** - CRITICAL BUG

**Status**: ❌ FAIL (All selectors returning 0 matches)

**Test Cases**:
```javascript
query('.peg', { limit: 3 })          // Expected: pegs  | Got: 0 matches
query('.orange-peg', { limit: 2 })   // Expected: orange pegs | Got: 0 matches  
query('[template=wall]', {})         // Expected: walls | Got: 0 matches
query('#blue-peg-1', {})             // Expected: 1 entity | Got: 0 matches
query('[name~=peg]', { limit: 3 })   // Expected: entities with 'peg' in name | Got: 0 matches
query(':inRect(-5,-5,5,5)', { limit: 5 }) // Got: "Unclosed pseudo-selector at 0"
```

**Root Cause**: The selector parsing/matching system in `DebugSelector.gd` is not matching entities against the CSS-like selectors.

**Impact**: HIGH - Query is a core V2 feature for entity discovery

---

#### 2. **`getProps` (specific property paths)** - BUG  

**Status**: ⚠️ PARTIAL (Returns empty values object)

**Test**:
```javascript
getProps('debug_ball_1', ['position', 'velocity'])
// Expected: { position: {...}, velocity: {...} }
// Got: { entityId: 'debug_ball_1', values: {} }
```

**Root Cause**: Property path resolution not extracting values correctly

**Impact**: MEDIUM - `getAllProps` works as workaround

---

#### 3. **`reparent`** - BUG

**Status**: ❌ FAIL  

**Test**:
```javascript
reparent('cloned-ball', 'GameRoot', {})
// Got: { ok: false, error: "New parent not found: GameRoot" }
```

**Root Cause**: Parent lookup expects node path, not entity ID

**Impact**: MEDIUM - Reparenting not possible with entity IDs

---

#### 4. **`patchProps` (increment operation)** - BUG

**Status**: ⚠️ PARTIAL (`addTag` works, `increment` fails)

**Test**:
```javascript
patchProps([
  { op: 'addTag', entityId: 'cloned-ball', value: 'test-tag' },  // ✅ PASS
  { op: 'increment', entityId: 'cloned-ball', path: 'position.x', value: 0.5 }  // ❌ FAIL
])
// increment error: "Property not found"
```

**Root Cause**: Increment operation can't resolve nested property paths

**Impact**: LOW - Can use `setProps` as workaround

---

#### 5. **`getOverlaps`** - Expected Behavior (Not a Bug)

**Status**: ℹ️ INFO

**Test**:
```javascript
getOverlaps('blue-peg-1')  // RigidBody2D
// Got: { error: "Entity is not a sensor (Area2D)", overlappingIds: [] }
```

**Note**: This is correct - `getOverlaps` only works for Area2D (sensors), not RigidBody2D. Not a bug.

---

## Priority Fixes

1. **HIGH**: Fix `query` CSS selector matching (entities not being matched)
2. **MEDIUM**: Fix `getProps` property path extraction  
3. **MEDIUM**: Fix `reparent` parent lookup (support entity IDs)
4. **LOW**: Fix `patchProps` increment nested path resolution

## Test Methodology

Tests executed via Playwright browser automation using direct bridge queries:

```javascript
const q = (method, args) => new Promise((resolve, reject) => {
  const requestId = `test_${++id}`;
  window._godotQueryResolve = (reqId, resultJson) => {
    if (reqId === requestId) resolve(JSON.parse(resultJson));
  };
  bridge.query(requestId, method, JSON.stringify(args));
});
```

All tests run against live Slopeggle game with debug mode enabled.
