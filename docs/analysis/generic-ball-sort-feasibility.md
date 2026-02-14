# Generic Ball Sort Feasibility Analysis

**Goal:** Could an AI generate Ball Sort (or similar puzzle games) without hardcoded executors?

**TL;DR:** The infrastructure is 80% there! We have a full scripting system with sandboxing, entity management, and runtime integration. We just need to wire up `RunScriptActionExecutor` and add a few missing APIs.

---

## Current Infrastructure (What We Already Have)

### 1. Dual Sandbox System

**EvalSandbox** (`shared/src/scripting/EvalSandbox.ts`) - Working, for trusted code:
```typescript
const sandbox = new EvalSandbox();
const result = sandbox.evaluate('return ctx.getVariable("score") + 10', context);
const result2 = sandbox.evaluateExport(code, 'onPickup', context);
```

**QuickJSSandbox** (`shared/src/scripting/QuickJSSandbox.ts`) - Full isolation (WASM issues pending):
- Memory limits (`maxMemoryBytes`)
- Instruction limits (`maxInstructions`)
- Execution timeout (`maxExecutionTimeMs`)
- Proper error extraction with stack traces

### 2. ScriptSandbox Wrapper (`app/lib/scripting/ScriptSandbox.ts`)

High-level sandbox with lifecycle hooks:
```typescript
const sandbox = new ScriptSandbox({ scriptCode, scriptId, gameId });
await sandbox.initialize();

// Lifecycle hooks
sandbox.runStart(runtimeContext);
sandbox.runUpdate(runtimeContext, dt);
sandbox.runInput(runtimeContext, event);
sandbox.runCollision(runtimeContext, collision);

// Arbitrary function calls
sandbox.callFunction(runtimeContext, 'onPickup', { tubeIndex: 3 });
```

### 3. ScriptSandboxRuntimeSystem (`app/lib/game-engine/systems/runner/wrappers/`)

Full runtime integration that:
- Creates entity manager adapter with spawn/destroy/query
- Connects to physics system for velocity/impulse
- Handles input events (tap, drag)
- Handles collision events
- Manages variable get/set

### 4. ScriptContext API (Already Defined)

```typescript
interface ScriptContext {
  // Variables
  getVariable(name: string): unknown;
  setVariable(name: string, value: unknown): void;
  getConstant(name: string): number | string | boolean | undefined;

  // Events
  emit(eventName: string, data?: Record<string, unknown>): void;
  win(): void;
  lose(): void;

  // Entities
  spawnEntity(prefabId: string, position: Vec2, opts?: SpawnOptions): string | null;
  destroyEntity(entityId: string): void;
  getEntityPosition(entityId: string): Vec2 | null;
  setEntityPosition(entityId: string, position: Vec2): void;
  getEntityVelocity(entityId: string): Vec2 | null;
  setEntityVelocity(entityId: string, velocity: Vec2): void;
  applyImpulse(entityId: string, impulse: Vec2): void;

  // Tags
  getEntityTags(entityId: string): string[];
  addTag(entityId: string, tag: string): void;
  removeTag(entityId: string, tag: string): boolean;
  hasTag(entityId: string, tag: string): boolean;

  // Queries
  queryEntities(query?: EntityQuery): string[];

  // Input
  getInput(): InputSnapshot | null;
  getMouse(): Vec2 | null;
  getDrag(): DragSnapshot | null;

  // Utilities
  random(): number;
  randomInt(min: number, max: number): number;
  randomChoice<T>(array: T[]): T;
  clamp(value: number, min: number, max: number): number;
  lerp(a: number, b: number, t: number): number;
  distance(a: Vec2, b: Vec2): number;

  // Frame info
  readonly frameId: number;
  readonly elapsed: number;
  readonly dt: number;
}
```

### 5. GameDefinition Script Field

```typescript
interface GameDefinition {
  // ... other fields
  script?: string;  // Main game script with lifecycle hooks
}
```

---

## What's Missing (The 20%)

### Priority 1: Wire Up ScriptSandboxRuntimeSystem ⚡

**File:** `app/lib/game-engine/systems/runner/wrappers/ScriptSandboxRuntimeSystem.ts`

**What it needs:**
```typescript
// ...
```

**Effort:** 2-4 hours

### Priority 2: Add Animation API 🎬

**Missing:** `setEntityTargetPosition` for smooth animated movement

Ball sort needs balls to animate smoothly when picked up/dropped. Currently only instant position changes are available.

**Add to ScriptContext:**
```typescript
interface ScriptContext {
  // ... existing

  /** Animate entity to target position */
  animateEntity(entityId: string, config: {
    x?: number;
    y?: number;
    duration: number;
    easing?: 'linear' | 'easeInQuad' | 'easeOutQuad' | 'easeInOutQuad';
  }): void;
}
```

