# Unified Input-Action System Design

**Goal**: Create a decoupled, kid-friendly, composable input-action system where ANY input can trigger ANY action, following the universal pattern:

> **"When [TRIGGER], if [CONDITION], do [ACTION]"**

---

## Executive Summary

### The Problem

Current system has tightly coupled control types:
- `tap_to_jump` - tap directly triggers jump
- `drag_to_aim` - drag directly triggers launch
- `tilt_to_move` - tilt directly triggers movement

This violates Single Responsibility Principle and limits composability.

### The Solution

Extend the **existing Rules system** to support **input triggers**, giving us:

```
┌─────────────────────────────────────────────────────────────────┐
│                    UNIFIED EVENT SYSTEM                         │
│                                                                 │
│   WHEN (Trigger)     IF (Condition)      DO (Action)           │
│   ─────────────      ─────────────       ──────────            │
│   • tap              • onGround          • applyImpulse        │
│   • drag             • inAir             • spawn               │
│   • tilt             • hasTag            • destroy             │
│   • buttonA/B        • healthAbove       • setVariable         │
│   • arrowKeys        • touching          • playSound           │
│   • collision        • variableEquals    • addScore            │
│   • timer            • random            • modifyEntity        │
│   • gameStart        • expression        • triggerEvent        │
│                                                                 │
│   SAME SYSTEM for physics events AND input events!             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture Overview

### Current System (Before)

```
┌──────────────────────┐     ┌────────────────────────┐
│    GameRuntime       │     │   BehaviorExecutor     │
│                      │     │                        │
│  inputRef.current    │────►│  case 'tap_to_jump':   │
│  {tap, drag, tilt}   │     │    if (ctx.input.tap)  │
│                      │     │      applyImpulse()    │
└──────────────────────┘     └────────────────────────┘
                                      │
┌──────────────────────┐              │
│   RulesEvaluator     │◄─────────────┘
│                      │   (separate system)
│  trigger: collision  │
│  action: addScore    │
└──────────────────────┘
```

**Problems:**
- Input handling hardcoded in BehaviorExecutor
- Can't use same input for different actions
- Two separate trigger systems (behaviors vs rules)

### New System (After)

```
┌──────────────────────────────────────────────────────────────────┐
│                        GameRuntime                                │
│                                                                   │
│  ┌────────────────┐    ┌────────────────┐    ┌────────────────┐ │
│  │  InputSystem   │───►│ InputState +   │───►│ RulesEvaluator │ │
│  │                │    │ InputEvents    │    │ (UNIFIED)      │ │
│  │  Normalizes:   │    │                │    │                │ │
│  │  • Touch       │    │ state.buttons  │    │ Handles ALL:   │ │
│  │  • Keyboard    │    │ state.tilt     │    │ • Input rules  │ │
│  │  • Tilt        │    │ events.tap     │    │ • Physics rules│ │
│  │  • Virtual     │    │ events.dragEnd │    │ • Timer rules  │ │
│  └────────────────┘    └────────────────┘    └────────────────┘ │
│                                                      │           │
│                                                      ▼           │
│                                              ┌────────────────┐ │
│                                              │ ActionExecutor │ │
│                                              │                │ │
│                                              │ Executes ALL:  │ │
│                                              │ • Physics acts │ │
│                                              │ • Spawn acts   │ │
│                                              │ • Score acts   │ │
│                                              └────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**Benefits:**
- Single trigger system for everything
- Any input can trigger any action
- Kid-friendly JSON configuration
- Backwards compatible with migration layer

---

## Type Definitions

### Input Triggers (New)

```typescript
// shared/src/types/rules.ts - ADD these new trigger types

// === INPUT TRIGGERS ===

export interface TapTrigger {
  type: 'tap';
  target?: 'screen' | 'self' | string;  // 'self' = this entity, string = entity ID
}

export interface DragTrigger {
  type: 'drag';
  phase: 'start' | 'move' | 'end';
  target?: 'screen' | 'self' | string;
}

export interface TiltTrigger {
  type: 'tilt';
  axis?: 'x' | 'y' | 'both';
  threshold?: number;  // Minimum tilt to trigger (0-1)
}

export interface ButtonTrigger {
  type: 'button';
  button: 'left' | 'right' | 'up' | 'down' | 'jump' | 'action' | 'any';
  state: 'pressed' | 'released' | 'held';
}

export interface SwipeTrigger {
  type: 'swipe';
  direction: 'left' | 'right' | 'up' | 'down' | 'any';
}

export interface GameStartTrigger {
  type: 'gameStart';
}

// Updated union type
export type RuleTrigger =
  // Existing
  | CollisionTrigger
  | TimerTrigger
  | ScoreTrigger
  | EntityCountTrigger
  | EventTrigger
  | FrameTrigger
  // NEW Input triggers
  | TapTrigger
  | DragTrigger
  | TiltTrigger
  | ButtonTrigger
  | SwipeTrigger
  | GameStartTrigger;
```

