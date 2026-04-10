export function buildPreviewDefinition(baseDefinition, context) {
    if (context.mode === "scene") {
        return applyContextOverrides(baseDefinition, context);
    }
    if (context.mode === "prefab") {
        if (!context.prefabId) {
            throw new Error("prefabId required for prefab preview mode");
        }
        const prefab = baseDefinition.prefabs[context.prefabId];
        if (!prefab) {
            throw new Error(`Prefab not found: ${context.prefabId}`);
        }
        const syntheticDefinition = {
            metadata: {
                id: `preview-${context.id}`,
                title: context.label,
                version: "1.0.0",
            },
            world: baseDefinition.world,
            presentation: baseDefinition.presentation,
            camera: baseDefinition.camera,
            background: {
                type: "static",
                color: "#1a1a1a",
            },
            prefabs: {
                [context.prefabId]: prefab,
            },
            entities: [
                {
                    id: `preview-entity-${context.prefabId}`,
                    name: context.label,
                    prefab: context.prefabId,
                    transform: {
                        x: 0,
                        y: 0,
                        angle: 0,
                        scaleX: 1,
                        scaleY: 1,
                    },
                },
            ],
            variables: baseDefinition.variables,
        };
        return applyContextOverrides(syntheticDefinition, context);
    }
    throw new Error(`Unknown preview mode: ${context.mode}`);
}
function applyContextOverrides(definition, context) {
    const result = { ...definition };
    if (context.variableOverrides && result.variables) {
        result.variables = { ...result.variables };
        for (const [key, overrideValue] of Object.entries(context.variableOverrides)) {
            if (key in result.variables) {
                const existing = result.variables[key];
                if (typeof existing === "object" &&
                    existing !== null &&
                    "value" in existing) {
                    result.variables[key] = {
                        ...existing,
                        value: overrideValue,
                    };
                }
                else {
                    result.variables[key] = overrideValue;
                }
            }
        }
    }
    return result;
}
//# sourceMappingURL=buildPreviewDefinition.js.map