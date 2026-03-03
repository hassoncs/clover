import {
	type PenToolFacade,
	type RuntimeNode,
	sceneGraphToPenDocument,
} from "@slopcade/design-canvas/pen/runtime";
import type { PenDocument } from "@slopcade/shared/types/pen";
import { z } from "zod";

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

function mutationErrorToMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	return "Unknown error";
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const NodeIdInput = z.object({ id: z.string().min(1) });

const SearchNodesInput = z.object({
	namePattern: z.string().min(1).optional(),
	type: z.string().min(1).optional(),
	reusable: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

export function pencil_get_document(
	facade: PenToolFacade,
	_rawInput: unknown,
): ToolResult<{ document: PenDocument }> {
	try {
		const doc = sceneGraphToPenDocument(facade.graph);
		return ok({ document: doc });
	} catch (error) {
		return fail(mutationErrorToMessage(error));
	}
}

export function pencil_get_ancestors(
	facade: PenToolFacade,
	rawInput: unknown,
): ToolResult<{ ancestors: RuntimeNode[] }> {
	const parsed = parseInput(NodeIdInput, rawInput);
	if (!parsed.success) return parsed;

	try {
		const ancestors = facade.getAncestors(parsed.data.id);
		return ok({ ancestors });
	} catch (error) {
		return fail(mutationErrorToMessage(error));
	}
}

export function pencil_get_descendants(
	facade: PenToolFacade,
	rawInput: unknown,
): ToolResult<{ descendants: RuntimeNode[] }> {
	const parsed = parseInput(NodeIdInput, rawInput);
	if (!parsed.success) return parsed;

	try {
		const descendants = facade.getDescendants(parsed.data.id);
		return ok({ descendants });
	} catch (error) {
		return fail(mutationErrorToMessage(error));
	}
}

export function pencil_search_nodes(
	facade: PenToolFacade,
	rawInput: unknown,
): ToolResult<{ nodes: RuntimeNode[] }> {
	const parsed = parseInput(SearchNodesInput, rawInput);
	if (!parsed.success) return parsed;

	const { namePattern, type, reusable } = parsed.data;
	const needle = namePattern?.toLowerCase();

	const nodes = facade.findNodes((node: Readonly<RuntimeNode>) => {
		if (type && node.type !== type) return false;
		if (reusable !== undefined && node.reusable !== reusable) return false;
		if (needle) {
			const name = node.name ?? "";
			if (!name.toLowerCase().includes(needle)) return false;
		}
		return true;
	});

	return ok({ nodes });
}

export function pencil_get_selection(
	_facade: PenToolFacade,
	rawInput: unknown,
): ToolResult<{ selectedIds: string[] }> {
	// Selection is passed in via context — the MCP layer provides it
	const parsed = parseInput(
		z
			.object({
				selectedIds: z.array(z.string()).optional(),
			})
			.optional(),
		rawInput,
	);
	if (!parsed.success) return parsed;

	const selectedIds = parsed.data?.selectedIds ?? [];
	return ok({ selectedIds });
}
