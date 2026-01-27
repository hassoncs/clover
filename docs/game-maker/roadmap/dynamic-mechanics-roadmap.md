# Dynamic Game Mechanics Roadmap

> **Last Updated**: 2026-01-26  
> **Status**: Planning

## Vision

Transform the game maker from a static configuration tool into a dynamic game design platform where game mechanics emerge from simple expressions and interconnected systems.

---

## Current State

### What We Have

```
┌─────────────────────────────────────────────────────────┐
│                    Static Game Engine                    │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Entities  │  │  Behaviors  │  │    Rules    │     │
│  │  (static)   │  │  (static)   │  │  (static)   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                          │
│  Values are defined at design time and never change      │
│  (except position/velocity from physics)                 │
└─────────────────────────────────────────────────────────┘
```

### What We Want

```
┌─────────────────────────────────────────────────────────┐
│                   Dynamic Game Engine                    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Computed Value System               │   │
│  │   Variables + Expressions + Modifiers            │   │
│  └─────────────────────────────────────────────────┘   │
│           │              │              │               │
│           ▼              ▼              ▼               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Entities  │  │  Behaviors  │  │    Rules    │     │
│  │  (dynamic)  │  │  (dynamic)  │  │  (dynamic)  │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                          │
│  Values computed from game state in real-time            │
└─────────────────────────────────────────────────────────┘
```

---

## Roadmap Overview

```
Jan 2026                Feb 2026                   Q2 2026                    Q3 2026
   │                       │                          │                          │
   ▼                       ▼                          ▼                          ▼
┌──────────────┐     ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│  Phase 1.5   │     │   Phase 1    │        │   Phase 2    │        │   Phase 3    │
│  Containers  │────▶│  Foundation  │───────▶│  Expansion   │───────▶│   Polish     │
│              │     │              │        │              │        │              │
│ • Stack/Grid │     │ • Expressions│        │ • Difficulty │        │ • State      │
│ • Slots      │     │ • Variables  │        │ • Resources  │        │   Machines   │
│ • Refactors  │     │ • Basic eval │        │ • Combos     │        │ • Tooling    │
└──────────────┘     └──────────────┘        └──────────────┘        └──────────────┘
     2.5 weeks            2 weeks                 4 weeks                 4 weeks
```

> **Note**: Phase 1.5 (Containers) is inserted ahead of Phase 1 to fix critical bugs in container-based games and establish a solid foundation for derived state before building the expression system.

---

## Phase 1.5: Container System (Weeks 1-2.5)

> **Design Document**: [Container System Design](../design/container-system.md)

### Goal
Establish a declarative container abstraction that eliminates dual-state bugs in container-based games (Ball Sort, Connect4, Stack Match, etc.) by computing derived state from entity membership.

### Motivation
The Ball Sort validation bug (2026-01-26) revealed that maintaining dual state (entity tags + cached variables) leads to desync bugs. The container system establishes the "single source of truth" principle before the expression system builds on top of it.

### Phase 1.5A: Core Infrastructure (Week 1)

| Item | Description | Est. |
|------|-------------|------|
| Container types | Stack, Grid, Slots type definitions | 0.5d |
| ContainerSystem | Core system class with membership tracking | 1d |
| Stack implementation | push, pop, peek, canAccept | 1d |
| Grid implementation | place, remove, swap, findMatches | 1d |
| Slots implementation | select, deselect, place, remove | 0.5d |
| Unit tests | Tests for all container operations | 1d |

### Phase 1.5B: Action & Condition Integration (Week 2)

| Item | Description | Est. |
|------|-------------|------|
| Container actions schema | container_push, container_pop, container_transfer | 0.5d |
| Container conditions schema | container_can_accept, container_is_empty/full | 0.5d |
| Action executors | Implement all container actions | 1.5d |
| Condition evaluators | Implement all container conditions | 1d |
| Integration tests | Rules using containers end-to-end | 1d |

### Phase 1.5C: Game Refactoring (Week 2.5)

| Game | Container Types | Est. |
|------|-----------------|------|
| Ball Sort | 6x Stack | 1d |
| Connect4 | 7x Stack + 1x Grid | 1d |
| Stack Match | 1x Grid + 1x Slots | 0.5d |

### Milestone Criteria

- [ ] ContainerSystem computes derived state (count, topItem, isEmpty) from tags
- [ ] Ball Sort uses declarative containers (no BallSortActionExecutor)
- [ ] Connect4 uses declarative containers
- [ ] All container-based games pass existing tests
- [ ] No manual `tube0_count`, `col0Height` style variables needed

### Files to Create

