import type {
	PenDocument,
	PenFrame,
	PenNode,
} from "@slopcade/shared/types/pen";

type UnknownRecord = Record<string, unknown>;

interface ApplyResult {
	nextDocument: PenDocument;
	appliedOps: number;
	errors: string[];
}

function asRecord(value: unknown): UnknownRecord | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	return value as UnknownRecord;
}

function asNumber(value: unknown, fallback: number): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback: string): string {
	return typeof value === "string" && value.length > 0 ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
	return typeof value === "boolean" ? value : fallback;
}

function isContainer(
	node: PenNode,
): node is PenFrame | Extract<PenNode, { type: "group" }> {
	return node.type === "frame" || node.type === "group";
}

function findContainerById(
	nodes: PenNode[],
	id: string,
): (PenFrame | Extract<PenNode, { type: "group" }>) | null {
	for (const node of nodes) {
		if (isContainer(node)) {
			if (node.id === id) return node;
			const found = findContainerById(node.children ?? [], id);
			if (found) return found;
		}
	}
	return null;
}

function removeNodeById(nodes: PenNode[], id: string): boolean {
	for (let i = 0; i < nodes.length; i += 1) {
		const node = nodes[i];
		if (node.id === id) {
			nodes.splice(i, 1);
			return true;
		}
		if (isContainer(node) && node.children?.length) {
			const removed = removeNodeById(node.children, id);
			if (removed) return true;
		}
	}
	return false;
}

function findNodeById(nodes: PenNode[], id: string): PenNode | null {
	for (const node of nodes) {
		if (node.id === id) return node;
		if (isContainer(node)) {
			const found = findNodeById(node.children ?? [], id);
			if (found) return found;
		}
	}
	return null;
}

function createElementNode(
	frameId: string,
	rawElement: unknown,
	index: number,
): PenNode | null {
	const element = asRecord(rawElement);
	if (!element) return null;

	const rawType = asString(element.type, "rect");
	const id = asString(element.id, `${frameId}-el-${Date.now()}-${index}`);
	const x = asNumber(element.x, 0);
	const y = asNumber(element.y, 0);
	const width = asNumber(element.width, rawType === "text" ? 240 : 120);
	const height = asNumber(element.height, rawType === "text" ? 32 : 80);

	if (rawType === "text") {
		const node: PenNode = {
			type: "text",
			id,
			x,
			y,
			width,
			height,
			content: asString(element.content, "Text"),
			fontSize: asNumber(element.fontSize, 16),
			fill: asString(element.color ?? element.fill, "#111827"),
		};
		return node;
	}

	if (rawType === "circle") {
		const node: PenNode = {
			type: "ellipse",
			id,
			x,
			y,
			width,
			height,
			fill: asString(element.fill, "#6366f1"),
		};
		return node;
	}

	if (rawType === "image") {
		const node: PenNode = {
			type: "image",
			id,
			x,
			y,
			width: asNumber(element.width, 400),
			height: asNumber(element.height, 300),
			url: asString(element.url, ""),
			fit: (element.fit === "contain" || element.fit === "fill") ? element.fit : "cover",
		};
		return node;
	}

	if (rawType === "effect" || rawType === "shader") {
		const uniformsRecord = asRecord(element.uniforms);
		const node: PenNode = {
			type: "effect",
			id,
			x,
			y,
			width,
			height,
			shaderCode: asString(
				element.shaderCode,
				`shader_type canvas_item;\n\nvoid fragment() {\n  vec2 uv = UV;\n  float t = TIME;\n  vec3 col = 0.5 + 0.5 * cos(t + uv.xyx + vec3(0.0, 2.0, 4.0));\n  COLOR = vec4(col, 1.0);\n}`,
			),
			authoringMode: asString(element.authoringMode, "code"),
			playing: asBoolean(element.playing, true),
			uniforms: uniformsRecord ?? undefined,
		};
		return node;
	}

	const node: PenNode = {
		type: "rectangle",
		id,
		x,
		y,
		width,
		height,
		fill: asString(element.fill, "#e5e7eb"),
	};

	if (typeof element.cornerRadius === "number") {
		node.cornerRadius = element.cornerRadius;
	}

	return node;
}

