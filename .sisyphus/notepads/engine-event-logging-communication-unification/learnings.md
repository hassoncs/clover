# Task 7: Fix setEntityPosition to reach Godot via bridge

## Summary
Fixed `setEntityPosition` in both `RunScriptActionExecutor` and `ScriptSandboxRuntimeSystem` to call `bridge.setPosition()` after updating the TypeScript entity state. This ensures position changes persist after `syncTransformsFromPhysics`.

## Changes Made

### 1. RunScriptActionExecutor.ts (lines 111-120)
Added `bridge.setPosition()` call after updating entity transform:
```typescript
setEntityPosition: (entityId: string, position: { x: number; y: number }) => {
  const entity = entityManager.getEntity(entityId);
  if (entity) {
    entity.transform.x = position.x;
    entity.transform.y = position.y;
    if (context.bridge) {
      context.bridge.setPosition(entityId, position.x, position.y);
    }
  }
},
```

### 2. ScriptSandboxRuntimeSystem.ts (lines 249-304)
Added bridge reference and `bridge.setPosition()` call:
```typescript
private createEntityManagerAdapter(): SandboxRuntimeContext['entityManager'] {
  const em = this.systemContext!.entityManager;
  const physics = this.systemContext!.physics;
  const bridge = this.systemContext!.bridge;  // Added bridge reference
  
  // ... other methods ...
  
  setEntityPosition: (entityId: string, position: { x: number; y: number }) => {
    const entity = em.getEntity(entityId);
    if (!entity) {
      return;
    }

    entity.transform.x = position.x;
    entity.transform.y = position.y;

    if (entity.physics) {
      physics.setTransform(entity.id, {
        position,
        angle: entity.transform.angle,
      });
    }

    bridge.setPosition(entityId, position.x, position.y);  // Added bridge call
  },
```

## Verification
- `pnpm tsc --noEmit` passes (no type errors)
- Test failures are pre-existing issues in expression evaluation system (unrelated to these changes)
- No existing tests for these specific files

## Pattern Notes
- SpawnActionExecutor uses Godot-authoritative pattern (calls bridge.spawnEntity directly)
- RunScriptActionExecutor uses TS-optimistic pattern (creates entity in TS first, defers bridge call)
- ScriptSandboxRuntimeSystem uses physics interface for physics entities, now also calls bridge for all position changes

---

# Task 6: Auto-Step in Inspector Mode

## Summary
Implemented auto-step functionality that automatically advances one frame when a discrete event is queued while the game is paused in inspector mode.

## Changes Made

### 1. GameRuntime.godot.tsx
- Added `isSteppingRef` to track when manual step is in progress
- Added `autoStepTimerRef` to prevent duplicate auto-step scheduling
- Added `lastAutoStepTimeRef` for rate limiting (60fps max)
- Modified `manualStep()` to set `isSteppingRef.current = true` at start and reset to `false` when done
- Added useEffect that wires `eventQueueRef.current.setOnEventQueued()` callback
  - Checks `timeControl.mode === 'inspect'` AND `paused === true`
  - Checks `isSteppingRef.current === false`
  - Uses `setTimeout(0)` to debounce/batch rapid events
  - Rate limits to max 60 auto-steps per second (16.67ms gap)
  - Logs via `logger.debug('inspector', 'auto-step triggered')`

### 2. packages/game-inspector-mcp/src/tools/interaction.ts
- Updated `simulate_input` tool to wait at least 50ms for auto-step to complete
- Changed from `waitMs` default to `Math.max(waitMs, 50)` to ensure auto-step has time to process

## Key Implementation Details

### Auto-Step Conditions
Auto-step only fires when ALL of the following are true:
1. Game is in inspect mode (`timeControl.mode === 'inspect'`)
2. Game is paused (`timeControl.paused === true`)
3. Not already processing a manual step (`isSteppingRef.current === false`)
4. Rate limit not exceeded (16.67ms since last auto-step)
5. No auto-step already scheduled (`autoStepTimerRef.current === null`)

### Rate Limiting
- Max 60 auto-steps per second (16.67ms minimum gap)
- Prevents infinite loops from cascading events
- Uses `performance.now()` for high-resolution timing

### Debouncing
- Uses `setTimeout(0)` to batch rapid events
- All events queued in the same microtask will trigger only one auto-step
- Timer is cleared on cleanup to prevent memory leaks

## Testing
- TypeScript check passes (`pnpm tsc --noEmit`)
- No breaking changes to existing APIs
- `manualStep()` still works explicitly
- `simulate_input` tool backward compatible

## Files Modified
- `app/lib/game-engine/GameRuntime.godot.tsx`
- `packages/game-inspector-mcp/src/tools/interaction.ts`
