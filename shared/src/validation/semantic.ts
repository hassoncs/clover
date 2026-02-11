import type { GameDefinition } from '../types/GameDefinition';
import type { ValidationError, ValidationWarning } from './gameDefinitionTypes';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function collectPrefabRefs(children: unknown): string[] {
  if (!Array.isArray(children)) return [];
  const refs: string[] = [];
  for (const child of children) {
    if (!isRecord(child)) continue;
    if (typeof child.prefab === 'string') {
      refs.push(child.prefab);
    }
    refs.push(...collectPrefabRefs(child.children));
  }
  return refs;
}

function collectChildEntityRefs(children: unknown): string[] {
  if (!Array.isArray(children)) return [];
  const refs: string[] = [];
  for (const child of children) {
    if (!isRecord(child)) continue;
    if (typeof child.prefab === 'string') {
      refs.push(child.prefab);
    }
    refs.push(...collectChildEntityRefs(child.children));
  }
  return refs;
}

function collectBehaviorPrefabRefs(behaviors: unknown): string[] {
  if (!Array.isArray(behaviors)) return [];
  const refs: string[] = [];
  for (const behavior of behaviors) {
    if (!isRecord(behavior)) continue;
    if (behavior.type !== 'spawn_on_event') continue;
    const prefabs = behavior.entityTemplate;
    if (Array.isArray(prefabs)) {
      for (const prefab of prefabs) {
        if (typeof prefab === 'string') refs.push(prefab);
      }
    } else if (typeof prefabs === 'string') {
      refs.push(prefabs);
    }
  }
  return refs;
}

function collectRulePrefabRefs(rules: unknown): string[] {
  if (!Array.isArray(rules)) return [];
  const refs: string[] = [];
  for (const rule of rules) {
    if (!isRecord(rule) || !Array.isArray(rule.actions)) continue;
    for (const action of rule.actions) {
      if (!isRecord(action) || action.type !== 'spawn') continue;
      const prefabs = action.prefab;
      if (Array.isArray(prefabs)) {
        for (const prefab of prefabs) {
          if (typeof prefab === 'string') refs.push(prefab);
        }
      } else if (typeof prefabs === 'string') {
        refs.push(prefabs);
      }
    }
  }
  return refs;
}

