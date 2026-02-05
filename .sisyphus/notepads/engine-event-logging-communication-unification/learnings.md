# Engine Event Logging Communication Unification - Learnings

## Conventions

### Logger Pattern
- Use `logger.debug('category', message)` for development-only logging
- Use `logger.info('category', message)` for important lifecycle events
- Use `logger.warn('category', message)` for recoverable issues
- Use `logger.error('category', message)` for errors
- TRACE level for per-frame hot path logging (must be opt-in)

### Event Queue Pattern
- All discrete events go through GameEventQueue
- Continuous state (drag position, held buttons) stays in inputRef
- Drain uses array swap: `const events = this.queue; this.queue = []; return events;`
- No per-frame allocations in hot paths

### Bridge Communication
- All entity destroys must call `bridge.destroyEntity(id)` regardless of physics
- Script position changes must call `bridge.setPosition()` to reach Godot
- Two spawn patterns are acceptable: Godot-authoritative (SpawnActionExecutor) and TS-optimistic (RunScriptActionExecutor)

## Guardrails (Must NOT Have)
- NO changes to native bridge (GodotBridge.native.ts)
- NO rewriting the input system - only migrate discrete events
- NO error handling on all 72 bridge methods - only spawn/destroy
- NO changing event timing semantics - events still process on next frame
- NO production auto-step - only in inspect mode
- NO comprehensive test suite - max 5-7 focused tests
- NO refactoring game state machine
- NO GDScript Logger migration of existing prints

## File Locations
- Logger: `app/lib/game-engine/debug/Logger.ts`
- GDScript Logger: `godot_project/scripts/utils/Logger.gd`
- Event Queue: `app/lib/game-engine/GameEventQueue.ts`
- MCP Tools: `packages/game-inspector-mcp/src/tools/`

## Dependencies Between Tasks
- Task 1 (Logger) and Task 2 (Delete tests) can run in parallel
- Task 3 (EventQueue) depends on Task 1 and 2
- Task 4 (Collisions/input) and Task 5 (Destroy) can run in parallel after Task 3
- Task 6 (Auto-step) and Task 7 (SetPosition) can run in parallel after Task 4
- Task 8 (Tests) depends on Tasks 4, 5, 6, 7
