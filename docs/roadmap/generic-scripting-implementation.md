# Generic Scripting System Implementation Plan

**Goal:** Enable AI-generated games by completing the scripting infrastructure so games like Ball Sort can be implemented entirely via scripts without hardcoded action executors.

**Status:** ✅ COMPLETE (Feb 2026)

---

## Final Architecture

### Script-First Model
The engine has transitioned to a **Script-First** model. Game logic is now implemented in standalone JavaScript modules.

### Key Components
1. **`ScriptSandbox`**: Executes modules in a secure environment (QuickJS in production, Eval in dev).
2. **`scriptRef`**: Field on `EntityPrefab` and `GameEntity` that points to a module key.
3. **`ScriptContext`**: The API provided to scripts (hooks: `onStart`, `onUpdate`, `onInput`, `onCollision`).
4. **Manifest-Based Publishing**: Games are published as a `manifest.json` referencing content-hashed script chunks.

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
│  • Log capture, error reporting, hot reload                   │  │
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

### What's Broken/Missing

| Component | Location | Issue |
|-----------|----------|-------|
| animateEntity API | - | ❌ Not exposed to scripts |
| Entity data queries | - | ⚠️ Only returns IDs, not full data |
| Scheduling API | - | ⚠️ setTimeout breaks outside game loop |

---

## Target State

After implementation, we should be able to:

1. **Define game scripts in GameDefinition:**
```typescript
const game: GameDefinition = {
  script: `
    exports.onUpdate = function(ctx, dt) {
      // Custom game logic here
    };
  `,
};
```

2. **Have scripts access full game engine capabilities:**
   - Entity queries with position/tags/prefab data
   - Smooth animations via `animateEntity()`
   - Event emission and variable management
   - Win/lose triggering

3. **Create `ballSortGeneric` test game** that works identically to current ball sort but uses only scripts

---

## Implementation Tasks

### Overview

```
Phase 1: Wire Up Script Execution (4-6 hours)
├── Task 1.1: Implement ScriptSandboxRuntimeSystem
└── Task 1.3: Add basic integration test

Phase 2: Add Missing APIs (4-6 hours)
├── Task 2.1: Add animateEntity() to ScriptContext
├── Task 2.2: Add getEntityData() / queryEntitiesWithData()
└── Task 2.4: Add getElapsed() to ScriptContext

Phase 3: Ball Sort Generic (6-8 hours)
├── Task 3.1: Create ballSortGeneric game definition
├── Task 3.2: Write pickup/drop/win scripts
├── Task 3.3: Validate feature parity with hardcoded version
└── Task 3.4: Clean up and document

Phase 4: AI Generation Ready (4-6 hours)
├── Task 4.1: Add Zod schemas for script validation
├── Task 4.2: Create TypeScript declaration file for AI
├── Task 4.3: Build script prefabs library
└── Task 4.4: Add script error reporting UI
```

---

## Phase 1: Wire Up Script Execution

### Task 1.1: Implement ScriptSandboxRuntimeSystem

**File:** `app/lib/game-engine/systems/runner/wrappers/ScriptSandboxRuntimeSystem.ts`

### Task 1.3: Add Basic Integration Test

**File:** `app/lib/game-engine/systems/runner/wrappers/__tests__/ScriptSandboxRuntimeSystem.test.ts`

```typescript
describe('ScriptSandboxRuntimeSystem', () => {
  it('should execute a simple script that sets a variable', () => {
    // ...
  });
});
```

---

## Phase 2: Add Missing APIs

### Task 2.1: Add animateEntity() to ScriptContext

**Files to modify:**
- `app/lib/scripting/types.ts` - Add type
- `app/lib/scripting/GameScriptAPI.ts` - Implement

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

### Task 2.2: Add getEntityData() and queryEntitiesWithData()

**Add to ScriptContext interface:**
```typescript
interface EntityData {
  id: string;
  tags: string[];
  position: { x: number; y: number };
  prefab?: string;
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
- Uses the same entities, prefabs, and layout as current ball sort
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
  };
}

const BALL_SORT_SCRIPT = `
exports.onInput = function(ctx, event) {
  if (event.type === 'tap') {
    // ...
  }
};
`;
```

### Task 3.2: Register in Prefab Loader

**File:** `api/src/dev/prefabLoader.ts`

```typescript
const GAME_REGISTRY: Record<string, () => Promise<GameModule>> = {
  ballSort: () => import('../../../app/lib/test-games/games/ballSort/game'),
  ballSortGeneric: () => import('../../../app/lib/test-games/games/ballSortGeneric/game'),
  // ... other games
};
```

### Task 3.3: Validate Feature Parity

Create a test checklist:

- [ ] Tap tube → ball lifts up
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
  onInput: z.function().optional(),
  onCollision: z.function().optional(),
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
  prefab?: string;
}
```

### Task 4.3: Build Script Prefabs Library

**File:** `shared/src/scripting/prefabs/`

Create reusable script patterns:

```typescript
// prefabs/pickup-drop.ts
export const PICKUP_DROP_PREFAB = `
// ...
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
| ScriptSandboxRuntimeSystem | `__tests__/ScriptSandboxRuntimeSystem.test.ts` | Script execution, hook dispatch |
| ScriptContext methods | `__tests__/ScriptContext.test.ts` | Each API method |

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
| `shared/src/scripting/prefabs/pickup-drop.ts` | Reusable pickup/drop pattern |
| `shared/src/scripting/validation.ts` | Zod schemas for scripts |
| `shared/src/scripting/script-context.d.ts` | TypeScript declarations for AI |
| `app/components/game/ScriptErrorOverlay.tsx` | Error display UI |

### Files to Modify

| File | Changes |
|------|---------|
| `app/lib/game-engine/systems/runner/wrappers/ScriptSandboxRuntimeSystem.ts` | Full implementation |
| `app/lib/scripting/types.ts` | Add `animateEntity`, `getEntityData`, etc. |
| `api/src/dev/prefabLoader.ts` | Register `ballSortGeneric` |
| `app/lib/game-engine/GameLoader.ts` | Pass script to sandbox |

---

## Success Criteria

1. **Ball Sort Generic works identically to Ball Sort**
   - All gameplay mechanics function correctly
   - Animations are smooth
   - Win/lose conditions trigger properly

2. **No hardcoded Ball Sort logic needed**
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

1. Start with **Task 1.1** - implement ScriptSandboxRuntimeSystem
2. Write a simple test script to verify execution works
3. Proceed through phases in order
4. Create ballSortGeneric as the proving ground
5. Document everything for AI consumption
