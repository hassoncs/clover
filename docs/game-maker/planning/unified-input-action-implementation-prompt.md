# Implementation Prompt: Unified Input-Action System

**Use this prompt to implement the full decoupled input-action system.**

---

## Context

You are implementing a unified input-action system for a React Native + Expo game engine. The goal is to decouple inputs (tap, drag, tilt, keyboard) from actions (jump, shoot, move) using the universal pattern:

> **"When [TRIGGER], if [CONDITION], do [ACTION]"**

**Read the full architecture plan first:**
- `docs/game-maker/planning/unified-input-action-system.md`

**Understand the current system:**
- `app/lib/game-engine/RulesEvaluator.ts` - Existing rules engine (extend this)
- `app/lib/game-engine/BehaviorExecutor.ts` - Current control handling (migrate away from)
- `app/lib/game-engine/GameRuntime.native.tsx` - Game loop and input handling
- `shared/src/types/rules.ts` - Rule type definitions
- `shared/src/types/behavior.ts` - Current behavior types (has `ControlType`)

---

## Implementation Prompt

```
TASK: Implement the Unified Input-Action System for Slopcade

REFERENCE DOCUMENT: docs/game-maker/planning/unified-input-action-system.md

GOAL: Decouple inputs from actions so ANY input can trigger ANY action, following the "When [TRIGGER], if [CONDITION], do [ACTION]" pattern used by Scratch, MakeCode, and GDevelop.

CURRENT STATE:
- RulesEvaluator handles collision/timer/event triggers → spawn/destroy/score actions
- BehaviorExecutor has hardcoded controlTypes: tap_to_jump, drag_to_aim, tilt_to_move, buttons
- InputState is passed via ctx.input with: tap, drag, dragEnd, buttons, tilt (tilt not implemented)

TARGET STATE:
- RulesEvaluator handles ALL triggers including inputs
- BehaviorExecutor no longer handles controls (migration layer converts old format)
- Unified JSON format for all input-action bindings

---

PHASE 1: INPUT TRIGGERS IN RULESEVALUATOR (2-3 days)

1.1. Update shared/src/types/rules.ts - Add new trigger types:

```typescript
// Add these types to rules.ts

export interface TapTrigger {
  type: 'tap';
  target?: 'screen' | 'self' | string;  // Default: 'screen'
}

export interface DragTrigger {
  type: 'drag';
  phase: 'start' | 'move' | 'end';
  target?: 'screen' | 'self' | string;
}

