# GameDefinition Field Reference

Complete field-by-field reference for the `GameDefinition` interface. Source of truth: `shared/src/types/GameDefinition.ts`.

## Top-Level Fields

```typescript
interface GameDefinition {
  metadata: GameMetadata;                           // Required
  world: WorldConfig;                               // Required
  templates: Record<string, EntityTemplate>;        // Required
  entities: GameEntity[];                           // Required
  presentation?: PresentationConfig;
  camera?: CameraConfig;
  overlay?: OverlayConfig;
  background?: BackgroundConfig;
  variables?: Record<string, GameVariable>;
  joints?: GameJoint[];
  rules?: GameRule[];
  winCondition?: WinCondition;
  loseCondition?: LoseCondition;
  assetSystem?: AssetSystemConfig;
  tileSheets?: TileSheet[];
  tileMaps?: TileMap[];
  multiplayer?: MultiplayerConfig;
  loadingScreen?: LoadingScreenConfig;
  sounds?: Record<string, SoundAsset>;
  input?: InputConfig;
  match3?: Match3Config;
  tetris?: TetrisConfig;
  stateMachines?: StateMachineDefinition[];
  containers?: ContainerConfig[];
  persistence?: PersistenceConfig<unknown>;
  constants?: Record<string, number | string | boolean>;
  script?: string;
  hoverHighlight?: HoverHighlightConfig;
  dialogs?: GameDialogsConfig;
}
```

## metadata: GameMetadata

```typescript
{
  id: string;              // UUID, unique across all games
  slug?: string;           // URL-safe identifier (e.g., "ballSort")
  title: string;
  description?: string;
  instructions?: string;   // Displayed to player before game starts
  author?: string;
  version: string;         // Semver (e.g., "1.0.0")
  createdAt?: number;
  updatedAt?: number;
  thumbnailUrl?: string;
  thumbnailAssetRef?: string;
}
```

## world: WorldConfig

```typescript
{
  gravity: Vec2;           // { x: 0, y: -10 } for normal gravity (Y-up)
  pixelsPerMeter: number;  // Usually 50
  bounds?: {
    width: number;         // World width in meters (e.g., 12)
    height: number;        // World height in meters (e.g., 16)
  };
}
```

## camera: CameraConfig

```typescript
{
  type: 'fixed' | 'follow' | 'follow-x' | 'follow-y' | 'auto-scroll';
  followTarget?: string;       // Entity ID to follow
  viewHeight?: number;
  zoom?: number;               // Default: 1
  minZoom?: number;
  maxZoom?: number;
  followSmoothing?: number;
  followOffset?: Vec2;
  deadZone?: { width: number; height: number };
  bounds?: { minX, maxX, minY, maxY: number };
  autoScroll?: { direction: Vec2; speed: number; acceleration?: number };
  shake?: { decay?: number; maxOffset?: number; maxRotation?: number };
}
```

## background: BackgroundConfig

```typescript
// Static background
{ type: "static", color?: string, whatDescription?: string }

// Parallax background
{ type: "parallax", layers: ParallaxLayer[] }
```

## templates: Record<string, EntityTemplate>

Templates are an object map, NOT an array. The key must match the template's `id` field.

### EntityTemplate

```typescript
{
  id: string;                    // Must match the key in templates object
  description?: string;
  whatDescription?: string;      // For AI asset generation: "a bouncing red ball"
  archetype?: EntityArchetype;
  visual?: VisualComponent;
  physics?: PhysicsComponent;
  collider?: ColliderComponent;
  character?: CharacterComponent;
  behaviors?: Behavior[];
  conditionalBehaviors?: ConditionalBehavior[];
  tags?: string[];
  layer?: number;
  slots?: Record<string, SlotDefinition>;
  children?: ChildTemplateDefinition[];
}
```

### VisualComponent

```typescript
// Rectangle
{ type: 'rect', width: number, height: number, color: string,
  strokeColor?: string, strokeWidth?: number }

// Circle
{ type: 'circle', radius?: number, color: string }

// Image (resolved via asset system)
{ type: 'image', imageWidth?: number, imageHeight?: number,
  whatDescription?: string, tint?: string, url?: string, scale?: number }

// Text
{ type: 'text', text: string, color?: string, fontSize?: number,
  fontFamily?: string, align?: 'left' | 'center' | 'right' }

// Polygon
{ type: 'polygon', vertices: Vec2[], color: string }

// Common fields on all visual types:
// width?, height?, offsetX?, offsetY?, opacity?, zIndex?, blendMode?, shadow?
```

