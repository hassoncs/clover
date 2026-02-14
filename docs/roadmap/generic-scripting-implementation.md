# Generic Scripting System Implementation Plan

**Goal:** Enable AI-generated games by completing the scripting infrastructure so games like Ball Sort can be implemented entirely via scripts without hardcoded action executors.

**Status:** ✅ COMPLETE (Feb 2026)

---

## Final Architecture

### Script-First Model
The engine has transitioned from a declarative Rules/Behavior system to a **Script-First** model. Game logic is now implemented in standalone JavaScript modules.

### Key Components
1. **`ScriptSandbox`**: Executes modules in a secure environment (QuickJS in production, Eval in dev).
2. **`scriptRef`**: Field on `EntityPrefab` and `GameEntity` that points to a module key.
3. **`ScriptContext`**: The API provided to scripts (hooks: `onStart`, `onUpdate`, `onInput`, `onCollision`).
4. **Manifest-Based Publishing**: Games are published as a `manifest.json` referencing content-hashed script chunks.

### Legacy Systems
The following systems are deprecated and have been removed from active game definition contracts:
- `GameRule[]` (rules.json)
- `Behavior[]` (behaviors section in prefabs)
- `stateMachines`
- `containers` (now handled by script logic)

---

## Table of Contents

1. [Sandbox Architecture](#sandbox-architecture)
2. [Current State](#current-state)
3. [Target State](#target-state)
4. [Implementation Tasks](#implementation-tasks)
5. [Phase 1: Wire Up Script Execution](#phase-1-wire-up-script-execution)
6. [Phase 2: Add Missing APIs](#phase-2-add-missing-apis)
7. [Phase 3: Ball Sort Scripted](#phase-3-ball-sort-scripted)
8. [Phase 4: AI Generation Ready](#phase-4-ai-generation-ready)
9. [Testing Strategy](#testing-strategy)
10. [File Reference](#file-reference)

---

## Sandbox Architecture

### Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                       SCRIPT EXECUTION LAYER                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  GameScriptHost (app/lib/scripting/ScriptSandbox.ts)          │  │
│  │  ─────────────────────────────────────────────────────────────│  │
│  │  HIGH-LEVEL GAME INTERFACE                                    │  │
│  │  • Lifecycle hooks: onStart, onUpdate, onInput, onCollision   │  │
│  │  • callFunction(runtime, name, args) for rule actions         │  │
│  │  • Log capture, error reporting, hot reload                   │  │
│  └───────────────────────────┬───────────────────────────────────┘  │
│                              │                                       │
│              Uses one of these execution backends:                   │
│              ┌───────────────┴───────────────┐                      │
│              ▼                               ▼                      │
│  ┌─────────────────────────┐    ┌──────────────────────────────┐   │
│  │  TrustedScriptRunner    │    │  IsolatedScriptRunner        │   │
│  │  (EvalSandbox)          │    │  (QuickJSSandbox)            │   │
│  │  ───────────────────    │    │  ─────────────────────       │   │
│  │  DEV / TRUSTED CODE     │    │  PRODUCTION / USER CODE      │   │
│  │                         │    │                              │   │
│  │  Implementation:        │    │  Implementation:             │   │
│  │  • new Function()       │    │  • QuickJS WASM runtime      │   │
│  │                         │    │                              │   │
│  │  Characteristics:       │    │  Characteristics:            │   │
│  │  • NO isolation         │    │  • Full memory isolation     │   │
│  │  • Works everywhere     │    │  • Instruction limits        │   │
│  │  • Fast startup         │    │  • Execution timeout         │   │
│  │  • Full JS features     │    │  • Safe for untrusted code   │   │
│  │                         │    │                              │   │
│  │  Use when:              │    │  Use when:                   │   │
│  │  • AI-generated games   │    │  • User-submitted games      │   │
│  │  • Internal dev/test    │    │  • Untrusted content         │   │
│  │                         │    │                              │   │
│  │  Status: ✅ WORKING     │    │  Status: ⚠️ WASM ISSUES      │   │
│  └─────────────────────────┘    └──────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### File Locations

| Layer | Current Name | File | Role |
|-------|--------------|------|------|
| Interface | `ScriptSandbox` | `app/lib/scripting/ScriptSandbox.ts` | High-level game script host with lifecycle hooks |
| Backend | `EvalSandbox` | `shared/src/scripting/EvalSandbox.ts` | Trusted execution via `new Function()` |
| Backend | `QuickJSSandbox` | `shared/src/scripting/QuickJSSandbox.ts` | Isolated execution via QuickJS WASM |
| Runtime | `ScriptSandboxRuntimeSystem` | `app/lib/game-engine/systems/runner/wrappers/...` | Integrates scripts into game loop |
| API | `GameScriptAPI` | `app/lib/scripting/GameScriptAPI.ts` | Creates ScriptContext from runtime |

### Execution Flow

```
GamePackageManifest (manifest.json)
         │
         ▼
┌─────────────────────────┐
│  Game Initialization    │
│  (GameLoader)           │
│  - Fetches Chunks       │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  ScriptSandbox          │
│  - Mounts Module Map    │
│  - Links scriptRefs     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Engine Event/Update    │
│  - Calls Module Hooks   │
│  - (onStart, onUpdate)  │
└─────────────────────────┘
```

GameDefinition.script (string)
         │
         ▼
┌─────────────────────────┐
│  Game Initialization    │
│  (GameLoader)           │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  ScriptSandbox          │
│  • Compiles script      │
│  • Detects hooks        │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│  Rule: tap on tube      │────▶│  RunScriptActionExecutor│
│  action: run_script     │     │  • Builds ScriptContext │
└─────────────────────────┘     │  • Calls exported func  │
                                └───────────┬─────────────┘
                                            │
                                            ▼
                                ┌─────────────────────────┐
                                │  EvalSandbox.evaluate() │
                                │  • Executes JS code     │
                                │  • Returns result       │
                                └─────────────────────────┘
```

### Design Decisions

1. **Use EvalSandbox for AI-generated games** - AI code is reviewed before deployment, so we don't need full isolation. This avoids WASM complexity.

2. **Keep QuickJSSandbox for future user-generated content** - When users can submit their own games, we'll need isolation.

3. **Single ScriptContext interface** - Both backends expose the same API, making it easy to swap.

4. **Scripts embedded in GameDefinition** - The `script` field contains the full script as a string. No external file loading needed.

---

## Current State

### What Works

| Component | Location | Status |
|-----------|----------|--------|
| EvalSandbox | `shared/src/scripting/EvalSandbox.ts` | ✅ Working |
| QuickJSSandbox | `shared/src/scripting/QuickJSSandbox.ts` | ⚠️ WASM issues |
| ScriptSandbox wrapper | `app/lib/scripting/ScriptSandbox.ts` | ✅ Working |
| ScriptSandboxRuntimeSystem | `app/lib/game-engine/systems/runner/wrappers/ScriptSandboxRuntimeSystem.ts` | ✅ Working |
| ScriptContext types | `app/lib/scripting/types.ts` | ✅ Defined |
| GameScriptAPI | `app/lib/scripting/GameScriptAPI.ts` | ✅ Working |
| RunScriptAction type | `shared/src/types/rules.ts` | ✅ Defined |

### What's Broken/Missing

| Component | Location | Issue |
|-----------|----------|-------|
| RunScriptActionExecutor | `app/lib/game-engine/rules/actions/RunScriptActionExecutor.ts` | ❌ Stub - just logs warning |
| animateEntity API | - | ❌ Not exposed to scripts |
| Entity data queries | - | ⚠️ Only returns IDs, not full data |
| Tap target context | - | ⚠️ Hard to get in script actions |
| Scheduling API | - | ⚠️ setTimeout breaks outside game loop |

---

## Target State

After implementation, we should be able to:

1. **Define game scripts in GameDefinition:**
```typescript
const game: GameDefinition = {
  script: `
    exports.onPickup = function(ctx, args) {
      // Custom game logic here
      ctx.animateEntity(args.entityId, { y: 10, duration: 0.2 });
      ctx.emit('picked_up');
    };
  `,
  rules: [
    {
      trigger: { type: 'tap', target: 'ball' },
      actions: [{
        type: 'run_script',
        export: 'onPickup',
        args: { entityId: { expr: 'tapTargetId()' } }
      }]
    }
  ]
};
```

2. **Have scripts access full game engine capabilities:**
   - Entity queries with position/tags/template data
   - Smooth animations via `animateEntity()`
   - Event emission and variable management
   - Win/lose triggering

3. **Create `ballSortGeneric` test game** that works identically to current ball sort but uses only scripts

---

## Implementation Tasks

### Overview

```
Phase 1: Wire Up Script Execution (4-6 hours)
├── Task 1.1: Implement RunScriptActionExecutor
├── Task 1.2: Connect sandbox to action executor
└── Task 1.3: Add basic integration test

Phase 2: Add Missing APIs (4-6 hours)
├── Task 2.1: Add animateEntity() to ScriptContext
├── Task 2.2: Add getEntityData() / queryEntitiesWithData()
├── Task 2.3: Add tapTargetId() expression function
└── Task 2.4: Add getElapsed() to ScriptContext

Phase 3: Ball Sort Generic (6-8 hours)
├── Task 3.1: Create ballSortGeneric game definition
├── Task 3.2: Write pickup/drop/win scripts
├── Task 3.3: Validate feature parity with hardcoded version
└── Task 3.4: Clean up and document

Phase 4: AI Generation Ready (4-6 hours)
├── Task 4.1: Add Zod schemas for script validation
├── Task 4.2: Create TypeScript declaration file for AI
├── Task 4.3: Build script templates library
└── Task 4.4: Add script error reporting UI
```

---

## Phase 1: Wire Up Script Execution

### Task 1.1: Implement RunScriptActionExecutor

**File:** `app/lib/game-engine/rules/actions/RunScriptActionExecutor.ts`

**Current code:**
```typescript
execute(action: RunScriptAction, _context: RuleContext): void {
  if (!this.sandbox) {
    console.warn('[RunScriptActionExecutor] No script sandbox available');
    return;
  }
  const functionName = action.export ?? 'default';
  console.warn(`[RunScriptActionExecutor] Script execution not yet implemented for '${functionName}'`);
}
```

**Target code:**
```typescript
import { EvalSandbox } from '@slopcade/shared/scripting';
import type { ScriptContext } from '@/lib/scripting/types';

export class RunScriptActionExecutor implements ActionExecutor<RunScriptAction> {
  private sandbox: EvalSandbox;
  private scriptCode: string | null = null;

  constructor() {
    this.sandbox = new EvalSandbox();
  }

  setScriptCode(code: string): void {
    this.scriptCode = code;
  }

  execute(action: RunScriptAction, context: RuleContext): void {
    const code = action.script ?? this.scriptCode;
    if (!code) {
      console.warn('[RunScriptActionExecutor] No script code available');
      return;
    }

    // Build ScriptContext from RuleContext
    const scriptContext = this.buildScriptContext(context);

    // Resolve args (may contain expressions)
    const resolvedArgs = this.resolveArgs(action.args, context);

    // Call the exported function
    const result = this.sandbox.evaluateExport(
      code,
      action.export ?? 'default',
      { ...scriptContext, args: resolvedArgs }
    );

    if (!result.success) {
      console.error('[RunScriptActionExecutor] Script error:', result.error);
    }
  }

  private buildScriptContext(context: RuleContext): ScriptContext {
    return {
      // Variables
      getVariable: (name) => context.mutator.getVariable(name),
      setVariable: (name, value) => context.mutator.setVariable(name, value as any),

      // Events
      emit: (eventName, data) => context.mutator.triggerEvent(eventName, data),
      win: () => context.mutator.setGameState('won'),
      lose: () => context.mutator.setGameState('lost'),

      // Entities
      getEntityPosition: (id) => {
        const entity = context.entityManager.getEntity(id);
        return entity ? { x: entity.transform.x, y: entity.transform.y } : null;
      },
      setEntityPosition: (id, pos) => {
        const entity = context.entityManager.getEntity(id);
        if (entity) {
          entity.transform.x = pos.x;
          entity.transform.y = pos.y;
        }
      },
      getEntityTags: (id) => {
        const entity = context.entityManager.getEntity(id);
        return entity?.tags ?? [];
      },
      addTag: (id, tag) => context.entityManager.addTag(id, tag),
      removeTag: (id, tag) => context.entityManager.removeTag(id, tag),
      hasTag: (id, tag) => context.entityManager.hasTag(id, tag),
      queryEntities: (query) => {
        if (!query) return context.entityManager.getActiveEntities().map(e => e.id);
        return context.entityManager.getEntitiesByTag(query.tag ?? '').map(e => e.id);
      },

      // Frame info
      elapsed: context.elapsed,
      dt: 1/60,
      frameId: 0,

      // Utilities
      random: Math.random,
      randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
      randomChoice: (arr) => arr[Math.floor(Math.random() * arr.length)],
      clamp: (v, min, max) => Math.max(min, Math.min(max, v)),
      lerp: (a, b, t) => a + (b - a) * t,
      distance: (a, b) => Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2),

      // Stubs for now
      getConstant: () => undefined,
      addScore: () => {},
      addLives: () => {},
      spawnEntity: () => null,
      destroyEntity: () => {},
      getEntityVelocity: () => null,
      setEntityVelocity: () => {},
      applyImpulse: () => {},
      getInput: () => null,
      getMouse: () => null,
      getDrag: () => null,
    };
  }

  private resolveArgs(
    args: Record<string, unknown> | undefined,
    context: RuleContext
  ): Record<string, unknown> {
    if (!args) return {};

    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(args)) {
      if (typeof value === 'object' && value !== null && 'expr' in value) {
        // Evaluate expression
        resolved[key] = context.evalContext?.evaluate((value as any).expr);
      } else {
        resolved[key] = value;
      }
    }
    return resolved;
  }
}
```

**Checklist:**
- [ ] Import EvalSandbox from shared
- [ ] Implement `buildScriptContext()` mapping RuleContext to ScriptContext
- [ ] Implement `resolveArgs()` for expression evaluation
- [ ] Call `sandbox.evaluateExport()` with correct parameters
- [ ] Handle errors gracefully

### Task 1.2: Connect Sandbox to Game Initialization

**File:** `app/lib/game-engine/GameLoader.ts` (or wherever game is initialized)

**Changes needed:**
- Pass `definition.script` to RunScriptActionExecutor
- Initialize executor with script code on game load

```typescript
// In game initialization
if (definition.script) {
  runScriptActionExecutor.setScriptCode(definition.script);
}
```

### Task 1.3: Add Basic Integration Test

**File:** `app/lib/game-engine/rules/actions/__tests__/RunScriptActionExecutor.test.ts`

```typescript
describe('RunScriptActionExecutor', () => {
  it('should execute a simple script that sets a variable', () => {
    const executor = new RunScriptActionExecutor();
    executor.setScriptCode(`
      exports.setScore = function(ctx) {
        ctx.setVariable('score', 100);
      };
    `);

    const context = createMockRuleContext();
    executor.execute({ type: 'run_script', export: 'setScore' }, context);

    expect(context.mutator.getVariable('score')).toBe(100);
  });

  it('should pass resolved args to the script', () => {
    const executor = new RunScriptActionExecutor();
    executor.setScriptCode(`
      exports.addToScore = function(ctx) {
        const current = ctx.getVariable('score') || 0;
        ctx.setVariable('score', current + ctx.args.amount);
      };
    `);

    const context = createMockRuleContext();
    context.mutator.setVariable('score', 50);

    executor.execute({
      type: 'run_script',
      export: 'addToScore',
      args: { amount: 25 }
    }, context);

    expect(context.mutator.getVariable('score')).toBe(75);
  });
});
```

---

## Phase 2: Add Missing APIs

### Task 2.1: Add animateEntity() to ScriptContext

**Files to modify:**
- `app/lib/scripting/types.ts` - Add type
- `app/lib/game-engine/rules/actions/RunScriptActionExecutor.ts` - Implement

**Add to ScriptContext interface:**
```typescript
interface ScriptContext {
  // ... existing

  /** Animate entity to target position with easing */
  animateEntity(entityId: string, config: {
    x?: number;
    y?: number;
    duration: number;
    easing?: 'linear' | 'easeInQuad' | 'easeOutQuad' | 'easeInOutQuad';
  }): void;
}
```

**Implementation in executor:**
```typescript
animateEntity: (entityId, config) => {
  if (context.setEntityTargetPosition) {
    context.setEntityTargetPosition(entityId, config.x, config.y, {
      duration: config.duration,
      easing: config.easing ?? 'easeOutQuad',
    });
  } else {
    // Fallback to instant position
    const entity = context.entityManager.getEntity(entityId);
    if (entity) {
      if (config.x !== undefined) entity.transform.x = config.x;
      if (config.y !== undefined) entity.transform.y = config.y;
    }
  }
},
```

### Task 2.2: Add getEntityData() and queryEntitiesWithData()

**Add to ScriptContext interface:**
```typescript
interface EntityData {
  id: string;
  tags: string[];
  position: { x: number; y: number };
  template?: string;
  visible?: boolean;
}

interface ScriptContext {
  // ... existing

  /** Get full entity data */
  getEntityData(entityId: string): EntityData | null;

  /** Query entities and return full data */
  queryEntitiesWithData(query?: EntityQuery): EntityData[];
}
```

**Implementation:**
```typescript
getEntityData: (entityId) => {
  const entity = context.entityManager.getEntity(entityId);
  if (!entity) return null;
  return {
    id: entity.id,
    tags: [...entity.tags],
    position: { x: entity.transform.x, y: entity.transform.y },
    template: entity.template,
    visible: entity.visible,
  };
},

queryEntitiesWithData: (query) => {
  const ids = scriptContext.queryEntities(query);
  return ids.map(id => scriptContext.getEntityData(id)).filter(Boolean);
},
```

### Task 2.3: Add tapTargetId() Expression Function

**File:** `shared/src/expressions/functions.ts` (or equivalent)

**Add function:**
```typescript
tapTargetId: {
  evaluate: (context: EvalContext) => {
    return context.inputEvents?.tap?.targetEntityId ?? null;
  },
  description: 'Returns the entity ID that was tapped, or null',
}
```

**Also add helper:**
```typescript
tapTargetIndex: {
  evaluate: (context: EvalContext) => {
    const id = context.inputEvents?.tap?.targetEntityId;
    if (!id) return -1;
    const match = id.match(/-(\d+)$/);
    return match ? parseInt(match[1], 10) : -1;
  },
  description: 'Extracts numeric index from tapped entity ID (e.g., "tube-3" → 3)',
}
```

### Task 2.4: Add getElapsed() to ScriptContext

Already exists as `elapsed` property, but ensure it's properly connected:

```typescript
// In buildScriptContext
elapsed: context.mutator.getElapsed(),
```

---

## Phase 3: Ball Sort Generic

### Task 3.1: Create ballSortGeneric Game Definition

**File:** `app/lib/test-games/games/ballSortGeneric/game.ts`

Create a new test game that:
- Uses the same entities, templates, and layout as current ball sort
- Replaces `ball_sort_pickup`, `ball_sort_drop`, `ball_sort_check_win` with `run_script` actions
- Has all logic in the `script` field

```typescript
export function createBallSortGenericGame(level: number = 1): GameDefinition {
  // ... same setup as regular ball sort ...

  return {
    metadata: {
      id: 'test-ball-sort-generic',
      title: 'Ball Sort (Generic)',
      description: 'Ball Sort implemented with generic scripting',
      version: '1.0.0',
    },

    // The magic - all game logic in a script
    script: BALL_SORT_SCRIPT,

    rules: [
      {
        id: 'tap_tube_idle',
        trigger: { type: 'tap', target: 'tube' },
        conditions: [{ type: 'state', machineId: 'gameFlow', state: 'idle' }],
        actions: [{
          type: 'run_script',
          export: 'onPickup',
          args: { tubeIndex: { expr: 'tapTargetIndex()' } }
        }]
      },
      {
        id: 'tap_tube_holding',
        trigger: { type: 'tap', target: 'tube' },
        conditions: [{ type: 'state', machineId: 'gameFlow', state: 'holding' }],
        actions: [{
          type: 'run_script',
          export: 'onDrop',
          args: { tubeIndex: { expr: 'tapTargetIndex()' } }
        }]
      },
      {
        id: 'check_win',
        trigger: { type: 'event', eventName: 'ball_dropped' },
        actions: [{ type: 'run_script', export: 'checkWin' }]
      },
      {
        id: 'handle_delayed_win',
        trigger: { type: 'frame' },
        conditions: [
          { type: 'expression', expr: '_winAtElapsed > 0 && elapsed() >= _winAtElapsed' }
        ],
        actions: [
          { type: 'set_variable', name: '_winAtElapsed', operation: 'set', value: 0 },
          { type: 'game_state', state: 'win' }
        ]
      }
    ],

    // ... rest of definition (entities, templates, etc.)
  };
}

const BALL_SORT_SCRIPT = `
exports.onPickup = function(ctx, args) {
  const tubeIndex = args.tubeIndex;
  const count = ctx.getVariable('tube' + tubeIndex + '_count');

  if (count === 0) {
    ctx.emit('pickup_cancelled');
    return;
  }

  // Find top ball
  const balls = ctx.queryEntitiesWithData({ tag: 'in-container-tube-' + tubeIndex });
  if (balls.length === 0) {
    ctx.emit('pickup_cancelled');
    return;
  }

  let topBall = balls[0];
  for (const ball of balls) {
    if (ball.position.y > topBall.position.y) {
      topBall = ball;
    }
  }

  // Get color
  const colorTag = topBall.tags.find(t => t.startsWith('color-'));
  const color = colorTag ? parseInt(colorTag.slice(6)) : -1;

  // Store state
  ctx.setVariable('heldBallId', topBall.id);
  ctx.setVariable('heldBallColor', color);
  ctx.setVariable('sourceTubeIndex', tubeIndex);

  // Animate up
  ctx.animateEntity(topBall.id, {
    y: topBall.position.y + 2.0,
    duration: 0.2,
    easing: 'easeOutQuad'
  });

  // Update state
  ctx.setVariable('tube' + tubeIndex + '_count', count - 1);
  ctx.addTag(topBall.id, 'held');
  ctx.removeTag(topBall.id, 'in-container-tube-' + tubeIndex);

  ctx.emit('ball_picked');
};

exports.onDrop = function(ctx, args) {
  const tubeIndex = args.tubeIndex;
  const heldBallId = ctx.getVariable('heldBallId');
  const heldBallColor = ctx.getVariable('heldBallColor');
  const sourceTubeIndex = ctx.getVariable('sourceTubeIndex');

  if (!heldBallId) {
    ctx.emit('pickup_cancelled');
    return;
  }

  // Tapping same tube = cancel
  if (tubeIndex === sourceTubeIndex) {
    // Return ball to source
    const sourceCount = ctx.getVariable('tube' + sourceTubeIndex + '_count');
    const tubeData = ctx.getEntityData('tube-' + sourceTubeIndex);
    const returnY = tubeData.position.y - 2.5 + sourceCount * 1.1;

    ctx.animateEntity(heldBallId, {
      y: returnY,
      duration: 0.2,
      easing: 'easeOutQuad'
    });

    ctx.removeTag(heldBallId, 'held');
    ctx.addTag(heldBallId, 'in-container-tube-' + sourceTubeIndex);
    ctx.setVariable('tube' + sourceTubeIndex + '_count', sourceCount + 1);

    ctx.setVariable('heldBallId', '');
    ctx.setVariable('sourceTubeIndex', -1);
    ctx.setVariable('heldBallColor', -1);

    ctx.emit('pickup_cancelled');
    return;
  }

  // Validate drop
  const targetCount = ctx.getVariable('tube' + tubeIndex + '_count');
  const targetTopColor = ctx.getVariable('tube' + tubeIndex + '_topColor');

  if (targetCount >= 4) {
    // Flash invalid feedback
    ctx.addTag(heldBallId, 'invalid');
    // Would need setTimeout alternative here
    ctx.emit('invalid_move');
    return;
  }

  if (targetCount > 0 && targetTopColor !== heldBallColor) {
    ctx.addTag(heldBallId, 'invalid');
    ctx.emit('invalid_move');
    return;
  }

  // Valid drop
  const tubeData = ctx.getEntityData('tube-' + tubeIndex);
  const dropY = tubeData.position.y - 2.5 + targetCount * 1.1;

  ctx.animateEntity(heldBallId, {
    x: tubeData.position.x,
    y: dropY,
    duration: 0.2,
    easing: 'easeOutQuad'
  });

  ctx.removeTag(heldBallId, 'held');
  ctx.addTag(heldBallId, 'in-container-tube-' + tubeIndex);
  ctx.setVariable('tube' + tubeIndex + '_count', targetCount + 1);
  ctx.setVariable('tube' + tubeIndex + '_topColor', heldBallColor);

  ctx.setVariable('heldBallId', '');
  ctx.setVariable('sourceTubeIndex', -1);
  ctx.setVariable('heldBallColor', -1);

  const moves = ctx.getVariable('moveCount') || 0;
  ctx.setVariable('moveCount', moves + 1);

  ctx.emit('ball_dropped');
};

exports.checkWin = function(ctx) {
  for (let i = 0; i < 6; i++) {
    const count = ctx.getVariable('tube' + i + '_count');
    if (count === 0) continue;
    if (count !== 4) return; // Not full

    // Check all same color
    const balls = ctx.queryEntitiesWithData({ tag: 'in-container-tube-' + i });
    if (balls.length === 0) return;

    const colors = balls.map(b => {
      const colorTag = b.tags.find(t => t.startsWith('color-'));
      return colorTag ? parseInt(colorTag.slice(6)) : -1;
    });

    const firstColor = colors[0];
    for (const c of colors) {
      if (c !== firstColor) return; // Mixed colors
    }
  }

  // All tubes are either empty or full of same color = WIN
  ctx.setVariable('_winAtElapsed', ctx.elapsed + 0.3);
};
`;
```

### Task 3.2: Register in Template Loader

**File:** `api/src/dev/templateLoader.ts`

```typescript
const GAME_REGISTRY: Record<string, () => Promise<GameModule>> = {
  ballSort: () => import('../../../app/lib/test-games/games/ballSort/game'),
  ballSortGeneric: () => import('../../../app/lib/test-games/games/ballSortGeneric/game'),
  // ... other games
};
```

### Task 3.3: Validate Feature Parity

Create a test checklist:

- [ ] Tap tube in idle state → ball lifts up
- [ ] Tap same tube → ball returns (cancel)
- [ ] Tap different tube with matching color → ball drops
- [ ] Tap different tube with mismatched color → invalid feedback
- [ ] Tap full tube → invalid feedback
- [ ] Complete puzzle → win after delay
- [ ] Move counter increments correctly
- [ ] Level progression works
- [ ] Previous level button works

### Task 3.4: Document the Pattern

Update `docs/game-engine/scripting.md` with:
- How to create a scripted game
- Available ScriptContext APIs
- Common patterns (pickup/drop, win conditions)
- Debugging tips

---

## Phase 4: AI Generation Ready

### Task 4.1: Add Zod Schemas for Script Validation

**File:** `shared/src/scripting/validation.ts`

```typescript
import { z } from 'zod';

export const ScriptContextMethodsSchema = z.object({
  getVariable: z.function().args(z.string()).returns(z.unknown()),
  setVariable: z.function().args(z.string(), z.unknown()).returns(z.void()),
  // ... etc
});

export const GameScriptSchema = z.object({
  onStart: z.function().optional(),
  onUpdate: z.function().optional(),
  onPickup: z.function().optional(),
  onDrop: z.function().optional(),
  checkWin: z.function().optional(),
});
```

### Task 4.2: Create TypeScript Declaration File

**File:** `shared/src/scripting/script-context.d.ts`

Create a `.d.ts` file that can be included in AI prompts:

```typescript
/**
 * Context available to game scripts.
 * All methods are synchronous and safe to call.
 */
interface ScriptContext {
  // === Variables ===

  /** Get a game variable by name */
  getVariable(name: string): unknown;

  /** Set a game variable */
  setVariable(name: string, value: string | number | boolean): void;

  // === Entities ===

  /** Get entity position */
  getEntityPosition(entityId: string): { x: number; y: number } | null;

  /** Get full entity data */
  getEntityData(entityId: string): EntityData | null;

  /** Query entities matching criteria */
  queryEntities(query?: { tag?: string }): string[];

  /** Query entities with full data */
  queryEntitiesWithData(query?: { tag?: string }): EntityData[];

  /** Animate entity to position */
  animateEntity(entityId: string, config: {
    x?: number;
    y?: number;
    duration: number;
    easing?: 'linear' | 'easeOutQuad';
  }): void;

  // === Tags ===

  /** Add tag to entity */
  addTag(entityId: string, tag: string): void;

  /** Remove tag from entity */
  removeTag(entityId: string, tag: string): void;

  /** Check if entity has tag */
  hasTag(entityId: string, tag: string): boolean;

  // === Events ===

  /** Emit a game event */
  emit(eventName: string, data?: Record<string, unknown>): void;

  /** Trigger win state */
  win(): void;

  /** Trigger lose state */
  lose(): void;

  // === Frame Info ===

  /** Current elapsed time in seconds */
  readonly elapsed: number;

  /** Time since last frame in seconds */
  readonly dt: number;
}

interface EntityData {
  id: string;
  tags: string[];
  position: { x: number; y: number };
  template?: string;
}
```

### Task 4.3: Build Script Templates Library

**File:** `shared/src/scripting/templates/`

Create reusable script patterns:

```typescript
// templates/pickup-drop.ts
export const PICKUP_DROP_TEMPLATE = `
// Pickup: Lift item from container
exports.onPickup = function(ctx, args) {
  const containerId = args.containerId;
  const items = ctx.queryEntitiesWithData({ tag: 'in-' + containerId });

  if (items.length === 0) {
    ctx.emit('pickup_cancelled');
    return;
  }

  // Find top item (highest Y)
  let topItem = items[0];
  for (const item of items) {
    if (item.position.y > topItem.position.y) {
      topItem = item;
    }
  }

  // Store held state
  ctx.setVariable('heldItemId', topItem.id);
  ctx.setVariable('sourceContainer', containerId);

  // Animate lift
  ctx.animateEntity(topItem.id, {
    y: topItem.position.y + 2.0,
    duration: 0.2
  });

  ctx.addTag(topItem.id, 'held');
  ctx.removeTag(topItem.id, 'in-' + containerId);

  ctx.emit('item_picked');
};

// Drop: Place item in container
exports.onDrop = function(ctx, args) {
  const targetContainer = args.containerId;
  const heldItemId = ctx.getVariable('heldItemId');

  if (!heldItemId) return;

  // Get container position
  const containerData = ctx.getEntityData(targetContainer);

  // Animate drop
  ctx.animateEntity(heldItemId, {
    x: containerData.position.x,
    y: containerData.position.y,
    duration: 0.2
  });

  ctx.removeTag(heldItemId, 'held');
  ctx.addTag(heldItemId, 'in-' + targetContainer);

  ctx.setVariable('heldItemId', '');
  ctx.setVariable('sourceContainer', '');

  ctx.emit('item_dropped');
};
`;
```

### Task 4.4: Add Script Error Reporting UI

**File:** `app/components/game/ScriptErrorOverlay.tsx`

```typescript
export function ScriptErrorOverlay({ error }: { error: ScriptErrorReport }) {
  return (
    <View style={styles.overlay}>
      <Text style={styles.title}>Script Error</Text>
      <Text style={styles.message}>{error.message}</Text>
      {error.stack && (
        <ScrollView style={styles.stack}>
          <Text style={styles.stackText}>{error.stack}</Text>
        </ScrollView>
      )}
      <Text style={styles.phase}>Phase: {error.phase}</Text>
    </View>
  );
}
```

---

## Testing Strategy

### Unit Tests

| Test | File | Coverage |
|------|------|----------|
| RunScriptActionExecutor | `__tests__/RunScriptActionExecutor.test.ts` | Script execution, arg resolution |
| ScriptContext methods | `__tests__/ScriptContext.test.ts` | Each API method |
| Expression functions | `__tests__/expressions.test.ts` | `tapTargetId()`, etc. |

### Integration Tests

| Test | Description |
|------|-------------|
| Simple script game | Load game with script, verify lifecycle hooks fire |
| Ball Sort Generic | Full playthrough, compare to hardcoded version |
| Error handling | Script syntax error, runtime error, timeout |

### Manual Testing

- [ ] Play Ball Sort Generic on web
- [ ] Play Ball Sort Generic on iOS
- [ ] Play Ball Sort Generic on Android
- [ ] Verify animations match original
- [ ] Verify win/lose conditions work
- [ ] Test edge cases (rapid tapping, etc.)

---

## File Reference

### Files to Create

| File | Purpose |
|------|---------|
| `app/lib/test-games/games/ballSortGeneric/game.ts` | Generic ball sort implementation |
| `shared/src/scripting/templates/pickup-drop.ts` | Reusable pickup/drop pattern |
| `shared/src/scripting/validation.ts` | Zod schemas for scripts |
| `shared/src/scripting/script-context.d.ts` | TypeScript declarations for AI |
| `app/components/game/ScriptErrorOverlay.tsx` | Error display UI |

### Files to Modify

| File | Changes |
|------|---------|
| `app/lib/game-engine/rules/actions/RunScriptActionExecutor.ts` | Full implementation |
| `app/lib/scripting/types.ts` | Add `animateEntity`, `getEntityData`, etc. |
| `shared/src/expressions/functions.ts` | Add `tapTargetId()`, `tapTargetIndex()` |
| `api/src/dev/templateLoader.ts` | Register `ballSortGeneric` |
| `app/lib/game-engine/GameLoader.ts` | Pass script to executor |

---

## Success Criteria

1. **Ball Sort Generic works identically to Ball Sort**
   - All gameplay mechanics function correctly
   - Animations are smooth
   - Win/lose conditions trigger properly

2. **No hardcoded Ball Sort action executor needed**
   - `BallSortActionExecutor` could be deleted (but keep for comparison)
   - All logic lives in script string

3. **API is documented and AI-friendly**
   - TypeScript declarations available
   - Example scripts documented
   - Error messages are helpful

4. **Performance is acceptable**
   - Script execution < 1ms per call
   - No frame drops during gameplay

---

## Timeline Estimate

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 1: Wire Up | 4-6 hours | None |
| Phase 2: APIs | 4-6 hours | Phase 1 |
| Phase 3: Ball Sort | 6-8 hours | Phase 2 |
| Phase 4: AI Ready | 4-6 hours | Phase 3 |
| **Total** | **~2-3 days** | |

---

## Next Steps

1. Start with **Task 1.1** - implement RunScriptActionExecutor
2. Write a simple test script to verify execution works
3. Proceed through phases in order
4. Create ballSortGeneric as the proving ground
5. Document everything for AI consumption