export interface TiltTrigger {
  type: 'tilt';
  axis?: 'x' | 'y' | 'both';
  threshold?: number;  // 0-1, default 0.1
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

// Update RuleTrigger union to include new types
export type RuleTrigger =
  | CollisionTrigger
  | TimerTrigger
  | ScoreTrigger
  | EntityCountTrigger
  | EventTrigger
  | FrameTrigger
  | TapTrigger      // NEW
  | DragTrigger     // NEW
  | TiltTrigger     // NEW
  | ButtonTrigger   // NEW
  | SwipeTrigger    // NEW
  | GameStartTrigger; // NEW
```

1.2. Update RuleContext in RulesEvaluator.ts:

```typescript
export interface RuleContext {
  entityManager: EntityManager;
  score: number;
  elapsed: number;
  collisions: CollisionInfo[];
  events: Map<string, unknown>;
  screenBounds?: { minX: number; maxX: number; minY: number; maxY: number };
  computedValues?: ComputedValueSystem;
  evalContext?: EvalContext;
  // NEW: Add input state
  input: InputState;
  inputEvents: InputEvents;  // Edge-triggered events for this frame
}

// NEW: Define InputEvents for edge-triggered inputs
export interface InputEvents {
  tap?: { x: number; y: number; worldX: number; worldY: number; targetEntityId?: string };
  dragStart?: { x: number; y: number; worldX: number; worldY: number; targetEntityId?: string };
  dragEnd?: { velocityX: number; velocityY: number; worldVelocityX: number; worldVelocityY: number };
  swipe?: { direction: 'left' | 'right' | 'up' | 'down' };
  buttonPressed?: Set<string>;  // Buttons pressed THIS frame
  buttonReleased?: Set<string>; // Buttons released THIS frame
  gameStarted?: boolean;
}
```

1.3. Implement evaluateTrigger cases for input triggers:

```typescript
private evaluateTrigger(trigger: RuleTrigger, context: RuleContext): boolean {
  switch (trigger.type) {
    // ... existing cases ...

    case 'tap':
      if (!context.inputEvents.tap) return false;
      if (trigger.target === 'self') {
        return context.inputEvents.tap.targetEntityId === /* current entity being evaluated */;
      }
      if (trigger.target && trigger.target !== 'screen') {
        return context.inputEvents.tap.targetEntityId === trigger.target;
      }
      return true;  // screen tap

    case 'drag':
      if (trigger.phase === 'start') return !!context.inputEvents.dragStart;
      if (trigger.phase === 'end') return !!context.inputEvents.dragEnd;
      if (trigger.phase === 'move') return !!context.input.drag;
      return false;

    case 'tilt':
      if (!context.input.tilt) return false;
      const threshold = trigger.threshold ?? 0.1;
      if (trigger.axis === 'x') return Math.abs(context.input.tilt.x) > threshold;
      if (trigger.axis === 'y') return Math.abs(context.input.tilt.y) > threshold;
      return Math.abs(context.input.tilt.x) > threshold || Math.abs(context.input.tilt.y) > threshold;

    case 'button':
      if (trigger.state === 'pressed') {
        return context.inputEvents.buttonPressed?.has(trigger.button) ?? false;
      }
      if (trigger.state === 'released') {
        return context.inputEvents.buttonReleased?.has(trigger.button) ?? false;
      }
      if (trigger.state === 'held') {
        if (trigger.button === 'any') {
          return Object.values(context.input.buttons ?? {}).some(v => v);
        }
        return context.input.buttons?.[trigger.button] ?? false;
      }
      return false;

    case 'swipe':
      if (!context.inputEvents.swipe) return false;
      if (trigger.direction === 'any') return true;
      return context.inputEvents.swipe.direction === trigger.direction;

    case 'gameStart':
      return context.inputEvents.gameStarted ?? false;
  }
}
```

1.4. Update GameRuntime to track input events and pass to RulesEvaluator:

- Track button state changes between frames to detect pressed/released
- Convert dragEnd event to swipe direction based on velocity
- Pass inputEvents to RulesEvaluator.update()

TEST CASES FOR PHASE 1:
- [ ] Rule with `{ type: 'tap' }` fires when screen tapped
- [ ] Rule with `{ type: 'tap', target: 'self' }` only fires when entity tapped
- [ ] Rule with `{ type: 'button', button: 'jump', state: 'pressed' }` fires once on spacebar
- [ ] Rule with `{ type: 'button', button: 'right', state: 'held' }` fires every frame while held
- [ ] Rule with `{ type: 'drag', phase: 'end' }` fires on drag release

---

PHASE 2: PHYSICS ACTIONS (2-3 days)

2.1. Add entity targeting type:

```typescript
export type EntityTarget =
  | { type: 'self' }
  | { type: 'byId'; entityId: string }
  | { type: 'byTag'; tag: string }
  | { type: 'touched' }   // Entity under tap/drag
  | { type: 'player' }    // Shorthand for { type: 'byTag', tag: 'player' }
  | { type: 'other' };    // In collision context, the other entity
```

2.2. Add physics action types to rules.ts:

```typescript
export interface ApplyImpulseAction {
  type: 'applyImpulse';
  target: EntityTarget;
  x?: Value<number>;
  y?: Value<number>;
  // OR use direction + force
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

// Update RuleAction union
export type RuleAction =
  | SpawnAction
  | DestroyAction
  | ScoreAction
  | GameStateAction
  | SoundAction
  | EventAction
  | ModifyAction
  | LivesAction
  | ApplyImpulseAction  // NEW
  | ApplyForceAction    // NEW
  | SetVelocityAction   // NEW
  | MoveAction;         // NEW
```

2.3. Implement executeActions for physics actions:

```typescript
private executeActions(actions: RuleAction[], context: RuleContext): void {
  for (const action of actions) {
    switch (action.type) {
      // ... existing cases ...

      case 'applyImpulse':
        this.executeApplyImpulseAction(action, context);
        break;

      case 'applyForce':
        this.executeApplyForceAction(action, context);
        break;

      case 'setVelocity':
        this.executeSetVelocityAction(action, context);
        break;

      case 'move':
        this.executeMoveAction(action, context);
        break;
    }
  }
}

private resolveEntityTarget(target: EntityTarget, context: RuleContext): RuntimeEntity[] {
  switch (target.type) {
    case 'self':
      // Need to track current entity being evaluated
      return context.currentEntity ? [context.currentEntity] : [];
    case 'byId':
      const entity = context.entityManager.getEntity(target.entityId);
      return entity ? [entity] : [];
    case 'byTag':
      return context.entityManager.getEntitiesByTag(target.tag);
    case 'player':
      return context.entityManager.getEntitiesByTag('player');
    case 'touched':
      if (context.inputEvents.tap?.targetEntityId) {
        const e = context.entityManager.getEntity(context.inputEvents.tap.targetEntityId);
        return e ? [e] : [];
      }
      return [];
    case 'other':
      // In collision context, return the other entity
      return context.otherEntity ? [context.otherEntity] : [];
    default:
      return [];
  }
}

private executeApplyImpulseAction(action: ApplyImpulseAction, context: RuleContext): void {
  const entities = this.resolveEntityTarget(action.target, context);
  
  for (const entity of entities) {
    if (!entity.bodyId) continue;

    let impulseX = action.x ? this.resolveNumber(action.x, context) : 0;
    let impulseY = action.y ? this.resolveNumber(action.y, context) : 0;

    if (action.direction && action.force) {
      const force = this.resolveNumber(action.force, context);
      switch (action.direction) {
        case 'up': impulseY = -force; break;
        case 'down': impulseY = force; break;
        case 'left': impulseX = -force; break;
        case 'right': impulseX = force; break;
        case 'dragDirection':
          if (context.inputEvents.dragEnd) {
            const { worldVelocityX, worldVelocityY } = context.inputEvents.dragEnd;
            const mag = Math.sqrt(worldVelocityX ** 2 + worldVelocityY ** 2);
            if (mag > 0.01) {
              impulseX = -(worldVelocityX / mag) * force;
              impulseY = -(worldVelocityY / mag) * force;
            }
          }
          break;
        case 'tiltDirection':
          if (context.input.tilt) {
            impulseX = context.input.tilt.x * force;
            impulseY = context.input.tilt.y * force;
          }
          break;
      }
    }

    context.physics.applyImpulseToCenter(entity.bodyId, { x: impulseX, y: impulseY });
  }
}

// Similar implementations for applyForce, setVelocity, move...
```

2.4. Wire physics context into RulesEvaluator:
- Add `physics: Physics2D` to RuleContext
- Pass from GameRuntime

TEST CASES FOR PHASE 2:
- [ ] `applyImpulse` with x/y values moves entity
- [ ] `applyImpulse` with `direction: 'up'` and `force: 10` makes entity jump
- [ ] `applyImpulse` with `direction: 'dragDirection'` launches in drag direction
- [ ] `move` action applies continuous velocity
- [ ] Target `{ type: 'player' }` resolves to player entity

---

PHASE 3: INPUT CONDITIONS (1-2 days)

3.1. Add condition types:

```typescript
export interface OnGroundCondition {
  type: 'onGround';
  value: boolean;  // true = must be on ground
}

export interface TouchingCondition {
  type: 'touching';
  tag: string;
  negated?: boolean;
}

export interface VelocityCondition {
  type: 'velocity';
  axis: 'x' | 'y';
  comparison: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
}

export interface CooldownReadyCondition {
  type: 'cooldownReady';
  cooldownId: string;
}

// Update union
export type RuleCondition =
  | ScoreCondition
  | TimeCondition
  | EntityExistsCondition
  | EntityCountCondition
  | RandomCondition
  | OnGroundCondition     // NEW
  | TouchingCondition     // NEW
  | VelocityCondition     // NEW
  | CooldownReadyCondition; // NEW
```

3.2. Implement ground detection:

Option A: Raycast down from entity center
Option B: Check for collision with 'ground' tagged entities
Option C: Track last collision with ground in entity state

```typescript
private isEntityOnGround(entity: RuntimeEntity, context: RuleContext): boolean {
  if (!entity.bodyId) return false;
  
  // Option: Raycast down slightly below entity
  const pos = context.physics.getPosition(entity.bodyId);
  const rayStart = { x: pos.x, y: pos.y };
  const rayEnd = { x: pos.x, y: pos.y + 0.1 };  // Small distance below
  
  const hit = context.physics.raycast(rayStart, rayEnd, (bodyId) => {
    const other = context.entityManager.getEntityByBodyId(bodyId);
    return other?.tags.includes('ground') || other?.tags.includes('platform');
  });
  
  return hit !== null;
}
```

3.3. Implement condition evaluation:

```typescript
private evaluateCondition(condition: RuleCondition, context: RuleContext): boolean {
  switch (condition.type) {
    // ... existing cases ...

    case 'onGround':
      if (!context.currentEntity) return !condition.value;  // If no entity context, fail if requiring ground
      const isOnGround = this.isEntityOnGround(context.currentEntity, context);
      return condition.value ? isOnGround : !isOnGround;

    case 'touching':
      if (!context.currentEntity) return condition.negated ?? false;
      const touching = context.collisions.some(c => {
        const other = c.entityA.id === context.currentEntity!.id ? c.entityB : c.entityA;
        return other.tags.includes(condition.tag);
      });
      return condition.negated ? !touching : touching;

    case 'velocity':
      if (!context.currentEntity?.bodyId) return false;
      const vel = context.physics.getLinearVelocity(context.currentEntity.bodyId);
      const v = condition.axis === 'x' ? vel.x : vel.y;
      switch (condition.comparison) {
        case 'gt': return v > condition.value;
        case 'lt': return v < condition.value;
        case 'gte': return v >= condition.value;
        case 'lte': return v <= condition.value;
        case 'eq': return Math.abs(v - condition.value) < 0.01;
      }
      return false;

    case 'cooldownReady':
      const cooldownEnd = this.cooldowns.get(condition.cooldownId);
      return !cooldownEnd || this.elapsed >= cooldownEnd;
  }
}
```

TEST CASES FOR PHASE 3:
- [ ] Jump rule with `onGround: true` only fires when entity touching ground
- [ ] `touching: "enemy"` condition detects collision
- [ ] `velocity: { axis: 'y', comparison: 'lt', value: 0 }` detects falling
- [ ] `cooldownReady` respects cooldown timing

---

PHASE 4: VARIABLES & COOLDOWNS (1-2 days)

4.1. Add variable action/condition types:

```typescript
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

export interface VariableCondition {
  type: 'variable';
  name: string;
  comparison: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'neq';
  value: number | string | boolean;
}
```

4.2. Add variable storage to RulesEvaluator:

```typescript
export class RulesEvaluator {
  private variables = new Map<string, number | string | boolean>();
  private cooldowns = new Map<string, number>();  // Already exists for rules, extend for explicit cooldowns
  
