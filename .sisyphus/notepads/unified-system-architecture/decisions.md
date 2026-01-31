# Unified System Architecture - Design Decisions

## Phase 0: Core Architecture

### Interface Design

#### RuntimeSystem<TConfig, TState>
- **Generic parameters**: TConfig for initialization, TState for per-frame state
- **Async initialize()**: Required for ScriptSandbox, GameProgressManager
- **Stateless design**: All state must be in TState, no instance variables
- **Phase + Priority**: Determines execution order within game loop

#### Context Split
- **SystemContext**: Stable services (bridge, physics, entityManager, eventBus, eventQueue)
  - Passed once at initialization
  - Systems store references for lifetime
- **UpdateContext**: Per-frame snapshot (dt, elapsed, frameId, input, gameState)
  - Created fresh each frame
  - Read-only to prevent mutations
  - Systems should NOT store references

### EventQueue Design
- **Next-frame delivery**: Events emitted in frame N are processed in frame N+1
- **Prevents same-frame side effects**: Critical for deterministic behavior
- **Flush at frame boundary**: Called at start of GameSystemRunner.update()
- **Subscription model**: Similar to EventBus but with deferred delivery

### Phase Execution Order
1. **PRE_UPDATE**: Setup, input buffering
2. **GAME_LOGIC**: Match3, Tetris core loops
3. **PHYSICS**: Physics simulation
4. **POST_PHYSICS**: Physics reactions
5. **VISUAL**: Particle systems, effects
6. **CLEANUP**: Destruction, pooling

### Feature Flag
- `FEATURE_FLAGS.USE_SYSTEM_RUNNER = false`
- Allows gradual migration
- Can be toggled per-environment or per-game

## Rationale

### Why Stateless Systems?
- **Deterministic replay**: State can be serialized and restored
- **Save/load**: State is explicit and serializable
- **Time travel debugging**: Can step forward/backward through frames
- **Testing**: Easy to test with known state inputs

### Why EventQueue?
- **Prevents race conditions**: Systems can't affect each other in same frame
- **Predictable ordering**: Events always processed at frame boundary
- **Debugging**: Can inspect queued events before they fire
- **Matches Unity's event model**: Industry-proven pattern

### Why Context Split?
- **Performance**: UpdateContext is lightweight, created per-frame
- **Safety**: Read-only prevents accidental mutations
- **Clarity**: Clear separation between stable services and frame data
- **Flexibility**: Can add frame-specific data without changing SystemContext

## Trade-offs

### Async Initialize
- **Pro**: Supports systems that need async setup
- **Con**: Initialization is slower (must await all systems)
- **Mitigation**: Only affects game load time, not runtime performance

### Stateless Design
- **Pro**: Deterministic, testable, serializable
- **Con**: Systems must explicitly manage state
- **Mitigation**: getState() pattern is simple and clear

### EventQueue Overhead
- **Pro**: Prevents same-frame side effects
- **Con**: One frame delay for inter-system communication
- **Mitigation**: Most game logic doesn't need same-frame response
