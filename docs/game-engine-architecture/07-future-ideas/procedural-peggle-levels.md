# Procedural Peggle Level Generation

> **Status**: Future / Backlog  
> **Priority**: Low (post-Q3 2026)  
> **Related**: [Dynamic Mechanics Roadmap](../02-dynamic-mechanics/roadmap.md)

---

## Overview

An endless Peggle-style level builder that procedurally generates physics-based levels with constraint-based placement, playability validation, and progressive difficulty.

**Goal**: Enable AI and procedural systems to create infinite, playable levels where every configuration is guaranteed solvable and engaging.

---

## Core Concepts

### 1. Constraint-Based Placement

The foundation of procedural generation is defining valid spaces for objects.

**Spatial Zones**
```
┌─────────────────────────────────────────┐
│         LAUNCH ZONE (safe)              │  ← Ball spawns, no obstacles
│                                         │
├─────────────────────────────────────────┤
│                                         │
│        MID-FIELD (play area)            │  ← Main peg/obstacle placement
│                                         │
├─────────────────────────────────────────┤
│         TARGET ZONE (collection)        │  ← Buckets, score zones
└─────────────────────────────────────────┘
```

**Poisson Disc Sampling**
- Algorithm for even distribution with minimum distance constraints
- Prevents overcrowding while maintaining density
- Tunable radius based on difficulty level

**Dynamic Elements**
- Oscillating pegs (move in patterns)
- Rotating bumpers (spin and deflect)
- Trigger zones (activate events on hit)

---

### 2. Physics Validation

Every generated level must be verified for playability before being presented to players.

**Solvability Checking**
1. Simulate shots from multiple launch angles (e.g., 15° increments)
2. Track which pegs are hit in each simulation
3. Ensure minimum viable paths exist (e.g., 60%+ of pegs reachable)
4. Validate power-ups are actually collectible

**Stability Verification**
- No overlapping collision shapes
- Moving platforms don't clip through static geometry
- Ball cannot get permanently stuck
- All entities have valid spawn positions

**Accessibility Checks**
- High-value targets aren't impossibly positioned
- Power-ups are reachable with reasonable skill
- Alternative paths exist (not just one "correct" shot)

---

### 3. Object Template System

Define reusable archetypes that can be instantiated with variation.

**Base Template**
```typescript
interface PegTemplate {
  id: string;
  type: PegType;
  physics: PhysicsConfig;
  visual: VisualConfig;
  scoring: ScoringConfig;
  behavior?: BehaviorConfig;
}

type PegType = 
  | 'normal'      // Standard peg, single hit
  | 'multiplier'  // Doubles score for X seconds
  | 'explosive'   // Destroys nearby pegs on hit
  | 'bumper'      // Extra bouncy, high velocity return
  | 'portal'      // Teleports ball to linked location
  | 'magnet'      // Attracts ball toward center
  | 'time'        // Adds bonus time (timed modes);

interface PhysicsConfig {
  shape: 'circle' | 'polygon';
  radius?: number;
  vertices?: Vector2[];
  restitution: number;  // Bounciness (0-1)
  friction: number;
  density: number;
}

interface BehaviorConfig {
  type: 'static' | 'oscillating' | 'rotating' | 'patrol';
  params: {
    amplitude?: number;    // Oscillation distance
    frequency?: number;    // Cycles per second
    path?: Vector2[];      // Patrol waypoints
    angularVelocity?: number;  // Rotation speed
  };
}
```

**Composable Prefabs**
- Pre-designed clusters spawn as units
- Examples: "flower" (1 center + 6 surrounding), "fence" (row with gaps), "spiral" (rotating arm with pegs)
- Difficulty-scaled: harder levels use more complex prefabs

---

### 4. Two-Phase Generation Pipeline