### PhysicsComponent

```typescript
{
  bodyType: 'static' | 'dynamic' | 'kinematic';
  density?: number;           // 0 for static/kinematic, >0 for dynamic
  mass?: number;
  gravityScale?: number;      // 0 = no gravity, 1 = normal, 2 = double
  linearDamping?: number;     // Friction-like deceleration
  angularDamping?: number;
  fixedRotation?: boolean;    // Prevent rotation
  ccd?: boolean;              // Continuous collision detection (fast objects)
  initialVelocity?: Vec2;
  initialAngularVelocity?: number;
}
```

### ColliderComponent

```typescript
// Box
{ shape: 'box', width: number, height: number, friction?: number,
  restitution?: number, isSensor?: boolean }

// Circle
{ shape: 'circle', radius: number, friction?: number,
  restitution?: number, isSensor?: boolean }

// Polygon
{ shape: 'polygon', vertices: Vec2[], friction?: number,
  restitution?: number, isSensor?: boolean }

// Capsule
{ shape: 'capsule', radius: number, height: number }

// Common fields:
// frictionCombine?, restitutionCombine?: 'average' | 'min' | 'multiply' | 'max'
```

## entities: GameEntity[]

```typescript
{
  id: string;                    // Unique entity ID
  name: string;                  // Human-readable name
  template?: string;             // References a key in templates
  transform: TransformComponent; // { x, y, angle, scaleX, scaleY }
  visual?: VisualComponent;      // Override template visual
  physics?: PhysicsComponent;    // Override template physics
  collider?: ColliderComponent;  // Override template collider
  behaviors?: Behavior[];        // Additional behaviors
  tags?: string[];               // Additional tags (merged with template)
  layer?: number;
  visible?: boolean;
  active?: boolean;
  children?: ChildEntityDefinition[];
}
```

**TransformComponent** — all 5 fields are required:
```typescript
{ x: number, y: number, angle: number, scaleX: number, scaleY: number }
```

## variables: Record<string, GameVariable>

```typescript
// Simple value
score: 0,
lives: 3,
direction: "right",
isActive: true,

// Value with tuning metadata
paddleForce: {
  value: 120,
  tuning: { min: 50, max: 200, step: 10 },
  category: 'physics' | 'gameplay' | 'visuals' | 'economy' | 'ai',
  label: 'Paddle Push Force',
  description: 'How hard the paddle pushes',
  display: true,  // Show in HUD
},
```

## rules: GameRule[]

```typescript
{
  id: string;
  name?: string;
  enabled?: boolean;        // Default: true
  trigger: RuleTrigger;
  conditions?: RuleCondition[];
  actions: RuleAction[];
  fireOnce?: boolean;       // Only fire once then disable
  cooldown?: number;        // Minimum seconds between firings
}
```

## winCondition / loseCondition

```typescript
// Win: expression that evaluates to true
winCondition: { expr: "entityCount('brick') == 0" }

// Lose types:
{ type: 'entity_destroyed', tag: 'bird' }
{ type: 'entity_exits_screen', tag: 'ball' }
{ type: 'time_up', time: 60 }
{ type: 'custom', expr: 'lives <= 0' }
```

## joints: GameJoint[]

```typescript
// Revolute (hinge)
{ type: 'revolute', id: string, entityA: string, entityB: string,
  anchor: Vec2, enableLimit?: boolean, lowerAngle?: number, upperAngle?: number,
  enableMotor?: boolean, motorSpeed?: number, maxMotorTorque?: number }

// Distance (spring)
{ type: 'distance', id: string, entityA: string, entityB: string,
  anchorA: Vec2, anchorB: Vec2, length?: number, stiffness?: number, damping?: number }

// Weld (rigid)
{ type: 'weld', id: string, entityA: string, entityB: string,
  anchor: Vec2, stiffness?: number, damping?: number }

// Prismatic (slider)
{ type: 'prismatic', id: string, entityA: string, entityB: string,
  anchor: Vec2, axis: Vec2, enableLimit?: boolean, lowerTranslation?: number,
  upperTranslation?: number, enableMotor?: boolean }
```

