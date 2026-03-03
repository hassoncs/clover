import type {
	PenEffect,
	PenFill,
	PenFrame,
	PenImage,
	PenNode,
	PenPadding,
	PenPath,
	PenRectangle,
	PenSizing,
	PenStroke,
	PenText,
	PenTheme,
	PenVariable,
} from "@slopcade/shared/types/pen";

// ---------------------------------------------------------------------------
// PenNodeType — discriminant values from PenNode union
// ---------------------------------------------------------------------------

export type PenNodeType = PenNode["type"];

// ---------------------------------------------------------------------------
// RuntimeNode — flat struct merging all PenNode variant fields
// ---------------------------------------------------------------------------

/**
 * A flattened runtime representation of any PenNode.
 * Required fields: id, type, parentId, childIds.
 * All variant-specific fields are optional via Partial merging.
 */
export interface RuntimeNode {
	// --- Core identity (always present) ---
	id: string;
	type: PenNodeType;
	parentId: string | null;
	childIds: string[];

	// --- Base entity fields (from PenEntityBaseShape) ---
	name?: string;
	x?: number;
	y?: number;
	width?: PenSizing;
	height?: PenSizing;
	rotation?: number;
	opacity?: number;
	flipX?: boolean;
	flipY?: boolean;
	enabled?: boolean;
	theme?: Record<string, string>;
	visible?: boolean;

	// --- Frame-specific ---
	layout?: PenFrame["layout"];
	gap?: number;
	padding?: PenPadding;
	justifyContent?: PenFrame["justifyContent"];
	alignItems?: PenFrame["alignItems"];
	clip?: boolean;
	reusable?: boolean;
	slot?: boolean;
	placeholder?: boolean;
	aiGenerating?: boolean;

	// --- Group-specific (layout/gap/padding already covered above) ---

	// --- Visual fills/strokes/effects (shared by rectangle, ellipse, polygon, path, frame) ---
	fill?: PenFill;
	stroke?: PenStroke;
	cornerRadius?: PenRectangle["cornerRadius"];
	effects?: PenEffect[];

	// --- Ellipse-specific ---
	innerRadius?: number;
	startAngle?: number;
	sweepAngle?: number;

	// --- Polygon-specific ---
	polygonCount?: number;

	// --- Path-specific ---
	geometry?: string;
	fillRule?: PenPath["fillRule"];

	// --- Text-specific ---
	content?: PenText["content"];
	fontFamily?: string;
	fontSize?: number;
	fontWeight?: string;
	fontStyle?: PenText["fontStyle"];
	lineHeight?: number;
	letterSpacing?: number;
	textAlign?: PenText["textAlign"];
	textAlignVertical?: PenText["textAlignVertical"];
	textGrowth?: PenText["textGrowth"];

	// --- IconFont-specific ---
	icon?: string;
	iconFamily?: string;

	// --- Ref-specific ---
	ref?: string;
	descendants?: Record<string, unknown>;

	// --- Note-specific (content already covered by text) ---

	// --- Image-specific ---
	url?: string;
	fit?: PenImage["fit"];

	// --- Connection-specific ---
	fromId?: string;
	toId?: string;
}

// ---------------------------------------------------------------------------
// Container type set — node types that can have children
// ---------------------------------------------------------------------------

const CONTAINER_TYPES = new Set<PenNodeType>(["frame", "group"]);

// ---------------------------------------------------------------------------
// RuntimeGraphError
// ---------------------------------------------------------------------------

export class RuntimeGraphError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "RuntimeGraphError";
	}
}

// ---------------------------------------------------------------------------
// SceneGraph — flat Map<string, RuntimeNode> with parent/child indices
// ---------------------------------------------------------------------------

const VIRTUAL_ROOT_ID = "__root__";

export class SceneGraph {
	readonly nodes = new Map<string, RuntimeNode>();
	readonly variables = new Map<string, PenVariable>();
	themes: PenTheme[] = [];
	readonly rootId: string = VIRTUAL_ROOT_ID;

	private absPosCache = new Map<string, { x: number; y: number }>();

	constructor() {
		const root: RuntimeNode = {
			id: VIRTUAL_ROOT_ID,
			type: "frame",
			parentId: null,
			childIds: [],
			name: "Document",
		};
		this.nodes.set(VIRTUAL_ROOT_ID, root);
	}

	// -----------------------------------------------------------------------
	// Read APIs — O(1)
	// -----------------------------------------------------------------------

	getNode(id: string): RuntimeNode | undefined {
		return this.nodes.get(id);
	}

	getChildren(id: string): RuntimeNode[] {
		const node = this.nodes.get(id);
		if (!node) return [];
		return node.childIds
			.map((cid) => this.nodes.get(cid))
			.filter((n): n is RuntimeNode => n !== undefined);
	}

	isContainer(type: PenNodeType): boolean {
		return CONTAINER_TYPES.has(type);
	}

	isDescendant(childId: string, ancestorId: string): boolean {
		let current = this.nodes.get(childId);
		while (current) {
			if (current.id === ancestorId) return true;
			current = current.parentId ? this.nodes.get(current.parentId) : undefined;
		}
		return false;
	}

