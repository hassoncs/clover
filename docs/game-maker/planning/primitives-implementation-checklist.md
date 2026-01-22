# Primitives Implementation Checklist

> Quick reference for implementing new game engine primitives

---

## Phase 1: Quick Wins

### 1. Random Template Selection
- [ ] **Type**: Update `SpawnOnEventBehavior.entityTemplate` to `string | string[]`
  - File: `shared/src/types/behavior.ts`
- [ ] **Schema**: Update Zod schema to accept array
  - File: `shared/src/types/schemas.ts`
  - Change: `entityTemplate: z.union([z.string(), z.array(z.string())])`
- [ ] **Handler**: Pick randomly when array provided
  - File: `app/lib/game-engine/behaviors/LifecycleBehaviors.ts`
- [ ] **SpawnAction**: Same change for rules-based spawning
  - File: `shared/src/types/rules.ts`
  - File: `app/lib/game-engine/rules/actions/SpawnActionExecutor.ts`
- [ ] **Test**: PhysicsStacker uses random blocks
  - File: `app/lib/test-games/games/physicsStacker.ts`

### 2. Expression: `choose(a, b, c)`
- [ ] **Add function** to `BUILTIN_FUNCTIONS`
  - File: `shared/src/expressions/evaluator.ts`
  ```typescript
  choose: (args, ctx) => {
    if (args.length === 0) throw new Error('choose() requires at least one argument');
    return args[Math.floor(ctx.random() * args.length)];
  },
  ```
- [ ] **Test**: Unit test for choose function
  - File: `shared/src/expressions/__tests__/expressions.test.ts`

### 3. Expression: `randomInt(min, max)`
- [ ] **Add function** to `BUILTIN_FUNCTIONS`
  - File: `shared/src/expressions/evaluator.ts`
  ```typescript
  randomInt: (args, ctx) => {
    assertArgCount('randomInt', args, 2);
    const min = Math.floor(asNumber(args[0]));
    const max = Math.floor(asNumber(args[1]));
    return min + Math.floor(ctx.random() * (max - min + 1));
  },
  ```
- [ ] **Test**: Unit test

### 4. Expression: `entityCount(tag)`
- [ ] **Extend EvalContext** to include entityManager reference
  - File: `shared/src/expressions/types.ts`
  ```typescript
  entityManager?: { getEntitiesByTag(tag: string): unknown[] };
  ```
- [ ] **Add function** to `BUILTIN_FUNCTIONS`
  - File: `shared/src/expressions/evaluator.ts`
- [ ] **Wire up** entityManager in GameRuntime
  - File: `app/lib/game-engine/GameRuntime.native.tsx`
- [ ] **Test**: Unit test + integration test

---

## Phase 2: Core Expansion

### 5. Template Slots
- [ ] **Type**: Add `slots` to `EntityTemplate`
  - File: `shared/src/types/entity.ts`
  ```typescript
  slots?: Record<string, { x: number; y: number; layer?: number }>;
  ```
- [ ] **Schema**: Add Zod validation
- [ ] **Renderer**: Debug visualization of slots (optional)

### 6. Behavior: `attachTo`
- [ ] **Type**: New behavior interface
  - File: `shared/src/types/behavior.ts`
  ```typescript
  interface AttachToBehavior extends BaseBehavior {
    type: 'attach_to';
    parentTag: string;
    slotName: string;
  }
  ```
- [ ] **Handler**: Implement attachment logic
  - File: `app/lib/game-engine/behaviors/LifecycleBehaviors.ts`
- [ ] **Phase mapping**: Add to BehaviorExecutor phase map
  - File: `app/lib/game-engine/BehaviorExecutor.ts`

### 7. Expression: `entityExists(tag)`
- [ ] **Add function** - simple boolean check
  ```typescript
  entityExists: (args, ctx) => {
    assertArgCount('entityExists', args, 1);
    const tag = String(args[0]);
    return ctx.entityManager?.getEntitiesByTag(tag).length > 0;
  },
  ```

### 8. Expression: `highestY(tag)` / `lowestY(tag)`
- [ ] **Add functions** - useful for stacking games
  ```typescript
  highestY: (args, ctx) => {
    assertArgCount('highestY', args, 1);
    const entities = ctx.entityManager?.getEntitiesByTag(String(args[0])) ?? [];
    if (entities.length === 0) return 0;
    return Math.min(...entities.map(e => e.transform.y));
  },
  ```

---

## Phase 3: Advanced Systems

### 9. Physics Joints
- [ ] **Type**: Add `joints` to `GameDefinition`
- [ ] **Loader**: Create joints during game load
- [ ] **Runtime**: Manage joint lifecycle

### 10. List Variables
- [ ] **Type**: Extend variable type to include arrays
- [ ] **Actions**: `push_to_list`, `pop_from_list`, `shuffle_list`
- [ ] **Conditions**: `list_contains`, `list_length`

---

## Verification Checklist

After implementing each primitive:

- [ ] TypeScript compiles (`pnpm tsc --noEmit`)
- [ ] Unit tests pass
- [ ] Integration test with real game
- [ ] Documentation updated
- [ ] Gallery entry added (if applicable)
