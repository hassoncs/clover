import type {
	PenFrame,
	PenNode,
	PenRectangle,
	PenText,
} from "@slopcade/shared/types/pen";
import { describe, expect, it } from "vitest";
import {
	computeSharedNumericField,
	computeSharedStringField,
	getPrimaryFillColor,
	getPrimaryStrokeColor,
	getPrimaryStrokeThickness,
	nodeHasFill,
	nodeHasStroke,
	nodeHasWidthHeight,
} from "../inspectorHelpers";

function makeRect(
	overrides: Partial<PenRectangle> & { id: string },
): PenRectangle {
	return { type: "rectangle", ...overrides };
}

function makeFrame(overrides: Partial<PenFrame> & { id: string }): PenFrame {
	return { type: "frame", ...overrides };
}

function makeText(
	overrides: Partial<PenText> & { id: string; content: string },
): PenText {
	return { type: "text", ...overrides };
}

describe("getPrimaryFillColor", () => {
	it("returns a plain string fill directly", () => {
		expect(getPrimaryFillColor("#ff0000")).toBe("#ff0000");
	});

	it("returns the color from a color-type fill object", () => {
		expect(getPrimaryFillColor({ type: "color", color: "#00ff00" })).toBe(
			"#00ff00",
		);
	});

	it("extracts from the first matching item in an array fill", () => {
		const fill = [{ type: "color" as const, color: "#aabbcc" }];
		expect(getPrimaryFillColor(fill)).toBe("#aabbcc");
	});

	it("returns null for gradient fills (no direct color)", () => {
		const fill = {
			type: "gradient" as const,
			gradientType: "linear" as const,
			stops: [{ color: "#fff", position: 0 }],
		};
		expect(getPrimaryFillColor(fill)).toBeNull();
	});

	it("returns null for undefined fill", () => {
		expect(getPrimaryFillColor(undefined)).toBeNull();
	});
});

describe("getPrimaryStrokeColor", () => {
	it("returns the stroke fill color when present", () => {
		expect(getPrimaryStrokeColor({ fill: "#333" })).toBe("#333");
	});

	it("returns null when stroke has no fill", () => {
		expect(getPrimaryStrokeColor({ thickness: 2 })).toBeNull();
	});

	it("returns null for undefined stroke", () => {
		expect(getPrimaryStrokeColor(undefined)).toBeNull();
	});
});

describe("getPrimaryStrokeThickness", () => {
	it("returns a numeric thickness", () => {
		expect(getPrimaryStrokeThickness({ thickness: 3 })).toBe(3);
	});

	it("returns null for non-numeric (per-side) thickness", () => {
		expect(
			getPrimaryStrokeThickness({
				thickness: { top: 1, right: 2, bottom: 3, left: 4 },
			}),
		).toBeNull();
	});

	it("returns null for undefined stroke", () => {
		expect(getPrimaryStrokeThickness(undefined)).toBeNull();
	});
});

describe("nodeHasFill", () => {
	it("returns true for fill-bearing types", () => {
		for (const t of [
			"rectangle",
			"ellipse",
			"polygon",
			"path",
			"text",
			"icon_font",
			"frame",
		] as PenNode["type"][]) {
			expect(nodeHasFill(t)).toBe(true);
		}
	});

	it("returns false for non-fill types", () => {
		for (const t of [
			"line",
			"note",
			"connection",
			"group",
		] as PenNode["type"][]) {
			expect(nodeHasFill(t)).toBe(false);
		}
	});
});

describe("nodeHasStroke", () => {
	it("returns true for stroke-bearing types", () => {
		for (const t of [
			"rectangle",
			"ellipse",
			"polygon",
			"path",
			"line",
			"frame",
		] as PenNode["type"][]) {
			expect(nodeHasStroke(t)).toBe(true);
		}
	});

	it("returns false for text and other non-stroke types", () => {
		for (const t of [
			"text",
			"note",
			"group",
			"connection",
		] as PenNode["type"][]) {
			expect(nodeHasStroke(t)).toBe(false);
		}
	});
});

