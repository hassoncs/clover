# Player Control System Implementation Plan

**Goal:** Add a unified, cross-platform player control system with keyboard, virtual controls, and tap zones that feeds the existing behavior input pipeline.

**Architecture:** Introduce a shared InputManager that aggregates platform-specific adapters (keyboard, touch/drag, virtual controls, tap zones) into a single `InputState`. GameRuntime owns the InputManager and supplies a stable `inputRef` to behaviors each frame, while per-frame transient inputs (tap, dragEnd) are cleared by the manager, not by wiping the entire state.

**Tech Stack:** React Native + RN Web, @shopify/react-native-skia, Box2D (native + wasm), Zod schemas, tRPC AI generator/validator.

---

## 1) Architecture Overview

**Input Flow**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Raw Input Events                                │
├─────────────────┬─────────────────┬─────────────────┬─────────────────────────┤
│   Keyboard      │     Touch       │  Virtual UI     │    Accelerometer       │
│  (web only)     │   (canvas)      │  (buttons/dpad) │    (native only)       │
└────────┬────────┴────────┬────────┴────────┬────────┴────────┬──────────────┘
         │                 │                 │                 │
         ▼                 ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Platform Adapters                                  │
├─────────────────┬─────────────────┬─────────────────┬─────────────────────────┤
│ KeyboardAdapter │  TouchAdapter   │VirtualControls  │    TiltAdapter         │
│    .web.ts      │    (shared)     │    Adapter      │    .native.ts          │
└────────┬────────┴────────┬────────┴────────┬────────┴────────┬──────────────┘
         │                 │                 │                 │
         └─────────────────┴────────┬────────┴─────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            InputManager                                      │
│                                                                              │
│   - Aggregates all adapter states                                            │
│   - Merges into unified InputState                                           │
│   - Handles transient input clearing (tap, dragEnd)                          │
│   - Preserves continuous input (buttons, drag)                               │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BehaviorContext                                    │
│                                                                              │
│   ctx.input.tap         → Transient (cleared after frame)                   │
│   ctx.input.drag        → Continuous (while finger down)                    │
│   ctx.input.dragEnd     → Transient (cleared after frame)                   │
│   ctx.input.buttons     → Continuous (from keyboard OR virtual controls)    │
│   ctx.input.tilt        → Continuous (from accelerometer)                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Platform-Specific Adapters**
- Web: `KeyboardInputAdapter.web.ts` listens to `window` key events and maps WASD/Arrow keys to `buttons`.
- Native: `KeyboardInputAdapter.native.ts` is a no-op (optional hardware keyboard support later).
- Shared: `TouchInputAdapter` handles drag/tap on the canvas surface.
- UI: Virtual controls are React components that update a `VirtualControlsAdapter`.

**Component Hierarchy**
```
GameRuntime (owns InputManager)
├── Canvas (Skia) - rendering + touch input
├── TapZoneOverlay (optional) - invisible full-screen tap zones
└── VirtualControls (optional)
    ├── VirtualDPad - 4-directional pad
    ├── VirtualButton - jump
    └── VirtualButton - action
```

---

## 2) New Types / Interfaces

### Extended ControlType

```typescript
// shared/src/types/behavior.ts
export type ControlType =
  // Existing
  | 'tap_to_jump'
  | 'tap_to_shoot'
  | 'tap_to_flip'
  | 'drag_to_aim'
  | 'drag_to_move'
  | 'tilt_to_move'
  | 'tilt_gravity'
  | 'buttons'
  // NEW - Keyboard-driven (maps to buttons)
  | 'keyboard_buttons'
  // NEW - Virtual UI-driven (maps to buttons)  
  | 'virtual_buttons'
  // NEW - Tap zone-driven (maps to buttons.left/right)
  | 'tap_zones';
```

### InputAdapter Interface

```typescript
// app/lib/game-engine/input/types.ts
export interface InputAdapter {
  /** Unique identifier for this adapter */
  id: string;
  
  /** Called when adapter is attached to InputManager */
  attach?(): void;
  
  /** Called when adapter is detached */
  detach?(): void;
  
  /** Called each frame to update internal state */
  update?(dt: number): void;
  
  /** Returns current input state from this adapter */
  getState(): Partial<InputState>;
  
  /** Called at end of frame to clear transient state */
  endFrame?(): void;
}
```

