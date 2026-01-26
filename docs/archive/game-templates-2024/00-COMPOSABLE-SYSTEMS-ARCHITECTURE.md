# Composable Game Systems Architecture

> A blueprint for building extensible helper systems that unlock diverse game genres

## Executive Summary

This document outlines a set of **composable helper systems** that layer on top of the existing entity-behavior-rules architecture. These systems are designed to:

1. **Integrate seamlessly** with existing behaviors, rules, and expressions
2. **Unlock multiple game genres** from a single implementation
3. **Support both skinning-only and full editing modes**
4. **Scale from simple to complex** without breaking backwards compatibility
5. **Be AI-generatable** through natural language descriptions

## Design Philosophy

### Layered Complexity

```
┌─────────────────────────────────────────────────────────────┐
│  GAME TEMPLATES (Skinnable presets)                        │
├─────────────────────────────────────────────────────────────┤
│  HELPER SYSTEMS (This document)                            │
│  Grid · Path · Spatial · Inventory · State · Progression   │
├─────────────────────────────────────────────────────────────┤
│  CORE ENGINE (Existing)                                    │
│  Entities · Behaviors · Rules · Physics · Expressions      │
└─────────────────────────────────────────────────────────────┘
```

### Integration Contract

Every helper system MUST:

1. **Expose to expressions** - Values readable as `system.property`
2. **Fire events** - State changes trigger `event` for rules
3. **Provide actions** - Rules can modify system state
4. **Support serialization** - Full state in GameDefinition JSON
5. **Be optional** - Games without the system work normally

---

## System 1: Grid/Cell System

### Purpose
Provides a 2D grid abstraction for games that need discrete cell-based logic.

### Unlocks
- Match-3 and puzzle games
- Chess/checkers-style games
- Tile-based strategy
- Minesweeper/Sudoku
- Grid-based building/farming

### Architecture

```typescript
// In GameDefinition
interface GridDefinition {
  id: string;
  rows: number;
  cols: number;
  cellSize: Vec2;
  origin: Vec2;  // World position of cell (0,0)
  
  // Optional: cell metadata
  cellTypes?: Record<string, CellTypeDefinition>;
  initialState?: (number | string)[][]; // Cell type per position
}

interface CellTypeDefinition {
  id: string;
  walkable?: boolean;
  tags?: string[];
  data?: Record<string, unknown>;
}

// Cell occupancy tracking (runtime)
interface GridState {
  cells: Map<string, string | null>; // "row,col" -> entityId
  cellData: Map<string, Record<string, unknown>>; // Per-cell variables
}
```

### Expression Integration

```javascript
// Read grid state in expressions
grid.rows                        // Number
grid.cols                        // Number
grid.cellAt(row, col)            // entityId | null
grid.cellType(row, col)          // string
grid.entityCell(entityId)        // {row, col} | null
grid.isOccupied(row, col)        // boolean
grid.adjacentCells(row, col)     // [{row, col}, ...]
grid.cellsWithTag(tag)           // [{row, col}, ...]
grid.countOccupied()             // number
grid.findPattern(pattern)        // [{row, col}, ...] (for match detection)
```

### Actions

```typescript
interface GridPlaceAction {
  type: 'grid_place';
  gridId: string;
  entityId: string | EntityTarget;
  row: Value<number>;
  col: Value<number>;
}

interface GridMoveAction {
  type: 'grid_move';
  gridId: string;
  entityId: string | EntityTarget;
  toRow: Value<number>;
  toCol: Value<number>;
  animate?: boolean;
  duration?: number;
}

interface GridSwapAction {
  type: 'grid_swap';
  gridId: string;
  cellA: { row: Value<number>; col: Value<number> };
  cellB: { row: Value<number>; col: Value<number> };
  animate?: boolean;
}

interface GridClearAction {
  type: 'grid_clear';
  gridId: string;
  cells: Array<{ row: number; col: number }>;
  effect?: 'none' | 'fade' | 'explode';
}

interface GridFillAction {
  type: 'grid_fill';
  gridId: string;
  template: string | string[];
  direction?: 'top' | 'bottom' | 'left' | 'right';
}

interface GridSetCellDataAction {
  type: 'grid_set_cell_data';
  gridId: string;
  row: Value<number>;
  col: Value<number>;
  key: string;
  value: Value<unknown>;
}
```

