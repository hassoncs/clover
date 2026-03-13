import type {
	PenDocument,
	PenFrame,
	PenRectangle,
} from "@pencil/protocol/pen";
import { describe, expect, it } from "vitest";

import {
	buildPencilRuntimeState,
	createDesignStateRef,
	createEmbedDocumentForTarget,
	resolvePencilRuntimeBinding,
	translateLegacyWorkspaceIdentity,
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

describe("translateLegacyWorkspaceIdentity", () => {
	it("converts a legacy workspace id into the canonical runtime identity", () => {
		expect(
			translateLegacyWorkspaceIdentity("game-123", "designs/landing.pen"),
		).toEqual({
			sessionId: "session:game-123",
			projectRoot: "workspace:game-123",
			filePath: "designs/landing.pen",
			legacyWorkspaceId: "game-123",
		});
	});

	it("returns null when there is no legacy workspace id", () => {
		expect(translateLegacyWorkspaceIdentity(null, "canvas.pen")).toBeNull();
	});
});

describe("resolvePencilRuntimeBinding", () => {
	it("prefers canonical session/project/file identity over legacy workspace identity", () => {
		expect(
			resolvePencilRuntimeBinding({
				sessionId: "pen_123",
				projectRoot: "/tmp/pencil/project-a",
				filePath: "documents/main.pen",
				legacyWorkspaceId: "legacy-game",
			}),
		).toMatchObject({
			source: "canonical",
			identity: {
				sessionId: "pen_123",
				projectRoot: "/tmp/pencil/project-a",
				filePath: "documents/main.pen",
			},
			legacyWorkspaceId: null,
			projectRef: "project:/tmp/pencil/project-a",
			fileRef: "project:/tmp/pencil/project-a:documents/main.pen",
		});
	});

	it("falls back to the isolated legacy translation seam", () => {
		expect(
			resolvePencilRuntimeBinding({
				sessionId: null,
				projectRoot: null,
				filePath: "documents/main.pen",
				legacyWorkspaceId: "legacy-game",
			}),
		).toMatchObject({
			source: "legacy-workspace",
			identity: {
				sessionId: "session:legacy-game",
				projectRoot: "workspace:legacy-game",
				filePath: "documents/main.pen",
			},
			legacyWorkspaceId: "legacy-game",
		});
	});

	it("returns a local-storage binding when no remote identity is configured", () => {
		expect(
			resolvePencilRuntimeBinding({
				sessionId: null,
				projectRoot: null,
				filePath: "canvas.pen",
				legacyWorkspaceId: null,
			}),
		).toMatchObject({
			source: "local-storage",
			identity: null,
			projectRef: "local-storage",
		});
	});
});

describe("buildPencilRuntimeState", () => {
	it("exposes canonical session/project/file runtime metadata", () => {
		const doc: PenDocument = {
			version: 1,
			children: [frame({ id: "screen", children: [rectangle({ id: "cta" })] })],
		};

		const state = buildPencilRuntimeState({
			document: doc,
			sessionId: "pen_a3f8b2c1",
			projectRoot: "/tmp/pencil/project-a",
			filePath: "documents/main.pen",
			targetId: "cta",
			targetPath: ["screen", "cta"],
			mode: "embed",
		});

		expect(state.sessionId).toBe("pen_a3f8b2c1");
		expect(state.projectRoot).toBe("/tmp/pencil/project-a");
		expect(state.filePath).toBe("documents/main.pen");
		expect(state.targetId).toBe("cta");
		expect(state.targetPath).toEqual(["screen", "cta"]);
		expect(state.designStateRef).toMatch(/^pen:/);
		expect(state.mode).toBe("embed");
	});

	it("uses the compatibility translation only when canonical identity is absent", () => {
		const doc: PenDocument = {
			version: 1,
			children: [frame({ id: "screen" })],
		};

		const state = buildPencilRuntimeState({
			document: doc,
			sessionId: null,
			projectRoot: null,
			filePath: "designs/landing.pen",
			legacyWorkspaceId: "game-123",
			targetId: null,
			targetPath: null,
			mode: "prism",
		});

		expect(state.sessionId).toBe("session:game-123");
		expect(state.projectRoot).toBe("workspace:game-123");
		expect(state.filePath).toBe("designs/landing.pen");
	});
});