| File | Purpose |
|------|---------|
| `shared/src/types/container.ts` | Container type definitions |
| `app/lib/game-engine/systems/ContainerSystem.ts` | Core container system |
| `app/lib/game-engine/rules/actions/ContainerActionExecutor.ts` | Container actions |
| `app/lib/game-engine/rules/conditions/ContainerConditionEvaluator.ts` | Container conditions |

### Files to Delete

| File | Reason |
|------|--------|
| `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts` | Replaced by declarative containers |

---

## Phase 1: Foundation (Weeks 3-4)

### Goal
Establish the core computed values infrastructure that all other systems will build upon.

### Deliverables

| Item | Description | Est. |
|------|-------------|------|
| Expression Parser | Parse formula strings into AST | 2d |
| AST Evaluator | Evaluate expressions against context | 1d |
| Value<T> Type | Union type for literal or expression | 0.5d |
| Schema Updates | Zod schemas supporting expressions | 0.5d |
| ComputedValueSystem | Central service for compilation/evaluation | 1d |
| Behavior Integration | Move.speed uses expressions | 1d |
| Basic Functions | min, max, clamp, abs | 0.5d |
| Error Handling | Clear error messages with context | 0.5d |
| Tests | Unit tests for parser and evaluator | 1d |

### Milestone Criteria

- [ ] `{ "speed": { "expr": "5 + score * 0.1" } }` works in MoveBehavior
- [ ] Expressions compile at load time (no runtime parsing)
- [ ] Errors include file path, behavior name, and expression span
- [ ] All existing games continue to work unchanged

### Technical Decisions

1. **Parser Choice**: Hand-written recursive descent (simple, fast, no dependencies)
2. **AST Format**: TypeScript discriminated unions
3. **Evaluation**: Direct interpretation (no bytecode initially)

---

## Phase 2: Expansion (Weeks 5-8)

### Goal
Extend expressions to all systems and add the first complementary game systems.

### 2A: Expression Expansion (Week 3)

| Item | Description | Est. |
|------|-------------|------|
| All Behavior Params | Expressions in all numeric params | 1d |
| Rule Conditions | Expressions in trigger/condition values | 1d |
| Rule Actions | Expressions in action values | 0.5d |
| Entity Accessors | `self.health`, `self.velocity.x` | 1d |
| Ternary Operator | `cond ? a : b` support | 0.5d |
| More Functions | lerp, floor, ceil, sqrt, sin, cos | 0.5d |

### 2B: Game Variables (Week 4)

| Item | Description | Est. |
|------|-------------|------|
| Variables Section | Top-level `variables` in GameDefinition | 0.5d |
| Variable Resolution | Variables accessible in all expressions | 0.5d |
| Computed Variables | Variables that are themselves expressions | 1d |
| Variable Modification | Rules can modify variables | 1d |
| Schema Updates | Zod schemas for variables | 0.5d |
| Documentation | Variable system documentation | 0.5d |

### 2C: Difficulty Curves (Week 5)

| Item | Description | Est. |
|------|-------------|------|
| Curve Types | linear, exponential, stepped | 1d |
| Curve Evaluation | Expose curve values as variables | 1d |
| Threshold System | Score/time/wave based progression | 1d |
| Preset Curves | Common difficulty patterns | 0.5d |
| Integration | Use curves in example games | 0.5d |

### 2D: Resource Pools (Week 6)

| Item | Description | Est. |
|------|-------------|------|
| Pool Definition | health, mana, stamina pools | 1d |
| Regen System | Automatic regeneration with conditions | 1d |
| Pool Operations | Behaviors can cost/grant resources | 1d |
| UI Integration | Pool values displayed in game UI | 0.5d |
| Depletion Actions | Actions when pool hits 0 | 0.5d |

### Milestone Criteria

- [ ] Expressions work everywhere numeric values appear
- [ ] Game variables provide designer-facing "knobs"
- [ ] Difficulty curves enable progressive challenge
- [ ] Resource pools enable energy/mana mechanics
- [ ] At least 3 example games using new systems

---

## Phase 3: Polish (Weeks 9-12)

### Goal
Production-ready system with tooling and advanced features.

### 3A: Combo System (Week 7)

| Item | Description | Est. |
|------|-------------|------|
| Combo Tracking | Count, multiplier, timeout | 1d |
| Combo Tiers | Named tiers with thresholds | 0.5d |
| Combo Events | Events on tier change | 0.5d |
| Combo Decay | Configurable decay behavior | 0.5d |
| Visual Feedback | Combo display in UI | 0.5d |

### 3B: Stat Modifiers (Week 8)

| Item | Description | Est. |
|------|-------------|------|
| Modifier Types | add, multiply, set, min, max | 1d |
| Modifier Stacking | Stack rules and limits | 1d |
| Duration/Permanent | Timed vs permanent modifiers | 0.5d |
| Modifier Sources | Track where modifiers came from | 0.5d |
| Modifier Resolution | Computed modifier totals for expressions | 0.5d |