## presentation: PresentationConfig

```typescript
{
  aspectRatio?: { width: number, height: number } | number;
  fit?: 'contain' | 'cover';
  letterboxColor?: string;
  orientation?: 'portrait' | 'landscape' | 'any';
}
```

## overlay: OverlayConfig

The overlay system provides a declarative HUD for displaying game state. It replaces the old UIConfig system.

```typescript
overlay?: {
  elements: OverlayElement[];
  theme?: OverlayTheme;
}
```

### Element Types

**Text** — Display text with bindings to game state:
```typescript
{
  id: string;
  type: 'text';
  anchor: OverlayAnchor;  // 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  offset: { x: number; y: number };  // Pixels inward from anchor
  fontSize?: number;       // Default: 16
  fontWeight?: 'normal' | 'bold';
  color?: string;          // Default: '#FFFFFF'
  bindings: { text: string };  // Template: "SCORE\n{{variables.score}}"
  visibleWhen?: string;    // Expression: "variables.multiplier != 1"
  style?: OverlayStyle;
}
```

**Bar** — Health bar, progress bar:
```typescript
{
  id: string;
  type: 'bar';
  anchor: OverlayAnchor;
  offset: { x: number; y: number };
  width?: number;          // Default: 100
  height?: number;         // Default: 12
  color?: string;          // Fill color
  backgroundColor?: string; // Track color
  bindings: { value: string; max: string };  // "variables.health", "variables.maxHealth"
  showLabel?: boolean;
  labelFormat?: string;    // "{value}/{max}" or "{percent}%"
}
```

**Counter** — Icon + number (lives, coins):
```typescript
{
  id: string;
  type: 'counter';
  anchor: OverlayAnchor;
  offset: { x: number; y: number };
  iconEmoji?: string;      // "❤️", "🪙"
  fontSize?: number;
  color?: string;
  bindings: { value: string };  // "variables.lives"
}
```

**Button** — Interactive button that emits game events:
```typescript
{
  id: string;
  type: 'button';
  anchor: OverlayAnchor;
  offset: { x: number; y: number };
  label: string;
  eventName: string;       // Emits this game event on press
  eventData?: Record<string, unknown>;
  color?: string;
  textColor?: string;
  disabledWhen?: string;   // Expression
}
```

**Container** — Group elements with layout:
```typescript
{
  id: string;
  type: 'container';
  anchor: OverlayAnchor;
  offset: { x: number; y: number };
  direction?: 'horizontal' | 'vertical';
  gap?: number;
  children: OverlayElement[];
}
```

**Image** and **Spacer** — For visual elements and layout spacing.

### Binding Expressions

Bindings connect elements to live game state:
- `{{variables.score}}` — Game variable value
- `{{entityCount('brick')}}` — Count entities with tag
- `{{formatTime(elapsed)}}` — Format elapsed time as "M:SS"
- `{{formatNumber(1234)}}` — Format with commas: "1,234"

### Anchoring

Elements are positioned relative to screen edges. Offsets are always **inward** from the anchor:
- `anchor: 'top-left', offset: { x: 16, y: 16 }` → 16px from top-left corner
- `anchor: 'top-right', offset: { x: 16, y: 16 }` → 16px from top-right corner

Stack multiple elements at the same anchor by incrementing Y offset by 56px.

### OverlayStyle

```typescript
style?: {
  backgroundColor?: string;  // e.g., 'rgba(0,0,0,0.6)'
  borderRadius?: number;
  borderColor?: string;
  borderWidth?: number;
  padding?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  opacity?: number;
}
```

### Theme

```typescript
theme?: {
  fontPreset?: 'system' | 'pixel' | 'retro' | 'handwritten' | 'monospace';
  pixelMode?: boolean;
  primaryColor?: string;
  textColor?: string;
  backgroundColor?: string;
  fontSize?: number;
}
```

## input: InputConfig

