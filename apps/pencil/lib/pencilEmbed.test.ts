import type {
	PenDocument,
	PenFrame,
	PenRectangle,
} from "@slopcade/shared/types/pen";
import { describe, expect, it } from "vitest";

import {
	buildPencilRuntimeState,
	createDesignStateRef,
	createEmbedDocumentForTarget,
	resolvePencilRuntimeBinding,
} from "./pencilEmbed";

function frame(overrides: Partial<PenFrame> & { id: string }): PenFrame {
	return {
		type: "frame",
		width: 100,
		height: 100,
		children: [],
		...overrides,
	};
}

function rectangle(
	overrides: Partial<PenRectangle> & { id: string },
): PenRectangle {
	return {
		type: "rectangle",
		x: 0,
		y: 0,
		width: 40,
		height: 20,
		...overrides,
	};
}

describe("createEmbedDocumentForTarget", () => {
	it("preserves the ancestor chain for a nested target", () => {
		const doc: PenDocument = {
			version: 1,
			children: [
				frame({
					id: "screen",
					x: 120,
					y: 60,
					width: 800,
					height: 600,
					layout: "vertical",
					children: [
						frame({
							id: "toolbar",
							width: "fill_container",
							height: 80,
							padding: 12,
							children: [rectangle({ id: "cta", x: 16, y: 8, width: 200 })],
						}),
					],
				}),
				frame({ id: "other-screen", width: 400, height: 300 }),
			],
		};

		const result = createEmbedDocumentForTarget(doc, "cta");

		expect(result).not.toBeNull();
		expect(result?.targetPath).toEqual(["screen", "toolbar", "cta"]);
		expect(result?.document.children).toHaveLength(1);

		const isolatedScreen = result?.document.children[0] as PenFrame;
		expect(isolatedScreen.id).toBe("screen");
		expect(isolatedScreen.children).toHaveLength(1);

		const isolatedToolbar = isolatedScreen.children?.[0] as PenFrame;
		expect(isolatedToolbar.id).toBe("toolbar");
		expect(isolatedToolbar.children).toHaveLength(1);
		expect((isolatedToolbar.children?.[0] as PenRectangle).id).toBe("cta");
	});

	it("returns null when the target is missing", () => {
		const doc: PenDocument = {
			version: 1,
			children: [frame({ id: "screen" })],
		};

		expect(createEmbedDocumentForTarget(doc, "missing")).toBeNull();
	});
});

describe("createDesignStateRef", () => {
	it("ignores sync timestamps when hashing the design state", () => {
		const baseDoc: PenDocument = {
			version: 1,
			children: [frame({ id: "screen", children: [rectangle({ id: "cta" })] })],
		};

		const first = createDesignStateRef({
			...baseDoc,
			_syncedAt: 111,
		} as PenDocument & {
			_syncedAt: number;
		});
		const second = createDesignStateRef({
			...baseDoc,
			_syncedAt: 222,
		} as PenDocument & {
			_syncedAt: number;
		});

		expect(first).toBe(second);
	});
});

describe("buildPencilRuntimeState", () => {
	it("includes stable Prism-facing runtime metadata", () => {
		const doc: PenDocument = {
			version: 1,
			children: [frame({ id: "screen", children: [rectangle({ id: "cta" })] })],
		};

		const state = buildPencilRuntimeState({
			document: doc,
			gameId: "game-123",
			filename: "pencil-document.pen.json",
			targetId: "cta",
			targetPath: ["screen", "cta"],
			mode: "prism",
		});

		expect(state.sessionId).toBeNull();
		expect(state.projectRef).toBe("workspace:game-123");
		expect(state.fileRef).toBe("workspace:game-123:pencil-document.pen.json");
		expect(state.targetId).toBe("cta");
		expect(state.targetPath).toEqual(["screen", "cta"]);
		expect(state.designStateRef).toMatch(/^pen:/);
		expect(state.mode).toBe("prism");
	});

	it("uses explicit filenames for workspace routing", () => {
		const doc: PenDocument = {
			version: 1,
			children: [frame({ id: "screen" })],
		};

		const state = buildPencilRuntimeState({
			document: doc,
			gameId: "game-123",
			filename: "designs/landing.pen.json",
			targetId: null,
			targetPath: null,
			mode: "embed",
		});

		expect(state.fileRef).toBe("workspace:game-123:designs/landing.pen.json");
	});

	it("supports session/project/file runtime identity", () => {
		const doc: PenDocument = {
			version: 1,
			children: [frame({ id: "screen" })],
		};

		const state = buildPencilRuntimeState({
			document: doc,
			gameId: null,
			sessionId: "pen_a3f8b2c1",
			projectRoot: "/tmp/pencil/project-a",
			filename: "documents/main.pen",
			targetId: null,
			targetPath: null,
			mode: "embed",
		});

		expect(state.sessionId).toBe("pen_a3f8b2c1");
		expect(state.projectRef).toBe("project:/tmp/pencil/project-a");
		expect(state.fileRef).toBe(
			"project:/tmp/pencil/project-a:documents/main.pen",
		);
	});
});

describe("resolvePencilRuntimeBinding", () => {
	it("prefers session/project identity over legacy game identity", () => {
		expect(
			resolvePencilRuntimeBinding({
				gameId: "legacy-game",
				sessionId: "pen_123",
				projectRoot: "/tmp/pencil/project-a",
				filename: "documents/main.pen",
			}),
		).toMatchObject({
			sessionId: "pen_123",
			projectRef: "project:/tmp/pencil/project-a",
			fileRef: "project:/tmp/pencil/project-a:documents/main.pen",
			gameId: null,
			projectRoot: "/tmp/pencil/project-a",
		});
	});
});