### ControlsConfig (GameDefinition)

```typescript
// shared/src/types/GameDefinition.ts
export interface ControlsConfig {
  /** List of input schemes to enable */
  schemes: ControlScheme[];
}

export type ControlScheme =
  | { type: 'keyboard'; mapping?: KeyboardMapping }
  | { type: 'virtual_buttons'; layout?: VirtualLayoutConfig }
  | { type: 'tap_zones'; zones?: TapZoneConfig };

export interface KeyboardMapping {
  left?: string[];   // Default: ['ArrowLeft', 'a', 'A']
  right?: string[];  // Default: ['ArrowRight', 'd', 'D']
  up?: string[];     // Default: ['ArrowUp', 'w', 'W']
  down?: string[];   // Default: ['ArrowDown', 's', 'S']
  jump?: string[];   // Default: ['Space', ' ']
  action?: string[]; // Default: ['Enter', 'e', 'E']
}

export type VirtualLayoutConfig = 
  | 'dpad-left-actions-right'  // DPad on left, action buttons on right
  | 'buttons-only'             // Just action buttons (jump/shoot)
  | 'dpad-only';               // Just directional pad

export type TapZoneConfig =
  | 'left-right'               // Preset: Left half = left, right half = right
  | 'left-right-jump'          // Preset: Left = left, right = jump
  | TapZoneCustomConfig;       // Fully custom configuration

export interface TapZoneCustomConfig {
  zones: TapZoneDefinition[];
}

export interface TapZoneDefinition {
  /** Area of screen: 'left', 'right', 'top', 'bottom', or custom bounds */
  area: 'left' | 'right' | 'top' | 'bottom' | { x: number; y: number; width: number; height: number };
  /** Which button this zone maps to */
  button: 'left' | 'right' | 'up' | 'down' | 'jump' | 'action';
  /** Optional: require double-tap instead of single tap */
  doubleTap?: boolean;
}
```

### VirtualControl Props

```typescript
// app/components/controls/types.ts
export interface VirtualButtonProps {
  id: 'jump' | 'action' | 'left' | 'right' | 'up' | 'down';
  size?: number;
  color?: string;
  pressed: boolean;
  onPressIn(): void;
  onPressOut(): void;
}

export interface VirtualDPadProps {
  size?: number;
  deadZone?: number;
  pressed: {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
  };
  onChange(next: { left: boolean; right: boolean; up: boolean; down: boolean }): void;
}

export interface VirtualControlsProps {
  layout: VirtualLayoutConfig;
  onStateChange(buttons: ButtonState): void;
}

export interface TapZoneOverlayProps {
  zones: TapZoneConfig;
  onPressIn(zone: 'left' | 'right'): void;
  onPressOut(zone: 'left' | 'right'): void;
}
```

---

## 3) Implementation Phases

### Phase 1: Core Input Adapter Infrastructure

**Goal:** Create the InputManager that aggregates multiple adapters into a unified InputState.

**Tasks:**
1. Create `app/lib/game-engine/input/types.ts` with InputAdapter interface
2. Create `app/lib/game-engine/input/InputManager.ts`:
   - `registerAdapter(adapter: InputAdapter): void`
   - `unregisterAdapter(id: string): void`
   - `getState(): InputState` - merges all adapter states
   - `endFrame(): void` - clears transient inputs (tap, dragEnd)
3. Update `GameRuntime` to create and use InputManager
4. Move existing touch/drag handling into `TouchInputAdapter`
5. Stop using `inputRef.current = {}` pattern; use InputManager.endFrame()

**Files:**
- NEW: `app/lib/game-engine/input/types.ts`
- NEW: `app/lib/game-engine/input/InputManager.ts`
- NEW: `app/lib/game-engine/input/adapters/TouchInputAdapter.ts`
- MODIFY: `app/lib/game-engine/GameRuntime.native.tsx` (or wherever runtime lives)

**Tests:**
- `app/lib/game-engine/__tests__/InputManager.test.ts`
  - Verify adapter registration/unregistration
  - Verify state merging from multiple adapters
  - Verify `endFrame` clears `tap` but preserves `buttons`

