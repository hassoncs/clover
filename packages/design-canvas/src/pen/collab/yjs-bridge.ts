import * as Y from "yjs";
import type {
	PenToolFacade,
	RuntimeNodeCreateProps,
	RuntimeNodeUpdatePatch,
	UndoEntry,
} from "../runtime/facade";
import {
	generateId,
	type PenNodeType,
	RuntimeGraphError,
	type RuntimeNode,
	type SceneGraph,
} from "../runtime/scene-graph";

type NodeMapValue = Y.Map<unknown>;
type ChildIdsValue = Y.Array<string>;
type UpdateListener = (update: Uint8Array, origin: unknown) => void;

type OriginalFacadeMethods = {
	createNode: PenToolFacade["createNode"];
	updateNode: PenToolFacade["updateNode"];
	deleteNode: PenToolFacade["deleteNode"];
	reparentNode: PenToolFacade["reparentNode"];
};

const CORE_KEYS = new Set<keyof RuntimeNode>([
	"id",
	"type",
	"parentId",
	"childIds",
]);

export class YjsBridge {
	readonly doc: Y.Doc;

	private readonly graph: SceneGraph;
	private readonly facade: PenToolFacade;
	private readonly nodes: Y.Map<NodeMapValue>;
	private readonly originalFacadeMethods: OriginalFacadeMethods;
	private readonly updateListeners = new Set<UpdateListener>();
	private readonly localOrigin = { kind: "local_mutation" as const };

	private readonly onDocUpdate = (
		update: Uint8Array,
		origin: unknown,
	): void => {
		for (const listener of this.updateListeners) {
			listener(update, origin);
		}
	};

	private readonly onAfterTransaction = (): void => {
		this.reconcileSceneGraphFromYDoc();
	};

	constructor(graph: SceneGraph, facade: PenToolFacade) {
		this.graph = graph;
		this.facade = facade;
		this.doc = new Y.Doc();
		this.nodes = this.doc.getMap<NodeMapValue>("nodes");

		this.originalFacadeMethods = {
			createNode: facade.createNode.bind(facade),
			updateNode: facade.updateNode.bind(facade),
			deleteNode: facade.deleteNode.bind(facade),
			reparentNode: facade.reparentNode.bind(facade),
		};

		this.initializeYDocFromGraph();
		this.reconcileSceneGraphFromYDoc();
		this.attachFacadeMutationBridge();

		this.doc.on("update", this.onDocUpdate);
		this.doc.on("afterTransaction", this.onAfterTransaction);
	}

	get rootNodeId(): string {
		return this.graph.rootId;
	}

	subscribeUpdates(listener: UpdateListener): () => void {
		this.updateListeners.add(listener);
		return () => {
			this.updateListeners.delete(listener);
		};
	}

	applyUpdate(update: Uint8Array, origin?: unknown): void {
		Y.applyUpdate(this.doc, update, origin);
	}

	getUpdate(): Uint8Array {
		return Y.encodeStateAsUpdate(this.doc);
	}

	getStateVector(): Uint8Array {
		return Y.encodeStateVector(this.doc);
	}

	destroy(): void {
		this.doc.off("update", this.onDocUpdate);
		this.doc.off("afterTransaction", this.onAfterTransaction);
		this.doc.destroy();
	}

	private initializeYDocFromGraph(): void {
		this.doc.transact(() => {
			for (const node of this.graph.nodes.values()) {
				const yNode = this.getOrCreateYNode(node.id);
				this.writeRuntimeNodeToYMap(yNode, node);
			}
		}, this.localOrigin);
	}

	private attachFacadeMutationBridge(): void {
		this.facade.createNode = (
			type: PenNodeType,
			parentId: string,
			props: RuntimeNodeCreateProps = {},
		): { node: RuntimeNode; undo: UndoEntry } => {
			return this.createNodeViaYDoc(type, parentId, props);
		};

		this.facade.updateNode = (
			id: string,
			patch: RuntimeNodeUpdatePatch,
		): UndoEntry => {
			return this.updateNodeViaYDoc(id, patch);
		};

		this.facade.deleteNode = (id: string): UndoEntry => {
			return this.deleteNodeViaYDoc(id);
		};

		this.facade.reparentNode = (
			nodeId: string,
			newParentId: string,
		): UndoEntry => {
			return this.reparentNodeViaYDoc(nodeId, newParentId);
		};
	}

