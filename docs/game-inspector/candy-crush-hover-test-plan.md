# Candy Crush Hover Bug - Test Plan

**Date**: 2026-01-25  
**Bug**: Hover highlight appears at wrong grid cell  
**Root Cause**: `worldToCell` used `Math.floor` instead of cell-center rounding  
**Fix Applied**: Added cell-center offset before floor operation

---

## Test Setup

### Prerequisites
1. OpenCode restarted (new MCP tools loaded)
2. Browser refreshed (new `__GAME_RUNTIME__` API available)
3. Candy Crush game open via `game_inspector_game_open({name: "candyCrush"})`

### Grid Layout (7x7)

```
      Col:  0      1      2      3      4      5      6
Row 0:   (-3.6,  (-2.4,  (-1.2,  (0.0,   (1.2,   (2.4,   (3.6,
          3.6)    3.6)    3.6)    3.6)    3.6)    3.6)    3.6)

Row 1:   (-3.6,  (-2.4,  (-1.2,  (0.0,   (1.2,   (2.4,   (3.6,
          2.4)    2.4)    2.4)    2.4)    2.4)    2.4)    2.4)

Row 2:   (-3.6,  (-2.4,  (-1.2,  (0.0,   (1.2,   (2.4,   (3.6,
          1.2)    1.2)    1.2)    1.2)    1.2)    1.2)    1.2)

Row 3:   (-3.6,  (-2.4,  (-1.2,  (0.0,   (1.2,   (2.4,   (3.6,
          0.0)    0.0)    0.0)    0.0)    0.0)    0.0)    0.0)

Row 4:   (-3.6,  (-2.4,  (-1.2,  (0.0,   (1.2,   (2.4,   (3.6,
         -1.2)   -1.2)   -1.2)   -1.2)   -1.2)   -1.2)   -1.2)

Row 5:   (-3.6,  (-2.4,  (-1.2,  (0.0,   (1.2,   (2.4,   (3.6,
         -2.4)   -2.4)   -2.4)   -2.4)   -2.4)   -2.4)   -2.4)

Row 6:   (-3.6,  (-2.4,  (-1.2,  (0.0,   (1.2,   (2.4,   (3.6,
         -3.6)   -3.6)   -3.6)   -3.6)   -3.6)   -3.6)   -3.6)
```

**Cell size**: 1.2m  
**Grid origin**: (-4.2, 4.2) (top-left of grid)

---

## Test Cases

### Test 1: Center Cell (Baseline)

**Objective**: Verify hover at grid center selects grid_3_3

```typescript
// Simulate mouse at grid_3_3 center
simulate_input({
  type: "mouse_move",
  worldX: 0,
  worldY: 0
});

// Wait 1 frame for processing
await new Promise(r => setTimeout(r, 100));

// Query for hover entity
const hover = query({selector: ".match3_ui"});

// ASSERT:
// - hover.count === 1
// - hover.matches[0].position.x ≈ 0 (within 0.01)
// - hover.matches[0].position.y ≈ 0 (within 0.01)
```

**Expected**: ✅ Hover appears at (0, 0)  
**Before Fix**: ❌ Would appear at wrong position

---

### Test 2: Top-Left Cell

**Objective**: Verify hover at grid_0_0 (extreme corner)

```typescript
simulate_input({
  type: "mouse_move",
  worldX: -3.6,
  worldY: 3.6
});

const hover = query({selector: ".match3_ui"});

// ASSERT:
// - hover entity at (-3.6, 3.6)
// - Corresponds to grid_0_0
```

**Expected**: ✅ Hover at grid_0_0

---

### Test 3: Bottom-Right Cell

**Objective**: Verify hover at grid_6_6 (opposite extreme)

```typescript
simulate_input({
  type: "mouse_move",
  worldX: 3.6,
  worldY: -3.6
});

const hover = query({selector: ".match3_ui"});

// ASSERT:
// - hover entity at (3.6, -3.6)
// - Corresponds to grid_6_6
```

**Expected**: ✅ Hover at grid_6_6

---

### Test 4: Cell Boundary (The Critical Test)

**Objective**: Verify hover near cell edges selects correct cell

Before fix, `Math.floor((x - originX) / cellWidth)` would select wrong cell when hovering on right/bottom half.

