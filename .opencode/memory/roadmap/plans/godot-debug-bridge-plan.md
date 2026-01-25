# Godot Debug Bridge — Architectural Plan

> **Status**: Planned  
> **Created**: 2026-01-25  
> **Estimated Effort**: 8-13 hours (Full implementation)  
> **Priority**: High — Enables AI-powered game verification and debugging

## Executive Summary

Build a **JavaScript-injectable debug bridge** (`window.GodotDebugBridge`) that wraps the existing `window.GodotBridge` to enable AI-powered game introspection. The AI (Claude) uses the existing Playwright MCP to call debug methods via `page.evaluate()`, turning the Godot canvas from a "black box" into an inspectable, queryable game state.

## Problem Statement

Today when the AI needs to verify a running game:
1. The canvas is a "black box" — no semantic information available
2. Playwright can take screenshots but can't understand game state
3. AI must use visual inspection (slow, error-prone)
4. No way to programmatically assert game conditions

## Proposed Solution

A thin JavaScript wrapper (`GodotDebugBridge`) that:
1. Exposes structured game state (entities, positions, velocities)
2. Captures annotated screenshots with debug overlays
3. Simulates input (tap, drag) at world coordinates
4. Provides assertion helpers for verification
5. Supports async waiting for game conditions

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                           AI (Claude)                                 │
└────────────────────────────────────┬─────────────────────────────────┘
                                     │ MCP Protocol
┌────────────────────────────────────▼─────────────────────────────────┐
│                     Playwright MCP Server                             │
│  (existing - controls browser, executes JS)                          │
└────────────────────────────────────┬─────────────────────────────────┘
                                     │ page.evaluate()
┌────────────────────────────────────▼─────────────────────────────────┐
│                    window.GodotDebugBridge                            │
│                     (NEW - injected JS library)                       │
├──────────────────────────────────────────────────────────────────────┤
│  High-level API:                                                      │
│  ├─ getSnapshot({ detail: 'low'|'med'|'high' }) → GameSnapshot       │
│  ├─ getEntity(entityId) → EntityDetail                                │
│  ├─ captureScreenshot({ withOverlays?: boolean }) → base64 PNG       │
│  ├─ annotateScreenshot(base64, annotations[]) → base64 PNG           │
│  ├─ simulateTap(x, y) → { hit: entityId | null }                     │
│  ├─ simulateDrag(startX, startY, endX, endY, duration)               │
│  ├─ assert.nearPosition(entityId, {x,y}, epsilon) → AssertResult     │
│  ├─ assert.exists(entityId) → AssertResult                           │
│  ├─ assert.collisionBetween(a, b) → AssertResult                     │
│  └─ waitForCondition(predicate, timeout) → Promise<boolean>          │
└────────────────────────────────────┬─────────────────────────────────┘
                                     │ wraps
┌────────────────────────────────────▼─────────────────────────────────┐
│                    window.GodotBridge (existing)                      │
│                    GameBridge.gd (Godot side)                         │
└──────────────────────────────────────────────────────────────────────┘
```

## Existing Capabilities (Leverage These)

| Feature | Method | Status |
|---------|--------|--------|
| Get all entity transforms | `getAllTransforms()` | ✅ Exists |
| Get all entity properties | `getAllProperties()` | ✅ Exists |
| Point query (hit test) | `queryPoint(x, y)` | ✅ Exists |
| Raycast | `raycast(origin, dir, dist)` | ✅ Exists |
| Show physics shapes | `setDebugShowShapes(true)` | ✅ Exists |
| Send tap input | `sendInput('tap', {x, y})` | ✅ Exists |
| Screenshot | `get_viewport().get_texture()` | ⚠️ Godot-side only |
| Annotated screenshot | — | ❌ Missing |
| AI-friendly snapshot | — | ❌ Missing |
| Assertions | — | ❌ Missing |

## API Design

### 1. `getSnapshot(options)` — Fast State Query

```typescript
interface SnapshotOptions {
  detail: 'low' | 'med' | 'high';
  filterTags?: string[];
  filterTemplate?: string;
}

