---
description: Use when validating game definitions, checking game playability, semantic validation, expression validation, or debugging validation errors
---

# Game Validation

## Architecture

Two type systems coexist:

1. **Legacy types** (`gameDefinitionTypes.ts`) — used by `validateGameDefinition()` and `validateSemantic()`
2. **Report types** (`types.ts`) — used by `validateGame()` (API-side) and scoring/mappers

The API-side `validateGame()` calls `validateGameDefinition()`, maps the legacy result via `mapLegacyResultToReport()`, then adds expression validation issues.

## Files

| File | Exports |
|------|---------|
| `shared/src/validation/gameDefinitionTypes.ts` | `GameDefinitionValidationResult`, `ValidationError`, `ValidationWarning` |
| `shared/src/validation/types.ts` | `GameValidationIssue`, `GameValidationReport`, `ValidationSummary`, `IssueSeverity`, `ValidatorSource`, `ScoringOptions`, `TopIssuesOptions`, `CURRENT_VALIDATOR_VERSION` |
| `shared/src/validation/gameDefinitionValidator.ts` | `validateGameDefinition()`, `getValidationSummary()` |
| `shared/src/validation/semantic.ts` | `validateSemantic()`, `validateEntityPrefabRefs()`, `validateRuleEntityRefs()`, `validateParentChildCycles()`, `validateConstantRefs()` |
| `shared/src/validation/playable.ts` | `validatePlayable()`, `validateMatch3Playability()`, `validateTetrisPlayability()`, `PlayableValidation` |
| `shared/src/validation/scoring.ts` | `computeValidationScore()`, `selectTopIssues()`, `computeValidationSummary()` |
| `shared/src/validation/mappers/legacy.ts` | `mapLegacyResultToReport()`, `createEmptyReport()` |
| `shared/src/validation/slopeggleValidators.ts` | `validateSlopeggleLevel()`, `validateBounds()`, `validateForbiddenZones()`, `validateSpacing()`, `validateOrangeCount()`, `validateOrangeAccessibility()` |
| `api/src/validation/gameValidator.ts` | `validateGame()`, `getValidationReportJson()` |
| `api/src/ai/game/validator.ts` | Re-exports `validateGameDefinition`, `getValidationSummary`, `ValidationError`, `ValidationWarning`, `GameDefinitionValidationResult` from shared |

## Types

### Legacy types (gameDefinitionTypes.ts)

```typescript
interface GameDefinitionValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  code: string;
  message: string;
  path?: string;       // optional
}

interface ValidationWarning {
  code: string;
  message: string;
  path?: string;       // optional
}
```

### Report types (types.ts)

```typescript
type IssueSeverity = 'critical' | 'warning';
type ValidatorSource = 'gameDefinition' | 'expressions';

interface GameValidationIssue {
  code: string;
  message: string;
  severity: IssueSeverity;
  source: ValidatorSource;
  path: string;          // required (not optional)
  context?: string;      // optional, string (not Record)
}

interface GameValidationReport {
  valid: boolean;
  issues: GameValidationIssue[];
  summary: ValidationSummary;
  validatorVersion: string;
  validatedAt: number;
}

interface ValidationSummary {
  criticalCount: number;
  warningCount: number;
  score: number;
  topIssues: GameValidationIssue[];
}
```

### Playable types (playable.ts)

```typescript
interface PlayableValidation {
  valid: boolean;
  errors: string[];     // plain strings, not ValidationError
  warnings: string[];   // plain strings, not ValidationWarning
}
```

## Validation Pipeline

### `validateGameDefinition(game: GameDefinition): GameDefinitionValidationResult`

Runs in this order:
1. Null/type guard — returns `INVALID_GAME` error if not an object
2. **Zod schema parse** — `GameDefinitionSchema.safeParse(game)` — returns `SCHEMA_VALIDATION_ERROR` codes on failure, short-circuits
3. `validateMetadata()` — checks `metadata`, `metadata.id`, `metadata.title`, `metadata.version`
4. `validateWorld()` — checks `world`, `world.gravity`, `world.pixelsPerMeter`
5. `validatePrefabs()` — validates each prefab's physics, collider, visual, behaviors
6. `validateEntities()` — validates entity IDs, transforms, prefab refs, components, behaviors; checks for duplicate IDs; checks for player control (input rules or draggable behavior)
7. `validateRules()` — validates rule IDs, triggers, actions; checks collision trigger tag references
8. `validateWinLoseConditions()` — checks win mechanism (expr, rule, or script), lose condition type/config
9. `validateSemantic()` — cross-reference validation (see below)

### `validateSemantic(game, errors, warnings): void`