### Input Conditions (New)

```typescript
// shared/src/types/rules.ts - ADD these new condition types

export interface OnGroundCondition {
  type: 'onGround';
  value: boolean;  // true = must be on ground, false = must be in air
}

export interface TouchingCondition {
  type: 'touching';
  tag: string;
  negated?: boolean;  // true = NOT touching
}

export interface VelocityCondition {
  type: 'velocity';
  axis: 'x' | 'y';
  comparison: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
}

export interface VariableCondition {
  type: 'variable';
  name: string;
  comparison: 'eq' | 'gt' | 'lt' | 'gte' | 'lte';
  value: number | string | boolean;
}

export interface ExpressionCondition {
  type: 'expression';
  expr: string;  // Uses existing expression system: "self.health > 0"
}

export interface CooldownReadyCondition {
  type: 'cooldownReady';
  cooldownId: string;
}

// Updated union type
export type RuleCondition =
  // Existing
  | ScoreCondition
  | TimeCondition
  | EntityExistsCondition
  | EntityCountCondition
  | RandomCondition
  // NEW Input-related conditions
  | OnGroundCondition
  | TouchingCondition
  | VelocityCondition
  | VariableCondition
  | ExpressionCondition
  | CooldownReadyCondition;
```

### Physics Actions (New)

```typescript
// shared/src/types/rules.ts - ADD these new action types

export interface ApplyImpulseAction {
  type: 'applyImpulse';
  target: EntityTarget;
  x?: Value<number>;
  y?: Value<number>;
  direction?: 'up' | 'down' | 'left' | 'right' | 'dragDirection' | 'tiltDirection';
  force?: Value<number>;
}

export interface ApplyForceAction {
  type: 'applyForce';
  target: EntityTarget;
  x?: Value<number>;
  y?: Value<number>;
  direction?: 'dragDirection' | 'tiltDirection' | 'towardTouch';
  force?: Value<number>;
}

export interface SetVelocityAction {
  type: 'setVelocity';
  target: EntityTarget;
  x?: Value<number>;
  y?: Value<number>;
}

export interface MoveAction {
  type: 'move';
  target: EntityTarget;
  direction: 'left' | 'right' | 'up' | 'down' | 'tiltDirection';
  speed: Value<number>;
}

export interface SetVariableAction {
  type: 'setVariable';
  name: string;
  operation: 'set' | 'add' | 'subtract' | 'multiply' | 'toggle';
  value: Value<number | string | boolean>;
}

export interface StartCooldownAction {
  type: 'startCooldown';
  cooldownId: string;
  duration: Value<number>;
}

export interface PlayAnimationAction {
  type: 'playAnimation';
  target: EntityTarget;
  animation: string;
}

// Entity targeting (used by actions)
export type EntityTarget =
  | { type: 'self' }
  | { type: 'byId'; entityId: string }
  | { type: 'byTag'; tag: string }
  | { type: 'touched' }  // Entity that was tapped/dragged
  | { type: 'player' };  // Shorthand for byTag: 'player'

// Updated union type
export type RuleAction =
  // Existing
  | SpawnAction
  | DestroyAction
  | ScoreAction
  | GameStateAction
  | SoundAction
  | EventAction
  | ModifyAction
  | LivesAction
  // NEW Physics/Input actions
  | ApplyImpulseAction
  | ApplyForceAction
  | SetVelocityAction
  | MoveAction
  | SetVariableAction
  | StartCooldownAction
  | PlayAnimationAction;
```

---

## Kid-Friendly JSON Examples

### Example 1: Simple Tap to Jump

**Before (current system):**
```json
{
  "entities": [{
    "id": "player",
    "behaviors": [{ "type": "control", "controlType": "tap_to_jump", "force": 10 }]
  }]
}
```

**After (new system):**
```json
{
  "rules": [{
    "name": "Player jumps on tap",
    "trigger": { "type": "tap" },
    "actions": [{ "type": "applyImpulse", "target": { "type": "player" }, "y": -10 }]
  }]
}
```

### Example 2: Jump Only When on Ground

