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
