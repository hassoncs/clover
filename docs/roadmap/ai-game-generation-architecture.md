# AI Game Generation Architecture

## The Vision

User clicks "Create Game" → enters prompt → AI generates complete game → game runs immediately in the engine.

No build step. No deploy. Instant playable game.

---

## Current State vs Target State

### Current State (Local Dev)
```
Developer writes:
├── game.ts (TypeScript)
│   └── GameDefinition with script as template string literal
├── Script embedded as `const SCRIPT = \`...\``
│   └── No IDE support, escape hell, no type checking
├── Build time: bundled with app
└── Runtime: EvalSandbox executes script
```

### Target State (Production)
```
User enters prompt:
├── "Create a ball sorting puzzle game with 4 colors"
│
AI generates:
├── GameDefinition (JSON)
│   ├── metadata, world, prefabs, entities
│   └── (No rules/behaviors/script string)
│
Compilation & Packaging:
├── Scripts compiled into content-hashed chunks
├── GamePackageManifest generated:
│   ├── version: "1.0"
│   ├── contentHash: SHA-256 of manifest
│   ├── entrypoint: "main" module
│   ├── chunks: [ { name, filename: "chunk-hash.js", hash, size } ]
│   └── gameDefinition: Complete JSON
│
Storage (R2/S3):
├── manifest.json
└── chunks/chunk-hash.js (Immutable)
│
Runtime:
├── Load manifest.json
├── Resolve and fetch required chunks
├── Initialize ScriptSandbox with module map
└── ScriptSandboxRuntimeSystem executes hooks
```

## Authoring vs. Publishing Models

### Authoring (Loose-File)
- **Format**: Individual `.ts` and `.json` files in a workspace directory.
- **Loading**: `GameLoader` reads files from the workspace, compiles scripts on the fly (via `EvalSandbox` or `QuickJSSandbox`).
- **Development**: Supports hot-reloading. Changes to any file trigger a refresh of the sandbox and state.
- **Precedence**: Local workspace files always override cached artifacts.

### Publishing (Manifest + Chunks)
- **Format**: A single `GamePackageManifest` JSON file and multiple `.js` script chunks.
- **Deterministic**: Chunks are named by content hash (`chunk-{first12charsOfSHA256}.js`). Identical code always produces the same filename.
- **Modular**: The `entrypoint` identifies the starting module (default: "main").
- **Efficient**: Only required chunks are loaded. Immutable chunks can be aggressively cached.
- **Registry**: `ScriptModuleMap` (`Record<string, string>`) maps module names to their source code at the bundle section layer.

---

## Key Architectural Decisions

### 1. AI Generates JavaScript, Not TypeScript

**Why:** No build step in production. The sandbox (QuickJS or eval) executes JavaScript directly.

**TypeScript is only for local development DX.** When developing test games locally, we write TypeScript for IDE support, but it compiles to JavaScript that gets bundled.

### 2. Script Lives in `GameDefinition.script`

```typescript
interface GameDefinition {
  // ... other fields
  script?: string;  // JavaScript code as a string
}
```

**The `run_script` action just references function names:**
```typescript
// Current (redundant)
{ type: "run_script", script: BALL_SORT_SCRIPT, export: "onPickup" }

// Fixed (uses definition.script automatically)
{ type: "run_script", export: "onPickup" }
```

### 3. Two Sandboxes, One Interface

| Sandbox | Use Case | Security | Performance |
|---------|----------|----------|-------------|
| EvalSandbox | Local dev, trusted code | None (uses eval) | Fast |
| QuickJSSandbox | Production, AI-generated | Full WASM isolation | Slower but safe |

Both implement the same interface. Production uses QuickJS for safety.

### 4. Validation at Generation Time, Not Runtime

Validate once when AI generates the game:
1. JSON structure (Zod schema)
2. Script syntax (try to parse)
3. Required exports exist
4. Basic sanity checks

Don't re-validate every time the game loads—it was already validated.

---

## The Three Environments

### Environment 1: Local Development (TypeScript)

**Goal:** Best possible DX for developers writing test games.

```
ballSortScripted/
├── game.ts          # GameDefinition, imports script
├── script.ts        # Full TypeScript with IDE support
└── script.d.ts      # Type declarations (or import from shared)
```

**script.ts example:**
```typescript
import type { ScriptContext } from '@/lib/scripting/types';