### Events

```
grid_cell_occupied      { gridId, row, col, entityId }
grid_cell_vacated       { gridId, row, col, previousEntityId }
grid_swap_complete      { gridId, cellA, cellB }
grid_pattern_matched    { gridId, pattern, cells }
grid_column_collapsed   { gridId, col }
grid_filled             { gridId }
```

### Behaviors

```typescript
interface GridSnapBehavior extends BaseBehavior {
  type: 'grid_snap';
  gridId: string;
  snapOnSpawn?: boolean;
  snapOnMove?: boolean;
}

interface GridGravityBehavior extends BaseBehavior {
  type: 'grid_gravity';
  gridId: string;
  direction: 'down' | 'up' | 'left' | 'right';
  speed?: number; // Cells per second, or instant if undefined
}
```

---

## System 2: Path/Waypoint System

### Purpose
Defines routes through the world that entities can follow, with support for curves, branches, and events.

### Unlocks
- Tower defense (enemy paths)
- Racing games (tracks, AI racing lines)
- Rail shooters
- On-rails platformers
- Guided tutorials
- Cutscene choreography

### Architecture

```typescript
interface PathDefinition {
  id: string;
  type: 'linear' | 'bezier' | 'catmull-rom';
  points: Vec2[];
  controlPoints?: Vec2[]; // For bezier curves
  loop?: boolean;
  
  // Optional metadata
  tags?: string[];
  events?: PathEvent[]; // Fire events at specific progress points
}

interface PathEvent {
  progress: number; // 0-1 along path
  eventName: string;
  data?: Record<string, unknown>;
}

// For branching paths (advanced)
interface PathNetwork {
  id: string;
  paths: PathDefinition[];
  nodes: PathNode[];
  connections: PathConnection[];
}

interface PathNode {
  id: string;
  position: Vec2;
  type: 'start' | 'end' | 'junction' | 'checkpoint';
}

interface PathConnection {
  fromNode: string;
  toNode: string;
  pathId: string;
  direction: 'forward' | 'backward' | 'both';
}
```

### Expression Integration

```javascript
// Path queries
path.length(pathId)                    // Total length in world units
path.pointAt(pathId, progress)         // Vec2 at 0-1 progress
path.tangentAt(pathId, progress)       // Direction vector
path.progressAt(pathId, position)      // Nearest progress value
path.distanceToPath(pathId, position)  // Distance to nearest point

// Entity path state
entity.pathProgress                    // 0-1 along current path
entity.pathId                          // Current path being followed
entity.pathSpeed                       // Current movement speed
```

### Actions

```typescript
interface StartPathAction {
  type: 'path_start';
  target: EntityTarget;
  pathId: string;
  speed: Value<number>;
  startProgress?: Value<number>;
  facing?: 'forward' | 'backward' | 'none';
}

interface StopPathAction {
  type: 'path_stop';
  target: EntityTarget;
}

interface SetPathSpeedAction {
  type: 'path_set_speed';
  target: EntityTarget;
  speed: Value<number>;
}

interface TeleportToPathAction {
  type: 'path_teleport';
  target: EntityTarget;
  pathId: string;
  progress: Value<number>;
}
```

### Events

```
path_started        { entityId, pathId }
path_progress       { entityId, pathId, progress }  // Continuous
path_waypoint       { entityId, pathId, waypointIndex }
path_event          { entityId, pathId, eventName, data }
path_completed      { entityId, pathId }
path_loop           { entityId, pathId, loopCount }
```

### Behaviors

```typescript
interface FollowPathBehavior extends BaseBehavior {
  type: 'follow_path';
  pathId: string;
  speed: Value<number>;
  startProgress?: Value<number>;
  rotateToFacing?: boolean;
  rotationOffset?: number;
  loop?: boolean;
  pingPong?: boolean;
  pauseAtWaypoints?: number; // Seconds
}

interface PathConstrainBehavior extends BaseBehavior {
  type: 'path_constrain';
  pathId: string;
  maxDistance: number; // Can't move further than this from path
}
```

