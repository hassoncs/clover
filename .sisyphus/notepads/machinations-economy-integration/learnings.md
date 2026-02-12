# Economy Engine Integration - Research Findings

## Package Structure Patterns

From `packages/game-bundler/package.json`:
- Package name: `@slopcade/game-bundler`
- Type: `"module"` for ES modules
- Exports pattern: Main entry + specific subpaths (compiler, loader, types)
- Scripts: build, type-check, test, test:watch
- Dependencies: Uses `workspace:*` for internal packages

## Effects System Patterns (Graph Precedent)

From `shared/src/effects/types.ts`:
- **Node structure**: `EffectNode` has id, type, family, inputSlots, params, outputTarget
- **Connections**: `Connection` interface with from/to structure
- **Graph spec**: `EffectGraphSpec` contains nodes, connections, feedbackEdges
- **External inputs**: Declared separately from the graph

Key patterns to follow:
```typescript
interface EffectNode {
  id: string;
  type: string;
  family: NodeFamily;
  inputSlots: InputSlot[];
  params: Record<string, ParamValue>;
  outputTarget: OutputTarget;
  flags: { stateful: boolean; fusible: FusibilityFlag };
}

interface Connection {
  from: { nodeId: string; output: string };
  to: { nodeId: string; input: string };
}
```

## GameDefinition Extension Pattern

From `shared/src/types/GameDefinition.ts`:
- GameDefinition is the canonical contract (line 406-474)
- Optional sections use `?:` syntax
- Effects are already integrated as optional:
```typescript
effects?: {
  graph?: unknown;
  shaders?: Record<string, { filename: string; glsl: string }>;
};
```
- Economy should follow similar pattern:
```typescript
economy?: {
  graph: EconomyGraph;
  // other economy config
};
```

## Runtime System Patterns

From `app/lib/game-engine/systems/runner/`:

### RuntimeSystem Interface (types.ts lines 199-249):
```typescript
interface RuntimeSystem<TConfig = unknown, TState = unknown> {
  readonly id: string;
  readonly phase: SystemPhase;
  readonly priority: number;
  initialize(ctx: SystemContext, config: TConfig): Promise<void> | void;
  update(ctx: UpdateContext, state: TState): void;
  destroy(): void;
  getState(): TState;
}
```

### System Registration (GameSystemRunner.ts lines 15-31):
- Systems register via `register(system)` method
- Phase-based execution order
- Priority sorting within phases

### Wrapper Pattern (RulesSystem.ts):
- Wrapper systems implement `RuntimeSystem`
- Config passed to constructor
- State passed to update()
- Access to SystemContext (bridge, physics, entityManager, eventBus, eventQueue)

## Job Orchestration Patterns

From `api/src/trpc/routes/asset-system/generation-jobs.ts`:

### Job Lifecycle:
1. Create job record with status='queued'
2. Create task records for each unit of work
3. Process job: update status='running'
4. Process each task: update status='running' -> 'succeeded'/'failed'
5. Update job status='succeeded'/'failed'

### Key patterns:
- Database-backed job state
- Task-level granularity
- Status transitions: queued -> running -> succeeded/failed
- Error message capture on failure

## Expression Evaluation

From app dependencies and `shared/src/expressions/`:
- Uses `expr-eval` library for expression parsing
- Custom functions can be registered
- Used extensively in rules engine

## Key Decisions for Economy Engine

1. **Package structure**: Mirror game-bundler pattern
2. **Graph types**: Follow effects pattern (nodes, edges, connections)
3. **GameDefinition extension**: Add optional `economy` section
4. **Runtime system**: Implement RuntimeSystem interface
5. **Simulation jobs**: Follow generation-jobs pattern
6. **Expression evaluation**: Use expr-eval (already in deps)

## Files to Create/Modify

### New Package: `packages/economy-engine/`
- package.json
- tsconfig.json
- src/index.ts (exports)
- src/types.ts (graph types)
- src/schemas.ts (zod schemas)
- src/simulator.ts (deterministic simulator)
- src/validator.ts (graph validation)
- src/fixtures.ts (test helpers)

### Modified Files
- `shared/src/types/GameDefinition.ts` - add economy section
- `shared/src/types/schemas.ts` - add economy schemas
- `app/lib/game-engine/systems/runner/wrappers/EconomyRuntimeSystem.ts` - new
- `app/lib/game-engine/systems/runner/GameSystemRunner.ts` - register economy system
- `api/src/trpc/routes/games.ts` - validate economy in game flows
- `api/src/ai/game/schemas.ts` - AI generation schemas
- `api/src/ai/game/generator.ts` - economy-aware prompts

## Task 1 Implementation Learnings

- `pnpm-workspace.yaml` already includes `packages/*` — no changes needed for new packages
- GameDefinition extension: defined inline `EconomyGraphDefinition` interface instead of importing from economy-engine to avoid shared→economy-engine dependency
- Error code pattern: `E_*` prefix with `EconomyValidationErrorCode` type union (mirrors effects `GraphValidationErrorCode`)
- Zod `z.discriminatedUnion('type', [...])` works well for node types with different field shapes
- Validator is a pure function, no class — follows effects validator pattern
- Test fixtures use factory functions (`makePool`, `makeSource`, etc.) for concise test setup
