import type { PenNode } from "@slopcade/protocol/pen";

export function getNodeChildren(node: PenNode): PenNode[] {
	if ("children" in node && Array.isArray(node.children)) {
		return node.children as PenNode[];
	}
	return [];
}

export function findNodeById(nodes: PenNode[], id: string): PenNode | null {
	for (const node of nodes) {
		if (node.id === id) return node;
		const children = getNodeChildren(node);
		if (children.length > 0) {
			const found = findNodeById(children, id);
			if (found) return found;
		}
	}
	return null;
}

export function getNodeAtPath(
	nodes: PenNode[],
	path: string[],
): PenNode | null {
	if (path.length === 0) return null;
	const [head, ...rest] = path;
	const node = nodes.find((n) => n.id === head) ?? null;
	if (!node) return null;
	if (rest.length === 0) return node;
	return getNodeAtPath(getNodeChildren(node), rest);
}

export function updateNodesById(
	nodes: PenNode[],
	ids: Set<string>,
	update: (node: PenNode) => PenNode,
): PenNode[] {
	return nodes.map((node) => {
		const nextNode = ids.has(node.id) ? update(node) : node;
		const children = getNodeChildren(nextNode);
		if (children.length > 0) {
			return {
				...nextNode,
				children: updateNodesById(children, ids, update),
			} as PenNode;
		}
		return nextNode;
	});
}

export function removeNodesById(nodes: PenNode[], ids: Set<string>): PenNode[] {
	return nodes
		.filter((node) => !ids.has(node.id))
		.map((node) => {
			const children = getNodeChildren(node);
			if (children.length > 0) {
				return {
					...node,
					children: removeNodesById(children, ids),
				} as PenNode;
			}
			return node;
		});
}

export interface ParentContext {
	parentPath: string[];
	siblings: PenNode[];
	currentIndex: number;
}

export function getParentContext(
	allNodes: PenNode[],
	path: string[],
): ParentContext {
	const currentId = path[path.length - 1];
	if (path.length <= 1) {
		const idx = allNodes.findIndex((n) => n.id === currentId);
		return { parentPath: [], siblings: allNodes, currentIndex: idx };
	}
	const parentPath = path.slice(0, -1);
	const parentNode = getNodeAtPath(allNodes, parentPath);
	const siblings = parentNode ? getNodeChildren(parentNode) : [];
	const idx = siblings.findIndex((n) => n.id === currentId);
	return { parentPath, siblings, currentIndex: idx };
}
