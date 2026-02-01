# GodotBridge Diff Analysis

## Summary
- **Native file**: 1311 lines
- **Web file**: 1262 lines
- **Estimated duplicate code**: ~80-100 lines

## Duplicate Code Identified

### 1. Callback Arrays (Lines 173-183 native, 243-263 web)
```typescript
const collisionCallbacks: ((event: CollisionEvent) => void)[] = [];
const destroyCallbacks: ((entityId: string) => void)[] = [];
const entitySpawnedCallbacks: ((event: EntitySpawnedEvent) => void)[] = [];
const sensorBeginCallbacks: ((event: SensorEvent) => void)[] = [];
const sensorEndCallbacks: ((event: SensorEvent) => void)[] = [];
const inputEventCallbacks: ((type: string, x: number, y: number, entityId: string | null) => void)[] = [];
const uiButtonCallbacks: ((eventType: 'button_down' | 'button_up' | 'button_pressed', buttonId: string) => void)[] = [];
const transformSyncCallbacks: ((transforms: Record<string, EntityTransform>) => void)[] = [];
const propertySyncCallbacks: ((properties: PropertySyncPayload) => void)[] = [];
const scoreCallbacks: ((points: number, entityId: string) => void)[] = [];
```
**Lines**: ~10 lines

### 2. Callback Registration Methods (Lines 969-1031 native, 741-807 web)
```typescript
onCollision(callback: (event: CollisionEvent) => void): () => void {
  collisionCallbacks.push(callback);
  return () => {
    const index = collisionCallbacks.indexOf(callback);
    if (index >= 0) collisionCallbacks.splice(index, 1);
  };
}

onEntityDestroyed(callback: (entityId: string) => void): () => void {
  destroyCallbacks.push(callback);
  return () => {
    const index = destroyCallbacks.indexOf(callback);
    if (index >= 0) destroyCallbacks.splice(index, 1);
  };
}

// ... 8 more similar methods
```
**Lines**: ~60 lines (10 methods × 6 lines each)

### 3. Joint Creation Methods (Lines 688-730 native, 547-610 web)
```typescript
createRevoluteJoint(def: RevoluteJointDef): number {
  // Implementation differs but signature is identical
}

createDistanceJoint(def: DistanceJointDef): number {
  // Implementation differs but signature is identical
}

createPrismaticJoint(def: PrismaticJointDef): number {
  // Implementation differs but signature is identical
}

createWeldJoint(def: WeldJointDef): number {
  // Implementation differs but signature is identical
}
```
**Lines**: ~20 lines (method signatures only, implementations differ)

### 4. Entity ID Generation (Lines 472-476 native, 460-463 web)
```typescript
spawnEntity(templateId: string, x: number, y: number, initialVelocity?: Vec2): string {
  const entityId = `${templateId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  // ... rest differs
}
```
**Lines**: ~2 lines

## Platform-Specific Code (DO NOT UNIFY)

### Native-Specific
1. **Module loading** (lines 53-67): `getGodotModule()`, `react-native-godot` imports
2. **Thread management** (lines 69-149): `runOnGodotThread`, `callGameBridge`, `callGameBridgeAsync`
3. **Event polling** (lines 185-294): `pollAndDispatchEvents()`, interval-based event system
4. **Initialization** (lines 297-379): Platform-specific Godot instance creation
5. **File system** (lines 1049-1139): `expo-file-system` for texture loading

### Web-Specific
1. **Window.GodotBridge interface** (lines 28-240): Global bridge declaration
2. **IFrame detection** (lines 265-273): `getGodotBridge()` with iframe support
3. **Query system** (lines 275-285): `queryAsync` using shared query resolver
4. **Initialization** (lines 288-422): WASM load detection, callback setup

## Recommended Extraction

### Base Class: `GodotBridgeBase`
Extract to `app/lib/godot/GodotBridgeBase.ts`:

```typescript
export abstract class GodotBridgeBase implements GodotBridge {
  // Callback arrays
  protected collisionCallbacks: ((event: CollisionEvent) => void)[] = [];
  protected destroyCallbacks: ((entityId: string) => void)[] = [];
  protected entitySpawnedCallbacks: ((event: EntitySpawnedEvent) => void)[] = [];
  protected sensorBeginCallbacks: ((event: SensorEvent) => void)[] = [];
  protected sensorEndCallbacks: ((event: SensorEvent) => void)[] = [];
  protected inputEventCallbacks: ((type: string, x: number, y: number, entityId: string | null) => void)[] = [];
  protected uiButtonCallbacks: ((eventType: 'button_down' | 'button_up' | 'button_pressed', buttonId: string) => void)[] = [];
  protected transformSyncCallbacks: ((transforms: Record<string, EntityTransform>) => void)[] = [];
  protected propertySyncCallbacks: ((properties: PropertySyncPayload) => void)[] = [];
  protected scoreCallbacks: ((points: number, entityId: string) => void)[] = [];

  // Callback registration methods
  onCollision(callback: (event: CollisionEvent) => void): () => void {
    this.collisionCallbacks.push(callback);
    return () => {
      const index = this.collisionCallbacks.indexOf(callback);
      if (index >= 0) this.collisionCallbacks.splice(index, 1);
    };
  }

  onEntityDestroyed(callback: (entityId: string) => void): () => void {
    this.destroyCallbacks.push(callback);
    return () => {
      const index = this.destroyCallbacks.indexOf(callback);
      if (index >= 0) this.destroyCallbacks.splice(index, 1);
    };
  }

  // ... 8 more callback methods

  // Utility: Generate entity ID
  protected generateEntityId(templateId: string): string {
    return `${templateId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  // Abstract methods (platform-specific)
  abstract initialize(): Promise<void>;
  abstract dispose(): void;
  abstract loadGame(definition: GameDefinition): Promise<void>;
  // ... rest of GodotBridge interface
}
```

### Updated Native Bridge
```typescript
import { GodotBridgeBase } from './GodotBridgeBase';

export function createNativeGodotBridge(): GodotBridge {
  return new NativeGodotBridge();
}

class NativeGodotBridge extends GodotBridgeBase {
  // Native-specific state
  private godotModule: GodotModule | null = null;
  private isGodotInitialized = false;
  private isDisposing = false;
  
  async initialize() {
    // Native-specific initialization
  }
  
  // ... platform-specific implementations
}
```

### Updated Web Bridge
```typescript
import { GodotBridgeBase } from './GodotBridgeBase';

export function createWebGodotBridge(): GodotBridge {
  return new WebGodotBridge();
}

class WebGodotBridge extends GodotBridgeBase {
  // Web-specific state
  
  async initialize() {
    // Web-specific initialization
  }
  
  // ... platform-specific implementations
}
```

## Estimated Line Reduction
- **Callback arrays**: 10 lines × 2 files = 20 lines saved
- **Callback methods**: 60 lines × 2 files = 120 lines saved
- **Entity ID generation**: 2 lines × 2 files = 4 lines saved
- **Total**: ~144 lines removed, ~80 lines added to base class
- **Net reduction**: ~64 lines

## Implementation Plan
1. Create `GodotBridgeBase.ts` with shared callback logic
2. Convert native bridge to class extending base
3. Convert web bridge to class extending base
4. Verify both platforms still work
5. Run `pnpm tsc --noEmit` to verify types
