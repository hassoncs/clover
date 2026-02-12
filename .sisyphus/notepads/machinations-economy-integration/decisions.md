# Decisions

## Task 1: Economy Engine Package

### Inline type in GameDefinition vs dynamic import
**Decision**: Define `EconomyGraphDefinition` inline in GameDefinition.ts rather than importing from `@slopcade/economy-engine`.
**Rationale**: Avoids creating shared→economy-engine dependency. shared is imported by everything; adding economy-engine as a dep would pull it everywhere. The inline type is structurally compatible with `EconomyGraph` from economy-engine.

### Separate package vs extending shared
**Decision**: Separate `packages/economy-engine` package.
**Rationale**: Economy simulation logic (Task 2) will include tick simulation, which is runtime-only. Keeping it separate avoids bloating shared with simulation code.

### Validation as function vs class
**Decision**: `validateEconomyGraph()` as a pure function.
**Rationale**: Matches effects `validateGraph()` pattern. Stateless validation is simpler and composable.

## Task 2: Simulator Engine Decisions

### Two-phase tick with buffered nodes
**Decision**: Implement strict planning and atomic apply phases where gate and converter process only their pre-tick stored values.
**Rationale**: Guarantees deterministic, order-independent state progression and aligns with fixed-step semantics.

### Gate routing implementation
**Decision**: Route gate resources per unit token using seeded weighted selection from outgoing edge probabilities.
**Rationale**: Produces deterministic probabilistic behavior with discrete, auditable transfer outcomes.

### Converter throughput interpretation
**Decision**: Interpret `converter.rate` as max throughput per tick for outgoing conversion flow.
**Rationale**: Keeps converter behavior predictable with existing node schema (no extra ratio fields), while still supporting capped transformation.

### Expression evaluation mechanism
**Decision**: Use lightweight runtime expression evaluation via scoped function compilation for edge formulas.
**Rationale**: Meets formula evaluation requirement without introducing heavy dependencies in this package iteration.

### Source state handling
**Decision**: Do not increment source node state when source emits transfers.
**Rationale**: Sources model generation per tick, not inventory. Keeping source values non-accumulating preserves fixed-step semantics and avoids polluting expression scope with synthetic source stockpiles.
