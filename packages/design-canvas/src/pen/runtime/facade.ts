import {
	type PenNodeType,
	RuntimeGraphError,
	type RuntimeNode,
	type SceneGraph,
} from "./scene-graph";

type MutableRuntimeNodeFields = Omit<
	RuntimeNode,
	"id" | "type" | "parentId" | "childIds"
>;

export type RuntimeNodeCreateProps = Partial<
	Omit<RuntimeNode, "type" | "parentId" | "childIds">
>;
export type RuntimeNodeUpdatePatch = Partial<MutableRuntimeNodeFields>;

export type UndoInverseOperation =
	| { kind: "delete"; nodeId: string }
	| { kind: "update"; nodeId: string; patch: RuntimeNodeUpdatePatch }
	| {
			kind: "restore_subtree";
			parentId: string;
			insertIndex: number;
			nodes: RuntimeNode[];
	  }
	| {
			kind: "reparent";
			nodeId: string;
			previousParentId: string;
			previousIndex: number;
			previousX: number | undefined;
			previousY: number | undefined;
	  };

export type UndoEntryType = "create" | "update" | "delete" | "reparent";

export type UndoEntry = {
	type: UndoEntryType;
	nodeId: string;
	inverse: UndoInverseOperation;
};

export class CycleError extends RuntimeGraphError {
	constructor(nodeId: string, parentId: string) {
		super(
			`Cannot reparent node "${nodeId}" under "${parentId}": cycle detected`,
		);
		this.name = "CycleError";
	}
}

function cloneNode(node: RuntimeNode): RuntimeNode {
	return structuredClone(node);
}

export class PenToolFacade {
	readonly graph: SceneGraph;

	constructor(graph: SceneGraph) {
		this.graph = graph;
	}

	createNode(
		type: PenNodeType,
		parentId: string,
		props: RuntimeNodeCreateProps = {},
	): { node: RuntimeNode; undo: UndoEntry } {
		const parent = this.requireNode(parentId);
		if (!this.graph.isContainer(parent.type)) {
			throw new RuntimeGraphError(
				`Cannot create node under non-container parent "${parentId}" (${parent.type})`,
			);
		}

		const node = this.graph.createNode(type, parentId, props);
		return {
			node: cloneNode(node),
			undo: {
				type: "create",
				nodeId: node.id,
				inverse: {
					kind: "delete",
					nodeId: node.id,
				},
			},
		};
	}

	updateNode(id: string, patch: RuntimeNodeUpdatePatch): UndoEntry {
		const node = this.requireNode(id);
		const previousValuesRecord: Record<string, unknown> = {};

		for (const key of Object.keys(patch) as Array<
			keyof RuntimeNodeUpdatePatch
		>) {
			const runtimeKey = key as keyof MutableRuntimeNodeFields;
			previousValuesRecord[key] = node[runtimeKey];
		}

		const previousValues =
			previousValuesRecord as unknown as RuntimeNodeUpdatePatch;

		this.graph.updateNode(id, patch);

		return {
			type: "update",
			nodeId: id,
			inverse: {
				kind: "update",
				nodeId: id,
				patch: previousValues,
			},
		};
	}

	deleteNode(id: string): UndoEntry {
		const node = this.requireNode(id);
		if (id === this.graph.rootId) {
			throw new RuntimeGraphError("Cannot delete runtime root node");
		}

		const parentId = node.parentId;
		if (!parentId) {
			throw new RuntimeGraphError(`Cannot delete node "${id}": missing parent`);
		}

		const parent = this.requireNode(parentId);
		const insertIndex = parent.childIds.indexOf(id);
		const subtree = this.snapshotSubtree(id);

		this.graph.deleteNode(id);

		return {
			type: "delete",
			nodeId: id,
			inverse: {
				kind: "restore_subtree",
				parentId,
				insertIndex,
				nodes: subtree,
			},
		};
	}

	reparentNode(nodeId: string, newParentId: string): UndoEntry {
		if (nodeId === this.graph.rootId) {
			throw new RuntimeGraphError("Cannot reparent runtime root node");
		}

		const node = this.requireNode(nodeId);
		const newParent = this.requireNode(newParentId);
		if (!this.graph.isContainer(newParent.type)) {
			throw new RuntimeGraphError(
				`Cannot reparent into non-container parent "${newParentId}" (${newParent.type})`,
			);
		}

		if (this.graph.isDescendant(newParentId, nodeId)) {
			throw new CycleError(nodeId, newParentId);
		}

		const previousParentId = node.parentId;
		if (!previousParentId) {
			throw new RuntimeGraphError(
				`Cannot reparent node "${nodeId}": missing parent`,
			);
		}

		const previousParent = this.requireNode(previousParentId);
		const previousIndex = previousParent.childIds.indexOf(nodeId);
		const previousX = node.x;
		const previousY = node.y;

		this.graph.reparentNode(nodeId, newParentId);

		return {
			type: "reparent",
			nodeId,
			inverse: {
				kind: "reparent",
				nodeId,
				previousParentId,
				previousIndex,
				previousX,
				previousY,
			},
		};
	}

	getNode(id: string): RuntimeNode | undefined {
		const node = this.graph.getNode(id);
		if (!node) return undefined;
		return cloneNode(node);
	}

	getChildren(id: string): RuntimeNode[] {
		this.requireNode(id);
		return this.graph.getChildren(id).map(cloneNode);
	}

	findNodes(
		predicate: (node: Readonly<RuntimeNode>) => boolean,
	): RuntimeNode[] {
		const matches: RuntimeNode[] = [];
		for (const node of this.graph.nodes.values()) {
			const safeNode = cloneNode(node);
			if (predicate(safeNode)) {
				matches.push(safeNode);
			}
		}
		return matches;
	}

	getDescendants(id: string): RuntimeNode[] {
		this.requireNode(id);
		const descendants: RuntimeNode[] = [];
		const visit = (parentId: string): void => {
			for (const child of this.graph.getChildren(parentId)) {
				descendants.push(cloneNode(child));
				visit(child.id);
			}
		};

		visit(id);
		return descendants;
	}

	getAncestors(id: string): RuntimeNode[] {
		const ancestors: RuntimeNode[] = [];
		let current = this.requireNode(id);

		while (current.parentId !== null) {
			const parent = this.requireNode(current.parentId);
			ancestors.push(cloneNode(parent));
			current = parent;
		}

		return ancestors;
	}

	private requireNode(id: string): RuntimeNode {
		const node = this.graph.getNode(id);
		if (!node) {
			throw new RuntimeGraphError(`Node "${id}" was not found`);
		}
		return node;
	}

	private snapshotSubtree(nodeId: string): RuntimeNode[] {
		const snapshot: RuntimeNode[] = [];
		const visit = (id: string): void => {
			const node = this.requireNode(id);
			snapshot.push(cloneNode(node));
			for (const childId of node.childIds) {
				visit(childId);
			}
		};

		visit(nodeId);
		return snapshot;
	}
}
