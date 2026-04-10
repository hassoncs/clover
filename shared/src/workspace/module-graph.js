export class WorkspaceModuleGraph {
    nodes = new Map();
    upsertNode(path, tagHints) {
        const existing = this.nodes.get(path);
        if (existing) {
            existing.tagHints = tagHints;
        }
        else {
            this.nodes.set(path, {
                path,
                deps: new Set(),
                importers: new Set(),
                tagHints,
            });
        }
    }
    setDeps(path, deps) {
        let node = this.nodes.get(path);
        if (!node) {
            node = { path, deps: new Set(), importers: new Set(), tagHints: [] };
            this.nodes.set(path, node);
        }
        for (const oldDep of node.deps) {
            const depNode = this.nodes.get(oldDep);
            if (depNode) {
                depNode.importers.delete(path);
            }
        }
        node.deps = new Set(deps);
        for (const dep of deps) {
            let depNode = this.nodes.get(dep);
            if (!depNode) {
                depNode = {
                    path: dep,
                    deps: new Set(),
                    importers: new Set(),
                    tagHints: [],
                };
                this.nodes.set(dep, depNode);
            }
            depNode.importers.add(path);
        }
    }
    getNode(path) {
        return this.nodes.get(path);
    }
    invalidate(changedPaths) {
        const visited = new Set();
        const queue = [...changedPaths];
        const tagSet = new Set();
        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current))
                continue;
            visited.add(current);
            const node = this.nodes.get(current);
            if (node) {
                for (const tag of node.tagHints) {
                    tagSet.add(tag);
                }
                for (const importer of node.importers) {
                    if (!visited.has(importer)) {
                        queue.push(importer);
                    }
                }
            }
        }
        const affectedPaths = [...visited].filter((p) => !changedPaths.includes(p));
        return {
            changedPaths: [...changedPaths],
            affectedPaths,
            affectedTags: [...tagSet],
        };
    }
}
//# sourceMappingURL=module-graph.js.map