interface GameSnapshot {
  protocolVersion: string;
  timestamp: number;
  frameId: number;
  world: {
    pixelsPerMeter: number;
    gravity: { x: number; y: number };
    bounds: { width: number; height: number };
  };
  camera: {
    position: { x: number; y: number };
    zoom: number;
  };
  viewport: { width: number; height: number };
  entities: EntitySnapshot[];
  entityCount: number;
}

interface EntitySnapshot {
  id: string;
  template: string;
  position: { x: number; y: number };
  angle: number;
  velocity?: { x: number; y: number };      // 'med' detail
  angularVelocity?: number;                  // 'med' detail
  aabb?: { minX, minY, maxX, maxY };        // 'high' detail
  physics?: {                                // 'high' detail
    bodyType: 'static' | 'dynamic' | 'kinematic';
    isSensor: boolean;
    collisionLayer: number;
    collisionMask: number;
  };
  behaviors?: string[];                      // 'high' detail
  tags?: string[];                           // 'high' detail
}
```

### 2. `captureScreenshot(options)` — Visual Inspection

```typescript
interface ScreenshotOptions {
  withOverlays?: boolean;
  overlayTypes?: ('bounds' | 'labels' | 'velocities' | 'physics')[];
  format?: 'png' | 'jpeg';
  quality?: number;
}

interface ScreenshotResult {
  base64: string;
  width: number;
  height: number;
  timestamp: number;
  frameId: number;
}
```

### 3. `annotateScreenshot(base64, annotations)` — Post-Capture Annotation

```typescript
interface Annotation {
  type: 'rect' | 'circle' | 'line' | 'label' | 'arrow';
  worldPosition?: { x: number; y: number };
  screenPosition?: { x: number; y: number };
  color?: string;
  label?: string;
  width?: number;
  height?: number;
  radius?: number;
  endPosition?: { x: number; y: number };
}

annotateScreenshot(base64: string, annotations: Annotation[]): Promise<string>
```

### 4. `simulateTap(x, y)` / `simulateDrag(...)`

```typescript
simulateTap(x: number, y: number): { 
  hit: string | null;
  worldPos: { x: number; y: number };
  screenPos: { x: number; y: number };
}

simulateDrag(
  startX: number, startY: number,
  endX: number, endY: number,
  durationMs: number
): Promise<void>
```

### 5. `assert.*` — Structured Assertions

```typescript
interface AssertResult {
  passed: boolean;
  message: string;
  expected?: unknown;
  actual?: unknown;
  entityId?: string;
}

const assert = {
  exists(entityId: string): AssertResult,
  nearPosition(entityId: string, pos: {x,y}, epsilon?: number): AssertResult,
  hasVelocity(entityId: string, minMagnitude: number): AssertResult,
  collisionOccurred(entityA: string, entityB: string): AssertResult,
  stateEquals(key: string, value: unknown): AssertResult,
};
```

### 6. `waitForCondition(predicate, timeout)`

```typescript
waitForCondition(
  predicate: () => boolean | Promise<boolean>,
  timeoutMs: number
): Promise<{ success: boolean; elapsedMs: number }>
```

## Implementation Plan

### Phase 1: Core Snapshot & Query (2-3 hours)
- [ ] Create `app/lib/godot/debug/GodotDebugBridge.ts` with TypeScript types
- [ ] Implement `getSnapshot()` wrapping existing `getAllTransforms()` + `getAllProperties()`
- [ ] Implement `getEntity(id)` for targeted queries
- [ ] Add coordinate helpers: `worldToScreen()`, `screenToWorld()`
- [ ] Add debug flag gate (only enabled in dev)

### Phase 2: Screenshot Pipeline (2-3 hours)
- [ ] Add `captureScreenshot()` method to `GameBridge.gd`
- [ ] Implement PNG capture via `get_viewport().get_texture().get_image()`
- [ ] Expose to JS via new bridge method
- [ ] Implement JS-side `annotateScreenshot()` using Canvas 2D

### Phase 3: Input Simulation (1-2 hours)
- [ ] Implement `simulateTap()` wrapping existing `sendInput()`
- [ ] Add `simulateDrag()` with interpolated motion
- [ ] Return hit test results from tap

### Phase 4: Assertions & Waiting (1-2 hours)
- [ ] Implement `assert.*` helper object
- [ ] Implement `waitForCondition()` with polling loop
- [ ] Add collision history tracking for `collisionOccurred`

### Phase 5: Godot Overlays (2-3 hours)
- [ ] Add `DebugOverlay` CanvasLayer in Godot
- [ ] Draw entity bounds, labels, velocity vectors
- [ ] Toggle via `captureScreenshot({ withOverlays: true })`

## File Structure

```
app/lib/godot/
├── GodotBridge.web.ts          # Existing
├── GodotBridge.native.ts       # Existing
├── types.ts                    # Existing
├── debug/                      # NEW
│   ├── GodotDebugBridge.ts     # Main debug API
│   ├── types.ts                # Debug-specific types
│   ├── screenshot.ts           # Screenshot capture & annotation
│   ├── assertions.ts           # Assert helpers
│   └── inject.ts               # Injection helper for Playwright