function detectPrefabCycles(
  prefabs: Record<string, unknown>,
  errors: ValidationError[]
): void {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const adjacency = new Map<string, string[]>();
  for (const [key, prefab] of Object.entries(prefabs)) {
    const children = isRecord(prefab) ? prefab.children : undefined;
    adjacency.set(key, collectPrefabRefs(children));
  }

  const visit = (key: string, stack: string[]) => {
    if (visiting.has(key)) {
      const cycle = [...stack, key].join(' -> ');
      errors.push({
        code: 'PREFAB_CYCLE',
        message: `Prefab cycle detected: ${cycle}`,
        path: `prefabs.${key}`,
      });
      return;
    }
    if (visited.has(key)) return;
    visiting.add(key);
    const neighbors = adjacency.get(key) ?? [];
    for (const neighbor of neighbors) {
      if (prefabs[neighbor]) {
        visit(neighbor, [...stack, key]);
      }
    }
    visiting.delete(key);
    visited.add(key);
  };

  for (const key of Object.keys(prefabs)) {
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

function validatePrefabReferences(
  game: GameDefinition,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  const prefabs = isRecord(game.prefabs) ? game.prefabs : {};
  const prefabKeys = new Set(Object.keys(prefabs));

  const prefabIdMap = new Map<string, string>();
  for (const [key, prefab] of Object.entries(prefabs)) {
    if (!isRecord(prefab) || typeof prefab.id !== 'string') continue;
    const existing = prefabIdMap.get(prefab.id);
    if (existing) {
      errors.push({
        code: 'DUPLICATE_PREFAB_ID',
        message: `Duplicate prefab id '${prefab.id}' used by ${existing} and ${key}`,
        path: `prefabs.${key}.id`,
      });
    } else {
      prefabIdMap.set(prefab.id, key);
    }

    const childRefs = collectPrefabRefs(prefab.children);
    for (const ref of childRefs) {
      if (!prefabKeys.has(ref)) {
        errors.push({
          code: 'UNKNOWN_PREFAB_REFERENCE',
          message: `Prefab '${key}' references unknown child prefab '${ref}'`,
          path: `prefabs.${key}.children`,
        });
      }
    }

    const behaviorRefs = collectBehaviorPrefabRefs(prefab.behaviors);
    for (const ref of behaviorRefs) {
      if (!prefabKeys.has(ref)) {
        warnings.push({
          code: 'UNKNOWN_PREFAB_REFERENCE',
          message: `Prefab '${key}' spawns unknown prefab '${ref}'`,
          path: `prefabs.${key}.behaviors`,
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
      if (!prefabKeys.has(ref)) {
        errors.push({
          code: 'UNKNOWN_PREFAB_REFERENCE',
          message: `Entity '${entityId}' references unknown child prefab '${ref}'`,
          path: `entities.${entityId}.children`,
        });
      }
    }

      const behaviorRefs = collectBehaviorPrefabRefs(entity.behaviors);
      for (const ref of behaviorRefs) {
        if (!prefabKeys.has(ref)) {
          warnings.push({
            code: 'UNKNOWN_PREFAB_REFERENCE',
            message: `Entity '${entityId}' spawns unknown prefab '${ref}'`,
            path: `entities.${entityId}.behaviors`,
          });
        }
      }
    }
  }

  const ruleRefs = collectRulePrefabRefs(game.rules);
  for (const ref of ruleRefs) {
    if (!prefabKeys.has(ref)) {
      warnings.push({
        code: 'UNKNOWN_PREFAB_REFERENCE',
        message: `Rule spawns unknown prefab '${ref}'`,
        path: 'rules',
      });
    }
  }
}

export function validateEntityPrefabRefs(
  game: Partial<GameDefinition>,
  errors: ValidationError[]
): void {
  const prefabIds = new Set(Object.keys(game.prefabs ?? {}));

  for (const entity of game.entities ?? []) {
    if (!isRecord(entity)) continue;
    const id = typeof entity.id === 'string' ? entity.id : 'unknown';
    if (typeof entity.prefab === 'string' && !prefabIds.has(entity.prefab)) {
      errors.push({
        code: 'UNKNOWN_PREFAB',
        message: `Entity "${id}" references unknown prefab "${entity.prefab}"`,
        path: `entities.${id}.prefab`,
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
  const prefabIds = new Set(Object.keys(game.prefabs ?? {}));

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
        const prefabs = action.prefab;
        if (typeof prefabs === 'string' && !prefabIds.has(prefabs)) {
          errors.push({
            code: 'UNKNOWN_PREFAB',
            message: `Rule "${ruleId}" spawn action references unknown prefab "${prefabs}"`,
            path: `${actionPath}.prefab`,
          });
        }
        if (Array.isArray(prefabs)) {
          for (const t of prefabs) {
            if (typeof t === 'string' && !prefabIds.has(t)) {
              errors.push({
                code: 'UNKNOWN_PREFAB',
                message: `Rule "${ruleId}" spawn action references unknown prefab "${t}"`,
                path: `${actionPath}.prefab`,
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
  const prefabs = (game.prefabs ?? {}) as Record<string, unknown>;

  const adjacency = new Map<string, string[]>();
  for (const [key, prefab] of Object.entries(prefabs)) {
    const children = isRecord(prefab) ? prefab.children : undefined;
    adjacency.set(key, collectPrefabRefs(children));
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (key: string, stack: string[]) => {
    if (visiting.has(key)) {
      const cycle = [...stack, key].join(' -> ');
      errors.push({
        code: 'PARENT_CHILD_CYCLE',
        message: `Parent/child cycle detected: ${cycle}`,
        path: `prefabs.${key}`,
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
  validatePrefabReferences(game, errors, warnings);
  detectPrefabCycles(game.prefabs ?? {}, errors);

  validateEntityPrefabRefs(game, errors);
  validateRuleEntityRefs(game, errors);
  validateParentChildCycles(game, errors);

  const constants = new Set(Object.keys(game.constants ?? {}));
  if (constants.size > 0) {
    walkConstantRefs(game, constants, errors, '');
  }
}
