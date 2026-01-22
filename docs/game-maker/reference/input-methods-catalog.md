# Input Methods Catalog

**Last Updated**: January 22, 2026

## Overview

This document catalogs ALL input methods available for controlling entities in the Slopcade game system, covering both **currently implemented** and **planned** methods. This includes web and native platform support.

---

## Quick Reference: Current State

| Input Method | Web | Native | Status | ControlType |
|--------------|-----|--------|--------|-------------|
| **Keyboard (WASD/Arrows)** | ✅ | ❌ | Implemented | `buttons` |
| **Mouse/Touch Tap** | ✅ | ✅ | Implemented | `tap_to_jump`, `tap_to_shoot`, `tap_to_flip` |
| **Mouse/Touch Drag** | ✅ | ✅ | Implemented | `drag_to_aim`, `drag_to_move` |
| **Accelerometer/Tilt** | ❌ | ❌ | Type exists, not implemented | `tilt_to_move`, `tilt_gravity` |
| **Virtual On-Screen Controls** | ❌ | ❌ | Planned | `virtual_buttons` (planned) |
| **Tap Zones** | ❌ | ❌ | Planned | `tap_zones` (planned) |
| **Gamepad** | ❌ | ❌ | Not planned | N/A |

---

## Implementation Details

### 1. Keyboard Input (Web Only)

**Status**: ✅ **Implemented**  
**File**: `app/lib/game-engine/GameRuntime.native.tsx` (lines 432-500)  
**Platform**: Web only (uses `window.addEventListener`)

#### Supported Keys

| Action | Keys |
|--------|------|
| **Left** | `ArrowLeft`, `a`, `A` |
| **Right** | `ArrowRight`, `d`, `D` |
| **Up** | `ArrowUp`, `w`, `W` |
| **Down** | `ArrowDown`, `s`, `S` |
| **Jump** | `Space` |

#### How It Works

```typescript
// Keyboard events populate ctx.input.buttons
useEffect(() => {
  if (Platform.OS !== "web") return;

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case "ArrowLeft": case "a": case "A":
        buttonsRef.current.left = true;
        break;
      // ... other keys
    }
    inputRef.current.buttons = { ...buttonsRef.current };
  };

  window.addEventListener("keydown", handleKeyDown);
  // ...
}, []);
```

#### Usage in Behaviors

```json
{
  "type": "control",
  "controlType": "buttons",
  "force": 500
}
```

#### Example Games Using This
- `TopDownAsteroids.tsx` - WASD/Arrow keys for movement
- Any game with `controlType: "buttons"` on web

---

### 2. Touch/Mouse Tap

**Status**: ✅ **Implemented**  
**File**: `app/lib/game-engine/GameRuntime.native.tsx` (lines 319-335)  
**Platform**: Web + Native

#### How It Works

```typescript
// Single tap anywhere on screen
const handleTap = (event) => {
  const { locationX: x, locationY: y } = event.nativeEvent;
  const worldPos = camera.screenToWorld(x, y);

  inputRef.current.tap = {
    x,              // Screen coordinates
    y,
    worldX: worldPos.x,  // World coordinates
    worldY: worldPos.y,
  };
};
```

#### Input State Structure

```typescript
interface InputState {
  tap?: {
    x: number;           // Screen X
    y: number;           // Screen Y
    worldX: number;      // World X (physics space)
    worldY: number;      // World Y (physics space)
  };
}
```

#### Supported Control Types

| ControlType | Behavior | Example Use Case |
|-------------|----------|------------------|
| `tap_to_jump` | Applies upward impulse when screen is tapped | Flappy Bird style |
| `tap_to_shoot` | Spawns projectile on tap | Shooter games |
| `tap_to_flip` | Reverses velocity on tap | Geometry Dash style |

#### Usage in Behaviors

```json
{
  "type": "control",
  "controlType": "tap_to_jump",
  "force": 300,
  "cooldown": 0.5
}
```