---

## System 3: Spatial Query System

### Purpose
Efficient queries about entity positions, proximity, and regions.

### Unlocks
- Tower targeting (nearest enemy)
- Proximity triggers (area damage)
- Vision cones (stealth games)
- Flocking/swarming
- Auto-aim assist
- Any "find nearby" logic

### Architecture

```typescript
// Query types
interface SpatialQuery {
  origin: Vec2 | EntityTarget;
  radius?: number;
  tags?: string[];
  excludeIds?: string[];
  limit?: number;
  sort?: 'nearest' | 'farthest' | 'random';
}

interface RaycastQuery {
  origin: Vec2 | EntityTarget;
  direction: Vec2 | 'toward_touch' | 'toward_entity';
  maxDistance: number;
  tags?: string[];
  firstHitOnly?: boolean;
}

interface ConeQuery extends SpatialQuery {
  direction: Vec2 | number; // Angle or vector
  halfAngle: number; // Radians
}

interface RectQuery {
  bounds: Bounds;
  tags?: string[];
}
```

### Expression Integration

```javascript
// Proximity
nearest(fromEntity, tags)                    // entityId | null
nearestN(fromEntity, tags, count)            // entityId[]
entitiesInRadius(fromEntity, radius, tags)   // entityId[]
countInRadius(fromEntity, radius, tags)      // number
distanceTo(entityA, entityB)                 // number
distanceToNearest(fromEntity, tags)          // number

// Raycasting
raycast(origin, direction, maxDist, tags)    // {entityId, point, normal, distance}
raycastAll(origin, direction, maxDist, tags) // Same[]
lineOfSight(entityA, entityB)                // boolean

// Region
entitiesInRect(bounds, tags)                 // entityId[]
entitiesInCone(origin, direction, angle, radius, tags) // entityId[]
```

### Actions

```typescript
interface TargetNearestAction {
  type: 'target_nearest';
  source: EntityTarget;
  targetTags: string[];
  maxRadius?: Value<number>;
  storeIn: string; // Variable name
}

interface TargetAllInRadiusAction {
  type: 'target_all_in_radius';
  source: EntityTarget;
  radius: Value<number>;
  targetTags: string[];
  storeIn: string; // Variable name (array)
}

interface ApplyToNearbyAction {
  type: 'apply_to_nearby';
  source: EntityTarget;
  radius: Value<number>;
  targetTags: string[];
  action: RuleAction; // Nested action applied to each
}
```

### Events

```
entity_entered_radius   { sourceId, enteredId, radius }
entity_exited_radius    { sourceId, exitedId, radius }
```

### Behaviors

```typescript
interface ProximityTriggerBehavior extends BaseBehavior {
  type: 'proximity_trigger';
  radius: Value<number>;
  targetTags: string[];
  onEnter?: string; // Event name
  onExit?: string;
  onStay?: string;
  stayInterval?: number;
}

interface AutoTargetBehavior extends BaseBehavior {
  type: 'auto_target';
  radius: Value<number>;
  targetTags: string[];
  priority: 'nearest' | 'farthest' | 'lowest_health' | 'highest_health' | 'first' | 'random';
  retargetInterval?: number;
  storeIn?: string; // Variable name
}
```

---

## System 4: Inventory/Resource System

### Purpose
Generic system for tracking items, resources, currencies, and collectibles.

### Unlocks
- RPG inventory
- Crafting systems
- Currency/economy
- Collectibles and unlockables
- Ammo and consumables
- Card/deck mechanics

### Architecture

```typescript
// In GameDefinition
interface InventoryDefinition {
  id: string;
  owner?: string; // entityId or 'global'
  slots?: number; // Max items, undefined = unlimited
  stackable?: boolean;
  categories?: string[];
}

interface ItemDefinition {
  id: string;
  name: string;
  category?: string;
  maxStack?: number;
  data?: Record<string, unknown>;
}

interface ResourceDefinition {
  id: string;
  name: string;
  min?: number;
  max?: number;
  initial: number;
  regenRate?: number; // Per second
  regenDelay?: number; // Seconds after use before regen starts
}

// Runtime state
interface InventoryState {
  items: Map<string, { itemId: string; count: number; data?: unknown }>;
}

interface ResourceState {
  current: number;
  max: number;
  regenTimer?: number;
}
```

