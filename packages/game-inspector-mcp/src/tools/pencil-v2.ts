import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
	CycleError,
	type PenNodeType,
	PenToolFacade,
	RuntimeGraphError,
	type RuntimeNode,
	type RuntimeNodeCreateProps,
	type RuntimeNodeUpdatePatch,
	SceneGraph,
} from "@slopcade/design-canvas/pen/runtime";
import { z } from "zod";
import type { GameInspectorState } from "../types.js";
import { ServerBridge } from "../server-bridge.js";

type ToolSuccess<T> = { success: true; data: T };
type ToolFailure = { success: false; error: string };
type ToolResult<T> = ToolSuccess<T> | ToolFailure;

const _fallbackFacade = new PenToolFacade(new SceneGraph());

function getFacade(): PenToolFacade {
	const bridge = ServerBridge.getInstance();
	return bridge ?? _fallbackFacade;
}

const NodeIdInput = z.object({ id: z.string().min(1) });
const GetChildrenInput = z.object({ id: z.string().min(1) });
const FindNodesInput = z.object({
	type: z.string().min(1).optional(),
	namePattern: z.string().min(1).optional(),
	caseSensitive: z.boolean().optional(),
});
const CreateNodeInput = z.object({
	type: z.enum([
		"frame",
		"group",
		"rectangle",
		"ellipse",
		"line",
		"polygon",
		"path",
		"text",
		"connection",
		"note",
		"icon_font",
		"image",
		"ref",
	]),
	parentId: z.string().min(1).optional(),
	props: z.record(z.unknown()).optional(),
});
const UpdateNodeInput = z.object({
	id: z.string().min(1),
	patch: z.record(z.unknown()),
});
const ReparentNodeInput = z.object({
	id: z.string().min(1),
	newParentId: z.string().min(1),
});
const SetFillInput = z.object({
	id: z.string().min(1),
	fill: z.record(z.unknown()),
});
const SetStrokeInput = z.object({
	id: z.string().min(1),
	stroke: z.record(z.unknown()),
});
const SetLayoutBaseInput = z.object({
	id: z.string().min(1),
	layout: z.enum(["horizontal", "vertical", "none"]).optional(),
	gap: z.number().optional(),
	padding: z
		.object({
			top: z.number().optional(),
			right: z.number().optional(),
			bottom: z.number().optional(),
			left: z.number().optional(),
		})
		.optional(),
	justifyContent: z
		.enum(["start", "center", "end", "space-between", "space-around"])
		.optional(),
	alignItems: z.enum(["start", "center", "end", "stretch"]).optional(),
	clip: z.boolean().optional(),
});
const SetLayoutInput = SetLayoutBaseInput.refine(
	(input) =>
		input.layout !== undefined ||
		input.gap !== undefined ||
		input.padding !== undefined ||
		input.justifyContent !== undefined ||
		input.alignItems !== undefined ||
		input.clip !== undefined,
	{
		message: "At least one layout property must be provided",
	},
);

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

function toPenPadding(
	padding:
		| {
				top?: number;
				right?: number;
				bottom?: number;
				left?: number;
		  }
		| undefined,
): RuntimeNode["padding"] | undefined {
	if (!padding) {
		return undefined;
	}

	const top = padding.top ?? 0;
	const right = padding.right ?? 0;
	const bottom = padding.bottom ?? 0;
	const left = padding.left ?? 0;

	return [top, right, bottom, left];
}

export function pencil_get_node(
	facade: PenToolFacade,
	rawInput: unknown,
): ToolResult<RuntimeNode> {
	const parsed = parseInput(NodeIdInput, rawInput);
	if (!parsed.success) return parsed;

	const node = facade.getNode(parsed.data.id);
	if (!node) {
		return fail(`Node "${parsed.data.id}" not found`);
	}

	return ok(node);
}

export function pencil_get_children(
	facade: PenToolFacade,
	rawInput: unknown,
): ToolResult<RuntimeNode[]> {
	const parsed = parseInput(GetChildrenInput, rawInput);
	if (!parsed.success) return parsed;

	try {
		return ok(facade.getChildren(parsed.data.id));
	} catch (error) {
		return fail(mutationErrorToMessage(error));
	}
}