**Success Criteria:**
- InputManager returns stable `buttons` across frames
- Tap/drag transients clear correctly after endFrame()
- Existing touch behavior works identically

---

### Phase 2: Keyboard Integration (Web)

**Goal:** WASD/Arrow keys populate `input.buttons` on web platform.

**Tasks:**
1. Create `app/lib/game-engine/input/adapters/KeyboardInputAdapter.web.ts`:
   - Attach/detach `keydown`/`keyup` listeners on `window`
   - Map keys to button state based on KeyboardMapping
   - Support customizable key mappings
2. Create `app/lib/game-engine/input/adapters/KeyboardInputAdapter.native.ts`:
   - No-op implementation (returns empty state)
   - Future: support hardware keyboard on iPad
3. Wire adapter from GameRuntime based on `controls.schemes`
4. Add `keyboard_buttons` to ControlType enum
5. Update BehaviorExecutor to treat `keyboard_buttons` same as `buttons`

**Files:**
- NEW: `app/lib/game-engine/input/adapters/KeyboardInputAdapter.web.ts`
- NEW: `app/lib/game-engine/input/adapters/KeyboardInputAdapter.native.ts`
- MODIFY: `shared/src/types/behavior.ts` - add ControlType
- MODIFY: `app/lib/game-engine/BehaviorExecutor.ts` - handle new type

**Tests:**
- `app/lib/game-engine/__tests__/KeyboardInputAdapter.test.ts`
  - Mock keydown/keyup events
  - Verify WASD mapping
  - Verify Arrow key mapping
  - Verify custom mapping

**Success Criteria:**
- WASD/Arrow keys populate `input.buttons.left/right/up/down`
- Space populates `input.buttons.jump`
- No errors on native (adapter returns empty state)
- TopDownAsteroids can use keyboard via InputManager

---

### Phase 3: Virtual Control Components

**Goal:** On-screen DPad and action buttons for mobile.

**Tasks:**
1. Create `app/components/controls/VirtualButton.tsx`:
   - Circular touch target (56-72px)
   - Press feedback (scale + opacity animation)
   - Support Pressable/TouchableOpacity patterns
2. Create `app/components/controls/VirtualDPad.tsx`:
   - Radial hit detection with dead zone
   - Support diagonal presses
   - 120x120px size, semi-transparent
3. Create `app/components/controls/VirtualControls.tsx`:
   - Compose DPad + action buttons based on layout
   - Use SafeAreaView for positioning
   - Manage combined button state
4. Create `app/lib/game-engine/input/adapters/VirtualControlsAdapter.ts`:
   - Receives state updates from VirtualControls component
   - Returns button state for InputManager
5. Add `virtual_buttons` to ControlType enum

**Files:**
- NEW: `app/components/controls/VirtualButton.tsx`
- NEW: `app/components/controls/VirtualDPad.tsx`
- NEW: `app/components/controls/VirtualControls.tsx`
- NEW: `app/components/controls/types.ts`
- NEW: `app/components/controls/index.ts` (exports)
- NEW: `app/lib/game-engine/input/adapters/VirtualControlsAdapter.ts`
- MODIFY: `shared/src/types/behavior.ts`

**Tests:**
- `app/components/controls/__tests__/VirtualButton.test.tsx`
- `app/components/controls/__tests__/VirtualDPad.test.tsx`
- `app/components/controls/__tests__/VirtualControls.test.tsx`
- Test press in/out state transitions
- Test DPad diagonal detection

**Success Criteria:**
- VirtualDPad renders and detects 4 directions + diagonals
- VirtualButton shows press feedback
- VirtualControls updates InputManager.buttons state
- Controls positioned in safe areas on iOS/Android

---

### Phase 4: Tap Zone Controls

**Goal:** Tap left/right side of screen to move left/right.

**Tasks:**
1. Create `app/components/controls/TapZoneOverlay.tsx`:
   - Full-screen invisible view capturing touches
   - Split screen into left/right rectangles
   - Support press-hold (not just tap)
   - Handle multi-touch (both zones simultaneously)
2. Integrate with VirtualControlsAdapter or create TapZoneAdapter
3. Add `tap_zones` to ControlType enum
4. Support zone configurations (left-right, left-right-jump)

