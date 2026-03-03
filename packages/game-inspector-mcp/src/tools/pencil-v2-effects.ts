import type {
	PenToolFacade,
	RuntimeNode,
	RuntimeNodeUpdatePatch,
} from "@slopcade/design-canvas/pen/runtime";
import type { PenEffect } from "@slopcade/shared/types/pen";
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

const EffectItemSchema = z.object({
	shadow: z
		.object({
			color: z.string(),
			offsetX: z.number(),
			offsetY: z.number(),
			blur: z.number(),
			spread: z.number().optional(),
			inner: z.boolean().optional(),
			enabled: z.boolean().optional(),
		})
		.optional(),
	blur: z.number().optional(),
	background_blur: z.number().optional(),
	enabled: z.boolean().optional(),
});

const SetEffectsInput = z.object({
	id: z.string().min(1),
	effects: z.array(EffectItemSchema),
});

const SetCornerRadiusInput = z.object({
	id: z.string().min(1),
	radius: z.union([
		z.number().min(0),
		z.tuple([z.number(), z.number(), z.number(), z.number()]),
	]),
});

const SetOpacityInput = z.object({
	id: z.string().min(1),
	opacity: z.number().min(0).max(1),
});

const SetBlendModeInput = z.object({
	id: z.string().min(1),
	blendMode: z.string().min(1),
});

const SetTextStyleInput = z.object({
	id: z.string().min(1),
	fontSize: z.number().min(1).optional(),
	fontFamily: z.string().min(1).optional(),
	fontWeight: z.string().min(1).optional(),
	textAlign: z.enum(["left", "center", "right", "justify"]).optional(),
});

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

export function pencil_set_effects(
	facade: PenToolFacade,
	rawInput: unknown,
): ToolResult<{ node: RuntimeNode; undoType: string }> {
	const parsed = parseInput(SetEffectsInput, rawInput);
	if (!parsed.success) return parsed;

	const node = facade.getNode(parsed.data.id);
	if (!node) {
		return fail(`Node "${parsed.data.id}" not found`);
	}

	const supportsEffects = [
		"frame",
		"rectangle",
		"ellipse",
		"polygon",
		"path",
		"image",
	].includes(node.type);
	if (!supportsEffects) {
		return fail(
			`Node "${parsed.data.id}" of type "${node.type}" does not support effects`,
		);
	}

	try {
		const undo = facade.updateNode(parsed.data.id, {
			effects: parsed.data.effects as PenEffect[],
		} as RuntimeNodeUpdatePatch);

		const updated = facade.getNode(parsed.data.id);
		if (!updated) {
			return fail(`Node "${parsed.data.id}" not found after set_effects`);
		}
		return ok({ node: updated, undoType: undo.type });
	} catch (error) {
		return fail(mutationErrorToMessage(error));
	}
}

export function pencil_set_corner_radius(
	facade: PenToolFacade,
	rawInput: unknown,
): ToolResult<{ node: RuntimeNode; undoType: string }> {
	const parsed = parseInput(SetCornerRadiusInput, rawInput);
	if (!parsed.success) return parsed;

	const node = facade.getNode(parsed.data.id);
	if (!node) {
		return fail(`Node "${parsed.data.id}" not found`);
	}

	const supportsRadius = ["frame", "rectangle", "polygon"].includes(node.type);
	if (!supportsRadius) {
		return fail(
			`Node "${parsed.data.id}" of type "${node.type}" does not support corner radius`,
		);
	}

	try {
		const undo = facade.updateNode(parsed.data.id, {
			cornerRadius: parsed.data.radius,
		} as RuntimeNodeUpdatePatch);

		const updated = facade.getNode(parsed.data.id);
		if (!updated) {
			return fail(`Node "${parsed.data.id}" not found after set_corner_radius`);
		}
		return ok({ node: updated, undoType: undo.type });
	} catch (error) {
		return fail(mutationErrorToMessage(error));
	}
}

export function pencil_set_opacity(
	facade: PenToolFacade,
	rawInput: unknown,
): ToolResult<{ node: RuntimeNode; undoType: string }> {
	const parsed = parseInput(SetOpacityInput, rawInput);
	if (!parsed.success) return parsed;

	const node = facade.getNode(parsed.data.id);
	if (!node) {
		return fail(`Node "${parsed.data.id}" not found`);
	}

	try {
		const undo = facade.updateNode(parsed.data.id, {
			opacity: parsed.data.opacity,
		} as RuntimeNodeUpdatePatch);

		const updated = facade.getNode(parsed.data.id);
		if (!updated) {
			return fail(`Node "${parsed.data.id}" not found after set_opacity`);
		}
		return ok({ node: updated, undoType: undo.type });
	} catch (error) {
		return fail(mutationErrorToMessage(error));
	}
}

export function pencil_set_blend_mode(
	facade: PenToolFacade,
	rawInput: unknown,
): ToolResult<{ node: RuntimeNode; property: string; value: string }> {
	const parsed = parseInput(SetBlendModeInput, rawInput);
	if (!parsed.success) return parsed;

	const node = facade.getNode(parsed.data.id);
	if (!node) {
		return fail(`Node "${parsed.data.id}" not found`);
	}

	// blendMode is stored as a theme property since RuntimeNode doesn't have
	// a dedicated blendMode field — we store it via the generic theme map
	try {
		const existingTheme = node.theme ?? {};
		facade.updateNode(parsed.data.id, {
			theme: { ...existingTheme, blendMode: parsed.data.blendMode },
		} as RuntimeNodeUpdatePatch);

		const updated = facade.getNode(parsed.data.id);
		if (!updated) {
			return fail(`Node "${parsed.data.id}" not found after set_blend_mode`);
		}
		return ok({
			node: updated,
			property: "blendMode",
			value: parsed.data.blendMode,
		});
	} catch (error) {
		return fail(mutationErrorToMessage(error));
	}
}

export function pencil_set_text_style(
	facade: PenToolFacade,
	rawInput: unknown,
): ToolResult<{ node: RuntimeNode; undoType: string }> {
	const parsed = parseInput(
		SetTextStyleInput.refine(
			(input) =>
				input.fontSize !== undefined ||
				input.fontFamily !== undefined ||
				input.fontWeight !== undefined ||
				input.textAlign !== undefined,
			{ message: "At least one text style property must be provided" },
		),
		rawInput,
	);
	if (!parsed.success) return parsed;

	const node = facade.getNode(parsed.data.id);
	if (!node) {
		return fail(`Node "${parsed.data.id}" not found`);
	}

	if (node.type !== "text") {
		return fail(
			`Node "${parsed.data.id}" is not a text node, got "${node.type}"`,
		);
	}

	try {
		const patch: RuntimeNodeUpdatePatch = {};
		if (parsed.data.fontSize !== undefined)
			patch.fontSize = parsed.data.fontSize;
		if (parsed.data.fontFamily !== undefined)
			patch.fontFamily = parsed.data.fontFamily;
		if (parsed.data.fontWeight !== undefined)
			patch.fontWeight = parsed.data.fontWeight;
		if (parsed.data.textAlign !== undefined)
			patch.textAlign = parsed.data.textAlign;

		const undo = facade.updateNode(parsed.data.id, patch);

		const updated = facade.getNode(parsed.data.id);
		if (!updated) {
			return fail(`Node "${parsed.data.id}" not found after set_text_style`);
		}
		return ok({ node: updated, undoType: undo.type });
	} catch (error) {
		return fail(mutationErrorToMessage(error));
	}
}
