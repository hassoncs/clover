# Unified Input Simulation System - Design Plan

**Date**: 2026-01-25  
**Goal**: Single `simulate_input` tool that triggers the exact same code paths as real user input

---

## Problem Statement

### Current State (Broken)
- ❌ Separate tools: `game_tap`, `game_drag`, `game_wait_*`
- ❌ No mouse move simulation (can't test hover)
- ❌ No keyboard simulation
- ❌ Don't go through game engine's input pipeline
- ❌ Different code path than real input = can't catch real bugs

### Root Issue
**The hover bug exists because we can't simulate the mouse move event that triggers `match3System.handleMouseMove()`.**

---

## Complete Input Types (from Engine)

From `BehaviorContext.ts` lines 15-50, the game engine supports:

| Input Type | Structure | Trigger | Cleared |
|------------|-----------|---------|---------|
| **tap** | `{x, y, worldX, worldY}` | Touch up after quick press | End of frame |
| **drag** | `{startX/Y, currentX/Y, start/currentWorldX/Y, targetEntityId}` | Touch move | On release |
| **dragEnd** | `{velocityX/Y, worldVelocityX/Y}` | Touch up after drag | End of frame |
| **mouse** | `{x, y, worldX, worldY}` | Mouse move (web only) | On mouse leave |
| **buttons** | `{left, right, up, down, jump, action}` | Keyboard (web only) | On key up |
| **joystick** | `{x, y, magnitude, angle}` | Virtual joystick | Continuous |
| **tilt** | `{x, y}` | Accelerometer | Continuous |

---

## How Real Input Flows

### Web Platform (GameRuntime.godot.tsx)

```
User Action → DOM Event Listener → InputRef Update → Game Loop Reads InputRef → Behaviors Execute
```

**Example: Mouse Move**
```typescript
// Line 976: addEventListener
window.addEventListener("mousemove", handleMouseMove);

// Lines 899-930: Handler
const handleMouseMove = (e: MouseEvent) => {
  // 1. Get screen coords from event
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // 2. Convert to world coords
  const world = viewportSystem.viewportToWorld(x, y, camera.getPosition(), camera.getZoom());
  
  // 3. Update inputRef
  inputRef.current.mouse = { x, y, worldX: world.x, worldY: world.y };
};

// Lines 630-635: Game loop reads it
const mouseInput = inputSnapshot.mouse;
if (mouseInput) {
  match3System.handleMouseMove(mouseInput.worldX, mouseInput.worldY);
}
```

**Example: Tap**
```typescript
// Tap handler
onPress={() => {
  const worldPos = camera.screenToWorld(x, y);
  inputRef.current.tap = { x, y, worldX: worldPos.x, worldY: worldPos.y };
}}

// Game loop
if (tapInput) {
  match3System.handleTap(tapInput.worldX, tapInput.worldY);
}
```

**Example: Keyboard**
```typescript
// Lines 432-500: Keyboard setup
window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") buttonsRef.current.left = true;
  inputRef.current.buttons = { ...buttonsRef.current };
});

// Game loop: Behaviors check ctx.input.buttons
```

### Godot Platform (Native)

Currently has tap/drag via Godot's input system. Mouse hover doesn't apply to mobile.

---

## Design: Unified `simulate_input` Tool

### API Signature

```typescript
simulate_input({
  type: 'tap' | 'mouse_move' | 'drag_start' | 'drag_move' | 'drag_end' | 'key_down' | 'key_up',
  
  // World coordinates (for all position-based inputs)
  worldX?: number,
  worldY?: number,
  
  // Drag-specific
  startWorldX?: number,
  startWorldY?: number,
  targetEntityId?: string,
  velocity?: {x: number, y: number},
  
  // Keyboard-specific
  key?: 'left' | 'right' | 'up' | 'down' | 'jump' | 'action',
})
```

### How It Works

**The tool directly manipulates `inputRef` in GameRuntime:**

```typescript
// MCP tool → Evaluate in browser context
await page.evaluate(async (input) => {
  // Access the React component's inputRef
  const gameRuntime = window.__GAME_RUNTIME__;  // We need to expose this
  if (!gameRuntime) return {error: "Game not ready"};
  
  switch (input.type) {
    case 'mouse_move':
      gameRuntime.setInput('mouse', {
        x: 0,  // Screen coords (calculated)
        y: 0,
        worldX: input.worldX,
        worldY: input.worldY
      });
      break;
      
    case 'tap':
      gameRuntime.setInput('tap', {
        x: 0,
        y: 0,
        worldX: input.worldX,
        worldY: input.worldY
      });
      break;
      
    case 'key_down':
      gameRuntime.setButtonState(input.key, true);
      break;
      
    // ... etc
  }
}, inputParams);
```

---

## Implementation Plan

### Step 1: Expose Game Runtime to Window (Required)

**File**: `app/lib/game-engine/GameRuntime.godot.tsx`

```typescript
// Add useEffect to expose runtime control
useEffect(() => {
  if (typeof window !== 'undefined' && definition?.match3) {
    (window as any).__GAME_RUNTIME__ = {
      setInput: (type: string, value: any) => {
        switch(type) {
          case 'mouse':
            inputRef.current.mouse = value;
            break;
          case 'tap':
            inputRef.current.tap = value;
            break;
          case 'drag':
            inputRef.current.drag = value;
            break;
          case 'dragEnd':
            inputRef.current.dragEnd = value;
            break;
        }
      },
      setButtonState: (button: string, pressed: boolean) => {
        if (!buttonsRef.current) {
          buttonsRef.current = {left: false, right: false, up: false, down: false, jump: false, action: false};
        }
        buttonsRef.current[button] = pressed;
        inputRef.current.buttons = {...buttonsRef.current};
      },
      clearInput: (type: string) => {
        inputRef.current[type] = undefined;
      }
    };
  }
  
  return () => {
    if (typeof window !== 'undefined') {
      delete (window as any).__GAME_RUNTIME__;
    }
  };
}, [definition]);
```

### Step 2: Create Unified MCP Tool

**File**: `packages/game-inspector-mcp/src/tools/interaction.ts`

Replace all individual tools with ONE tool:

```typescript
server.tool(
  "simulate_input",
  "Simulate any type of user input (tap, mouse move, drag, keyboard)",
  {
    type: z.enum(['tap', 'mouse_move', 'mouse_leave', 'drag_start', 'drag_move', 'drag_end', 'key_down', 'key_up']),
    
    worldX: z.number().optional(),
    worldY: z.number().optional(),
    
    startWorldX: z.number().optional(),
    startWorldY: z.number().optional(),
    
    velocity: z.object({x: z.number(), y: z.number()}).optional(),
    targetEntityId: z.string().optional(),
    
    key: z.enum(['left', 'right', 'up', 'down', 'jump', 'action']).optional(),
  },
  async (args) => {
    // Implementation calls window.__GAME_RUNTIME__.setInput()
  }
);
```

### Step 3: Input Type Mappings

| MCP Input Type | Sets inputRef | Used By | Notes |
|----------------|---------------|---------|-------|
| `tap` | `tap: {x, y, worldX, worldY}` | Match3 tap, behaviors | Cleared end of frame |
| `mouse_move` | `mouse: {x, y, worldX, worldY}` | Match3 hover | Persistent until mouse_leave |
| `mouse_leave` | `mouse: undefined` | Match3 hide hover | Clears mouse state |
| `drag_start` | `drag: {start/currentX/Y...}` | Match3, slingshot | Starts drag gesture |
| `drag_move` | Updates `drag.current*` | Draggable entities | Updates during drag |
| `drag_end` | `dragEnd: {velocity*}` | Slingshot launch | Cleared end of frame |
| `key_down` | `buttons.{key}: true` | Keyboard controls | Persistent until key_up |
| `key_up` | `buttons.{key}: false` | Keyboard controls | Clears button state |

---

## Benefits of Unified Approach

### ✅ Single Code Path
- MCP input → `inputRef` → Game loop
- **Exact same path as real user input**
- If MCP test passes, real input will work

### ✅ Complete Coverage
- Can test hover (mouse_move)
- Can test keyboard controls
- Can test all drag phases
- Can test multi-input scenarios

### ✅ Simpler API
- One tool with `type` discriminator
- Fewer tools to remember
- Consistent parameter structure

### ✅ Easier Debugging
- Trigger exact input sequence that causes bugs
- Step-by-step input replay
- Deterministic test scenarios

---

## Usage Examples

### Test Candy Crush Hover

```typescript
// Simulate mouse over grid cell at row 3, col 3
simulate_input({
  type: 'mouse_move',
  worldX: 0,      // grid_3_3 center
  worldY: 0
});

// Query for hover highlight
const hover = query({selector: '.match3_ui'});
// Verify: hover entity exists at (0, 0)

// Clear hover
simulate_input({type: 'mouse_leave'});
```

### Test Keyboard Controls

```typescript
// Press right arrow
simulate_input({type: 'key_down', key: 'right'});

// Game loop processes: ctx.input.buttons.right === true

// Release
simulate_input({type: 'key_up', key: 'right'});
```

### Test Drag Slingshot

```typescript
// Start drag on ball
simulate_input({
  type: 'drag_start',
  worldX: 0,
  worldY: 5,
  targetEntityId: 'ball'
});

// Move drag (pulling back)
simulate_input({
  type: 'drag_move',
  worldX: 0,
  worldY: 3
});

// Release (launch)
simulate_input({
  type: 'drag_end',
  velocity: {x: 0, y: -10}
});
```

---

## Implementation Checklist

### Phase 1: Expose Runtime API
- [ ] Add `window.__GAME_RUNTIME__` interface in GameRuntime.godot.tsx
- [ ] Implement `setInput(type, value)` method
- [ ] Implement `setButtonState(button, pressed)` method
- [ ] Implement `clearInput(type)` method
- [ ] Add cleanup in useEffect return

### Phase 2: Implement MCP Tool
- [ ] Remove old tools: `game_tap`, `game_drag`, `game_mouse_move`
- [ ] Create unified `simulate_input` tool
- [ ] Add Zod schema for all input types
- [ ] Implement evaluator that calls `__GAME_RUNTIME__`
- [ ] Handle coordinate conversion (world → screen if needed)

### Phase 3: Testing
- [ ] Test `mouse_move` triggers match3 hover
- [ ] Test `tap` triggers match3 selection
- [ ] Test `key_down`/`key_up` triggers button controls
- [ ] Test `drag_*` sequence works end-to-end
- [ ] Verify inputs are cleared properly (transient vs continuous)

### Phase 4: Fix Candy Crush Hover Bug
- [ ] Use `simulate_input` to test hover at known grid positions
- [ ] Compare hover entity position vs expected position
- [ ] Fix `worldToCell` bug (already fixed in previous work)
- [ ] Verify fix with `simulate_input` again

---

## Success Criteria

**The implementation is complete when:**

1. ✅ Single `simulate_input` tool replaces all input tools
2. ✅ All 8 input types work (`tap`, `mouse_move`, `mouse_leave`, `drag_*`, `key_*`)
3. ✅ Input goes through `inputRef` (same as real input)
4. ✅ Match3 hover appears at correct position when using `simulate_input({type: 'mouse_move'})`
5. ✅ Keyboard controls work with `simulate_input({type: 'key_down'})`
6. ✅ All existing game inspector tests still pass

---

## Technical Details

### Coordinate Conversion

The tool operates in **world coordinates** (physics space). The runtime handles conversion:

```
World Coords → inputRef → Game Loop
(MCP provides)  (Runtime converts to screen if needed)
```

### Input Lifecycle

| Type | Persistence | Cleared When |
|------|-------------|--------------|
| `tap` | Transient | End of frame (line 760) |
| `dragEnd` | Transient | End of frame (line 760) |
| `mouse` | Continuous | On `mouse_leave` or explicit clear |
| `drag` | Continuous | On `drag_end` |
| `buttons` | Continuous | On `key_up` |

The MCP tool must respect these lifecycles.

### Frame Timing

Inputs set via `simulate_input` will be processed in the **next game loop tick** (~16ms at 60fps).

For deterministic testing:
```typescript
pause();
simulate_input({type: 'mouse_move', worldX: 0, worldY: 0});
step({frames: 1});  // Process exactly 1 frame
// Now check result
```

---

## Migration Path

### Old API (Delete)
```typescript
game_tap({x, y})
game_drag({startX, startY, endX, endY, durationMs})
game_mouse_move({x, y})  // Was just added, delete it
```

### New API (Unified)
```typescript
simulate_input({type: 'tap', worldX: x, worldY: y})
simulate_input({type: 'drag_start', worldX: startX, worldY: startY})
simulate_input({type: 'drag_move', worldX: endX, worldY: endY})
simulate_input({type: 'drag_end', velocity: {x: vx, y: vy}})
simulate_input({type: 'mouse_move', worldX: x, worldY: y})
```

### Backward Compatibility

Keep old tools as deprecated wrappers:
```typescript
game_tap({x, y}) → simulate_input({type: 'tap', worldX: x, worldY: y})
```

Or remove entirely (breaking change, cleaner).

---

## Files to Modify

| File | Change | LOC |
|------|--------|-----|
| `app/lib/game-engine/GameRuntime.godot.tsx` | Add `window.__GAME_RUNTIME__` | +50 |
| `packages/game-inspector-mcp/src/tools/interaction.ts` | Replace with unified tool | -200, +150 |
| `packages/game-inspector-mcp/src/types.ts` | Add InputSimulation types | +30 |
| `.opencode/skills/game-inspector.md` | Update documentation | ~100 |

**Total**: ~200 LOC changed

---

## Alternative: Bridge Method (More Robust)

Instead of exposing runtime directly, add a debug bridge method:

```typescript
// In GodotDebugBridge.ts
const simulateInput = (type: string, params: Record<string, unknown>) => {
  return queryAsync("simulateInput", [type, params]);
};

// In Godot DebugBridge.gd
func handle_simulate_input(args: Array) -> Dictionary:
  var type = args[0]
  var params = args[1]
  
  # Inject into game's input system
  # This goes through GameBridge's _js_send_input callback
  var input_event = {
    "type": type,
    "worldX": params.get("worldX", 0),
    "worldY": params.get("worldY", 0),
    # ... other params
  }
  
  GameBridge._notify_js_input_event([input_event])
  return {"ok": true}
```

**Pros of Bridge Method:**
- Cleaner separation
- Works for both web and native
- Goes through official input pipeline

**Cons:**
- More complex (needs Godot handler)
- Extra serialization overhead

**Recommendation**: Use Runtime API (simpler, web-only is fine for MCP testing).

---

## Immediate Next Steps

1. **Research complete** ✅
2. **Design complete** ✅
3. **Implement** `window.__GAME_RUNTIME__` API
4. **Implement** unified `simulate_input` MCP tool
5. **Test** Candy Crush hover with `mouse_move` 
6. **Fix** `worldToCell` bug (already done)
7. **Verify** hover appears at correct grid cell

---

## This Solves

- ✅ Candy Crush hover bug (can now trigger `handleMouseMove`)
- ✅ Future keyboard testing
- ✅ Complete drag gesture testing
- ✅ Input simulation matches real behavior perfectly
- ✅ Unified, maintainable API

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| `__GAME_RUNTIME__` pollutes global scope | Use Symbol or cleanup on unmount |
| Only works on web | Acceptable - MCP is browser-based tool |
| Breaks if GameRuntime structure changes | Type-safe interface + tests |
| Input timing issues | Use pause/step for deterministic tests |

---

## Estimated Effort

- **Research**: ✅ Complete (this document)
- **Implementation**: 2-3 hours
  - Runtime API: 1 hour
  - MCP tool: 1 hour
  - Testing + docs: 1 hour
- **Total**: 2-3 hours

---

## Conclusion

This unified approach gives us a **production-grade input testing system** that:
1. Triggers the exact same code as real users
2. Covers ALL input types (not just tap)
3. Makes hover bugs trivial to debug
4. Future-proof for new input methods

Ready to implement.
