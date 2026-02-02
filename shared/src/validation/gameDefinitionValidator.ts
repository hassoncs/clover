import type { GameDefinition } from '../types/GameDefinition'
import type { GameEntity, EntityTemplate } from '../types/entity'
import type { Behavior, BehaviorType } from '../types/behavior'
import type { GameRule } from '../types/rules'

export interface GameDefinitionValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  path?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  path?: string;
}

const VALID_BEHAVIOR_TYPES: BehaviorType[] = [
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
  physics: GameEntity['physics'],
  entityId: string,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!physics) return;

  if (!VALID_BODY_TYPES.includes(physics.bodyType)) {
    errors.push({
      code: 'INVALID_BODY_TYPE',
      message: `Entity ${entityId} has invalid bodyType: ${physics.bodyType}`,
      path: `entities.${entityId}.physics.bodyType`,
    });
  }

  // Validate density if provided
  if (physics.density !== undefined) {
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
  collider: GameEntity['collider'],
  entityId: string,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!collider) return;

  if (!VALID_SHAPES.includes(collider.shape)) {
    errors.push({
      code: 'INVALID_SHAPE',
      message: `Entity ${entityId} has invalid shape: ${collider.shape}`,
      path: `entities.${entityId}.collider.shape`,
    });
  }

  if (collider.shape === 'box') {
    const box = collider as { width?: number; height?: number };
    if (box.width === undefined || box.width <= 0) {
      errors.push({
        code: 'INVALID_BOX_WIDTH',
        message: `Entity ${entityId} box collider must have positive width`,
        path: `entities.${entityId}.collider.width`,
      });
    }
    if (box.height === undefined || box.height <= 0) {
      errors.push({
        code: 'INVALID_BOX_HEIGHT',
        message: `Entity ${entityId} box collider must have positive height`,
        path: `entities.${entityId}.collider.height`,
      });
    }
  }

  if (collider.shape === 'circle') {
    const circle = collider as { radius?: number };
    if (circle.radius === undefined || circle.radius <= 0) {
      errors.push({
        code: 'INVALID_CIRCLE_RADIUS',
        message: `Entity ${entityId} circle collider must have positive radius`,
        path: `entities.${entityId}.collider.radius`,
      });
    }
  }

  if (collider.restitution !== undefined && collider.restitution < 0) {
    errors.push({
      code: 'NEGATIVE_RESTITUTION',
      message: `Entity ${entityId} has negative restitution`,
      path: `entities.${entityId}.collider.restitution`,
    });
  }

  if (collider.friction !== undefined && (collider.friction < 0 || collider.friction > 1)) {
    warnings.push({
      code: 'FRICTION_OUT_OF_RANGE',
      message: `Entity ${entityId} has friction out of range (0-1)`,
      path: `entities.${entityId}.collider.friction`,
    });
  }
}

function validateVisualComponent(
  visual: GameEntity['visual'],
  entityId: string,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!visual) return;

  if (!VALID_VISUAL_TYPES.includes(visual.type)) {
    errors.push({
      code: 'INVALID_VISUAL_TYPE',
      message: `Entity ${entityId} has invalid visual type: ${visual.type}`,
      path: `entities.${entityId}.visual.type`,
    });
  }

  if (visual.type === 'rect') {
    const rectVisual = visual as { width?: number; height?: number };
    if (!rectVisual.width || rectVisual.width <= 0) {
      errors.push({
        code: 'INVALID_RECT_WIDTH',
        message: `Entity ${entityId} rect visual must have positive width`,
        path: `entities.${entityId}.visual.width`,
      });
    }
    if (!rectVisual.height || rectVisual.height <= 0) {
      errors.push({
        code: 'INVALID_RECT_HEIGHT',
        message: `Entity ${entityId} rect visual must have positive height`,
        path: `entities.${entityId}.visual.height`,
      });
    }
  }

  if (visual.type === 'circle') {
    const circleVisual = visual as { radius?: number };
    if (!circleVisual.radius || circleVisual.radius <= 0) {
      errors.push({
        code: 'INVALID_VISUAL_RADIUS',
        message: `Entity ${entityId} circle visual must have positive radius`,
        path: `entities.${entityId}.visual.radius`,
      });
    }
  }
}