	getAbsolutePosition(id: string): { x: number; y: number } {
		const cached = this.absPosCache.get(id);
		if (cached) return cached;

		let ax = 0;
		let ay = 0;
		let current = this.nodes.get(id);
		while (current && current.id !== this.rootId) {
			ax += current.x ?? 0;
			ay += current.y ?? 0;
			current = current.parentId ? this.nodes.get(current.parentId) : undefined;
		}
		const result = { x: ax, y: ay };
		this.absPosCache.set(id, result);
		return result;
	}

	// -----------------------------------------------------------------------
	// Mutation APIs
	// -----------------------------------------------------------------------

	createNode(
		type: PenNodeType,
		parentId: string,
		overrides: Partial<
			Omit<RuntimeNode, "type" | "parentId" | "childIds">
		> = {},
	): RuntimeNode {
		const parent = this.nodes.get(parentId);
		if (!parent) {
			throw new RuntimeGraphError(
				`Cannot create node: parent "${parentId}" does not exist in the scene graph`,
			);
		}

		const id = overrides.id ?? generateId();
		const node: RuntimeNode = {
			...overrides,
			id,
			type,
			parentId,
			childIds: [],
		};
		this.nodes.set(id, node);
		parent.childIds.push(id);
		this.absPosCache.clear();
		return node;
	}

	/**
	 * Insert a pre-built RuntimeNode (with its id already set) into the graph.
	 * Used by adapters that need to preserve original PenNode ids.
	 * Validates that parentId exists and that the node id is not already taken.
	 */
	insertNode(node: RuntimeNode): void {
		if (this.nodes.has(node.id)) {
			throw new RuntimeGraphError(
				`Cannot insert node: id "${node.id}" already exists in the scene graph`,
			);
		}
		if (node.parentId !== null) {
			const parent = this.nodes.get(node.parentId);
			if (!parent) {
				throw new RuntimeGraphError(
					`Cannot insert node "${node.id}": parent "${node.parentId}" does not exist in the scene graph`,
				);
			}
			parent.childIds.push(node.id);
		}
		this.nodes.set(node.id, node);
		this.absPosCache.clear();
	}

	updateNode(
		id: string,
		changes: Partial<
			Omit<RuntimeNode, "id" | "type" | "parentId" | "childIds">
		>,
	): void {
		const node = this.nodes.get(id);
		if (!node) return;
		this.absPosCache.clear();
		Object.assign(node, changes);
	}

	deleteNode(id: string): void {
		const node = this.nodes.get(id);
		if (!node || id === this.rootId) return;

		if (node.parentId) {
			const parent = this.nodes.get(node.parentId);
			if (parent) {
				parent.childIds = parent.childIds.filter((cid) => cid !== id);
			}
		}

		for (const childId of Array.from(node.childIds)) {
			this.deleteNode(childId);
		}

		this.nodes.delete(id);
		this.absPosCache.clear();
	}

	reparentNode(nodeId: string, newParentId: string): void {
		const node = this.nodes.get(nodeId);
		if (!node || nodeId === this.rootId) return;
		if (this.isDescendant(newParentId, nodeId)) return;

		const newParent = this.nodes.get(newParentId);
		if (!newParent) return;
		if (node.parentId === newParentId) return;

		this.absPosCache.clear();

		const absPos = this.getAbsolutePosition(nodeId);
		const newParentAbs =
			newParentId === this.rootId
				? { x: 0, y: 0 }
				: this.getAbsolutePosition(newParentId);

		if (node.parentId) {
			const oldParent = this.nodes.get(node.parentId);
			if (oldParent) {
				oldParent.childIds = oldParent.childIds.filter((cid) => cid !== nodeId);
			}
		}

		node.parentId = newParentId;
		newParent.childIds.push(nodeId);

		node.x = absPos.x - newParentAbs.x;
		node.y = absPos.y - newParentAbs.y;
	}

	reorderChild(nodeId: string, parentId: string, insertIndex: number): void {
		const node = this.nodes.get(nodeId);
		if (!node) return;

		const newParent = this.nodes.get(parentId);
		if (!newParent) return;

		if (node.parentId) {
			const oldParent = this.nodes.get(node.parentId);
			if (oldParent) {
				oldParent.childIds = oldParent.childIds.filter((cid) => cid !== nodeId);
			}
		}

		node.parentId = parentId;
		const idx = Math.min(insertIndex, newParent.childIds.length);
		newParent.childIds.splice(idx, 0, nodeId);
	}

	// -----------------------------------------------------------------------
	// Utility
	// -----------------------------------------------------------------------

	clearAbsPosCache(): void {
		this.absPosCache.clear();
	}

	get nodeCount(): number {
		return this.nodes.size;
	}
}

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

let nextLocalId = 1;

export function generateId(): string {
	return `rt:${nextLocalId++}`;
}

export function resetIdCounter(): void {
	nextLocalId = 1;
}
