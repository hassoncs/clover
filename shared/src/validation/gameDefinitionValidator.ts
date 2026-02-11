import type { GameDefinition } from '../types/GameDefinition'
import { GameDefinitionSchema } from '../schemas/gameDefinition';
import { validateSemantic } from './semantic'
import type {
  GameDefinitionValidationResult,
  ValidationError,
  ValidationWarning,
} from './gameDefinitionTypes';

export type {
  GameDefinitionValidationResult,
  ValidationError,
  ValidationWarning,
} from './gameDefinitionTypes';

const VALID_BEHAVIOR_TYPES = [
  'move',
  'rotate',
  'rotate_toward',
  'follow',
  'bounce',
  'spawn_on_event',
  'destroy_on_collision',
  'score_on_collision',
  'score_on_destroy',
  'timer',
  'animate',
  'oscillate',
  'gravity_zone',
  'magnetic',
  'health',
  'draggable',
];

const VALID_BODY_TYPES = ['static', 'dynamic', 'kinematic'];
const VALID_SHAPES = ['box', 'circle', 'polygon', 'capsule'];
const VALID_VISUAL_TYPES = ['rect', 'circle', 'polygon', 'image', 'text'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

function validateMetadata(
  game: GameDefinition,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!game.metadata) {
    errors.push({
      code: 'MISSING_METADATA',
      message: 'Game definition must have metadata',
      path: 'metadata',
    });
    return;
  }

  if (!game.metadata.id) {
    errors.push({
      code: 'MISSING_ID',
      message: 'Game must have an ID',
      path: 'metadata.id',
    });
  }

  if (!game.metadata.title) {
    warnings.push({
      code: 'MISSING_TITLE',
      message: 'Game should have a title',
      path: 'metadata.title',
    });
  }

  if (!game.metadata.version) {
    warnings.push({
      code: 'MISSING_VERSION',
      message: 'Game should have a version',
      path: 'metadata.version',
    });
  }
}

function validateWorld(
  game: GameDefinition,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!game.world) {
    errors.push({
      code: 'MISSING_WORLD',
      message: 'Game definition must have world config',
      path: 'world',
    });
    return;
  }

  if (!game.world.gravity) {
    errors.push({
      code: 'MISSING_GRAVITY',
      message: 'World must have gravity defined',
      path: 'world.gravity',
    });
  } else {
    if (typeof game.world.gravity.x !== 'number' || typeof game.world.gravity.y !== 'number') {
      errors.push({
        code: 'INVALID_GRAVITY',
        message: 'Gravity must have numeric x and y values',
        path: 'world.gravity',
      });
    }
  }

  if (typeof game.world.pixelsPerMeter !== 'number' || game.world.pixelsPerMeter <= 0) {
    warnings.push({
      code: 'INVALID_PIXELS_PER_METER',
      message: 'pixelsPerMeter should be a positive number',
      path: 'world.pixelsPerMeter',
    });
  }
}

function validatePhysicsComponent(
  physics: unknown,
  entityId: string,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!isRecord(physics)) return;
  const bodyType = physics.bodyType;
  if (typeof bodyType !== 'string' || !VALID_BODY_TYPES.includes(bodyType)) {
    errors.push({
      code: 'INVALID_BODY_TYPE',
      message: `Entity ${entityId} has invalid bodyType: ${String(bodyType)}`,
      path: `entities.${entityId}.physics.bodyType`,
    });
  }

  // Validate density if provided
  if (typeof physics.density === 'number') {
    if (physics.density < 0) {
      errors.push({
        code: 'NEGATIVE_DENSITY',
        message: `Entity ${entityId} has negative density`,
        path: `entities.${entityId}.physics.density`,
      });
    }

    if (physics.density > 100) {
      warnings.push({
        code: 'HIGH_DENSITY',
        message: `Entity ${entityId} has unusually high density (${physics.density})`,
        path: `entities.${entityId}.physics.density`,
      });
    }
  }
}

