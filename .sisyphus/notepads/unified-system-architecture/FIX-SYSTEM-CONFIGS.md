# FIX: GameSystemRunner Config Initialization Bug

> **Created:** 2026-01-31
> **Priority:** CRITICAL - Game does not load
> **Status:** Implementation plan ready, needs execution

## The Bug

When loading any game (e.g., breakoutBouncer), it fails with:

```
[GameRuntime.godot] Failed to initialize game: TypeError: Cannot read properties of undefined (reading 'position')
    at new CameraSystem
    at CameraRuntimeSystem.initialize
    at GameSystemRunner.initialize
```

## Root Cause

In `app/lib/game-engine/systems/runner/GameSystemRunner.ts` line 42:

```typescript
for (const system of this.systems) {
  await system.initialize(contextWithQueue, system.getState());
}
```

**The problem:** `system.getState()` returns **STATE** (runtime values), not **CONFIG** (initialization parameters).

Example for CameraRuntimeSystem:
- `getState()` returns: `{ position: {x:0, y:0}, zoom: 1, trauma: 0 }`
- `initialize()` expects: `{ cameraConfig: {...}, viewport: {...}, pixelsPerMeter: 50 }`

When `CameraSystem` constructor tries to access `config.cameraConfig.position`, it's undefined.

## Solution: Constructor-Based Config

Pass config to system constructor, store it, use during `initialize()`.

**Pattern:**
```typescript
export class CameraRuntimeSystem implements RuntimeSystem<CameraSystemConfig, CameraSystemState> {
  private config: CameraSystemConfig;
  
  constructor(config: CameraSystemConfig) {
    this.config = config;
  }
  
  initialize(ctx: SystemContext, _ignored: CameraSystemConfig): void {
    // Use this.config, not the parameter
    this.camera = new CameraSystem(
      this.config.cameraConfig,
      this.config.viewport,
      this.config.pixelsPerMeter
    );
    this.entityManager = ctx.entityManager;
  }
}
```

## Files to Modify

### 1. CameraRuntimeSystem.ts

**File:** `app/lib/game-engine/systems/runner/wrappers/CameraRuntimeSystem.ts`

**Current:**
```typescript
export class CameraRuntimeSystem implements RuntimeSystem<CameraSystemConfig, CameraSystemState> {
  readonly id = 'camera';
  readonly phase = SystemPhase.PRE_UPDATE;
  readonly priority = 50;
  
  private camera: CameraSystem | null = null;
  private entityManager: EntityManager | null = null;
  
  initialize(ctx: SystemContext, config: CameraSystemConfig): void {
    this.camera = new CameraSystem(
      config.cameraConfig,
      config.viewport,
      config.pixelsPerMeter
    );
    this.entityManager = ctx.entityManager;
  }
  // ...
}
```

**Change to:**
```typescript
export class CameraRuntimeSystem implements RuntimeSystem<CameraSystemConfig, CameraSystemState> {
  readonly id = 'camera';
  readonly phase = SystemPhase.PRE_UPDATE;
  readonly priority = 50;
  
  private config: CameraSystemConfig;
  private camera: CameraSystem | null = null;
  private entityManager: EntityManager | null = null;
  
  constructor(config: CameraSystemConfig) {
    this.config = config;
  }
  
  initialize(ctx: SystemContext, _config: CameraSystemConfig): void {
    this.camera = new CameraSystem(
      this.config.cameraConfig,
      this.config.viewport,
      this.config.pixelsPerMeter
    );
    this.entityManager = ctx.entityManager;
  }
  // ... rest unchanged
}
```

### 2. BehaviorExecutorRuntimeSystem.ts

**File:** `app/lib/game-engine/systems/runner/wrappers/BehaviorExecutorRuntimeSystem.ts`

**Add constructor:**
```typescript
private config: BehaviorExecutorSystemConfig;

constructor(config: BehaviorExecutorSystemConfig) {
  this.config = config;
}

initialize(ctx: SystemContext, _config: BehaviorExecutorSystemConfig): void {
  this.systemContext = ctx;
  // Use this.config.pixelsPerMeter instead of config.pixelsPerMeter
  this.behaviorExecutor = createBehaviorExecutor();
}
```

### 3. RulesRuntimeSystem.ts

**File:** `app/lib/game-engine/systems/runner/wrappers/RulesRuntimeSystem.ts`

**Add constructor:**
```typescript
private config: RulesSystemConfig;

constructor(config: RulesSystemConfig) {
  this.config = config;
}

initialize(ctx: SystemContext, _config: RulesSystemConfig): void {
  this.systemContext = ctx;
  this.rulesEvaluator = new RulesEvaluator(ctx.entityManager, this.config.containers);
  
  this.rulesEvaluator.loadRules(this.config.rules);
  this.rulesEvaluator.setWinCondition(this.config.winCondition);
  this.rulesEvaluator.setLoseCondition(this.config.loseCondition);
  
  if (this.config.variables) {
    this.rulesEvaluator.setInitialVariables(this.config.variables);
  }
}
```

### 4. ScriptSandboxRuntimeSystem.ts

**File:** `app/lib/game-engine/systems/runner/wrappers/ScriptSandboxRuntimeSystem.ts`

