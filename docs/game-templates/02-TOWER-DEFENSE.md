# Tower Defense Game Archetype Analysis

> Strategic defense game where players place towers to stop waves of enemies

## Overview

**Genre**: Strategy / Defense  
**Examples**: Plants vs Zombies, Bloons TD, Kingdom Rush  
**Core Loop**: Enemies spawn → Follow path → Player places towers → Towers attack → Enemies die or reach end → Repeat waves

## Game Requirements

### Core Mechanics

| Mechanic | Description | Priority |
|----------|-------------|----------|
| Enemy Pathfinding | Enemies follow a predefined route | Critical |
| Tower Placement | Player places towers on valid spots | Critical |
| Auto-Targeting | Towers automatically target enemies | Critical |
| Projectile System | Towers shoot projectiles at enemies | Critical |
| Health System | Enemies have HP, die when depleted | Critical |
| Wave System | Enemies spawn in waves | Critical |
| Economy | Earn currency from kills, spend on towers | Critical |
| Win/Lose | Survive all waves / enemies reach end | Critical |
| Tower Types | Different tower stats and behaviors | High |
| Tower Upgrades | Improve existing towers | Medium |
| Enemy Types | Different speeds, HP, abilities | High |
| Range Indicators | Show tower range before/after placement | Medium |

### Visual Requirements

| Element | Description |
|---------|-------------|
| Map/Track | Background showing the enemy path |
| Path Visualization | Clear visual of enemy route |
| Tower Sprites | Distinct tower types |
| Enemy Sprites | Animated walking enemies |
| Projectile Sprites | Bullets, arrows, etc. |
| Damage VFX | Hit effects, death explosions |
| Range Circle | Semi-transparent range indicator |
| Health Bars | Enemy HP visualization |
| UI | Currency, wave counter, lives |

### Input Requirements

| Input | Action |
|-------|--------|
| Tap Tower Button | Select tower type to place |
| Tap Map | Place selected tower |
| Tap Existing Tower | Select for upgrade/sell |
| Drag (optional) | Preview placement position |

## Current Engine Capability Assessment

### What EXISTS Today

| Feature | Engine Support | Notes |
|---------|---------------|-------|
| Entity spawning | ✅ Full | Can spawn enemies and towers |
| Timer spawning | ✅ Full | `spawn_on_event` with timer |
| Health system | ✅ Full | `health` behavior |
| Damage on collision | ✅ Full | `damageFromTags` on health |
| Destroy on death | ✅ Full | `destroyOnDeath` option |
| Score/currency | ✅ Full | Variables + `score_on_collision` |
| Win/lose | ✅ Full | `entity_count` / `lives_zero` |
| Movement | ✅ Full | `move` behavior |
| Rotation toward target | ✅ Full | `rotate_toward` behavior |
| Visual effects | ✅ Full | Particles, animations |

### What's MISSING (Critical Gaps)

| Gap | Severity | Description |
|-----|----------|-------------|
| Path/Waypoint System | 🔴 Critical | No built-in path following |
| Spatial Queries | 🔴 Critical | No "nearest enemy in radius" query |
| Target Selection | 🔴 Critical | No way for tower to pick target |
| Projectile Tracking | 🟡 High | Projectiles don't home to targets |
| Tower Placement Grid | 🟡 High | No snap-to-grid placement |
| Wave Spawner | 🟡 High | Manual spawning via timers only |

## Feasibility Analysis

### Can It Be Built Today?

**Verdict: PARTIAL (50-65% coverage)**

Many TD mechanics map to existing behaviors, but the critical path-following and targeting systems are missing.

### Workaround Approach (Partially Viable)

