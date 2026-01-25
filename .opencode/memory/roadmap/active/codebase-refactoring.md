# Codebase Refactoring Initiative

**Status**: active
**Source**: docs/refactoring/REFACTORING_ANALYSIS_2026_01_24.md
**Created**: 2026-01-24
**Updated**: 2026-01-24

## Objective

Improve long-term maintainability by refactoring monolithic files and reducing complexity across the codebase. Target: reduce files >500 lines from ~15 to <5, eliminate files >1000 lines.

## Progress

### Phase 1: Quick Wins (Week 1)
- [ ] Refactor `RulesEvaluator.ts` - Registry pattern for action dispatchers
- [ ] Split `AssetGalleryPanel.tsx` - Extract QuickGenerationForm, TemplateGrid
- [ ] Split `browse.tsx` - Extract FilterBar, GameGrid, useBrowseGames hook

### Phase 2: Critical Path (Week 2-3)
- [ ] Refactor `GameRuntime.godot.tsx` - Extract useGameBridge, useGameInput, useGameLoop
- [ ] Refactor `GameBridge.gd` - Modularize GDScript bridge

### Phase 3: Bridge Refactoring (Week 4)
- [ ] Refactor `GodotBridge.native.ts` - JSI modularization
- [ ] Refactor `GodotBridge.web.ts` - WASM modularization

### Phase 4: Cleanup (Week 5+)
- [ ] Split `EditorProvider.tsx` - Separate selection, document, editor state
- [ ] Refactor `shared/types/rules.ts` - Split into rules/actions/conditions/triggers
- [ ] Refactor `InputEntityManager.ts` - Input directory structure
- [ ] Refactor `EntityManager.ts` - Entity factory and template management
- [ ] Refactor `BehaviorContext.ts` - Behavior type separation
- [ ] Refactor `CameraSystem.ts` - Camera and viewport separation
- [ ] Refactor `useAssetGeneration.ts` - Separate polling logic

## Identified Refactoring Candidates

| Priority | File | Lines | Primary Issue | Effort |
|----------|------|-------|---------------|--------|
| P0 | `GameRuntime.godot.tsx` | 1,248 | God Component | 2-3d |
| P0 | `RulesEvaluator.ts` | 530 | Switch Statement | 1d |
| P0 | `AssetGalleryPanel.tsx` | 753 | Mixed UI Concerns | 0.5-1d |
| P1 | `browse.tsx` | 627 | Page God Component | 0.5-1d |
| P1 | `shared/types/rules.ts` | ~500+ | High Coupling | 0.5d |
| P1 | `GodotBridge.native.ts` | 1,101 | JSI Bridge | 1d |
| P1 | `GodotBridge.web.ts` | 1,005 | WASM Bridge | 1d |
| P1 | `EditorProvider.tsx` | ~550 | Context God | 0.5-1d |
| P2 | `GameBridge.gd` | 3,161 | GDScript God | 2-3d |
| P2 | `InputEntityManager.ts` | ~500 | Input Processing | 0.5d |
| P2 | `BehaviorContext.ts` | High | High Coupling | 0.5d |
| P2 | `EntityManager.ts` | ~500 | Entity Lifecycle | 0.5-1d |
| P2 | `useAssetGeneration.ts` | Complex | Hook Complexity | 0.5d |
| P2 | `CameraSystem.ts` | ~400 | Utility Class | 0.5d |

## Blockers

None - can be worked on incrementally.

## Notes

### Testing Strategy
Each refactoring should:
1. Ensure existing tests pass before starting
2. Extract with no behavioral changes
3. Run full test suite after completion

### Documentation
- Full analysis: [docs/refactoring/REFACTORING_ANALYSIS_2026_01_24.md](../../docs/refactoring/REFACTORING_ANALYSIS_2026_01_24.md)
- Architecture overview: [app/AGENTS.md](../../app/AGENTS.md)

### Key Principles
- Extract Input handling from GameRuntime.godot.tsx
- Use Registry pattern instead of switch statements in RulesEvaluator
- Separate UI components from business logic
- Split large context providers by concern
