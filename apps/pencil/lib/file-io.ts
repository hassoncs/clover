import { exportFig, importFig } from "@slopcade/design-canvas/pen/fig";
import {
	penDocumentToSceneGraph,
	type SceneGraph,
	sceneGraphToPenDocument,
} from "@slopcade/design-canvas/pen/runtime";
import type { PenDocument } from "@slopcade/shared/types/pen";
import { parsePenDocument } from "@slopcade/shared/types/pen";

export class FileIOError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "FileIOError";
	}
}

/**
 * Parse a .pen JSON string into a SceneGraph.
 * Throws FileIOError for invalid JSON or malformed PenDocument structure.
 */
export function loadPenFile(json: string): SceneGraph {
	let raw: unknown;
	try {
		raw = JSON.parse(json);
	} catch {
		throw new FileIOError(`Invalid JSON: ${json.slice(0, 50)}`);
	}

	let doc: PenDocument;
	try {
		doc = parsePenDocument(raw);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		throw new FileIOError(`Malformed .pen document: ${msg}`);
	}

	return penDocumentToSceneGraph(doc);
}

/**
 * Serialize a SceneGraph back to a .pen JSON string.
 */
export function savePenFile(graph: SceneGraph): string {
	const doc = sceneGraphToPenDocument(graph);
	return JSON.stringify(doc);
}

/**
 * Import a .fig binary buffer into a SceneGraph.
 * Warnings from unsupported Figma features are silently discarded.
 */
export function loadFigFile(buffer: ArrayBuffer): SceneGraph {
	const result = importFig(buffer);
	return result.graph;
}

/**
 * Export a SceneGraph to a .fig binary buffer.
 * Warnings from unsupported features are silently discarded.
 */
export function saveFigFile(graph: SceneGraph): ArrayBuffer {
	const result = exportFig(graph);
	return result.buffer;
}

/**
 * Always throws FileIOError. Use this as a type-safe rejection handler
 * when file input is known to be corrupt or unrecognized.
 */
export function loadCorruptFile(data: unknown): never {
	throw new FileIOError(
		`Cannot load corrupt file: expected a valid .pen JSON string or .fig ArrayBuffer, got ${typeof data}`,
	);
}
