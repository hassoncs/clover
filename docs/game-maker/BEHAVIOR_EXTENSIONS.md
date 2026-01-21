# Behavior System Extensions: The "Power" Set

*Proposal for extending the ECS with 6 high-leverage behaviors to enable Stealth, RPG, and Puzzle genres.*

---

## Executive Summary

To move beyond simple physics toys and platformers, we need systems for **logic, state, and perception**. Instead of adding dozens of specific behaviors (like `health`, `ammo`, `vision`, `switch`), we introduce **6 Power Behaviors** that combine to form these mechanics.

| Behavior | Purpose | Solves |
|----------|---------|--------|
| **`sensor`** | Perception & Detection | Vision cones, proximity triggers, raycasts, hearing |
| **`resource`** | Internal State | Health, ammo, inventory, flags, counters |
| **`state`** | Logic Switcher | State machines (Idle/Chase), mode switching |
| **`locomotion`** | Advanced Movement | Dash, wall-jump, climb, platformer physics |
| **`interact`** | Player Intent | "Press E", touch interactions, pickups |
| **`wiring`** | Logic & Linking | Switches, gates, triggers, cause-and-effect |

---

## 1. Sensor Behavior (`sensor`)

*Unified perception system for detecting other entities without physical collision.*

### Schema
```typescript
interface SensorBehavior {
  type: 'sensor';
  id: string;                  // e.g., "vision", "hearing"
  sense: 'sight' | 'touch' | 'sound';
  
  // Detection Shape
  shape: {
    type: 'cone' | 'circle' | 'ray';
    range: number;             // Distance in meters
    angleDeg?: number;         // For cone (e.g., 60)
    offset?: { x: number; y: number };
  };
  
  // Visibility Checks
  occlusion: {
    mode: 'lineOfSight' | 'none';
    blockTags?: string[];      // e.g., ["wall", "obstacle"]
  };
  
  // Who to detect
  filter: {
    includeTags: string[];     // e.g., ["player"]
    excludeTags?: string[];    // e.g., ["invisible"]
  };
  
  // Output Config
  emitEvents?: boolean;        // "sensor.<id>.enter", "sensor.<id>.exit"
}
```

### Examples
- **Guard Vision**: `sense: 'sight'`, `shape: 'cone'`, `occlusion: 'lineOfSight'`. Triggers when player enters cone and isn't behind a wall.
- **Proximity Mine**: `sense: 'touch'`, `shape: 'circle'`, `range: 2`. Triggers when player gets close.
- **Laser Tripwire**: `sense: 'sight'`, `shape: 'ray'`. Triggers when beam is broken.

---

## 2. Resource Behavior (`resource`)

*Generic value store for numbers and flags. Replaces bespoke Health/Ammo/Inventory components.*

### Schema
```typescript
interface ResourceBehavior {
  type: 'resource';
  id: string;                  // e.g., "stats", "bag"
  
  values: ResourceValue[];
  
  events: {
    emitOnEmpty?: boolean;     // "resource.<key>.empty"
    emitOnFull?: boolean;      // "resource.<key>.full"
    thresholds?: {             // Custom triggers
      key: string;
      value: number;
      event: string;           // "resource.<key>.low"
    }[];
  };
}

interface ResourceValue {
  key: string;                 // e.g., "hp", "ammo", "has_key"
  type: 'number' | 'bool';
  current: number | boolean;
  min?: number;
  max?: number;
  regenRate?: number;          // Per second
}
```

### Examples
- **Health**: `key: "hp"`, `max: 100`, `emitOnEmpty: true`.
- **Ammo**: `key: "arrows"`, `max: 20`.
- **Blue Key**: `key: "items.blue_key"`, `type: 'bool'`.
- **Switch State**: `key: "is_active"`, `type: 'bool'`.

---

## 3. State Behavior (`state`)

*Finite State Machine (FSM) to switch between behavior sets and properties.*

### Schema
```typescript
interface StateBehavior {
  type: 'state';
  id: string;                  // e.g., "ai_brain"
  initial: string;             // e.g., "patrol"
  
  states: {
    name: string;              // e.g., "patrol", "chase", "search"
    
    // What happens in this state?
    enableBehaviors?: string[]; // IDs of behaviors to active
    disableBehaviors?: string[];
    
    // Simple parameter overrides
    overrides?: {
      "locomotion.speed": number;
      "sensor.vision.range": number;
    };
  }[];
  
  // Automatic transitions
  transitions: {
    from: string;
    to: string;
    trigger: TriggerDef;       // Same trigger structure as Rules
  }[];
}
```

### Examples
- **Guard AI**: 
  - **Patrol**: Enables `patrol_move`, normal speed. Transition to `chase` if `sensor.vision.enter`.
  - **Chase**: Enables `chase_move`, fast speed. Transition to `search` if `sensor.vision.exit`.
  - **Search**: Stay for 5s, then return to `patrol`.