export function onPickup(ctx: ScriptContext, args: { tubeIndex?: number }) {
  const tapTarget = ctx.getTapTargetId();
  const tubeIndex = args.tubeIndex ?? getTubeIndexFromEntityId(tapTarget);
  // ... full TypeScript, full autocomplete
}
```

**Build step converts script.ts → JavaScript string:**
- Option A: Use bundler's `?raw` import
- Option B: Custom script that reads + transpiles
- Option C: Runtime fs.readFileSync (Node only)

**game.ts imports the compiled script:**
```typescript
import { SCRIPT_CODE } from './script.compiled';
// or
import SCRIPT_CODE from './script.js?raw';

export function createBallSortScriptedGame(level: number): GameDefinition {
  return {
    // ...
    script: SCRIPT_CODE,
    rules: [
      {
        trigger: { type: "tap", target: "tube" },
        actions: [{ type: "run_script", export: "onPickup" }]  // No script param needed
      }
    ]
  };
}
```

### Environment 2: AI Generation (Production)

**Goal:** AI generates complete playable games from prompts.

**AI Prompt includes:**
1. ScriptContext API documentation
2. GameDefinition schema
3. Example games
4. Best practices

**AI generates:**
```json
{
  "metadata": { "id": "user-game-123", "title": "Color Sort" },
  "world": { "gravity": { "x": 0, "y": 0 }, "bounds": { "width": 14, "height": 20 } },
  "templates": { ... },
  "entities": [ ... ],
  "rules": [
    {
      "id": "pickup",
      "trigger": { "type": "tap", "target": "tube" },
      "conditions": [{ "type": "expression", "expr": "stateIs('gameFlow', 'idle')" }],
      "actions": [{ "type": "run_script", "export": "onPickup" }]
    }
  ],
  "script": "exports.onPickup = function(ctx) { ... }; exports.onDrop = function(ctx) { ... };"
}
```

**Validation Pipeline:**
```typescript
async function validateAIGeneratedGame(game: unknown): Promise<ValidationResult> {
  // 1. Structure validation
  const structureResult = GameDefinitionSchema.safeParse(game);
  if (!structureResult.success) {
    return { valid: false, errors: structureResult.error.issues };
  }

  // 2. Script syntax validation
  if (game.script) {
    try {
      new Function('exports', 'ctx', game.script);  // Parse without executing
    } catch (e) {
      return { valid: false, errors: [{ code: 'SCRIPT_SYNTAX', message: e.message }] };
    }
  }

  // 3. Required exports check
  const requiredExports = extractRequiredExports(game.rules);
  const scriptExports = extractScriptExports(game.script);
  const missing = requiredExports.filter(e => !scriptExports.includes(e));
  if (missing.length > 0) {
    return { valid: false, errors: [{ code: 'MISSING_EXPORTS', message: `Missing: ${missing.join(', ')}` }] };
  }

  // 4. Optional: Dry run with mock context
  // ...

  return { valid: true };
}
```

**Storage:**
```sql
-- games table
id: uuid
user_id: uuid
title: text
definition: text  -- JSON string containing everything including script
created_at: timestamp
```

### Environment 3: Runtime (Both)

**Same path for local dev and production:**

```typescript
// In GameRuntime initialization
if (definition.script) {
  // Create sandbox (QuickJS in prod, Eval in dev)
  const sandbox = new ScriptSandbox({
    scriptCode: definition.script,
    scriptId: definition.metadata.id,
    gameId: definition.metadata.id,
  });
  await sandbox.initialize();

  // Connect to rules system
  rulesSystem.setScriptSandbox(sandbox);
}

