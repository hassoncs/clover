import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
	PenToolFacade,
	penDocumentToSceneGraph,
	SceneGraph,
	sceneGraphToPenDocument,
} from "@slopcade/design-canvas/pen/runtime";
import { z } from "zod";
import { ServerBridge } from "../server-bridge.js";
import type { GameInspectorState } from "../types.js";

type ToolSuccess<T> = { success: true; data: T };
type ToolFailure = { success: false; error: string };
type ToolResult<T> = ToolSuccess<T> | ToolFailure;

function ok<T>(data: T): ToolSuccess<T> {
	return { success: true, data };
}

function fail(error: string): ToolFailure {
	return { success: false, error };
}

function parseInput<T extends z.ZodTypeAny>(
	schema: T,
	rawInput: unknown,
): ToolResult<z.infer<T>> {
	const parsed = schema.safeParse(rawInput);
	if (!parsed.success) {
		return fail(
			parsed.error.issues.map((issue: z.ZodIssue) => issue.message).join("; "),
		);
	}
	return ok(parsed.data);
}

function getFacade(): PenToolFacade {
	const bridge = ServerBridge.getInstance();
	if (bridge) return bridge;
	// Fallback: create a fresh facade for headless use
	return new PenToolFacade(new SceneGraph());
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const NewDocumentInput = z.object({
	width: z.number().optional().describe("Optional canvas width hint"),
	height: z.number().optional().describe("Optional canvas height hint"),
});

const SaveDocumentInput = z.object({
	pretty: z.boolean().optional().describe("Pretty-print the JSON output"),
});

const LoadDocumentInput = z.object({
	json: z.string().min(1).describe("PenDocument JSON string to load"),
});

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

/**
 * Create a new empty document. Resets the current SceneGraph to an empty state.
 * Returns the empty document structure.
 */
export function pencil_new_document(
	facade: PenToolFacade,
	rawInput: unknown,
): ToolResult<{ nodeCount: number; message: string }> {
	const parsed = parseInput(NewDocumentInput, rawInput);
	if (!parsed.success) return parsed;

	try {
		// Clear all nodes from the graph by deleting root children
		const graph = facade.graph;
		const root = graph.getNode("__root__");
		if (root) {
			// Delete all top-level children
			const childIds = [...root.childIds];
			for (const id of childIds) {
				try {
					facade.deleteNode(id);
				} catch {
					// Ignore errors for individual node deletions
				}
			}
		}
		return ok({
			nodeCount: 0,
			message: "New document created — canvas cleared",
		});
	} catch (error) {
		return fail(
			error instanceof Error ? error.message : "Failed to create new document",
		);
	}
}

/**
 * Save the current document as a JSON string.
 * Returns the serialized PenDocument.
 */
export function pencil_save_document(
	facade: PenToolFacade,
	rawInput: unknown,
): ToolResult<{ json: string; nodeCount: number }> {
	const parsed = parseInput(SaveDocumentInput, rawInput);
	if (!parsed.success) return parsed;

	try {
		const graph = facade.graph;
		const document = sceneGraphToPenDocument(graph);
		const json = parsed.data.pretty
			? JSON.stringify(document, null, 2)
			: JSON.stringify(document);
		const nodeCount = document.children.length;
		return ok({ json, nodeCount });
	} catch (error) {
		return fail(
			error instanceof Error ? error.message : "Failed to save document",
		);
	}
}

/**
 * Load a document from a JSON string. Replaces the current document.
 */
export function pencil_load_document(
	facade: PenToolFacade,
	rawInput: unknown,
): ToolResult<{ nodeCount: number; message: string }> {
	const parsed = parseInput(LoadDocumentInput, rawInput);
	if (!parsed.success) return parsed;

	try {
		const penDoc = JSON.parse(parsed.data.json);
		const newGraph = penDocumentToSceneGraph(penDoc);

		// Replace the current graph contents
		const graph = facade.graph;
		const root = graph.getNode("__root__");
		if (root) {
			// Delete existing children
			const childIds = [...root.childIds];
			for (const id of childIds) {
				try {
					facade.deleteNode(id);
				} catch {
					// Ignore
				}
			}
		}

		// Copy nodes from new graph into current graph
		const newRoot = newGraph.getNode("__root__");
		if (newRoot) {
			for (const childId of newRoot.childIds) {
				const child = newGraph.getNode(childId);
				if (child) {
					// Create the node in the current graph
					const { type, ...props } = child;
					facade.createNode(
						type as Parameters<typeof facade.createNode>[0],
						"__root__",
						props,
					);
				}
			}
		}

		const nodeCount = newRoot?.childIds.length ?? 0;
		return ok({
			nodeCount,
			message: `Document loaded — ${nodeCount} top-level nodes`,
		});
	} catch (error) {
		return fail(
			error instanceof Error
				? error.message
				: "Failed to load document — invalid JSON or schema",
		);
	}
}

// ---------------------------------------------------------------------------
// MCP registration
// ---------------------------------------------------------------------------

export function registerPencilV2LifecycleTools(
	server: McpServer,
	_state: GameInspectorState,
): void {
	server.tool(
		"pencil_new_document",
		"Create a new empty Pencil document. Clears all nodes from the current canvas.",
		{
			width: z.number().optional().describe("Optional canvas width hint"),
			height: z.number().optional().describe("Optional canvas height hint"),
		},
		async (args) => {
			const facade = getFacade();
			const result = pencil_new_document(facade, args);
			return {
				content: [{ type: "text", text: JSON.stringify(result) }],
			};
		},
	);

	server.tool(
		"pencil_save_document",
		"Save the current Pencil document as a JSON string. Returns the serialized PenDocument.",
		{
			pretty: z.boolean().optional().describe("Pretty-print the JSON output"),
		},
		async (args) => {
			const facade = getFacade();
			const result = pencil_save_document(facade, args);
			return {
				content: [{ type: "text", text: JSON.stringify(result) }],
			};
		},
	);

	server.tool(
		"pencil_load_document",
		"Load a Pencil document from a JSON string. Replaces the current document.",
		{
			json: z.string().min(1).describe("PenDocument JSON string to load"),
		},
		async (args) => {
			const facade = getFacade();
			const result = pencil_load_document(facade, args);
			return {
				content: [{ type: "text", text: JSON.stringify(result) }],
			};
		},
	);
}