### Expression Integration

```javascript
// Inventory
inventory.has(inventoryId, itemId)           // boolean
inventory.count(inventoryId, itemId)         // number
inventory.totalItems(inventoryId)            // number
inventory.isFull(inventoryId)                // boolean
inventory.isEmpty(inventoryId)               // boolean
inventory.hasCategory(inventoryId, category) // boolean

// Resources
resource.current(resourceId)                 // number
resource.max(resourceId)                     // number
resource.percent(resourceId)                 // 0-1
resource.isFull(resourceId)                  // boolean
resource.isEmpty(resourceId)                 // boolean
resource.canAfford(resourceId, cost)         // boolean
```

### Actions

```typescript
interface AddItemAction {
  type: 'inventory_add';
  inventoryId: string;
  itemId: string;
  count?: Value<number>;
  data?: Record<string, unknown>;
}

interface RemoveItemAction {
  type: 'inventory_remove';
  inventoryId: string;
  itemId: string;
  count?: Value<number>;
}

interface TransferItemAction {
  type: 'inventory_transfer';
  fromInventory: string;
  toInventory: string;
  itemId: string;
  count?: Value<number>;
}

interface ClearInventoryAction {
  type: 'inventory_clear';
  inventoryId: string;
  category?: string; // Only clear this category
}

interface ModifyResourceAction {
  type: 'resource_modify';
  resourceId: string;
  operation: 'add' | 'subtract' | 'set' | 'fill' | 'drain';
  value: Value<number>;
}

interface SpendResourceAction {
  type: 'resource_spend';
  resourceId: string;
  cost: Value<number>;
  failEvent?: string; // Fire this event if can't afford
}
```

### Events

```
inventory_item_added     { inventoryId, itemId, count, newTotal }
inventory_item_removed   { inventoryId, itemId, count, newTotal }
inventory_full           { inventoryId }
inventory_empty          { inventoryId }
resource_changed         { resourceId, previous, current, max }
resource_depleted        { resourceId }
resource_filled          { resourceId }
resource_spent           { resourceId, cost, remaining }
resource_insufficient    { resourceId, needed, had }
```

### Behaviors

```typescript
interface CollectibleBehavior extends BaseBehavior {
  type: 'collectible';
  inventoryId: string;
  itemId: string;
  count?: Value<number>;
  collectorTags: string[];
  effect?: 'none' | 'fade' | 'shrink' | 'fly_to_ui';
}

interface ResourceRegenBehavior extends BaseBehavior {
  type: 'resource_regen';
  resourceId: string;
  // Uses definition's regenRate, or override:
  rate?: Value<number>;
  delay?: Value<number>;
}
```

---

## System 5: State Machine System

### Purpose
Formal state management for complex entity behaviors with clean transitions.

### Unlocks
- AI behavior trees (simplified)
- Character animation states
- Game phase management (menu → playing → paused → game over)
- Boss fight phases
- Tutorial sequences
- Multi-stage interactions

### Architecture

```typescript
interface StateMachineDefinition {
  id: string;
  owner?: string; // entityId or 'global'
  initialState: string;
  states: StateDefinition[];
  transitions: TransitionDefinition[];
}

interface StateDefinition {
  id: string;
  onEnter?: RuleAction[];
  onExit?: RuleAction[];
  onUpdate?: RuleAction[]; // Every frame while in state
  timeout?: number; // Auto-transition after N seconds
  timeoutTransition?: string; // Target state on timeout
}

interface TransitionDefinition {
  id: string;
  from: string | string[] | '*';
  to: string;
  trigger: TransitionTrigger;
  conditions?: RuleCondition[];
  actions?: RuleAction[]; // Run during transition
}

type TransitionTrigger =
  | { type: 'event'; eventName: string }
  | { type: 'condition'; condition: RuleCondition } // Evaluated each frame
  | { type: 'manual' }; // Only via action
```

### Expression Integration

