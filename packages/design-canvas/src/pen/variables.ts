import type { PenDocument, PenNode, PenThemedValue, PenVariable } from "@slopcade/protocol/pen";
import { buildThemeContext, type ThemeContext } from "./themes";

export function resolveVariable(
	name: string,
	variables: Record<string, PenVariable> | undefined,
	theme: ThemeContext,
): string | number | boolean {
	const key = name.slice(1);
	const variable = variables?.[key];

	if (!variable) {
		return name;
	}

	const { value } = variable;

	if (!Array.isArray(value)) {
		return value;
	}

	const themedValues = value as PenThemedValue[];

	let bestMatch: PenThemedValue | undefined;
	let bestSpecificity = -1;
	let fallback: PenThemedValue | undefined;

	for (const entry of themedValues) {
		if (!entry.theme || Object.keys(entry.theme).length === 0) {
			fallback = entry;
			continue;
		}

		const entryAxes = entry.theme;
		const specificity = Object.keys(entryAxes).length;
		const matches = Object.entries(entryAxes).every(
			([axis, val]) => theme.axes[axis] === val,
		);

		if (matches && specificity > bestSpecificity) {
			bestMatch = entry;
			bestSpecificity = specificity;
		}
	}

	const resolved = bestMatch ?? fallback;
	return resolved !== undefined ? resolved.value : name;
}

export function resolveValue<T>(
	value: T,
	variables: Record<string, PenVariable> | undefined,
	theme: ThemeContext,
): T {
	if (typeof value === "string" && value.startsWith("$--")) {
		return resolveVariable(value, variables, theme) as T;
	}
	return value;
}

function resolveObjectVariables<T>(
	obj: T,
	variables: Record<string, PenVariable> | undefined,
	theme: ThemeContext,
): T {
	if (typeof obj === "string") {
		return resolveValue(obj, variables, theme) as T;
	}

	if (Array.isArray(obj)) {
		return obj.map((item) => resolveObjectVariables(item, variables, theme)) as T;
	}

	if (obj !== null && typeof obj === "object") {
		const result: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
			result[k] = resolveObjectVariables(v, variables, theme);
		}
		return result as T;
	}

	return obj;
}

function resolveNode(
	node: PenNode,
	variables: PenDocument["variables"],
	themes: PenDocument["themes"],
	parentTheme: ThemeContext,
): PenNode {
	const localTheme = buildThemeContext(themes, node.theme, parentTheme);

	const { children: _children, ...rest } = node as PenNode & { children?: PenNode[] };
	const resolvedRest = resolveObjectVariables(rest, variables, localTheme);

	const hasChildren = "children" in node && Array.isArray((node as { children?: PenNode[] }).children);

	if (hasChildren) {
		const sourceChildren = (node as { children?: PenNode[] }).children ?? [];
		const resolvedChildren = resolveTreeVariables(sourceChildren, variables, themes, localTheme);
		return { ...resolvedRest, children: resolvedChildren } as PenNode;
	}

	return resolvedRest as PenNode;
}

export function resolveTreeVariables(
	nodes: PenNode[],
	variables: PenDocument["variables"],
	themes: PenDocument["themes"],
	parentTheme?: ThemeContext,
): PenNode[] {
	const effectiveParent = parentTheme ?? buildThemeContext(themes, undefined, undefined);
	return nodes.map((node) => resolveNode(node, variables, themes, effectiveParent));
}
