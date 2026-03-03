import { PenToolFacade, SceneGraph } from "@slopcade/design-canvas/pen/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServerBridge } from "../../server-bridge.js";
import type { GameInspectorState } from "../../types.js";
import {
	applyOpsViaFacade,
	executeApplyOps,
	executeGetDocument,
	executeGetSelection,
	getDocumentViaFacade,
	LEGACY_BRIDGE_DEPRECATION_WARNING,
} from "../pencil.js";

function makeFacade(): PenToolFacade {
	return new PenToolFacade(new SceneGraph());
}

const headlessState: GameInspectorState = {
	browser: null,
	page: null,
	currentGameId: null,
	consoleLogs: [],
	maxLogEntries: 100,
	activeTargetId: null,
};

// ---------------------------------------------------------------------------
// ServerBridge registration API
// ---------------------------------------------------------------------------

describe("ServerBridge", () => {
	beforeEach(() => {
		ServerBridge.clear();
	});

	it("isAvailable returns false when no facade registered", () => {
		expect(ServerBridge.isAvailable()).toBe(false);
		expect(ServerBridge.getInstance()).toBeNull();
	});

	it("isAvailable returns true after register", () => {
		const facade = makeFacade();
		ServerBridge.register(facade);
		expect(ServerBridge.isAvailable()).toBe(true);
		expect(ServerBridge.getInstance()).toBe(facade);
	});

	it("getInstance returns the exact registered facade", () => {
		const facade = makeFacade();
		ServerBridge.register(facade);
		expect(ServerBridge.getInstance()).toBe(facade);
	});

	it("clear resets to null", () => {
		ServerBridge.register(makeFacade());
		ServerBridge.clear();
		expect(ServerBridge.isAvailable()).toBe(false);
		expect(ServerBridge.getInstance()).toBeNull();
	});

	it("register replaces a previously registered facade", () => {
		const first = makeFacade();
		const second = makeFacade();
		ServerBridge.register(first);
		ServerBridge.register(second);
		expect(ServerBridge.getInstance()).toBe(second);
	});
});

// ---------------------------------------------------------------------------
// getDocumentViaFacade — pure server-path function
// ---------------------------------------------------------------------------

describe("getDocumentViaFacade", () => {
	it("returns all nodes (including virtual root)", () => {
		const facade = makeFacade();
		const result = getDocumentViaFacade(facade);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(Array.isArray(result.data.nodes)).toBe(true);
		expect(result.data.nodes.length).toBeGreaterThan(0); // at least __root__
	});

	it("includes newly created nodes", () => {
		const facade = makeFacade();
		facade.createNode("frame", facade.graph.rootId, { name: "TestFrame" });
		const result = getDocumentViaFacade(facade);
		expect(result.success).toBe(true);
		if (!result.success) return;
		const names = result.data.nodes.map((n) => n.name);
		expect(names).toContain("TestFrame");
	});

	it("does not include deleted nodes", () => {
		const facade = makeFacade();
		const { node } = facade.createNode("frame", facade.graph.rootId, {
			name: "Ephemeral",
		});
		facade.deleteNode(node.id);
		const result = getDocumentViaFacade(facade);
		expect(result.success).toBe(true);
		if (!result.success) return;
		const names = result.data.nodes.map((n) => n.name);
		expect(names).not.toContain("Ephemeral");
	});
});

// ---------------------------------------------------------------------------
// applyOpsViaFacade — translate CanvasOps to facade calls
// ---------------------------------------------------------------------------

