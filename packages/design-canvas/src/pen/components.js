const POSITION_SIZE_KEYS = [
    "x",
    "y",
    "width",
    "height",
    "rotation",
    "opacity",
    "flipX",
    "flipY",
    "enabled",
    "visible",
    "theme",
    "name",
];
/** Visual properties that ref instances can override from the component definition. */
const VISUAL_OVERRIDE_KEYS = [
    "fill",
    "stroke",
    "cornerRadius",
    "gap",
    "padding",
    "effects",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "textAlign",
    "textAlignVertical",
    "textGrowth",
    "layout",
    "justifyContent",
    "alignItems",
    "clip",
];
function getChildren(node) {
    if (node.type === "frame" || node.type === "group") {
        return node.children;
    }
    return undefined;
}
function setChildren(node, children) {
    if (node.type === "frame" || node.type === "group") {
        node.children = children;
    }
}
function isReusable(node) {
    return ((node.type === "frame" || node.type === "ref") &&
        !!node.reusable);
}
function walkDepthFirst(nodes, visitor) {
    for (const node of nodes) {
        visitor(node);
        const children = getChildren(node);
        if (children) {
            walkDepthFirst(children, visitor);
        }
    }
}
function findNodeByPath(root, pathParts) {
    if (pathParts.length === 0)
        return root;
    const children = getChildren(root);
    if (!children)
        return null;
    const child = children.find((c) => c.id === pathParts[0]);
    if (!child)
        return null;
    return findNodeByPath(child, pathParts.slice(1));
}
export function buildComponentRegistry(nodes) {
    const registry = new Map();
    walkDepthFirst(nodes, (node) => {
        if (isReusable(node)) {
            registry.set(node.id, node);
        }
    });
    return registry;
}
export function resolveRef(refNode, registry) {
    const componentDef = registry.get(refNode.ref);
    if (!componentDef)
        return null;
    const cloned = structuredClone(componentDef);
    cloned.id = refNode.id;
    for (const key of POSITION_SIZE_KEYS) {
        const value = refNode[key];
        if (value !== undefined) {
            cloned[key] = value;
        }
    }
    // Apply visual overrides from ref instance (fill, stroke, cornerRadius, etc.)
    for (const key of VISUAL_OVERRIDE_KEYS) {
        const value = refNode[key];
        if (value !== undefined) {
            cloned[key] = value;
        }
    }
    if (refNode.descendants) {
        for (const [slashPath, patch] of Object.entries(refNode.descendants)) {
            const pathParts = slashPath.split("/");
            const target = findNodeByPath(cloned, pathParts);
            if (target) {
                const { children: patchChildren, ...restPatch } = patch;
                Object.assign(target, restPatch);
                if (patchChildren !== undefined) {
                    setChildren(target, patchChildren);
                }
            }
        }
    }
    return cloned;
}
function resolveAllRefsInner(nodes, registry, resolvingStack) {
    return nodes.map((node) => {
        if (node.type === "ref") {
            if (resolvingStack.has(node.ref)) {
                console.warn(`Circular ref detected: ${node.ref} — skipping resolution`);
                return node;
            }
            const resolved = resolveRef(node, registry);
            if (!resolved)
                return node;
            resolvingStack.add(node.ref);
            const children = getChildren(resolved);
            if (children) {
                setChildren(resolved, resolveAllRefsInner(children, registry, resolvingStack));
            }
            resolvingStack.delete(node.ref);
            return resolved;
        }
        const children = getChildren(node);
        if (children) {
            const cloned = structuredClone(node);
            setChildren(cloned, resolveAllRefsInner(children, registry, resolvingStack));
            return cloned;
        }
        return node;
    });
}
export function resolveAllRefs(nodes, registry) {
    return resolveAllRefsInner(nodes, registry, new Set());
}
//# sourceMappingURL=components.js.map