```json
{
  "rules": [{
    "name": "Jump when on ground",
    "trigger": { "type": "tap" },
    "conditions": [{ "type": "onGround", "value": true }],
    "actions": [
      { "type": "applyImpulse", "target": { "type": "player" }, "y": -12 },
      { "type": "playSound", "sound": "jump" }
    ],
    "cooldown": 0.2
  }]
}
```

### Example 3: Slingshot (Drag to Aim)

```json
{
  "rules": [
    {
      "name": "Launch on drag end",
      "trigger": { "type": "drag", "phase": "end", "target": "self" },
      "actions": [{
        "type": "applyImpulse",
        "target": { "type": "self" },
        "direction": "dragDirection",
        "force": 15
      }]
    }
  ]
}
```

### Example 4: Tilt to Move

```json
{
  "rules": [{
    "name": "Tilt moves player",
    "trigger": { "type": "tilt", "threshold": 0.1 },
    "actions": [{
      "type": "move",
      "target": { "type": "player" },
      "direction": "tiltDirection",
      "speed": 5
    }]
  }]
}
```

### Example 5: Keyboard/Virtual Button Controls

```json
{
  "rules": [
    {
      "name": "Move left",
      "trigger": { "type": "button", "button": "left", "state": "held" },
      "actions": [{ "type": "move", "target": { "type": "player" }, "direction": "left", "speed": 5 }]
    },
    {
      "name": "Move right",
      "trigger": { "type": "button", "button": "right", "state": "held" },
      "actions": [{ "type": "move", "target": { "type": "player" }, "direction": "right", "speed": 5 }]
    },
    {
      "name": "Jump",
      "trigger": { "type": "button", "button": "jump", "state": "pressed" },
      "conditions": [{ "type": "onGround", "value": true }],
      "actions": [{ "type": "applyImpulse", "target": { "type": "player" }, "y": -10 }]
    }
  ]
}
```

### Example 6: Collision + Input Combo (Collect Coin)

```json
{
  "rules": [{
    "name": "Collect coin",
    "trigger": { "type": "collision", "entityATag": "player", "entityBTag": "coin" },
    "actions": [
      { "type": "score", "operation": "add", "value": 10 },
      { "type": "playSound", "sound": "collect" },
      { "type": "destroy", "target": { "type": "collision_entities" } }
    ]
  }]
}
```

### Example 7: Double Jump with Variable

```json
{
  "rules": [
    {
      "name": "Reset jumps when grounded",
      "trigger": { "type": "frame" },
      "conditions": [{ "type": "onGround", "value": true }],
      "actions": [{ "type": "setVariable", "name": "jumpsRemaining", "operation": "set", "value": 2 }]
    },
    {
      "name": "Jump (uses jump charge)",
      "trigger": { "type": "tap" },
      "conditions": [{ "type": "variable", "name": "jumpsRemaining", "comparison": "gt", "value": 0 }],
      "actions": [
        { "type": "applyImpulse", "target": { "type": "player" }, "y": -10 },
        { "type": "setVariable", "name": "jumpsRemaining", "operation": "subtract", "value": 1 }
      ]
    }
  ]
}
```

---

## Game Type Presets

For AI generation, provide high-level presets that expand to full rule sets:

```typescript
type ControlPreset = 
  | 'platformer'      // Arrow keys + jump
  | 'runner'          // Auto-run + tap to jump
  | 'topDown'         // 4-direction movement
  | 'tiltControl'     // Accelerometer movement
  | 'slingshot'       // Drag to aim and launch
  | 'paddle'          // Drag to move horizontally
  | 'tapToShoot';     // Tap anywhere to fire projectile
```

**Example Preset Expansion:**

```json
// "controlPreset": "runner" expands to:
{
  "rules": [
    {
      "name": "Auto-run right",
      "trigger": { "type": "frame" },
      "actions": [{ "type": "move", "target": { "type": "player" }, "direction": "right", "speed": 4 }]
    },
    {
      "name": "Jump on tap",
      "trigger": { "type": "tap" },
      "conditions": [{ "type": "onGround", "value": true }],
      "actions": [{ "type": "applyImpulse", "target": { "type": "player" }, "y": -12 }]
    }
  ]
}
```

---

## Implementation Phases

### Phase 1: Input Triggers in RulesEvaluator (2-3 days)

**Goal:** Add input triggers to the existing rules system.

**Tasks:**
1. Add `TapTrigger`, `DragTrigger`, `ButtonTrigger` types to `rules.ts`
2. Update `RuleContext` to include `InputState` + `InputEvents`
3. Implement `evaluateTrigger` cases for each new input trigger type
4. Update `GameRuntime` to pass input state to `RulesEvaluator.update()`
5. Add Zod schemas for new trigger types