Mutates the passed `errors`/`warnings` arrays. Runs:
1. `validatePrefabReferences()` — checks prefab child refs, behavior spawn refs, entity child refs, rule spawn refs; detects duplicate prefab IDs
2. `detectPrefabCycles()` — DFS cycle detection on prefab children graph
3. `validateEntityPrefabRefs()` — entities referencing unknown prefabs
4. `validateRuleEntityRefs()` — rule actions referencing unknown entity IDs or prefabs (spawn, destroy, modify, target, sourceEntityId)
5. `validateParentChildCycles()` — separate cycle detection on parent/child relationships
6. Constant reference validation — walks entire game tree for `{ const: "name" }` references

### `validatePlayable(gameDef: GameDefinition): PlayableValidation`

Validates game-type-specific playability:
- **Match3**: rows/cols bounds (4-12), piece prefab count (3-6), minMatch (3-5), cellSize > 0
- **Tetris**: board dimensions (width 10-20, height 15-25), exactly 7 piece prefabs, drop speed ≥ 0.1

Returns `PlayableValidation` with plain string errors/warnings (not `ValidationError`).

### `validateGame(game: GameDefinition): GameValidationReport` (API-side)

1. Calls `validateGameDefinition(game)` → legacy result
2. Maps via `mapLegacyResultToReport(result, 'gameDefinition')` → errors become `severity: 'critical'`, warnings become `severity: 'warning'`
3. Extracts expressions from rule conditions/actions and validates each
4. Combines structural + expression issues into `GameValidationReport`
5. Scoring: `100 - (criticalCount * 30) - (warningCount * 3)`, clamped to [0, 100]

## Error Codes

All codes below are string literals found in source. Errors make `valid: false`; warnings do not.

### gameDefinitionValidator.ts — Errors

| Code | Emitted by | Condition |
|------|-----------|-----------|
| `INVALID_GAME` | top-level guard | game is not an object |
| `SCHEMA_VALIDATION_ERROR` | Zod parse | any Zod schema failure (short-circuits) |
| `MISSING_METADATA` | validateMetadata | `!game.metadata` |
| `MISSING_ID` | validateMetadata | `!game.metadata.id` |
| `MISSING_WORLD` | validateWorld | `!game.world` |
| `MISSING_GRAVITY` | validateWorld | `!game.world.gravity` |
| `INVALID_GRAVITY` | validateWorld | gravity x/y not numeric |
| `INVALID_BODY_TYPE` | validatePhysicsComponent | bodyType not in `['static', 'dynamic', 'kinematic']` |
| `NEGATIVE_DENSITY` | validatePhysicsComponent | density < 0 |
| `INVALID_SHAPE` | validateColliderComponent | shape not in `['box', 'circle', 'polygon', 'capsule']` |
| `INVALID_BOX_WIDTH` | validateColliderComponent | box width ≤ 0 or not number |
| `INVALID_BOX_HEIGHT` | validateColliderComponent | box height ≤ 0 or not number |
| `INVALID_CIRCLE_RADIUS` | validateColliderComponent | circle radius ≤ 0 or not number |
| `NEGATIVE_RESTITUTION` | validateColliderComponent | restitution < 0 |
| `INVALID_VISUAL_TYPE` | validateVisualComponent | type not in `['rect', 'circle', 'polygon', 'image', 'text']` |
| `INVALID_RECT_WIDTH` | validateVisualComponent | rect width ≤ 0 or not number |
| `INVALID_RECT_HEIGHT` | validateVisualComponent | rect height ≤ 0 or not number |
| `INVALID_VISUAL_RADIUS` | validateVisualComponent | circle visual radius ≤ 0 or not number |
| `INVALID_BEHAVIOR_TYPE` | validateBehavior | type not in VALID_BEHAVIOR_TYPES list |
| `MISSING_SPAWN_TEMPLATE` | validateBehavior | spawn_on_event missing entityTemplate |
| `MISSING_ENTITY_ID` | validateEntity | entity has no id |
| `MISSING_TRANSFORM` | validateEntity | entity has no transform |
| `INVALID_TRANSFORM` | validateEntity | transform x/y not numeric |
| `UNKNOWN_PREFAB` | validateEntity | entity references unknown prefab key |
| `MISSING_PREFAB_ID` | validatePrefabs | prefab has no id |
| `MISSING_ENTITIES` | validateEntities | entities is not an array |
| `NO_ENTITIES` | validateEntities | entities array is empty |
| `DUPLICATE_ENTITY_ID` | validateEntities | duplicate entity id |
| `NO_PLAYER_CONTROL` | validateEntities | no input rule (tap/drag/tilt/button/swipe) and no draggable behavior |
| `MISSING_RULE_ID` | validateRule | rule has no id |
| `MISSING_RULE_TRIGGER` | validateRule | rule has no trigger |
| `MISSING_LOSE_CONDITION` | validateWinLoseConditions | `!game.loseCondition` |
| `INVALID_LOSE_CONDITION_TYPE` | validateWinLoseConditions | type not in `['entity_destroyed', 'entity_exits_screen', 'time_up', 'custom']` |
| `INVALID_LOSE_TIME` | validateWinLoseConditions | time_up with time ≤ 0 |
| `MISSING_LOSE_EXPR` | validateWinLoseConditions | custom lose without expr |
| `MISSING_LOSE_TARGET` | validateWinLoseConditions | entity_destroyed/entity_exits_screen without tag or entityId |
| `CUSTOM_LOSE_NO_RULE` | validateWinLoseConditions | custom lose without a game_state/lose rule |
| `LOSE_CONDITION_TAG_NOT_FOUND` | validateWinLoseConditions | lose condition tag not found on any entity |

