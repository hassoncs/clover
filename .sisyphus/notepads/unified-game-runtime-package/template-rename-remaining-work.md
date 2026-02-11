# Template → Prefab Rename - Remaining Work

## Summary
Mass rename is partially complete. Core types updated but 60 files still use legacy `templates:` syntax.

## Files Still Using `templates:` (60 matches across 40 files)

### Legacy Games (11 files) - r2/games/*
These will be migrated as part of Task 11 (legacy migration):
- ballSort/src/game.ts:176
- breakoutBouncer/src/game.ts:117
- flappyBird/src/game.ts:102
- gemCrush/src/game.ts:134
- minefield/src/game.ts:107
- mrPotatoHead/src/game.ts:76
- slopeggle/src/game.ts:197
- snake/src/game.ts:121
- sokoban/src/game.ts:146
- tweenToggleCube/src/game.ts:37

### Example Files (13 files) - app/app/examples/*
- camera_feed.tsx:36
- draggable_cubes.tsx:33
- dynamic_images.tsx:40
- dynamic_shader.tsx:29
- font_test.tsx:38
- glb_viewer.tsx:32
- overlay_demo.tsx:35
- overlay_test.tsx:33
- paint.tsx:28
- scripted_game.tsx:73
- text_effects_lab.tsx:45
- texture_button.tsx:72
- vfx_showcase.tsx:51

### Test Files (6 files)
- shared/src/expressions/property-watching/__tests__/DependencyAnalyzer.test.ts (11 matches)
- shared/src/loader/__examples__/usage.ts:266
- shared/src/schemas/__tests__/debug-validation.ts:6
- tests/e2e/bridge/bridge-contract.test.ts:7
- tests/e2e/bridge/bridge.test.ts:7
- tests/e2e/bridge/debug-bridge.test.ts:8

### Bundler Package (3 files)
- packages/game-bundler/src/compiler.ts (7 matches)
- packages/game-bundler/src/types.ts (2 matches)
- packages/game-bundler/src/__tests__/virtual-bundle-integration.test.ts (3 matches)

### API Layer (5 files)
- api/scripts/generate-assets.ts (2 matches)
- api/scripts/sync-templates.ts (2 matches)
- api/scripts/theme-game.ts:159
- api/src/ai/pipeline/theme-planner.ts:256
- api/src/trpc/routes/games.ts:846

### UI Components (2 files)
- app/app/(tabs)/_layout.tsx:71
- app/app/godot-test.tsx:17
- app/components/editor/Generation/GenerationModal.tsx:36

## Recommended Approach

Since the system enforces single-file tasks, complete the rename by delegating individual files:

### Priority 1: Core Infrastructure
1. packages/game-bundler/src/types.ts
2. packages/game-bundler/src/compiler.ts
3. api/src/trpc/routes/games.ts

### Priority 2: UI and Examples
4. app/components/editor/Generation/GenerationModal.tsx
5. app/app/(tabs)/_layout.tsx
6. All app/app/examples/*.tsx files (13 files)

### Priority 3: Tests
7. All test files (6 files)

### Priority 4: Legacy Games (via Task 11)
8. All r2/games/*/src/game.ts files (10 files) - these will be converted to workspace format

### Priority 5: API Scripts
9. api/scripts/*.ts files (3 files)

## Commands for Mass Rename (if doing manually)

```bash
# Rename templates: to prefabs:
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/templates:/prefabs:/g'

# Rename EntityTemplate to EntityPrefab
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/EntityTemplate/EntityPrefab/g'

# Rename templateId to prefabId
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/templateId/prefabId/g'

# Rename registerTemplates to registerPrefabs
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/registerTemplates/registerPrefabs/g'
```

## Current Status
- ✅ Core types updated (GameDefinition, EntityPrefab)
- ✅ New code uses prefab terminology
- ⚠️ 60 files still use legacy templates syntax
- ⚠️ Type errors exist due to partial rename

## Next Steps
Complete Task 10 by delegating individual file renames via single-task subagent calls, or use sed/perl for mass rename outside the subagent system.