#### BehaviorExecutor Implementation

```typescript
// From BehaviorExecutor.ts line 345
case 'tap_to_jump':
  if (ctx.input.tap) {
    const force = resolveForce();
    ctx.physics.applyImpulseToCenter(ctx.entity.bodyId, { x: 0, y: -force });
    runtime.state.cooldownEnd = ctx.elapsed + resolveCooldown();
  }
  break;
```

---

### 3. Touch/Mouse Drag

**Status**: ✅ **Implemented**  
**File**: `app/lib/game-engine/GameRuntime.native.tsx` (lines 337-430)  
**Platform**: Web + Native

#### How It Works

```typescript
// Drag tracking across multiple touch events
const handleTouchStart = (event: GestureResponderEvent) => {
  const { locationX: x, locationY: y } = event.nativeEvent;
  const worldPos = camera.screenToWorld(x, y);

  // Raycast to detect which entity was touched
  const bodyId = physics.queryPoint(worldPos);
  const targetEntityId = findEntityByBodyId(bodyId);

  dragStartRef.current = { x, y, worldX: worldPos.x, worldY: worldPos.y, targetEntityId };

  inputRef.current.drag = {
    startX: x,
    startY: y,
    currentX: x,
    currentY: y,
    startWorldX: worldPos.x,
    startWorldY: worldPos.y,
    currentWorldX: worldPos.x,
    currentWorldY: worldPos.y,
    targetEntityId,  // Which entity was touched
  };
};

const handleTouchMove = (event: GestureResponderEvent) => {
  // Updates current position while dragging
  inputRef.current.drag.currentX = ...;
  inputRef.current.drag.currentWorldX = ...;
};

const handleTouchEnd = (event: GestureResponderEvent) => {
  // Calculate velocity from drag delta
  inputRef.current.dragEnd = {
    velocityX: (currentX - startX) * VELOCITY_SCALE,
    velocityY: (currentY - startY) * VELOCITY_SCALE,
    worldVelocityX: (currentWorldX - startWorldX) * VELOCITY_SCALE,
    worldVelocityY: (currentWorldY - startWorldY) * VELOCITY_SCALE,
  };
  
  inputRef.current.drag = undefined;  // Clear drag state
};
```

#### Input State Structure

```typescript
interface InputState {
  drag?: {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    startWorldX: number;
    startWorldY: number;
    currentWorldX: number;
    currentWorldY: number;
    targetEntityId?: string;  // Entity under touch point
  };
  
  dragEnd?: {
    velocityX: number;
    velocityY: number;
    worldVelocityX: number;
    worldVelocityY: number;
  };
}
```

#### Supported Control Types

| ControlType | Behavior | Example Use Case |
|-------------|----------|------------------|
| `drag_to_aim` | Pulls back and launches on release (slingshot) | Angry Birds |
| `drag_to_move` | Entity follows drag position horizontally | Breakout paddle |

#### Usage in Behaviors

```json
// Slingshot mechanic
{
  "type": "control",
  "controlType": "drag_to_aim",
  "force": 20,
  "aimLine": true,
  "maxPullDistance": 3
}

// Paddle follow
{
  "type": "control",
  "controlType": "drag_to_move",
  "force": 30,
  "maxSpeed": 15
}
```

#### BehaviorExecutor Implementation

```typescript
// From BehaviorExecutor.ts line 353
case 'drag_to_aim':
  if (ctx.input.dragEnd) {
    const force = resolveForce();
    const vx = -ctx.input.dragEnd.worldVelocityX * force;
    const vy = -ctx.input.dragEnd.worldVelocityY * force;
    ctx.physics.applyImpulseToCenter(ctx.entity.bodyId, { x: vx, y: vy });
  }
  break;

case 'drag_to_move':
  const stiffness = control.force ?? 30;
  const damping = control.maxSpeed ?? 8;
  
  if (ctx.input.drag) {
    const entityX = ctx.entity.transform.x;
    const touchX = ctx.input.drag.currentWorldX;
    const dx = touchX - entityX;
    const targetForceX = dx * stiffness - currentVel.x * damping;
    // Apply force...
  }
  break;
```

