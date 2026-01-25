# Generic Property Watching System

**Status**: Approved ✅  
**Created**: 2026-01-25  
**Approved**: 2026-01-25 (User confirmed Option 1: Full Implementation)  
**Type**: Oracle Plan  
**Priority**: Critical  
**Effort**: 3 weeks  
**Dual Purpose**: Property Sync + Game Validation  

## Problem Statement

Current velocity synchronization between TypeScript (game logic) and Godot (physics) is broken:
- TypeScript maintains a cache that never updates from Godot
- `maintain_speed` behavior reads stale (0,0) velocity even though ball is moving
- This is a symptom of a larger architectural issue: **no systematic way to sync ANY property from Godot to TypeScript**

## Root Cause Analysis

The expression system supports accessing entity properties:
- `self.velocity.x` - velocity components
- `self.transform.x` - position
- `self.health` - custom properties
- `entities_with_tag.enemy.count` - aggregate queries

**All of these need Godot data, but there's no sync mechanism.**

Current transform sync works because it blindly syncs ALL entities ALL properties at 60Hz. This doesn't scale to:
- Custom properties (health, ammo, state)
- Future features (animation state, pathfinding)
- 1000+ entities (bandwidth explosion)

## Proposed Solution

**Demand-Driven Property Watching System with Built-in Validation**:

### Primary Purpose: Property Synchronization
1. **Analyze** game definition (behaviors, rules) to identify property dependencies
2. **Register** watches for only the properties actually used
3. **Sync** watched properties at 60Hz from Godot → TypeScript cache
4. **Evaluate** expressions by reading from cache (synchronous, instant)

### Secondary Purpose: Game Validation (BONUS!)
**Key Insight from User**: The same DependencyAnalyzer can validate AI-generated games!

When a game loads, the analyzer produces a **Validation Report**:
- ✅ All property references are valid (entity has required properties)
- ✅ All entity tags referenced actually exist in the game
- ✅ All behaviors are compatible with entity physics config
- ✅ No circular dependencies or impossible conditions
- ❌ **Errors**: Missing properties, undefined tags, type mismatches
- ⚠️ **Warnings**: Unused entities, unreachable rules, performance concerns

**This is CRITICAL for AI game generation** - we can detect broken games before they crash!

### Architecture (Dual Purpose)

```
┌─────────────────────────────────────────────────────────────┐
│ TYPESCRIPT                                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  GameDefinition (JSON)                                     │
│       ↓                                                     │
│  DependencyAnalyzer                                        │
│       ├──→ ValidationReport ────→ Console/UI/Logs          │
│       │    (errors, warnings,                              │
│       │     dependency graph)                              │
│       │                                                     │
│       └──→ PropertyWatchSpec[] ──→ WatchRegistry           │
│                                         ↓                   │
│                                    Configure Godot          │
│                                         ↓                   │
│                                    PropertyCache ←─ Sync    │
│                                         ↑                   │
└─────────────────────────────────────────┼───────────────────┘
                                          │
                                 GodotBridge (60Hz)
                                          │
┌─────────────────────────────────────────┼───────────────────┐
│ GODOT                                   ↓                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PropertyCollector.gd                                      │
│    - Iterate watched entities                              │
│    - Extract watched properties                            │
│    - Send compact payload                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Validation Report Example**:
```typescript
{
  valid: true,
  errors: [],
  warnings: [
    "Entity 'enemy' has tag 'projectile' but no behaviors use it",
    "Rule 'spawn_powerup' references tag 'boss' but no entities have it"
  ],
  stats: {
    totalExpressions: 15,
    propertiesWatched: ["velocity.x", "velocity.y", "health"],
    entitiesAffected: 3,
    estimatedBandwidth: "2.4 KB/frame"
  },
  dependencyGraph: {
    "ball": { needs: ["velocity.x", "velocity.y"], behaviors: ["maintain_speed"] },
    "player": { needs: ["health"], behaviors: ["health_system"] }
  }
}
```

### Example: Breakout Bouncer

**Expression**: `{type: "maintain_speed", speed: {expr: "7 + score * 0.1"}}`

**Analysis**:
- Behavior uses `maintain_speed` which calls `getLinearVelocity()`
- Needs: `velocity.x`, `velocity.y` for entities with "ball" tag

**Result**:
- Watch registered: `{property: "velocity.x", scope: {type: "by_tag", tag: "ball"}}`
- Godot syncs: Only ball velocity (not paddle, bricks, walls)
- Bandwidth: 2 entities × 2 properties = 16 bytes/frame (vs 30+ entities × 6 properties = 720+ bytes)

## Key Design Decisions

### 1. Property Granularity
**Decision**: Individual components (`velocity.x`, `velocity.y` separate)  
**Rationale**: Expressions often only need one axis, saves bandwidth  

### 2. Change-Based Properties
**Decision**: Sync every frame (Phase 1), event-driven in Phase 2  
**Rationale**: Simpler implementation, optimize later if profiling shows need  

### 3. Dynamic Dependencies
**Decision**: Require static tag strings, error on dynamic  
**Rationale**: Better performance, clear error message guides developers  

### 4. Payload Format
**Decision**: JSON for Phase 1, binary optimization in Phase 3  
**Rationale**: Simpler debugging, ~5KB/frame is acceptable for 100 entities  

### 5. Web Workers
**Decision**: Main thread for Phase 1, worker optimization in Phase 3  
**Rationale**: 0.5ms blocking acceptable, workers add complexity  

## Validation Report System

### Report Structure

```typescript
interface ValidationReport {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  stats: ValidationStats;
  dependencyGraph: DependencyGraph;
}