function validateColliderComponent(
  collider: unknown,
  entityId: string,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!isRecord(collider)) return;
  const shape = collider.shape;
  if (typeof shape !== 'string' || !VALID_SHAPES.includes(shape)) {
    errors.push({
      code: 'INVALID_SHAPE',
      message: `Entity ${entityId} has invalid shape: ${String(shape)}`,
      path: `entities.${entityId}.collider.shape`,
    });
  }

  if (shape === 'box') {
    const width = collider.width;
    const height = collider.height;
    if (typeof width !== 'number' || width <= 0) {
      errors.push({
        code: 'INVALID_BOX_WIDTH',
        message: `Entity ${entityId} box collider must have positive width`,
        path: `entities.${entityId}.collider.width`,
      });
    }
    if (typeof height !== 'number' || height <= 0) {
      errors.push({
        code: 'INVALID_BOX_HEIGHT',
        message: `Entity ${entityId} box collider must have positive height`,
        path: `entities.${entityId}.collider.height`,
      });
    }
  }

  if (shape === 'circle') {
    const radius = collider.radius;
    if (typeof radius !== 'number' || radius <= 0) {
      errors.push({
        code: 'INVALID_CIRCLE_RADIUS',
        message: `Entity ${entityId} circle collider must have positive radius`,
        path: `entities.${entityId}.collider.radius`,
      });
    }
  }

  if (typeof collider.restitution === 'number' && collider.restitution < 0) {
    errors.push({
      code: 'NEGATIVE_RESTITUTION',
      message: `Entity ${entityId} has negative restitution`,
      path: `entities.${entityId}.collider.restitution`,
    });
  }

  if (typeof collider.friction === 'number' && (collider.friction < 0 || collider.friction > 1)) {
    warnings.push({
      code: 'FRICTION_OUT_OF_RANGE',
      message: `Entity ${entityId} has friction out of range (0-1)`,
      path: `entities.${entityId}.collider.friction`,
    });
  }
}

function validateVisualComponent(
  visual: unknown,
  entityId: string,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!isRecord(visual)) return;
  const visualType = visual.type;
  if (typeof visualType !== 'string' || !VALID_VISUAL_TYPES.includes(visualType)) {
    errors.push({
      code: 'INVALID_VISUAL_TYPE',
      message: `Entity ${entityId} has invalid visual type: ${String(visualType)}`,
      path: `entities.${entityId}.visual.type`,
    });
  }

  if (visualType === 'rect') {
    const width = visual.width;
    const height = visual.height;
    if (typeof width !== 'number' || width <= 0) {
      errors.push({
        code: 'INVALID_RECT_WIDTH',
        message: `Entity ${entityId} rect visual must have positive width`,
        path: `entities.${entityId}.visual.width`,
      });
    }
    if (typeof height !== 'number' || height <= 0) {
      errors.push({
        code: 'INVALID_RECT_HEIGHT',
        message: `Entity ${entityId} rect visual must have positive height`,
        path: `entities.${entityId}.visual.height`,
      });
    }
  }

  if (visualType === 'circle') {
    const radius = visual.radius;
    if (typeof radius !== 'number' || radius <= 0) {
      errors.push({
        code: 'INVALID_VISUAL_RADIUS',
        message: `Entity ${entityId} circle visual must have positive radius`,
        path: `entities.${entityId}.visual.radius`,
      });
    }
  }
}

function validateBehavior(
  behavior: unknown,
  entityId: string,
  index: number,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!isRecord(behavior)) return;
  const behaviorType = behavior.type;
  if (typeof behaviorType !== 'string' || !VALID_BEHAVIOR_TYPES.includes(behaviorType)) {
    errors.push({
      code: 'INVALID_BEHAVIOR_TYPE',
      message: `Entity ${entityId} behavior ${index} has invalid type: ${String(behaviorType)}`,
      path: `entities.${entityId}.behaviors[${index}].type`,
    });
    return;
  }

  if (behaviorType === 'spawn_on_event' && typeof behavior.entityTemplate !== 'string' && !Array.isArray(behavior.entityTemplate)) {
    errors.push({
      code: 'MISSING_SPAWN_TEMPLATE',
      message: `Entity ${entityId} spawn_on_event behavior missing entityTemplate`,
      path: `entities.${entityId}.behaviors[${index}].entityTemplate`,
    });
  }

  if (behaviorType === 'destroy_on_collision' || behaviorType === 'score_on_collision') {
    const withTags = getStringArray(behavior.withTags);
    if (withTags.length === 0) {
      warnings.push({
        code: 'EMPTY_COLLISION_TAGS',
        message: `Entity ${entityId} ${behaviorType} behavior has no tags specified`,
        path: `entities.${entityId}.behaviors[${index}].withTags`,
      });
    }
  }
}