export function pencil_find_nodes(
	facade: PenToolFacade,
	rawInput: unknown,
): ToolResult<RuntimeNode[]> {
	const parsed = parseInput(FindNodesInput, rawInput);
	if (!parsed.success) return parsed;

	const { type, namePattern, caseSensitive = false } = parsed.data;
	const needle = namePattern
		? caseSensitive
			? namePattern
			: namePattern.toLowerCase()
		: undefined;

	const nodes = facade.findNodes((node: Readonly<RuntimeNode>) => {
		if (type && node.type !== type) {
			return false;
		}

		if (!needle) {
			return true;
		}

		const name = node.name ?? "";
		if (caseSensitive) {
			return name.includes(needle);
		}

		return name.toLowerCase().includes(needle);
	});

	return ok(nodes);
}

export function pencil_create_node(
	facade: PenToolFacade,
	rawInput: unknown,
): ToolResult<{ node: RuntimeNode; undoType: string }> {
	const parsed = parseInput(CreateNodeInput, rawInput);
	if (!parsed.success) return parsed;

	const parentId = parsed.data.parentId ?? facade.graph.rootId;

	try {
		const { node, undo } = facade.createNode(
			parsed.data.type as PenNodeType,
			parentId,
			(parsed.data.props ?? {}) as RuntimeNodeCreateProps,
		);

		return ok({ node, undoType: undo.type });
	} catch (error) {
		return fail(mutationErrorToMessage(error));
	}
}

export function pencil_update_node(
	facade: PenToolFacade,
	rawInput: unknown,
): ToolResult<{ node: RuntimeNode; undoType: string }> {
	const parsed = parseInput(UpdateNodeInput, rawInput);
	if (!parsed.success) return parsed;

	try {
		const undo = facade.updateNode(
			parsed.data.id,
			parsed.data.patch as RuntimeNodeUpdatePatch,
		);
		const node = facade.getNode(parsed.data.id);
		if (!node) {
			return fail(`Node "${parsed.data.id}" not found after update`);
		}

		return ok({ node, undoType: undo.type });
	} catch (error) {
		return fail(mutationErrorToMessage(error));
	}
}

export function pencil_delete_node(
	facade: PenToolFacade,
	rawInput: unknown,
): ToolResult<{ deletedId: string; undoType: string }> {
	const parsed = parseInput(NodeIdInput, rawInput);
	if (!parsed.success) return parsed;

	try {
		const undo = facade.deleteNode(parsed.data.id);
		return ok({ deletedId: parsed.data.id, undoType: undo.type });
	} catch (error) {
		return fail(mutationErrorToMessage(error));
	}
}

export function pencil_reparent_node(
	facade: PenToolFacade,
	rawInput: unknown,
): ToolResult<{ node: RuntimeNode; undoType: string }> {
	const parsed = parseInput(ReparentNodeInput, rawInput);
	if (!parsed.success) return parsed;

	try {
		const undo = facade.reparentNode(parsed.data.id, parsed.data.newParentId);
		const node = facade.getNode(parsed.data.id);
		if (!node) {
			return fail(`Node "${parsed.data.id}" not found after reparent`);
		}

		return ok({ node, undoType: undo.type });
	} catch (error) {
		return fail(mutationErrorToMessage(error));
	}
}

export function pencil_set_fill(
	facade: PenToolFacade,
	rawInput: unknown,
): ToolResult<{ node: RuntimeNode; undoType: string }> {
	const parsed = parseInput(SetFillInput, rawInput);
	if (!parsed.success) return parsed;

	try {
		const undo = facade.updateNode(parsed.data.id, {
			fill: parsed.data.fill as RuntimeNode["fill"],
		});
		const node = facade.getNode(parsed.data.id);
		if (!node) {
			return fail(`Node "${parsed.data.id}" not found after set_fill`);
		}

		return ok({ node, undoType: undo.type });
	} catch (error) {
		return fail(mutationErrorToMessage(error));
	}
}

export function pencil_set_stroke(
	facade: PenToolFacade,
	rawInput: unknown,
): ToolResult<{ node: RuntimeNode; undoType: string }> {
	const parsed = parseInput(SetStrokeInput, rawInput);
	if (!parsed.success) return parsed;

	try {
		const undo = facade.updateNode(parsed.data.id, {
			stroke: parsed.data.stroke as RuntimeNode["stroke"],
		});
		const node = facade.getNode(parsed.data.id);
		if (!node) {
			return fail(`Node "${parsed.data.id}" not found after set_stroke`);
		}

		return ok({ node, undoType: undo.type });
	} catch (error) {
		return fail(mutationErrorToMessage(error));
	}
}

