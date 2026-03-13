import type { PenFill, PenNode, PenStroke } from "@slopcade/protocol/pen";

// ── FieldValue ───────────────────────────────────────────────────────────────

export type FieldValue<T> =
	| { kind: "single"; value: T }
	| { kind: "mixed" }
	| { kind: "absent" };

// ── Fill / stroke extractors ──────────────────────────────────────────────────

/** Extracts a flat CSS color string from a PenFill value, or null if none applies. */
export function getPrimaryFillColor(fill: PenFill | undefined): string | null {
	if (fill == null) return null;
	if (typeof fill === "string") return fill;
	if (Array.isArray(fill)) {
		for (const item of fill) {
			const c = getPrimaryFillColor(item as PenFill);
			if (c) return c;
		}
		return null;
	}
	if ("type" in fill && fill.type === "color") return fill.color;
	return null;
}

/** Extracts the primary CSS color from a PenStroke's fill field. */
export function getPrimaryStrokeColor(
	stroke: PenStroke | undefined,
): string | null {
	return stroke?.fill != null ? getPrimaryFillColor(stroke.fill) : null;
}

/** Extracts the stroke thickness as a number, or null if unset/non-numeric. */
export function getPrimaryStrokeThickness(
	stroke: PenStroke | undefined,
): number | null {
	if (stroke?.thickness === undefined) return null;
	return typeof stroke.thickness === "number" ? stroke.thickness : null;
}

// ── Node capability predicates ────────────────────────────────────────────────

const FILL_TYPE_SET = new Set<string>([
	"rectangle",
	"ellipse",
	"polygon",
	"path",
	"text",
	"icon_font",
	"frame",
]);

const STROKE_TYPE_SET = new Set<string>([
	"rectangle",
	"ellipse",
	"polygon",
	"path",
	"line",
	"frame",
]);

const NO_WH_TYPE_SET = new Set<string>(["line", "connection"]);

export function nodeHasFill(type: PenNode["type"]): boolean {
	return FILL_TYPE_SET.has(type);
}

export function nodeHasStroke(type: PenNode["type"]): boolean {
	return STROKE_TYPE_SET.has(type);
}

export function nodeHasWidthHeight(type: PenNode["type"]): boolean {
	return !NO_WH_TYPE_SET.has(type);
}

// ── Shared-field computations ─────────────────────────────────────────────────

/**
 * Computes the shared numeric field value across applicable nodes.
 * - "single": all applicable nodes have the same value
 * - "mixed": applicable nodes have different values
 * - "absent": no applicable nodes or all values are undefined
 */
export function computeSharedNumericField(
	nodes: PenNode[],
	getter: (node: PenNode) => number | undefined,
	isApplicable?: (node: PenNode) => boolean,
): FieldValue<number> {
	const applicable = isApplicable ? nodes.filter(isApplicable) : nodes;
	if (applicable.length === 0) return { kind: "absent" };
	const values = applicable.map(getter);
	const first = values[0];
	if (values.every((v) => v === first)) {
		return first !== undefined
			? { kind: "single", value: first }
			: { kind: "absent" };
	}
	return { kind: "mixed" };
}

/**
 * Computes the shared string field value across applicable nodes.
 * Returns "absent" when all values are null/undefined, "mixed" when they differ.
 */
export function computeSharedStringField(
	nodes: PenNode[],
	getter: (node: PenNode) => string | null | undefined,
	isApplicable?: (node: PenNode) => boolean,
): FieldValue<string> {
	const applicable = isApplicable ? nodes.filter(isApplicable) : nodes;
	if (applicable.length === 0) return { kind: "absent" };
	const values = applicable.map(getter);
	const first = values[0];
	if (values.every((v) => v === first)) {
		return first != null
			? { kind: "single", value: first }
			: { kind: "absent" };
	}
	return { kind: "mixed" };
}