### gameDefinitionValidator.ts — Warnings

| Code | Condition |
|------|-----------|
| `MISSING_TITLE` | `!game.metadata.title` |
| `MISSING_VERSION` | `!game.metadata.version` |
| `INVALID_PIXELS_PER_METER` | pixelsPerMeter not positive number |
| `HIGH_DENSITY` | density > 100 |
| `FRICTION_OUT_OF_RANGE` | friction < 0 or > 1 |
| `EMPTY_COLLISION_TAGS` | destroy_on_collision/score_on_collision with no withTags |
| `TOO_MANY_ENTITIES` | entities.length > 50 |
| `NO_RULE_ACTIONS` | rule has no actions |
| `UNKNOWN_TAG_IN_RULE` | collision trigger references tag not found on any entity/prefab |
| `NO_WIN_MECHANISM` | no winCondition.expr, no game_state/win rule, no script calling win() |

### semantic.ts — Errors

| Code | Condition |
|------|-----------|
| `PREFAB_CYCLE` | cycle detected in prefab children graph |
| `UNKNOWN_CONSTANT` | `{ const: "name" }` references undefined constant |
| `DUPLICATE_PREFAB_ID` | two prefab keys share the same `.id` value |
| `UNKNOWN_PREFAB_REFERENCE` | prefab/entity child references unknown prefab key (error for children, warning for spawn behaviors) |
| `UNKNOWN_PREFAB` | entity references unknown prefab, or rule spawn references unknown prefab |
| `UNKNOWN_ENTITY_REF` | rule action references unknown entity ID (spawn position, destroy target, modify target, sourceEntityId) |
| `PARENT_CHILD_CYCLE` | cycle in parent/child relationships |

### semantic.ts — Warnings

| Code | Condition |
|------|-----------|
| `UNKNOWN_PREFAB_REFERENCE` | behavior/rule spawns unknown prefab (warning, not error) |

### api/src/validation/gameValidator.ts — Errors

| Code | Source | Condition |
|------|--------|-----------|
| `EXPRESSION_ERROR` | `'expressions'` | expression fails validation (invalid syntax, unknown variables) |

## Valid Behavior Types

From `VALID_BEHAVIOR_TYPES` in gameDefinitionValidator.ts:

`move`, `rotate`, `rotate_toward`, `follow`, `bounce`, `spawn_on_event`, `destroy_on_collision`, `score_on_collision`, `score_on_destroy`, `timer`, `animate`, `oscillate`, `gravity_zone`, `magnetic`, `health`, `draggable`

## Usage

```typescript
// Shared — structural + semantic validation
import { validateGameDefinition, getValidationSummary } from '@slopcade/shared/validation';
const result = validateGameDefinition(gameDefinition);
if (!result.valid) {
  console.error(getValidationSummary(result));
}

// API — full validation including expressions, returns GameValidationReport
import { validateGame } from '~/validation/gameValidator';
const report = validateGame(gameDefinition);
// report.valid, report.issues, report.summary.score

// Playable — game-type-specific checks
import { validatePlayable } from '@slopcade/shared/validation';
const playable = validatePlayable(gameDefinition);
// playable.errors is string[], not ValidationError[]

// Mapping legacy → report format
import { mapLegacyResultToReport } from '@slopcade/shared/validation';
const report = mapLegacyResultToReport(legacyResult, 'gameDefinition');
```

## Gotchas

- `ValidationError` and `GameValidationIssue` are different types. Legacy `ValidationError` has `{ code, message, path? }`. Report `GameValidationIssue` has `{ code, message, severity, source, path, context? }`.
- `validatePlayable()` returns `PlayableValidation` with `errors: string[]` — plain strings, not structured error objects.
- `validateSemantic()` mutates the `errors`/`warnings` arrays passed to it — it does not return a result.
- All validators are bare exported functions, not classes.
- `SCHEMA_VALIDATION_ERROR` short-circuits — if Zod parse fails, no further validation runs.
- `api/src/ai/game/validator.ts` is just a re-export barrel — no additional logic.
- The `mapLegacyResultToReport()` mapper converts legacy errors to `severity: 'critical'` and warnings to `severity: 'warning'`.
- Slopeggle validators (`slopeggleValidators.ts`) use their own `SlopeggleValidation` type (same shape as `PlayableValidation`: `{ valid, errors: string[], warnings: string[] }`).