```typescript
// Hover at right edge of grid_3_3 (just before grid_3_4)
simulate_input({
  type: "mouse_move",
  worldX: 0.5,   // Halfway between grid_3_3 (0.0) and grid_3_4 (1.2)
  worldY: 0
});

const hover1 = query({selector: ".match3_ui"});

// BEFORE FIX: Would select grid_3_4 (wrong!)
// AFTER FIX: Should select grid_3_3 (correct - closer to center)

// ASSERT:
// - hover entity at (0.0, 0.0) - grid_3_3 center

// Now test the opposite edge
simulate_input({
  type: "mouse_move",
  worldX: -0.5,  // Halfway between grid_3_2 (-1.2) and grid_3_3 (0.0)
  worldY: 0
});

const hover2 = query({selector: ".match3_ui"});

// ASSERT:
// - hover entity still at (0.0, 0.0) - grid_3_3 center
```

**Expected**: Both positions select grid_3_3 (nearest cell)

---

### Test 5: Mouse Leave Clears Hover

**Objective**: Verify hover disappears when mouse leaves

```typescript
// First, trigger hover
simulate_input({type: "mouse_move", worldX: 0, worldY: 0});

let hover = query({selector: ".match3_ui"});
// ASSERT: hover.count === 1

// Simulate mouse leaving
simulate_input({type: "mouse_leave"});

await new Promise(r => setTimeout(r, 100));

hover = query({selector: ".match3_ui"});

// ASSERT: hover.count === 0 OR hover.matches[0].visible === false
// (depending on implementation - might hide vs destroy)
```

**Expected**: ✅ Hover removed/hidden

---

### Test 6: Multiple Rapid Hovers

**Objective**: Verify hover updates position correctly on mouse move

```typescript
// Hover over several cells rapidly
const positions = [
  {x: -3.6, y: 3.6},  // grid_0_0
  {x: 0, y: 0},       // grid_3_3
  {x: 3.6, y: -3.6},  // grid_6_6
];

for (const pos of positions) {
  simulate_input({type: "mouse_move", worldX: pos.x, worldY: pos.y});
  await new Promise(r => setTimeout(r, 50));
  
  const hover = query({selector: ".match3_ui"});
  
  // ASSERT: hover entity moved to pos.x, pos.y
  console.log(`Hover at (${pos.x}, ${pos.y}):`, hover.matches[0]?.position);
}
```

**Expected**: ✅ Hover follows mouse perfectly

---

## Verification Steps

### Step 1: Open Game
```typescript
game_inspector_game_open({name: "candyCrush"})
```

### Step 2: Verify Runtime API Available
```typescript
// Run in page context
const hasRuntime = await page.evaluate(() => {
  return typeof (window as any).__GAME_RUNTIME__ !== 'undefined';
});
// ASSERT: hasRuntime === true
```

### Step 3: Run Test Cases 1-6

Execute each test case above, collecting results.

### Step 4: Visual Verification (Optional)

```typescript
// Position hover at known location
simulate_input({type: "mouse_move", worldX: 0, worldY: 0});

// Take screenshot
game_screenshot({filename: "/tmp/candy-hover-test.png"});

// Manually inspect: Is highlight box centered on grid_3_3?
```

---

## Success Criteria

**The bug is FIXED when:**

1. ✅ `__GAME_RUNTIME__` API exists and responds
2. ✅ `simulate_input({type: 'mouse_move'})` triggers `match3System.handleMouseMove()`
3. ✅ Hover entity spawns/moves
4. ✅ Hover position matches hovered cell center (all test cases pass)
5. ✅ Cell boundary test (Test 4) selects nearest cell, not floor(offset/size)
6. ✅ Visual inspection confirms highlight appears in correct grid square

---

## Debug Commands (If Tests Fail)

### Check if hover entity exists
```typescript
query({selector: ".match3_ui"})
```

### Check hover entity position
```typescript
get_all_props({entityId: "<hover-entity-id>"})
```

### Manually verify worldToCell calculation
```typescript
// In shared/src/systems/grid/helpers.ts
// Old (wrong): col = floor((worldX - originX) / cellWidth)
// New (correct): col = floor((worldX - originX + cellWidth/2) / cellWidth)

// Example: Hover at worldX = -3.0 (should be col 0)
// originX = -4.2, cellWidth = 1.2
// Old: floor((-3.0 - (-4.2)) / 1.2) = floor(1.0) = 1 ❌ WRONG
// New: floor((-3.0 - (-4.2) + 0.6) / 1.2) = floor(1.5) = 1 ❌ Still wrong?

// Wait, let me recalculate with correct origin...
```

Actually, let me verify my `worldToCell` fix is correct by checking the grid config:

<function_calls>
<invoke name="read">
<parameter name="filePath">/Users/hassoncs/Workspaces/Personal/slopcade/app/lib/test-games/games/candyCrush.ts