**Add constructor:**
```typescript
private config: ScriptSandboxSystemConfig;

constructor(config: ScriptSandboxSystemConfig) {
  this.config = config;
}

async initialize(ctx: SystemContext, _config: ScriptSandboxSystemConfig): Promise<void> {
  this.systemContext = ctx;
  
  const sandboxConfig: ScriptSandboxConfig = {
    scriptCode: this.config.scriptCode,
    scriptId: this.config.scriptId,
    gameId: this.config.gameId,
  };
  
  this.sandbox = new ScriptSandbox(sandboxConfig);
  // ... rest unchanged
}
```

### 5. Systems That DON'T Need Config Changes

These systems have empty/simple configs and can use empty constructors:

- **ViewportRuntimeSystem** - No config needed, add empty constructor
- **InputRuntimeSystem** - No config needed, add empty constructor  
- **EntityManagerRuntimeSystem** - No config needed, add empty constructor
- **ComputedValuesRuntimeSystem** - No config needed, add empty constructor
- **PropertySyncRuntimeSystem** - No config needed, add empty constructor
- **TweenRuntimeSystem** - No config needed, add empty constructor

For these, add:
```typescript
constructor() {}
```

### 6. Conditional Systems (Match3, SlotMachine, Container)

These are only registered if the game uses them. Check their Config interfaces and add constructors:

- **Match3RuntimeSystem** - needs Match3Config
- **SlotMachineRuntimeSystem** - needs SlotMachineConfig
- **ContainerRuntimeSystem** - needs ContainerConfig[]

### 7. GameRuntime.godot.tsx

**File:** `app/lib/game-engine/GameRuntime.godot.tsx`

**Current (around line 789):**
```typescript
runner.register(new ViewportRuntimeSystem());
runner.register(new InputRuntimeSystem());
runner.register(new CameraRuntimeSystem());
runner.register(new EntityManagerRuntimeSystem());
runner.register(new ComputedValuesRuntimeSystem());
runner.register(new PropertySyncRuntimeSystem());

runner.register(new BehaviorExecutorRuntimeSystem());
runner.register(new ScriptSandboxRuntimeSystem());
runner.register(new RulesRuntimeSystem());
```

**Change to:**
```typescript
// Systems without configs (add empty constructors to these)
runner.register(new ViewportRuntimeSystem());
runner.register(new InputRuntimeSystem());
runner.register(new EntityManagerRuntimeSystem());
runner.register(new ComputedValuesRuntimeSystem());
runner.register(new PropertySyncRuntimeSystem());

// Camera needs config
runner.register(new CameraRuntimeSystem({
  cameraConfig: definition.camera,
  viewport: { width: 800, height: 600 },
  pixelsPerMeter: definition.world.pixelsPerMeter ?? 50,
}));

// BehaviorExecutor needs pixelsPerMeter
runner.register(new BehaviorExecutorRuntimeSystem({
  pixelsPerMeter: definition.world.pixelsPerMeter ?? 50,
}));

// ScriptSandbox needs script config (only if script exists)
if (definition.script) {
  runner.register(new ScriptSandboxRuntimeSystem({
    scriptCode: definition.script,
    scriptId: definition.metadata.id,
    gameId: definition.metadata.id,
    constants: definition.constants,
  }));
}

// Rules needs game rules
runner.register(new RulesRuntimeSystem({
  rules: definition.rules ?? [],
  winCondition: definition.winCondition,
  loseCondition: definition.loseCondition,
  variables: definition.variables,
  containers: definition.containers,
}));

// Tween system
runner.register(new TweenRuntimeSystem());

// Conditional systems
if (definition.match3) {
  runner.register(new Match3RuntimeSystem(definition.match3));
}
if (definition.slotMachine) {
  runner.register(new SlotMachineRuntimeSystem(definition.slotMachine));
}
if (definition.containers && definition.containers.length > 0) {
  runner.register(new ContainerRuntimeSystem({ containers: definition.containers }));
}
```

## Config Interfaces Reference

### CameraSystemConfig
```typescript
interface CameraSystemConfig {
  cameraConfig: CameraConfig;  // from definition.camera
  viewport: ViewportSize;       // { width: 800, height: 600 }
  pixelsPerMeter: number;       // from definition.world.pixelsPerMeter ?? 50
}
```

### BehaviorExecutorSystemConfig
```typescript
interface BehaviorExecutorSystemConfig {
  pixelsPerMeter: number;
}
```

### ScriptSandboxSystemConfig
```typescript
interface ScriptSandboxSystemConfig {
  scriptCode: string;
  scriptId: string;
  gameId: string;
  constants?: Record<string, number | string | boolean>;
}
```

### RulesSystemConfig
```typescript
interface RulesSystemConfig {
  rules: GameRule[];
  winCondition?: WinCondition;
  loseCondition?: LoseCondition;
  variables?: Record<string, number | string | boolean>;
  containers?: ContainerConfig[];
}
```

## Verification Steps

After implementation:

1. **TypeScript check:**
   ```bash
   cd app && pnpm tsc --noEmit
   ```

2. **Run tests:**
   ```bash
   cd app && pnpm vitest run
   ```

3. **Test game loading:**
   - Open http://localhost:8085/test-games/breakoutBouncer
   - Should load without errors

## Summary

1. Add `private config` field to each system that needs config
2. Add constructor that accepts and stores config
3. Use `this.config` in `initialize()` instead of the passed parameter
4. Update `GameRuntime.godot.tsx` to pass proper configs when creating systems
5. Systems without configs get empty constructors
