# Decisions - Slot Machine Game

## Architectural Choices Made

### Animation System Design (Task 4)

**Decision**: Use virtual position with wrap-around rather than physical entity swapping

**Rationale**:
- Virtual position is continuous (float) vs discrete symbol indices
- Wrap-around happens naturally via modulo arithmetic in position calculation
- No need to spawn/destroy or shuffle entities during spin
- Smoother visual experience with continuous scrolling

**Alternatives considered**:
- Entity swapping: Would require constantly destroying/spawning symbols
- Fixed strip with camera: More complex, requires additional camera control
- Physics simulation: Overkill for deterministic slot animation

**Trade-offs**:
- ✅ Simpler code, no entity lifecycle during spin
- ✅ Better performance (no allocations during spin)
- ❌ Limited to vertical scrolling (can't do fancy patterns)
- ❌ Symbols are always visible (can't have "hidden" symbols above/below)

**Animation timing decisions**:
- Acceleration: 0.2s (fast ramp-up creates excitement)
- Deceleration: 0.5s (longer easing for visible bounce effect)
- Stagger delay: 0.3s between reels (creates anticipation)

**Why easeOutBack for stop**:
- Standard easeOutQuad felt too abrupt
- Back-ease creates slight "overshoot" that mimics mechanical slot feel
- Bounce is subtle (c1 = 1.70158) - just enough to feel physical

