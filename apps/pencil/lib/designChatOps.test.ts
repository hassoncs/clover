import type {
	PenDocument,
	PenRectangle,
	PenRef,
} from "@slopcade/shared/types/pen";
import { describe, expect, it } from "vitest";

import { applyDesignChatOpsToDocument } from "./designChatOps";

function makeRectangle(
	overrides: Partial<PenRectangle> & { id: string },
): PenRectangle {
	const { id, ...rest } = overrides;
	return {
		type: "rectangle",
		id,
		x: 0,
		y: 0,
		width: 120,
		height: 40,
		fill: "#e5e7eb",
		...rest,
	};
}

describe("applyDesignChatOpsToDocument", () => {
	it("updates nested nodes using slash-path elementId", () => {
		const button = makeRectangle({ id: "button", fill: "#9ca3af" });
		const doc: PenDocument = {
			version: 1,
			children: [
				{
					type: "frame",
					id: "screen",
					width: 800,
					height: 600,
					children: [
						{
							type: "frame",
							id: "toolbar",
							width: 800,
							height: 80,
							children: [button],
						},
					],
				},
			],
		};

		const result = applyDesignChatOpsToDocument(doc, [
			{
				type: "updateElement",
				elementId: "screen/toolbar/button",
				patch: {
					fill: "#ef4444",
					id: "malicious-id",
					type: "text",
					children: [{ type: "text", id: "x", content: "bad" }],
				},
			},
		]);

		expect(result.errors).toEqual([]);
		expect(result.appliedOps).toBe(1);
		const updatedToolbar = (
			result.nextDocument.children[0] as { children?: unknown[] }
		).children?.[0] as { children?: PenRectangle[] };
		expect(updatedToolbar.children?.[0]?.id).toBe("button");
		expect(updatedToolbar.children?.[0]?.type).toBe("rectangle");
		expect(updatedToolbar.children?.[0]?.fill).toBe("#ef4444");
	});

	it("writes path-based descendant overrides into refs and sanitizes disallowed keys", () => {
		const instance: PenRef = {
			type: "ref",
			id: "card-instance",
			ref: "card",
			descendants: {
				title: {
					content: "Original title",
					enabled: true,
				},
			},
		};
		const doc: PenDocument = {
			version: 1,
			children: [instance],
		};

		const result = applyDesignChatOpsToDocument(doc, [
			{
				type: "updateElement",
				elementId: "card-instance/title",
				patch: {
					content: "Updated title",
					fill: "#f43f5e",
					id: "should-not-apply",
					type: "rectangle",
					children: [{ type: "text", id: "bad", content: "nope" }],
				},
			},
		]);

		expect(result.errors).toEqual([]);
		expect(result.appliedOps).toBe(1);
		const updatedInstance = result.nextDocument.children[0] as PenRef;
		const titlePatch = updatedInstance.descendants?.title as
			| {
					content?: string;
					fill?: string;
					enabled?: boolean;
					id?: string;
					type?: string;
					children?: unknown[];
			  }
			| undefined;

		expect(titlePatch).toBeDefined();
		expect(titlePatch?.content).toBe("Updated title");
		expect(titlePatch?.fill).toBe("#f43f5e");
		expect(titlePatch?.enabled).toBe(true);
		expect(titlePatch).not.toHaveProperty("id");
		expect(titlePatch).not.toHaveProperty("type");
		expect(titlePatch).not.toHaveProperty("children");
	});

	it("creates effect nodes from addElement ops", () => {
		const doc: PenDocument = {
			version: 1,
			children: [
				{
					type: "frame",
					id: "screen",
					width: 800,
					height: 600,
					children: [],
				},
			],
		};

		const result = applyDesignChatOpsToDocument(doc, [
			{
				type: "addElement",
				frameId: "screen",
				element: {
					type: "effect",
					id: "rainbow",
					x: 20,
					y: 30,
					width: 320,
					height: 180,
					playing: false,
					authoringMode: "code",
					shaderCode:
						"shader_type canvas_item;\\nvoid fragment(){ COLOR = vec4(1.0); }",
					uniforms: { speed: 2.0 },
				},
			},
		]);

		expect(result.errors).toEqual([]);
		expect(result.appliedOps).toBe(1);
		const frame = result.nextDocument.children[0] as {
			children?: Array<PenRef | PenRectangle | Record<string, unknown>>;
		};
		const effect = frame.children?.[0] as {
			type?: string;
			id?: string;
			playing?: boolean;
			authoringMode?: string;
			uniforms?: Record<string, unknown>;
		};
		expect(effect.type).toBe("effect");
		expect(effect.id).toBe("rainbow");
		expect(effect.playing).toBe(false);
		expect(effect.authoringMode).toBe("code");
		expect(effect.uniforms).toEqual({ speed: 2.0 });
	});

	it("adds createdAt timestamp to nodes created by addElement ops", () => {
		const doc: PenDocument = {
			version: 1,
			children: [
				{
					type: "frame",
					id: "screen",
					width: 800,
					height: 600,
					children: [],
				},
			],
		};

		const beforeTimestamp = Date.now();
		const result = applyDesignChatOpsToDocument(doc, [
			{
				type: "addElement",
				frameId: "screen",
				element: {
					type: "rectangle",
					id: "rect-1",
					x: 10,
					y: 20,
					width: 100,
					height: 50,
				},
			},
		]);
		const afterTimestamp = Date.now();

		expect(result.errors).toEqual([]);
		expect(result.appliedOps).toBe(1);
		const frame = result.nextDocument.children[0] as {
			children?: Array<Record<string, unknown>>;
		};
		const rect = frame.children?.[0];
		expect(rect).toBeDefined();
		expect(rect?.createdAt).toBeGreaterThanOrEqual(beforeTimestamp);
		expect(rect?.createdAt).toBeLessThanOrEqual(afterTimestamp);
	});

	it("adds createdAt timestamp to frames created by addFrame ops", () => {
		const doc: PenDocument = {
			version: 1,
			children: [],
		};

		const beforeTimestamp = Date.now();
		const result = applyDesignChatOpsToDocument(doc, [
			{
				type: "addFrame",
				id: "new-frame",
				title: "Test Frame",
				x: 0,
				y: 0,
				width: 800,
				height: 600,
			},
		]);
		const afterTimestamp = Date.now();

		expect(result.errors).toEqual([]);
		expect(result.appliedOps).toBe(1);
		expect(result.nextDocument.children).toHaveLength(1);
		const frame = result.nextDocument.children[0] as Record<string, unknown>;
		expect(frame.type).toBe("frame");
		expect(frame.id).toBe("new-frame");
		expect(frame.createdAt).toBeGreaterThanOrEqual(beforeTimestamp);
		expect(frame.createdAt).toBeLessThanOrEqual(afterTimestamp);
	});
});