```
┌──────────┐    ┌─────────────┐    ┌─────────────┐    ┌──────────┐
│   Seed   │───▶│    Phase    │───▶│    Phase    │───▶│  Output  │
│ (string) │    │     A       │    │     B       │    │  Level   │
└──────────┘    └─────────────┘    └─────────────┘    └──────────┘
                     │                  │
                     ▼                  ▼
            ┌─────────────┐     ┌─────────────┐
            │ Hero        │     │ Auto-Fill   │
            │ Placement   │     │ Algorithm   │
            │             │     │             │
            │ • Special   │     │ • Vanilla   │
            │   pegs      │     │   pegs      │
            │ • Power-ups │     │ • Fill gaps │
            │ • Key       │     │ • Maintain  │
            │   obstacles │     │   playability│
            └─────────────┘     └─────────────┘
```

**Phase A: Anchor Placement**
- Designer or AI places "hero" elements (special pegs, power-ups, key obstacles)
- These define the level's character and challenge
- Stored as constraints for Phase B

**Phase B: Autofill**
- Algorithm fills remaining space with vanilla pegs
- Must maintain minimum distances from anchors
- Must ensure paths exist to reach anchors
- Uses poisson disc sampling with exclusion zones

**Validation Loop**
1. Generate candidate layout
2. Run physics simulation from multiple angles
3. Check solvability metrics
4. If failed, adjust and retry (max N attempts)
5. If passed, finalize level

---

### 5. Playability Heuristics

Metrics that define whether a level is "fun" rather than just "possible".

**Bounce Potential**
- Measure ricochet variety: different entry angles should produce different paths
- Reward configurations with multiple viable strategies
- Penalize "funnel" levels where all shots converge to same outcome

**Risk/Reward Clustering**
- High-value pegs positioned in harder-to-hit locations
- Creates tension: safe shots vs. risky high-reward attempts
- Clustering bonus: hitting multiple high-value pegs in one shot

**Flow Design**
- Ball should naturally move toward bottom collection zone
- Mid-field obstacles create interesting deflections
- Avoid "dead zones" where balls get stuck or exit play area

**Progressive Difficulty**
```
Level 1-5:   Sparse, static pegs, simple paths
Level 6-15:  Moderate density, some moving elements
Level 16-30: Dense, complex prefabs, dynamic obstacles
Level 31+:   Chaos mode - maximum variety and challenge
```

---

## Implementation Strategy

### Phase 1: Foundation (Week 1)
- Poisson disc sampling algorithm
- Spatial zone definitions
- Basic peg template system

### Phase 2: Validation (Week 2)
- Physics simulation harness
- Solvability checker
- Stability verification

### Phase 3: Generation (Week 3)
- Two-phase pipeline implementation
- Autofill algorithm
- Retry/adjust logic

### Phase 4: Polish (Week 4)
- Playability heuristics
- Difficulty scaling curves
- Integration with game generation pipeline

---

## Technical Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| Physics Engine | ✅ Ready | Godot 4 with deterministic simulation |
| Expression System | 🔄 Phase 2 | For difficulty curves and parameters |
| Entity Hierarchy | 🔄 IMP-001 | For prefab composition |
| AI Generation | 🔄 Phase 5 | For anchor placement suggestions |

---

## Open Questions

1. **Simulation Performance**: How many shots can we simulate per level within time budget?
2. **Determinism**: Do we need fully deterministic physics, or is "good enough" acceptable?
3. **AI Anchor Placement**: Should AI place anchors, or is pure procedural sufficient?
4. **Player Modeling**: Should we adapt difficulty based on player skill, or use fixed curves?

---

## References

- [Poisson Disc Sampling](https://www.jasondavies.com/poisson-disc/) - Algorithm visualization
- [Peggle Design Analysis](https://gamedesignskills.com/game-design/peggle-game-design-analysis/) - Game design breakdown
- [Constraint-Based Layout](https://www.procjam.com/tutorials/coherent-layout/) - Procedural layout techniques

---

*Last Updated: 2026-01-27*
