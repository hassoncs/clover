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
- Emits events to the rules system
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
  spawnEntity(templateId: string, position: Vec2, opts?: SpawnOptions): string | null;
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

### Priority 1: Wire Up RunScriptActionExecutor ⚡

**File:** `app/lib/game-engine/rules/actions/RunScriptActionExecutor.ts`

**Current state:** Stub that logs a warning
```typescript
execute(action: RunScriptAction, _context: RuleContext): void {
  console.warn(`Script execution not yet implemented for '${functionName}'`);
}
```

**What it needs:**
```typescript
execute(action: RunScriptAction, context: RuleContext): void {
  if (!this.sandbox) {
    console.warn('[RunScriptActionExecutor] No sandbox available');
    return;
  }

  // Get script code from game definition or action
  const scriptCode = action.script; // or from definition.scripts[action.scriptId]

  // Create runtime context from RuleContext
  const runtimeContext = this.createRuntimeContext(context);

  // Call the exported function
  const result = this.sandbox.callFunction(
    runtimeContext,
    action.export ?? 'default',
    action.args
  );

  if (!result.success) {
    console.error('[RunScript] Error:', result.error);
  }
}
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

// Frame rule checks and triggers
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
  template?: string;
}

queryEntitiesWithData(query?: EntityQuery): EntityData[];
getEntityData(entityId: string): EntityData | null;
```

**Effort:** 1-2 hours

### Priority 5: Input Context in Actions 📱

**Missing:** Access to tap target in `run_script` actions

**Current:** Can't easily get "which tube was tapped" from within a script action

**Options:**
1. Pass tap context as args: `{ type: 'run_script', args: { tubeIndex: { expr: 'tapTargetIndex()' } } }`
2. Add to ScriptContext: `ctx.getLastTapTarget(): string | null`
3. Use input event hooks instead of actions

**Effort:** 2-4 hours

---

## Implementation Plan

### Phase 1: Minimum Viable Script Actions (1 day)

1. **Wire up RunScriptActionExecutor** to call sandbox
2. **Add `getEntityData()`** to get position + tags for an entity
3. **Test with simple script:** spawn entity on tap