---

### 4. Draggable Behavior (Special Drag Mode)

**Status**: ✅ **Implemented**  
**File**: `app/lib/game-engine/BehaviorExecutor.ts` (lines 298-330)  
**Platform**: Web + Native

#### How It Works

This is a **behavior**, not a control type. It allows ANY entity to be dragged, not just player-controlled entities.

```typescript
// From BehaviorExecutor.ts
executor.registerHandler('draggable', (behavior, ctx, runtime) => {
  const stiffness = draggable.stiffness ?? 50;
  const damping = draggable.damping ?? 5;

  // Check if THIS entity is being dragged
  if (ctx.input.drag && ctx.input.drag.targetEntityId === ctx.entity.id) {
    const targetX = ctx.input.drag.currentWorldX;
    const targetY = ctx.input.drag.currentWorldY;
    const position = ctx.entity.transform;
    const velocity = ctx.physics.getLinearVelocity(ctx.entity.bodyId);

    // Spring physics toward touch point
    const dx = targetX - position.x;
    const dy = targetY - position.y;
    const forceX = dx * stiffness - velocity.x * damping;
    const forceY = dy * stiffness - velocity.y * damping;

    ctx.physics.applyForceToCenter(ctx.entity.bodyId, { x: forceX, y: forceY });
  }
});
```

#### Usage in Entity Definition

```json
{
  "id": "box",
  "behaviors": [
    {
      "type": "draggable",
      "stiffness": 50,
      "damping": 5,
      "requireDirectHit": true
    }
  ]
}
```

#### Example Games Using This
- `FallingBoxes.tsx` - Drag boxes around
- `Interaction.tsx` - Interactive physics sandbox
- `Pendulum.tsx` - Drag the pendulum bob

---

### 5. Button State (for Keyboard + Future Virtual Controls)

**Status**: ✅ **Implemented** (Keyboard), ⏳ **Planned** (Virtual Controls)  
**File**: `app/lib/game-engine/GameRuntime.native.tsx` (lines 68-75)  
**Platform**: Web (keyboard), Native (planned virtual controls)

#### Button State Structure

```typescript
interface ButtonState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  action: boolean;
}
```

#### Current Sources

| Source | Status | Platform |
|--------|--------|----------|
| **Keyboard** | ✅ Implemented | Web only |
| **Virtual DPad** | ⏳ Planned | Native + Web |
| **Tap Zones** | ⏳ Planned | Native + Web |

#### Usage in Behaviors

```json
{
  "type": "control",
  "controlType": "buttons",
  "force": 500
}
```

#### BehaviorExecutor Implementation

```typescript
// From BehaviorExecutor.ts line 379
case 'buttons':
  if (ctx.input.buttons) {
    const force = control.force ?? 5;
    let fx = 0, fy = 0;

    if (ctx.input.buttons.left) fx -= force;
    if (ctx.input.buttons.right) fx += force;
    if (ctx.input.buttons.up) fy -= force;
    if (ctx.input.buttons.down) fy += force;

    if (ctx.input.buttons.jump) {
      ctx.physics.applyImpulseToCenter(ctx.entity.bodyId, { x: 0, y: -resolveForce() });
    }

    if (fx !== 0 || fy !== 0) {
      ctx.physics.applyForceToCenter(ctx.entity.bodyId, { x: fx, y: fy });
    }
  }
  break;
```

---

## Planned Input Methods (Not Yet Implemented)

### 6. Accelerometer/Tilt Input

**Status**: ⏳ **Type Exists, Not Implemented**  
**File**: Types defined in `shared/src/types/behavior.ts`, but no implementation  
**Platform**: Native only (iOS/Android)