describe("nodeHasWidthHeight", () => {
	it("returns false for line and connection", () => {
		expect(nodeHasWidthHeight("line")).toBe(false);
		expect(nodeHasWidthHeight("connection")).toBe(false);
	});

	it("returns true for all other types", () => {
		for (const t of [
			"frame",
			"rectangle",
			"text",
			"ellipse",
		] as PenNode["type"][]) {
			expect(nodeHasWidthHeight(t)).toBe(true);
		}
	});
});

describe("computeSharedNumericField", () => {
	it("returns single when all nodes share the same value", () => {
		const nodes: PenNode[] = [
			makeRect({ id: "a", x: 100 }),
			makeRect({ id: "b", x: 100 }),
		];
		const result = computeSharedNumericField(
			nodes,
			(n) => (n as { x?: number }).x,
		);
		expect(result).toEqual({ kind: "single", value: 100 });
	});

	it("returns mixed when values differ", () => {
		const nodes: PenNode[] = [
			makeRect({ id: "a", x: 10 }),
			makeRect({ id: "b", x: 20 }),
		];
		const result = computeSharedNumericField(
			nodes,
			(n) => (n as { x?: number }).x,
		);
		expect(result).toEqual({ kind: "mixed" });
	});

	it("returns absent when all values are undefined", () => {
		const nodes: PenNode[] = [makeRect({ id: "a" }), makeRect({ id: "b" })];
		const result = computeSharedNumericField(
			nodes,
			(n) => (n as { x?: number }).x,
		);
		expect(result).toEqual({ kind: "absent" });
	});

	it("returns mixed when one node has a value and another does not", () => {
		const nodes: PenNode[] = [
			makeRect({ id: "a", x: 50 }),
			makeRect({ id: "b" }),
		];
		const result = computeSharedNumericField(
			nodes,
			(n) => (n as { x?: number }).x,
		);
		expect(result).toEqual({ kind: "mixed" });
	});

	it("returns absent when no nodes match the isApplicable filter", () => {
		const nodes: PenNode[] = [makeText({ id: "t", content: "hi" })];
		const result = computeSharedNumericField(
			nodes,
			(n) => (n as { width?: number }).width,
			(n) => n.type === "rectangle",
		);
		expect(result).toEqual({ kind: "absent" });
	});

	it("returns absent for empty node list", () => {
		const result = computeSharedNumericField(
			[],
			(n) => (n as { x?: number }).x,
		);
		expect(result).toEqual({ kind: "absent" });
	});
});

describe("computeSharedStringField", () => {
	it("returns single when all applicable nodes share the same fill color", () => {
		const nodes: PenNode[] = [
			makeFrame({ id: "a", fill: "#abc" }),
			makeFrame({ id: "b", fill: "#abc" }),
		];
		const result = computeSharedStringField(nodes, (n) =>
			typeof (n as { fill?: unknown }).fill === "string"
				? (n as { fill: string }).fill
				: null,
		);
		expect(result).toEqual({ kind: "single", value: "#abc" });
	});

	it("returns mixed when fill colors differ", () => {
		const nodes: PenNode[] = [
			makeFrame({ id: "a", fill: "#abc" }),
			makeFrame({ id: "b", fill: "#def" }),
		];
		const result = computeSharedStringField(nodes, (n) =>
			typeof (n as { fill?: unknown }).fill === "string"
				? (n as { fill: string }).fill
				: null,
		);
		expect(result).toEqual({ kind: "mixed" });
	});

	it("returns absent when all values are null", () => {
		const nodes: PenNode[] = [makeFrame({ id: "a" }), makeFrame({ id: "b" })];
		const result = computeSharedStringField(nodes, (n) =>
			typeof (n as { fill?: unknown }).fill === "string"
				? (n as { fill: string }).fill
				: null,
		);
		expect(result).toEqual({ kind: "absent" });
	});
});