**Files:**
- NEW: `app/components/controls/TapZoneOverlay.tsx`
- MODIFY: `app/lib/game-engine/input/adapters/VirtualControlsAdapter.ts`
- MODIFY: `shared/src/types/behavior.ts`

**Tests:**
- `app/components/controls/__tests__/TapZoneOverlay.test.tsx`
- Test left zone press → buttons.left = true
- Test right zone press → buttons.right = true
- Test hold behavior (continuous, not just on tap)
- Test multi-touch

**Success Criteria:**
- Tap left half → `buttons.left = true` while held
- Tap right half → `buttons.right = true` while held
- Release → respective button = false
- Works with existing controls (not mutually exclusive)

---

### Phase 5: AI Prompt + Schema Updates

**Goal:** AI can generate games with new control schemes.

**Tasks:**
1. Update `shared/src/types/behavior.ts`:
   - Add new ControlTypes to union
2. Update `shared/src/types/schemas.ts`:
   - Add Zod schema for ControlsConfig
   - Update GameDefinitionSchema
3. Update `shared/src/types/GameDefinition.ts`:
   - Add optional `controls?: ControlsConfig` field
4. Update `api/src/ai/schemas.ts`:
   - Add AI-facing schema for controls
5. Update `api/src/ai/validator.ts`:
   - Validate new ControlTypes
   - Validate ControlsConfig
6. Update `api/src/ai/templates.ts`:
   - Add control schemes to game templates
   - Platformer template → `keyboard` + `virtual_buttons`
   - Simple games → `tap_zones`
7. Update `api/src/ai/classifier.ts`:
   - Map user intent to control scheme suggestions
8. Update AI system prompt in `api/src/ai/generator.ts`:
   ```
   ## Available Controls
   - keyboard: WASD/Arrow keys (web), maps to buttons
   - virtual_buttons: On-screen DPad + action buttons (mobile)
   - tap_zones: Tap left/right screen edges to move
   - Combine multiple schemes for cross-platform support
   ```

**Files:**
- MODIFY: `shared/src/types/behavior.ts`
- MODIFY: `shared/src/types/schemas.ts`
- MODIFY: `shared/src/types/GameDefinition.ts`
- MODIFY: `api/src/ai/schemas.ts`
- MODIFY: `api/src/ai/validator.ts`
- MODIFY: `api/src/ai/templates.ts`
- MODIFY: `api/src/ai/classifier.ts`
- MODIFY: `api/src/ai/generator.ts`

**Tests:**
- `api/src/ai/__tests__/validator.test.ts` - validate new types
- `api/src/trpc/routes/games.test.ts` - integration tests

**Success Criteria:**
- AI generates valid `controls` config in GameDefinition
- Validator accepts new ControlTypes without errors
- Templates include appropriate control schemes
- Generated games work on web AND mobile

---

### Phase 6: Documentation

**Goal:** Document new input system for developers and AI.

**Tasks:**
1. Update `docs/game-maker/reference/behavior-system.md`:
   - Add section on Player Controls
   - Document each ControlType
   - Provide examples
2. Create `docs/game-maker/guides/player-controls.md`:
   - Guide for choosing control schemes
   - Cross-platform best practices
   - Examples for common game types
3. Update `docs/game-maker/reference/ai-integration.md`:
   - Update available controls section
   - Add examples of control configs
4. Add inline code comments to new files

**Files:**
- MODIFY: `docs/game-maker/reference/behavior-system.md`
- NEW: `docs/game-maker/guides/player-controls.md`
- MODIFY: `docs/game-maker/reference/ai-integration.md`

**Success Criteria:**
- Behavior system docs include all new ControlTypes
- Clear examples for keyboard, virtual, and tap zone controls
- AI integration docs updated with control config examples

---

## 4) File Structure Summary

