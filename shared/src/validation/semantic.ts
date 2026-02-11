import type { GameDefinition } from '../types/GameDefinition';
import type { ValidationError, ValidationWarning } from './gameDefinitionTypes';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function collectTemplateRefs(children: unknown): string[] {
  if (!Array.isArray(children)) return [];
  const refs: string[] = [];
  for (const child of children) {
    if (!isRecord(child)) continue;
    if (typeof child.template === 'string') {
      refs.push(child.template);
    }
    refs.push(...collectTemplateRefs(child.children));
  }
  return refs;
}

function collectChildEntityRefs(children: unknown): string[] {
  if (!Array.isArray(children)) return [];
  const refs: string[] = [];
  for (const child of children) {
    if (!isRecord(child)) continue;
    if (typeof child.template === 'string') {
      refs.push(child.template);
    }
    refs.push(...collectChildEntityRefs(child.children));
  }
  return refs;
}

function collectBehaviorTemplateRefs(behaviors: unknown): string[] {
  if (!Array.isArray(behaviors)) return [];
  const refs: string[] = [];
  for (const behavior of behaviors) {
    if (!isRecord(behavior)) continue;
    if (behavior.type !== 'spawn_on_event') continue;
    const templates = behavior.entityTemplate;
    if (Array.isArray(templates)) {
      for (const template of templates) {
        if (typeof template === 'string') refs.push(template);
      }
    } else if (typeof templates === 'string') {
      refs.push(templates);
    }
  }
  return refs;
}

function collectRuleTemplateRefs(rules: unknown): string[] {
  if (!Array.isArray(rules)) return [];
  const refs: string[] = [];
  for (const rule of rules) {
    if (!isRecord(rule) || !Array.isArray(rule.actions)) continue;
    for (const action of rule.actions) {
      if (!isRecord(action) || action.type !== 'spawn') continue;
      const templates = action.template;
      if (Array.isArray(templates)) {
        for (const template of templates) {
          if (typeof template === 'string') refs.push(template);
        }
      } else if (typeof templates === 'string') {
        refs.push(templates);
      }
    }
  }
  return refs;
}

function detectTemplateCycles(
  templates: Record<string, unknown>,
  errors: ValidationError[]
): void {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const adjacency = new Map<string, string[]>();
  for (const [key, template] of Object.entries(templates)) {
    const children = isRecord(template) ? template.children : undefined;
    adjacency.set(key, collectTemplateRefs(children));
  }

  const visit = (key: string, stack: string[]) => {
    if (visiting.has(key)) {
      const cycle = [...stack, key].join(' -> ');
      errors.push({
        code: 'TEMPLATE_CYCLE',
        message: `Template cycle detected: ${cycle}`,
        path: `templates.${key}`,
      });
      return;
    }
    if (visited.has(key)) return;
    visiting.add(key);
    const neighbors = adjacency.get(key) ?? [];
    for (const neighbor of neighbors) {
      if (templates[neighbor]) {
        visit(neighbor, [...stack, key]);
      }
    }
    visiting.delete(key);
    visited.add(key);
  };

  for (const key of Object.keys(templates)) {
    visit(key, []);
  }
}

function walkConstantRefs(
  value: unknown,
  constants: Set<string>,
  errors: ValidationError[],
  path: string
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      walkConstantRefs(item, constants, errors, `${path}[${index}]`);
    });
    return;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.const === 'string') {
      if (!constants.has(record.const)) {
        errors.push({
          code: 'UNKNOWN_CONSTANT',
          message: `Unknown constant reference: ${record.const}`,
          path,
        });
      }
      return;
    }

    for (const [key, child] of Object.entries(record)) {
      walkConstantRefs(child, constants, errors, path ? `${path}.${key}` : key);
    }
  }
}