describe("applyOpsViaFacade", () => {
	it("applies addFrame op and increments opCount", () => {
		const facade = makeFacade();
		const ops = [
			{ type: "addFrame", title: "My Frame", width: 100, height: 200 },
		];
		const result = applyOpsViaFacade(facade, JSON.stringify(ops));
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.opCount).toBe(1);

		const frames = facade.findNodes(
			(n) => n.type === "frame" && n.name === "My Frame",
		);
		expect(frames).toHaveLength(1);
	});

	it("applies multiple ops in sequence", () => {
		const facade = makeFacade();
		const ops = [
			{ type: "addFrame", title: "Frame A" },
			{ type: "addFrame", title: "Frame B" },
		];
		const result = applyOpsViaFacade(facade, JSON.stringify(ops));
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.opCount).toBe(2);
	});

	it("applies updateFrame op", () => {
		const facade = makeFacade();
		const { node: frame } = facade.createNode("frame", facade.graph.rootId, {
			name: "Before",
		});
		const ops = [
			{ type: "updateFrame", id: frame.id, patch: { name: "After" } },
		];
		const result = applyOpsViaFacade(facade, JSON.stringify(ops));
		expect(result.success).toBe(true);
		const updated = facade.getNode(frame.id);
		expect(updated?.name).toBe("After");
	});

	it("applies deleteFrame op", () => {
		const facade = makeFacade();
		const { node: frame } = facade.createNode("frame", facade.graph.rootId, {});
		const ops = [{ type: "deleteFrame", id: frame.id }];
		const result = applyOpsViaFacade(facade, JSON.stringify(ops));
		expect(result.success).toBe(true);
		expect(facade.getNode(frame.id)).toBeUndefined();
	});

	it("applies addElement op under a frame", () => {
		const facade = makeFacade();
		const { node: frame } = facade.createNode("frame", facade.graph.rootId, {});
		const ops = [
			{
				type: "addElement",
				frameId: frame.id,
				element: { type: "rectangle", name: "MyRect", width: 50 },
			},
		];
		const result = applyOpsViaFacade(facade, JSON.stringify(ops));
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.opCount).toBe(1);

		const rects = facade.findNodes(
			(n) => n.type === "rectangle" && n.name === "MyRect",
		);
		expect(rects).toHaveLength(1);
	});

	it("applies updateElement op", () => {
		const facade = makeFacade();
		const { node: frame } = facade.createNode("frame", facade.graph.rootId, {});
		const { node: rect } = facade.createNode("rectangle", frame.id, {
			name: "Rect",
		});
		const ops = [
			{
				type: "updateElement",
				frameId: frame.id,
				elementId: rect.id,
				patch: { name: "UpdatedRect" },
			},
		];
		const result = applyOpsViaFacade(facade, JSON.stringify(ops));
		expect(result.success).toBe(true);
		expect(facade.getNode(rect.id)?.name).toBe("UpdatedRect");
	});

	it("applies deleteElement op", () => {
		const facade = makeFacade();
		const { node: frame } = facade.createNode("frame", facade.graph.rootId, {});
		const { node: rect } = facade.createNode("rectangle", frame.id, {});
		const ops = [
			{ type: "deleteElement", frameId: frame.id, elementId: rect.id },
		];
		const result = applyOpsViaFacade(facade, JSON.stringify(ops));
		expect(result.success).toBe(true);
		expect(facade.getNode(rect.id)).toBeUndefined();
	});

	it("returns error for invalid JSON", () => {
		const facade = makeFacade();
		const result = applyOpsViaFacade(facade, "not-json");
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error).toContain("Invalid JSON");
	});

	it("returns error when ops is not an array", () => {
		const facade = makeFacade();
		const result = applyOpsViaFacade(facade, '"not-an-array"');
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error).toContain("JSON array");
	});

	it("returns error for unknown op type", () => {
		const facade = makeFacade();
		const ops = [{ type: "flyToTheMoon" }];
		const result = applyOpsViaFacade(facade, JSON.stringify(ops));
		expect(result.success).toBe(false);
	});

	it("returns error and stops on facade error mid-ops", () => {
		const facade = makeFacade();
		const ops = [
			{ type: "addFrame", title: "Good" },
			{ type: "deleteFrame", id: "nonexistent-id" },
			{ type: "addFrame", title: "Never Reached" },
		];
		const result = applyOpsViaFacade(facade, JSON.stringify(ops));
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error).toContain("deleteFrame");
	});
});

// ---------------------------------------------------------------------------
// executeGetDocument — full handler (server path + deprecation fallback)
// ---------------------------------------------------------------------------