### New Files
```
app/lib/game-engine/input/
├── InputManager.ts
├── types.ts
└── adapters/
    ├── KeyboardInputAdapter.web.ts
    ├── KeyboardInputAdapter.native.ts
    ├── TouchInputAdapter.ts
    └── VirtualControlsAdapter.ts

app/components/controls/
├── index.ts
├── types.ts
├── VirtualButton.tsx
├── VirtualDPad.tsx
├── VirtualControls.tsx
└── TapZoneOverlay.tsx
└── __tests__/
    ├── VirtualButton.test.tsx
    ├── VirtualDPad.test.tsx
    ├── VirtualControls.test.tsx
    └── TapZoneOverlay.test.tsx

app/lib/game-engine/__tests__/
├── InputManager.test.ts
└── KeyboardInputAdapter.test.ts

docs/game-maker/guides/
└── player-controls.md
```

### Modified Files
```
shared/src/types/behavior.ts        # Add ControlTypes
shared/src/types/schemas.ts         # Add ControlsConfig schema
shared/src/types/GameDefinition.ts  # Add controls field
app/lib/game-engine/BehaviorExecutor.ts    # Handle new types
app/lib/game-engine/GameRuntime.native.tsx # Use InputManager
api/src/ai/schemas.ts               # AI schema updates
api/src/ai/validator.ts             # Validate new types
api/src/ai/templates.ts             # Add control schemes
api/src/ai/classifier.ts            # Intent → controls
api/src/ai/generator.ts             # Update prompts
docs/game-maker/reference/behavior-system.md
docs/game-maker/reference/ai-integration.md
```

---

## 5) API Examples

### Keyboard Controls (Web-focused game)
```json
{
  "meta": { "name": "Space Shooter" },
  "controls": {
    "schemes": [
      { "type": "keyboard" }
    ]
  },
  "entities": [
    {
      "id": "player",
      "behaviors": [
        { "type": "control", "controlType": "keyboard_buttons", "force": 6 }
      ]
    }
  ]
}
```

### Virtual Buttons (Mobile-focused game)
```json
{
  "meta": { "name": "Platformer" },
  "controls": {
    "schemes": [
      { "type": "virtual_buttons", "layout": "dpad-left-actions-right" }
    ]
  },
  "entities": [
    {
      "id": "player",
      "behaviors": [
        { "type": "control", "controlType": "virtual_buttons", "force": 6 }
      ]
    }
  ]
}
```

### Tap Zones (Simple mobile game)
```json
{
  "meta": { "name": "Runner" },
  "controls": {
    "schemes": [
      { "type": "tap_zones", "zones": "left-right" }
    ]
  },
  "entities": [
    {
      "id": "player",
      "behaviors": [
        { "type": "control", "controlType": "tap_zones", "force": 6 }
      ]
    }
  ]
}
```

### Cross-Platform (Best of both worlds)
```json
{
  "meta": { "name": "Cross-Platform Platformer" },
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
        { "type": "control", "controlType": "buttons", "force": 6 }
      ]
    }
  ]
}
```

### Custom Tap Zones (Fully configurable)
```json
{
  "meta": { "name": "Custom Controls Runner" },
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
  },
  "entities": [
    {
      "id": "player",
      "behaviors": [
        { "type": "control", "controlType": "tap_zones", "force": 6 }
      ]
    }
  ]
}
```

---

## 6) Component Specifications

### VirtualDPad

**Props:**
- `size?: number` - Overall size (default: 120)
- `deadZone?: number` - Center dead zone ratio (default: 0.3)
- `pressed: { left, right, up, down }` - Current state
- `onChange(state)` - Callback when state changes

**Behavior:**
- Touch anywhere in circular area
- Calculate angle from center
- Apply dead zone for no direction
- Support 8 directions (including diagonals)
- Visual feedback on active direction

**Styling:**
- Position: bottom-left with safe area inset
- Background: semi-transparent dark
- Active direction: highlighted
- Border: subtle outline

### VirtualButton

**Props:**
- `id: 'jump' | 'action'`
- `size?: number` - Button diameter (default: 64)
- `color?: string` - Button color
- `pressed: boolean`
- `onPressIn/onPressOut`

**Behavior:**
- Touch down → onPressIn
- Touch up → onPressOut
- Animated scale on press (0.9)
- Opacity change on press (0.7)

**Styling:**
- Circular shape
- High contrast colors
- Accessible size (minimum 44pt touch target)
- Label inside (A, B, or icon)

### VirtualControls

**Props:**
- `layout: VirtualLayoutConfig`
- `onStateChange(buttons: ButtonState)`