function validateTemplateReferences(
  game: GameDefinition,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  const templates = isRecord(game.templates) ? game.templates : {};
  const templateKeys = new Set(Object.keys(templates));

  const templateIdMap = new Map<string, string>();
  for (const [key, template] of Object.entries(templates)) {
    if (!isRecord(template) || typeof template.id !== 'string') continue;
    const existing = templateIdMap.get(template.id);
    if (existing) {
      errors.push({
        code: 'DUPLICATE_TEMPLATE_ID',
        message: `Duplicate template id '${template.id}' used by ${existing} and ${key}`,
        path: `templates.${key}.id`,
      });
    } else {
      templateIdMap.set(template.id, key);
    }

    const childRefs = collectTemplateRefs(template.children);
    for (const ref of childRefs) {
      if (!templateKeys.has(ref)) {
        errors.push({
          code: 'UNKNOWN_TEMPLATE_REFERENCE',
          message: `Template '${key}' references unknown child template '${ref}'`,
          path: `templates.${key}.children`,
        });
      }
    }

    const behaviorRefs = collectBehaviorTemplateRefs(template.behaviors);
    for (const ref of behaviorRefs) {
      if (!templateKeys.has(ref)) {
        warnings.push({
          code: 'UNKNOWN_TEMPLATE_REFERENCE',
          message: `Template '${key}' spawns unknown template '${ref}'`,
          path: `templates.${key}.behaviors`,
        });
      }
    }
  }

  if (Array.isArray(game.entities)) {
    for (const entity of game.entities) {
      if (!isRecord(entity)) continue;
      const entityId = typeof entity.id === 'string' ? entity.id : 'unknown';
      const childRefs = collectChildEntityRefs(entity.children);
    for (const ref of childRefs) {
      if (!templateKeys.has(ref)) {
        errors.push({
          code: 'UNKNOWN_TEMPLATE_REFERENCE',
          message: `Entity '${entityId}' references unknown child template '${ref}'`,
          path: `entities.${entityId}.children`,
        });
      }
    }

      const behaviorRefs = collectBehaviorTemplateRefs(entity.behaviors);
      for (const ref of behaviorRefs) {
        if (!templateKeys.has(ref)) {
          warnings.push({
            code: 'UNKNOWN_TEMPLATE_REFERENCE',
            message: `Entity '${entityId}' spawns unknown template '${ref}'`,
            path: `entities.${entityId}.behaviors`,
          });
        }
      }
    }
  }

  const ruleRefs = collectRuleTemplateRefs(game.rules);
  for (const ref of ruleRefs) {
    if (!templateKeys.has(ref)) {
      warnings.push({
        code: 'UNKNOWN_TEMPLATE_REFERENCE',
        message: `Rule spawns unknown template '${ref}'`,
        path: 'rules',
      });
    }
  }
}

export function validateEntityTemplateRefs(
  game: Partial<GameDefinition>,
  errors: ValidationError[]
): void {
  const templateIds = new Set(Object.keys(game.templates ?? {}));

  for (const entity of game.entities ?? []) {
    if (!isRecord(entity)) continue;
    const id = typeof entity.id === 'string' ? entity.id : 'unknown';
    if (typeof entity.template === 'string' && !templateIds.has(entity.template)) {
      errors.push({
        code: 'UNKNOWN_TEMPLATE',
        message: `Entity "${id}" references unknown template "${entity.template}"`,
        path: `entities.${id}.template`,
      });
    }
  }
}

function extractEntityIdFromTarget(target: unknown): string | undefined {
  if (!isRecord(target)) return undefined;
  if (target.type === 'by_id' && typeof target.entityId === 'string') return target.entityId;
  if (target.type === 'at_entity' && typeof target.entityId === 'string') return target.entityId;
  return undefined;
}

