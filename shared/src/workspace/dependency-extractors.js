export function extractPrefabDeps(content) {
    const deps = [];
    try {
        const parsed = JSON.parse(content);
        if (parsed.visual?.url && typeof parsed.visual.url === "string") {
            deps.push(parsed.visual.url);
        }
        if (Array.isArray(parsed.children)) {
            for (const child of parsed.children) {
                if (typeof child?.prefab === "string") {
                    deps.push(`prefabs/${child.prefab}.json`);
                }
            }
        }
    }
    catch { }
    return deps;
}
export function extractEntityDeps(content) {
    const deps = [];
    try {
        const parsed = JSON.parse(content);
        const entities = Array.isArray(parsed) ? parsed : [];
        for (const entity of entities) {
            if (typeof entity?.prefab === "string") {
                deps.push(`prefabs/${entity.prefab}.json`);
            }
        }
    }
    catch { }
    return deps;
}
export function extractEffectGraphDeps(content) {
    const deps = [];
    try {
        const parsed = JSON.parse(content);
        const nodes = Array.isArray(parsed.nodes) ? parsed.nodes : [];
        for (const node of nodes) {
            if (typeof node?.type === "string" && node.type.startsWith("custom:")) {
                deps.push(node.type.slice("custom:".length));
            }
        }
    }
    catch { }
    return deps;
}
export function extractDepsForPath(path, content) {
    if (path.startsWith("prefabs/") && path.endsWith(".json")) {
        return extractPrefabDeps(content);
    }
    if (path === "entities.json" ||
        /^scenes\/[^/]+\/entities\.json$/.test(path)) {
        return extractEntityDeps(content);
    }
    if (path.startsWith("effects/") && path.endsWith(".json")) {
        return extractEffectGraphDeps(content);
    }
    return [];
}
//# sourceMappingURL=dependency-extractors.js.map