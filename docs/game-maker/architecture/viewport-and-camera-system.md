# Viewport & Camera System Architecture

> **Status**: 85% Implemented  
> **Created**: 2026-01-22  
> **Updated**: 2026-01-22  
> **Purpose**: Define the aspect ratio, viewport fitting, and camera system for consistent cross-platform gameplay

---

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| ViewportSystem class | ✅ Done | `app/lib/game-engine/ViewportSystem.ts` |
| ViewportContext | ✅ Done | `app/lib/game-engine/ViewportContext.tsx` |
| Letterboxing layout | ✅ Done | View-based in GameRuntime |
| Input transformation | ✅ Done | `useGameInput` with viewportSystemRef |
| `presentation` schema | ✅ Done | Both shared and API schemas |
| Camera: fixed | ✅ Done | Static camera |
| Camera: follow | ✅ Done | With dead zones, look-ahead |
| Camera: follow-x/y | ✅ Done | Axis-locked following |
| Camera: auto-scroll | ✅ Done | With acceleration |
| Camera: manual | ❌ Pending | Pan/zoom with inertia |
| Camera: region | ❌ Pending | Per-area configs |
| Platform snapping | ❌ Pending | For platformers |
| AI prompt updates | ❌ Pending | Teach AI about cameras |

---

## Executive Summary

This document defines the architecture for:
1. **Fixed Aspect Ratio Viewport** - Ensuring consistent physics and gameplay across all devices
2. **Camera System** - Comprehensive 2D camera behaviors for various game types
3. **Coordinate Spaces** - Clear separation between world, viewport, and screen coordinates

