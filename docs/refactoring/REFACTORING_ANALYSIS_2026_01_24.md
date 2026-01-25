# Codebase Refactoring Analysis Report

**Generated:** 2026-01-24  
**Scope:** Full repository analysis for maintainability improvements  
**Method:** Automated file size analysis + manual complexity inspection

---

## Executive Summary

This analysis identifies **15 refactoring candidates** across the codebase, categorized by severity and refactoring complexity. The primary issues are:

1. **Monolithic Components** - Files exceeding 500 lines that mix concerns
2. **High Cyclomatic Complexity** - Large switch statements and deeply nested conditionals
3. **Mixed Concerns** - Components handling state, UI, and business logic
4. **High Coupling** - Central files imported by many modules

**Recommended Priority:** P0 (Immediate) → 3 files, P1 (High) → 5 files, P2 (Medium) → 7 files

---

## P0 - Critical Refactoring Candidates

### 1. `GameRuntime.godot.tsx` (1,248 lines)

**Location:** `app/lib/game-engine/GameRuntime.godot.tsx`

**Issues Identified:**
- **God Component Pattern**: Single file handles bridge setup, physics sync, 4+ input types, HUD rendering, and game state overlays
- **25+ useRef hooks** for managing engine state
- **5+ useEffect hooks** with complex cleanup logic
- **Input handling sprawl**: Keyboard, touch, mouse, tilt all in one file
- **Mixed concerns**: Engine logic AND UI rendering tightly coupled

**Current Responsibilities:**
1. Godot bridge initialization & lifecycle
2. Physics adapter creation
3. Game loader management
4. Input event handling (touch, keyboard, mouse, tilt, joystick, D-pad, buttons)
5. Game loop management (16ms interval)
6. Collision event processing
7. Rules evaluation orchestration
8. HUD rendering (score, timer, lives, variable displays)
9. Overlay rendering (pause, ready, win/lose states)

**Recommended Refactoring:**

```
Refactor into:
├── useGameBridge.ts          # Bridge initialization & lifecycle
├── useGamePhysics.ts         # Physics adapter & collision handling
├── useGameInput.ts           # All input event handling
├── useGameLoop.ts            # Game loop orchestration
├── useGameState.ts           # Game state (score, lives, etc.)
├── GameHUD.tsx               # HUD rendering (extract from JSX)
├── GameOverlays.tsx          # Pause/Ready/Win/Lose overlays
└── GameRuntime.godot.tsx     # Orchestrator (100-150 lines)
```

**Estimated Effort:** 2-3 days  
**Complexity:** High (many interdependencies)  
**Risk:** Medium (critical path for game rendering)

---

### 2. `RulesEvaluator.ts` (530 lines)

**Location:** `app/lib/game-engine/RulesEvaluator.ts`

**Issues Identified:**
- **Massive Switch Statement** (lines 410-455): `executeActions()` has 25+ action type cases
- **Secondary Switch** (lines 462-492): `checkWinCondition()` with 5 condition types
- **Tertiary Switch** (lines 495-528): `checkLoseCondition()` with 5 condition types
- **Hard to extend**: Adding new action types requires modifying this file

**Current Structure:**
```typescript
executeActions(actions: RuleAction[], context: RuleContext) {
  for (const a of actions) {
    switch (a.type) {
      case 'score': this.scoreActionExecutor.execute(a, context); break;
      case 'spawn': this.spawnActionExecutor.execute(a, context); break;
      // ... 23 more cases
    }
  }
}
```

**Recommended Refactoring:**

```
Pattern: Registry-based Action Dispatcher

Current: Switch statement → New: Action Registry Map

Benefits:
- Actions register themselves at startup
- No switch statement maintenance
- Enables plugin architecture for custom actions
- Better tree-shaking potential

Implementation:
├── actions/                      # Move executors here
│   ├── index.ts                 # Registry export
│   ├── ScoreActionExecutor.ts
│   ├── SpawnActionExecutor.ts
│   └── ...
├── conditions/                   # Move evaluators here
│   ├── index.ts
│   └── ...
├── triggers/                     # Move evaluators here
│   ├── index.ts
│   └── ...
├── ActionRegistry.ts             # NEW: Registry pattern
└── RulesEvaluator.ts             # Simplified (~200 lines)
```

**Estimated Effort:** 1 day  
**Complexity:** Medium (refactoring pattern, not logic)  
**Risk:** Low (pure refactoring, no behavior change)

---

### 3. `AssetGalleryPanel.tsx` (753 lines)