	private createNodeViaYDoc(
		type: PenNodeType,
		parentId: string,
		props: RuntimeNodeCreateProps,
	): { node: RuntimeNode; undo: UndoEntry } {
		const parent = this.facade.getNode(parentId);
		if (!parent) {
			throw new RuntimeGraphError(`Node "${parentId}" was not found`);
		}

		const nodeId = props.id ?? generateId();
		this.doc.transact(() => {
			const parentYNode = this.requireYNode(parentId);
			const parentChildren = this.getOrCreateChildIds(parentYNode);
			if (!parentChildren.toArray().includes(nodeId)) {
				parentChildren.push([nodeId]);
			}

			const yNode = this.getOrCreateYNode(nodeId);
			this.writeRuntimeNodeToYMap(yNode, {
				...(props as RuntimeNode),
				id: nodeId,
				type,
				parentId,
				childIds: [],
			});
		}, this.localOrigin);

		const createdNode = this.facade.getNode(nodeId);
		if (!createdNode) {
			throw new RuntimeGraphError(`Node "${nodeId}" was not found`);
		}

		return {
			node: createdNode,
			undo: {
				type: "create",
				nodeId,
				inverse: {
					kind: "delete",
					nodeId,
				},
			},
		};
	}

	private updateNodeViaYDoc(
		id: string,
		patch: RuntimeNodeUpdatePatch,
	): UndoEntry {
		const nodeBefore = this.facade.getNode(id);
		if (!nodeBefore) {
			throw new RuntimeGraphError(`Node "${id}" was not found`);
		}

		const inversePatch: RuntimeNodeUpdatePatch = {};
		for (const key of Object.keys(patch) as Array<
			keyof RuntimeNodeUpdatePatch
		>) {
			const runtimeKey = key as keyof RuntimeNode;
			inversePatch[key] = cloneValue(nodeBefore[runtimeKey]) as never;
		}

		this.doc.transact(() => {
			const yNode = this.requireYNode(id);
			for (const key of Object.keys(patch) as Array<
				keyof RuntimeNodeUpdatePatch
			>) {
				const nextValue = patch[key];
				if (nextValue === undefined) {
					yNode.delete(key as string);
					continue;
				}
				yNode.set(key as string, cloneValue(nextValue));
			}
		}, this.localOrigin);

		return {
			type: "update",
			nodeId: id,
			inverse: {
				kind: "update",
				nodeId: id,
				patch: inversePatch,
			},
		};
	}

	private deleteNodeViaYDoc(id: string): UndoEntry {
		const node = this.facade.getNode(id);
		if (!node) {
			throw new RuntimeGraphError(`Node "${id}" was not found`);
		}
		if (id === this.rootNodeId) {
			throw new RuntimeGraphError("Cannot delete runtime root node");
		}
		if (!node.parentId) {
			throw new RuntimeGraphError(`Cannot delete node "${id}": missing parent`);
		}

		const parent = this.facade.getNode(node.parentId);
		if (!parent) {
			throw new RuntimeGraphError(`Node "${node.parentId}" was not found`);
		}

		const insertIndex = parent.childIds.indexOf(id);
		const descendants = this.facade.getDescendants(id);
		const subtree = [node, ...descendants];

		this.doc.transact(() => {
			this.removeNodeSubtreeFromYDoc(id);
			const parentYNode = this.requireYNode(node.parentId as string);
			this.removeChildId(parentYNode, id);
		}, this.localOrigin);

		return {
			type: "delete",
			nodeId: id,
			inverse: {
				kind: "restore_subtree",
				parentId: node.parentId,
				insertIndex,
				nodes: subtree,
			},
		};
	}