---

## 4. Locomotion Behavior (`locomotion`)

*Advanced character controller capabilities beyond simple physics.*

### Schema
```typescript
interface LocomotionBehavior {
  type: 'locomotion';
  id: string;
  mode: 'platformer' | 'top_down';
  
  // Base stats
  speed: number;
  acceleration: number;
  airControl?: number;         // 0-1
  
  // Abilities
  jump?: {
    force: number;
    maxCount: number;          // 1 = normal, 2 = double jump
    coyoteTime?: number;       // Grace period (ms)
  };
  
  dash?: {
    enabled: boolean;
    force: number;
    cooldown: number;
  };
  
  wallJump?: {
    enabled: boolean;
    force: { x: number; y: number };
  };
  
  climb?: {
    enabled: boolean;
    speed: number;
    surfaceTags: string[];     // ["ladder", "vine"]
  };
}
```

### Examples
- **Ninja**: Double jump, wall jump enabled.
- **Knight**: Slow speed, no air control, dash enabled.
- **Spider**: Climb enabled on all surfaces.

---

## 5. Interact Behavior (`interact`)

*Standardizes "Player Intent" for switches, NPCs, and pickups.*

### Schema
```typescript
interface InteractBehavior {
  type: 'interact';
  id: string;
  
  // Trigger logic
  trigger: 'overlap' | 'button_press';
  buttonName?: string;         // e.g., "interact" (E / X button)
  
  // Filtering
  targetTags: string[];        // What can I interact with?
  
  // Feedback
  prompt?: string;             // UI text "Press E to Open"
  cooldown?: number;
  
  // Events
  emitEvent: string;           // "interact.success"
}
```

### Examples
- **Lever**: `trigger: 'button_press'`, `targetTags: ['player']`.
- **Coin**: `trigger: 'overlap'`, `targetTags: ['player']`.
- **NPC**: `trigger: 'button_press'`, `prompt: "Talk"`.

---

## 6. Wiring Behavior (`wiring`)

*The logic glue. Connects events from other behaviors to actions.*

### Schema
```typescript
interface WiringBehavior {
  type: 'wiring';
  id: string;
  
  links: WireLink[];
}

interface WireLink {
  // Condition (Trigger)
  when: {
    event?: string;            // "sensor.vision.enter"
    resource?: { id: string; key: string; op: 'gte'; val: number };
    state?: { id: string; is: string };
  };
  
  // Actions (Response)
  then: WireAction[];
}

interface WireAction {
  target: { tag?: string; id?: string }; // Who to affect
  
  action: 
    | 'resource.add' 
    | 'resource.set'
    | 'state.set'
    | 'behavior.enable'
    | 'behavior.disable'
    | 'spawn'
    | 'destroy';
    
  params: any;                 // e.g., { key: "hp", value: -10 }
}
```

### Examples
- **Door Lock**: 
  - *When*: `interact` event AND `resource.keys.blue >= 1`.
  - *Then*: `state.set("open")` on self, `resource.add("keys.blue", -1)` on player.
- **Trap**:
  - *When*: `sensor.pressure_plate.enter`.
  - *Then*: `spawn` arrow projectile at trap location.

---

## Combinatorial Power: Recipes

### The "Stealth Game"
1. **Guard Entity**:
   - `locomotion`: Patrol movement.
   - `sensor`: Cone vision, line-of-sight.
   - `state`: Idle (Patrol) / Alert (Chase).
   - `wiring`: *When* `sensor.enter` -> *Then* `state.set("Alert")`.
2. **Player Entity**:
   - `resource`: "Stealth Meter" (modified by crouching).

### The "Zelda-like RPG"
1. **Player**:
   - `resource`: HP, Rupees, Keys.
   - `interact`: Button press interaction.
2. **Chest**:
   - `state`: Closed / Open.
   - `wiring`: *When* `interact` AND `state.is("Closed")` -> *Then* `state.set("Open")`, `resource.add("Rupees", 5)`.
3. **Locked Door**:
   - `wiring`: *When* `interact` AND `resource.keys > 0` -> *Then* `state.set("Open")`.

### The "Puzzle Logic"
1. **Switch A & B**:
   - `resource`: `is_active` (bool).
   - `interact`: Toggle `is_active`.
2. **AND Gate (Invisible)**:
   - `wiring`: *When* `SwitchA.is_active` AND `SwitchB.is_active` -> *Then* `Door.open()`.

---

## Integration Plan

These behaviors are implemented as standard ECS components. The `wiring` behavior acts as a local "Rules Engine" for entity-to-entity logic, while the global `Rules` system remains for high-level game flow (Win/Lose).

1. **Implement `Resource`**: Foundation for all state.
2. **Implement `Sensor`**: Foundation for all AI/Logic.
3. **Implement `Wiring`**: The glue.
4. **Implement others**: Specialized capabilities.