function validateBehavior(
  behavior: Behavior,
  entityId: string,
  index: number,
  templates: Record<string, EntityTemplate>,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!VALID_BEHAVIOR_TYPES.includes(behavior.type)) {
    errors.push({
      code: 'INVALID_BEHAVIOR_TYPE',
      message: `Entity ${entityId} behavior ${index} has invalid type: ${behavior.type}`,
      path: `entities.${entityId}.behaviors[${index}].type`,
    });
    return;
  }

  if (behavior.type === 'spawn_on_event') {
    const spawnBehavior = behavior as { entityTemplate?: string };
    if (!spawnBehavior.entityTemplate) {
      errors.push({
        code: 'MISSING_SPAWN_TEMPLATE',
        message: `Entity ${entityId} spawn_on_event behavior missing entityTemplate`,
        path: `entities.${entityId}.behaviors[${index}].entityTemplate`,
      });
    } else if (!templates[spawnBehavior.entityTemplate]) {
      warnings.push({
        code: 'UNKNOWN_SPAWN_TEMPLATE',
        message: `Entity ${entityId} references unknown template: ${spawnBehavior.entityTemplate}`,
        path: `entities.${entityId}.behaviors[${index}].entityTemplate`,
      });
    }
  }

  if (behavior.type === 'destroy_on_collision' || behavior.type === 'score_on_collision') {
    const collisionBehavior = behavior as { withTags?: string[] };
    if (!collisionBehavior.withTags || collisionBehavior.withTags.length === 0) {
      warnings.push({
        code: 'EMPTY_COLLISION_TAGS',
        message: `Entity ${entityId} ${behavior.type} behavior has no tags specified`,
        path: `entities.${entityId}.behaviors[${index}].withTags`,
      });
    }
  }
}

function validateEntity(
  entity: GameEntity,
  templates: Record<string, EntityTemplate>,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!entity.id) {
    errors.push({
      code: 'MISSING_ENTITY_ID',
      message: 'Entity must have an ID',
      path: 'entities',
    });
    return;
  }

  if (!entity.transform) {
    errors.push({
      code: 'MISSING_TRANSFORM',
      message: `Entity ${entity.id} must have a transform`,
      path: `entities.${entity.id}.transform`,
    });
  } else {
    if (typeof entity.transform.x !== 'number' || typeof entity.transform.y !== 'number') {
      errors.push({
        code: 'INVALID_TRANSFORM',
        message: `Entity ${entity.id} transform must have numeric x and y`,
        path: `entities.${entity.id}.transform`,
      });
    }
  }

  if (entity.template && !templates[entity.template]) {
    errors.push({
      code: 'UNKNOWN_TEMPLATE',
      message: `Entity ${entity.id} references unknown template: ${entity.template}`,
      path: `entities.${entity.id}.template`,
    });
  }

  validatePhysicsComponent(entity.physics, entity.id, errors, warnings);
  validateColliderComponent(entity.collider, entity.id, errors, warnings);
  validateVisualComponent(entity.visual, entity.id, errors, warnings);

  if (entity.behaviors) {
    entity.behaviors.forEach((behavior, index) => {
      validateBehavior(behavior, entity.id, index, templates, errors, warnings);
    });
  }
}

function validateTemplates(
  templates: Record<string, EntityTemplate>,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  for (const [templateId, template] of Object.entries(templates)) {
    if (!template.id) {
      errors.push({
        code: 'MISSING_TEMPLATE_ID',
        message: `Template ${templateId} must have an ID`,
        path: `templates.${templateId}.id`,
      });
    }

    if (template.physics) {
      validatePhysicsComponent(template.physics, `template:${templateId}`, errors, warnings);
    }

    if (template.collider) {
      validateColliderComponent(template.collider, `template:${templateId}`, errors, warnings);
    }

    if (template.visual) {
      validateVisualComponent(template.visual, `template:${templateId}`, errors, warnings);
    }

    if (template.behaviors) {
      template.behaviors.forEach((behavior, index) => {
        validateBehavior(behavior, `template:${templateId}`, index, templates, errors, warnings);
      });
    }
  }
}