```typescript
{
  tapZones?: Array<{
    id: string, edge: 'left' | 'right' | 'top' | 'bottom',
    size: number, button: 'left' | 'right' | 'up' | 'down' | 'jump' | 'action',
    debugColor?: string
  }>;
  debugTapZones?: boolean;
  debugInputs?: boolean;
  virtualButtons?: Array<{
    id: string, button: 'jump' | 'action', label?: string,
    size?: number, color?: string, activeColor?: string
  }>;
  virtualJoystick?: { id: string, size?: number, knobSize?: number, deadZone?: number };
  virtualDPad?: { id: string, size?: number, buttonSize?: number, showDiagonals?: boolean };
  enableHaptics?: boolean;
  tilt?: { enabled: boolean, sensitivity?: number, updateInterval?: number };
}
```

## dialogs: GameDialogsConfig

```typescript
{
  activeDialogVariable?: string;    // Variable name that controls which dialog shows
  dialogs: Array<{
    id: string;
    title: string;
    message?: string;
    stats?: Array<{
      label: string,
      variable: string,
      format?: string,
      binding?: string    // Support for binding expressions like "{{variables.score}}"
    }>;
    dismissible?: boolean;
    dismissEventName?: string;
    showOnState?: 'ready' | 'won' | 'lost' | 'paused'; // Auto-show on game state
    showWhen?: string;                                // Expression to auto-show
    style?: {                                         // Custom dialog styling
      backgroundColor?: string;
      textColor?: string;
      borderRadius?: number;
      padding?: number;
    };
    buttons: Array<{
      label: string,
      eventName: string,
      data?: Record<string, unknown>,
      variant?: 'primary' | 'secondary'
    }>;
  }>;
  legacyWinDialogFallback?: boolean;
}
```

## containers: ContainerConfig[]

### Stack Container
```typescript
{
  id: string, type: "stack",
  capacity: number,
  layout: {
    direction: 'vertical' | 'horizontal',
    spacing: number,
    basePosition: Vec2,
    anchor?: 'center' | 'bottom' | 'top' | 'left' | 'right'
  }
}
```

### Grid Container
```typescript
{
  id: string, type: "grid",
  rows: number, cols: number, cellSize: number,
  origin: Vec2,
  originAnchor?: 'top-left' | 'center' | ...,
  matchTagPattern?: string,
  minMatch?: number
}
```

### Slots Container
```typescript
{
  id: string, type: "slots",
  count: number,
  layout: { direction: 'vertical' | 'horizontal', spacing: number, basePosition: Vec2 },
  allowEmpty?: boolean
}
```

## stateMachines: StateMachineDefinition[]

```typescript
{
  id: string;
  owner?: string;                // Entity ID (game-level if omitted)
  stateVar?: string;             // Variable name (defaults to "sm.{id}")
  initialState: string;
  states: Array<{
    id: string;
    onEnter?: RuleAction[];
    onExit?: RuleAction[];
    onUpdate?: RuleAction[];
    timeout?: number;
    timeoutTransition?: string;
  }>;
  transitions: Array<{
    id: string;
    from: string | string[] | '*';
    to: string;
    trigger: { type: 'event', eventName: string }
           | { type: 'condition', condition: RuleCondition }
           | { type: 'manual' };
    conditions?: RuleCondition[];
    actions?: RuleAction[];
  }>;
}
```

## persistence: PersistenceConfig

```typescript
{
  storageKey?: string;              // Defaults to metadata.id
  schema: z.ZodType<T>;            // Zod validation schema
  defaultProgress: T;
  version: number;
  autoSave?: {
    onLevelComplete?: boolean;
    onGameWin?: boolean;
    onGameLose?: boolean;
    interval?: number;              // ms, 0 to disable
    onBackground?: boolean;
  };
}
```

Pre-built schemas: `HighScoreProgressSchema`, `LevelProgressSchema`, `UnlockProgressSchema`, `BallSortProgressSchema`, `FlappyBirdProgressSchema` (from `@slopcade/shared`).

## sounds: Record<string, SoundAsset>

```typescript
{
  url: string;
  type: 'sfx' | 'music';
  loop?: boolean;
  defaultVolume?: number;
}
```

## constants: Record<string, number | string | boolean>

Compile-time constants resolved via `{ const: "NAME" }` syntax in the bundle.
