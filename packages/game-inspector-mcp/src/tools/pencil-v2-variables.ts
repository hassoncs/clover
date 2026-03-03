import type {
	PenToolFacade,
	RuntimeNode,
	RuntimeNodeUpdatePatch,
} from "@slopcade/design-canvas/pen/runtime";
import type { PenVariable } from "@slopcade/shared/types/pen";
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

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const CreateVariableInput = z.object({
	name: z.string().min(1),
	type: z.enum(["color", "number", "string", "boolean"]),
	value: z.union([z.string(), z.number(), z.boolean()]),
});

const UpdateVariableInput = z.object({
	name: z.string().min(1),
	value: z.union([z.string(), z.number(), z.boolean()]).optional(),
	type: z.enum(["color", "number", "string", "boolean"]).optional(),
});

const DeleteVariableInput = z.object({
	name: z.string().min(1),
});

const BindVariableInput = z.object({
	nodeId: z.string().min(1),
	property: z.string().min(1),
	variableName: z.string().min(1),
});

const GetVariablesInput = z
	.object({
		type: z.enum(["color", "number", "string", "boolean"]).optional(),
	})
	.optional();

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

export function pencil_create_variable(
	facade: PenToolFacade,
	rawInput: unknown,
): ToolResult<{ name: string; variable: PenVariable }> {
	const parsed = parseInput(CreateVariableInput, rawInput);
	if (!parsed.success) return parsed;

	const { name, type, value } = parsed.data;

	if (facade.graph.variables.has(name)) {
		return fail(`Variable "${name}" already exists`);
	}

	const variable: PenVariable = { type, value };
	facade.graph.variables.set(name, variable);

	return ok({ name, variable });
}

export function pencil_update_variable(
	facade: PenToolFacade,
	rawInput: unknown,
): ToolResult<{ name: string; variable: PenVariable }> {
	const parsed = parseInput(UpdateVariableInput, rawInput);
	if (!parsed.success) return parsed;

	const { name, value, type } = parsed.data;

	const existing = facade.graph.variables.get(name);
	if (!existing) {
		return fail(`Variable "${name}" not found`);
	}

	const updated: PenVariable = {
		type: type ?? existing.type,
		value: value ?? existing.value,
	};
	facade.graph.variables.set(name, updated);

	return ok({ name, variable: updated });
}

export function pencil_delete_variable(
	facade: PenToolFacade,
	rawInput: unknown,
): ToolResult<{ deletedName: string }> {
	const parsed = parseInput(DeleteVariableInput, rawInput);
	if (!parsed.success) return parsed;

	const { name } = parsed.data;

	if (!facade.graph.variables.has(name)) {
		return fail(`Variable "${name}" not found`);
	}

	facade.graph.variables.delete(name);
	return ok({ deletedName: name });
}

export function pencil_bind_variable(
	facade: PenToolFacade,
	rawInput: unknown,
): ToolResult<{ node: RuntimeNode; property: string; variableName: string }> {
	const parsed = parseInput(BindVariableInput, rawInput);
	if (!parsed.success) return parsed;

	const { nodeId, property, variableName } = parsed.data;

	const node = facade.getNode(nodeId);
	if (!node) {
		return fail(`Node "${nodeId}" not found`);
	}

	if (!facade.graph.variables.has(variableName)) {
		return fail(`Variable "${variableName}" not found`);
	}

	try {
		const existingTheme = node.theme ?? {};
		facade.updateNode(nodeId, {
			theme: { ...existingTheme, [property]: variableName },
		} as RuntimeNodeUpdatePatch);

		const updated = facade.getNode(nodeId);
		if (!updated) {
			return fail(`Node "${nodeId}" not found after binding`);
		}
		return ok({ node: updated, property, variableName });
	} catch (error) {
		if (error instanceof Error) {
			return fail(error.message);
		}
		return fail("Unknown error");
	}
}

export function pencil_get_variables(
	facade: PenToolFacade,
	rawInput: unknown,
): ToolResult<{ variables: Array<{ name: string; variable: PenVariable }> }> {
	const parsed = parseInput(
		GetVariablesInput ?? z.object({}).optional(),
		rawInput,
	);
	if (!parsed.success) return parsed;

	const typeFilter = parsed.data?.type;
	const variables: Array<{ name: string; variable: PenVariable }> = [];

	for (const [name, variable] of facade.graph.variables) {
		if (typeFilter && variable.type !== typeFilter) continue;
		variables.push({ name, variable });
	}

	return ok({ variables });
}