**Files:**
- MODIFY: `shared/src/types/rules.ts`
- MODIFY: `shared/src/types/schemas.ts`
- MODIFY: `app/lib/game-engine/RulesEvaluator.ts`
- MODIFY: `app/lib/game-engine/GameRuntime.native.tsx`

**Test Cases:**
- Rule with `tap` trigger fires when screen tapped
- Rule with `button: "jump"` trigger fires on spacebar
- Rule with `drag: "end"` trigger fires on drag release

---

### Phase 2: Physics Actions (2-3 days)

**Goal:** Add physics-related actions to RulesEvaluator.

**Tasks:**
1. Add `ApplyImpulseAction`, `ApplyForceAction`, `SetVelocityAction`, `MoveAction` types
2. Implement `executeActions` cases for each new physics action
3. Wire physics context into RulesEvaluator
4. Handle entity targeting (`self`, `byTag`, `player`, etc.)

**Files:**
- MODIFY: `shared/src/types/rules.ts`
- MODIFY: `app/lib/game-engine/RulesEvaluator.ts`

**Test Cases:**
- `applyImpulse` action moves entity
- `move` action applies continuous force
- Target `{ type: "player" }` correctly resolves to player entity

---

### Phase 3: Input Conditions (1-2 days)

**Goal:** Add input-relevant conditions (onGround, touching, velocity).

**Tasks:**
1. Add `OnGroundCondition`, `TouchingCondition`, `VelocityCondition` types
2. Implement ground detection in physics system (raycast or collision check)
3. Implement condition evaluation in `evaluateConditions`

**Files:**
- MODIFY: `shared/src/types/rules.ts`
- MODIFY: `app/lib/game-engine/RulesEvaluator.ts`
- MODIFY: `app/lib/physics2d/Physics2D.ts` (add `isOnGround` method)

**Test Cases:**
- Jump rule only fires when `onGround: true` condition met
- Condition `touching: "enemy"` correctly detects collision

---

### Phase 4: Variables and Cooldowns (1-2 days)

**Goal:** Add game variables and cooldown system for complex logic.

**Tasks:**
1. Add `SetVariableAction`, `VariableCondition` types
2. Add `StartCooldownAction`, `CooldownReadyCondition` types
3. Implement variable storage in RulesEvaluator (or GameState)
4. Implement cooldown tracking per cooldownId

**Files:**
- MODIFY: `shared/src/types/rules.ts`
- MODIFY: `app/lib/game-engine/RulesEvaluator.ts`

**Test Cases:**
- Double jump works with `jumpsRemaining` variable
- Jump cooldown prevents rapid firing

---

### Phase 5: Migration Layer (1 day)

**Goal:** Convert legacy `control` behaviors to rules at load time.

**Tasks:**
1. Create `migrateLegacyBehaviors(definition: GameDefinition): GameDefinition`
2. Map each `controlType` to equivalent rules:
   - `tap_to_jump` → tap trigger + applyImpulse action
   - `drag_to_aim` → drag end trigger + applyImpulse action
   - `tilt_to_move` → tilt trigger + move action
   - `buttons` → button triggers + move actions
3. Remove `control` behavior handling from BehaviorExecutor (or keep as fallback)

**Files:**
- NEW: `app/lib/game-engine/migrations/migrateLegacyBehaviors.ts`
- MODIFY: `app/lib/game-engine/GameLoader.ts`

**Test Cases:**
- Existing games with `tap_to_jump` still work
- Migrated rules produce same behavior as original

---

### Phase 6: AI Schema Updates (1-2 days)

**Goal:** Update AI generation to produce new rules format.

**Tasks:**
1. Update `api/src/ai/schemas.ts` with new rule types
2. Update `api/src/ai/validator.ts` to validate new format
3. Update `api/src/ai/templates.ts` with preset-based templates
4. Update `api/src/ai/generator.ts` system prompt

**Files:**
- MODIFY: `api/src/ai/schemas.ts`
- MODIFY: `api/src/ai/validator.ts`
- MODIFY: `api/src/ai/templates.ts`
- MODIFY: `api/src/ai/generator.ts`

**Test Cases:**
- AI-generated games use new rules format
- Generated games pass validation

---

### Phase 7: Platform Input Adapters (2-3 days)

**Goal:** Normalize inputs across platforms (web keyboard, native touch, accelerometer).