**Layouts:**
- `dpad-left-actions-right`: DPad bottom-left, Jump+Action bottom-right
- `buttons-only`: Jump+Action bottom-right only
- `dpad-only`: DPad bottom-left only

**Positioning:**
- Use `SafeAreaView` or `useSafeAreaInsets()`
- 16-24px margin from edges
- Avoid overlap with game UI

### TapZoneOverlay

**Props:**
- `zones: TapZoneConfig`
- `onPressIn(zone: 'left' | 'right')`
- `onPressOut(zone: 'left' | 'right')`

**Behavior:**
- Full-screen invisible View
- pointerEvents="box-none" to allow pass-through
- Track active touches per zone
- Support multi-touch (both zones active)

**Zone Split:**
- Presets: `left-right` (50/50), `left-right-jump` (left=move, right=jump)
- Custom: Define any number of zones with bounds and button mappings
- Support percentage-based or pixel-based bounds

---

## 7) Integration Points

### GameRuntime Integration

```typescript
// Pseudocode for GameRuntime changes

class GameRuntime {
  private inputManager: InputManager;
  
  constructor(definition: GameDefinition) {
    this.inputManager = new InputManager();
    
    // Register adapters based on controls config
    if (definition.controls?.schemes.some(s => s.type === 'keyboard')) {
      this.inputManager.registerAdapter(new KeyboardInputAdapter());
    }
    // TouchInputAdapter always registered for drag/tap
    this.inputManager.registerAdapter(new TouchInputAdapter(this.canvasRef));
  }
  
  // In render, conditionally show VirtualControls
  render() {
    const showVirtualControls = this.definition.controls?.schemes.some(
      s => s.type === 'virtual_buttons'
    );
    
    return (
      <View>
        <Canvas ... />
        {showVirtualControls && (
          <VirtualControls
            layout={...}
            onStateChange={(buttons) => {
              this.inputManager.setVirtualControlState(buttons);
            }}
          />
        )}
      </View>
    );
  }
  
  // In game loop
  tick(dt: number) {
    // Get unified input state
    const input = this.inputManager.getState();
    
    // Execute behaviors with input
    this.behaviorExecutor.executeAll(entities, { input, ... });
    
    // Clear transient inputs
    this.inputManager.endFrame();
  }
}
```

### BehaviorExecutor Integration

```typescript
// In registerControlHandlers
executor.registerHandler('control', (behavior, ctx, runtime) => {
  const control = behavior as ControlBehavior;
  
  switch (control.controlType) {
    case 'buttons':
    case 'keyboard_buttons':
    case 'virtual_buttons':
    case 'tap_zones':
      // All these use the same buttons logic
      if (ctx.input.buttons) {
        handleButtonsControl(control, ctx, runtime);
      }
      break;
    // ... other cases
  }
});
```

### AI Integration

Update system prompt to include controls guidance:

```
## Controls Configuration
When generating a game, include a "controls" field to specify input methods:

For web-focused games:
- Use "keyboard" scheme

For mobile-focused games:
- Use "virtual_buttons" for complex games (platformers, shooters)
- Use "tap_zones" for simple games (runners, single-action games)

For cross-platform:
- Include both "keyboard" AND "virtual_buttons"
- Use controlType: "buttons" in behaviors (works with any scheme)

Example:
{
  "controls": {
    "schemes": [
      { "type": "keyboard" },
      { "type": "virtual_buttons", "layout": "dpad-left-actions-right" }
    ]
  }
}
```

---

## 8) Testing Strategy

### Unit Tests

**InputManager.test.ts**
- Adapter registration/unregistration
- State merging from multiple adapters (buttons from keyboard + drag from touch)
- Transient state clearing (tap cleared, buttons preserved)
- Edge cases: no adapters, conflicting states

**KeyboardInputAdapter.test.ts**
- WASD key mapping
- Arrow key mapping
- Custom mapping
- Key release detection
- Multiple simultaneous keys

### Component Tests

**VirtualButton.test.tsx**
- Press in → pressed=true callback
- Press out → pressed=false callback
- Visual feedback (use snapshots or style checks)

**VirtualDPad.test.tsx**
- Touch at angle → correct direction
- Dead zone → no direction
- Diagonal detection
- Touch move between directions

