# BehaviorExecutorRuntimeSystem Initialization Investigation

## Investigation Date
2026-01-31

## Question Under Investigation
How does BehaviorExecutorRuntimeSystem get its entityManager reference and when? Is there a timing issue where the entityManager might not contain the ball entity when systems are initialized?

## Key Findings

### 1. Initialization Flow

**Sequence in GameRuntime.godot.tsx:**

1. **Line 461**: `const game = loader.load(definition);`
   - GameLoader.load() creates EntityManager
   - All game entities (including ball) are created during this call
   - EntityManager now contains all game entities

2. **Lines 789-853**: GameSystemRunner creation and system registration
   - New GameSystemRunner instance created
   - All systems are registered (including BehaviorExecutorRuntimeSystem)

3. **Lines 858-866**: SystemContext creation and initialization
   ```typescript
   const systemContext: SystemContext = {
     bridge,
     physics,
     entityManager: game.entityManager,  // Contains all entities including ball
     eventBus,
     eventQueue: (runner as any).eventQueue,
   };
   await runner.initialize(systemContext);
   ```

### 2. BehaviorExecutorRuntimeSystem.initialize() Details

**Location**: `./app/lib/game-engine/systems/runner/wrappers/BehaviorExecutorRuntimeSystem.ts`

**Lines 40-44:**
```typescript
initialize(ctx: SystemContext, _config: BehaviorExecutorSystemConfig): void {
  this.systemContext = ctx;
  this.pixelsPerMeter = this.config.pixelsPerMeter;
  this.behaviorExecutor = createBehaviorExecutor();
}
```

**Key Points:**
- Receives full SystemContext which includes entityManager
- Stores context as class property: `this.systemContext = ctx`
- entityManager reference is preserved for later use in update()

### 3. EntityManager.getAllEntities() Behavior

**Location**: `./app/lib/game-engine/EntityManager.ts`

**Lines 693-695:**
```typescript
getAllEntities(): RuntimeEntity[] {
  return Array.from(this.entities.values());
}
```

**Lines 697-699:**
```typescript
getActiveEntities(): RuntimeEntity[] {
  return this.getAllEntities().filter((e) => e.active);
}
```

**Key Points:**
- Returns ALL entities regardless of active status
- Active filtering happens in the calling code (BehaviorExecutorRuntimeSystem.update())

### 4. Entity Active Status

**From EntityManager.createRuntimeEntity() (Line 309):**
```typescript
active: resolved.active !== false,  // Defaults to true
```

**Key Points:**
- All entities are created with `active: true` by default
- Only entities explicitly set with `active: false` would be filtered out

### 5. Update Loop Usage

**BehaviorExecutorRuntimeSystem.update() (Lines 46-75):**
```typescript
update(ctx: UpdateContext, _state: BehaviorExecutorSystemState): void {
  if (!this.behaviorExecutor || !this.systemContext) return;
  
  const entities = this.systemContext.entityManager.getAllEntities() as RuntimeEntity[];
  const ballEntity = entities.find(e => e.id === 'ball');
  
  // Debug logging showing ball entity lookup
  if (ballEntity) {
    console.log('[BehaviorExecutor] Ball entity found:', {
      id: ballEntity.id,
      active: ballEntity.active,
      hasBodyId: !!ballEntity.bodyId,
      behaviorCount: ballEntity.behaviors.length,
      behaviors: ballEntity.behaviors.map(b => b.definition.type)
    });
  }
  
  const activeEntities = entities.filter(e => e.active);
  if (ballEntity) {
    console.log('[BehaviorExecutor] Total entities:', entities.length, 'Active entities:', activeEntities.length);
    console.log('[BehaviorExecutor] Ball is active:', ballEntity.active, 'Included in activeEntities:', activeEntities.includes(ballEntity));
  }
  
  const behaviorContext = this.createBehaviorContext(ctx);
  this.behaviorExecutor.executeAll(activeEntities, behaviorContext);
}
```

## Conclusions

### ✅ entityManager Reference is Correct
- The entityManager reference passed to BehaviorExecutorRuntimeSystem.initialize() is the SAME instance that contains all game entities
- No timing issues: entities are created BEFORE systems are initialized
- The ball entity exists in the entityManager when systems are initialized

### ✅ No Null/Wrong Reference Issues
- systemContext is properly stored as a class property
- Guard clauses check for null systemContext in update()
- entityManager is always accessed through systemContext

### ✅ Entity Active Status Should Be True
- All entities created with `active: true` by default
- No evidence of entities being marked inactive during initialization

### ✅ Active Entity Filtering Works Correctly
- getAllEntities() returns all entities
- Active filtering happens with `.filter(e => e.active)`
- Ball with `active: true` should be included in activeEntities

## Potential Issues to Investigate Next

1. **Check if ball has unique ID**: Verify ball entity ID is exactly 'ball' (case-sensitive)
2. **Check if ball.active is actually true**: Add debugging to confirm active status
3. **Check if ball has behaviors**: Verify ball entity has behaviors defined
4. **Check behavior execution**: Verify BehaviorExecutor.executeAll() is processing the activeEntities correctly
5. **Check console output**: The BehaviorExecutorRuntimeSystem has debug logging - verify it's being executed and check the output

## Files Involved

1. `./app/lib/game-engine/systems/runner/wrappers/BehaviorExecutorRuntimeSystem.ts`
2. `./app/lib/game-engine/systems/runner/GameSystemRunner.ts`
3. `./app/lib/game-engine/systems/runner/types.ts`
4. `./app/lib/game-engine/GameRuntime.godot.tsx`
5. `./app/lib/game-engine/GameLoader.ts`
6. `./app/lib/game-engine/EntityManager.ts`

## Timeline Summary

```
1. GameLoader.load()     → Creates EntityManager + all entities (including ball)
2. GameSystemRunner.new() → Creates runner instance  
3. System registration   → Registers all systems
4. SystemContext.create  → Context with entityManager (already populated)
5. runner.initialize()   → Calls initialize() on all systems with context
6. BehaviorExecutorRuntimeSystem.update() → Gets entities from entityManager
```

**Conclusion**: The initialization flow is correct. The entityManager reference passed to BehaviorExecutorRuntimeSystem contains the ball entity with `active: true`. No timing issues or null reference problems were found in the initialization chain.