function validateEntity(
  entity: Record<string, unknown>,
  templates: Record<string, unknown>,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  const entityId = typeof entity.id === 'string' ? entity.id : 'unknown';
  if (typeof entity.id !== 'string' || entity.id.length === 0) {
    errors.push({
      code: 'MISSING_ENTITY_ID',
      message: 'Entity must have an ID',
      path: 'entities',
    });
    return;
  }

  const transform = isRecord(entity.transform) ? entity.transform : null;
  if (!transform) {
    errors.push({
      code: 'MISSING_TRANSFORM',
      message: `Entity ${entityId} must have a transform`,
      path: `entities.${entityId}.transform`,
    });
  } else {
    if (typeof transform.x !== 'number' || typeof transform.y !== 'number') {
      errors.push({
        code: 'INVALID_TRANSFORM',
        message: `Entity ${entityId} transform must have numeric x and y`,
        path: `entities.${entityId}.transform`,
      });
    }
  }

  if (typeof entity.template === 'string' && !templates[entity.template]) {
    errors.push({
      code: 'UNKNOWN_TEMPLATE',
      message: `Entity ${entityId} references unknown template: ${entity.template}`,
      path: `entities.${entityId}.template`,
    });
  }

  validatePhysicsComponent(entity.physics, entityId, errors, warnings);
  validateColliderComponent(entity.collider, entityId, errors, warnings);
  validateVisualComponent(entity.visual, entityId, errors, warnings);

  if (Array.isArray(entity.behaviors)) {
    entity.behaviors.forEach((behavior, index) => {
      validateBehavior(behavior, entityId, index, errors, warnings);
    });
  }
}

function validateTemplates(
  templates: Record<string, unknown>,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  for (const [templateId, template] of Object.entries(templates)) {
    if (!isRecord(template) || typeof template.id !== 'string') {
      errors.push({
        code: 'MISSING_TEMPLATE_ID',
        message: `Template ${templateId} must have an ID`,
        path: `templates.${templateId}.id`,
      });
    }

    if (template && isRecord(template)) {
      if (template.physics) {
        validatePhysicsComponent(template.physics, `template:${templateId}`, errors, warnings);
      }

      if (template.collider) {
        validateColliderComponent(template.collider, `template:${templateId}`, errors, warnings);
      }

      if (template.visual) {
        validateVisualComponent(template.visual, `template:${templateId}`, errors, warnings);
      }

      if (Array.isArray(template.behaviors)) {
        template.behaviors.forEach((behavior, index) => {
          validateBehavior(behavior, `template:${templateId}`, index, errors, warnings);
        });
      }
    }
  }
}

function validateEntities(
  game: GameDefinition,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!Array.isArray(game.entities)) {
    errors.push({
      code: 'MISSING_ENTITIES',
      message: 'Game must have an entities array',
      path: 'entities',
    });
    return;
  }

  if (game.entities.length === 0) {
    errors.push({
      code: 'NO_ENTITIES',
      message: 'Game must have at least one entity',
      path: 'entities',
    });
    return;
  }

  if (game.entities.length > 50) {
    warnings.push({
      code: 'TOO_MANY_ENTITIES',
      message: `Game has ${game.entities.length} entities, which may impact performance`,
      path: 'entities',
    });
  }

  const entityIds = new Set<string>();
  const entities = game.entities;
  const templates = isRecord(game.templates) ? game.templates : {};
  for (const entity of entities) {
    if (!isRecord(entity)) continue;
    if (typeof entity.id === 'string' && entityIds.has(entity.id)) {
      errors.push({
        code: 'DUPLICATE_ENTITY_ID',
        message: `Duplicate entity ID: ${entity.id}`,
        path: `entities.${entity.id}`,
      });
    }
    if (typeof entity.id === 'string') {
      entityIds.add(entity.id);
    }

    validateEntity(entity, templates, errors, warnings);
  }

  const rules = Array.isArray(game.rules) ? game.rules : [];
  const hasInputRule = rules.some((rule) => {
    if (!isRecord(rule) || !isRecord(rule.trigger)) return false;
    const triggerType = rule.trigger.type;
    return (
      triggerType === 'tap' ||
      triggerType === 'drag' ||
      triggerType === 'tilt' ||
      triggerType === 'button' ||
      triggerType === 'swipe'
    );
  });

  const hasLegacyDraggable = entities.some((entity) => {
    if (!isRecord(entity)) return false;
    const behaviors = Array.isArray(entity.behaviors) ? entity.behaviors : [];
    if (behaviors.some((b) => isRecord(b) && b.type === 'draggable')) return true;
    if (typeof entity.template === 'string') {
      const template = templates[entity.template];
      if (isRecord(template) && Array.isArray(template.behaviors)) {
        return template.behaviors.some((b) => isRecord(b) && b.type === 'draggable');
      }
    }
    return false;
  });

  if (!hasInputRule && !hasLegacyDraggable) {
    errors.push({
      code: 'NO_PLAYER_CONTROL',
      message: 'Game must have at least one Rule with an input trigger (tap, drag, tilt, button, swipe) or a draggable behavior.',
      path: 'rules',
    });
  }
}