export function validateRuleEntityRefs(
  game: Partial<GameDefinition>,
  errors: ValidationError[]
): void {
  const entityIds = new Set<string>();
  for (const entity of game.entities ?? []) {
    if (isRecord(entity) && typeof entity.id === 'string') {
      entityIds.add(entity.id);
    }
  }
  const templateIds = new Set(Object.keys(game.templates ?? {}));

  if (!Array.isArray(game.rules)) return;

  for (const rule of game.rules) {
    if (!isRecord(rule) || !Array.isArray(rule.actions)) continue;
    const ruleId = typeof rule.id === 'string' ? rule.id : 'unknown';

    for (let i = 0; i < rule.actions.length; i++) {
      const action = rule.actions[i];
      if (!isRecord(action)) continue;
      const actionPath = `rules.${ruleId}.actions[${i}]`;

      if (action.type === 'spawn') {
        const posEntityId = extractEntityIdFromTarget(action.position);
        if (posEntityId && !entityIds.has(posEntityId)) {
          errors.push({
            code: 'UNKNOWN_ENTITY_REF',
            message: `Rule "${ruleId}" spawn action references unknown entity "${posEntityId}"`,
            path: `${actionPath}.position.entityId`,
          });
        }
        const templates = action.template;
        if (typeof templates === 'string' && !templateIds.has(templates)) {
          errors.push({
            code: 'UNKNOWN_TEMPLATE',
            message: `Rule "${ruleId}" spawn action references unknown template "${templates}"`,
            path: `${actionPath}.template`,
          });
        }
        if (Array.isArray(templates)) {
          for (const t of templates) {
            if (typeof t === 'string' && !templateIds.has(t)) {
              errors.push({
                code: 'UNKNOWN_TEMPLATE',
                message: `Rule "${ruleId}" spawn action references unknown template "${t}"`,
                path: `${actionPath}.template`,
              });
            }
          }
        }
      }

      if (action.type === 'destroy') {
        const targetId = extractEntityIdFromTarget(action.target);
        if (targetId && !entityIds.has(targetId)) {
          errors.push({
            code: 'UNKNOWN_ENTITY_REF',
            message: `Rule "${ruleId}" destroy action references unknown entity "${targetId}"`,
            path: `${actionPath}.target.entityId`,
          });
        }
      }

      if (action.type === 'modify') {
        const targetId = extractEntityIdFromTarget(action.target);
        if (targetId && !entityIds.has(targetId)) {
          errors.push({
            code: 'UNKNOWN_ENTITY_REF',
            message: `Rule "${ruleId}" modify action references unknown entity "${targetId}"`,
            path: `${actionPath}.target.entityId`,
          });
        }
      }

      for (const field of ['target', 'towardEntity']) {
        const fieldVal = (action as Record<string, unknown>)[field];
        if (!fieldVal) continue;
        const targetId = extractEntityIdFromTarget(fieldVal);
        if (targetId && !entityIds.has(targetId)) {
          errors.push({
            code: 'UNKNOWN_ENTITY_REF',
            message: `Rule "${ruleId}" action references unknown entity "${targetId}"`,
            path: `${actionPath}.${field}.entityId`,
          });
        }
      }

      const actionRecord = action as Record<string, unknown>;
      if (typeof actionRecord.sourceEntityId === 'string' && !entityIds.has(actionRecord.sourceEntityId)) {
        errors.push({
          code: 'UNKNOWN_ENTITY_REF',
          message: `Rule "${ruleId}" action references unknown sourceEntityId "${actionRecord.sourceEntityId}"`,
          path: `${actionPath}.sourceEntityId`,
        });
      }
    }
  }
}

export function validateParentChildCycles(
  game: Partial<GameDefinition>,
  errors: ValidationError[]
): void {
  const templates = (game.templates ?? {}) as Record<string, unknown>;

  const adjacency = new Map<string, string[]>();
  for (const [key, template] of Object.entries(templates)) {
    const children = isRecord(template) ? template.children : undefined;
    adjacency.set(key, collectTemplateRefs(children));
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (key: string, stack: string[]) => {
    if (visiting.has(key)) {
      const cycle = [...stack, key].join(' -> ');
      errors.push({
        code: 'PARENT_CHILD_CYCLE',
        message: `Parent/child cycle detected: ${cycle}`,
        path: `templates.${key}`,
      });
      return;
    }
    if (visited.has(key)) return;
    visiting.add(key);
    for (const neighbor of adjacency.get(key) ?? []) {
      if (adjacency.has(neighbor)) {
        visit(neighbor, [...stack, key]);
      }
    }
    visiting.delete(key);
    visited.add(key);
  };

  for (const key of adjacency.keys()) {
    visit(key, []);
  }
}

export function validateConstantRefs(
  game: Partial<GameDefinition>,
  constants: Record<string, unknown> | undefined,
  errors: ValidationError[]
): void {
  const constantNames = new Set(Object.keys(constants ?? {}));
  if (constantNames.size === 0) return;
  walkConstantRefs(game, constantNames, errors, '');
}

export function validateSemantic(
  game: GameDefinition,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  validateTemplateReferences(game, errors, warnings);
  detectTemplateCycles(game.templates ?? {}, errors);

  validateEntityTemplateRefs(game, errors);
  validateRuleEntityRefs(game, errors);
  validateParentChildCycles(game, errors);

  const constants = new Set(Object.keys(game.constants ?? {}));
  if (constants.size > 0) {
    walkConstantRefs(game, constants, errors, '');
  }
}