```typescript
// Test game script
exports.onTap = function(ctx, args) {
  const entities = ctx.queryEntities({ tag: 'ball' });
  for (const id of entities) {
    const pos = ctx.getEntityPosition(id);
    console.log('Ball at', pos);
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
3. **Build script templates** for common patterns (pickup/drop, win check)
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

exports.onPickup = function(ctx, { tubeIndex }) {
  const count = ctx.getVariable('tube' + tubeIndex + '_count');
  if (count === 0) {
    ctx.emit('pickup_cancelled');
    return;
  }

  // Find top ball in tube
  const balls = ctx.queryEntities({ tag: 'in-container-tube-' + tubeIndex });
  let topBall = null;
  let topY = -Infinity;

  for (const ballId of balls) {
    const pos = ctx.getEntityPosition(ballId);
    if (pos && pos.y > topY) {
      topY = pos.y;
      topBall = ballId;
    }
  }

  if (!topBall) {
    ctx.emit('pickup_cancelled');
    return;
  }

  // Get ball color from tags
  const tags = ctx.getEntityTags(topBall);
  const colorTag = tags.find(t => t.startsWith('color-'));
  const color = colorTag ? parseInt(colorTag.slice(6)) : -1;

  // Store pickup state
  ctx.setVariable('heldBallId', topBall);
  ctx.setVariable('heldBallColor', color);
  ctx.setVariable('sourceTubeIndex', tubeIndex);

  // Animate ball up
  ctx.animateEntity(topBall, {
    y: topY + 2.0,
    duration: 0.2,
    easing: 'easeOutQuad'
  });

  // Update tube state
  ctx.setVariable('tube' + tubeIndex + '_count', count - 1);
  ctx.addTag(topBall, 'held');
  ctx.removeTag(topBall, 'in-container-tube-' + tubeIndex);

  ctx.emit('ball_picked');
};

exports.onDrop = function(ctx, { tubeIndex }) {
  const heldBallId = ctx.getVariable('heldBallId');
  const heldBallColor = ctx.getVariable('heldBallColor');
  const sourceTubeIndex = ctx.getVariable('sourceTubeIndex');

  if (!heldBallId || tubeIndex === sourceTubeIndex) {
    // Cancel - return to source
    ctx.emit('pickup_cancelled');
    return;
  }

  const targetCount = ctx.getVariable('tube' + tubeIndex + '_count');
  const targetTopColor = ctx.getVariable('tube' + tubeIndex + '_topColor');

  // Validate move
  if (targetCount >= 4) {
    ctx.emit('invalid_move');
    return;
  }
  if (targetCount > 0 && targetTopColor !== heldBallColor) {
    ctx.emit('invalid_move');
    return;
  }

  // Calculate drop position
  const tubePos = ctx.getEntityPosition('tube-' + tubeIndex);
  const dropY = tubePos.y - 2.5 + targetCount * 1.1;

  // Animate ball down
  ctx.animateEntity(heldBallId, {
    x: tubePos.x,
    y: dropY,
    duration: 0.2,
    easing: 'easeOutQuad'
  });

  // Update state
  ctx.removeTag(heldBallId, 'held');
  ctx.addTag(heldBallId, 'in-container-tube-' + tubeIndex);
  ctx.setVariable('tube' + tubeIndex + '_count', targetCount + 1);
  ctx.setVariable('tube' + tubeIndex + '_topColor', heldBallColor);

  // Clear held state
  ctx.setVariable('heldBallId', '');
  ctx.setVariable('sourceTubeIndex', -1);
  ctx.setVariable('heldBallColor', -1);

  // Increment move count
  const moves = ctx.getVariable('moveCount') || 0;
  ctx.setVariable('moveCount', moves + 1);

  ctx.emit('ball_dropped');
};

exports.checkWin = function(ctx) {
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

**Game Definition Rules:**
```typescript
rules: [
  {
    trigger: { type: 'tap', target: 'tube' },
    conditions: [{ type: 'state', machineId: 'gameFlow', state: 'idle' }],
    actions: [{
      type: 'run_script',
      export: 'onPickup',
      args: { tubeIndex: { expr: 'parseInt(tapTargetId.split("-")[1])' } }
    }]
  },
  {
    trigger: { type: 'tap', target: 'tube' },
    conditions: [{ type: 'state', machineId: 'gameFlow', state: 'holding' }],
    actions: [{ type: 'run_script', export: 'onDrop', args: { /* ... */ } }]
  },
  {
    trigger: { type: 'event', eventName: 'ball_dropped' },
    actions: [{ type: 'run_script', export: 'checkWin' }]
  },
  {
    trigger: { type: 'frame' },
    conditions: [{ type: 'expression', expr: '_winAtElapsed > 0 && elapsed() >= _winAtElapsed' }],
    actions: [
      { type: 'set_variable', name: '_winAtElapsed', operation: 'set', value: 0 },
      { type: 'game_state', state: 'win' }
    ]
  }
]
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
| RunScriptActionExecutor | ❌ Stub | 2-4 hours |
| `animateEntity()` | ❌ Missing | 2-4 hours |
| `queryEntitiesWithData()` | ❌ Missing | 1-2 hours |
| Tap target in args | ⚠️ Awkward | 2-4 hours |
| **Total for Ball Sort Generic** | | **~2 days** |

**Could AI generate Ball Sort today?** No, but with ~2 days of work: **Yes, absolutely.**

The scripting infrastructure is solid. We just need to:
1. Connect the action executor to the sandbox
2. Add animation support
3. Improve entity queries

Then AI can generate complete puzzle games with custom logic.
