import { buildThemeContext } from "./themes";
export function resolveVariable(name, variables, theme) {
    const key = name.slice(1);
    const variable = variables?.[key];
    if (!variable) {
        return name;
    }
    const { value } = variable;
    if (!Array.isArray(value)) {
        return value;
    }
    const themedValues = value;
    let bestMatch;
    let bestSpecificity = -1;
    let fallback;
    for (const entry of themedValues) {
        if (!entry.theme || Object.keys(entry.theme).length === 0) {
            fallback = entry;
            continue;
        }
        const entryAxes = entry.theme;
        const specificity = Object.keys(entryAxes).length;
        const matches = Object.entries(entryAxes).every(([axis, val]) => theme.axes[axis] === val);
        if (matches && specificity > bestSpecificity) {
            bestMatch = entry;
            bestSpecificity = specificity;
        }
    }
    const resolved = bestMatch ?? fallback;
    return resolved !== undefined ? resolved.value : name;
}
export function resolveValue(value, variables, theme) {
    if (typeof value === "string" && value.startsWith("$--")) {
        return resolveVariable(value, variables, theme);
    }
    return value;
}
function resolveObjectVariables(obj, variables, theme) {
    if (typeof obj === "string") {
        return resolveValue(obj, variables, theme);
    }
    if (Array.isArray(obj)) {
        return obj.map((item) => resolveObjectVariables(item, variables, theme));
    }
    if (obj !== null && typeof obj === "object") {
        const result = {};
        for (const [k, v] of Object.entries(obj)) {
            result[k] = resolveObjectVariables(v, variables, theme);
        }
        return result;
    }
    return obj;
}
function resolveNode(node, variables, themes, parentTheme) {
    const localTheme = buildThemeContext(themes, node.theme, parentTheme);
    const { children: _children, ...rest } = node;
    const resolvedRest = resolveObjectVariables(rest, variables, localTheme);
    const hasChildren = "children" in node && Array.isArray(node.children);
    if (hasChildren) {
        const sourceChildren = node.children ?? [];
        const resolvedChildren = resolveTreeVariables(sourceChildren, variables, themes, localTheme);
        return { ...resolvedRest, children: resolvedChildren };
    }
    return resolvedRest;
}
export function resolveTreeVariables(nodes, variables, themes, parentTheme) {
    const effectiveParent = parentTheme ?? buildThemeContext(themes, undefined, undefined);
    return nodes.map((node) => resolveNode(node, variables, themes, effectiveParent));
}
//# sourceMappingURL=variables.js.map