**TapZoneOverlay.test.tsx**
- Touch left half → left zone active
- Touch right half → right zone active
- Hold behavior (stays active while touching)
- Multi-touch (both zones)

### Integration Tests

**Behavior execution**
- Create behavior with `keyboard_buttons` controlType
- Simulate keyboard input via InputManager
- Verify entity receives force

**Cross-platform**
- Web: Keyboard works, virtual controls hidden
- Native: Virtual controls work, keyboard adapter no-op

### Manual Testing Checklist

- [ ] Web: WASD moves entity
- [ ] Web: Arrow keys move entity
- [ ] Web: Space jumps
- [ ] iOS: Virtual DPad moves entity
- [ ] iOS: Virtual button triggers jump
- [ ] iOS: Tap zones move entity
- [ ] Android: Same as iOS
- [ ] Cross-platform game: All inputs work

---

## 9) Success Criteria

### Phase 1: Core Infrastructure
- [ ] InputManager aggregates states from multiple adapters
- [ ] Transient inputs (tap) clear after frame
- [ ] Continuous inputs (buttons) persist across frames
- [ ] Existing touch/drag behavior unchanged

### Phase 2: Keyboard
- [ ] WASD keys → buttons.up/down/left/right
- [ ] Arrow keys → buttons.up/down/left/right
- [ ] Space → buttons.jump
- [ ] Enter/E → buttons.action
- [ ] No errors on native platform

### Phase 3: Virtual Controls
- [ ] VirtualDPad renders correctly
- [ ] VirtualDPad detects all 8 directions
- [ ] VirtualButton shows press feedback
- [ ] VirtualControls updates InputManager
- [ ] Safe area positioning works

### Phase 4: Tap Zones
- [ ] Left zone tap → buttons.left
- [ ] Right zone tap → buttons.right
- [ ] Hold works (not just tap)
- [ ] Multi-touch works
- [ ] Custom zone configurations work

### Phase 5: AI Integration
- [ ] AI generates valid controls config
- [ ] Validator accepts all new types
- [ ] Templates include control schemes
- [ ] Generated games work cross-platform

### Phase 6: Documentation
- [ ] Behavior system docs updated
- [ ] Player controls guide created
- [ ] AI integration docs updated

---

## 10) Risk Assessment

### Cross-Platform Input Mismatches
**Risk:** React Native Web handles touch differently than native
**Mitigation:** Isolate platform-specific code in adapters; use `.web.ts`/`.native.ts` extensions

### Transient Input Timing
**Risk:** Tap cleared before behavior processes it
**Mitigation:** Clear transients at END of frame, after all behaviors execute

### Performance
**Risk:** Heavy state updates cause re-renders
**Mitigation:** Use refs for input state; only update React state for UI components

### Virtual Control Touch Conflicts
**Risk:** Virtual controls intercept game canvas touches
**Mitigation:** Use proper touch event propagation; position controls outside game area

### Accessibility
**Risk:** Touch targets too small; no keyboard navigation
**Mitigation:** Minimum 44pt touch targets; maintain keyboard as primary input on web

### AI Generating Invalid Configs
**Risk:** AI creates incompatible control combinations
**Mitigation:** Strict validation; sensible defaults; fallback to template controls

---

## Appendix: Decision Log

### Tap Zones: Left/Right Only vs. Configurable
**Decision:** Fully configurable zone-to-button mapping from the start
**Rationale:** User requested full flexibility; avoids rework later
**Implementation:** TapZoneConfig will support custom zone definitions with button mappings
**Example:** `{ zones: [{ area: 'left', button: 'left' }, { area: 'right', button: 'jump' }] }`

### New ControlTypes vs. Unified "buttons"
**Decision:** Add new ControlTypes that alias to buttons behavior
**Rationale:** Allows AI to express intent; runtime treats identically
**Alternative Considered:** Single "buttons" type with config
**Trade-off:** Slightly more types, but clearer semantics

### InputManager vs. Context Provider
**Decision:** InputManager class owned by GameRuntime
**Rationale:** Simpler; avoids React context overhead in game loop
**Alternative Considered:** React Context + useInput hook
**Trade-off:** Less "React-y" but better performance

---

*Plan created: January 2026*