  // ...

  getVariable(name: string): number | string | boolean | undefined {
    return this.variables.get(name);
  }

  setVariable(name: string, value: number | string | boolean): void {
    this.variables.set(name, value);
  }
}
```

4.3. Implement actions:

```typescript
case 'setVariable': {
  const currentValue = this.variables.get(action.name);
  const newValue = this.resolveValue(action.value, context);
  
  switch (action.operation) {
    case 'set':
      this.variables.set(action.name, newValue);
      break;
    case 'add':
      if (typeof currentValue === 'number' && typeof newValue === 'number') {
        this.variables.set(action.name, currentValue + newValue);
      }
      break;
    case 'subtract':
      if (typeof currentValue === 'number' && typeof newValue === 'number') {
        this.variables.set(action.name, currentValue - newValue);
      }
      break;
    case 'toggle':
      this.variables.set(action.name, !currentValue);
      break;
  }
  break;
}

case 'startCooldown': {
  const duration = this.resolveNumber(action.duration, context);
  this.cooldowns.set(action.cooldownId, this.elapsed + duration);
  break;
}
```

TEST CASES FOR PHASE 4:
- [ ] Double jump with `jumpsRemaining` variable works
- [ ] `setVariable` with `operation: 'add'` increments correctly
- [ ] `startCooldown` + `cooldownReady` condition works together

---

PHASE 5: MIGRATION LAYER (1 day)

5.1. Create migration function:

```typescript
// app/lib/game-engine/migrations/migrateLegacyControls.ts

export function migrateLegacyControls(definition: GameDefinition): GameDefinition {
  const newRules: GameRule[] = [...(definition.rules ?? [])];
  
  // Find entities with control behaviors and convert to rules
  for (const entity of definition.entities) {
    const controlBehaviors = entity.behaviors?.filter(b => b.type === 'control') ?? [];
    
    for (const behavior of controlBehaviors) {
      const controlBehavior = behavior as ControlBehavior;
      const rules = convertControlToRules(entity.id, controlBehavior);
      newRules.push(...rules);
    }
    
    // Remove control behaviors from entity
    if (entity.behaviors) {
      entity.behaviors = entity.behaviors.filter(b => b.type !== 'control');
    }
  }
  
  return { ...definition, rules: newRules };
}

function convertControlToRules(entityId: string, control: ControlBehavior): GameRule[] {
  const target: EntityTarget = { type: 'byId', entityId };
  const force = control.force ?? 10;
  const cooldown = control.cooldown ?? 0.2;
  
  switch (control.controlType) {
    case 'tap_to_jump':
      return [{
        id: `${entityId}_tap_jump`,
        name: 'Jump on tap',
        trigger: { type: 'tap' },
        conditions: [{ type: 'onGround', value: true }],
        actions: [{ type: 'applyImpulse', target, y: -force }],
        cooldown,
      }];
      
    case 'tap_to_shoot':
      // Requires spawn template - check if spawn_on_event behavior exists
      return [{
        id: `${entityId}_tap_shoot`,
        name: 'Shoot on tap',
        trigger: { type: 'tap' },
        actions: [{ type: 'event', eventName: 'shoot' }],  // Let spawn_on_event handle it
        cooldown,
      }];
      
    case 'drag_to_aim':
      return [{
        id: `${entityId}_drag_aim`,
        name: 'Launch on drag',
        trigger: { type: 'drag', phase: 'end', target: 'self' },
        actions: [{ type: 'applyImpulse', target, direction: 'dragDirection', force }],
      }];
      
    case 'tilt_to_move':
      return [{
        id: `${entityId}_tilt_move`,
        name: 'Tilt to move',
        trigger: { type: 'tilt', threshold: 0.1 },
        actions: [{ type: 'move', target, direction: 'tiltDirection', speed: force }],
      }];
      
    case 'buttons':
      return [
        {
          id: `${entityId}_move_left`,
          name: 'Move left',
          trigger: { type: 'button', button: 'left', state: 'held' },
          actions: [{ type: 'move', target, direction: 'left', speed: force }],
        },
        {
          id: `${entityId}_move_right`,
          name: 'Move right',
          trigger: { type: 'button', button: 'right', state: 'held' },
          actions: [{ type: 'move', target, direction: 'right', speed: force }],
        },
        {
          id: `${entityId}_jump`,
          name: 'Jump',
          trigger: { type: 'button', button: 'jump', state: 'pressed' },
          conditions: [{ type: 'onGround', value: true }],
          actions: [{ type: 'applyImpulse', target, y: -force }],
          cooldown,
        },
      ];
      
    // ... other controlTypes
  }
  
  return [];
}
```

5.2. Call migration in GameLoader:

```typescript
// app/lib/game-engine/GameLoader.ts

load(definition: GameDefinition): LoadedGame {
  // Migrate legacy controls to rules
  const migratedDefinition = migrateLegacyControls(definition);
  
  // ... rest of loading
}
```

TEST CASES FOR PHASE 5:
- [ ] Game with `tap_to_jump` behavior still works after migration
- [ ] Game with `buttons` control still responds to keyboard
- [ ] Migration is idempotent (running twice doesn't break anything)

---

PHASE 6: AI SCHEMA UPDATES (1-2 days)

6.1. Update Zod schemas in api/src/ai/schemas.ts

6.2. Update system prompt to prefer new rules format

6.3. Add control presets for common patterns:
- `platformer` → left/right movement + jump rules
- `runner` → auto-move + tap jump rules
- `topDown` → 4-direction movement rules
- `slingshot` → drag-to-launch rules

TEST CASES FOR PHASE 6:
- [ ] AI generates games with new rules format
- [ ] Generated games pass validation
- [ ] Presets expand correctly

---

PHASE 7: PLATFORM INPUT ADAPTERS (2-3 days)

7.1. Create InputManager:

```typescript
// app/lib/game-engine/input/InputManager.ts

export class InputManager {
  private adapters: InputAdapter[] = [];
  private state: InputState = {};
  private events: InputEvents = {};
  private prevButtonState: Record<string, boolean> = {};
  
