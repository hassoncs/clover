import type { GameDefinition } from '../types/GameDefinition';
import type { ValidationError, ValidationWarning } from './gameDefinitionValidator';

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

function validateConstantRefs(
  value: unknown,
  constants: Set<string>,
  errors: ValidationError[],
  path: string
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      validateConstantRefs(item, constants, errors, `${path}[${index}]`);
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
      validateConstantRefs(child, constants, errors, path ? `${path}.${key}` : key);
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

export function validateSemantic(
  game: GameDefinition,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  validateTemplateReferences(game, errors, warnings);
  detectTemplateCycles(game.templates ?? {}, errors);

  const constants = new Set(Object.keys(game.constants ?? {}));
  if (constants.size > 0) {
    validateConstantRefs(game, constants, errors, '');
  }
}