// When run_script action executes
class RunScriptActionExecutor {
  execute(action: RunScriptAction, context: RuleContext): void {
    // action.export is the function name (e.g., "onPickup")
    // script code comes from definition.script (already in sandbox)
    const result = this.sandbox.callFunction(
      this.createRuntimeContext(context),
      action.export ?? 'default',
      action.args
    );
  }
}
```

---

## Implementation Phases

### Phase 1: Fix Current Pain Points (This PR)

1. **Fix run_script redundancy**
   - Remove `script` param from RunScriptAction
   - Use `definition.script` automatically
   - Update Zod schema

2. **Extract shared runtime context**
   - Create `createSandboxRuntimeContext(ruleContext)` utility
   - Use in both RunScriptActionExecutor and ScriptSandboxRuntimeSystem

3. **Add missing APIs**
   - `animateEntity` in ScriptSandboxRuntimeSystem
   - `schedule()` for delayed callbacks
   - `getTapTargetId()` convenience method

4. **Clean up ballSortScripted**
   - Move script to separate file
   - Proper TypeScript with types

### Phase 2: Local Dev TypeScript Support

1. **Create ScriptContext types package**
   ```
   shared/src/scripting/
   ├── ScriptContext.ts      # Interface definition
   ├── ScriptHelpers.ts      # Helper functions for scripts
   └── index.ts              # Exports
   ```

2. **Build script compilation**
   - Script files: `*.script.ts`
   - Build step: transpile to JS, output as string constant
   - Or use Vite's `?raw` for simpler approach

3. **Update ballSortScripted**
   ```
   ballSortScripted/
   ├── game.ts           # Imports compiled script
   ├── script.ts         # TypeScript with full IDE support
   └── script.compiled.ts # Generated: export const SCRIPT = "..."
   ```

### Phase 3: Production AI Pipeline

1. **API endpoint: POST /api/games/generate**
   - Input: prompt string
   - Output: validated GameDefinition

2. **AI prompt engineering**
   - Include ScriptContext API docs
   - Include GameDefinition schema
   - Include example games
   - Include common patterns library

3. **Validation pipeline**
   - Zod schema validation
   - Script syntax checking
   - Export verification
   - Optional dry run

4. **Storage and retrieval**
   - Save to games table
   - Load endpoint returns definition
   - Client parses and runs

### Phase 4: Security Hardening

1. **QuickJS sandbox for production**
   - Fix WASM issues
   - Memory limits
   - Instruction limits
   - Timeout handling

2. **Script allowlist**
   - Only approved APIs in ScriptContext
   - No access to window, document, fetch, etc.
   - No infinite loops (instruction limit)

3. **Rate limiting**
   - AI generation rate limits
   - Script execution time limits

---

## ScriptContext API (Full Reference)

This is what AI needs to know to generate scripts:

```typescript
interface ScriptContext {
  // === Variables ===
  getVariable(name: string): unknown;
  setVariable(name: string, value: unknown): void;
  getConstant(name: string): number | string | boolean | undefined;

  // === Events ===
  emit(eventName: string, data?: Record<string, unknown>): void;
  win(): void;
  lose(): void;

  // === Entities ===
  spawnEntity(templateId: string, position: Vec2, opts?: SpawnOptions): string | null;
  destroyEntity(entityId: string): void;
  getEntityPosition(entityId: string): Vec2 | null;
  setEntityPosition(entityId: string, position: Vec2): void;
  getEntityVelocity(entityId: string): Vec2 | null;
  setEntityVelocity(entityId: string, velocity: Vec2): void;
  applyImpulse(entityId: string, impulse: Vec2): void;
  getEntityData(entityId: string): EntityData | null;
  queryEntities(query?: EntityQuery): string[];
  queryEntitiesWithData(query?: EntityQuery): EntityData[];

  // === Tags ===
  getEntityTags(entityId: string): string[];
  addTag(entityId: string, tag: string): void;
  removeTag(entityId: string, tag: string): boolean;
  hasTag(entityId: string, tag: string): boolean;