  registerAdapter(adapter: InputAdapter): void {
    this.adapters.push(adapter);
  }
  
  update(): { state: InputState; events: InputEvents } {
    // Reset events
    this.events = { buttonPressed: new Set(), buttonReleased: new Set() };
    
    // Collect from all adapters
    for (const adapter of this.adapters) {
      adapter.update(this.state, this.events);
    }
    
    // Detect button press/release edges
    if (this.state.buttons) {
      for (const [button, pressed] of Object.entries(this.state.buttons)) {
        const wasPressed = this.prevButtonState[button] ?? false;
        if (pressed && !wasPressed) this.events.buttonPressed!.add(button);
        if (!pressed && wasPressed) this.events.buttonReleased!.add(button);
        this.prevButtonState[button] = pressed;
      }
    }
    
    return { state: this.state, events: this.events };
  }
  
  handleTouchStart(x: number, y: number, worldX: number, worldY: number, targetEntityId?: string): void {
    // ... handle touch
  }
  
  // ... other touch handlers
}
```

7.2. Create platform adapters:

- `KeyboardAdapter.web.ts` - DOM keyboard events → buttons
- `KeyboardAdapter.native.ts` - No-op on native
- `TiltAdapter.native.ts` - expo-sensors accelerometer → tilt
- `TiltAdapter.web.ts` - DeviceOrientation API → tilt (with fallback)

7.3. Wire into GameRuntime

TEST CASES FOR PHASE 7:
- [ ] Keyboard WASD/arrows produce button events on web
- [ ] Accelerometer produces tilt state on native
- [ ] Platform adapters don't interfere with each other

---

PHASE 8: VIRTUAL CONTROLS UI (2-3 days)

8.1. Create VirtualDPad component (8-direction)
8.2. Create VirtualButton component
8.3. Create VirtualControls container with layout options
8.4. Add config to GameDefinition: `controls.virtualControls`

TEST CASES FOR PHASE 8:
- [ ] DPad renders on mobile
- [ ] DPad produces button state
- [ ] Buttons produce pressed/released events

---

PHASE 9: DOCUMENTATION & TESTING (1-2 days)

9.1. Update behavior-system.md
9.2. Create rules-system.md
9.3. Create input-configuration.md guide
9.4. Add unit tests for all new types
9.5. Manual testing with sample games

---

VERIFICATION REQUIREMENTS:

After each phase:
1. Run `pnpm tsc --noEmit` - Must pass with no errors
2. Run `pnpm test` - All tests must pass
3. Manual test with existing games - Must still work
4. Test new functionality with a sample game

CRITICAL CONSTRAINTS:
- NO `as any` or `@ts-ignore`
- Keep backwards compatibility via migration layer
- Use existing expression system for Value<T> resolution
- Follow existing code patterns (check RulesEvaluator for style)
- Update Zod schemas for all new types
```

---

## Quick Start Command

To begin implementation, run:

```
Read docs/game-maker/planning/unified-input-action-system.md first.
Then implement Phase 1: Input Triggers in RulesEvaluator.
Start by updating shared/src/types/rules.ts with the new trigger types.
```
