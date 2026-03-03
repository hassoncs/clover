import type { PenFrame, PenGroup, PenNode, PenRef } from "@slopcade/shared/types/pen";

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
] as const;

type PositionSizeKey = (typeof POSITION_SIZE_KEYS)[number];

function getChildren(node: PenNode): PenNode[] | undefined {
	if (node.type === "frame" || node.type === "group") {
		return (node as PenFrame | PenGroup).children;
	}
	return undefined;
}

function setChildren(node: PenNode, children: PenNode[]): void {
	if (node.type === "frame" || node.type === "group") {
		(node as PenFrame | PenGroup).children = children;
	}
}

function isReusable(node: PenNode): boolean {
	return (node.type === "frame" || node.type === "ref") && !!(node as PenFrame | PenRef).reusable;
}

function walkDepthFirst(nodes: PenNode[], visitor: (node: PenNode) => void): void {
	for (const node of nodes) {
		visitor(node);
		const children = getChildren(node);
		if (children) {
			walkDepthFirst(children, visitor);
		}
	}
}

function findNodeByPath(root: PenNode, pathParts: string[]): PenNode | null {
	if (pathParts.length === 0) return root;
	const children = getChildren(root);
	if (!children) return null;
	const child = children.find((c) => c.id === pathParts[0]);
	if (!child) return null;
	return findNodeByPath(child, pathParts.slice(1));
}

export function buildComponentRegistry(nodes: PenNode[]): Map<string, PenNode> {
	const registry = new Map<string, PenNode>();
	walkDepthFirst(nodes, (node) => {
		if (isReusable(node)) {
			registry.set(node.id, node);
		}
	});
	return registry;
}

export function resolveRef(refNode: PenRef, registry: Map<string, PenNode>): PenNode | null {
	const componentDef = registry.get(refNode.ref);
	if (!componentDef) return null;

	const cloned = structuredClone(componentDef);
	cloned.id = refNode.id;

	for (const key of POSITION_SIZE_KEYS) {
		const value = refNode[key as PositionSizeKey];
		if (value !== undefined) {
			(cloned as Record<string, unknown>)[key] = value;
		}
	}

	if (refNode.descendants) {
		for (const [slashPath, patch] of Object.entries(refNode.descendants)) {
			const pathParts = slashPath.split("/");
			const target = findNodeByPath(cloned, pathParts);
			if (target) {
				const { children: patchChildren, ...restPatch } = patch as Record<string, unknown>;
				Object.assign(target, restPatch);
				if (patchChildren !== undefined) {
					setChildren(target, patchChildren as PenNode[]);
				}
			}
		}
	}

	return cloned;
}

function resolveAllRefsInner(
	nodes: PenNode[],
	registry: Map<string, PenNode>,
	resolvingStack: Set<string>,
): PenNode[] {
	return nodes.map((node) => {
		if (node.type === "ref") {
			if (resolvingStack.has(node.ref)) {
				console.warn(`Circular ref detected: ${node.ref} — skipping resolution`);
				return node;
			}
			const resolved = resolveRef(node, registry);
			if (!resolved) return node;

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

export function resolveAllRefs(nodes: PenNode[], registry: Map<string, PenNode>): PenNode[] {
	return resolveAllRefsInner(nodes, registry, new Set<string>());
}