**Location:** `app/components/editor/AssetGallery/AssetGalleryPanel.tsx`

**Issues Identified:**
- **Mixed UI Concerns**: Asset pack management + generation logic + alignment editing
- **Large Inline State**: 10+ useState hooks for various UI states
- **Complex Effect Logic**: Lines 73-113 have a massive useEffect with side effects
- **No separation**: Quick create form, pack selector, template grid all in one file

**Current Sections:**
1. Asset pack selection & management (lines 35-178)
2. Quick generation form (lines 45-227)
3. Template grid display (lines 448-484)
4. Alignment editor modal (lines 498-506)

**Recommended Refactoring:**

```
Current: One file with 753 lines
↓
Refactored:
├── AssetGalleryPanel.tsx        # Container (~150 lines)
├── AssetPackManager.tsx         # Pack CRUD operations
├── QuickGenerationForm.tsx      # AI generation form
├── AssetPackSelector.tsx        # Already exists, keep separate
└── TemplateGrid.tsx             # Template display grid
```

**Estimated Effort:** 0.5-1 day  
**Complexity:** Low (straightforward component split)  
**Risk:** Low (UI-only refactoring)

---

## P1 - High Priority Refactoring Candidates

### 4. `browse.tsx` (627 lines)

**Location:** `app/app/(tabs)/browse.tsx`

**Issues Identified:**
- **Page-level god component**: Handles data fetching, filtering, pagination, AND UI
- **Filter logic complexity**: 4 filter dimensions + search + sorting
- **Mixed concerns**: Template games AND community games in one component
- **Helper functions**: `FilterChip`, `GameGridCard`, `GameCard`, `Pagination` should be separate components

**Recommended Refactoring:**

```
Refactor into:
├── useBrowseGames.ts            # Data fetching & filtering hook
├── BrowseScreen.tsx             # Page container (~200 lines)
├── FilterBar.tsx                # Filter controls
├── GameGrid.tsx                 # Grid display
├── GameCard.tsx                 # Already exists in file, extract
├── FilterChip.tsx               # Already exists in file, extract
├── Pagination.tsx               # Already exists in file, extract
└── types.ts                     # Filter types (move out)
```

**Estimated Effort:** 0.5-1 day  
**Complexity:** Low  
**Risk:** Low

---

### 5. `shared/src/types/rules.ts` (High Coupling)

**Location:** `shared/src/types/rules.ts`

**Issues Identified:**
- **Central coupling point**: Imported by almost every game engine file
- **Large file**: Likely exceeds 500 lines with many type definitions
- **Single responsibility violation**: Contains types for rules, actions, conditions, triggers

**Recommended Refactoring:**

```
Current: One massive types file
↓
Refactored:
├── shared/src/types/
│   ├── rules/                   # NEW directory
│   │   ├── index.ts             # Barrel export
│   │   ├── actions.ts           # Action type definitions
│   │   ├── conditions.ts        # Condition type definitions
│   │   ├── triggers.ts          # Trigger type definitions
│   │   ├── win-lose.ts          # Win/Lose condition types
│   │   └── evaluator.ts         # Rule/Evaluator types
```

**Estimated Effort:** 0.5 day  
**Complexity:** Low  
**Risk:** Medium (requires updating imports across many files)

---

### 6. `GodotBridge.native.ts` (1,101 lines)

**Location:** `app/lib/godot/GodotBridge.native.ts`

**Issues Identified:**
- **JSI Bridge complexity**: Large file for native bridge implementation
- **Memory management**: Complex lifecycle with init/dispose
- **Platform-specific code**: Native implementation mixed with interface

**Recommended Refactoring:**

```
Current: One file (1,101 lines)
↓
Refactored:
├── lib/godot/native/
│   ├── JSIModule.ts             # JSI-specific code
│   ├── MemoryManager.ts         # Lifecycle management
│   ├── EntityBridge.ts          # Entity operations
│   ├── PhysicsBridge.ts         # Physics operations
│   └── index.ts                 # Unified export
```

**Estimated Effort:** 1 day  
**Complexity:** Medium  
**Risk:** High (bridge is critical path)

---

### 7. `GodotBridge.web.ts` (1,005 lines)

**Location:** `app/lib/godot/GodotBridge.web.ts`

**Issues Identified:**
- **WASM Bridge complexity**: Large file for web bridge
- **Similar structure** to native bridge but different implementation

**Recommended Refactoring:**