```javascript
state.current(machineId)              // string - current state id
state.previous(machineId)             // string - previous state id
state.timeInState(machineId)          // number - seconds in current state
state.transitionCount(machineId)      // number - total transitions
state.is(machineId, stateId)          // boolean
state.canTransitionTo(machineId, stateId) // boolean
```

### Actions

```typescript
interface StateTransitionAction {
  type: 'state_transition';
  machineId: string;
  toState: string;
  force?: boolean; // Ignore conditions
}

interface StateSendEventAction {
  type: 'state_send_event';
  machineId: string;
  eventName: string;
  data?: Record<string, unknown>;
}
```

### Events

```
state_entered       { machineId, stateId, previousStateId }
state_exited        { machineId, stateId, nextStateId }
state_transition    { machineId, from, to, triggerId }
```

### Common Patterns

```typescript
// Enemy AI pattern
const enemyAI: StateMachineDefinition = {
  id: 'enemy_ai',
  initialState: 'idle',
  states: [
    { id: 'idle', onUpdate: [/* patrol behavior */] },
    { id: 'chase', onUpdate: [/* follow player */] },
    { id: 'attack', onEnter: [/* attack action */], timeout: 1, timeoutTransition: 'chase' },
    { id: 'dead', onEnter: [/* death anim, destroy */] }
  ],
  transitions: [
    { from: 'idle', to: 'chase', trigger: { type: 'condition', condition: { type: 'expression', expr: 'distanceTo(self, player) < 5' } } },
    { from: 'chase', to: 'attack', trigger: { type: 'condition', condition: { type: 'expression', expr: 'distanceTo(self, player) < 1' } } },
    { from: 'chase', to: 'idle', trigger: { type: 'condition', condition: { type: 'expression', expr: 'distanceTo(self, player) > 10' } } },
    { from: '*', to: 'dead', trigger: { type: 'event', eventName: 'health_depleted' } }
  ]
};
```

---

## System 6: Progression/Unlock System

### Purpose
Track player progress, achievements, unlockables, and meta-game state.

### Unlocks
- Achievement systems
- Unlockable content (characters, skins, levels)
- Star ratings (1-3 stars per level)
- XP and leveling
- Daily challenges
- Persistent high scores

### Architecture

```typescript
interface ProgressionDefinition {
  id: string;
  
  // Achievements
  achievements?: AchievementDefinition[];
  
  // Unlockables
  unlockables?: UnlockableDefinition[];
  
  // Levels/Stages
  stages?: StageDefinition[];
  
  // XP/Leveling
  xpCurve?: XPCurveDefinition;
}

interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  condition: RuleCondition; // When to unlock
  reward?: RewardDefinition;
  hidden?: boolean;
}

interface UnlockableDefinition {
  id: string;
  type: 'character' | 'skin' | 'level' | 'item' | 'ability';
  requirement: UnlockRequirement;
}

type UnlockRequirement =
  | { type: 'achievement'; achievementId: string }
  | { type: 'stage_complete'; stageId: string; stars?: number }
  | { type: 'xp_level'; level: number }
  | { type: 'currency'; currencyId: string; amount: number }
  | { type: 'playtime'; seconds: number };

interface StageDefinition {
  id: string;
  name: string;
  gameDefinitionId: string;
  prerequisites?: string[]; // Stage IDs that must be completed
  starConditions?: [RuleCondition, RuleCondition, RuleCondition]; // 1, 2, 3 star requirements
}

interface XPCurveDefinition {
  type: 'linear' | 'exponential' | 'custom';
  baseXP: number;
  multiplier?: number;
  customLevels?: number[]; // XP required for each level
}
```

### Expression Integration

```javascript
// Achievements
progress.hasAchievement(achievementId)      // boolean
progress.achievementCount()                 // number
progress.achievementPercent()               // 0-1

// Unlocks
progress.isUnlocked(unlockableId)           // boolean
progress.unlockedCount(type)                // number

// Stages
progress.stageCompleted(stageId)            // boolean
progress.stageStars(stageId)                // 0-3
progress.totalStars()                       // number
progress.currentStage()                     // stageId

// XP
progress.xp()                               // number
progress.level()                            // number
progress.xpToNextLevel()                    // number
progress.xpPercent()                        // 0-1 toward next level
```