  // === Animation ===
  animateEntity(entityId: string, config: AnimateConfig): void;

  // === Scheduling ===
  schedule(delaySeconds: number, callback: () => void): void;
  scheduleSetVariable(delaySeconds: number, name: string, value: unknown): void;

  // === Input ===
  getTapTargetId(): string | null;
  getInput(): InputSnapshot | null;
  getMouse(): Vec2 | null;
  getDrag(): DragSnapshot | null;

  // === Utilities ===
  random(): number;
  randomInt(min: number, max: number): number;
  randomChoice<T>(array: T[]): T;
  clamp(value: number, min: number, max: number): number;
  lerp(a: number, b: number, t: number): number;
  distance(a: Vec2, b: Vec2): number;

  // === Frame Info ===
  readonly frameId: number;
  readonly elapsed: number;
  readonly dt: number;
}
```

---

## Example: AI-Generated Ball Sort

**User prompt:** "Create a ball sorting puzzle game with 4 colors and 6 tubes"

**AI generates:**

```json
{
  "metadata": {
    "id": "ball-sort-4color",
    "title": "Ball Sort Puzzle",
    "description": "Sort the colored balls into tubes",
    "version": "1.0.0"
  },
  "world": {
    "gravity": { "x": 0, "y": 0 },
    "bounds": { "width": 14, "height": 20 }
  },
  "variables": {
    "heldBallId": "",
    "sourceTubeIndex": -1,
    "moveCount": 0
  },
  "stateMachines": [
    {
      "id": "gameFlow",
      "initialState": "idle",
      "states": [{ "id": "idle" }, { "id": "holding" }],
      "transitions": [
        { "id": "pickup", "from": "idle", "to": "holding", "trigger": { "type": "event", "eventName": "ball_picked" } },
        { "id": "drop", "from": "holding", "to": "idle", "trigger": { "type": "event", "eventName": "ball_dropped" } }
      ]
    }
  ],
  "templates": {
    "tube": { /* ... */ },
    "ball0": { /* ... */ },
    "ball1": { /* ... */ },
    "ball2": { /* ... */ },
    "ball3": { /* ... */ }
  },
  "entities": [
    /* tubes and balls */
  ],
  "rules": [
    {
      "id": "tap_idle",
      "trigger": { "type": "tap", "target": "tube" },
      "conditions": [{ "type": "expression", "expr": "stateIs('gameFlow', 'idle')" }],
      "actions": [{ "type": "run_script", "export": "onPickup" }]
    },
    {
      "id": "tap_holding",
      "trigger": { "type": "tap", "target": "tube" },
      "conditions": [{ "type": "expression", "expr": "stateIs('gameFlow', 'holding')" }],
      "actions": [{ "type": "run_script", "export": "onDrop" }]
    },
    {
      "id": "check_win",
      "trigger": { "type": "event", "eventName": "ball_dropped" },
      "actions": [{ "type": "run_script", "export": "checkWin" }]
    }
  ],
  "script": "exports.onPickup = function(ctx) { var targetId = ctx.getTapTargetId(); var tubeIndex = parseInt(targetId.split('-')[1]); /* ... */ ctx.emit('ball_picked'); }; exports.onDrop = function(ctx) { /* ... */ ctx.emit('ball_dropped'); }; exports.checkWin = function(ctx) { /* ... */ if (won) ctx.win(); };"
}
```

---

## Summary

| Aspect | Local Dev | Production |
|--------|-----------|------------|
| Script Language | TypeScript | JavaScript |
| Build Step | Yes (tsc) | No |
| Storage | File system | Database |
| Sandbox | EvalSandbox | QuickJSSandbox |
| Validation | TypeScript compiler | Zod + syntax check |
| Author | Developer | AI |

The key insight: **TypeScript is a developer luxury, not a runtime requirement.** The actual execution path is JavaScript strings through a sandbox. We just make the authoring experience nice for developers while keeping the runtime simple for AI-generated code.
