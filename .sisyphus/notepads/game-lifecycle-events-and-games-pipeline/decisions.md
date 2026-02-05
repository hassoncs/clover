## 2026-02-05 Discovery Phase

### Trigger Type Naming Convention
- Decision: ALL lifecycle trigger types → snake_case (`game_loaded`, `game_started`)
- Internal snapshot booleans may remain camelCase (`inputEvents.gameLoaded`) as implementation detail
- No alias/mapping layer - clean cut

### Execution Order
- Tasks 2, 3, 4 can be done together (trigger standardization across shared types, engine, compiled games)
- Task 5 (lifecycle readiness) depends on trigger standardization
- Task 6 (script spawn) is independent of trigger work
- Tasks 7, 8 (games pipeline) are independent of trigger/spawn work