### Actions

```typescript
interface GrantXPAction {
  type: 'progress_grant_xp';
  amount: Value<number>;
}

interface UnlockAction {
  type: 'progress_unlock';
  unlockableId: string;
}

interface CompleteStageAction {
  type: 'progress_complete_stage';
  stageId: string;
  stars?: Value<number>;
}

interface GrantAchievementAction {
  type: 'progress_grant_achievement';
  achievementId: string;
}
```

### Events

```
achievement_unlocked    { achievementId, name }
level_up               { newLevel, previousLevel }
stage_completed        { stageId, stars }
unlockable_unlocked    { unlockableId, type }
```

---

## System 7: Checkpoint/Savepoint System

### Purpose
Save and restore game state at specific points.

### Unlocks
- Platformer checkpoints
- Save points in longer games
- Retry from last checkpoint
- Level restart with preserved progress

### Architecture

```typescript
interface CheckpointDefinition {
  id: string;
  name?: string;
  position?: Vec2;
  triggerType: 'collision' | 'manual';
  triggerTags?: string[];
  saveScope: 'full' | 'partial';
  partialSave?: string[]; // Variable names to save
}

interface CheckpointState {
  id: string;
  timestamp: number;
  variables: Record<string, unknown>;
  entityStates?: EntitySnapshot[];
  score: number;
  lives: number;
}
```

### Expression Integration

```javascript
checkpoint.hasActive()           // boolean
checkpoint.activeId()            // string | null
checkpoint.timeSinceCheckpoint() // seconds
```

### Actions

```typescript
interface SaveCheckpointAction {
  type: 'checkpoint_save';
  checkpointId: string;
}

interface LoadCheckpointAction {
  type: 'checkpoint_load';
  checkpointId?: string; // Latest if undefined
}

interface ClearCheckpointsAction {
  type: 'checkpoint_clear';
}
```

### Events

```
checkpoint_saved    { checkpointId }
checkpoint_loaded   { checkpointId }
```

---

## System 8: Dynamic Collider System

### Purpose
Runtime modification of physics shapes and properties.

### Unlocks
- Hole.io (growing colliders)
- Shape-shifting gameplay
- Damage-based collider changes
- Morphing entities

### Architecture

```typescript
// Collider modification operations
interface ColliderModification {
  // For circles
  radius?: Value<number>;
  
  // For boxes
  width?: Value<number>;
  height?: Value<number>;
  
  // For all shapes
  scale?: Value<number>; // Uniform scale
  offset?: Vec2;
  
  // Physics properties
  density?: Value<number>;
  friction?: Value<number>;
  restitution?: Value<number>;
  isSensor?: boolean;
}
```

### Actions

```typescript
interface SetColliderAction {
  type: 'collider_set';
  target: EntityTarget;
  modification: ColliderModification;
  animate?: boolean;
  duration?: number;
}

interface ScaleColliderAction {
  type: 'collider_scale';
  target: EntityTarget;
  factor: Value<number>;
  animate?: boolean;
  duration?: number;
}
```

### Events

```
collider_resized    { entityId, previousSize, newSize }
```

---

## System 9: Wave/Spawner System

### Purpose
Managed spawning of entities in patterns, waves, and formations.

### Unlocks
- Tower defense waves
- Endless mode enemy spawning
- Bullet hell patterns
- Fruit Ninja-style object tosses
- Rhythm-based spawning

### Architecture

```typescript
interface WaveDefinition {
  id: string;
  waves: Wave[];
  autoStart?: boolean;
  delayBetweenWaves?: number;
  onAllWavesComplete?: string; // Event name
}

interface Wave {
  id: string;
  spawns: SpawnGroup[];
  duration?: number; // Wave ends after N seconds (or when all spawned)
  onWaveComplete?: string;
}

interface SpawnGroup {
  template: string | string[];
  count: Value<number>;
  interval: Value<number>; // Seconds between spawns
  delay?: Value<number>; // Delay before first spawn
  position: SpawnPosition;
  formation?: 'none' | 'line' | 'circle' | 'grid' | 'random_in_bounds';
  formationParams?: {
    spacing?: number;
    radius?: number;
    rows?: number;
    cols?: number;
    bounds?: Bounds;
  };
}
```