```
Current: One file (1,005 lines)
↓
Refactored:
├── lib/godot/web/
│   ├── WASMManager.ts           # WASM loading & lifecycle
│   ├── BridgeImpl.ts            # Web-specific implementation
│   └── index.ts                 # Unified export

Note: Consider extracting common interface to shared file
```

**Estimated Effort:** 1 day  
**Complexity:** Medium  
**Risk:** High (bridge is critical path)

---

### 8. `EditorProvider.tsx` (~550 lines)

**Location:** `app/components/editor/EditorProvider.tsx`

**Issues Identified:**
- **Context provider god component**: Large React Context provider
- **Mixed state**: Editor state, document state, selection state all together
- **Complex mutations**: Many state updates in one provider

**Recommended Refactoring:**

```
Current: One context provider
↓
Refactored:
├── useEditorContext.ts          # Core context
├── useEditorActions.ts          # Action creators (hook)
├── useSelectionState.ts         # Selection management
├── useDocumentState.ts          # Document management
└── EditorProvider.tsx           # Combined provider (~200 lines)
```

**Estimated Effort:** 0.5-1 day  
**Complexity:** Medium  
**Risk:** Medium (many consumers)

---

## P2 - Medium Priority Refactoring Candidates

### 9. `GameBridge.gd` (3,161 lines) - GDScript

**Location:** `godot_project/scripts/GameBridge.gd`

**Issues Identified:**
- **Largest file in codebase**: 3,161 lines of GDScript
- **Godot-side bridge**: Mirrors TypeScript bridge complexity
- **Multiple concerns**: Input handling, entity management, physics sync, audio

**Recommended Refactoring:**

```
Current: One massive GDScript file
↓
Refactored (GDScript):
├── scripts/GameBridge/          # NEW directory
│   ├── Main.gd                  # Entry point (~200 lines)
│   ├── InputHandler.gd          # Input processing
│   ├── EntityManager.gd         # Entity lifecycle
│   ├── PhysicsSync.gd           # Physics-RN sync
│   ├── AudioManager.gd          # Sound effects
│   └── autoload.gd              # Autoload registration
```

**Estimated Effort:** 2-3 days  
**Complexity:** High (GDScript patterns, cross-language coordination)  
**Risk:** High (critical to game rendering)

---

### 10. `InputEntityManager.ts` (~500 lines)

**Location:** `app/lib/game-engine/InputEntityManager.ts`

**Issues Identified:**
- **Input processing complexity**: Large file for input handling
- **Multiple input types**: Touch, keyboard, mouse, virtual controls

**Recommended Refactoring:**

```
Move to: lib/game-engine/input/
├── index.ts
├── InputEntityManager.ts        # Keep
├── TouchInput.ts
├── KeyboardInput.ts
├── MouseInput.ts
└── VirtualControls.ts
```

**Estimated Effort:** 0.5 day  
**Complexity:** Low  
**Risk:** Low

---

### 11. `BehaviorContext.ts` (High Coupling)

**Location:** `app/lib/game-engine/BehaviorContext.ts`

**Issues Identified:**
- **Central type file**: Imported by many engine modules
- **Large interface**: Many properties and methods

**Recommended Refactoring:**

```
Current: One file
↓
Refactored:
├── lib/game-engine/behaviors/
│   ├── types/                   # Behavior types
│   │   ├── index.ts
│   │   ├── Context.ts           # BehaviorContext
│   │   └── Runtime.ts
│   └── executors/               # Behavior execution
```

**Estimated Effort:** 0.5 day  
**Complexity:** Low  
**Risk:** Medium (import updates)

---

### 12. `EntityManager.ts` (~500 lines)

**Location:** `app/lib/game-engine/EntityManager.ts`

**Issues Identified:**
- **Entity lifecycle management**: Large file with many responsibilities
- **Template management**: Entity creation from templates
- **Component registry**: Entity component system patterns

**Recommended Refactoring:**

```
Current: One file
↓
Refactored:
├── lib/game-engine/entities/
│   ├── EntityManager.ts         # Core manager
│   ├── EntityFactory.ts         # Creation logic
│   ├── EntityTemplates.ts       # Template management
│   └── ComponentRegistry.ts     # Component registration
```

**Estimated Effort:** 0.5-1 day  
**Complexity:** Medium  
**Risk:** Medium

---

### 13. `api/src/trpc/router.ts` (Small but central)

**Location:** `api/src/trpc/router.ts`

**Issues Identified:**
- **Actually small (22 lines)** but is the central router hub
- **All sub-routers imported here**: Potential bottleneck