export function pencil_set_layout(
	facade: PenToolFacade,
	rawInput: unknown,
): ToolResult<{ node: RuntimeNode; undoType: string }> {
	const parsed = parseInput(SetLayoutInput, rawInput);
	if (!parsed.success) return parsed;

	const existing = facade.getNode(parsed.data.id);
	if (!existing) {
		return fail(`Node "${parsed.data.id}" not found`);
	}

	if (existing.type !== "frame") {
		return fail(`Node "${parsed.data.id}" is not a frame`);
	}

	try {
		const undo = facade.updateNode(parsed.data.id, {
			layout: parsed.data.layout,
			gap: parsed.data.gap,
			padding: toPenPadding(parsed.data.padding),
			justifyContent: parsed.data.justifyContent,
			alignItems: parsed.data.alignItems,
			clip: parsed.data.clip,
		});

		const node = facade.getNode(parsed.data.id);
		if (!node) {
			return fail(`Node "${parsed.data.id}" not found after set_layout`);
		}

		return ok({ node, undoType: undo.type });
	} catch (error) {
		return fail(mutationErrorToMessage(error));
	}
}

function toMcpText(result: ToolResult<unknown>): {
	content: [{ type: "text"; text: string }];
} {
	return {
		content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
	};
}

export function registerPencilV2Tools(
	server: McpServer,
	_state: GameInspectorState,
) {
	server.tool(
		"pencil_get_node",
		"Get a node by id from the pen scene graph.",
		{ id: z.string() },
		async (args: Record<string, unknown>) =>
			toMcpText(pencil_get_node(getFacade(), args)),
	);
	server.tool(
		"pencil_get_children",
		"Get direct children of a node.",
		{ id: z.string() },
			async (args: Record<string, unknown>) =>
				toMcpText(pencil_get_children(getFacade(), args)),
	);

	server.tool(
		"pencil_find_nodes",
		"Find nodes by optional type and/or name pattern.",
		{
			type: z.string().optional(),
			namePattern: z.string().optional(),
			caseSensitive: z.boolean().optional(),
		},
			async (args: Record<string, unknown>) =>
				toMcpText(pencil_find_nodes(getFacade(), args)),
	);

	server.tool(
		"pencil_create_node",
		"Create a node under a parent using PenToolFacade.",
		{
			type: z.string(),
			parentId: z.string().optional(),
			props: z.record(z.unknown()).optional(),
		},
			async (args: Record<string, unknown>) =>
				toMcpText(pencil_create_node(getFacade(), args)),
	);

	server.tool(
		"pencil_update_node",
		"Update mutable node properties by patch.",
		{ id: z.string(), patch: z.record(z.unknown()) },
			async (args: Record<string, unknown>) =>
				toMcpText(pencil_update_node(getFacade(), args)),
	);

	server.tool(
		"pencil_delete_node",
		"Delete a node and its subtree.",
		{ id: z.string() },
			async (args: Record<string, unknown>) =>
				toMcpText(pencil_delete_node(getFacade(), args)),
	);

	server.tool(
		"pencil_reparent_node",
		"Move a node to a new parent.",
		{ id: z.string(), newParentId: z.string() },
			async (args: Record<string, unknown>) =>
				toMcpText(pencil_reparent_node(getFacade(), args)),
	);

	server.tool(
		"pencil_set_fill",
		"Set fill on a node.",
		{ id: z.string(), fill: z.record(z.unknown()) },
			async (args: Record<string, unknown>) =>
				toMcpText(pencil_set_fill(getFacade(), args)),
	);

	server.tool(
		"pencil_set_stroke",
		"Set stroke on a node.",
		{ id: z.string(), stroke: z.record(z.unknown()) },
			async (args: Record<string, unknown>) =>
				toMcpText(pencil_set_stroke(getFacade(), args)),
	);

	server.tool(
		"pencil_set_layout",
		"Set base layout properties on a frame node.",
		{
			id: z.string(),
			layout: z.enum(["horizontal", "vertical", "none"]).optional(),
			gap: z.number().optional(),
			padding: z
				.object({
					top: z.number().optional(),
					right: z.number().optional(),
					bottom: z.number().optional(),
					left: z.number().optional(),
				})
				.optional(),
			justifyContent: z
				.enum(["start", "center", "end", "space-between", "space-around"])
				.optional(),
			alignItems: z.enum(["start", "center", "end", "stretch"]).optional(),
			clip: z.boolean().optional(),
		},
			async (args: Record<string, unknown>) =>
				toMcpText(pencil_set_layout(getFacade(), args)),
	);
}