#### Planned Control Types

| ControlType | Description |
|-------------|-------------|
| `tilt_to_move` | Tilt device to move entity (like Doodle Jump) |
| `tilt_gravity` | Tilt device to change world gravity direction |

#### What's Missing

1. **No adapter**: No accelerometer listener implemented
2. **No ctx.input.tilt**: Input state structure not populated
3. **Partial behavior**: BehaviorExecutor has `tilt_to_move` case (line 363) but no tilt data

#### Planned Input State

```typescript
interface InputState {
  tilt?: {
    x: number;  // -1 to 1 (left to right)
    y: number;  // -1 to 1 (up to down)
    z?: number; // Optional z-axis
  };
}
```

#### Usage Example (when implemented)

```json
{
  "type": "control",
  "controlType": "tilt_to_move",
  "force": 500,
  "maxSpeed": 200
}
```

#### Implementation Plan

See: `docs/game-maker/planning/player-control-system.md` → Phase 2 (Accelerometer integration)

---

### 7. Virtual On-Screen Controls

**Status**: ⏳ **Planned**  
**File**: Planned as `app/components/controls/VirtualControls.tsx`  
**Platform**: Native + Web (mobile-first)

#### Planned Components

| Component | Description |
|-----------|-------------|
| **VirtualDPad** | 4-directional pad (8 directions with diagonals) |
| **VirtualButton** | Circular touch button (Jump, Action, etc.) |
| **VirtualControls** | Composed layout manager |

#### Planned Layouts

```typescript
type VirtualLayoutConfig = 
  | 'dpad-left-actions-right'  // DPad on left, action buttons on right
  | 'buttons-only'             // Just action buttons (jump/shoot)
  | 'dpad-only';               // Just directional pad
```

#### How It Will Work

```typescript
// GameRuntime will render virtual controls when configured
<VirtualControls
  layout="dpad-left-actions-right"
  onStateChange={(buttons) => {
    // Updates ctx.input.buttons (same as keyboard)
    inputRef.current.buttons = buttons;
  }}
/>
```

#### Usage in GameDefinition (Planned)

```json
{
  "controls": {
    "schemes": [
      { "type": "virtual_buttons", "layout": "dpad-left-actions-right" }
    ]
  }
}
```

#### Implementation Plan

See: `docs/game-maker/planning/player-control-system.md` → Phase 3 (Virtual Control Components)

---

### 8. Tap Zones (Screen Regions)

**Status**: ⏳ **Planned**  
**File**: Planned as `app/components/controls/TapZoneOverlay.tsx`  
**Platform**: Native + Web

#### Concept

Invisible full-screen overlay that maps screen regions to button inputs.

#### Planned Presets

| Preset | Description |
|--------|-------------|
| `left-right` | Left half = move left, right half = move right |
| `left-right-jump` | Left half = move left, right half = jump |
| Custom | Define any number of zones with bounds and button mappings |

#### Planned Input State

```typescript
// Tap zones feed into ctx.input.buttons (same as keyboard/virtual controls)
// No separate input state needed
```

#### Usage Example (Planned)

```json
{
  "controls": {
    "schemes": [
      { "type": "tap_zones", "zones": "left-right" }
    ]
  }
}
```

#### Custom Zone Configuration (Planned)

```json
{
  "controls": {
    "schemes": [
      {
        "type": "tap_zones",
        "zones": {
          "zones": [
            { "area": "left", "button": "left" },
            { "area": "right", "button": "jump" },
            { "area": "top", "button": "action", "doubleTap": true }
          ]
        }
      }
    ]
  }
}
```

#### Implementation Plan

See: `docs/game-maker/planning/player-control-system.md` → Phase 4 (Tap Zone Controls)

---

## Architecture Overview

### Current Implementation (Inline in GameRuntime)