**Note:** Not a refactoring candidate for size, but worth monitoring as API grows.

**Recommendation:** Already well-structured with sub-routers. No immediate action.

---

### 14. `useAssetGeneration.ts` (Custom hook)

**Location:** `app/components/editor/AssetGallery/useAssetGeneration.ts`

**Issues Identified:**
- **Complex custom hook**: Handles polling, generation, error states
- **Multiple responsibilities**: Generation orchestration, progress tracking

**Recommended Refactoring:**

```
Current: One large hook
↓
Refactored:
├── hooks/
│   ├── useAssetGeneration.ts    # Main hook (~200 lines)
│   ├── useGenerationProgress.ts # Progress tracking
│   └── useAssetPolling.ts       # Polling logic
```

**Estimated Effort:** 0.5 day  
**Complexity:** Low  
**Risk:** Low

---

### 15. `CameraSystem.ts` (~400 lines)

**Location:** `app/lib/game-engine/CameraSystem.ts`

**Issues Identified:**
- **Large utility class**: Camera logic with many methods
- **Viewport management**: Complex coordinate transforms

**Recommended Refactoring:**

```
Current: One file
↓
Refactored:
├── lib/game-engine/camera/
│   ├── CameraSystem.ts          # Core (~200 lines)
│   ├── Viewport.ts              # Viewport math
│   └── CoordinateTransforms.ts  # Coordinate conversion
```

**Estimated Effort:** 0.5 day  
**Complexity:** Low  
**Risk:** Low

---

## Summary Table

| Priority | File | Lines | Primary Issue | Effort | Risk |
|----------|------|-------|---------------|--------|------|
| P0 | `GameRuntime.godot.tsx` | 1,248 | God Component | 2-3d | Medium |
| P0 | `RulesEvaluator.ts` | 530 | Switch Statement | 1d | Low |
| P0 | `AssetGalleryPanel.tsx` | 753 | Mixed UI Concerns | 0.5-1d | Low |
| P1 | `browse.tsx` | 627 | Page God Component | 0.5-1d | Low |
| P1 | `shared/types/rules.ts` | ~500+ | High Coupling | 0.5d | Medium |
| P1 | `GodotBridge.native.ts` | 1,101 | JSI Bridge | 1d | High |
| P1 | `GodotBridge.web.ts` | 1,005 | WASM Bridge | 1d | High |
| P1 | `EditorProvider.tsx` | ~550 | Context God | 0.5-1d | Medium |
| P2 | `GameBridge.gd` | 3,161 | GDScript God | 2-3d | High |
| P2 | `InputEntityManager.ts` | ~500 | Input Processing | 0.5d | Low |
| P2 | `BehaviorContext.ts` | High | High Coupling | 0.5d | Medium |
| P2 | `EntityManager.ts` | ~500 | Entity Lifecycle | 0.5-1d | Medium |
| P2 | `useAssetGeneration.ts` | Complex | Hook Complexity | 0.5d | Low |
| P2 | `CameraSystem.ts` | ~400 | Utility Class | 0.5d | Low |

---

## Recommended Refactoring Order

### Phase 1: Quick Wins (Week 1)
1. **RulesEvaluator.ts** - Registry pattern (1 day, low risk)
2. **AssetGalleryPanel.tsx** - Component split (0.5-1 day)
3. **browse.tsx** - Component extraction (0.5-1 day)

### Phase 2: Critical Path (Week 2-3)
4. **GameRuntime.godot.tsx** - Input handling extraction (2-3 days)
5. **GameBridge.gd** - GDScript modularization (2-3 days)

### Phase 3: Bridge Refactoring (Week 4)
6. **GodotBridge.native.ts** - JSI modularization (1 day)
7. **GodotBridge.web.ts** - WASM modularization (1 day)

### Phase 4: Cleanup (Week 5)
8. Remaining P2 items as time permits

---

## Metrics

**Current State:**
- Files > 500 lines: ~15
- Files > 1000 lines: 4
- Largest file: 3,161 lines (GDScript)

**Target State (after refactoring):**
- Files > 500 lines: < 5
- Files > 1000 lines: 0
- Largest file: < 800 lines

---

## Testing Strategy

Each refactoring should follow:

1. **Before**: Ensure existing tests pass
2. **During**: Extract with no behavioral changes
3. **After**: Run full test suite, verify no regressions

---

## Related Documentation

- **Architecture Overview:** `app/AGENTS.md`
- **Game Engine Architecture:** `docs/game-maker/architecture/`
- **Godot Integration:** `docs/godot-migration/`
