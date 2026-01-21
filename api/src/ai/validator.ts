import type { GameDefinition } from '../../../shared/src/types/GameDefinition';
import type { GameEntity, EntityTemplate } from '../../../shared/src/types/entity';
import type { Behavior, BehaviorType } from '../../../shared/src/types/behavior';
import type { GameRule } from '../../../shared/src/types/rules';

export interface ValidationResult {
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
  'follow',
  'bounce',
  'control',
  'spawn_on_event',
  'destroy_on_collision',
  'score_on_collision',
  'timer',
  'animate',
  'oscillate',
  'gravity_zone',
  'magnetic',
];

const VALID_CONTROL_TYPES = [
  'tap_to_jump',
  'tap_to_shoot',
  'tap_to_flip',
  'drag_to_aim',
  'drag_to_move',
  'tilt_to_move',
  'tilt_gravity',
  'buttons',
];

const VALID_BODY_TYPES = ['static', 'dynamic', 'kinematic'];
const VALID_SHAPES = ['box', 'circle', 'polygon'];
const VALID_SPRITE_TYPES = ['rect', 'circle', 'polygon', 'image'];

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
  physics: GameDefinition['entities'][0]['physics'],
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

  if (!VALID_SHAPES.includes(physics.shape)) {
    errors.push({
      code: 'INVALID_SHAPE',
      message: `Entity ${entityId} has invalid physics shape: ${physics.shape}`,
      path: `entities.${entityId}.physics.shape`,
    });
  }

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

  if (physics.friction < 0 || physics.friction > 1) {
    warnings.push({
      code: 'FRICTION_OUT_OF_RANGE',
      message: `Entity ${entityId} friction should be between 0 and 1`,
      path: `entities.${entityId}.physics.friction`,
    });
  }

  if (physics.restitution < 0) {
    errors.push({
      code: 'NEGATIVE_RESTITUTION',
      message: `Entity ${entityId} has negative restitution`,
      path: `entities.${entityId}.physics.restitution`,
    });
  }

  if (physics.restitution > 1) {
    warnings.push({
      code: 'HIGH_RESTITUTION',
      message: `Entity ${entityId} restitution > 1 may cause instability`,
      path: `entities.${entityId}.physics.restitution`,
    });
  }

  if (physics.shape === 'box') {
    const boxPhysics = physics as { width?: number; height?: number };
    if (!boxPhysics.width || boxPhysics.width <= 0) {
      errors.push({
        code: 'INVALID_BOX_WIDTH',
        message: `Entity ${entityId} box physics must have positive width`,
        path: `entities.${entityId}.physics.width`,
      });
    }
    if (!boxPhysics.height || boxPhysics.height <= 0) {
      errors.push({
        code: 'INVALID_BOX_HEIGHT',
        message: `Entity ${entityId} box physics must have positive height`,
        path: `entities.${entityId}.physics.height`,
      });
    }
  }

  if (physics.shape === 'circle') {
    const circlePhysics = physics as { radius?: number };
    if (!circlePhysics.radius || circlePhysics.radius <= 0) {
      errors.push({
        code: 'INVALID_CIRCLE_RADIUS',
        message: `Entity ${entityId} circle physics must have positive radius`,
        path: `entities.${entityId}.physics.radius`,
      });
    }
  }
}

