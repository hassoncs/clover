import { describe, expect, it } from "vitest";
import type { PenFrame, PenNode, PenText } from "@slopcade/shared/types/pen";
import { estimateTextSize } from "../text-measure";
import { layoutTree, parsePadding, parseSizing } from "../layout";

function frame(overrides: Partial<PenFrame> & { id: string }): PenFrame {
	return { type: "frame", ...overrides };
}

function text(overrides: Partial<PenText> & { id: string; content: string }): PenText {
	return { type: "text", ...overrides };
}

describe("parsePadding", () => {
	it("converts a scalar to [n,n,n,n]", () => {
		expect(parsePadding(10)).toEqual([10, 10, 10, 10]);
	});

	it("converts [v,h] to [v,h,v,h]", () => {
		expect(parsePadding([8, 12])).toEqual([8, 12, 8, 12]);
	});

	it("passes [t,r,b,l] through", () => {
		expect(parsePadding([1, 2, 3, 4])).toEqual([1, 2, 3, 4]);
	});

	it("returns [0,0,0,0] for undefined", () => {
		expect(parsePadding(undefined)).toEqual([0, 0, 0, 0]);
	});
});

describe("parseSizing", () => {
	it("parses a number as fixed", () => {
		expect(parseSizing(100)).toEqual({ kind: "fixed", value: 100 });
	});

	it("parses 'fill_container' without fallback", () => {
		expect(parseSizing("fill_container")).toEqual({ kind: "fill_container", fallback: null });
	});

	it("parses 'fill_container(200)' with fallback", () => {
		expect(parseSizing("fill_container(200)")).toEqual({ kind: "fill_container", fallback: 200 });
	});

	it("parses 'fit_content' without fallback", () => {
		expect(parseSizing("fit_content")).toEqual({ kind: "fit_content", fallback: null });
	});

	it("parses 'fit_content(100)' with fallback", () => {
		expect(parseSizing("fit_content(100)")).toEqual({ kind: "fit_content", fallback: 100 });
	});

	it("returns auto for undefined", () => {
		expect(parseSizing(undefined)).toEqual({ kind: "auto" });
	});
});

describe("estimateTextSize", () => {
	it("estimates single-line text dimensions", () => {
		// "Hello" = 5 chars, fontSize=16 → width = 5 * 16 * 0.6 = 48, height = 16 * 1.2 = 19.2
		const result = estimateTextSize("Hello", 16, "sans-serif");
		expect(result.width).toBeCloseTo(48, 5);
		expect(result.height).toBeCloseTo(19.2, 5);
	});

	it("wraps text when width exceeds maxWidth", () => {
		// 20 chars * 10 * 0.6 = 120 width; maxWidth=60 → 2 lines
		const result = estimateTextSize("A".repeat(20), 10, "sans-serif", undefined, 60);
		expect(result.width).toBe(60);
		expect(result.height).toBeCloseTo(2 * 10 * 1.2, 5);
	});
});

describe("layoutTree — absolute positioning (layout: none)", () => {
	it("preserves x/y and width/height of a top-level frame", () => {
		const nodes: PenNode[] = [frame({ id: "f1", x: 100, y: 200, width: 300, height: 400 })];
		const [result] = layoutTree(nodes, estimateTextSize);
		expect(result.rect).toEqual({ x: 100, y: 200, width: 300, height: 400 });
	});

	it("computes child absolute position from parent origin + child relative position", () => {
		const child = frame({ id: "child", x: 30, y: 40, width: 50, height: 50 });
		const parent = frame({ id: "parent", x: 10, y: 20, width: 200, height: 200, children: [child] });
		const [result] = layoutTree([parent], estimateTextSize);
		expect(result.children[0].rect.x).toBe(40); // 10 + 30
		expect(result.children[0].rect.y).toBe(60); // 20 + 40
	});
});

describe("layoutTree — horizontal layout with gap", () => {
	it("positions two children side-by-side with a gap", () => {
		const c1 = frame({ id: "c1", width: 80, height: 50 });
		const c2 = frame({ id: "c2", width: 80, height: 50 });
		const parent = frame({
			id: "parent",
			x: 0,
			y: 0,
			width: 200,
			height: 100,
			layout: "horizontal",
			gap: 10,
			children: [c1, c2],
		});
		const [result] = layoutTree([parent], estimateTextSize);
		expect(result.children[0].rect.x).toBe(0);
		expect(result.children[1].rect.x).toBe(90); // 80 + 10
	});
});