```
1. Path: Chain of invisible waypoint entities
   - Enemy uses `move toward_target` behavior
   - On collision with waypoint, rule changes target to next waypoint
   - Problem: Awkward authoring, easy to break

2. Targeting: Collision-based
   - Tower has large sensor circle (range)
   - On enemy entering sensor, spawn projectile toward enemy position
   - Problem: No "nearest" selection, fires at all enemies

3. Projectiles: Physics-based
   - Spawn with initial velocity toward target
   - destroy_on_collision with enemy
   - Problem: Moving enemy = miss, no homing

4. Waves: Timer rules
   - Timer trigger spawns batch of enemies
   - Variables track wave number
   - Workable but verbose
```

**Assessment**: This approach CAN work for a simple TD, but scaling to multiple tower types, proper targeting, and reliable projectile hits is painful.

### Recommended Engine Additions

#### 1. Path System

```typescript
// New type in shared/src/types/path.ts
interface PathDefinition {
  id: string;
  waypoints: Vec2[]; // Ordered list of points
  loop?: boolean;
}

// New behavior
interface FollowPathBehavior extends BaseBehavior {
  type: 'follow_path';
  pathId: string;
  speed: number;
  rotateToFacing?: boolean;
  startOffset?: number; // 0-1, position along path
  // Fires event 'path_end' when reaching last waypoint
}
```

#### 2. Spatial Query System

```typescript
// New expression functions
// nearestEntity(fromPos, tags, maxRadius) → entityId | null
// entitiesInRadius(fromPos, tags, radius) → entityId[]
// distanceToNearest(fromPos, tags) → number

// New action
interface TargetNearestAction {
  type: 'target_nearest';
  sourceEntity: { type: 'by_id' | 'by_tag'; ... };
  targetTags: string[];
  maxRadius: number;
  storeIn: string; // Variable name to store target entityId
}
```

#### 3. Projectile System

```typescript
// New behavior (or enhance move)
interface SeekTargetBehavior extends BaseBehavior {
  type: 'seek_target';
  target: string; // entityId variable name
  speed: number;
  turnRate?: number; // For homing missiles
  destroyOnReach?: boolean;
  reachDistance?: number;
}

// Or simpler: enhance spawn action
interface SpawnAction {
  // ... existing
  aimAtTag?: string; // Spawn projectile aimed at nearest with tag
  inheritTargetFrom?: string; // Copy parent's target variable
}
```

#### 4. Wave Spawner

```typescript
interface WaveDefinition {
  enemyTemplate: string;
  count: number;
  interval: number; // Seconds between spawns
  delay?: number; // Delay before wave starts
}

interface WaveSpawnerBehavior extends BaseBehavior {
  type: 'wave_spawner';
  waves: WaveDefinition[];
  spawnPosition: SpawnPosition;
  onWaveComplete?: string; // Event name
  onAllWavesComplete?: string;
}
```

## Implementation Phases

### Phase 1: Path System (Engine Work)
**Effort: Short-Medium (1-2 days)**

1. Define `PathDefinition` type
2. Add `paths` array to `GameDefinition`
3. Implement `follow_path` behavior
4. Handle waypoint interpolation and turning
5. Fire `path_end` event at completion
6. Add path visualization for debugging

### Phase 2: Spatial Queries (Engine Work)
**Effort: Medium (2-3 days)**

1. Implement entity spatial index (simple grid or quadtree)
2. Add `nearestEntity()` expression function
3. Add `entitiesInRadius()` expression function
4. Add `target_nearest` action
5. Add `targetEntityId` variable convention for entities

### Phase 3: Basic Tower Defense Game
**Effort: Medium (2-3 days)**

1. Create map with path visualization
2. Create enemy templates (walker, fast, tank)
3. Create tower templates with range sensors
4. Implement tower placement (tap to place)
5. Wire up targeting via `target_nearest` + timers
6. Create projectile with `move toward_target`
7. Implement wave spawning via timers
8. Add economy (kills give currency)
9. Win condition: survive all waves
10. Lose condition: lives reach zero

### Phase 4: Polish & Tower Variety
**Effort: Medium (2-3 days)**