	private reparentNodeViaYDoc(nodeId: string, newParentId: string): UndoEntry {
		if (nodeId === this.rootNodeId) {
			throw new RuntimeGraphError("Cannot reparent runtime root node");
		}

		const node = this.facade.getNode(nodeId);
		if (!node) {
			throw new RuntimeGraphError(`Node "${nodeId}" was not found`);
		}

		const newParent = this.facade.getNode(newParentId);
		if (!newParent) {
			throw new RuntimeGraphError(`Node "${newParentId}" was not found`);
		}

		const previousParentId = node.parentId;
		if (!previousParentId) {
			throw new RuntimeGraphError(
				`Cannot reparent node "${nodeId}": missing parent`,
			);
		}

		const previousParent = this.facade.getNode(previousParentId);
		if (!previousParent) {
			throw new RuntimeGraphError(`Node "${previousParentId}" was not found`);
		}

		const previousIndex = previousParent.childIds.indexOf(nodeId);
		const previousX = node.x;
		const previousY = node.y;

		this.doc.transact(() => {
			const previousParentYNode = this.requireYNode(previousParentId);
			this.removeChildId(previousParentYNode, nodeId);

			const nextParentYNode = this.requireYNode(newParentId);
			const nextParentChildren = this.getOrCreateChildIds(nextParentYNode);
			if (!nextParentChildren.toArray().includes(nodeId)) {
				nextParentChildren.push([nodeId]);
			}

			const yNode = this.requireYNode(nodeId);
			yNode.set("parentId", newParentId);
		}, this.localOrigin);

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

	private removeNodeSubtreeFromYDoc(nodeId: string): void {
		const yNode = this.requireYNode(nodeId);
		const childIds = this.readChildIds(yNode);
		for (const childId of childIds) {
			this.removeNodeSubtreeFromYDoc(childId);
		}
		this.nodes.delete(nodeId);
	}

	private reconcileSceneGraphFromYDoc(): void {
		const desiredNodes = this.readRuntimeNodesFromYDoc();
		this.ensureRequiredRootNode(desiredNodes);

		this.createMissingGraphNodes(desiredNodes);
		this.removeDeletedGraphNodes(desiredNodes);
		this.rebuildGraphParentOrdering(desiredNodes);
		this.updateGraphNodeFields(desiredNodes);
	}

	private ensureRequiredRootNode(desiredNodes: Map<string, RuntimeNode>): void {
		const rootNode = desiredNodes.get(this.rootNodeId);
		if (rootNode) return;

		desiredNodes.set(this.rootNodeId, {
			id: this.rootNodeId,
			type: "frame",
			parentId: null,
			childIds: [],
			name: "Document",
		});
	}

	private createMissingGraphNodes(
		desiredNodes: Map<string, RuntimeNode>,
	): void {
		let progress = true;
		while (progress) {
			progress = false;
			for (const desired of desiredNodes.values()) {
				if (desired.id === this.rootNodeId) continue;
				if (this.graph.getNode(desired.id)) continue;

				const parentId = desired.parentId ?? this.rootNodeId;
				if (!this.graph.getNode(parentId)) continue;

				const createProps: RuntimeNodeCreateProps = {
					id: desired.id,
					...extractMutableFields(desired),
				};
				this.originalFacadeMethods.createNode(
					desired.type,
					parentId,
					createProps,
				);
				progress = true;
			}
		}
	}

	private removeDeletedGraphNodes(
		desiredNodes: Map<string, RuntimeNode>,
	): void {
		for (const currentNode of Array.from(this.graph.nodes.values())) {
			if (currentNode.id === this.rootNodeId) continue;
			if (desiredNodes.has(currentNode.id)) continue;
			if (!this.graph.getNode(currentNode.id)) continue;
			this.originalFacadeMethods.deleteNode(currentNode.id);
		}
	}

	private rebuildGraphParentOrdering(
		desiredNodes: Map<string, RuntimeNode>,
	): void {
		for (const desiredParent of desiredNodes.values()) {
			const parentInGraph = this.graph.getNode(desiredParent.id);
			if (!parentInGraph) continue;

			desiredParent.childIds.forEach((childId, index) => {
				if (!this.graph.getNode(childId)) return;
				this.graph.reorderChild(childId, desiredParent.id, index);
			});
		}
	}

	private updateGraphNodeFields(desiredNodes: Map<string, RuntimeNode>): void {
		for (const desired of desiredNodes.values()) {
			const current = this.graph.getNode(desired.id);
			if (!current) continue;

			const currentMutable = extractMutableFields(current);
			const desiredMutable = extractMutableFields(desired);
			const patch: RuntimeNodeUpdatePatch = {};

			const keys = new Set<string>([
				...Object.keys(currentMutable),
				...Object.keys(desiredMutable),
			]);

			for (const key of keys) {
				const currentValue = (currentMutable as Record<string, unknown>)[key];
				const desiredValue = (desiredMutable as Record<string, unknown>)[key];
				if (!areValuesEqual(currentValue, desiredValue)) {
					(patch as Record<string, unknown>)[key] = cloneValue(desiredValue);
				}
			}

			if (Object.keys(patch).length > 0) {
				this.originalFacadeMethods.updateNode(desired.id, patch);
			}
		}
	}

	private readRuntimeNodesFromYDoc(): Map<string, RuntimeNode> {
		const result = new Map<string, RuntimeNode>();
		for (const [nodeId, yNode] of this.nodes.entries()) {
			const typeValue = yNode.get("type");
			if (typeof typeValue !== "string") continue;

			const parentValue = yNode.get("parentId");
			const parentId = typeof parentValue === "string" ? parentValue : null;
			const runtimeNode: RuntimeNode = {
				id: nodeId,
				type: typeValue as PenNodeType,
				parentId,
				childIds: this.readChildIds(yNode),
			};
			const runtimeNodeRecord = runtimeNode as unknown as Record<
				string,
				unknown
			>;

			for (const [key, value] of yNode.entries()) {
				if (
					key === "id" ||
					key === "type" ||
					key === "parentId" ||
					key === "childIds"
				) {
					continue;
				}
				runtimeNodeRecord[key] = cloneValue(value);
			}

			result.set(nodeId, runtimeNode);
		}
		return result;
	}

	private writeRuntimeNodeToYMap(yNode: NodeMapValue, node: RuntimeNode): void {
		yNode.set("id", node.id);
		yNode.set("type", node.type);
		yNode.set("parentId", node.parentId);

		const childIds = this.getOrCreateChildIds(yNode);
		childIds.delete(0, childIds.length);
		if (node.childIds.length > 0) {
			childIds.insert(0, [...node.childIds]);
		}

		for (const [key, value] of Object.entries(node)) {
			if (CORE_KEYS.has(key as keyof RuntimeNode)) continue;
			if (value === undefined) {
				yNode.delete(key);
				continue;
			}
			yNode.set(key, cloneValue(value));
		}
	}

	private removeChildId(parentYNode: NodeMapValue, childId: string): void {
		const childIds = this.getOrCreateChildIds(parentYNode);
		const index = childIds.toArray().indexOf(childId);
		if (index >= 0) {
			childIds.delete(index, 1);
		}
	}

	private getOrCreateYNode(nodeId: string): NodeMapValue {
		const existing = this.nodes.get(nodeId);
		if (existing instanceof Y.Map) {
			return existing as NodeMapValue;
		}

		const created = new Y.Map<unknown>();
		this.nodes.set(nodeId, created);
		return created;
	}

	private requireYNode(nodeId: string): NodeMapValue {
		const yNode = this.nodes.get(nodeId);
		if (!(yNode instanceof Y.Map)) {
			throw new RuntimeGraphError(`Node "${nodeId}" was not found`);
		}
		return yNode as NodeMapValue;
	}

	private getOrCreateChildIds(yNode: NodeMapValue): ChildIdsValue {
		const childIdsValue = yNode.get("childIds");
		if (childIdsValue instanceof Y.Array) {
			return childIdsValue as ChildIdsValue;
		}

		const childIds = new Y.Array<string>();
		yNode.set("childIds", childIds);
		return childIds;
	}

	private readChildIds(yNode: NodeMapValue): string[] {
		const childIds = yNode.get("childIds");
		if (!(childIds instanceof Y.Array)) {
			return [];
		}

		return childIds
			.toArray()
			.filter((entry): entry is string => typeof entry === "string");
	}
}

function extractMutableFields(node: RuntimeNode): RuntimeNodeUpdatePatch {
	const mutableFields: RuntimeNodeUpdatePatch = {};
	for (const [key, value] of Object.entries(node)) {
		if (CORE_KEYS.has(key as keyof RuntimeNode)) continue;
		(mutableFields as Record<string, unknown>)[key] = cloneValue(value);
	}
	return mutableFields;
}

function areValuesEqual(left: unknown, right: unknown): boolean {
	return JSON.stringify(left) === JSON.stringify(right);
}

function cloneValue<T>(value: T): T {
	if (value === undefined || value === null) {
		return value;
	}
	if (typeof value === "object") {
		return structuredClone(value);
	}
	return value;
}
