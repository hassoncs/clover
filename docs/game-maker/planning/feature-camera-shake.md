# Feature: Camera Shake

## Overview
Screen shake effect for impacts, explosions, and dramatic moments.

## Current State
**ALREADY IMPLEMENTED!** ✅

The CameraSystem already has shake functionality:

```typescript
// CameraSystem.ts
shake(intensity: number, duration: number): void {
  this.config.shakeIntensity = intensity;
  this.config.shakeDuration = duration;
  this.shakeTimeRemaining = duration;
}

addTrauma(amount: number): void {
  this.state.trauma = Math.min(1, this.state.trauma + amount);
  this.shake(this.state.trauma * 0.5, 0.3);
}
```

The shake is applied in `getWorldToScreenTransform()`:
```typescript
const worldX = this.config.position.x + this.shakeOffsetX;
const worldY = this.config.position.y + this.shakeOffsetY;
```

## What's Missing

The shake functionality exists but isn't exposed to the game definition system. We need:

1. **Rule Action to trigger shake**
2. **Behavior to trigger shake on collision**

### Implementation

#### 1. Add CameraShakeAction to rules

```typescript
// In shared/src/types/rules.ts
interface CameraShakeAction {
  type: 'camera_shake';
  intensity: number;    // 0-1 scale, affects offset magnitude
  duration: number;     // seconds
}
```

#### 2. Implement action executor

```typescript
// In app/lib/game-engine/rules/actions/CameraActionExecutor.ts
case 'camera_shake':
  context.camera?.shake(action.intensity, action.duration);
  break;
```

#### 3. Add camera to RuleContext

The RuleContext needs access to the camera system.

### Example Usage

```typescript
rules: [
  {
    id: "shake_on_hit",
    trigger: { type: "collision", entityATag: "ball", entityBTag: "bumper" },
    actions: [
      { type: "camera_shake", intensity: 0.3, duration: 0.2 }
    ]
  }
]
```

### Files to Modify
- `shared/src/types/rules.ts` - Add CameraShakeAction
- `app/lib/game-engine/rules/types.ts` - Add camera to RuleContext
- `app/lib/game-engine/rules/actions/index.ts` - Add CameraActionExecutor
- `app/lib/game-engine/GameRuntime.native.tsx` - Pass camera to rules evaluator

### Success Criteria
- [ ] `camera_shake` action triggers screen shake
- [ ] Intensity and duration are configurable
- [ ] Shake decays smoothly (already implemented in CameraSystem)
- [ ] Can be triggered from collision rules

## Complexity: Low
- Core functionality already exists
- Just need to wire it up to the rules system