function validateSpriteComponent(
  sprite: GameDefinition['entities'][0]['sprite'],
  entityId: string,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!sprite) return;

  if (!VALID_SPRITE_TYPES.includes(sprite.type)) {
    errors.push({
      code: 'INVALID_SPRITE_TYPE',
      message: `Entity ${entityId} has invalid sprite type: ${sprite.type}`,
      path: `entities.${entityId}.sprite.type`,
    });
  }

  if (sprite.type === 'rect') {
    const rectSprite = sprite as { width?: number; height?: number };
    if (!rectSprite.width || rectSprite.width <= 0) {
      errors.push({
        code: 'INVALID_RECT_WIDTH',
        message: `Entity ${entityId} rect sprite must have positive width`,
        path: `entities.${entityId}.sprite.width`,
      });
    }
    if (!rectSprite.height || rectSprite.height <= 0) {
      errors.push({
        code: 'INVALID_RECT_HEIGHT',
        message: `Entity ${entityId} rect sprite must have positive height`,
        path: `entities.${entityId}.sprite.height`,
      });
    }
  }

  if (sprite.type === 'circle') {
    const circleSprite = sprite as { radius?: number };
    if (!circleSprite.radius || circleSprite.radius <= 0) {
      errors.push({
        code: 'INVALID_SPRITE_RADIUS',
        message: `Entity ${entityId} circle sprite must have positive radius`,
        path: `entities.${entityId}.sprite.radius`,
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

  if (behavior.type === 'control') {
    const controlBehavior = behavior as { controlType?: string };
    if (!VALID_CONTROL_TYPES.includes(controlBehavior.controlType || '')) {
      errors.push({
        code: 'INVALID_CONTROL_TYPE',
        message: `Entity ${entityId} has invalid controlType: ${controlBehavior.controlType}`,
        path: `entities.${entityId}.behaviors[${index}].controlType`,
      });
    }
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
  validateSpriteComponent(entity.sprite, entity.id, errors, warnings);

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

    if (template.sprite) {
      validateSpriteComponent(template.sprite, `template:${templateId}`, errors, warnings);
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

  const hasControlBehavior = game.entities.some(
    (entity) =>
      entity.behaviors?.some((b) => b.type === 'control') ||
      (entity.template &&
        game.templates?.[entity.template]?.behaviors?.some((b) => b.type === 'control'))
  );

  if (!hasControlBehavior) {
    warnings.push({
      code: 'NO_PLAYER_CONTROL',
      message: 'No entity has a control behavior - game may not be interactive',
      path: 'entities',
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
      entity.tags?.forEach((tag) => allTags.add(tag));
      if (entity.template && game.templates?.[entity.template]?.tags) {
        game.templates[entity.template].tags?.forEach((tag) => allTags.add(tag));
      }
    });

    Object.values(game.templates || {}).forEach((template) => {
      template.tags?.forEach((tag) => allTags.add(tag));
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
  if (!game.winCondition) {
    warnings.push({
      code: 'NO_WIN_CONDITION',
      message: 'Game has no win condition - it may never end',
      path: 'winCondition',
    });
  }

  if (!game.loseCondition) {
    warnings.push({
      code: 'NO_LOSE_CONDITION',
      message: 'Game has no lose condition',
      path: 'loseCondition',
    });
  }

  if (game.winCondition?.type === 'destroy_all' && game.winCondition.tag) {
    const hasTaggedEntity = game.entities?.some(
      (entity) =>
        entity.tags?.includes(game.winCondition!.tag!) ||
        (entity.template &&
          game.templates?.[entity.template]?.tags?.includes(game.winCondition!.tag!))
    );

    if (!hasTaggedEntity) {
      warnings.push({
        code: 'WIN_CONDITION_TAG_NOT_FOUND',
        message: `Win condition references tag "${game.winCondition.tag}" but no entities have it`,
        path: 'winCondition.tag',
      });
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
      warnings.push({
        code: 'LOSE_CONDITION_TAG_NOT_FOUND',
        message: `Lose condition references tag "${game.loseCondition.tag}" but no entities have it`,
        path: 'loseCondition.tag',
      });
    }
  }
}

export function validateGameDefinition(game: GameDefinition): ValidationResult {
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

export function getValidationSummary(result: ValidationResult): string {
  if (result.valid && result.warnings.length === 0) {
    return 'Game definition is valid with no issues.';
  }

  const parts: string[] = [];

  if (!result.valid) {
    parts.push(`${result.errors.length} error(s):`);
    result.errors.forEach((e) => parts.push(`  - ${e.message}`));
  }

  if (result.warnings.length > 0) {
    parts.push(`${result.warnings.length} warning(s):`);
    result.warnings.forEach((w) => parts.push(`  - ${w.message}`));
  }

  return parts.join('\n');
}