```
┌─────────────────────────────────────────────────────┐
│            GameRuntime.native.tsx                    │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │  inputRef: InputState                        │   │
│  │  - tap?: TapInfo                             │   │
│  │  - drag?: DragInfo                           │   │
│  │  - dragEnd?: DragEndInfo                     │   │
│  │  - buttons?: ButtonState                     │   │
│  │  - tilt?: TiltInfo (not populated)          │   │
│  └─────────────────────────────────────────────┘   │
│                      ▲                              │
│                      │                              │
│  ┌──────────────────┴────────────────────────┐     │
│  │  Input Event Handlers (inline)            │     │
│  │  - handleTap (line 319)                   │     │
│  │  - handleTouchStart/Move/End (337-430)    │     │
│  │  - handleKeyDown/Up (432-500, web only)   │     │
│  └───────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  BehaviorExecutor             │
        │  - executeAll(entities, ctx)  │
        │    (ctx.input = inputRef)     │
        └──────────────────────────────┘
```

### Planned Architecture (InputManager + Adapters)

```
┌────────────────────────────────────────────────────────┐
│                  GameRuntime                           │
│                                                        │
│  ┌─────────────────────────────────────────────┐     │
│  │          InputManager                        │     │
│  │                                              │     │
│  │  registerAdapter(adapter)                   │     │
│  │  getState(): InputState                     │     │
│  │  endFrame()  // clears transients           │     │
│  └──────────────────┬──────────────────────────┘     │
│                     │                                 │
│       ┌─────────────┴─────────────┬────────────┐    │
│       ▼                           ▼            ▼    │
│  KeyboardAdapter     TouchAdapter   VirtualAdapter   │
│  (web only)          (always)       (mobile)        │
└────────────────────────────────────────────────────────┘
```

See: `docs/game-maker/planning/player-control-system.md` for full architecture plan.

---

## Configuration System

### Current: No Configuration

Currently, games do NOT configure which input methods are available. All available methods (keyboard on web, touch on all platforms) are always active.

### Planned: GameDefinition Controls Config

```typescript
interface GameDefinition {
  controls?: {
    schemes: ControlScheme[];
  };
}

type ControlScheme =
  | { type: 'keyboard'; mapping?: KeyboardMapping }
  | { type: 'virtual_buttons'; layout?: VirtualLayoutConfig }
  | { type: 'tap_zones'; zones?: TapZoneConfig };
```

#### Example: Cross-Platform Game

```json
{
  "metadata": { "title": "Platformer" },
  "controls": {
    "schemes": [
      { "type": "keyboard" },
      { "type": "virtual_buttons", "layout": "dpad-left-actions-right" }
    ]
  },
  "entities": [
    {
      "id": "player",
      "behaviors": [
        { "type": "control", "controlType": "buttons", "force": 500 }
      ]
    }
  ]
}
```

---

## Gap Analysis for MVP Games

### ✅ What's Already Working

| Input Method | Use Cases | Games Supported |
|--------------|-----------|-----------------|
| **Tap** | Single-tap mechanics (Flappy Bird, tap-to-jump) | Simple mobile games |
| **Drag** | Slingshot, paddle control | Angry Birds, Breakout |
| **Keyboard** | Desktop games, platformers, shooters | All web games |
| **Draggable** | Physics sandbox, puzzle games | Interactive demos |

### ❌ Critical Gaps for MVP

| Missing Feature | Impact | Workaround |
|----------------|--------|------------|
| **Virtual Controls** | Mobile platformers/shooters unplayable | Use tap/drag controls only |
| **Tap Zones** | Mobile runner games awkward | Use full-screen tap |
| **Accelerometer** | Tilt games impossible | Use drag or tap instead |
| **Config System** | Can't customize per-game | All inputs always active |

### 🎯 Recommended MVP Priorities

1. **Priority 1: Virtual Controls** (DPad + Buttons)
   - Unblocks: Mobile platformers, shooters, RPGs
   - Implementation: ~2 weeks (see Phase 3 in plan)

