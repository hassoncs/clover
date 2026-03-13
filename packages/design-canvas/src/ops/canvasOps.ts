import type { DesignDocument, DesignElement } from "@slopcade/protocol/design";
import { nanoid } from "nanoid";

// ── Op types ─────────────────────────────────────────────────────────────────

export type CanvasOp =
	| {
			type: "addFrame";
			id?: string;
			title?: string;
			width?: number;
			height?: number;
			x?: number;
			y?: number;
	  }
	| { type: "updateFrame"; id: string; patch: Record<string, unknown> }
	| { type: "deleteFrame"; id: string }
	| {
			type: "addElement";
			frameId: string;
			element: Omit<DesignElement, "id"> & { id?: string };
	  }
	| {
			type: "updateElement";
			frameId: string;
			elementId: string;
			patch: Record<string, unknown>;
	  }
	| { type: "deleteElement"; frameId: string; elementId: string };

// ── Apply function ────────────────────────────────────────────────────────────

/**
 * Apply a batch of canvas operations to a DesignDocument.
 * Pure function — returns a new document, never mutates input.
 */
export function applyCanvasOps(
	doc: DesignDocument,
	ops: CanvasOp[],
): DesignDocument {
	let frames = [...doc.frames];

	for (const op of ops) {
		switch (op.type) {
			case "addFrame": {
				const newFrame = {
					id: op.id ?? `frame-${nanoid(8)}`,
					title: op.title ?? "New Frame",
					width: op.width ?? 1440,
					height: op.height ?? 900,
					position: { x: op.x ?? 0, y: op.y ?? 0 },
					elements: [],
				};
				frames = [...frames, newFrame];
				break;
			}

			case "updateFrame": {
				frames = frames.map((f) =>
					f.id === op.id ? { ...f, ...op.patch, id: f.id } : f,
				);
				break;
			}

			case "deleteFrame": {
				frames = frames.filter((f) => f.id !== op.id);
				break;
			}

			case "addElement": {
				frames = frames.map((f) => {
					if (f.id !== op.frameId) return f;
				const newElement = { id: nanoid(8), ...op.element } as DesignElement;
					return { ...f, elements: [...f.elements, newElement] };
				});
				break;
			}

			case "updateElement": {
				frames = frames.map((f) => {
					if (f.id !== op.frameId) return f;
					return {
						...f,
						elements: f.elements.map((el) =>
						el.id === op.elementId ? ({ ...el, ...op.patch, id: el.id } as DesignElement) : el,
						),
					};
				});
				break;
			}

			case "deleteElement": {
				frames = frames.map((f) => {
					if (f.id !== op.frameId) return f;
					return {
						...f,
						elements: f.elements.filter((el) => el.id !== op.elementId),
					};
				});
				break;
			}
		}
	}

	return {
		...doc,
		frames,
		metadata: { ...doc.metadata, updatedAt: Date.now() },
	};
}