### Expression Integration

```javascript
wave.current(waveDefId)           // wave number (1-indexed)
wave.total(waveDefId)             // total waves
wave.isActive(waveDefId)          // boolean
wave.enemiesRemaining(waveDefId)  // entities spawned but not destroyed
wave.progress(waveDefId)          // 0-1 overall progress
```

### Actions

```typescript
interface StartWavesAction {
  type: 'waves_start';
  waveDefId: string;
}

interface NextWaveAction {
  type: 'waves_next';
  waveDefId: string;
}

interface PauseWavesAction {
  type: 'waves_pause';
  waveDefId: string;
}

interface ResumeWavesAction {
  type: 'waves_resume';
  waveDefId: string;
}
```

### Events

```
wave_started        { waveDefId, waveNumber }
wave_completed      { waveDefId, waveNumber }
all_waves_completed { waveDefId }
wave_spawn          { waveDefId, entityId, waveNumber }
```

---

## System 10: Combo/Chain System

### Purpose
Track sequences of actions and reward chains.

### Unlocks
- Fighting game combos
- Rhythm game chains
- Match-3 cascades
- Score multipliers
- Trick systems (skateboarding games)

### Architecture

```typescript
interface ComboDefinition {
  id: string;
  triggerEvent: string; // Event that increments combo
  timeout: number; // Seconds before combo resets
  multiplierCurve?: number[]; // Multiplier at combo count [1x, 1.5x, 2x, 3x, ...]
  tiers?: ComboTier[];
  maxCombo?: number;
}

interface ComboTier {
  threshold: number; // Combo count to reach this tier
  name: string;
  event?: string; // Fire event when tier reached
  bonus?: number; // Bonus points
}

interface ComboState {
  count: number;
  multiplier: number;
  tier: number;
  lastTriggerTime: number;
}
```

### Expression Integration

```javascript
combo.count(comboId)       // number
combo.multiplier(comboId)  // number
combo.tier(comboId)        // number
combo.tierName(comboId)    // string
combo.timeLeft(comboId)    // seconds until reset
combo.isActive(comboId)    // boolean
```

### Actions

```typescript
interface ComboIncrementAction {
  type: 'combo_increment';
  comboId: string;
  amount?: Value<number>;
}

interface ComboResetAction {
  type: 'combo_reset';
  comboId: string;
}
```

### Events

```
combo_incremented   { comboId, count, multiplier }
combo_tier_reached  { comboId, tier, tierName }
combo_reset         { comboId, finalCount }
combo_timeout       { comboId, finalCount }
```

---

## Implementation Priority Matrix

| System | Complexity | Games Unlocked | Reusability | Priority | Status |
|--------|------------|----------------|-------------|----------|--------|
| **Spatial Query** | Low | Many | Very High | 🔴 1st | ✅ Types + Expressions |
| **Path/Waypoint** | Medium | Many | High | 🔴 1st | ✅ Types + Expressions |
| **Dynamic Collider** | Low | Several | Medium | 🟡 2nd | ✅ Types + Expressions + Action Executor |
| **Wave/Spawner** | Medium | Several | High | 🟡 2nd | ✅ Types + Expressions |
| **Combo/Chain** | Low | Many | High | 🟡 2nd | ✅ Types + Expressions |
| **State Machine** | Medium | Many | Very High | 🟢 3rd | ✅ Types + Expressions |
| **Inventory/Resource** | Medium | Many | High | 🟢 3rd | ✅ Types + Expressions |
| **Grid/Cell** | High | Match-3, Puzzle | Medium | 🔵 4th | ✅ Types + Expressions |
| **Progression** | Medium | Meta-games | Medium | 🔵 4th | ✅ Types + Expressions |
| **Checkpoint** | Low | Platformers | Medium | 🔵 4th | ✅ Types + Expressions |

