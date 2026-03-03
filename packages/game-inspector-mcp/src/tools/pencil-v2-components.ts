import type {
	PenToolFacade,
	RuntimeNode,
	RuntimeNodeUpdatePatch,
} from "@slopcade/design-canvas/pen/runtime";
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

const CreateComponentInput = z.object({
	id: z.string().min(1),
});

const CreateInstanceInput = z.object({
	componentId: z.string().min(1),
	parentId: z.string().min(1).optional(),
	props: z.record(z.unknown()).optional(),
});

const DetachInstanceInput = z.object({
	id: z.string().min(1),
});

const SetInstanceOverrideInput = z.object({
	id: z.string().min(1),
	descendantPath: z.string().min(1),
	overrides: z.record(z.unknown()),
});

const ResetInstanceOverrideInput = z.object({
	id: z.string().min(1),
	descendantPath: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

export function pencil_create_component(
	facade: PenToolFacade,
	rawInput: unknown,
): ToolResult<{ node: RuntimeNode; undoType: string }> {
	const parsed = parseInput(CreateComponentInput, rawInput);
	if (!parsed.success) return parsed;

	const node = facade.getNode(parsed.data.id);
	if (!node) {
		return fail(`Node "${parsed.data.id}" not found`);
	}

	if (node.type !== "frame" && node.type !== "group") {
		return fail(
			`Node "${parsed.data.id}" must be a frame or group to become a component, got "${node.type}"`,
		);
	}

	try {
		const undo = facade.updateNode(parsed.data.id, {
			reusable: true,
		} as RuntimeNodeUpdatePatch);
		const updated = facade.getNode(parsed.data.id);
		if (!updated) {
			return fail(`Node "${parsed.data.id}" not found after update`);
		}
		return ok({ node: updated, undoType: undo.type });
	} catch (error) {
		return fail(mutationErrorToMessage(error));
	}
}

export function pencil_create_instance(
	facade: PenToolFacade,
	rawInput: unknown,
): ToolResult<{ node: RuntimeNode; undoType: string }> {
	const parsed = parseInput(CreateInstanceInput, rawInput);
	if (!parsed.success) return parsed;

	const component = facade.getNode(parsed.data.componentId);
	if (!component) {
		return fail(`Component "${parsed.data.componentId}" not found`);
	}

	if (!component.reusable) {
		return fail(
			`Node "${parsed.data.componentId}" is not a reusable component`,
		);
	}

	const parentId = parsed.data.parentId ?? facade.graph.rootId;

	try {
		const { node, undo } = facade.createNode("ref", parentId, {
			ref: parsed.data.componentId,
			...(parsed.data.props ?? {}),
		});
		return ok({ node, undoType: undo.type });
	} catch (error) {
		return fail(mutationErrorToMessage(error));
	}
}

export function pencil_detach_instance(
	facade: PenToolFacade,
	rawInput: unknown,
): ToolResult<{ node: RuntimeNode; undoType: string }> {
	const parsed = parseInput(DetachInstanceInput, rawInput);
	if (!parsed.success) return parsed;

	const node = facade.getNode(parsed.data.id);
	if (!node) {
		return fail(`Node "${parsed.data.id}" not found`);
	}

	if (node.type !== "ref") {
		return fail(
			`Node "${parsed.data.id}" is not a ref instance, got "${node.type}"`,
		);
	}

	try {
		const parentId = node.parentId;
		if (!parentId) {
			return fail(`Node "${parsed.data.id}" has no parent`);
		}

		const preservedProps = {
			id: node.id,
			name: node.name,
			x: node.x,
			y: node.y,
			width: node.width,
			height: node.height,
		};

		facade.deleteNode(parsed.data.id);
		const { node: newNode, undo } = facade.createNode("frame", parentId, preservedProps);

		return ok({ node: newNode, undoType: undo.type });
	} catch (error) {
		return fail(mutationErrorToMessage(error));
	}
		return fail(mutationErrorToMessage(error));
}

export function pencil_set_instance_override(
	facade: PenToolFacade,
	rawInput: unknown,
): ToolResult<{ node: RuntimeNode; undoType: string }> {
	const parsed = parseInput(SetInstanceOverrideInput, rawInput);
	if (!parsed.success) return parsed;

	const node = facade.getNode(parsed.data.id);
	if (!node) {
		return fail(`Node "${parsed.data.id}" not found`);
	}

	if (node.type !== "ref") {
		return fail(
			`Node "${parsed.data.id}" is not a ref instance, got "${node.type}"`,
		);
	}

	try {
		const existingDescendants = node.descendants ?? {};
		const updatedDescendants = {
			...existingDescendants,
			[parsed.data.descendantPath]: parsed.data.overrides,
		};

		const undo = facade.updateNode(parsed.data.id, {
			descendants: updatedDescendants,
		} as RuntimeNodeUpdatePatch);

		const updated = facade.getNode(parsed.data.id);
		if (!updated) {
			return fail(`Node "${parsed.data.id}" not found after override`);
		}
		return ok({ node: updated, undoType: undo.type });
	} catch (error) {
		return fail(mutationErrorToMessage(error));
	}
}

export function pencil_reset_instance_override(
	facade: PenToolFacade,
	rawInput: unknown,
): ToolResult<{ node: RuntimeNode; undoType: string }> {
	const parsed = parseInput(ResetInstanceOverrideInput, rawInput);
	if (!parsed.success) return parsed;

	const node = facade.getNode(parsed.data.id);
	if (!node) {
		return fail(`Node "${parsed.data.id}" not found`);
	}

	if (node.type !== "ref") {
		return fail(
			`Node "${parsed.data.id}" is not a ref instance, got "${node.type}"`,
		);
	}

	try {
		const existingDescendants = node.descendants ?? {};
		const { [parsed.data.descendantPath]: _, ...remaining } =
			existingDescendants as Record<string, unknown>;

		const undo = facade.updateNode(parsed.data.id, {
			descendants: Object.keys(remaining).length > 0 ? remaining : undefined,
		} as RuntimeNodeUpdatePatch);

		const updated = facade.getNode(parsed.data.id);
		if (!updated) {
			return fail(`Node "${parsed.data.id}" not found after reset`);
		}
		return ok({ node: updated, undoType: undo.type });
	} catch (error) {
		return fail(mutationErrorToMessage(error));
	}
}
