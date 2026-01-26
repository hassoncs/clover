# Game Engine Redesign - Learnings

## Conventions Discovered

## 2026-01-25 Task: EventBus Creation
- shared/src/ uses modular organization: `systems/`, `types/`, `utils/`, now `events/`
- Export pattern: each module has `index.ts` that re-exports from implementation files
- Main `shared/src/index.ts` re-exports all modules with `export * from './module'`
- Tests use vitest with `vi.fn()` for mocks
- Test files go in `__tests__/` subdirectory

## Patterns to Follow

- New modules: Create directory with `ModuleName.ts`, `index.ts`, `__tests__/ModuleName.test.ts`
- Type exports: Use `export type { TypeName }` syntax for type-only exports

## Technical Insights

- EventBus uses `Map<string, Set<EventListener>>` for O(1) add/remove
- Unsubscribe returns a function for easy cleanup in React effects
- SystemPhase enum uses numeric values (0-5) for easy sorting
- GameSystemRegistry.getSystemsInExecutionOrder() returns systems sorted by phase then priority
- Higher priority = executes first within a phase (descending sort)

## 2026-01-25 Task: System Execution Phases
- Added SystemPhase enum to shared/src/systems/types.ts
- Added executionPhase and priority fields to GameSystemDefinition
- Added getSystemsByPhase() and getSystemsInExecutionOrder() to GameSystemRegistry
- Tests verify phase ordering and priority sorting work correctly
- NOTE: Phase orchestrator in GameRuntime.update() is deferred - requires larger refactor of game loop

## 2026-01-25 Task: Tag Interning System
- Created TagRegistry in shared/src/tags/TagRegistry.ts with intern(), getId(), getTag() methods
- Added tagBits: Set<number> to RuntimeEntity (keeping tags: string[] for backward compatibility)
- Added addTag(), removeTag(), hasTag() methods to EntityManager
- Added entitiesByTagId index (Map<number, Set<string>>) for O(1) tag queries
- getEntitiesByTag() now uses O(1) index lookup instead of O(n) scan
- Index is maintained in sync: addTag adds to index, removeTag removes, destroyEntity cleans up
- Import: `import { getGlobalTagRegistry } from '@slopcade/shared'`

