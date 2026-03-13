import { describe, expect, it } from "vitest";
import type { PenFrame, PenNode, PenRef, PenText } from "@slopcade/protocol/pen";
import { buildComponentRegistry, resolveAllRefs, resolveRef } from "../components";

function makeFrame(overrides: Partial<PenFrame> & { id: string }): PenFrame {
	return { type: "frame", width: 100, height: 50, ...overrides };
}

function makeText(overrides: Partial<PenText> & { id: string; content: string }): PenText {
	return { type: "text", ...overrides };
}

function makeRef(overrides: Partial<PenRef> & { id: string; ref: string }): PenRef {
	return { type: "ref", ...overrides };
}

describe("buildComponentRegistry", () => {
	it("collects reusable nodes and ignores non-reusable", () => {
		const btn = makeFrame({ id: "btn", reusable: true });
		const inner: PenText = makeText({ id: "inner", content: "hi" });
		const page = makeFrame({ id: "page", children: [inner] });
		const nodes: PenNode[] = [btn, page];

		const registry = buildComponentRegistry(nodes);

		expect(registry.has("btn")).toBe(true);
		expect(registry.get("btn")).toBe(btn);
		expect(registry.has("page")).toBe(false);
		expect(registry.has("inner")).toBe(false);
	});
});

describe("resolveRef", () => {
	it("clones component and overrides position from ref", () => {
		const component = makeFrame({ id: "btn", reusable: true, x: 0, y: 0, width: 100, height: 50 });
		const registry = new Map<string, PenNode>([["btn", component]]);
		const ref = makeRef({ id: "instance1", ref: "btn", x: 200, y: 300 });

		const result = resolveRef(ref, registry);

		expect(result).not.toBeNull();
		expect(result!.type).toBe("frame");
		expect(result!.id).toBe("instance1");
		expect(result!.x).toBe(200);
		expect(result!.y).toBe(300);
		expect((result as PenFrame).width).toBe(100);
		expect((result as PenFrame).height).toBe(50);
	});

	it("applies descendants override to change nested text content", () => {
		const title = makeText({ id: "title", content: "Default" });
		const component = makeFrame({ id: "card", reusable: true, children: [title] });
		const registry = new Map<string, PenNode>([["card", component]]);
		const ref = makeRef({ id: "i1", ref: "card", descendants: { title: { content: "Custom Title" } } });

		const result = resolveRef(ref, registry) as PenFrame;

		expect(result).not.toBeNull();
		expect((result.children![0] as PenText).content).toBe("Custom Title");
	});

	it("applies descendants override to disable a child", () => {
		const title = makeText({ id: "title", content: "Hello" });
		const component = makeFrame({ id: "card", reusable: true, children: [title] });
		const registry = new Map<string, PenNode>([["card", component]]);
		const ref = makeRef({ id: "i1", ref: "card", descendants: { title: { enabled: false } } });

		const result = resolveRef(ref, registry) as PenFrame;

		expect(result!.children![0].enabled).toBe(false);
	});

	it("ref width/height overrides component dimensions", () => {
		const component = makeFrame({ id: "btn", reusable: true, width: 100, height: 50 });
		const registry = new Map<string, PenNode>([["btn", component]]);
		const ref = makeRef({ id: "i1", ref: "btn", width: 200, height: "fill_container" });

		const result = resolveRef(ref, registry) as PenFrame;

		expect(result!.width).toBe(200);
		expect(result!.height).toBe("fill_container");
	});

	it("returns null when ref target is not in registry", () => {
		const result = resolveRef(makeRef({ type: "ref", id: "x", ref: "nonexistent" }), new Map());
		expect(result).toBeNull();
	});
});

describe("resolveAllRefs", () => {
	it("replaces ref nodes with resolved clones", () => {
		const component = makeFrame({ id: "btn", reusable: true, width: 80, height: 40 });
		const registry = new Map<string, PenNode>([["btn", component]]);
		const ref = makeRef({ id: "i1", ref: "btn" });

		const result = resolveAllRefs([ref], registry);

		expect(result).toHaveLength(1);
		expect(result[0].type).toBe("frame");
		expect(result[0].id).toBe("i1");
	});

	it("resolves nested refs (component A contains ref to component B)", () => {
		const icon = makeFrame({ id: "icon", reusable: true, width: 24, height: 24 });
		const iconRef = makeRef({ id: "iconInstance", ref: "icon" });
		const card = makeFrame({ id: "card", reusable: true, children: [iconRef] });
		const registry = new Map<string, PenNode>([
			["icon", icon],
			["card", card],
		]);
		const ref = makeRef({ id: "cardInstance", ref: "card" });

		const result = resolveAllRefs([ref], registry);
		const resolvedCard = result[0] as PenFrame;

		expect(resolvedCard.type).toBe("frame");
		expect(resolvedCard.children).toHaveLength(1);
		expect(resolvedCard.children![0].type).toBe("frame");
		expect(resolvedCard.children![0].id).toBe("iconInstance");
	});

	it("detects circular refs and does not infinite loop", () => {
		const selfRef = makeRef({ id: "selfRef", ref: "a" });
		const componentA = makeFrame({ id: "a", reusable: true, children: [selfRef] });
		const registry = new Map<string, PenNode>([["a", componentA]]);
		const ref = makeRef({ id: "instance", ref: "a" });

		expect(() => resolveAllRefs([ref], registry)).not.toThrow();
	});

	it("deep clone independence — mutating first result does not affect second", () => {
		const title = makeText({ id: "title", content: "Original" });
		const component = makeFrame({ id: "card", reusable: true, children: [title] });
		const registry = new Map<string, PenNode>([["card", component]]);
		const ref1 = makeRef({ id: "i1", ref: "card" });
		const ref2 = makeRef({ id: "i2", ref: "card" });

		const [result1, result2] = resolveAllRefs([ref1, ref2], registry);
		const text1 = (result1 as PenFrame).children![0] as PenText;
		text1.content = "Mutated";

		const text2 = (result2 as PenFrame).children![0] as PenText;
		expect(text2.content).toBe("Original");
	});
});