**Tasks:**
1. Create `InputManager` class that normalizes all inputs
2. Implement `KeyboardAdapter.web.ts` (WASD/arrows → buttons)
3. Implement `TiltAdapter.native.ts` (accelerometer → tilt state)
4. Implement `VirtualControlsAdapter.ts` (UI buttons → buttons)
5. Wire InputManager into GameRuntime

**Files:**
- NEW: `app/lib/game-engine/input/InputManager.ts`
- NEW: `app/lib/game-engine/input/adapters/KeyboardAdapter.web.ts`
- NEW: `app/lib/game-engine/input/adapters/KeyboardAdapter.native.ts`
- NEW: `app/lib/game-engine/input/adapters/TiltAdapter.native.ts`
- NEW: `app/lib/game-engine/input/adapters/VirtualControlsAdapter.ts`
- MODIFY: `app/lib/game-engine/GameRuntime.native.tsx`

**Test Cases:**
- Web: WASD keys produce button events
- Native: Accelerometer produces tilt events
- Virtual controls produce button events

---

### Phase 8: Virtual Controls UI (2-3 days)

**Goal:** Render on-screen controls for mobile.

**Tasks:**
1. Create `VirtualDPad.tsx` component
2. Create `VirtualButton.tsx` component
3. Create `VirtualControls.tsx` container with layouts
4. Wire components to `VirtualControlsAdapter`
5. Add `controls.virtualControls` config to GameDefinition

**Files:**
- NEW: `app/components/controls/VirtualDPad.tsx`
- NEW: `app/components/controls/VirtualButton.tsx`
- NEW: `app/components/controls/VirtualControls.tsx`
- MODIFY: `app/lib/game-engine/GameRuntime.native.tsx`

**Test Cases:**
- Virtual DPad visible on mobile
- Pressing DPad produces button events
- Layout options work (dpad-left-actions-right, etc.)

---

### Phase 9: Documentation & Testing (1-2 days)

**Goal:** Update all documentation and ensure full test coverage.

**Tasks:**
1. Update `docs/game-maker/reference/behavior-system.md`
2. Create `docs/game-maker/reference/rules-system.md`
3. Create `docs/game-maker/guides/input-configuration.md`
4. Add tests for all new trigger/condition/action types
5. Manual testing with sample games

---

## Migration Mapping

| Legacy controlType | New Rule Equivalent |
|--------------------|---------------------|
| `tap_to_jump` | `trigger: tap` → `action: applyImpulse(y: -force)` |
| `tap_to_shoot` | `trigger: tap` → `action: spawn(projectile)` |
| `tap_to_flip` | `trigger: tap` → `action: setVelocity(y: -vy)` |
| `drag_to_aim` | `trigger: drag.end` → `action: applyImpulse(dragDirection)` |
| `drag_to_move` | `trigger: drag.move` → `action: move(towardTouch)` |
| `tilt_to_move` | `trigger: tilt` → `action: move(tiltDirection)` |
| `tilt_gravity` | `trigger: tilt` → `action: setWorldGravity(tiltDirection)` |
| `buttons` | `trigger: button.*` → `action: move/applyImpulse` |

---

## Success Criteria

### Functional
1. Any input type can trigger any action type
2. Conditions work for all input rules
3. Legacy games continue to work via migration
4. AI generates valid new-format rules

### Kid-Friendly
1. JSON is readable by a 12-year-old
2. Natural language keys (`tap`, `onGround`, `jump`)
3. Simple cases are simple (no conditions required)
4. Presets available for common game types

### Technical
1. Single rule system (no separate behavior handlers for input)
2. Type-safe with Zod validation
3. Platform-agnostic input normalization
4. Testable with unit tests

---

## Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Input Triggers | 2-3 days | None |
| Phase 2: Physics Actions | 2-3 days | Phase 1 |
| Phase 3: Input Conditions | 1-2 days | Phase 1, 2 |
| Phase 4: Variables & Cooldowns | 1-2 days | Phase 1, 2 |
| Phase 5: Migration Layer | 1 day | Phase 1-4 |
| Phase 6: AI Schema Updates | 1-2 days | Phase 1-4 |
| Phase 7: Platform Adapters | 2-3 days | Phase 1 |
| Phase 8: Virtual Controls UI | 2-3 days | Phase 7 |
| Phase 9: Documentation | 1-2 days | All |

**Total: ~15-20 days** (can be parallelized: Phases 1-4 sequential, 7-8 parallel, 6 parallel)

---

## Appendix: Full Type Reference

See: `shared/src/types/rules.ts` for complete type definitions after implementation.