describe("executeGetDocument", () => {
	beforeEach(() => {
		ServerBridge.clear();
	});

	it("uses facade when ServerBridge is registered (no browser needed)", async () => {
		ServerBridge.register(makeFacade());
		const result = await executeGetDocument(headlessState);
		const parsed = JSON.parse(result.content[0].text) as {
			success: boolean;
			data: { nodes: unknown[] };
		};
		expect(parsed.success).toBe(true);
		expect(Array.isArray(parsed.data.nodes)).toBe(true);
	});

	it("includes nodes created before registration", async () => {
		const facade = makeFacade();
		facade.createNode("frame", facade.graph.rootId, {
			name: "RegistrationFrame",
		});
		ServerBridge.register(facade);

		const result = await executeGetDocument(headlessState);
		const parsed = JSON.parse(result.content[0].text) as {
			success: boolean;
			data: { nodes: Array<{ name?: string }> };
		};
		expect(parsed.success).toBe(true);
		const names = parsed.data.nodes.map((n) => n.name);
		expect(names).toContain("RegistrationFrame");
	});

	it("emits deprecation warning when no facade registered", async () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		await executeGetDocument(headlessState);
		expect(warnSpy).toHaveBeenCalledWith(LEGACY_BRIDGE_DEPRECATION_WARNING);
		warnSpy.mockRestore();
	});

	it("returns error when no facade and no page (headless fallback path)", async () => {
		const result = await executeGetDocument(headlessState);
		const parsed = JSON.parse(result.content[0].text) as { error?: string };
		expect(parsed.error).toBeDefined();
	});

	it("does NOT emit deprecation warning when facade is registered", async () => {
		ServerBridge.register(makeFacade());
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		await executeGetDocument(headlessState);
		expect(warnSpy).not.toHaveBeenCalled();
		warnSpy.mockRestore();
	});
});

// ---------------------------------------------------------------------------
// executeGetSelection — headless path returns informative error
// ---------------------------------------------------------------------------

describe("executeGetSelection", () => {
	beforeEach(() => {
		ServerBridge.clear();
	});

	it("returns headless-not-available message when facade registered", async () => {
		ServerBridge.register(makeFacade());
		const result = await executeGetSelection(headlessState);
		const parsed = JSON.parse(result.content[0].text) as {
			success: boolean;
			error?: string;
		};
		expect(parsed.success).toBe(false);
		expect(parsed.error).toContain("headless");
	});

	it("emits deprecation warning when no facade registered", async () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		await executeGetSelection(headlessState);
		expect(warnSpy).toHaveBeenCalledWith(LEGACY_BRIDGE_DEPRECATION_WARNING);
		warnSpy.mockRestore();
	});
});

// ---------------------------------------------------------------------------
// executeApplyOps — full handler (server path + deprecation fallback)
// ---------------------------------------------------------------------------

describe("executeApplyOps", () => {
	beforeEach(() => {
		ServerBridge.clear();
	});

	it("applies ops via facade when ServerBridge registered (no browser needed)", async () => {
		ServerBridge.register(makeFacade());
		const ops = JSON.stringify([{ type: "addFrame", title: "Headless Frame" }]);
		const result = await executeApplyOps(headlessState, ops);
		const parsed = JSON.parse(result.content[0].text) as {
			success: boolean;
			data: { opCount: number };
		};
		expect(parsed.success).toBe(true);
		expect(parsed.data.opCount).toBe(1);
	});

	it("emits deprecation warning when no facade registered", async () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		await executeApplyOps(headlessState, "[]");
		expect(warnSpy).toHaveBeenCalledWith(LEGACY_BRIDGE_DEPRECATION_WARNING);
		warnSpy.mockRestore();
	});

	it("returns error when no facade and no page", async () => {
		const result = await executeApplyOps(headlessState, "[]");
		const parsed = JSON.parse(result.content[0].text) as { error?: string };
		expect(parsed.error).toBeDefined();
	});
});