**Key Principle**: Games are authored in a fixed "design viewport" (default 9:16 portrait). The engine fits this viewport into any screen using letterboxing/pillarboxing, ensuring physics tuning and gameplay feel identical everywhere.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Design Goals](#2-design-goals)
3. [Coordinate Spaces](#3-coordinate-spaces)
4. [Viewport System](#4-viewport-system)
5. [Camera System](#5-camera-system)
6. [Schema Changes](#6-schema-changes)
7. [Implementation Plan](#7-implementation-plan)
8. [Migration Guide](#8-migration-guide)

---

## 1. Problem Statement

### Current Issues

1. **Inconsistent Physics Feel**: Different screen sizes show different amounts of the world, making physics feel different across devices
2. **No Aspect Ratio Enforcement**: Canvas fills available space (`flex: 1`), causing layout variance
3. **Limited Camera System**: Basic follow camera exists but lacks dead zones, look-ahead, and game-type-specific behaviors
4. **Mixed Coordinate Spaces**: HUD elements and game entities don't have clear coordinate space separation

### Requirements

| Requirement | Priority | Description |
|-------------|----------|-------------|
| Fixed aspect ratio | P0 | Physics must feel identical on all devices |
| Letterboxing | P0 | Fit fixed-ratio world into any screen |
| World vs Screen space | P0 | Clear separation for entities vs HUD |
| Camera types | P0 | Fixed, follow, auto-scroll at minimum |
| Backward compatible | P0 | Existing games must continue working |
| Portrait-first | P1 | Focus on 9:16, support landscape later |
| Camera features | P1 | Dead zones, smoothing, bounds, shake |
| Touch input mapping | P1 | Correct coordinate transformation with letterboxing |

---

## 2. Design Goals

### 2.1 Consistency Across Devices

```
┌─────────────────────────────────────────────────────────────┐
│  iPhone 15 Pro Max (19.5:9)    │  iPad (4:3)    │  Web      │
│  ┌─────────────────────────┐   │  ┌─────────┐   │  ┌─────┐  │
│  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│   │  │▓│     │▓│   │  │▓│   │▓│ │
│  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│   │  │▓│GAME │▓│   │  │▓│GAM│▓│ │
│  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│   │  │▓│     │▓│   │  │▓│   │▓│ │
│  │▓▓▓▓▓▓GAME▓▓▓▓▓▓▓▓▓▓▓▓▓│   │  │▓│     │▓│   │  │▓│   │▓│ │
│  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│   │  │▓│     │▓│   │  │▓│   │▓│ │
│  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│   │  │▓│     │▓│   │  │▓│   │▓│ │
│  └─────────────────────────┘   │  └─────────┘   │  └─────┘  │
│  Letterbox (top/bottom bars)   │  Pillarbox    │  Pillarbox │
└─────────────────────────────────────────────────────────────┘
```

All three devices show **exactly the same 9 meters wide × 16 meters tall** game world.

### 2.2 Clear Coordinate Pipeline

```
World (meters)
     │
     ▼ Camera Transform (position, zoom)
Viewport (pixels, local to game frame)
     │
     ▼ Viewport Offset (letterbox position)
Screen (pixels, device coordinates)
```

### 2.3 Separation of Concerns

| Layer | Coordinate Space | Examples |
|-------|------------------|----------|
| Game Entities | World (meters) | Player, obstacles, physics bodies |
| Viewport HUD | Viewport (pixels) | Score, timer, game-frame-aligned UI |
| Screen HUD | Screen (pixels) | System menus, toasts, dev tools |

---

## 3. Coordinate Spaces

### 3.1 World Space (Meters)

- **Unit**: Meters (physics units)
- **Origin**: Top-left of world bounds (0, 0)
- **Y-axis**: Positive downward (matches screen convention)
- **Used by**: Entity positions, physics bodies, game logic

```typescript
interface WorldPosition {
  x: number; // meters from left
  y: number; // meters from top
}
```

### 3.2 Viewport Space (Pixels, Local)

- **Unit**: Pixels within the game viewport
- **Origin**: Top-left of the game canvas (0, 0)
- **Size**: Determined by viewport fitting (e.g., 450×800 pixels)
- **Used by**: Viewport-relative HUD, touch input (after offset)

```typescript
interface ViewportPosition {
  x: number; // pixels from viewport left
  y: number; // pixels from viewport top
}
```

### 3.3 Screen Space (Pixels, Global)

- **Unit**: Device pixels
- **Origin**: Top-left of screen (0, 0)
- **Size**: Full device screen (e.g., 430×932 for iPhone 15 Pro)
- **Used by**: Screen-relative HUD, raw touch events

```typescript
interface ScreenPosition {
  x: number; // pixels from screen left
  y: number; // pixels from screen top
}
```

### 3.4 Coordinate Transformations

```typescript
// World → Viewport
function worldToViewport(world: WorldPosition, camera: CameraState): ViewportPosition {
  const centered = {
    x: world.x - camera.position.x,
    y: world.y - camera.position.y,
  };
  return {
    x: centered.x * camera.pixelsPerMeter * camera.zoom + viewport.width / 2,
    y: centered.y * camera.pixelsPerMeter * camera.zoom + viewport.height / 2,
  };
}

// Viewport → Screen
function viewportToScreen(viewport: ViewportPosition, viewportRect: ViewportRect): ScreenPosition {
  return {
    x: viewport.x + viewportRect.x,
    y: viewport.y + viewportRect.y,
  };
}

// Screen → World (for input)
function screenToWorld(screen: ScreenPosition, viewportRect: ViewportRect, camera: CameraState): WorldPosition | null {
  // Check if touch is within viewport
  if (!isInsideViewport(screen, viewportRect)) return null;
  
  const viewport = {
    x: screen.x - viewportRect.x,
    y: screen.y - viewportRect.y,
  };
  
  const centered = {
    x: viewport.x - viewportRect.width / 2,
    y: viewport.y - viewportRect.height / 2,
  };
  
  return {
    x: centered.x / (camera.pixelsPerMeter * camera.zoom) + camera.position.x,
    y: centered.y / (camera.pixelsPerMeter * camera.zoom) + camera.position.y,
  };
}
```

---

## 4. Viewport System

### 4.1 Design Viewport

The **design viewport** is the fixed aspect ratio that games are authored for.

| Property | Default | Description |
|----------|---------|-------------|
| `aspectRatio` | 9:16 | Width:Height ratio |
| `designWidth` | 9 | Visible world width in meters |
| `designHeight` | 16 | Visible world height in meters |

**Why 9:16?**
- Standard portrait ratio (inverse of 16:9)
- Familiar to users (Instagram stories, TikTok)
- Predictable letterboxing on most devices
- Easy mental model for game designers

### 4.2 Viewport Fitting Algorithm

```typescript
interface ViewportRect {
  x: number;      // Offset from screen left (letterbox)
  y: number;      // Offset from screen top (letterbox)
  width: number;  // Viewport width in pixels
  height: number; // Viewport height in pixels
  scale: number;  // Pixels per meter (computed)
}

function computeViewportRect(
  screenWidth: number,
  screenHeight: number,
  designAspectRatio: number, // width / height (e.g., 9/16 = 0.5625)
  designWorldHeight: number  // meters (e.g., 16)
): ViewportRect {
  const screenAspectRatio = screenWidth / screenHeight;
  
  let viewportWidth: number;
  let viewportHeight: number;
  
  if (screenAspectRatio > designAspectRatio) {
    // Screen is wider than design → pillarbox (bars on sides)
    viewportHeight = screenHeight;
    viewportWidth = screenHeight * designAspectRatio;
  } else {
    // Screen is taller than design → letterbox (bars on top/bottom)
    viewportWidth = screenWidth;
    viewportHeight = screenWidth / designAspectRatio;
  }
  
  return {
    x: (screenWidth - viewportWidth) / 2,
    y: (screenHeight - viewportHeight) / 2,
    width: viewportWidth,
    height: viewportHeight,
    scale: viewportHeight / designWorldHeight, // pixels per meter
  };
}
```

### 4.3 Letterbox Rendering

```
┌────────────────────────────────────────┐
│            LETTERBOX BAR               │ ← Screen-relative (black/themed)
├────────────────────────────────────────┤
│                                        │
│         ┌──────────────────┐           │
│         │                  │           │
│         │   GAME CANVAS    │           │ ← Viewport-relative
│         │                  │           │
│         │                  │           │
│         └──────────────────┘           │
│                                        │
├────────────────────────────────────────┤
│            LETTERBOX BAR               │
└────────────────────────────────────────┘
```

**Implementation**: Use React Native Views for layout, not Canvas clipping.

```tsx
function GameContainer({ children, designAspectRatio }) {
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });
  const viewportRect = useMemo(
    () => computeViewportRect(screenSize.width, screenSize.height, designAspectRatio, 16),
    [screenSize, designAspectRatio]
  );
  
  return (
    <View style={styles.screen} onLayout={handleLayout}>
      {/* Letterbox background */}
      <View style={[styles.letterbox, { backgroundColor: '#000' }]} />
      
      {/* Game viewport */}
      <View style={[styles.viewport, {
        left: viewportRect.x,
        top: viewportRect.y,
        width: viewportRect.width,
        height: viewportRect.height,
      }]}>
        {children}
      </View>
    </View>
  );
}
```

### 4.4 ViewportContext

Provide viewport information to all game components:

```typescript
interface ViewportContextValue {
  // Screen dimensions
  screenSize: { width: number; height: number };
  
  // Computed viewport rect
  viewportRect: ViewportRect;
  
  // Design parameters
  designAspectRatio: number;
  designWorldSize: { width: number; height: number };
  
  // Computed scale
  pixelsPerMeter: number;
  
  // Coordinate transforms
  screenToWorld: (screen: ScreenPosition) => WorldPosition | null;
  worldToScreen: (world: WorldPosition) => ScreenPosition;
  worldToViewport: (world: WorldPosition) => ViewportPosition;
}
```

---

## 5. Camera System

### 5.1 Camera Types

| Type | Description | Use Cases |
|------|-------------|-----------|
| `fixed` | Static camera, no movement | Puzzle games, single-screen games |
| `follow` | Tracks a target entity | Platformers, action games |
| `follow-x` | Tracks target horizontally only | Side-scrollers |
| `follow-y` | Tracks target vertically only | Vertical climbers |
| `auto-scroll` | Moves automatically | Endless runners, rail shooters |
| `manual` | Player-controlled pan/zoom | Sandbox, strategy games |
| `region` | Behavior changes per region | Metroidvania, multi-room games |

### 5.2 Camera Configuration Schema

```typescript
interface CameraConfig {
  // Camera type
  type: 'fixed' | 'follow' | 'follow-x' | 'follow-y' | 'auto-scroll' | 'manual' | 'region';
  
  // Initial position (world coordinates)
  position?: Vec2;
  
  // Zoom level (1.0 = design viewport, 2.0 = 2x zoom in)
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  
  // Follow settings
  followTarget?: string;           // Entity ID to follow
  followSmoothing?: number;        // 0-1, higher = snappier (default: 0.1)
  followOffset?: Vec2;             // Static offset from target
  
  // Dead zone (camera-window)
  deadZone?: {
    width: number;   // meters
    height: number;  // meters
  };
  
  // Look-ahead
  lookAhead?: {
    enabled: boolean;
    distance: number;      // meters ahead
    smoothing: number;     // 0-1
    mode: 'velocity' | 'facing' | 'input';
  };
  
  // Bounds (camera cannot show outside these)
  bounds?: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  
  // Auto-scroll settings
  autoScroll?: {
    direction: Vec2;       // Normalized direction
    speed: number;         // meters per second
    acceleration?: number; // speed increase per second
  };
  
  // Manual control settings
  manualControl?: {
    panEnabled: boolean;
    zoomEnabled: boolean;
    panInertia: number;    // 0-1, friction for momentum
    panSpeed: number;      // Sensitivity multiplier
  };
  
  // Platform snapping (for platformers)
  platformSnap?: {
    enabled: boolean;
    snapOnLanding: boolean;
    snapSpeed: number;
  };
  
  // Effects
  shake?: {
    trauma: number;        // 0-1, current shake intensity
    decay: number;         // How fast trauma decays
    maxOffset: number;     // Max displacement in meters
    maxRotation?: number;  // Max rotation in radians
  };
}
```

### 5.3 Camera Behaviors by Game Type

#### Platformer Camera
```json
{
  "type": "follow",
  "followTarget": "player",
  "followSmoothing": 0.08,
  "deadZone": { "width": 2, "height": 3 },
  "lookAhead": {
    "enabled": true,
    "distance": 2,
    "smoothing": 0.05,
    "mode": "velocity"
  },
  "platformSnap": {
    "enabled": true,
    "snapOnLanding": true,
    "snapSpeed": 0.15
  },
  "bounds": { "minX": 0, "maxX": 100, "minY": 0, "maxY": 20 }
}
```

#### Endless Runner Camera
```json
{
  "type": "auto-scroll",
  "autoScroll": {
    "direction": { "x": 1, "y": 0 },
    "speed": 5,
    "acceleration": 0.1
  },
  "zoom": 1.2
}
```

#### Puzzle Game Camera
```json
{
  "type": "fixed",
  "position": { "x": 4.5, "y": 8 },
  "zoom": 1
}
```

#### Physics Sandbox Camera
```json
{
  "type": "manual",
  "manualControl": {
    "panEnabled": true,
    "zoomEnabled": true,
    "panInertia": 0.92,
    "panSpeed": 1.5
  },
  "minZoom": 0.5,
  "maxZoom": 3,
  "bounds": { "minX": -10, "maxX": 30, "minY": -5, "maxY": 25 }
}
```

### 5.4 Camera System Implementation

```typescript
class CameraSystem {
  private config: CameraConfig;
  private state: CameraState;
  private viewport: ViewportRect;
  
  constructor(config: CameraConfig, viewport: ViewportRect) {
    this.config = config;
    this.viewport = viewport;
    this.state = {
      position: config.position ?? { x: 0, y: 0 },
      zoom: config.zoom ?? 1,
      trauma: 0,
      velocity: { x: 0, y: 0 },
    };
  }
  
  update(dt: number, context: CameraUpdateContext): void {
    switch (this.config.type) {
      case 'fixed':
        // No update needed
        break;
      case 'follow':
      case 'follow-x':
      case 'follow-y':
        this.updateFollow(dt, context);
        break;
      case 'auto-scroll':
        this.updateAutoScroll(dt);
        break;
      case 'manual':
        this.updateManual(dt, context);
        break;
    }
    
    this.applyBounds();
    this.updateShake(dt);
  }
  
  private updateFollow(dt: number, context: CameraUpdateContext): void {
    const target = context.getEntity(this.config.followTarget);
    if (!target) return;
    
    let targetPos = { ...target.transform };
    
    // Apply look-ahead
    if (this.config.lookAhead?.enabled) {
      const lookAhead = this.computeLookAhead(target, context);
      targetPos.x += lookAhead.x;
      targetPos.y += lookAhead.y;
    }
    
    // Apply follow offset
    if (this.config.followOffset) {
      targetPos.x += this.config.followOffset.x;
      targetPos.y += this.config.followOffset.y;
    }
    
    // Apply dead zone
    if (this.config.deadZone) {
      targetPos = this.applyDeadZone(targetPos);
    }
    
    // Smooth follow
    const smoothing = this.config.followSmoothing ?? 0.1;
    
    if (this.config.type === 'follow-x') {
      this.state.position.x = lerp(this.state.position.x, targetPos.x, smoothing);
    } else if (this.config.type === 'follow-y') {
      this.state.position.y = lerp(this.state.position.y, targetPos.y, smoothing);
    } else {
      this.state.position.x = lerp(this.state.position.x, targetPos.x, smoothing);
      this.state.position.y = lerp(this.state.position.y, targetPos.y, smoothing);
    }
  }
  
  private applyDeadZone(targetPos: Vec2): Vec2 {
    const dz = this.config.deadZone!;
    const halfW = dz.width / 2;
    const halfH = dz.height / 2;
    
    const result = { ...this.state.position };
    
    // Only move camera if target is outside dead zone
    if (targetPos.x < this.state.position.x - halfW) {
      result.x = targetPos.x + halfW;
    } else if (targetPos.x > this.state.position.x + halfW) {
      result.x = targetPos.x - halfW;
    }
    
    if (targetPos.y < this.state.position.y - halfH) {
      result.y = targetPos.y + halfH;
    } else if (targetPos.y > this.state.position.y + halfH) {
      result.y = targetPos.y - halfH;
    }
    
    return result;
  }
  
  shake(intensity: number): void {
    this.state.trauma = Math.min(1, this.state.trauma + intensity);
  }
  
  getTransform(): CameraTransform {
    const shakeOffset = this.computeShakeOffset();
    
    return {
      position: {
        x: this.state.position.x + shakeOffset.x,
        y: this.state.position.y + shakeOffset.y,
      },
      zoom: this.state.zoom,
      rotation: shakeOffset.rotation,
    };
  }
}
```

### 5.5 Camera Shake (Trauma-Based)

Professional camera shake uses a "trauma" system:

```typescript
private updateShake(dt: number): void {
  if (this.state.trauma <= 0) return;
  
  const decay = this.config.shake?.decay ?? 1;
  this.state.trauma = Math.max(0, this.state.trauma - decay * dt);
}

private computeShakeOffset(): { x: number; y: number; rotation: number } {
  if (this.state.trauma <= 0) return { x: 0, y: 0, rotation: 0 };
  
  const shake = this.config.shake ?? { maxOffset: 0.5, maxRotation: 0.05 };
  const intensity = this.state.trauma * this.state.trauma; // Quadratic falloff
  
  // Use Perlin noise or simplex noise for smooth shake
  // For simplicity, using random here
  const seed = Date.now();
  return {
    x: (noise(seed) * 2 - 1) * shake.maxOffset * intensity,
    y: (noise(seed + 1) * 2 - 1) * shake.maxOffset * intensity,
    rotation: (noise(seed + 2) * 2 - 1) * (shake.maxRotation ?? 0) * intensity,
  };
}
```

---

## 6. Schema Changes

### 6.1 New `presentation` Block

Add to `GameDefinitionSchema`:

```typescript
export const PresentationConfigSchema = z.object({
  // Aspect ratio (width:height)
  aspectRatio: z.union([
    z.object({ width: z.number().positive(), height: z.number().positive() }),
    z.number().positive(), // width/height as single number
  ]).optional(),
  
  // Fitting mode
  fit: z.enum(['contain', 'cover']).default('contain'),
  
  // Letterbox styling
  letterboxColor: z.string().optional(), // Default: #000000
  
  // Orientation lock
  orientation: z.enum(['portrait', 'landscape', 'any']).optional(),
});
```

### 6.2 Enhanced `camera` Block

Replace existing `CameraConfigSchema`:

```typescript
export const CameraConfigSchema = z.object({
  // Camera type
  type: z.enum(['fixed', 'follow', 'follow-x', 'follow-y', 'auto-scroll', 'manual', 'region']),
  
  // Position and zoom
  position: Vec2Schema.optional(),
  zoom: z.number().positive().optional(),
  minZoom: z.number().positive().optional(),
  maxZoom: z.number().positive().optional(),
  
  // Follow settings
  followTarget: z.string().optional(),
  followSmoothing: z.number().min(0).max(1).optional(),
  followOffset: Vec2Schema.optional(),
  
  // Dead zone
  deadZone: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }).optional(),
  
  // Look-ahead
  lookAhead: z.object({
    enabled: z.boolean(),
    distance: z.number().positive(),
    smoothing: z.number().min(0).max(1).optional(),
    mode: z.enum(['velocity', 'facing', 'input']).optional(),
  }).optional(),
  
  // Bounds
  bounds: BoundsSchema.optional(),
  
  // Auto-scroll
  autoScroll: z.object({
    direction: Vec2Schema,
    speed: z.number().positive(),
    acceleration: z.number().optional(),
  }).optional(),
  
  // Manual control
  manualControl: z.object({
    panEnabled: z.boolean().optional(),
    zoomEnabled: z.boolean().optional(),
    panInertia: z.number().min(0).max(1).optional(),
    panSpeed: z.number().positive().optional(),
  }).optional(),
  
  // Platform snapping
  platformSnap: z.object({
    enabled: z.boolean(),
    snapOnLanding: z.boolean().optional(),
    snapSpeed: z.number().min(0).max(1).optional(),
  }).optional(),
  
  // Shake defaults
  shake: z.object({
    decay: z.number().positive().optional(),
    maxOffset: z.number().positive().optional(),
    maxRotation: z.number().optional(),
  }).optional(),
});
```

### 6.3 Updated `GameDefinitionSchema`

```typescript
export const GameDefinitionSchema = z.object({
  metadata: GameMetadataSchema,
  world: WorldConfigSchema,
  presentation: PresentationConfigSchema.optional(), // NEW
  camera: CameraConfigSchema.optional(),             // ENHANCED
  ui: UIConfigSchema.optional(),
  // ... rest unchanged
});
```

### 6.4 Backward Compatibility

Default resolution order for aspect ratio:
1. `presentation.aspectRatio` (if provided)
2. `world.bounds.width / world.bounds.height` (existing games)
3. Global default `9/16` (new games without bounds)

```typescript
function resolveAspectRatio(definition: GameDefinition): number {
  // 1. Explicit presentation config
  if (definition.presentation?.aspectRatio) {
    const ar = definition.presentation.aspectRatio;
    return typeof ar === 'number' ? ar : ar.width / ar.height;
  }
  
  // 2. Derive from world bounds
  if (definition.world.bounds) {
    return definition.world.bounds.width / definition.world.bounds.height;
  }
  
  // 3. Default to 9:16 portrait
  return 9 / 16;
}
```

---

## 7. Implementation Plan

### Phase 1: Viewport System (MVP) ✅ COMPLETE

**Goal**: Fixed aspect ratio with letterboxing

| Task | Status | Description |
|------|--------|-------------|
| Create `ViewportSystem` class | ✅ Done | `app/lib/game-engine/ViewportSystem.ts` |
| Create `ViewportContext` | ✅ Done | `app/lib/game-engine/ViewportContext.tsx` |
| Update `GameRuntime` layout | ✅ Done | View-based letterboxing in `GameRuntime.native.tsx` |
| Update input handling | ✅ Done | `useGameInput` with `viewportSystemRef` |
| Add `presentation` schema | ✅ Done | Both `shared/src/types/schemas.ts` and `api/src/ai/schemas.ts` |
| Update existing games | ✅ Done | Backward compatible via aspect ratio resolution |

**Deliverable**: ✅ Games render at fixed aspect ratio with letterboxing on all devices.

### Phase 2: Camera System Enhancement ✅ 90% COMPLETE

**Goal**: Full camera type support

| Task | Status | Description |
|------|--------|-------------|
| Refactor `CameraSystem` | ✅ Done | `app/lib/game-engine/CameraSystem.ts` with factory method |
| Implement dead zones | ✅ Done | Camera-window behavior |
| Implement look-ahead | ✅ Done | Velocity-based offset |
| Implement auto-scroll | ✅ Done | With acceleration support |
| Implement manual control | ❌ Pending | Pan/zoom with inertia (POST-MVP) |
| Add camera shake | ✅ Done | Trauma-based shake system (pre-existing) |
| Update schema | ✅ Done | Enhanced `CameraConfigSchema` |

**Deliverable**: Core camera types working (fixed, follow, follow-x, follow-y, auto-scroll).

### Phase 3: Polish & Integration ⏳ PENDING

**Goal**: Production-ready system

| Task | Status | Description |
|------|--------|-------------|
| Platform snapping | ❌ Pending | For platformer cameras |
| Region-based cameras | ❌ Pending | Different config per area (POST-MVP) |
| Camera transitions | ❌ Pending | Smooth config changes |
| AI prompt updates | ❌ Pending | Teach AI about camera types |
| Documentation | ✅ Done | This document updated |
| Test games | ❌ Pending | Create test games for each camera type |

**Deliverable**: Complete, documented camera system.

### Remaining Work

| Task | Effort | Priority |
|------|--------|----------|
| Platform snapping | 2h | Medium |
| AI prompt updates | 2h | Medium |
| Test games | 2h | Low |
| Manual camera | 2h | Low (POST-MVP) |
| Region cameras | 3h | Low (POST-MVP) |

### Total: ~85% Complete

---

## 8. Migration Guide

### Existing Games

Existing games will continue to work without changes:

```json
// Before (still works)
{
  "world": {
    "bounds": { "width": 20, "height": 12 }
  },
  "camera": { "type": "fixed", "zoom": 1 }
}

// After (equivalent explicit config)
{
  "world": {
    "bounds": { "width": 20, "height": 12 }
  },
  "presentation": {
    "aspectRatio": { "width": 20, "height": 12 }
  },
  "camera": { "type": "fixed", "zoom": 1 }
}
```

### New Games

New games should use the explicit presentation config:

```json
{
  "world": {
    "gravity": { "x": 0, "y": 9.8 },
    "bounds": { "width": 9, "height": 16 }
  },
  "presentation": {
    "aspectRatio": { "width": 9, "height": 16 },
    "fit": "contain",
    "letterboxColor": "#1a1a2e"
  },
  "camera": {
    "type": "follow",
    "followTarget": "player",
    "followSmoothing": 0.1,
    "deadZone": { "width": 2, "height": 3 }
  }
}
```

---

## Appendix A: Common Aspect Ratios

| Ratio | Decimal | Use Case |
|-------|---------|----------|
| 9:16 | 0.5625 | Portrait mobile (default) |
| 3:4 | 0.75 | Portrait tablet |
| 16:9 | 1.778 | Landscape standard |
| 4:3 | 1.333 | Landscape tablet |
| 1:1 | 1.0 | Square (Instagram) |

## Appendix B: Camera Type Quick Reference

| Game Type | Recommended Camera | Key Settings |
|-----------|-------------------|--------------|
| Puzzle | `fixed` | Center on play area |
| Platformer | `follow` | Dead zone, look-ahead, platform snap |
| Endless Runner | `auto-scroll` | Direction, speed, acceleration |
| Top-Down | `follow` | Centered, velocity look-ahead |
| Sandbox | `manual` | Pan, zoom, inertia, bounds |
| Metroidvania | `region` | Per-room camera configs |

## Appendix C: References

- [Scroll Back: Camera Design in Side-Scrollers](https://gamedeveloper.com/design/scroll-back-the-theory-and-practice-of-cameras-in-side-scrollers) - Itay Keren
- [Phaser Camera Documentation](https://docs.phaser.io/phaser/concepts/cameras)
- [Godot Camera2D](https://docs.godotengine.org/en/stable/classes/class_camera2d.html)
- [Unity Cinemachine](https://docs.unity3d.com/Packages/com.unity.cinemachine@2.8/manual/)