godot_project/scripts/
├── GameBridge.gd               # Existing (add screenshot method)
└── debug/                      # NEW
    └── DebugOverlay.gd         # Visual overlay layer
```

## Usage Examples

### AI Verifies Ball Reached Goal
```javascript
const snapshot = await window.GodotDebugBridge.getSnapshot({ detail: 'med' });
const ball = snapshot.entities.find(e => e.template === 'ball');
const goal = snapshot.entities.find(e => e.template === 'goal');

const result = window.GodotDebugBridge.assert.nearPosition(
  ball.id, 
  goal.position, 
  1.0
);
console.log(result); // { passed: true, message: "..." }
```

### AI Takes Annotated Screenshot
```javascript
const screenshot = await window.GodotDebugBridge.captureScreenshot({ 
  withOverlays: true,
  overlayTypes: ['bounds', 'labels']
});
// Returns base64 PNG with debug visuals
```

### AI Simulates Gameplay
```javascript
const hitResult = window.GodotDebugBridge.simulateTap(0, 5);

const settled = await window.GodotDebugBridge.waitForCondition(() => {
  const ball = window.GodotDebugBridge.getEntity('ball');
  const speed = Math.sqrt(ball.velocity.x**2 + ball.velocity.y**2);
  return speed < 0.1;
}, 10000);
```

## Security Considerations

1. **Debug flag gate**: Bridge only activates when `?debug=true` or `__DEV__` build
2. **No production exposure**: Strip debug code in production builds
3. **Rate limiting**: Throttle screenshot capture
4. **Token validation**: Optional shared secret for CI/remote debugging

## Future Evolution (Option B - WebSocket MCP)

If we later need event subscriptions, multi-client debugging, or headless operation:

```
[AI] → [Godot Debug MCP Server (stdio)] → [WebSocket] → [Browser Client] → [GodotDebugBridge]
```

The `GodotDebugBridge` API stays the same—only the transport changes.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Payload bloat | Snapshot detail tiers, entity filtering, hard caps |
| ID instability | Enforce stable IDs at GameDefinition layer |
| Coordinate confusion | Always return worldScale, provide helpers |
| Security surface | Debug-only builds, optional token |
| Timing races | `waitForCondition`, `afterPhysicsStep` hooks |

## Decision Record

- **Screenshot capture**: Godot-side (viewport texture) — deterministic, works across browsers
- **Annotation strategy**: Capture raw in Godot, annotate in JS — flexible, no gameplay impact
- **Transport**: Synchronous via Playwright initially — simplest, async-capable API for future

## References

- Oracle consultation session: `ses_40a1c5b64ffen3Q4gqyrmCu5yj`
- Existing bridge: `app/lib/godot/GodotBridge.web.ts`
- Godot bridge: `godot_project/scripts/GameBridge.gd`