describe("layoutTree — vertical layout with padding", () => {
	it("offsets child by padding amount", () => {
		const child = frame({ id: "child", width: 100, height: 50 });
		const parent = frame({
			id: "parent",
			x: 0,
			y: 0,
			width: 200,
			height: 300,
			layout: "vertical",
			padding: 20,
			children: [child],
		});
		const [result] = layoutTree([parent], estimateTextSize);
		expect(result.children[0].rect.x).toBe(20); // paddingLeft
		expect(result.children[0].rect.y).toBe(20); // paddingTop
	});
});

describe("layoutTree — fill_container sizing", () => {
	it("stretches a fill_container child to fill available parent width", () => {
		const child = frame({ id: "child", width: "fill_container", height: 50 });
		const parent = frame({
			id: "parent",
			x: 0,
			y: 0,
			width: 200,
			height: 100,
			layout: "horizontal",
			children: [child],
		});
		const [result] = layoutTree([parent], estimateTextSize);
		expect(result.children[0].rect.width).toBe(200);
	});
});

describe("layoutTree — nested layouts", () => {
	it("positions children correctly in a vertical frame containing a horizontal frame", () => {
		const innerChild1 = frame({ id: "ic1", width: 50, height: 50 });
		const innerChild2 = frame({ id: "ic2", width: 50, height: 50 });
		const inner = frame({
			id: "inner",
			width: "fill_container",
			height: 100,
			layout: "horizontal",
			children: [innerChild1, innerChild2],
		});
		const outer = frame({
			id: "outer",
			x: 0,
			y: 0,
			width: 300,
			height: 200,
			layout: "vertical",
			children: [inner],
		});
		const [result] = layoutTree([outer], estimateTextSize);
		const innerLayout = result.children[0];

		// inner frame fills parent width
		expect(innerLayout.rect.width).toBe(300);
		expect(innerLayout.rect.x).toBe(0);
		expect(innerLayout.rect.y).toBe(0);

		// innerChild1 is at x=0, innerChild2 at x=50
		expect(innerLayout.children[0].rect.x).toBe(0);
		expect(innerLayout.children[1].rect.x).toBe(50);
	});
});

describe("layoutTree — justifyContent: center", () => {
	it("centers two children horizontally", () => {
		const c1 = frame({ id: "c1", width: 40, height: 40 });
		const c2 = frame({ id: "c2", width: 40, height: 40 });
		const parent = frame({
			id: "parent",
			x: 0,
			y: 0,
			width: 200,
			height: 100,
			layout: "horizontal",
			justifyContent: "center",
			gap: 0,
			children: [c1, c2],
		});
		const [result] = layoutTree([parent], estimateTextSize);
		// Total content = 80; freeSpace = 120; startOffset = 60
		expect(result.children[0].rect.x).toBe(60);
		expect(result.children[1].rect.x).toBe(100);
	});
});

describe("layoutTree — alignItems: center", () => {
	it("centers a child vertically in a horizontal layout", () => {
		const child = frame({ id: "child", width: 50, height: 40 });
		const parent = frame({
			id: "parent",
			x: 0,
			y: 0,
			width: 200,
			height: 100,
			layout: "horizontal",
			alignItems: "center",
			children: [child],
		});
		const [result] = layoutTree([parent], estimateTextSize);
		// containerCross = 100, childCross = 40 → offset = 30
		expect(result.children[0].rect.y).toBe(30);
	});
});

describe("layoutTree — clip flag", () => {
	it("propagates clip from frame node", () => {
		const clipped = frame({ id: "c", x: 0, y: 0, width: 100, height: 100, clip: true });
		const [result] = layoutTree([clipped], estimateTextSize);
		expect(result.clip).toBe(true);
	});

	it("defaults clip to false when not set", () => {
		const f = frame({ id: "f", x: 0, y: 0, width: 100, height: 100 });
		const [result] = layoutTree([f], estimateTextSize);
		expect(result.clip).toBe(false);
	});
});

describe("layoutTree — text node fit_content", () => {
	it("measures a text node using estimateTextSize", () => {
		const t = text({ id: "t1", content: "Hello", fontSize: 16, width: "fit_content", height: "fit_content" });
		const [result] = layoutTree([t], estimateTextSize);
		// "Hello" = 5 chars * 16 * 0.6 = 48
		expect(result.rect.width).toBeCloseTo(48, 5);
		expect(result.rect.height).toBeCloseTo(19.2, 5);
	});
});