function validateRule(
  rule: Record<string, unknown>,
  game: GameDefinition,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (typeof rule.id !== 'string' || rule.id.length === 0) {
    errors.push({
      code: 'MISSING_RULE_ID',
      message: 'Rule must have an ID',
      path: 'rules',
    });
    return;
  }

  if (!isRecord(rule.trigger)) {
    errors.push({
      code: 'MISSING_RULE_TRIGGER',
      message: `Rule ${rule.id} must have a trigger`,
      path: `rules.${rule.id}.trigger`,
    });
  }

  if (!Array.isArray(rule.actions) || rule.actions.length === 0) {
    warnings.push({
      code: 'NO_RULE_ACTIONS',
      message: `Rule ${rule.id} has no actions`,
      path: `rules.${rule.id}.actions`,
    });
  }

  if (isRecord(rule.trigger) && rule.trigger.type === 'collision') {
    const collisionTrigger = rule.trigger as { entityATag?: unknown; entityBTag?: unknown };
    const allTags = new Set<string>();

    if (Array.isArray(game.entities)) {
      game.entities.forEach((entity) => {
        if (!isRecord(entity)) return;
        getStringArray(entity.tags).forEach((tag) => { allTags.add(tag); });
        if (typeof entity.template === 'string') {
          const template = isRecord(game.templates) ? game.templates[entity.template] : undefined;
          if (isRecord(template)) {
            getStringArray(template.tags).forEach((tag) => { allTags.add(tag); });
          }
        }
      });
    }

    if (isRecord(game.templates)) {
      Object.values(game.templates).forEach((template) => {
        if (!isRecord(template)) return;
        getStringArray(template.tags).forEach((tag) => { allTags.add(tag); });
      });
    }

    if (typeof collisionTrigger.entityATag === 'string' && !allTags.has(collisionTrigger.entityATag)) {
      warnings.push({
        code: 'UNKNOWN_TAG_IN_RULE',
        message: `Rule ${rule.id} references unknown tag: ${collisionTrigger.entityATag}`,
        path: `rules.${rule.id}.trigger.entityATag`,
      });
    }

    if (typeof collisionTrigger.entityBTag === 'string' && !allTags.has(collisionTrigger.entityBTag)) {
      warnings.push({
        code: 'UNKNOWN_TAG_IN_RULE',
        message: `Rule ${rule.id} references unknown tag: ${collisionTrigger.entityBTag}`,
        path: `rules.${rule.id}.trigger.entityBTag`,
      });
    }
  }
}

function validateRules(
  game: GameDefinition,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!Array.isArray(game.rules)) return;

  game.rules.forEach((rule) => {
    if (isRecord(rule)) {
      validateRule(rule, game, errors, warnings);
    }
  });
}

