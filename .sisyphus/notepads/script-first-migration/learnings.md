## 2026-02-13: Documentation Purge Complete

### Skills Updated
- `bridge-development.md` - Changed "game behaviors" → "game scripts"
- `workspace-system.md` - Changed "rules" → "scripts" in file structure
- `game-authoring.md` - Removed "declarative rules" language
- `game-package.md` - Removed rules/ directory, changed templates/ → prefabs/
- `input-handling.md` - Changed "behavior update" → "script update hook"
- `editor-browser-testing.md` - Updated test game JSON (removed templates/rules)
- `INDEX.md` - Updated descriptions to remove rules/behaviors
- `game-inspector.md` - Changed template → prefab in all operation params
- `ai-game-generation.md` - Updated related skills section
- `economy-engine.md` - Removed "rules/actions" integration references
- `game-validation.md` - MAJOR UPDATE: Removed all validateRules/validateBehavior references, updated error codes
- `game-authoring/bundling-and-shaders.md` - Removed rules/ directory, changed templates/ → prefabs/

### Docs Updated
- `docs/testing/INPUT_CONTROL_TESTING.md` - Removed InputTriggerEvaluator/PhysicsActionExecutor references
- `docs/game-maker/architecture/modular-engine-playbook.md` - Changed "templates" → "prefabs"

### Docs Archived
- `docs/sloppeggle-auth-invites.md` → `docs/archive/plans/` (old plan with many behavior/rule refs)

### Verification
- No remaining `validateRules`, `behaviors.*type`, `rules.*trigger` in active docs
- No remaining `GameDefinition.rules`, `GameDefinition.behaviors` references
- No remaining `templates/` or `rules/` directory references (except in archived/historical docs)
- Historical documents (refactoring analysis, archived plans) left intact

### Pattern
The validation system (`game-validation.md`) was the most complex update - it documented the OLD validation pipeline that checked rules/behaviors. The actual validation code has been gutted (validateRules/validateBehavior removed, validateRuleEntityRefs is now a no-op), so the skill needed major surgery to reflect current reality.