> **Implementation Note**: All 10 systems now have type definitions and expression functions implemented in `shared/src/systems/`. The Dynamic Collider system is fully wired with an action executor. Other systems need their action executors wired into the runtime engine (`app/lib/game-engine/rules/actions/`).

### Recommended Implementation Order

**Phase 1: Essential Primitives (Week 1-2)**
1. Spatial Query System
2. Path/Waypoint System
3. Dynamic Collider System

**Phase 2: Game Loop Enhancers (Week 3-4)**
4. Wave/Spawner System
5. Combo/Chain System
6. State Machine System

**Phase 3: Economy & Persistence (Week 5-6)**
7. Inventory/Resource System
8. Progression/Unlock System
9. Checkpoint/Savepoint System

**Phase 4: Advanced (Week 7+)**
10. Grid/Cell System (requires dedicated effort)

---

## Integration Example: Tower Defense

Using multiple systems together:

```typescript
const towerDefenseGame: GameDefinition = {
  // ... metadata, world, etc.
  
  // Systems used:
  paths: [
    { id: 'enemy_path', type: 'linear', points: [...] }
  ],
  
  waves: {
    id: 'enemy_waves',
    waves: [
      { spawns: [{ template: 'basic_enemy', count: 10, interval: 1.5, position: { type: 'path_start', pathId: 'enemy_path' } }] },
      { spawns: [{ template: 'fast_enemy', count: 15, interval: 1.0, position: { type: 'path_start', pathId: 'enemy_path' } }] },
    ]
  },
  
  resources: [
    { id: 'gold', initial: 100, max: 9999 }
  ],
  
  templates: {
    tower: {
      behaviors: [
        { type: 'auto_target', radius: 3, targetTags: ['enemy'], priority: 'nearest', storeIn: 'targetId' },
        { type: 'spawn_on_event', event: 'timer', interval: 0.5, template: 'projectile', spawnPosition: 'at_self' }
      ]
    },
    enemy: {
      behaviors: [
        { type: 'follow_path', pathId: 'enemy_path', speed: 2 },
        { type: 'health', maxHealth: 100, destroyOnDeath: true }
      ]
    }
  },
  
  rules: [
    { id: 'enemy_killed', trigger: { type: 'event', eventName: 'entity_destroyed' }, conditions: [{ type: 'entity_had_tag', tag: 'enemy' }], actions: [{ type: 'resource_modify', resourceId: 'gold', operation: 'add', value: 10 }] },
    { id: 'place_tower', trigger: { type: 'tap' }, conditions: [{ type: 'expression', expr: 'resource.canAfford("gold", 50)' }], actions: [{ type: 'spawn', template: 'tower', position: { type: 'at_touch' } }, { type: 'resource_spend', resourceId: 'gold', cost: 50 }] }
  ]
};
```

---

## Backwards Compatibility

All systems are **additive and optional**:

- Existing games work without modification
- Systems only activate when their definitions are present
- No changes to core entity/behavior/rule semantics
- Expression namespace prefixes prevent collisions

---

## AI Generation Considerations

Each system should be describable in natural language:

```
"Create a tower defense game where enemies follow a winding path. 
Towers automatically target the nearest enemy within range. 
Players earn gold from kills and spend it on new towers."

AI translates to:
- paths: [one path definition]
- resources: [gold definition]  
- templates with auto_target + follow_path behaviors
- rules for gold earning and tower placement
```

---

## Summary

These 10 composable systems provide the building blocks for a wide variety of game genres:

| Genre | Primary Systems |
|-------|-----------------|
| Match-3 | Grid, Combo |
| Tower Defense | Path, Spatial, Wave, Resource |
| Hole.io | Spatial, Dynamic Collider |
| Racing | Path, Checkpoint, State Machine |
| RPG | Inventory, State Machine, Progression |
| Endless Runner | Path, Wave, Combo, Checkpoint |
| Rhythm | Wave, Combo, State Machine |
| Strategy | Grid, Resource, State Machine |
| Platformer | Checkpoint, State Machine, Inventory |
| Shooter | Spatial, Wave, Combo, Resource |

By implementing these systems with consistent patterns (expressions, events, actions), we create a toolkit that scales from simple skinnable templates to fully user-customizable games.