### 3C: Developer Tooling (Week 9)

| Item | Description | Est. |
|------|-------------|------|
| Expression Inspector | Debug panel showing resolved values | 2d |
| Variable Watch | Live variable values during play | 1d |
| Error Overlay | In-game expression error display | 1d |
| Hot Reload | Update expressions without restart | 1d |

### 3D: Documentation & Examples (Week 10)

| Item | Description | Est. |
|------|-------------|------|
| Reference Docs | Complete expression language reference | 1d |
| Tutorial Series | Step-by-step expression tutorials | 2d |
| Example Games | 5 games showcasing all features | 2d |
| AI Integration | Prompts for expression generation | 1d |

### Milestone Criteria

- [ ] Combo system enables score multiplier games
- [ ] Modifiers enable buff/debuff mechanics
- [ ] Developers can debug expressions visually
- [ ] Comprehensive documentation exists
- [ ] AI can generate games using expressions

---

## Future Phases (Q3+)

### Phase 4: Advanced Features

- **State Machines**: Entity behavior states with transitions
- **Achievement System**: Progress tracking with rewards
- **Wave System**: Configurable wave/level progression
- **Save/Load**: Persist game state including variables

### Phase 5: AI Enhancement

- **Expression Generation**: AI generates expressions from natural language
- **Balance Tuning**: AI suggests difficulty curve adjustments
- **Pattern Recognition**: AI identifies common game patterns

---

## Success Metrics

### Developer Experience

| Metric | Target | Measurement |
|--------|--------|-------------|
| Expression compile time | < 100ms | Benchmark on 100 expressions |
| Evaluation overhead | < 5% frame time | Profile with 1000 evaluations/frame |
| Error clarity | 90% self-diagnosable | User testing |
| Documentation coverage | 100% of features | Audit |

### Game Quality

| Metric | Target | Measurement |
|--------|--------|-------------|
| Dynamic games possible | 10+ patterns | Template count |
| Expression usage | 50% of new games | Analytics |
| Designer satisfaction | 4+/5 rating | Survey |

### Stability

| Metric | Target | Measurement |
|--------|--------|-------------|
| Backwards compatibility | 100% | Regression tests |
| Expression errors caught at load | 95% | Error tracking |
| Runtime crashes from expressions | 0 | Crash reports |

---

## Risk Assessment

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Performance regression | High | Medium | Profiling, caching, benchmarks |
| Complex debugging | Medium | High | Invest in tooling early |
| Expression language creep | Medium | Medium | Strict scope, review process |
| Breaking changes | High | Low | Comprehensive test suite |

### Adoption Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Designer learning curve | Medium | High | Tutorials, examples, AI assist |
| Over-complexity | High | Medium | Start simple, add gradually |
| Underutilization | Medium | Medium | Showcase compelling examples |

---

## Dependencies

### External

- None (all implementation is internal)

### Internal

| Dependency | Status | Notes |
|------------|--------|-------|
| Behavior System | ✅ Complete | Foundation for expression integration |
| Rules System | ✅ Complete | Will be extended with expressions |
| Schema System | ✅ Complete | Will be extended for new types |
| UI System | ✅ Complete | Needed for resource/combo display |

---

## Team Allocation

### Phase 1 (Foundation)
- 1 engineer, full-time

### Phase 2 (Expansion)  
- 1 engineer, full-time
- 0.5 designer (example games, testing)

### Phase 3 (Polish)
- 1 engineer, full-time
- 0.5 designer (documentation, examples)
- 0.25 QA (testing, edge cases)

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-26 | Add Phase 1.5 (Containers) before expressions | Ball Sort bug showed dual-state is error-prone; establish single-source-of-truth pattern first |
| 2026-01-26 | Use tags for container membership | Tags already sync with Godot, no new sync mechanism needed |
| 2026-01-26 | Compute derived state on demand, never cache | Eliminates desync bugs (the original Ball Sort problem) |
| 2026-01-21 | Use expression strings over visual nodes | Lower complexity, AI-compatible |
| 2026-01-21 | Compile at load, not at definition change | Simpler initial implementation |
| 2026-01-21 | Start with numeric expressions only | Most common use case, lower risk |
| 2026-01-21 | Include ternary operator in Phase 2 | High value for game design |

---

## References

- [Container System Design](../design/container-system.md) - Declarative container abstraction
- [RFC-001: Derived Values System](../rfcs/RFC-001-derived-values-system.md)
- [RFC-002: Complementary Game Systems](../rfcs/RFC-002-complementary-game-systems.md)
- [Behavior System Reference](../reference/behavior-system.md)
- [Rules System Reference](../reference/rules-system.md)