function applyPatch(node: PenNode, patch: UnknownRecord): void {
	for (const [key, value] of Object.entries(patch)) {
		if (
			key === "type" ||
			key === "id" ||
			key === "children" ||
			value === undefined
		)
			continue;
		(node as UnknownRecord)[key] = value;
	}
}

export function applyDesignChatOpsToDocument(
	prev: PenDocument,
	rawOps: unknown,
): ApplyResult {
	const ops = Array.isArray(rawOps) ? rawOps : [];
	const nextDocument = JSON.parse(JSON.stringify(prev)) as PenDocument;
	const errors: string[] = [];
	let appliedOps = 0;

	ops.forEach((rawOp, index) => {
		const op = asRecord(rawOp);
		if (!op) {
			errors.push(`op[${index}] is not an object`);
			return;
		}

		const type = asString(op.type, "");
		try {
			if (type === "addFrame") {
				const frameId = asString(op.id, `frame-${Date.now()}-${index}`);
				const frame: PenFrame = {
					type: "frame",
					id: frameId,
					name: asString(op.title, frameId),
					x: asNumber(op.x, 0),
					y: asNumber(op.y, 0),
					width: asNumber(op.width, 1440),
					height: asNumber(op.height, 900),
					layout: "none",
					children: [],
				};
				nextDocument.children.push(frame);
				appliedOps += 1;
				return;
			}

			if (type === "deleteFrame") {
				const id = asString(op.id, "");
				if (!id || !removeNodeById(nextDocument.children, id)) {
					errors.push(
						`op[${index}] deleteFrame failed for id=${id || "<empty>"}`,
					);
					return;
				}
				appliedOps += 1;
				return;
			}

			if (type === "updateFrame") {
				const id = asString(op.id, "");
				const patch = asRecord(op.patch);
				if (!id || !patch) {
					errors.push(`op[${index}] updateFrame missing id or patch`);
					return;
				}
				const node = findNodeById(nextDocument.children, id);
				if (!node || node.type !== "frame") {
					errors.push(`op[${index}] updateFrame target not found: ${id}`);
					return;
				}
				applyPatch(node, patch);
				appliedOps += 1;
				return;
			}

			if (type === "addElement") {
				const frameId = asString(op.frameId, "");
				if (!frameId) {
					errors.push(`op[${index}] addElement missing frameId`);
					return;
				}
				const frame = findContainerById(nextDocument.children, frameId);
				if (!frame || frame.type !== "frame") {
					errors.push(`op[${index}] addElement frame not found: ${frameId}`);
					return;
				}
				const node = createElementNode(frameId, op.element, index);
				if (!node) {
					errors.push(`op[${index}] addElement has invalid element payload`);
					return;
				}
				if (!frame.children) frame.children = [];
				frame.children.push(node);
				appliedOps += 1;
				return;
			}

			if (type === "updateElement") {
				const elementId = asString(op.elementId, "");
				const patch = asRecord(op.patch);
				if (!elementId || !patch) {
					errors.push(`op[${index}] updateElement missing elementId or patch`);
					return;
				}
				const target = findNodeById(nextDocument.children, elementId);
				if (!target) {
					errors.push(
						`op[${index}] updateElement target not found: ${elementId}`,
					);
					return;
				}
				applyPatch(target, patch);
				appliedOps += 1;
				return;
			}

			if (type === "deleteElement") {
				const elementId = asString(op.elementId, "");
				if (!elementId || !removeNodeById(nextDocument.children, elementId)) {
					errors.push(
						`op[${index}] deleteElement failed for id=${elementId || "<empty>"}`,
					);
					return;
				}
				appliedOps += 1;
				return;
			}

			errors.push(`op[${index}] unsupported op type: ${type || "<empty>"}`);
		} catch (error) {
			errors.push(
				`op[${index}] ${type || "<unknown>"} threw ${
					error instanceof Error ? error.message : "unknown error"
				}`,
			);
		}
	});

	return {
		nextDocument,
		appliedOps,
		errors,
	};
}