function validateEntities(
  game: GameDefinition,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!game.entities || !Array.isArray(game.entities)) {
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
  for (const entity of game.entities) {
    if (entity.id && entityIds.has(entity.id)) {
      errors.push({
        code: 'DUPLICATE_ENTITY_ID',
        message: `Duplicate entity ID: ${entity.id}`,
        path: `entities.${entity.id}`,
      });
    }
    entityIds.add(entity.id);

    validateEntity(entity, game.templates || {}, errors, warnings);
  }

  const hasInputRule = game.rules?.some(
    (rule) =>
      rule.trigger.type === 'tap' ||
      rule.trigger.type === 'drag' ||
      rule.trigger.type === 'tilt' ||
      rule.trigger.type === 'button' ||
      rule.trigger.type === 'swipe'
  );

  const hasLegacyDraggable = game.entities.some(
    (entity) =>
      entity.behaviors?.some((b) => b.type === 'draggable') ||
      (entity.template &&
        game.templates?.[entity.template]?.behaviors?.some((b) => b.type === 'draggable'))
  );

  if (!hasInputRule && !hasLegacyDraggable) {
    errors.push({
      code: 'NO_PLAYER_CONTROL',
      message: 'Game must have at least one Rule with an input trigger (tap, drag, tilt, button, swipe) or a draggable behavior.',
      path: 'rules',
    });
  }
}

function validateRule(
  rule: GameRule,
  game: GameDefinition,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!rule.id) {
    errors.push({
      code: 'MISSING_RULE_ID',
      message: 'Rule must have an ID',
      path: 'rules',
    });
    return;
  }

  if (!rule.trigger) {
    errors.push({
      code: 'MISSING_RULE_TRIGGER',
      message: `Rule ${rule.id} must have a trigger`,
      path: `rules.${rule.id}.trigger`,
    });
  }

  if (!rule.actions || rule.actions.length === 0) {
    warnings.push({
      code: 'NO_RULE_ACTIONS',
      message: `Rule ${rule.id} has no actions`,
      path: `rules.${rule.id}.actions`,
    });
  }

  if (rule.trigger?.type === 'collision') {
    const collisionTrigger = rule.trigger as { entityATag?: string; entityBTag?: string };
    const allTags = new Set<string>();

    game.entities?.forEach((entity) => {
      entity.tags?.forEach((tag) => { allTags.add(tag); });
      if (entity.template && game.templates?.[entity.template]?.tags) {
        game.templates[entity.template].tags?.forEach((tag) => { allTags.add(tag); });
      }
    });

    Object.values(game.templates || {}).forEach((template) => {
      template.tags?.forEach((tag) => { allTags.add(tag); });
    });

    if (collisionTrigger.entityATag && !allTags.has(collisionTrigger.entityATag)) {
      warnings.push({
        code: 'UNKNOWN_TAG_IN_RULE',
        message: `Rule ${rule.id} references unknown tag: ${collisionTrigger.entityATag}`,
        path: `rules.${rule.id}.trigger.entityATag`,
      });
    }

    if (collisionTrigger.entityBTag && !allTags.has(collisionTrigger.entityBTag)) {
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
  if (!game.rules) return;

  game.rules.forEach((rule) => {
    validateRule(rule, game, errors, warnings);
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

  validateMetadata(game, errors, warnings);
  validateWorld(game, errors, warnings);

  if (game.templates) {
    validateTemplates(game.templates, errors, warnings);
  }

  validateEntities(game, errors, warnings);
  validateRules(game, errors, warnings);
  validateWinLoseConditions(game, errors, warnings);

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
