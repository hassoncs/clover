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

## Task 2 Implementation Learnings

- Deterministic behavior is stable when every probabilistic gate decision goes through a single seeded RNG instance and no `Math.random` path exists.
- Fixed-step planning/apply semantics require tests to account for one-tick propagation delay through intermediate nodes (e.g., source -> pool -> drain).
- Treating gate/converter as internal buffers with node values makes atomic tick updates straightforward and prevents order-dependent behavior.
- Capacity enforcement is simplest in apply phase via receiver budgets, even when planning over-requests transfers.
- Cycle detection can be precomputed once from resource-edge adjacency and reused per tick for event emission.

- Source nodes should be treated as ephemeral producers (no stored accumulation), otherwise state drifts and downstream formulas can become unintentionally stateful.
- Determinism variance tests should compare full run traces between seeds, not only final bucket totals, to avoid false negatives from equal end distributions.
## Task 3 Implementation Learnings (Simulation Job Contracts)

- Types are inferred from Zod schemas using `z.infer<>` — no need for separate TypeScript interfaces that duplicate schema shape.
- Reusing `EconomyGraphSchema` from `schemas.ts` for the `graph` field in `SimulationJobRequestSchema` keeps validation consistent with the existing graph contract.
- `EconomyState` schema was defined inline in `simulation-jobs.ts` rather than importing from `schemas.ts` (which doesn't export one) — avoids coupling to internal schema structure.
- Test factory functions (`makeValidConfig`, `makeValidRequest`, `makeValidResult`) keep test code DRY and make it easy to test variants with spread overrides.
- The `SensitivityRange` sub-schema is small enough to inline rather than export as a separate schema, keeping the public API surface minimal.
## Task 3 Implementation Learnings (EconomyRuntimeSystem)

- `@slopcade/economy-engine` needs tsconfig path alias in `app/tsconfig.json` since pnpm workspace:* install was blocked by a pre-existing patch issue. Added `"@slopcade/economy-engine": ["../packages/economy-engine/src/index.ts"]`.
- Also added to `app/package.json` dependencies as `"@slopcade/economy-engine": "workspace:*"`.
- Constructor config pattern: GameSystemRunner passes `{} as any` to `initialize()`, so actual config must be passed via constructor (matching RulesSystem pattern). The `initialize` method falls back to constructor config.
- Fixed-rate tick accumulation: Economy ticks at configurable rate (default 1/sec) using accumulated dt. Handles multi-tick catch-up when dt > tick interval.
- Event bus integration: Economy events (pool_full, pool_empty, gate_routed, etc.) are prefixed with `economy:` and emitted to the shared EventBus from SystemContext.
- Deterministic seeding: Graph ID is hashed to a seed number for the EconomySimulator's seeded RNG.
- Priority 40 (lower than RulesSystem at 50): Economy runs before rules within GAME_LOGIC phase so rules can react to economy state changes.
- Conditional registration: Only registers when `definition.economy` is present, ensuring non-economy games are completely unaffected.
- `EconomyGraphDefinition` (shared types) is structurally compatible with `EconomyGraph` (economy-engine types) — direct cast works.
## Task 5 Implementation Learnings (API Economy Validation Integration)

- `economy` router name was already taken by wallet/billing system (`api/src/trpc/routes/economy.ts`). New economy graph router uses `economyGraph` as the tRPC key and `economy-graph.ts` as filename.
- `validateDefinition` in games.ts already had economy validation integrated (from a parallel/prior task), returning `economyValidation` field with `{ valid, errors }` or `null`.
- `generate` and `refine` mutations needed economy validation added to their return types — both now include `economyValidation` when the result game has an `economy` property.
- Economy validation is purely additive: uses `validateEconomyGraph()` from `@slopcade/economy-engine` as a side-channel validator that doesn't affect the main game validation flow.
- Vitest alias needed for `@slopcade/economy-engine` in `api/vitest.config.ts` since Cloudflare Workers pool resolves differently than standard Node.
- API package.json needed explicit `"@slopcade/economy-engine": "workspace:*"` dependency since it wasn't previously listed.
- Standalone `economyGraph.validateGraph` and `economyGraph.simulate` procedures use `protectedProcedure` for auth, zod `EconomyGraphSchema` for input validation, and return structured error responses.
- Simulation endpoint validates graph before running simulator, throwing TRPCError for invalid graphs. Max 1000 ticks enforced via zod schema constraint.

## Task 7: Rules/Actions/Triggers Bridge

- Economy actions access EconomyRuntimeSystem state through `IEconomyOps` interface on `RuleContext.economyOps`
- Pattern follows same approach as `IGameStateMutator` for game state and `ContainerSystem` for containers
- ActionRegistry takes executor instances in constructor - must add new params and register in `registerAll()`
- RulesSystem.evaluateConditions uses a switch/case dispatch - economy conditions added alongside container conditions
- RulesSystem.test.ts tests were pre-existing failures (missing worldOps in SystemContext) - not caused by economy changes
- EconomyRuntimeSystem doesn't expose its simulator directly; `IEconomyOps` will need to be wired up by whoever constructs the RuleContext (likely in RulesSystem.update when economy system is present)