2. **Priority 2: Tap Zones**
   - Unblocks: Mobile runner games, simple arcade games
   - Implementation: ~1 week (see Phase 4 in plan)

3. **Priority 3: Config System**
   - Allows per-game input customization
   - Implementation: ~1 week (see Phase 5 in plan)

4. **Priority 4: Accelerometer**
   - Unblocks: Tilt-based games (niche)
   - Implementation: ~1 week (native APIs)

---

## Input State Reference

### Complete InputState Type

```typescript
// Defined in: app/lib/game-engine/BehaviorContext.ts
interface InputState {
  // Single tap (transient - cleared after frame)
  tap?: {
    x: number;        // Screen X
    y: number;        // Screen Y
    worldX: number;   // World X (physics space)
    worldY: number;   // World Y (physics space)
  };

  // Active drag (continuous - while finger down)
  drag?: {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    startWorldX: number;
    startWorldY: number;
    currentWorldX: number;
    currentWorldY: number;
    targetEntityId?: string;  // Entity under touch point
  };

  // Drag release (transient - cleared after frame)
  dragEnd?: {
    velocityX: number;
    velocityY: number;
    worldVelocityX: number;
    worldVelocityY: number;
  };

  // Button state (continuous - from keyboard or virtual controls)
  buttons?: {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    jump: boolean;
    action: boolean;
  };

  // Tilt state (planned - from accelerometer)
  tilt?: {
    x: number;  // -1 to 1
    y: number;  // -1 to 1
    z?: number;
  };
}
```

### Transient vs Continuous Inputs

| Type | Behavior | Cleared When |
|------|----------|--------------|
| **Transient** | One-frame only | End of frame (line 266) |
| **Continuous** | Persists while active | Released by user |

**Transient inputs**: `tap`, `dragEnd`  
**Continuous inputs**: `drag`, `buttons`, `tilt`

---

## Testing Checklist

### Current Implementation

- [x] Web: Keyboard (WASD/Arrows) moves entity
- [x] Web: Mouse drag moves entity
- [x] Web: Mouse tap triggers tap behaviors
- [x] Native: Touch tap triggers tap behaviors
- [x] Native: Touch drag moves entity
- [x] Both: Draggable behavior works
- [ ] Native: Accelerometer/tilt (NOT IMPLEMENTED)
- [ ] Both: Virtual controls (NOT IMPLEMENTED)
- [ ] Both: Tap zones (NOT IMPLEMENTED)

### When Fully Implemented

- [ ] Web: Virtual controls work (mobile web)
- [ ] Native: Virtual DPad moves entity
- [ ] Native: Virtual button triggers jump
- [ ] Native: Tap zones work
- [ ] Native: Accelerometer provides tilt data
- [ ] Both: Config system selects input schemes
- [ ] Cross-platform game works on all platforms

---

## Related Documentation

- **[Player Control System Plan](../planning/player-control-system.md)** - Full implementation plan (6 phases)
- **[Behavior System](./behavior-system.md)** - How behaviors consume input
- **[Entity System](./entity-system.md)** - Entity structure and control behaviors

---

## Summary

### What You Have Now

✅ **Web Games**: Full keyboard + mouse/touch support  
✅ **Native Games**: Touch tap/drag support  
✅ **Physics Sandbox**: Draggable entities  

### What You Need for MVP

⏳ **Virtual Controls**: For mobile platformers/shooters  
⏳ **Tap Zones**: For mobile runner games  
⏳ **Accelerometer**: For tilt-based games  
⏳ **Config System**: Per-game input customization  

### Next Steps

1. Review: `docs/game-maker/planning/player-control-system.md`
2. Decide: Which MVP features are critical for your first games?
3. Implement: Follow the phased plan in the planning doc

**Questions?** Refer to the planning document for detailed implementation guidance.