interface ValidationError {
  severity: 'error';
  code: string; // 'MISSING_PROPERTY', 'UNDEFINED_TAG', 'TYPE_MISMATCH', etc.
  message: string;
  location: {
    file?: string;
    entity?: string;
    behavior?: string;
    rule?: string;
    expression?: string;
  };
  suggestion?: string;
}

interface ValidationWarning {
  severity: 'warning';
  code: string; // 'UNUSED_ENTITY', 'UNREACHABLE_RULE', 'PERFORMANCE', etc.
  message: string;
  location: { /* same as error */ };
}

interface ValidationStats {
  totalExpressions: number;
  totalBehaviors: number;
  totalRules: number;
  propertiesWatched: string[];
  entitiesAffected: number;
  estimatedBandwidth: string; // "2.4 KB/frame"
  estimatedCPU: string; // "0.5 ms/frame"
}

interface DependencyGraph {
  [entityId: string]: {
    needs: string[]; // Properties this entity needs synced
    behaviors: string[]; // Behaviors that need these properties
    usedByRules: string[]; // Rules that reference this entity
  };
}
```

### Validation Checks

| Check | Error Code | Example |
|-------|-----------|---------|
| **Property Existence** | `MISSING_PROPERTY` | `self.velocity.x` but entity is static (no velocity) |
| **Tag Reference** | `UNDEFINED_TAG` | `entities_with_tag('enemy')` but no entity has 'enemy' tag |
| **Type Compatibility** | `TYPE_MISMATCH` | `self.health > "100"` (comparing number to string) |
| **Physics Compatibility** | `PHYSICS_MISMATCH` | `maintain_speed` behavior on static entity |
| **Circular Dependency** | `CIRCULAR_DEP` | Rule A spawns entity B which triggers rule A |
| **Unreachable Code** | `UNREACHABLE` | Rule with impossible condition (`score > 100 AND score < 50`) |
| **Performance** | `PERF_CONCERN` | Watching 1000+ entities for all properties |

### Integration with AI Game Generation

```typescript
// In AI game generation pipeline:
const gameDefinition = await generateGame(prompt);

// BEFORE loading into engine, validate:
const report = DependencyAnalyzer.validate(gameDefinition);

if (!report.valid) {
  // Log errors for AI training
  console.error('[AI Generation Failed]', report.errors);
  
  // Attempt auto-fix (Phase 2 feature)
  const fixed = await AIFixer.attemptFix(gameDefinition, report.errors);
  
  // Re-validate
  const fixedReport = DependencyAnalyzer.validate(fixed);
  
  if (!fixedReport.valid) {
    // Give up, show errors to user
    throw new GameValidationError(fixedReport);
  }
}

// Validation passed - safe to load!
await loadGame(gameDefinition);
```

### Validation Report UI (Future)

In the game editor or AI generation modal, show:

```
✅ Game Validation Report
────────────────────────────────────────
✅ No errors found
⚠️  2 warnings:

  ⚠️  Entity 'enemy' has tag 'projectile' but no 
      behaviors use it
      → Suggestion: Remove unused tag or add behavior

  ⚠️  Estimated bandwidth: 8.2 KB/frame (high for mobile)
      → Suggestion: Reduce watched properties or entity count

📊 Stats:
  • 15 expressions analyzed
  • 3 properties watched (velocity.x, velocity.y, health)
  • 5 entities affected
  • Estimated CPU: 0.5 ms/frame (3% of 16ms budget)

🔗 Dependency Graph:
  ball → velocity.x, velocity.y (maintain_speed)
  player → health (health_system)
  enemy → health (health_system)
