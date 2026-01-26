# AI Code Generation System Architecture

**Status**: 📋 Design Document (Not Implemented)  
**Created**: 2026-01-25  
**Purpose**: Future reference for extending Slopcade's behavior system with AI-generated TypeScript code

---

## Executive Summary

This document describes an architecture for allowing AI models to generate custom TypeScript behaviors that extend Slopcade's JSON-based game engine. The system uses a **RAG-enhanced library-first approach** where validated behaviors are cached and reused, reducing AI generation costs and improving quality over time.

**Key Characteristics**:
- 🎯 **Target Audience**: Ages 6-14, "TikTok of toy games" (fun, experimental, low stakes)
- 🔒 **Sandboxing**: QuickJS-based isolated execution (no network, whitelisted APIs)
- 📚 **Library-First**: RAG lookup before generation (ever-growing validated behavior library)
- ⚡ **Performance**: < 100ms for library hits, 3-8s for first-time generation
- 🔄 **Integration**: Runs alongside existing JSON behaviors in BehaviorExecutor
- 💰 **Cost**: Pay-per-generation model, cached behaviors free

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Technical Constraints](#technical-constraints)
3. [Architecture Overview](#architecture-overview)
4. [Database Schema](#database-schema)
5. [Sandboxing Strategy](#sandboxing-strategy)
6. [Entity System Integration](#entity-system-integration)
7. [API Contracts](#api-contracts)
8. [User Flow](#user-flow)
9. [Implementation Phases](#implementation-phases)
10. [Security Considerations](#security-considerations)
11. [Cost Analysis](#cost-analysis)
12. [Future Enhancements](#future-enhancements)

**Appendices**:
- [Appendix A: Example Behaviors](#appendix-a-example-behaviors)
- [Appendix B: Prompt Engineering Tips](#appendix-b-prompt-engineering-tips)
- [Appendix C: Migration Guide](#appendix-c-migration-guide)
- [Appendix D: Card Game Primitives](#appendix-d-card-game-primitives) ← NEW

---

## Problem Statement

### Current Limitation

Slopcade's behavior system is **declarative and JSON-based**:
- Behaviors are predefined TypeScript types (see `shared/src/types/behavior.ts`)
- 30+ behavior types exist (move, rotate, spawn_on_event, etc.)
- AI can only compose existing behaviors, not create new ones
- When user requests novel logic, AI must map to existing primitives

**Example Gap**:
- User: "I want a Fibonacci spiral movement pattern"
- Current System: ❌ No behavior exists for this
- AI workaround: ⚠️ Approximate with `oscillate` + `rotate` (imprecise)
- Desired: ✅ AI writes custom `fibonacci_spiral` behavior code

### Proposed Solution

**Extend the system with a "Custom Code Behaviors" tier**:
1. User describes behavior in natural language
2. AI generates TypeScript code (or finds cached version)
3. Server validates code (compilation + static analysis + test run)
4. Client executes code in sandboxed QuickJS environment
5. If successful, code is saved to library for future reuse

---

## Technical Constraints

### React Native / Hermes Constraints

**Critical Finding**: Hermes engine does NOT support `eval()` or `new Function()` in production builds.

| Approach | Works in Debug? | Works in Release? | Notes |
|----------|-----------------|-------------------|-------|
| `eval(code)` | ✅ Yes | ❌ No | Hermes uses AOT compilation to bytecode |
| `new Function(code)` | ✅ Yes | ❌ No | No runtime parser in production |
| QuickJS sandbox | ✅ Yes | ✅ Yes | Separate JS engine via JSI/WebAssembly |
| Structured IR (JSON) | ✅ Yes | ✅ Yes | Parse and interpret, no eval needed |

**Decision**: Use **QuickJS** (`react-native-quickjs` or `quickjs-emscripten`) for full JavaScript execution in production.

### Performance Constraints

- **Mobile Target**: iOS/Android devices (limited CPU/memory vs desktop)
- **Frame Budget**: 60 FPS = 16.67ms per frame
- **Behavior Execution**: Must complete in < 5ms per entity per frame
- **Sandbox Overhead**: QuickJS adds ~1-2ms overhead crossing bridge

### Security Constraints

- **No Network Access**: Behaviors cannot fetch external data
- **No Device APIs**: No access to camera, location, contacts, etc.
- **No File System**: Cannot read/write arbitrary files
- **Whitelist-Only**: Only expose specific game APIs (entity, physics, input)
- **Resource Limits**: 64MB memory, 50ms execution timeout

---

## Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT (React Native)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ UI Layer                                                  │   │
│  │  - BehaviorGenerateModal.tsx (like AssetGallery)         │   │
│  │  - useBehaviorGeneration hook (polling, like assets)     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ tRPC Client                                               │   │
│  │  - generateBehavior.mutate({ prompt, gameContext })      │   │
│  │  - getBehaviorJob.query({ jobId }) (polling)             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Game Engine Integration                                   │   │
│  │  - BehaviorExecutor (existing, handles all behaviors)    │   │
│  │  - CustomBehaviorExecutor (NEW, QuickJS sandbox)         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ QuickJS Sandbox (NEW)                                     │   │
│  │  - react-native-quickjs (JSI-based, 500KB binary)        │   │
│  │  - Isolated JS engine (separate from Hermes)             │   │
│  │  - Memory limit: 64MB, Timeout: 50ms                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                               ↕ tRPC over HTTPS
┌─────────────────────────────────────────────────────────────────┐
│                SERVER (Cloudflare Workers)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ tRPC Router: behaviorSystem.ts                            │   │
│  │  - generate(prompt, gameContext) → Job                   │   │
│  │  - getJob(jobId) → JobStatus                             │   │
│  │  - searchLibrary(query) → Behavior[]                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ BehaviorLibraryService (NEW)                              │   │
│  │  1. RAG Lookup (Vectorize search)                        │   │
│  │  2. AI Generation (OpenRouter GPT-4o)                    │   │
│  │  3. Validation (TypeScript + isolated-vm)                │   │
│  │  4. Library Storage (D1 + Vectorize)                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Storage                                                   │   │
│  │  - D1 Database (behavior_library, jobs, usage_log)       │   │
│  │  - Vectorize (embeddings for RAG)                        │   │
│  │  - isolated-vm (server-side validation sandbox)          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ External APIs                                             │   │
│  │  - OpenRouter (GPT-4o for code generation)               │   │
│  │  - OpenRouter (text-embedding-3-small for RAG)           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow: Generation Request

```
1. User types prompt: "Player bounces higher after each jump"
   ↓
2. Client: generateBehavior.mutate({ prompt, gameId, gameContext })
   ↓
3. Server: BehaviorLibraryService.findOrGenerate()
   ↓
4a. RAG LOOKUP (Fast Path)
    - Embed prompt → vector
    - Search Vectorize (top 3 matches)
    - If similarity > 0.85 → Return cached code (< 100ms)
   ↓
4b. AI GENERATION (Slow Path, if no cache hit)
    - Call GPT-4o with system prompt + user prompt + game context
    - Receive TypeScript code
    - Validate: TypeScript compile → Static analysis → Test run in isolated-vm
    - If valid: Save to D1 + Vectorize, return code
    - If invalid: Retry (max 3 attempts) with error feedback
   ↓
5. Client: Polling getBehaviorJob.query({ jobId })
   - Check status every 2 seconds
   - When status === "completed" → Receive code
   ↓
6. Client: Apply behavior to game entity
   - Add { type: "custom_code", code: "..." } to entity.behaviors
   ↓
7. Runtime: BehaviorExecutor sees "custom_code" behavior
   - Delegate to CustomBehaviorExecutor
   - Execute in QuickJS sandbox (each frame)
   - Apply results back to entity
```

---

## Database Schema

### Cloudflare D1 Tables

#### `behavior_library`

**Purpose**: Store validated, reusable behavior code snippets

```sql
CREATE TABLE behavior_library (
  -- Identity
  id TEXT PRIMARY KEY,                    -- uuid (e.g., "b3d4f5a6-...")
  name TEXT NOT NULL,                     -- Slug from prompt (e.g., "progressive_jump_boost")
  
  -- Content
  description TEXT NOT NULL,              -- Original user prompt for RAG matching
  code TEXT NOT NULL,                     -- Validated TypeScript code
  
  -- RAG Integration
  embedding_id TEXT NOT NULL,             -- Reference to Vectorize embedding
  
  -- Metadata
  validation_status TEXT NOT NULL         -- "validated" | "deprecated" | "flagged"
    CHECK (validation_status IN ('validated', 'deprecated', 'flagged')),
  usage_count INTEGER DEFAULT 0,          -- How many times this was used
  success_rate REAL DEFAULT 1.0,          -- User feedback: successes / total uses
  
  -- Provenance
  created_at INTEGER NOT NULL,            -- Unix timestamp
  created_by TEXT,                        -- User ID (null if system-generated)
  source TEXT DEFAULT 'ai_generated'      -- "ai_generated" | "manual" | "template"
    CHECK (source IN ('ai_generated', 'manual', 'template')),
  
  -- Categorization
  tags TEXT,                              -- JSON array: ["movement", "jump", "progressive"]
  complexity TEXT DEFAULT 'simple'        -- "simple" | "moderate" | "complex"
    CHECK (complexity IN ('simple', 'moderate', 'complex')),
  
  -- Version tracking (for future updates)
  version INTEGER DEFAULT 1,
  superseded_by TEXT                      -- FK to newer version (if deprecated)
);

-- Indexes for performance
CREATE INDEX idx_behavior_library_status ON behavior_library(validation_status);
CREATE INDEX idx_behavior_library_usage ON behavior_library(usage_count DESC);
CREATE INDEX idx_behavior_library_created ON behavior_library(created_at DESC);
CREATE INDEX idx_behavior_library_embedding ON behavior_library(embedding_id);
```

#### `behavior_generation_jobs`

**Purpose**: Track async behavior generation requests (polling pattern)

```sql
CREATE TABLE behavior_generation_jobs (
  -- Identity
  id TEXT PRIMARY KEY,                    -- uuid (job ID)
  user_id TEXT NOT NULL,                  -- Who requested this
  game_id TEXT,                           -- Optional: link to specific game
  
  -- Request
  prompt TEXT NOT NULL,                   -- User's natural language request
  game_context TEXT,                      -- JSON: current game state (entities, template, etc.)
  
  -- Status
  status TEXT NOT NULL                    -- "pending" | "generating" | "validating" | "completed" | "failed"
    CHECK (status IN ('pending', 'generating', 'validating', 'completed', 'failed')),
  attempts INTEGER DEFAULT 0,             -- Retry counter (max 3)
  
  -- Result (populated on completion)
  library_hit_id TEXT,                    -- FK to behavior_library.id (if RAG found match)
  generated_code TEXT,                    -- If new generation (before validation)
  final_behavior_id TEXT,                 -- FK to behavior_library.id (validated)
  
  -- Error tracking
  error_message TEXT,                     -- If failed, what went wrong
  error_type TEXT,                        -- "validation" | "timeout" | "api_error"
  
  -- Timing
  created_at INTEGER NOT NULL,            -- Unix timestamp
  started_at INTEGER,                     -- When generation began
  completed_at INTEGER,                   -- When finished (success or failure)
  
  -- Cost tracking (optional)
  ai_tokens_used INTEGER,                 -- For billing/analytics
  estimated_cost_usd REAL                 -- Rough cost estimate
);

-- Indexes
CREATE INDEX idx_jobs_user_created ON behavior_generation_jobs(user_id, created_at DESC);
CREATE INDEX idx_jobs_status ON behavior_generation_jobs(status);
CREATE INDEX idx_jobs_game ON behavior_generation_jobs(game_id);
```

#### `behavior_usage_log`

**Purpose**: Track how behaviors perform in real games (feedback loop)

```sql
CREATE TABLE behavior_usage_log (
  -- Identity
  id TEXT PRIMARY KEY,                    -- uuid
  behavior_id TEXT NOT NULL,              -- FK to behavior_library.id
  user_id TEXT NOT NULL,
  game_id TEXT,                           -- Optional: which game used this
  
  -- Outcome
  success BOOLEAN NOT NULL,               -- Did it work as expected?
  execution_time_ms REAL,                 -- Performance metric (per frame avg)
  error_occurred BOOLEAN DEFAULT FALSE,   -- Did it crash/throw?
  error_message TEXT,                     -- If error, what happened
  
  -- User feedback (optional)
  user_rating INTEGER,                    -- 1-5 stars (if we add rating UI)
  feedback TEXT,                          -- Free-form text
  
  -- Context
  device_platform TEXT,                   -- "ios" | "android" | "web"
  app_version TEXT,                       -- For tracking regressions
  
  -- Timing
  created_at INTEGER NOT NULL             -- Unix timestamp
);

-- Indexes
CREATE INDEX idx_usage_behavior ON behavior_usage_log(behavior_id);
CREATE INDEX idx_usage_success ON behavior_usage_log(success);
CREATE INDEX idx_usage_user ON behavior_usage_log(user_id);
```

#### `behavior_library_metadata`

**Purpose**: Additional categorization and discoverability (future: browse library UI)

```sql
CREATE TABLE behavior_library_metadata (
  behavior_id TEXT PRIMARY KEY,           -- FK to behavior_library.id
  
  -- Categorization
  category TEXT,                          -- "movement" | "combat" | "puzzle" | "visual"
  subcategory TEXT,                       -- "jump" | "dash" | "projectile" | etc.
  
  -- Complexity analysis
  lines_of_code INTEGER,                  -- Code length (rough complexity)
  cyclomatic_complexity INTEGER,          -- AST analysis (if/else/loop count)
  api_calls_used TEXT,                    -- JSON array: APIs this code uses
  
  -- Example usage
  example_prompt TEXT,                    -- Good example of when to use this
  compatible_templates TEXT,              -- JSON array: game templates this works with
  
  -- Quality signals
  curator_approved BOOLEAN DEFAULT FALSE, -- Manual review flag
  featured BOOLEAN DEFAULT FALSE,         -- Show in "Popular Behaviors" UI
  
  updated_at INTEGER
);
```

### Cloudflare Vectorize Index

**Purpose**: Semantic search for behavior descriptions (RAG lookup)

```typescript
// Vectorize index configuration
const BEHAVIOR_VECTORIZE_INDEX = {
  name: 'behavior-embeddings',
  dimensions: 1536,              // text-embedding-3-small output size
  metric: 'cosine',              // Similarity metric
  metadata_schema: {
    prompt: 'string',            // Original prompt (for debugging)
    behavior_id: 'string',       // FK to behavior_library.id
    tags: 'string[]',            // Searchable tags
    created_at: 'number',        // Timestamp
  }
};
```

**Embedding Storage**:
- Each validated behavior gets an embedding via OpenRouter's `text-embedding-3-small`
- Embedding is stored in Vectorize with metadata
- `embedding_id` in D1 links to Vectorize record

**Search Query**:
```typescript
// User prompt: "Player bounces higher after each jump"
const userEmbedding = await embed(userPrompt);

const results = await vectorize.query({
  vector: userEmbedding,
  topK: 3,                       // Get top 3 matches
  filter: {
    validation_status: 'validated', // Only search approved behaviors
  },
  returnMetadata: true,
});

// results.matches[0].score > 0.85 → Use cached behavior
// results.matches[0].score < 0.85 → Generate new behavior
```

---

## Sandboxing Strategy

### Why QuickJS?

| Requirement | Solution |
|-------------|----------|
| **Works in Production** | ✅ QuickJS works with Hermes (separate engine) |
| **Memory Isolation** | ✅ QuickJS can set hard memory limits (64MB) |
| **Execution Timeout** | ✅ QuickJS supports max execution time (50ms) |
| **API Whitelisting** | ✅ Only inject specific globals (no require/import) |
| **No Network Access** | ✅ Fetch/XHR not available in sandbox |
| **Performance** | ✅ QuickJS is ~1-2ms overhead per frame (acceptable) |

### QuickJS Integration Options

#### Option 1: `react-native-quickjs` (Recommended)

**Pros**:
- JSI-based (fast bridge, minimal overhead)
- Native C++ integration
- Maintained by Margelo (production-ready)

**Cons**:
- Adds ~500KB to binary size
- Requires native module (no Expo Go support, need dev build)

```typescript
import { QuickJS } from 'react-native-quickjs';

const sandbox = await QuickJS.create({
  memoryLimit: 64 * 1024 * 1024, // 64MB
  timeout: 50,                    // 50ms
});

sandbox.setGlobal('entity', entityData);
sandbox.setGlobal('context', contextAPI);

const result = await sandbox.eval(behaviorCode);
sandbox.dispose();
```

#### Option 2: `quickjs-emscripten` (Fallback)

**Pros**:
- Pure JavaScript/WebAssembly (works in Expo Go)
- Cross-platform (web, native)
- No native dependencies

**Cons**:
- Slower than JSI (WASM overhead)
- Larger bundle size (~1MB)

```typescript
import { getQuickJS } from 'quickjs-emscripten';

const QuickJS = await getQuickJS();
const vm = QuickJS.newContext();

const entityHandle = vm.newObject();
vm.setProp(entityHandle, 'x', vm.newNumber(entity.x));
// ... set more properties

const resultHandle = vm.evalCode(behaviorCode);
const result = vm.unwrapResult(resultHandle).consume(vm.dump);

vm.dispose();
```

**Recommendation**: Start with **Option 1** (`react-native-quickjs`) for best performance.

### Sandbox Security Layers

#### Layer 1: Static Analysis (Server-Side, Pre-Execution)

Before code ever reaches the client, validate it on the server:

```typescript
// api/src/ai/validators/code-validator.ts
export async function validateBehaviorCode(code: string): Promise<void> {
  // 1. TypeScript Compilation
  const ts = require('typescript');
  const result = ts.transpileModule(code, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      strict: true,
      noImplicitAny: true,
    },
  });

  if (result.diagnostics?.length > 0) {
    throw new ValidationError('TypeScript compilation failed', result.diagnostics);
  }

  // 2. Forbidden Keywords/Patterns
  const FORBIDDEN = [
    // Module system
    'require', 'import', 'export', 'module.exports',
    // Code execution
    'eval', 'Function', 'setTimeout', 'setInterval',
    // Network
    'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource',
    // Node.js globals
    'process', 'global', '__dirname', '__filename', 'child_process',
    // Storage
    'localStorage', 'sessionStorage', 'IndexedDB', 'openDatabase',
    // Reflection (potential escape)
    'Reflect.construct', 'Proxy',
  ];

  for (const keyword of FORBIDDEN) {
    if (code.includes(keyword)) {
      throw new ValidationError(`Forbidden keyword: ${keyword}`);
    }
  }

  // 3. AST Analysis (detect obfuscation)
  const ast = parseTypeScript(code);
  
  // Check for suspicious patterns
  if (hasNestedFunctionCalls(ast, 10)) {
    throw new ValidationError('Code too complex (deep nesting)');
  }
  
  if (hasLargeArrayLiterals(ast, 1000)) {
    throw new ValidationError('Code contains large data structures');
  }

  // 4. Dry-Run in isolated-vm (Server Sandbox)
  const isolate = new Isolate({ memoryLimit: 128 });
  const context = await isolate.createContext();

  try {
    // Mock safe globals
    await context.eval(`
      const entity = { x: 0, y: 0, vx: 0, vy: 0, health: 100, state: {} };
      const context = {
        dt: 0.016,
        spawnEntity: () => {},
        destroyEntity: () => {},
        applyForce: () => {},
      };
    `);

    // Run user code
    await context.eval(code, { timeout: 100 }); // 100ms server timeout

    // Success! Code executed without crashing
  } catch (error) {
    throw new ValidationError(`Runtime test failed: ${error.message}`);
  } finally {
    context.release();
    isolate.dispose();
  }
}
```

#### Layer 2: API Whitelisting (Client-Side Runtime)

Only expose **explicitly safe** APIs to the sandbox:

```typescript
// app/lib/game-engine/behaviors/CustomBehaviorExecutor.ts
export class CustomBehaviorExecutor {
  private createSafeContext(
    entity: RuntimeEntity,
    context: BehaviorContext
  ): SandboxContext {
    // NEVER expose the raw entity or context objects!
    // Create a minimal, read-only facade

    return {
      // Read-only entity data
      entity: {
        id: entity.id,
        x: entity.transform.position.x,
        y: entity.transform.position.y,
        vx: entity.physics?.velocity.x ?? 0,
        vy: entity.physics?.velocity.y ?? 0,
        health: entity.state.health ?? 100,
        tags: Array.from(entity.tags), // Copy, not reference
        state: { ...entity.state },    // Shallow copy
      },

      // Whitelisted functions (input-validated)
      context: {
        dt: context.dt,
        
        input: context.input, // Game input state (safe)

        // Entity spawning (validated template)
        spawnEntity: (template: string, x: number, y: number) => {
          if (!isValidTemplate(template)) {
            throw new Error('Invalid template');
          }
          if (!isFinite(x) || !isFinite(y)) {
            throw new Error('Invalid position');
          }
          context.spawnEntity(template, { x, y });
        },

        // Entity destruction (validate ID exists)
        destroyEntity: (id: string) => {
          const target = context.entityManager.getEntity(id);
          if (!target) {
            throw new Error('Entity not found');
          }
          context.destroyEntity(id);
        },

        // Physics (validate inputs)
        applyForce: (entityId: string, fx: number, fy: number) => {
          if (!isFinite(fx) || !isFinite(fy)) {
            throw new Error('Invalid force');
          }
          const target = context.entityManager.getEntity(entityId);
          if (!target?.physics) return;
          
          // Clamp force magnitude (prevent exploits)
          const maxForce = 10000;
          const magnitude = Math.sqrt(fx * fx + fy * fy);
          if (magnitude > maxForce) {
            const scale = maxForce / magnitude;
            fx *= scale;
            fy *= scale;
          }
          
          target.physics.applyForce({ x: fx, y: fy });
        },

        setVelocity: (entityId: string, vx: number, vy: number) => {
          if (!isFinite(vx) || !isFinite(vy)) {
            throw new Error('Invalid velocity');
          }
          const target = context.entityManager.getEntity(entityId);
          if (!target?.physics) return;
          
          // Clamp velocity (prevent infinite speed exploits)
          const maxSpeed = 1000;
          vx = Math.max(-maxSpeed, Math.min(maxSpeed, vx));
          vy = Math.max(-maxSpeed, Math.min(maxSpeed, vy));
          
          target.physics.velocity = { x: vx, y: vy };
        },

        // Tags (safe operations)
        addTag: (entityId: string, tag: string) => {
          if (typeof tag !== 'string' || tag.length > 50) {
            throw new Error('Invalid tag');
          }
          const target = context.entityManager.getEntity(entityId);
          target?.tags.add(tag);
        },

        removeTag: (entityId: string, tag: string) => {
          const target = context.entityManager.getEntity(entityId);
          target?.tags.delete(tag);
        },
      },
    };
  }
}
```

#### Layer 3: Resource Limits (Runtime Enforcement)

```typescript
// Sandbox configuration
const SANDBOX_LIMITS = {
  memoryLimit: 64 * 1024 * 1024,  // 64MB (generous for code snippets)
  executionTimeout: 50,            // 50ms per frame (must be fast)
  maxStackDepth: 100,              // Prevent infinite recursion
  maxStringLength: 10000,          // Prevent memory exhaustion
};

// Runtime monitoring
class CustomBehaviorExecutor {
  private stats = {
    executionCount: 0,
    totalTime: 0,
    errors: 0,
  };

  async execute(entity: RuntimeEntity, code: string, context: BehaviorContext) {
    const startTime = performance.now();

    try {
      // Execute in sandbox (with limits)
      await this.sandbox.eval(code);

      // Track stats
      const elapsed = performance.now() - startTime;
      this.stats.executionCount++;
      this.stats.totalTime += elapsed;

      // Warn if slow
      if (elapsed > 10) {
        console.warn(`Custom behavior slow: ${elapsed.toFixed(2)}ms`);
      }

    } catch (error) {
      this.stats.errors++;

      // Categorize error
      if (error.message.includes('timeout')) {
        // Disable this behavior (too slow)
        entity.behaviors.find(b => b.type === 'custom_code')!.enabled = false;
        console.error('Custom behavior disabled: timeout');
      } else if (error.message.includes('memory')) {
        // Disable this behavior (too memory-hungry)
        entity.behaviors.find(b => b.type === 'custom_code')!.enabled = false;
        console.error('Custom behavior disabled: memory limit');
      } else {
        // Logic error (user can debug)
        console.error('Custom behavior error:', error);
      }
    }
  }
}
```

---

## Entity System Integration

### How Custom Behaviors Fit Into Existing Architecture

#### Current Behavior System (JSON-Based)

```typescript
// shared/src/types/behavior.ts (EXISTING)
type Behavior =
  | MoveBehavior
  | RotateBehavior
  | SpawnOnEventBehavior
  | CollisionBehavior
  | TimerBehavior
  // ... 30+ existing types
  | CustomCodeBehavior; // NEW!

interface CustomCodeBehavior extends BaseBehavior {
  type: 'custom_code';
  code: string;              // TypeScript code (validated)
  behaviorId?: string;       // FK to behavior_library.id (for tracking)
  cacheKey?: string;         // Optional: for compiled code caching
}
```

#### BehaviorExecutor Integration

```typescript
// app/lib/game-engine/BehaviorExecutor.ts (MODIFIED)
export class BehaviorExecutor {
  private customExecutor: CustomBehaviorExecutor;

  constructor() {
    this.customExecutor = new CustomBehaviorExecutor();
    this.registerHandlers();
  }

  private registerHandlers() {
    // ... existing handlers (move, rotate, etc.)

    // NEW: Custom code handler
    this.registerHandler('custom_code', async (entity, behavior, context) => {
      const customBehavior = behavior as CustomCodeBehavior;
      
      if (!customBehavior.code) {
        console.warn('custom_code behavior missing code');
        return;
      }

      await this.customExecutor.execute(entity, customBehavior.code, context);
    });
  }

  // Lifecycle management
  dispose() {
    this.customExecutor.dispose();
  }
}
```

#### Execution Flow (Per Frame)

```typescript
// Game loop (60 FPS)
function gameLoop(dt: number) {
  // 1. Process input
  const input = inputSystem.getState();

  // 2. Execute behaviors (including custom code)
  for (const entity of entityManager.getAllEntities()) {
    for (const behavior of entity.behaviors) {
      if (!behavior.enabled) continue;

      const handler = behaviorExecutor.getHandler(behavior.type);
      if (!handler) continue;

      // Execute behavior (JSON or custom code)
      await handler(entity, behavior, {
        dt,
        input,
        entityManager,
        physics,
        // ... other context
      });
    }
  }

  // 3. Physics step
  physics.step(dt);

  // 4. Sync transforms
  entityManager.syncTransforms();

  // 5. Render
  renderer.render();
}
```

### Entity Serialization (Save/Load)

**Challenge**: Custom code behaviors contain code strings (can be large).

**Solution**: Reference library by ID, don't duplicate code.

```typescript
// When saving game
function serializeEntity(entity: RuntimeEntity): GameEntity {
  return {
    ...entity,
    behaviors: entity.behaviors.map(b => {
      if (b.type === 'custom_code') {
        // Don't save full code string!
        return {
          type: 'custom_code',
          behaviorId: b.behaviorId,  // Just save library reference
          // Code will be fetched from library on load
        };
      }
      return b; // Normal behaviors serialize as-is
    }),
  };
}

// When loading game
async function deserializeEntity(data: GameEntity): Promise<RuntimeEntity> {
  const behaviors = await Promise.all(
    data.behaviors.map(async b => {
      if (b.type === 'custom_code' && b.behaviorId) {
        // Fetch code from library
        const libraryBehavior = await api.getBehavior(b.behaviorId);
        return {
          type: 'custom_code',
          code: libraryBehavior.code,
          behaviorId: b.behaviorId,
        };
      }
      return b;
    })
  );

  return { ...data, behaviors };
}
```

### Template System Integration

Custom behaviors can be added to **EntityTemplates**:

```typescript
// Game template with custom behavior
const TEMPLATE_WITH_CUSTOM: EntityTemplate = {
  id: 'progressive_jumper',
  name: 'Progressive Jumper',
  sprite: {
    type: 'rect',
    width: 1,
    height: 1,
    color: '#FF5733',
  },
  physics: {
    bodyType: 'dynamic',
    shape: 'box',
  },
  behaviors: [
    // Standard behavior
    {
      type: 'control',
      controlType: 'move',
      speed: 5,
    },
    // Custom behavior (from library)
    {
      type: 'custom_code',
      behaviorId: 'progressive_jump_boost', // Reference library
    },
  ],
  tags: ['player'],
};
```

---

## API Contracts

### tRPC Routes

```typescript
// api/src/trpc/routes/behavior-system.ts
export const behaviorSystemRouter = router({
  /**
   * Generate or find behavior
   * Returns job ID for polling
   */
  generate: protectedProcedure
    .input(z.object({
      prompt: z.string().min(10).max(500),
      gameId: z.string().uuid().optional(),
      gameContext: z.object({
        template: z.string().optional(),
        existingEntities: z.array(z.any()).optional(),
        gameType: z.string().optional(),
      }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const jobId = crypto.randomUUID();
      
      // Async generation (fire-and-forget)
      ctx.env.BEHAVIOR_QUEUE.send({
        type: 'generate',
        jobId,
        userId: ctx.user.id,
        ...input,
      });

      return { jobId };
    }),

  /**
   * Poll job status
   */
  getJob: protectedProcedure
    .input(z.object({
      jobId: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      const job = await ctx.db
        .prepare('SELECT * FROM behavior_generation_jobs WHERE id = ? AND user_id = ?')
        .bind(input.jobId, ctx.user.id)
        .first();

      if (!job) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Job not found' });
      }

      return {
        status: job.status,
        attempts: job.attempts,
        code: job.status === 'completed' ? job.generated_code : null,
        behaviorId: job.final_behavior_id,
        error: job.error_message,
        source: job.library_hit_id ? 'library' : 'generated',
      };
    }),

  /**
   * Get behavior from library by ID
   */
  getBehavior: protectedProcedure
    .input(z.object({
      behaviorId: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      const behavior = await ctx.db
        .prepare('SELECT * FROM behavior_library WHERE id = ?')
        .bind(input.behaviorId)
        .first();

      if (!behavior) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      return {
        id: behavior.id,
        name: behavior.name,
        code: behavior.code,
        description: behavior.description,
        tags: JSON.parse(behavior.tags || '[]'),
      };
    }),

  /**
   * Search library (for UI)
   */
  searchLibrary: protectedProcedure
    .input(z.object({
      query: z.string().min(3),
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ input, ctx }) => {
      // RAG search
      const embedding = await ctx.embeddings.create({
        model: 'text-embedding-3-small',
        input: input.query,
      });

      const results = await ctx.vectorize.query({
        vector: embedding.data[0].embedding,
        topK: input.limit,
        returnMetadata: true,
      });

      // Fetch full behaviors from D1
      const behaviors = await Promise.all(
        results.matches.map(async match => {
          const behavior = await ctx.db
            .prepare('SELECT * FROM behavior_library WHERE embedding_id = ?')
            .bind(match.id)
            .first();
          return behavior;
        })
      );

      return behaviors.filter(Boolean);
    }),

  /**
   * Log usage (for analytics)
   */
  logUsage: protectedProcedure
    .input(z.object({
      behaviorId: z.string().uuid(),
      gameId: z.string().uuid().optional(),
      success: z.boolean(),
      error: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .prepare(`
          INSERT INTO behavior_usage_log (
            id, behavior_id, user_id, game_id, success, 
            error_message, device_platform, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          crypto.randomUUID(),
          input.behaviorId,
          ctx.user.id,
          input.gameId,
          input.success,
          input.error,
          ctx.platform,
          Date.now()
        )
        .run();

      // Update success rate
      await ctx.db
        .prepare(`
          UPDATE behavior_library
          SET usage_count = usage_count + 1,
              success_rate = (
                SELECT AVG(CAST(success AS REAL))
                FROM behavior_usage_log
                WHERE behavior_id = ?
              )
          WHERE id = ?
        `)
        .bind(input.behaviorId, input.behaviorId)
        .run();

      return { success: true };
    }),
});
```

---

## User Flow

### Flow 1: Generate Custom Behavior (First Time)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER: Open Game Editor                                   │
│    - Editing "Bouncy Ball Game" (template: ballLauncher)    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. USER: Clicks "Add Custom Behavior" button                │
│    - Modal appears (BehaviorGenerateModal)                  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. USER: Types prompt                                        │
│    "Make the ball bounce higher after each bounce"          │
│    - Clicks "Generate"                                       │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. CLIENT: POST /trpc/behaviorSystem.generate               │
│    {                                                         │
│      prompt: "Make the ball bounce higher...",              │
│      gameId: "uuid",                                         │
│      gameContext: {                                          │
│        template: "ballLauncher",                            │
│        existingEntities: [...]                              │
│      }                                                       │
│    }                                                         │
│    Response: { jobId: "job-uuid" }                          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. SERVER: BehaviorLibraryService.findOrGenerate()          │
│    - Embed prompt → [0.23, 0.89, ...]                       │
│    - Search Vectorize → No matches (first time)             │
│    - Status: "generating"                                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. SERVER: Call GPT-4o                                       │
│    System Prompt: "Generate TypeScript behavior code..."    │
│    User Prompt: "Make the ball bounce higher..."            │
│    Game Context: { template: "ballLauncher", ... }          │
│    ↓                                                         │
│    AI Response (3-5 seconds):                                │
│    // Initialize bounce counter on first run                 │
│    if (!entity.state.bounceCount) {                         │
│      entity.state.bounceCount = 0;                          │
│    }                                                         │
│    if (entity.vy > 0 && entity.state.lastY < entity.y) {    │
│      entity.state.bounceCount++;                            │
│      const boost = 1 + (entity.state.bounceCount * 0.1);    │
│      entity.vy *= boost;                                     │
│    }                                                         │
│    entity.state.lastY = entity.y;                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. SERVER: Validate code                                     │
│    - TypeScript compile → ✅ Pass                            │
│    - Static analysis (no eval, fetch, etc.) → ✅ Pass        │
│    - Test run in isolated-vm → ✅ Pass                       │
│    - Status: "validating" → "completed"                     │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. SERVER: Save to library                                   │
│    - Generate embedding for RAG                              │
│    - Insert into behavior_library                           │
│    - Insert embedding into Vectorize                         │
│    - behaviorId: "b3d4f5a6..."                              │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 9. CLIENT: Polling getJob (every 2 seconds)                 │
│    Poll 1 (2s): status = "generating"                       │
│    Poll 2 (4s): status = "validating"                       │
│    Poll 3 (6s): status = "completed"                        │
│      → Receive code + behaviorId                            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 10. CLIENT: Show result in modal                             │
│     ✅ Behavior Generated: "Progressive Bounce Boost"       │
│     [Preview Code] [Add to Ball] [Try Again]                │
│     - User clicks "Add to Ball"                             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 11. CLIENT: Add behavior to entity                           │
│     ball.behaviors.push({                                    │
│       type: 'custom_code',                                   │
│       code: generatedCode,                                   │
│       behaviorId: 'b3d4f5a6...',                            │
│     });                                                      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 12. RUNTIME: BehaviorExecutor runs behavior each frame      │
│     - CustomBehaviorExecutor executes code in QuickJS       │
│     - Ball bounces progressively higher! 🎉                 │
└─────────────────────────────────────────────────────────────┘
```

### Flow 2: Use Cached Behavior (RAG Hit)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. DIFFERENT USER: Requests similar behavior                │
│    "I want progressive bouncing"                             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. SERVER: RAG Lookup                                        │
│    - Embed prompt → [0.25, 0.91, ...]                       │
│    - Search Vectorize → MATCH! (similarity: 0.92)           │
│    - Found: "progressive_bounce_boost" (from library)       │
│    - Return cached code (< 100ms, no AI call needed)        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. CLIENT: Instant result                                    │
│    ✅ Found in Library: "Progressive Bounce Boost"          │
│    (No wait, instant!)                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 0: Prerequisites (1 week)

**Goal**: Validate QuickJS works in your stack

- [ ] Install `react-native-quickjs` in a test project
- [ ] Create simple sandbox test (eval "2 + 2")
- [ ] Test with actual entity data (serialize/deserialize)
- [ ] Measure performance (execution time per frame)
- [ ] Test on iOS/Android (ensure it works on both)

**Deliverable**: Proof-of-concept showing QuickJS can run custom code at 60 FPS.

---

### Phase 1: Core Infrastructure (2-3 weeks)

**Goal**: Basic AI generation + validation (no RAG yet)

#### Tasks

1. **Database Schema**
   - [ ] Create D1 migration for `behavior_library`, `behavior_generation_jobs`, `behavior_usage_log`
   - [ ] Create indexes
   - [ ] Seed with 5-10 hand-written behaviors (test data)

2. **Server: BehaviorLibraryService (Basic)**
   - [ ] `generateBehavior(prompt)` - Call GPT-4o
   - [ ] `validateCode(code)` - TypeScript + static analysis + isolated-vm test
   - [ ] `saveToLibrary(code, prompt)` - Store in D1
   - [ ] Error handling + retry logic (max 3 attempts)

3. **tRPC Routes**
   - [ ] `generate` mutation (create job, queue async work)
   - [ ] `getJob` query (polling)
   - [ ] `getBehavior` query (fetch from library by ID)

4. **Client: UI (Basic)**
   - [ ] `BehaviorGenerateModal.tsx` (text input + generate button)
   - [ ] `useBehaviorGeneration.ts` hook (polling pattern, like assets)
   - [ ] Show loading state, success, error

5. **Testing**
   - [ ] Test generation with 10 different prompts
   - [ ] Verify validation catches forbidden keywords
   - [ ] Test retry logic (force failures)

**Deliverable**: Can generate custom behaviors via UI, validated on server, returned to client (but not yet executable).

---

### Phase 2: RAG Integration (1-2 weeks)

**Goal**: Library-first lookup before generation

#### Tasks

1. **Vectorize Setup**
   - [ ] Create Vectorize index (`behavior-embeddings`)
   - [ ] Configure dimensions (1536 for text-embedding-3-small)

2. **Embedding Generation**
   - [ ] Integrate OpenRouter `text-embedding-3-small`
   - [ ] Generate embeddings on library save
   - [ ] Upsert to Vectorize

3. **RAG Lookup**
   - [ ] `searchLibrary(prompt)` - Embed + vector search
   - [ ] Set similarity threshold (0.85)
   - [ ] Return cached behavior if match found

4. **Update Generation Flow**
   - [ ] Call `searchLibrary` before `generateBehavior`
   - [ ] Track cache hits in job metadata (`library_hit_id`)

5. **Testing**
   - [ ] Seed library with 20 behaviors
   - [ ] Test similar prompts hit cache
   - [ ] Measure cache hit rate

**Deliverable**: RAG lookup working, ~80% of similar requests return cached behaviors instantly.

---

### Phase 3: QuickJS Client Runtime (2-3 weeks)

**Goal**: Execute custom behaviors in game engine

#### Tasks

1. **QuickJS Integration**
   - [ ] Install `react-native-quickjs`
   - [ ] Create `CustomBehaviorExecutor` class
   - [ ] Implement sandbox lifecycle (create, execute, dispose)

2. **API Whitelisting**
   - [ ] Define `SandboxContext` interface (safe API surface)
   - [ ] Implement `createSafeContext()` (entity facade + whitelisted functions)
   - [ ] Add input validation for all exposed functions

3. **BehaviorExecutor Integration**
   - [ ] Register `custom_code` handler
   - [ ] Hook into existing behavior execution pipeline
   - [ ] Handle errors gracefully (disable behavior on failure)

4. **Behavior Type**
   - [ ] Add `CustomCodeBehavior` to `shared/src/types/behavior.ts`
   - [ ] Update Zod schemas

5. **Entity Serialization**
   - [ ] Implement save/load with behavior references (not full code)
   - [ ] Fetch code from library on load

6. **Testing**
   - [ ] Test 10 different custom behaviors in real games
   - [ ] Measure performance (execution time per frame)
   - [ ] Test error handling (crash recovery)
   - [ ] Test on iOS + Android

**Deliverable**: Custom behaviors executable in real games at 60 FPS.

---

### Phase 4: Polish & UX (1-2 weeks)

**Goal**: Production-ready UI and analytics

#### Tasks

1. **UI Improvements**
   - [ ] Add code preview (syntax highlighting)
   - [ ] Add "Browse Library" view (discover existing behaviors)
   - [ ] Add usage stats (how many times used)
   - [ ] Add success rate indicator

2. **Analytics**
   - [ ] Track generation success/failure rate
   - [ ] Track cache hit rate
   - [ ] Track behavior execution errors
   - [ ] Create admin dashboard (view library, usage stats)

3. **Error Messaging**
   - [ ] User-friendly error messages (not raw exceptions)
   - [ ] Suggest fixes for common issues
   - [ ] "Try again" flow with prompt refinement

4. **Documentation**
   - [ ] User guide: "How to create custom behaviors"
   - [ ] Example prompts that work well
   - [ ] Troubleshooting guide

**Deliverable**: Polished, production-ready feature with analytics.

---

### Phase 5: Advanced Features (Optional, 2+ weeks)

#### Possible Enhancements

1. **Behavior Editing**
   - User can edit AI-generated code in a code editor
   - Live preview (re-run validation, see results)

2. **Behavior Composition**
   - Combine multiple library behaviors
   - "Make behavior X but also do Y"

3. **Community Library**
   - Users can share behaviors with others
   - Voting/rating system
   - Featured behaviors

4. **Behavior Marketplace**
   - Users sell custom behaviors
   - Revenue split model

5. **Behavior Templates**
   - AI generates parametric behaviors
   - User tweaks parameters via UI (no code editing)

6. **Visual Behavior Builder**
   - Node-based editor (like Blueprint/Scratch)
   - Generates TypeScript code behind the scenes

---

## Security Considerations

### Threat Model

| Threat | Mitigation |
|--------|------------|
| **Code Injection** | Static analysis blocks forbidden keywords |
| **Infinite Loop** | 50ms execution timeout in QuickJS |
| **Memory Exhaustion** | 64MB memory limit in QuickJS |
| **Network Access** | fetch/XHR not available in sandbox |
| **File System Access** | No fs module in QuickJS |
| **Device API Access** | Only whitelisted game APIs exposed |
| **Malicious Code Storage** | Validation before saving to library |
| **User Data Theft** | Sandbox cannot access user data (no localStorage, etc.) |
| **Physics Exploits** | Clamp force/velocity magnitudes |
| **Tag Flooding** | Limit tag length (50 chars) |

### Validation Layers (Defense in Depth)

1. **Client-Side**: Basic checks (code length, obvious issues)
2. **Server-Side Static**: TypeScript compile + AST analysis
3. **Server-Side Dynamic**: Test run in isolated-vm
4. **Client-Side Runtime**: QuickJS sandbox with resource limits

### Monitoring & Response

- **Automatic Disabling**: If behavior fails 3+ times, auto-disable
- **User Reporting**: Flag behaviors as broken/malicious
- **Admin Review**: Manual review queue for flagged behaviors
- **Rate Limiting**: Limit generations per user (e.g., 10/day)

---

## Cost Analysis

### Per-Generation Costs

| Component | Cost |
|-----------|------|
| GPT-4o (generation) | ~$0.03 (input: 2K tokens, output: 500 tokens) |
| text-embedding-3-small | ~$0.0001 (100 tokens) |
| Vectorize query | Free (included in Workers plan) |
| D1 storage | Free (small rows) |
| isolated-vm CPU | ~$0.001 (100ms compute) |
| **Total per generation** | **~$0.031** |

### Cache Hit Savings

- **Library hit**: $0.0001 (just embedding + vector search)
- **Savings per hit**: $0.031 - $0.0001 = **$0.0309**

**ROI Example**:
- First user generates "progressive jump": $0.031
- Next 100 users with similar requests: 100 * $0.0001 = $0.01
- Total cost for 101 users: $0.041
- Without cache: 101 * $0.031 = $3.13
- **Savings: $3.09 (98.7%)**

### Pricing Model Options

1. **Free Tier**: 5 generations/month (loss leader)
2. **Premium**: Unlimited generations ($4.99/month)
3. **Pay-per-generation**: $0.10/generation (67% margin)
4. **Library Access**: Free if using cached behaviors (encourage reuse)

---

## Future Enhancements

### Short-Term (3-6 months)

1. **Behavior Parameters**
   - Generate parametric behaviors (e.g., `speed: number`)
   - UI sliders to adjust parameters (no code editing)

2. **Behavior Chaining**
   - Compose multiple behaviors: "Do X, then Y, then Z"
   - Visual timeline editor

3. **Improved Prompts**
   - Example library: "Try prompts like these..."
   - Auto-suggest similar behaviors

### Medium-Term (6-12 months)

1. **Visual Behavior Editor**
   - Node-based (like Unreal Blueprint)
   - Generates TypeScript code behind scenes
   - Lower barrier for kids (ages 6-14)

2. **Community Features**
   - Share behaviors with friends
   - Public library of top-rated behaviors
   - "Clone and modify" workflow

3. **Behavior Analytics**
   - Show users: "Your behavior was used 50 times by others"
   - Leaderboard of most popular behaviors

### Long-Term (12+ months)

1. **Behavior Marketplace**
   - Sell custom behaviors ($0.99 - $4.99)
   - Revenue split: 70% creator, 30% platform
   - Quality review process

2. **AI Behavior Refinement**
   - "This behavior is too slow, make it faster"
   - AI iterates on existing code
   - A/B testing: which version performs better?

3. **Multi-Language Support**
   - Generate behaviors in other languages (Python, Lua?)
   - Cross-compile to TypeScript

4. **Behavior Versioning**
   - Track changes over time
   - Rollback to previous versions
   - Diff view

---

## Appendix A: Example Behaviors

### Example 1: Progressive Jump Boost

**Prompt**: "Player jumps higher after each jump"

**Generated Code**:
```typescript
// Initialize jump counter on first run
if (!entity.state.jumpCount) {
  entity.state.jumpCount = 0;
}

// Detect jump input
if (context.input.jump && entity.state.onGround) {
  entity.state.jumpCount += 1;
  
  // Each jump adds 10% boost
  const boost = 1 + (entity.state.jumpCount * 0.1);
  
  // Apply upward force (scaled by boost)
  context.applyForce(entity.id, 0, -500 * boost);
}

// Reset counter if player lands after being in air
if (entity.state.onGround && entity.state.wasInAir) {
  entity.state.jumpCount = 0;
}

entity.state.wasInAir = !entity.state.onGround;
```

### Example 2: Health-Based Speed

**Prompt**: "Entity moves faster as health decreases"

**Generated Code**:
```typescript
// Calculate health percentage (0-1)
const maxHealth = entity.state.maxHealth || 100;
const healthPercent = Math.max(0, Math.min(1, entity.health / maxHealth));

// Lower health = higher speed multiplier
// 100% health → 1.0x speed
// 50% health → 1.5x speed  
// 0% health → 2.0x speed
const speedMultiplier = 1 + (1 - healthPercent);

// Apply to current velocity
context.setVelocity(
  entity.id,
  entity.vx * speedMultiplier,
  entity.vy * speedMultiplier
);
```

### Example 3: Orbit Around Target

**Prompt**: "Entity orbits around nearest enemy"

**Generated Code**:
```typescript
// Find nearest entity with 'enemy' tag
const enemies = context.entityManager
  .getEntitiesByTag('enemy')
  .filter(e => e.id !== entity.id);

if (enemies.length === 0) return;

// Find closest
let nearest = enemies[0];
let minDist = Infinity;

for (const enemy of enemies) {
  const dx = enemy.x - entity.x;
  const dy = enemy.y - entity.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  if (dist < minDist) {
    minDist = dist;
    nearest = enemy;
  }
}

// Orbit logic
if (!entity.state.orbitAngle) {
  entity.state.orbitAngle = 0;
}

const orbitRadius = 3; // meters
const orbitSpeed = 2; // radians per second

// Update angle
entity.state.orbitAngle += orbitSpeed * context.dt;

// Calculate orbit position
const targetX = nearest.x + orbitRadius * Math.cos(entity.state.orbitAngle);
const targetY = nearest.y + orbitRadius * Math.sin(entity.state.orbitAngle);

// Move toward target position (smooth follow)
const dx = targetX - entity.x;
const dy = targetY - entity.y;
const moveSpeed = 5;

context.setVelocity(entity.id, dx * moveSpeed, dy * moveSpeed);
```

---

## Appendix B: Prompt Engineering Tips

### Good Prompts (Clear, Specific)

- "Player jumps 10% higher after each successful jump"
- "Entity rotates to face the nearest 'enemy' tagged entity"
- "Spawn a projectile every 2 seconds in the direction the player is facing"
- "Apply upward force when entity collides with 'bouncer' tag"

### Bad Prompts (Vague, Ambiguous)

- "Make it jump better" (what does "better" mean?)
- "Add AI" (AI for what? pathfinding? decision-making?)
- "Make it fun" (subjective, non-technical)
- "Do something cool" (no clear behavior)

### Prompt Template for AI System

```typescript
const GENERATION_SYSTEM_PROMPT = `You are a game behavior code generator for Slopcade.

**Context**:
- Target audience: Ages 6-14 (keep logic simple)
- Physics-based 2D games (Box2D engine)
- Frame rate: 60 FPS (code must be fast, < 5ms per entity)

**Available APIs**:
[See "Sandbox Security Layers" section for full API list]

**Code Style**:
- Use entity.state for persistent data
- Avoid complex algorithms (keep it simple)
- Add comments for clarity
- No imports, no async/await

**Output Format**:
- Return ONLY executable TypeScript code
- No markdown, no explanations
- Code should be <100 lines

**Game Context**:
{INJECT_GAME_CONTEXT}

**User Request**:
{USER_PROMPT}

Generate the behavior code:`;
```

---

## Appendix C: Migration Guide

### Step-by-Step: Adding This to Existing Slopcade

1. **Week 1: Setup**
   - Add `react-native-quickjs` dependency
   - Create D1 migrations
   - Setup Vectorize index

2. **Week 2-3: Server Implementation**
   - Implement `BehaviorLibraryService`
   - Create tRPC routes
   - Test validation pipeline

3. **Week 4-5: Client Implementation**
   - Create `CustomBehaviorExecutor`
   - Integrate with `BehaviorExecutor`
   - Build UI modal

4. **Week 6: RAG Integration**
   - Generate embeddings
   - Implement vector search
   - Test cache hit rate

5. **Week 7-8: Testing & Polish**
   - Test 50+ different behaviors
   - Fix edge cases
   - Performance optimization

6. **Week 9: Beta Launch**
   - Release to 10% of users
   - Monitor errors, performance
   - Gather feedback

7. **Week 10: Full Launch**
   - Roll out to 100%
   - Marketing push
   - Monitor usage, costs

---

## Appendix D: Card Game Primitives

This appendix defines **new JSON-based behaviors** that would unlock card games as a genre within Slopcade's existing declarative system. These primitives work without AI code generation and complement the dynamic mechanics roadmap.

### Gap Analysis: What Card Games Need

| Capability | Current System | Gap |
|------------|----------------|-----|
| **Deck Operations** | ❌ None | Shuffle, draw from top/bottom, peek |
| **Collection Queries** | ⚠️ Tags only | Count, sum values, select by position |
| **Zone Management** | ⚠️ Collision zones | Hand limits, pile ordering, face up/down |
| **Turn Structure** | ❌ None | Turn phases, player switching |
| **Hidden Information** | ⚠️ Manual | Face-down state, reveal triggers |
| **Random Selection** | ❌ None | Pick random from set |

### New Behavior Definitions

#### 1. `deck_manager` Behavior

**Purpose**: Manages a collection of entities as an ordered deck/pile.

```typescript
interface DeckManagerBehavior extends BaseBehavior {
  type: 'deck_manager';
  
  // Identity
  deckId: string;                        // Unique deck identifier (e.g., "draw_pile")
  
  // Collection
  memberTag: string;                     // Tag for entities in this deck (e.g., "card")
  autoCollect: boolean;                  // Auto-add entities with memberTag on spawn
  
  // Ordering
  orderBy: 'spawn_order' | 'z_index' | 'y_position' | 'shuffle';
  
  // Layout
  layout: 'stacked' | 'spread_horizontal' | 'spread_vertical' | 'fan';
  spacing: number;                       // Meters between cards (if spread/fan)
  maxVisible: number;                    // How many cards visible in stack (rest hidden)
  
  // State
  faceDown: boolean;                     // Default face orientation
}
```

**Example Usage**:
```json
{
  "type": "deck_manager",
  "deckId": "draw_pile",
  "memberTag": "card",
  "autoCollect": false,
  "orderBy": "shuffle",
  "layout": "stacked",
  "spacing": 0.02,
  "maxVisible": 3,
  "faceDown": true
}
```

---

#### 2. `deck_operation` Behavior

**Purpose**: Performs operations on decks (draw, shuffle, transfer).

```typescript
interface DeckOperationBehavior extends BaseBehavior {
  type: 'deck_operation';
  
  // Trigger
  trigger: 'on_tap' | 'on_rule' | 'on_timer' | 'on_collision';
  
  // Operation
  operation: 
    | 'draw'           // Move card(s) from deck to target
    | 'shuffle'        // Randomize deck order
    | 'return'         // Move card(s) back to deck
    | 'peek'           // Reveal top card(s) without moving
    | 'flip'           // Toggle face up/down
    | 'transfer';      // Move between decks
  
  // Source/Target
  sourceDeck: string;                    // Deck ID to operate on
  targetDeck?: string;                   // For 'transfer' operation
  targetTag?: string;                    // Tag to add to drawn cards
  
  // Selection
  count: number | 'all';                 // How many cards
  from: 'top' | 'bottom' | 'random';     // Where to take from
  
  // Placement (for draw/transfer)
  to: 'top' | 'bottom' | 'random';       // Where to insert
  
  // Animation
  animationDuration: number;             // Seconds for card movement
}
```

**Example Usage** (Draw 1 card from deck to hand):
```json
{
  "type": "deck_operation",
  "trigger": "on_tap",
  "operation": "draw",
  "sourceDeck": "draw_pile",
  "targetDeck": "player_hand",
  "count": 1,
  "from": "top",
  "animationDuration": 0.3
}
```

---

#### 3. `hand_manager` Behavior

**Purpose**: Manages a player's hand with limits, selection, and layout.

```typescript
interface HandManagerBehavior extends BaseBehavior {
  type: 'hand_manager';
  
  // Identity
  handId: string;                        // e.g., "player_hand", "opponent_hand"
  owner: 'player' | 'opponent' | 'shared';
  
  // Limits
  maxCards: number;                      // Hand size limit
  onOverflow: 'discard_oldest' | 'discard_newest' | 'prevent_draw' | 'choose';
  
  // Layout
  layout: 'fan' | 'horizontal' | 'vertical' | 'stacked';
  fanAngle: number;                      // Degrees for fan layout
  cardSpacing: number;                   // Meters between cards
  
  // Selection
  selectionMode: 'single' | 'multiple' | 'none';
  selectedTag: string;                   // Tag added to selected cards
  
  // Visibility
  faceUp: boolean;                       // Are cards visible?
  hideFromOpponent: boolean;             // For multiplayer
  
  // Interaction
  allowReorder: boolean;                 // Can player drag to reorder?
}
```

**Example Usage**:
```json
{
  "type": "hand_manager",
  "handId": "player_hand",
  "owner": "player",
  "maxCards": 7,
  "onOverflow": "choose",
  "layout": "fan",
  "fanAngle": 45,
  "cardSpacing": 0.5,
  "selectionMode": "single",
  "selectedTag": "selected",
  "faceUp": true,
  "hideFromOpponent": true,
  "allowReorder": true
}
```

---

#### 4. `card_value` Behavior

**Purpose**: Defines a card's value(s) for scoring and comparison.

```typescript
interface CardValueBehavior extends BaseBehavior {
  type: 'card_value';
  
  // Primary value (for scoring/comparison)
  value: number;                         // e.g., 1-13 for standard deck
  
  // Named values (for complex games)
  values: Record<string, number>;        // e.g., { "attack": 5, "defense": 3 }
  
  // Suit/Category
  suit: string;                          // e.g., "hearts", "spades", "fire", "water"
  
  // Display
  displayValue: string;                  // e.g., "A", "K", "Q", "J", "10"
  
  // Special flags
  isWild: boolean;                       // Can match any suit
  isTrump: boolean;                      // Higher priority in comparison
}
```

**Example Usage** (Ace of Spades):
```json
{
  "type": "card_value",
  "value": 1,
  "values": { "blackjack": 11, "poker_high": 14 },
  "suit": "spades",
  "displayValue": "A",
  "isWild": false,
  "isTrump": false
}
```

---

#### 5. `zone_scoring` Behavior

**Purpose**: Calculates aggregate values for cards in a zone/deck.

```typescript
interface ZoneScoringBehavior extends BaseBehavior {
  type: 'zone_scoring';
  
  // Target
  deckId: string;                        // Which deck/hand to score
  
  // Calculation
  scoreType: 
    | 'sum'              // Add all card values
    | 'count'            // Count cards
    | 'max'              // Highest card value
    | 'min'              // Lowest card value
    | 'count_suit'       // Count cards of specific suit
    | 'count_value'      // Count cards with specific value
    | 'custom';          // Use expression (requires dynamic mechanics)
  
  // Filters
  filterSuit?: string;                   // Only count this suit
  filterValueMin?: number;               // Minimum value to include
  filterValueMax?: number;               // Maximum value to include
  filterTag?: string;                    // Only count cards with this tag
  
  // Output
  outputVariable: string;                // Store result in this game variable
  
  // Display
  showOnUI: boolean;                     // Display score in HUD
  uiLabel: string;                       // e.g., "Hand Total"
}
```

**Example Usage** (Blackjack hand total):
```json
{
  "type": "zone_scoring",
  "deckId": "player_hand",
  "scoreType": "sum",
  "outputVariable": "player_hand_total",
  "showOnUI": true,
  "uiLabel": "Hand: {value}"
}
```

---

#### 6. `turn_controller` Behavior

**Purpose**: Manages turn-based game flow.

```typescript
interface TurnControllerBehavior extends BaseBehavior {
  type: 'turn_controller';
  
  // Players
  playerCount: number;                   // 2, 3, 4, etc.
  turnOrder: 'clockwise' | 'counter_clockwise' | 'alternating';
  
  // Current state
  currentPlayerVariable: string;         // Variable to track whose turn
  turnNumberVariable: string;            // Variable to track turn count
  
  // Phases (optional)
  phases: Array<{
    name: string;                        // e.g., "draw", "play", "discard"
    duration: number | 'until_action';   // Seconds or wait for player action
    autoAdvance: boolean;                // Auto-proceed to next phase
  }>;
  currentPhaseVariable: string;          // Variable to track current phase
  
  // Turn limits
  turnTimeLimit: number;                 // Seconds per turn (0 = unlimited)
  onTimeout: 'skip' | 'random_action' | 'forfeit';
  
  // Events
  onTurnStart: string[];                 // Rules to trigger on turn start
  onTurnEnd: string[];                   // Rules to trigger on turn end
  onPhaseChange: string[];               // Rules to trigger on phase change
}
```

**Example Usage** (Simple 2-player turns):
```json
{
  "type": "turn_controller",
  "playerCount": 2,
  "turnOrder": "alternating",
  "currentPlayerVariable": "current_player",
  "turnNumberVariable": "turn_number",
  "phases": [
    { "name": "draw", "duration": "until_action", "autoAdvance": false },
    { "name": "play", "duration": "until_action", "autoAdvance": false },
    { "name": "discard", "duration": "until_action", "autoAdvance": false }
  ],
  "currentPhaseVariable": "current_phase",
  "turnTimeLimit": 30,
  "onTimeout": "skip"
}
```

---

#### 7. `card_play_zone` Behavior

**Purpose**: Defines where cards can be played and validates plays.

```typescript
interface CardPlayZoneBehavior extends BaseBehavior {
  type: 'card_play_zone';
  
  // Identity
  zoneId: string;                        // e.g., "discard_pile", "play_area"
  
  // Validation
  acceptFrom: string[];                  // Deck IDs that can play here
  validation: 
    | 'any'                              // Accept any card
    | 'match_suit'                       // Must match top card suit
    | 'match_value'                      // Must match top card value
    | 'match_suit_or_value'              // Uno-style
    | 'higher_value'                     // Must be higher than top
    | 'lower_value'                      // Must be lower than top
    | 'sequence'                         // Must be +1 or -1 of top
    | 'custom';                          // Use rule condition
  
  // Reference card for validation
  compareToTop: boolean;                 // Compare to top card of this zone
  compareToDeck?: string;                // Or compare to top of another deck
  
  // On valid play
  onValidPlay: string[];                 // Rules to trigger
  
  // On invalid play
  onInvalidPlay: 'reject' | 'penalty' | 'allow_anyway';
  penaltyRules?: string[];               // Rules to trigger on penalty
  
  // Stack behavior
  stackable: boolean;                    // Can cards stack here?
  maxStack: number;                      // Max cards in zone
}
```

**Example Usage** (Uno discard pile):
```json
{
  "type": "card_play_zone",
  "zoneId": "discard_pile",
  "acceptFrom": ["player_hand", "opponent_hand"],
  "validation": "match_suit_or_value",
  "compareToTop": true,
  "onValidPlay": ["advance_turn", "check_uno"],
  "onInvalidPlay": "reject",
  "stackable": true,
  "maxStack": 999
}
```

---

### New Rule Conditions for Card Games

These conditions extend the Rules system:

```typescript
// Card-specific conditions
interface CardConditions {
  // Deck queries
  'deck_count': {
    deckId: string;
    compare: '<' | '<=' | '=' | '>=' | '>' | '!=';
    value: number;
  };
  
  'deck_empty': {
    deckId: string;
  };
  
  // Card comparison
  'card_matches': {
    card: 'this' | 'top_of_deck';
    deckId?: string;
    matchSuit?: boolean;
    matchValue?: boolean;
    matchTag?: string;
  };
  
  // Turn queries
  'is_player_turn': {
    player: number | 'current';
  };
  
  'current_phase': {
    phase: string;
  };
  
  // Score queries
  'variable_compare': {
    variable: string;
    compare: '<' | '<=' | '=' | '>=' | '>' | '!=';
    value: number | string;  // Can reference another variable
  };
}
```

### New Rule Actions for Card Games

```typescript
// Card-specific actions
interface CardActions {
  // Deck operations
  'draw_card': {
    from: string;           // Deck ID
    to: string;             // Deck ID or hand ID
    count: number;
    from_position: 'top' | 'bottom' | 'random';
  };
  
  'shuffle_deck': {
    deckId: string;
  };
  
  'flip_card': {
    target: 'this' | 'all_in_deck';
    deckId?: string;
    faceUp: boolean;
  };
  
  // Turn control
  'end_turn': {};
  
  'advance_phase': {};
  
  'skip_turn': {
    player?: number;        // Default: next player
  };
  
  // Scoring
  'set_variable': {
    variable: string;
    value: number | string | { expr: string };  // Supports expressions
  };
  
  'increment_variable': {
    variable: string;
    amount: number | { expr: string };
  };
  
  // Card movement
  'return_to_deck': {
    target: 'this' | 'selected' | 'all_in_zone';
    deckId: string;
    zoneId?: string;
    to_position: 'top' | 'bottom' | 'random';
  };
}
```

---

### Example: Blackjack Implementation

Here's how Blackjack would look with these primitives:

```json
{
  "name": "Blackjack",
  "gameType": "card_game",
  
  "variables": {
    "player_score": 0,
    "dealer_score": 0,
    "player_turn": true,
    "game_over": false
  },
  
  "templates": {
    "card": {
      "sprite": { "type": "image", "imageUrl": "{{card_image}}" },
      "physics": { "bodyType": "kinematic" },
      "behaviors": [
        { "type": "card_value", "value": "{{card_value}}", "suit": "{{suit}}" },
        { "type": "draggable" }
      ]
    },
    
    "deck_pile": {
      "sprite": { "type": "rect", "width": 1, "height": 1.4, "color": "#2a4d2a" },
      "behaviors": [
        {
          "type": "deck_manager",
          "deckId": "draw_pile",
          "memberTag": "card",
          "orderBy": "shuffle",
          "layout": "stacked",
          "faceDown": true
        },
        {
          "type": "deck_operation",
          "trigger": "on_tap",
          "operation": "draw",
          "sourceDeck": "draw_pile",
          "targetDeck": "player_hand",
          "count": 1,
          "from": "top"
        }
      ]
    },
    
    "player_hand_zone": {
      "sprite": { "type": "rect", "width": 8, "height": 2, "color": "#1a3a1a", "opacity": 0.3 },
      "behaviors": [
        {
          "type": "hand_manager",
          "handId": "player_hand",
          "owner": "player",
          "maxCards": 10,
          "layout": "horizontal",
          "cardSpacing": 1.2,
          "faceUp": true
        },
        {
          "type": "zone_scoring",
          "deckId": "player_hand",
          "scoreType": "sum",
          "outputVariable": "player_score",
          "showOnUI": true,
          "uiLabel": "Your Hand: {value}"
        }
      ]
    },
    
    "dealer_hand_zone": {
      "sprite": { "type": "rect", "width": 8, "height": 2, "color": "#3a1a1a", "opacity": 0.3 },
      "behaviors": [
        {
          "type": "hand_manager",
          "handId": "dealer_hand",
          "owner": "opponent",
          "maxCards": 10,
          "layout": "horizontal",
          "faceUp": false
        },
        {
          "type": "zone_scoring",
          "deckId": "dealer_hand",
          "scoreType": "sum",
          "outputVariable": "dealer_score"
        }
      ]
    },
    
    "hit_button": {
      "sprite": { "type": "rect", "width": 2, "height": 0.8, "color": "#4CAF50" },
      "tags": ["hit_button", "ui"]
    },
    
    "stand_button": {
      "sprite": { "type": "rect", "width": 2, "height": 0.8, "color": "#f44336" },
      "tags": ["stand_button", "ui"]
    }
  },
  
  "rules": [
    {
      "name": "game_start",
      "trigger": { "type": "game_start" },
      "actions": [
        { "action": "shuffle_deck", "deckId": "draw_pile" },
        { "action": "draw_card", "from": "draw_pile", "to": "player_hand", "count": 2 },
        { "action": "draw_card", "from": "draw_pile", "to": "dealer_hand", "count": 2 }
      ]
    },
    {
      "name": "hit",
      "trigger": { "type": "tap", "target": { "tag": "hit_button" } },
      "conditions": [
        { "type": "variable_compare", "variable": "player_turn", "compare": "=", "value": true },
        { "type": "variable_compare", "variable": "player_score", "compare": "<=", "value": 21 }
      ],
      "actions": [
        { "action": "draw_card", "from": "draw_pile", "to": "player_hand", "count": 1 }
      ]
    },
    {
      "name": "bust_check",
      "trigger": { "type": "variable_changed", "variable": "player_score" },
      "conditions": [
        { "type": "variable_compare", "variable": "player_score", "compare": ">", "value": 21 }
      ],
      "actions": [
        { "action": "set_variable", "variable": "game_over", "value": true },
        { "action": "trigger_lose", "reason": "Bust! Over 21" }
      ]
    },
    {
      "name": "stand",
      "trigger": { "type": "tap", "target": { "tag": "stand_button" } },
      "conditions": [
        { "type": "variable_compare", "variable": "player_turn", "compare": "=", "value": true }
      ],
      "actions": [
        { "action": "set_variable", "variable": "player_turn", "value": false },
        { "action": "flip_card", "target": "all_in_deck", "deckId": "dealer_hand", "faceUp": true },
        { "action": "trigger_rule", "ruleName": "dealer_play" }
      ]
    },
    {
      "name": "dealer_play",
      "trigger": { "type": "rule_triggered" },
      "conditions": [
        { "type": "variable_compare", "variable": "dealer_score", "compare": "<", "value": 17 }
      ],
      "actions": [
        { "action": "draw_card", "from": "draw_pile", "to": "dealer_hand", "count": 1 },
        { "action": "delay", "seconds": 1 },
        { "action": "trigger_rule", "ruleName": "dealer_play" }
      ]
    },
    {
      "name": "determine_winner",
      "trigger": { "type": "variable_changed", "variable": "dealer_score" },
      "conditions": [
        { "type": "variable_compare", "variable": "player_turn", "compare": "=", "value": false },
        { "type": "variable_compare", "variable": "dealer_score", "compare": ">=", "value": 17 }
      ],
      "actions": [
        { "action": "evaluate_winner" }
      ]
    }
  ],
  
  "win": {
    "condition": { "type": "custom", "expression": "player_score <= 21 && (dealer_score > 21 || player_score > dealer_score)" },
    "message": "You win!"
  },
  
  "lose": {
    "condition": { "type": "custom", "expression": "player_score > 21 || (dealer_score <= 21 && dealer_score > player_score)" },
    "message": "Dealer wins!"
  }
}
```

---

### Implementation Priority

| Behavior | Priority | Unlocks |
|----------|----------|---------|
| `deck_manager` | 🔴 High | All card games (foundation) |
| `deck_operation` | 🔴 High | Draw, shuffle, transfer |
| `hand_manager` | 🔴 High | Player hand layout + selection |
| `card_value` | 🟡 Medium | Scoring games (Blackjack, Poker) |
| `zone_scoring` | 🟡 Medium | Score display + win conditions |
| `turn_controller` | 🟡 Medium | Multi-player, phase-based games |
| `card_play_zone` | 🟢 Low | Validation games (Uno, Rummy) |

### Effort Estimate

| Phase | Scope | Effort |
|-------|-------|--------|
| **Phase 1: Foundation** | `deck_manager` + `deck_operation` + `hand_manager` | 1-2 weeks |
| **Phase 2: Scoring** | `card_value` + `zone_scoring` + rule conditions | 1 week |
| **Phase 3: Turns** | `turn_controller` + rule actions | 1 week |
| **Phase 4: Validation** | `card_play_zone` + advanced conditions | 1 week |
| **Total** | Complete card game system | **4-5 weeks** |

### Relationship to AI Code Generation

These primitives work **without** AI code generation:
- 90% of card games can be built with these JSON behaviors
- AI code generation is needed only for:
  - Custom card effects (e.g., "Draw 2 cards if this card is red")
  - AI opponents (decision-making logic)
  - Complex hand evaluation (poker hand rankings)

The recommended approach:
1. **First**: Implement card game primitives (4-5 weeks)
2. **Then**: Use AI code generation for edge cases (custom card effects, AI)

This gives you card games as a genre immediately, with AI enhancing the experience later.

---

## Conclusion

This architecture enables **AI-generated custom behaviors** in Slopcade while maintaining:
- Security (sandboxed, validated, resource-limited)
- Performance (< 5ms per entity per frame)
- Cost Efficiency (RAG reduces AI calls by ~90%)
- User Experience (fast, clear errors, library grows over time)

**Total Implementation Time**: ~8-10 weeks  
**Estimated Cost**: $0.03/generation (first time), $0.0001/cached use  
**Expected Cache Hit Rate**: 80-90% after 6 months

This document serves as a **complete reference** for when you're ready to build this feature.

---

**Document Version**: 1.1  
**Last Updated**: 2026-01-25  
**Changelog**:
- v1.0: Initial architecture document
- v1.1: Added Appendix D (Card Game Primitives)

**Next Review**: When considering implementation
