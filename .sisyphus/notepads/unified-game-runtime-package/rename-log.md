# Task 10: Big-Bang Rename template → prefab

## Summary
Completed full rename of game-domain `template` to `prefab` across the entire codebase.

## Scope

### TypeScript Types (shared/src/types/)
- `EntityTemplate` → `EntityPrefab`
- `BaseEntityTemplate` → `BaseEntityPrefab`
- `ChildTemplateDefinition` → `ChildPrefabDefinition`
- `GameDefinition.templates` → `GameDefinition.prefabs`
- `Match3Config.pieceTemplates` → `Match3Config.piecePrefabs`
- `TetrisConfig.pieceTemplates` → `TetrisConfig.piecePrefabs`
- `GameEntity.template` → `GameEntity.prefab`
- `ChildEntityDefinition.template` → `ChildEntityDefinition.prefab`
- `WorldEntityData.template` → `WorldEntityData.prefab`
- `WorldEntityQuery.templateId` → `WorldEntityQuery.prefabId`
- `WorldOps.spawn(templateId)` → `WorldOps.spawn(prefabId)`
- `WorldOps.getTemplate()` → `WorldOps.getPrefab()`
- `SyncWorldOps.spawnEntity(templateId)` → `SyncWorldOps.spawnEntity(prefabId)`
- `SyncWorldOps.getEntityTemplate()` → `SyncWorldOps.getEntityPrefab()`
- `PackageBridgeContract.registerTemplates()` → `PackageBridgeContract.registerPrefabs()`
- `BridgeSpawnRequest.templateId` → `BridgeSpawnRequest.prefabId`
- `BridgeOperationType 'register_templates'` → `'register_prefabs'`
- `SpawnAction.template` → `SpawnAction.prefab`
- `DataPrefabDefinition.template` → `DataPrefabDefinition.entityPrefab`

### Zod Schemas (shared/src/types/schemas.ts)
- `EntityTemplateSchema` → `EntityPrefabSchema`
- `BodyEntityTemplateSchema` → `BodyEntityPrefabSchema`
- `ChildTemplateDefinitionSchema` → `ChildPrefabDefinitionSchema`
- `GameDefinitionSchema.templates` → `GameDefinitionSchema.prefabs`
- All entity/child `template` fields → `prefab`

### Validation (shared/src/validation/)
- `validateEntityTemplateRefs()` → `validateEntityPrefabRefs()`
- `validateTemplateReferences()` → `validatePrefabReferences()`
- `detectTemplateCycles()` → `detectPrefabCycles()`
- `validateTemplates()` → `validatePrefabs()`
- All error codes: `TEMPLATE_CYCLE` → `PREFAB_CYCLE`, `UNKNOWN_TEMPLATE` → `UNKNOWN_PREFAB`, etc.
- All error messages updated

### Godot Bridge (app/lib/godot/)
- `GodotBridge.registerTemplates()` → `GodotBridge.registerPrefabs()`
- `types.ts` field renames
- Debug bridge entity snapshot fields
- Mock bridge updated

### Game Engine (app/lib/game-engine/)
- `EntityManager.registerTemplate()` → `EntityManager.registerPrefab()`
- `EntityManager.getTemplate()` → `EntityManager.getPrefab()`
- `EntityManager.templates` map → `EntityManager.prefabs`
- `GameLoader` bridge calls
- `WorldOpsImpl` all template references
- `SpawnActionExecutor` action.template → action.prefab
- `ScriptSandboxRuntimeSystem` all template references
- `BehaviorExecutorRuntimeSystem` spawn calls
- `Match3GameSystem` pieceTemplates → piecePrefabs
- `PrefabInstantiator` template field access
- All test files updated

### GDScript (godot_project/scripts/)
- `GameBridge.gd`: `templates` dict → `prefabs`, `register_templates` → `register_prefabs`
- `EntityFactory.gd`: `_templates` → `_prefabs`, meta key `"template"` → `"prefab"`
- `EntityManager.gd`: `spawn_entity(template_id)` → `spawn_entity(prefab_id)`
- `EntityRecord.gd`: `var template` → `var prefab`
- All debug scripts: meta access, selectors, events, props
- `BridgeValidation.gd`: method validation
- `JSBridge.gd`: spawn parameter names

### API (api/src/)
- `PackageValidator.ts`: entity.template → entity.prefab
- `PackageCompiler.ts`: EntityTemplate → EntityPrefab
- Game schemas: template fields → prefab
- Theme planner: TemplatePlan → PrefabPlan, templatePlans → prefabPlans
- Asset generation pipeline: all templateId → prefabId
- Cost estimator: template references → prefab
- tRPC routes: asset system routes updated

### Editor Components (app/components/)
- `EditorProvider.tsx`: document.templates → document.prefabs
- `AssetGalleryPanel.tsx`: templateId → prefabId
- `EntityAssetList.tsx`: template references → prefab
- `InteractionLayer.tsx`: template lookups → prefab

## NOT Renamed (Intentional)
- `syncTemplates` tRPC route (game template records, not entity templates)
- `evaluateTemplate()` in BindingEvaluator (string interpolation)
- `@template` JSDoc annotations (TypeScript generics)
- `TemplateString` in expression parser (string interpolation)
- SQL column names (`template_id`) — DB migration is Task 11
- `Workflow template identifiers` in ComfyUI types

## Verification
- TypeScript compilation: PASS (all packages)
- Shared tests: 1050/1050 PASS
- App tests: 421/444 PASS (23 failures pre-existing, unrelated to rename)
- API tests: PackageValidator, PackageCompiler, scenario-integration all PASS
  - RealtimeRelayDO failure is network-related, pre-existing