**Implementation:** Bridge to existing `setEntityTargetPosition` in RuleContext

**Effort:** 2-4 hours

### Priority 3: Add Scheduling API ⏱️

**Missing:** Way to delay actions without setTimeout (which breaks outside game loop)

**Add to ScriptContext:**
```typescript
interface ScriptContext {
  // ... existing

  /** Schedule a callback to run after delay (runs within game loop) */
  schedule(delaySeconds: number, callback: () => void): void;

  /** Schedule a variable change after delay */
  scheduleSetVariable(delaySeconds: number, name: string, value: unknown): void;

  /** Schedule an event emission after delay */
  scheduleEmit(delaySeconds: number, eventName: string, data?: Record<string, unknown>): void;
}
```

**Alternative:** Use the variable-based pattern (like we did for ball sort win):
```typescript
// In script:
ctx.setVariable('_winAtElapsed', ctx.elapsed + 0.3);
```

**Effort:** 1-2 hours (variable pattern already works)

### Priority 4: Enhanced Entity Queries 🔍

**Missing:** Get full entity data, not just IDs

**Current:**
```typescript
queryEntities(query?: { tag?: string }): string[];  // Returns IDs only
```

**Needed for ball sort:**
```typescript
interface EntityData {
  id: string;
  tags: string[];
  position: { x: number; y: number };
  prefab?: string;
}

queryEntitiesWithData(query?: EntityQuery): EntityData[];
getEntityData(entityId: string): EntityData | null;
```

**Effort:** 1-2 hours

### Priority 5: Input Context 📱

**Missing:** Access to tap target in scripts

**Current:** Can't easily get "which tube was tapped" from within a script

**Effort:** 2-4 hours

---

## Implementation Plan

### Phase 1: Minimum Viable Scripting (1 day)

1. **Wire up ScriptSandboxRuntimeSystem** to call sandbox
2. **Add `getEntityData()`** to get position + tags for an entity
3. **Test with simple script:** spawn entity on tap

```typescript
// Test game script
exports.onInput = function(ctx, event) {
  if (event.type === 'tap') {
    const entities = ctx.queryEntities({ tag: 'ball' });
    for (const id of entities) {
      const pos = ctx.getEntityPosition(id);
      console.log('Ball at', pos);
    }
  }
};
```

### Phase 2: Ball Sort Generic (2-3 days)

1. **Add `animateEntity()`** API
2. **Add `queryEntitiesWithData()`** for finding top ball
3. **Create `ballSortGeneric` test game** using only scripts
4. **Validate** all ball sort functionality works

### Phase 3: AI Generation Ready (2-3 days)

1. **Add Zod schemas** for script API types (for AI validation)
2. **Create TypeScript type declarations** that AI can reference
3. **Build script prefabs** for common patterns (pickup/drop, win check)
4. **Add script linting/validation** before execution
5. **Document** the full API for AI context

---

## Ball Sort as Generic Script

Here's what Ball Sort would look like with the scripting system:

```typescript
// ballSortGeneric/script.ts (embedded in game definition as string)
exports.onStart = function(ctx) {
  // Initialize any state
};

exports.onInput = function(ctx, event) {
  if (event.type !== 'tap') return;
  
  // ...
};

exports.onUpdate = function(ctx, dt) {
  // Check win condition
  for (let i = 0; i < 6; i++) {
    const count = ctx.getVariable('tube' + i + '_count');
    if (count === 0) continue;
    if (count !== 4) return;

    // Check all same color
    const balls = ctx.queryEntities({ tag: 'in-container-tube-' + i });
    const colors = balls.map(id => {
      const tags = ctx.getEntityTags(id);
      const colorTag = tags.find(t => t.startsWith('color-'));
      return colorTag ? parseInt(colorTag.slice(6)) : -1;
    });

    if (!colors.every(c => c === colors[0])) return;
  }

  // Schedule win after animation completes
  ctx.setVariable('_winAtElapsed', ctx.elapsed + 0.3);
};
```

---

## Summary

| Component | Status | Effort to Complete |
|-----------|--------|-------------------|
| EvalSandbox | ✅ Working | - |
| QuickJSSandbox | ⚠️ WASM issues | TBD |
| ScriptSandbox wrapper | ✅ Working | - |
| ScriptSandboxRuntimeSystem | ✅ Working | - |
| ScriptContext API | ✅ Defined | - |
| `animateEntity()` | ❌ Missing | 2-4 hours |
| `queryEntitiesWithData()` | ❌ Missing | 1-2 hours |
| **Total for Ball Sort Generic** | | **~2 days** |

**Could AI generate Ball Sort today?** No, but with ~2 days of work: **Yes, absolutely.**

The scripting infrastructure is solid. We just need to:
1. Connect the runtime system to the sandbox
2. Add animation support
3. Improve entity queries

Then AI can generate complete puzzle games with custom logic.