function validateWinLoseConditions(
  game: GameDefinition,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  const VALID_LOSE_TYPES = ['entity_destroyed', 'entity_exits_screen', 'time_up', 'custom'];

  const hasWinExpr = game.winCondition?.expr;
  const hasWinTriggeringRule = game.rules?.some(rule =>
    rule.actions?.some(action =>
      (action.type === 'game_state' && (action as any).state === 'win') ||
      action.type === 'ball_sort_check_win'
    )
  );
  const hasWinScript = game.script?.includes('win(');

  if (!hasWinExpr && !hasWinTriggeringRule && !hasWinScript) {
    warnings.push({
      code: 'NO_WIN_MECHANISM',
      message: 'No win condition detected. Provide winCondition.expr, a rule with game_state action, or script calling ctx.win()',
      path: 'winCondition',
    });
  }

  if (!game.loseCondition) {
    errors.push({
      code: 'MISSING_LOSE_CONDITION',
      message: 'Game must have a lose condition. See docs/game-maker/reference/playability-contract.md for requirements.',
      path: 'loseCondition',
    });
  } else {
    if (!VALID_LOSE_TYPES.includes(game.loseCondition.type)) {
      errors.push({
        code: 'INVALID_LOSE_CONDITION_TYPE',
        message: `Invalid lose condition type: ${game.loseCondition.type}. Valid types: ${VALID_LOSE_TYPES.join(', ')}`,
        path: 'loseCondition.type',
      });
    }

    if (game.loseCondition.type === 'time_up' && (!game.loseCondition.time || game.loseCondition.time <= 0)) {
      errors.push({
        code: 'INVALID_LOSE_TIME',
        message: 'Time up lose condition must have a positive time value',
        path: 'loseCondition.time',
      });
    }

    if (game.loseCondition.type === 'custom' && !game.loseCondition.expr) {
      errors.push({
        code: 'MISSING_LOSE_EXPR',
        message: 'Custom lose condition requires an expr field',
        path: 'loseCondition.expr',
      });
    }

    if (game.loseCondition.type === 'entity_destroyed' && !game.loseCondition.tag && !game.loseCondition.entityId) {
      errors.push({
        code: 'MISSING_LOSE_TARGET',
        message: 'entity_destroyed lose condition must specify a tag or entityId',
        path: 'loseCondition',
      });
    }

    if (game.loseCondition.type === 'entity_exits_screen' && !game.loseCondition.tag && !game.loseCondition.entityId) {
      errors.push({
        code: 'MISSING_LOSE_TARGET',
        message: 'entity_exits_screen lose condition must specify a tag or entityId',
        path: 'loseCondition',
      });
    }

    if (game.loseCondition.type === 'custom') {
      const hasLoseTriggeringRule = game.rules?.some(rule =>
        rule.actions?.some(action =>
          action.type === 'game_state' && (action as any).state === 'lose'
        )
      );

      if (!hasLoseTriggeringRule) {
        errors.push({
          code: 'CUSTOM_LOSE_NO_RULE',
          message: 'Custom lose condition requires a rule with action { type: "game_state", state: "lose" }',
          path: 'loseCondition',
        });
      }
    }
  }

  if (game.loseCondition?.type === 'entity_destroyed' && game.loseCondition.tag) {
    const hasTaggedEntity = game.entities?.some(
      (entity) =>
        entity.tags?.includes(game.loseCondition!.tag!) ||
        (entity.template &&
          game.templates?.[entity.template]?.tags?.includes(game.loseCondition!.tag!))
    );

    if (!hasTaggedEntity) {
      errors.push({
        code: 'LOSE_CONDITION_TAG_NOT_FOUND',
        message: `Lose condition references tag "${game.loseCondition.tag}" but no entities have it`,
        path: 'loseCondition.tag',
      });
    }
  }

  if (game.loseCondition?.type === 'entity_exits_screen' && game.loseCondition.tag) {
    const hasTaggedEntity = game.entities?.some(
      (entity) =>
        entity.tags?.includes(game.loseCondition!.tag!) ||
        (entity.template &&
          game.templates?.[entity.template]?.tags?.includes(game.loseCondition!.tag!))
    );

    if (!hasTaggedEntity) {
      errors.push({
        code: 'LOSE_CONDITION_TAG_NOT_FOUND',
        message: `Lose condition references tag "${game.loseCondition.tag}" but no entities have it`,
        path: 'loseCondition.tag',
      });
    }
  }
}

export function validateGameDefinition(game: GameDefinition): GameDefinitionValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!game || typeof game !== 'object') {
    return {
      valid: false,
      errors: [{ code: 'INVALID_GAME', message: 'Game definition must be an object' }],
      warnings: [],
    };
  }

  const parsed = GameDefinitionSchema.safeParse(game);
  if (!parsed.success) {
    return {
      valid: false,
      errors: parsed.error.issues.map((issue) => ({
        code: 'SCHEMA_VALIDATION_ERROR',
        message: issue.message,
        path: issue.path.join('.'),
      })),
      warnings: [],
    };
  }

  const parsedGame = game;

  validateMetadata(parsedGame, errors, warnings);
  validateWorld(parsedGame, errors, warnings);

  if (parsedGame.templates) {
    validateTemplates(parsedGame.templates, errors, warnings);
  }

  validateEntities(parsedGame, errors, warnings);
  validateRules(parsedGame, errors, warnings);
  validateWinLoseConditions(parsedGame, errors, warnings);
  validateSemantic(parsedGame, errors, warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function getValidationSummary(result: GameDefinitionValidationResult): string {
  if (result.valid && result.warnings.length === 0) {
    return 'Game definition is valid with no issues.';
  }

  const parts: string[] = [];

  if (!result.valid) {
    parts.push(`${result.errors.length} error(s):`);
    result.errors.forEach((e) => { parts.push(`  - ${e.message}`); });
  }

  if (result.warnings.length > 0) {
    parts.push(`${result.warnings.length} warning(s):`);
    result.warnings.forEach((w) => { parts.push(`  - ${w.message}`); });
  }

  return parts.join('\n');
}
