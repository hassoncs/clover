# Input Configuration Guide

This guide explains the **Unified Input-Action System**, which decouples raw user inputs from game actions. This system allows you to create complex control schemes using the same "Rules" engine that powers your game logic.

---

## The "Input as Rules" Philosophy

In Clover Game Maker, inputs are not hardcoded to behaviors. Instead, they are **Triggers** for **Rules**. Every user interaction follows a consistent pattern:

> **When** [INPUT TRIGGER], **if** [CONDITION], **do** [ACTION]

This approach offers several benefits:
1. **Flexibility**: Any input (tap, tilt, button) can trigger any action (jump, shoot, spawn).
2. **Context-Awareness**: You can restrict inputs based on game state (e.g., "Jump only if `on_ground` is true").
3. **Multi-Input Support**: Bind multiple inputs to the same action easily.

---

## Input Triggers

These triggers fire when the user interacts with the screen or device.

### 1. `tap`
Fires when the user quickly touches and releases the screen.

**Parameters:**
- `target`: `'screen'` (default) or `'self'` (triggers only when the entity itself is tapped).

**Example:**
```json
{
  "trigger": { "type": "tap", "target": "self" },
  "actions": [{ "type": "destroy", "target": { "type": "by_id", "entityId": "self" } }]
}
```

### 2. `drag`
Fires during a continuous touch and move gesture.

**Parameters:**
- `phase`: `'start' | 'move' | 'end'`
- `target`: `'screen'` or `'self'`.

**Example (Drag to Move):**
```json
{
  "trigger": { "type": "drag", "phase": "move", "target": "self" },
  "actions": [{ "type": "move", "target": "self", "position": "at_touch" }]
}
```

### 3. `tilt`
Fires based on device orientation (accelerometer).

**Parameters:**
- `axis`: `'x' | 'y'`
- `threshold`: Sensitivity (default: `0.1`).

### 4. `button`
Fires when virtual on-screen buttons or keyboard keys are used.

**Parameters:**
- `button`: `'left' | 'right' | 'up' | 'down' | 'jump' | 'action'`
- `state`: `'pressed'` (initial tap) or `'held'` (continuous).

### 5. `swipe`
Fires when the user quickly flicks their finger across the screen.

**Parameters:**
- `direction`: `'left' | 'right' | 'up' | 'down'`

---

## Binding Inputs to Actions

To bind an input, create a rule in your `GameDefinition`.

### Common Patterns

#### "Jump on Tap" (Platformer)
Trigger an impulse when the screen is tapped, but only if the player is touching the ground.

```json
{
  "id": "player_jump",
  "trigger": { "type": "tap" },
  "conditions": [
    { "type": "on_ground", "value": true }
  ],
  "actions": [
    { 
      "type": "apply_impulse", 
      "target": { "type": "by_tag", "tag": "player" }, 
      "y": -10 
    }
  ]
}
```

#### "Move with Buttons" (Top-Down)
Apply force while the 'left' or 'right' buttons are held.

```json
{
  "id": "move_right",
  "trigger": { "type": "button", "button": "right", "state": "held" },
  "actions": [
    { 
      "type": "apply_force", 
      "target": { "type": "by_tag", "tag": "player" }, 
      "x": 5 
    }
  ]
}
```

#### "Drag to Shoot" (Slingshot)
Use the `drag` trigger to apply an impulse based on the drag vector when released.

```json
{
  "id": "slingshot_release",
  "trigger": { "type": "drag", "phase": "end", "target": "self" },
  "actions": [
    { 
      "type": "apply_impulse", 
      "target": "self", 
      "use_drag_vector": true,
      "multiplier": 2.0
    }
  ]
}
```

---

## Advanced: Rules Triggers vs. Legacy Controls

While you can still use `controlType` in behaviors for quick setup, the engine automatically converts those to Rules at runtime. For any custom logic, complex conditions, or multi-step interactions, **always prefer using Rules directly**.