```

## Implementation Plan

### Phase 1: Foundation (Week 1)
- [ ] Define `PropertyWatchSpec` and `ValidationReport` types
- [ ] Implement `DependencyAnalyzer` core:
  - [ ] AST walker for expression analysis
  - [ ] Property path extraction
  - [ ] **Validation engine** (check property existence, tag references, types)
  - [ ] **Report generation** (errors, warnings, stats, dependency graph)
- [ ] Implement `WatchRegistry` (deduplication, lifecycle management)
- [ ] Implement `PropertyCache` (frame-synchronized cache)
- [ ] Add `EntityContextProxy` (lazy property reads)
- [ ] Unit tests:
  - [ ] Property analysis (correct extraction)
  - [ ] Validation (detect all error types)
  - [ ] Cache behavior (sync, reads, invalidation)
  - [ ] Report generation (correct stats and graph)

### Phase 2: Godot Integration (Week 2)
- [ ] Implement `PropertyCollector.gd` (bulk property extraction)
- [ ] Update `GameBridge.gd` (watch configuration API)
- [ ] Web sync protocol (postMessage with JSON payload)
- [ ] Native sync protocol (JSI worklet synchronous return)
- [ ] Integration tests (end-to-end sync verification)

### Phase 3: Migration & Optimization (Week 3)
- [ ] Remove old velocity cache logic
- [ ] Update all behaviors to use new system
- [ ] **Integrate validation report into game load flow** (log to console)
- [ ] **Add validation to AI game generator** (pre-flight check)
- [ ] Performance profiling (frame time, bandwidth)
- [ ] Payload size optimization (if needed)
- [ ] Watch deduplication and merging
- [ ] Documentation:
  - [ ] Architecture guide (property watching + validation)
  - [ ] API reference (DependencyAnalyzer, WatchRegistry, PropertyCache)
  - [ ] **Validation error catalog** (all error codes + fixes)

## Success Metrics

### Property Watching

| Metric | Target | Measurement |
|--------|--------|-------------|
| Expression evaluation overhead | < 5% frame time | Profile with 100 expressions/frame |
| Property sync overhead | < 1 ms/frame | Profile Godot collector + bridge |
| Cache hit rate | > 99% | Log cache misses |
| Payload size | < 10 KB/frame | Monitor network tab |
| Backwards compatibility | 100% | Regression test all example games |

### Validation

| Metric | Target | Measurement |
|--------|--------|-------------|
| Error detection rate | > 95% | Test with known-broken game definitions |
| False positive rate | < 5% | Test with valid games, check spurious errors |
| Validation time | < 100ms | Load time profiling |
| AI game fix success rate | > 70% (Phase 2) | Track auto-fix effectiveness |

## Performance Analysis

**CPU Overhead** (per frame):
- Godot property collection: 0.2-0.5 ms
- JSON serialization: 0.1-0.3 ms
- Bridge transfer: 0.1-0.2 ms
- Cache update: 0.05-0.1 ms
- **Total: 0.45-1.1 ms (3-7% of 16ms budget)** ✅

**Memory Overhead**:
- PropertyCache: ~50 KB (100 entities × 6 props × 8 bytes)
- WatchRegistry: ~5 KB
- **Total: ~60 KB (negligible)** ✅

**Bandwidth** (Web platform):
- Payload: ~5 KB/frame
- Rate: 300 KB/sec @ 60 fps
- **Acceptable for modern browsers** ✅

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Performance regression | High | Medium | Profile before/after, optimize payload |
| Cache staleness bugs | High | Medium | Frame ID validation, comprehensive tests |
| Sync payload too large | Medium | Low | Delta encoding, binary format fallback |
| Expression analysis false negatives | Medium | Medium | Conservative over-approximation |
| Read-after-write race conditions | High | Medium | Document write semantics, use worklets |

## Future Extensibility

This system is designed to support:

**Phase 2 (Q2 2026)**: 
- Custom entity components
- Resource pools (health, mana, stamina)
- Computed game variables

**Phase 3 (Q3 2026)**:
- Animation state properties
- Combo system state
- Stat modifiers

**Phase 4+**:
- Pathfinding data
- State machine current state
- Particle system state

All extensions follow the same pattern:
1. Add to `PROPERTY_REGISTRY`
2. Update Godot `PropertyCollector` extraction logic
3. TypeScript automatically picks up via registry

## Approval Status

✅ **APPROVED** - User confirmed Option 1 (Full Implementation) on 2026-01-25

**Key Decision**: User identified dual purpose for DependencyAnalyzer:
1. **Primary**: Property watching for efficient Godot ↔ TypeScript sync
2. **Secondary**: Game validation for AI-generated game quality control

This architectural synergy makes the system even more valuable!

## References

- [Dynamic Mechanics Roadmap](../active/dynamic-mechanics-roadmap.md)
- [Exploration Findings: Transform Sync](/.sisyphus/analysis/transform-sync-findings.md)
- [Exploration Findings: Velocity APIs](/.sisyphus/analysis/velocity-api-findings.md)
- [Oracle Consultation: Velocity Sync Architecture](/.sisyphus/analysis/oracle-velocity-sync.md)