1. Add multiple tower types:
   - Basic: Single target, moderate damage
   - Splash: Area damage on impact
   - Slow: Applies slow effect
   - Sniper: Long range, high damage, slow fire
2. Add tower upgrade system (improve stats)
3. Add range indicator on tap/hold
4. Add enemy health bars
5. Add more enemy types with abilities
6. Polish VFX and audio

### Phase 5: Template & Skinning
**Effort: Short (1 day)**

1. Extract parameters:
   - Map/path definition
   - Tower types and stats
   - Enemy types and stats
   - Wave configurations
   - Economy values
2. Create asset pack structure
3. Document skinning API

## Skinnable Template Design

```typescript
interface TowerDefenseTemplate {
  // Map
  map: {
    background: string;
    paths: PathDefinition[];
    placementGrid?: { rows: number; cols: number; validCells: number[] };
  };
  
  // Towers
  towers: Array<{
    id: string;
    name: string;
    cost: number;
    range: number;
    damage: number;
    fireRate: number; // Shots per second
    projectileSpeed: number;
    spriteTemplate: string;
    projectileTemplate: string;
    special?: 'splash' | 'slow' | 'chain';
    upgrades?: Array<{ cost: number; statBoosts: Record<string, number> }>;
  }>;
  
  // Enemies
  enemies: Array<{
    id: string;
    health: number;
    speed: number;
    reward: number;
    spriteTemplate: string;
    special?: 'flying' | 'armored' | 'spawner';
  }>;
  
  // Waves
  waves: Array<{
    enemies: Array<{ type: string; count: number; interval: number }>;
    bonusCurrency?: number;
  }>;
  
  // Economy
  economy: {
    startingCurrency: number;
    killReward: (enemy: EnemyType) => number;
  };
  
  // Lives
  lives: {
    starting: number;
    lostPerEnemy: number;
  };
}
```

## Asset Requirements for Skinning

| Asset Type | Count | Description |
|------------|-------|-------------|
| Map Background | 1 | Full map with path visual |
| Tower Sprites | 4-6 | One per tower type |
| Enemy Sprites | 4-6 | Animated walk cycle |
| Projectile Sprites | 4-6 | One per tower type |
| Hit VFX | 2-3 | Impact, splash, slow |
| Death VFX | 1-2 | Enemy death explosion |
| UI Elements | 5+ | Currency, wave, lives, tower buttons |
| Sound Effects | 8+ | Shoot, hit, death, place, upgrade, wave start |

## Complexity Summary

| Aspect | Rating | Notes |
|--------|--------|-------|
| Engine Changes | 🟡 Medium | Path + spatial queries needed |
| Game Implementation | 🟡 Medium | Standard with new primitives |
| Skinning Support | 🟢 Low | Highly parameterizable |
| AI Generation Fit | 🟢 Good | Enemies/towers are data-driven |

## Recommended Priority

**THIRD (3rd of 4 games)**

Tower Defense requires two key engine additions (path following, spatial queries) that are independently useful. Implement after Racing and Hole.io, which validate simpler primitives first.

## Quick Win: Minimal TD

If you want a TD-like experience without engine changes:

1. Use manual waypoint entities + `follow` behavior (follow chain)
2. Towers spawn projectiles on timer (not targeted)
3. Projectiles move in straight line, destroy on any enemy collision
4. Accept imprecise gameplay

This creates a "tower shooter" that feels TD-adjacent without the full targeting system.

## Related Engine Tickets

After this analysis, file these engine enhancement requests:

1. **[behavior] follow_path** - Waypoint-based movement
2. **[expression] nearestEntity()** - Spatial query function
3. **[expression] entitiesInRadius()** - Spatial query function  
4. **[action] target_nearest** - Select target entity
5. **[behavior] seek_target** - Homing projectile behavior
6. **[behavior] wave_spawner** - Automated wave management
