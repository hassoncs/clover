import { validateShaders } from "./shaderLinter";
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
function collectPrefabRefs(children) {
    if (!Array.isArray(children))
        return [];
    const refs = [];
    for (const child of children) {
        if (!isRecord(child))
            continue;
        if (typeof child.prefab === "string") {
            refs.push(child.prefab);
        }
        refs.push(...collectPrefabRefs(child.children));
    }
    return refs;
}
function collectChildEntityRefs(children) {
    if (!Array.isArray(children))
        return [];
    const refs = [];
    for (const child of children) {
        if (!isRecord(child))
            continue;
        if (typeof child.prefab === "string") {
            refs.push(child.prefab);
        }
        refs.push(...collectChildEntityRefs(child.children));
    }
    return refs;
}
function detectPrefabCycles(prefabs, errors) {
    const visiting = new Set();
    const visited = new Set();
    const adjacency = new Map();
    for (const [key, prefab] of Object.entries(prefabs)) {
        const children = isRecord(prefab) ? prefab.children : undefined;
        adjacency.set(key, collectPrefabRefs(children));
    }
    const visit = (key, stack) => {
        if (visiting.has(key)) {
            const cycle = [...stack, key].join(" -> ");
            errors.push({
                code: "PREFAB_CYCLE",
                message: `Prefab cycle detected: ${cycle}`,
                path: `prefabs.${key}`,
            });
            return;
        }
        if (visited.has(key))
            return;
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
function walkConstantRefs(value, constants, errors, path) {
    if (Array.isArray(value)) {
        value.forEach((item, index) => {
            walkConstantRefs(item, constants, errors, `${path}[${index}]`);
        });
        return;
    }
    if (value && typeof value === "object") {
        const record = value;
        if (typeof record.const === "string") {
            if (!constants.has(record.const)) {
                errors.push({
                    code: "UNKNOWN_CONSTANT",
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
function validatePrefabReferences(game, errors, warnings) {
    const prefabs = isRecord(game.prefabs) ? game.prefabs : {};
    const prefabKeys = new Set(Object.keys(prefabs));
    const prefabIdMap = new Map();
    for (const [key, prefab] of Object.entries(prefabs)) {
        if (!isRecord(prefab) || typeof prefab.id !== "string")
            continue;
        const existing = prefabIdMap.get(prefab.id);
        if (existing) {
            errors.push({
                code: "DUPLICATE_PREFAB_ID",
                message: `Duplicate prefab id '${prefab.id}' used by ${existing} and ${key}`,
                path: `prefabs.${key}.id`,
            });
        }
        else {
            prefabIdMap.set(prefab.id, key);
        }
        const childRefs = collectPrefabRefs(prefab.children);
        for (const ref of childRefs) {
            if (!prefabKeys.has(ref)) {
                errors.push({
                    code: "UNKNOWN_PREFAB_REFERENCE",
                    message: `Prefab '${key}' references unknown child prefab '${ref}'`,
                    path: `prefabs.${key}.children`,
                });
            }
        }
    }
    if (Array.isArray(game.entities)) {
        for (const entity of game.entities) {
            if (!isRecord(entity))
                continue;
            const entityId = typeof entity.id === "string" ? entity.id : "unknown";
            const childRefs = collectChildEntityRefs(entity.children);
            for (const ref of childRefs) {
                if (!prefabKeys.has(ref)) {
                    errors.push({
                        code: "UNKNOWN_PREFAB_REFERENCE",
                        message: `Entity '${entityId}' references unknown child prefab '${ref}'`,
                        path: `entities.${entityId}.children`,
                    });
                }
            }
        }
    }
}
export function validateEntityPrefabRefs(game, errors) {
    const prefabIds = new Set(Object.keys(game.prefabs ?? {}));
    for (const entity of game.entities ?? []) {
        if (!isRecord(entity))
            continue;
        const id = typeof entity.id === "string" ? entity.id : "unknown";
        if (typeof entity.prefab === "string" && !prefabIds.has(entity.prefab)) {
            errors.push({
                code: "UNKNOWN_PREFAB",
                message: `Entity "${id}" references unknown prefab "${entity.prefab}"`,
                path: `entities.${id}.prefab`,
            });
        }
    }
}
function extractEntityIdFromTarget(target) {
    if (!isRecord(target))
        return undefined;
    if (target.type === "by_id" && typeof target.entityId === "string")
        return target.entityId;
    if (target.type === "at_entity" && typeof target.entityId === "string")
        return target.entityId;
    return undefined;
}
export function validateRuleEntityRefs(_game, _errors) { }
export function validateParentChildCycles(game, errors) {
    const prefabs = (game.prefabs ?? {});
    const adjacency = new Map();
    for (const [key, prefab] of Object.entries(prefabs)) {
        const children = isRecord(prefab) ? prefab.children : undefined;
        adjacency.set(key, collectPrefabRefs(children));
    }
    const visiting = new Set();
    const visited = new Set();
    const visit = (key, stack) => {
        if (visiting.has(key)) {
            const cycle = [...stack, key].join(" -> ");
            errors.push({
                code: "PARENT_CHILD_CYCLE",
                message: `Parent/child cycle detected: ${cycle}`,
                path: `prefabs.${key}`,
            });
            return;
        }
        if (visited.has(key))
            return;
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
export function validateConstantRefs(game, constants, errors) {
    const constantNames = new Set(Object.keys(constants ?? {}));
    if (constantNames.size === 0)
        return;
    walkConstantRefs(game, constantNames, errors, "");
}
export function validateSemantic(game, errors, warnings) {
    validatePrefabReferences(game, errors, warnings);
    detectPrefabCycles(game.prefabs ?? {}, errors);
    validateEntityPrefabRefs(game, errors);
    validateRuleEntityRefs(game, errors);
    validateParentChildCycles(game, errors);
    const constants = new Set(Object.keys(game.constants ?? {}));
    if (constants.size > 0) {
        walkConstantRefs(game, constants, errors, "");
    }
    validateShaders(game, errors, warnings);
}
//# sourceMappingURL=semantic.js.map