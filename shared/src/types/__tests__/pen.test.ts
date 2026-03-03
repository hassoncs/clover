import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { parsePenDocument } from "../pen";

const MINIMAL_PEN_DOC = {
	version: 1,
	children: [
		{
			type: "frame",
			id: "frame1",
			name: "Main Frame",
			x: 0,
			y: 0,
			width: 375,
			height: 812,
			children: [
				{
					type: "text",
					id: "text1",
					name: "Title",
					x: 20,
					y: 40,
					width: 200,
					height: 48,
					content: "Hello World",
					fontSize: 24,
					fontWeight: "700",
				},
			],
		},
	],
};

describe("parsePenDocument", () => {
	it("parses a minimal document and returns children array", () => {
		const doc = parsePenDocument(MINIMAL_PEN_DOC);
		expect(doc.children).toHaveLength(1);
		expect(doc.version).toBe(1);
	});

	it("parses a document with themed variables", () => {
		const doc = parsePenDocument({
			version: 1,
			themes: [
				{
					name: "Mode",
					values: ["Light", "Dark"],
					default: "Light",
				},
			],
			variables: {
				"--primary": {
					type: "color",
					value: [
						{ value: "#007AFF" },
						{ value: "#0A84FF", theme: { Mode: "Dark" } },
					],
				},
				"--radius": {
					type: "number",
					value: 8,
				},
			},
			children: [],
		});
		expect(doc.themes).toHaveLength(1);
		expect(doc.themes![0].name).toBe("Mode");
		expect(doc.variables!["--primary"].type).toBe("color");
		expect(Array.isArray(doc.variables!["--primary"].value)).toBe(true);
	});

	it("parses a frame with fill, stroke, effects, and nested children", () => {
		const doc = parsePenDocument({
			version: 1,
			children: [
				{
					type: "frame",
					id: "card",
					name: "Card",
					x: 0,
					y: 0,
					width: 320,
					height: 200,
					layout: "vertical",
					gap: 16,
					padding: [16, 24],
					cornerRadius: [8, 8, 8, 8],
					fill: { type: "color", color: "#FFFFFF", opacity: 1 },
					stroke: {
						fill: "#E0E0E0",
						thickness: 1,
						align: "inside",
					},
					effects: [
						{
							shadow: {
								color: "#00000033",
								offsetX: 0,
								offsetY: 4,
								blur: 12,
								spread: 0,
							},
						},
					],
					children: [
						{
							type: "rectangle",
							id: "thumb",
							width: "fill_container",
							height: 120,
							fill: { type: "gradient", gradientType: "linear", stops: [{ color: "#FF6B6B", position: 0 }, { color: "#FFE66D", position: 1 }], angle: 45 },
						},
						{
							type: "text",
							id: "label",
							content: "Card Title",
							fontSize: 16,
							fontWeight: "600",
						},
					],
				},
			],
		});

		const frame = doc.children[0];
		expect(frame.type).toBe("frame");
		if (frame.type === "frame") {
			expect(frame.children).toHaveLength(2);
			expect(frame.layout).toBe("vertical");
			expect(frame.gap).toBe(16);
			expect(frame.effects).toHaveLength(1);
		}
	});

	it("throws ZodError for a document missing required children field", () => {
		expect(() =>
			parsePenDocument({
				version: 1,
			}),
		).toThrow(ZodError);
	});

	it("throws ZodError for an unknown node type", () => {
		expect(() =>
			parsePenDocument({
				version: 1,
				children: [
					{
						type: "unknown_node_type",
						id: "n1",
					},
				],
			}),
		).toThrow(ZodError);
	});

	it("parses fill_container and fit_content sizing strings", () => {
		const doc = parsePenDocument({
			version: 1,
			children: [
				{
					type: "frame",
					id: "f1",
					width: "fill_container",
					height: "fit_content",
					children: [
						{
							type: "text",
							id: "t1",
							content: "Dynamic",
							width: "fill_container(200)",
							height: "fit_content(50)",
						},
					],
				},
			],
		});
		const frame = doc.children[0];
		expect(frame.width).toBe("fill_container");
		expect(frame.height).toBe("fit_content");
	});

	it("parses a ref node with descendant overrides", () => {
		const doc = parsePenDocument({
			version: 1,
			children: [
				{
					type: "ref",
					id: "instance1",
					ref: "btn-component",
					descendants: {
						"btn-component/label": { content: "Click me" },
					},
				},
			],
		});
		const ref = doc.children[0];
		expect(ref.type).toBe("ref");
		if (ref.type === "ref") {
			expect(ref.ref).toBe("btn-component");
			expect(ref.descendants).toBeDefined();
		}
	});

	it("parses a multi-fill array on a frame", () => {
		const doc = parsePenDocument({
			version: 1,
			children: [
				{
					type: "frame",
					id: "f1",
					fill: [
						{ type: "color", color: "#FFFFFF" },
						{ type: "image", url: "https://example.com/bg.png", fit: "cover" },
					],
					children: [],
				},
			],
		});
		const frame = doc.children[0];
		expect(frame.type).toBe("frame");
		if (frame.type === "frame") {
			expect(Array.isArray(frame.fill)).toBe(true);
		}
	});

	it("parses all supported node types at the top level", () => {
		const doc = parsePenDocument({
			version: 1,
			children: [
				{ type: "frame", id: "a", children: [] },
				{ type: "rectangle", id: "b" },
				{ type: "ellipse", id: "c" },
				{ type: "line", id: "d" },
				{ type: "polygon", id: "e" },
				{ type: "path", id: "f", geometry: "M 0 0 L 100 0 Z" },
				{ type: "text", id: "g", content: "Hi" },
				{ type: "group", id: "h", children: [] },
				{ type: "icon_font", id: "i", icon: "home" },
				{ type: "ref", id: "j", ref: "comp1" },
				{ type: "note", id: "k", content: "A note" },
				{ type: "image", id: "l", url: "https://example.com/img.png" },
				{ type: "connection", id: "m", fromId: "a", toId: "b" },
			],
		});
		expect(doc.children).toHaveLength(13);
		const types = doc.children.map((n) => n.type);
		expect(types).toContain("frame");
		expect(types).toContain("rectangle");
		expect(types).toContain("ellipse");
		expect(types).toContain("line");
		expect(types).toContain("polygon");
		expect(types).toContain("path");
		expect(types).toContain("text");
		expect(types).toContain("group");
		expect(types).toContain("icon_font");
		expect(types).toContain("ref");
		expect(types).toContain("note");
		expect(types).toContain("image");
		expect(types).toContain("connection");
	});
});
