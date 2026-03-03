import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
	PenNodeType,
	PenToolFacade,
	RuntimeNode,
	RuntimeNodeCreateProps,
	RuntimeNodeUpdatePatch,
} from "@slopcade/design-canvas/pen/runtime";
import { z } from "zod";
import { ServerBridge } from "../server-bridge.js";
import type { GameInspectorState } from "../types.js";
import { ensurePage, takeScreenshotToBuffer } from "../utils.js";

const PENCIL_URL = "http://localhost:8089";

type PencilBridgeResult =
	| { ok: true; opCount?: number }
	| { ok: false; error: string };

type ToolSuccess<T> = { success: true; data: T };
type ToolFailure = { success: false; error: string };
type ToolResult<T> = ToolSuccess<T> | ToolFailure;

type McpTextContent = { content: [{ type: "text"; text: string }] };

type CanvasOp =
	| {
			type: "addFrame";
			id?: string;
			title?: string;
			width?: number;
			height?: number;
			x?: number;
			y?: number;
	  }
	| { type: "updateFrame"; id: string; patch: Record<string, unknown> }
	| { type: "deleteFrame"; id: string }
	| {
			type: "addElement";
			frameId: string;
			element: Record<string, unknown>;
	  }
	| {
			type: "updateElement";
			frameId: string;
			elementId: string;
			patch: Record<string, unknown>;
	  }
	| { type: "deleteElement"; frameId: string; elementId: string };

export const LEGACY_BRIDGE_DEPRECATION_WARNING =
	"DEPRECATED: __PENCIL_BRIDGE__ bridge in use. Register a ServerBridge facade for headless operation.";

function toMcpText(result: ToolResult<unknown>): McpTextContent {
	return {
		content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
	};
}

// --- Server-path pure functions (no browser required) ---

export function getDocumentViaFacade(
	facade: PenToolFacade,
): ToolResult<{ nodes: RuntimeNode[] }> {
	const nodes = facade.findNodes(() => true);
	return { success: true, data: { nodes } };
}

export function applyOpsViaFacade(
	facade: PenToolFacade,
	opsJson: string,
): ToolResult<{ opCount: number }> {
	let ops: CanvasOp[];
	try {
		const parsed: unknown = JSON.parse(opsJson);
		if (!Array.isArray(parsed)) {
			return { success: false, error: "ops must be a JSON array" };
		}
		ops = parsed as CanvasOp[];
	} catch {
		return { success: false, error: "Invalid JSON in ops parameter" };
	}

	let opCount = 0;
	for (const op of ops) {
		try {
			switch (op.type) {
				case "addFrame": {
					const { title, width, height, x, y } = op;
					facade.createNode("frame", facade.graph.rootId, {
						name: title,
						width: width ?? 400,
						height: height ?? 300,
						x: x ?? 0,
						y: y ?? 0,
					});
					opCount++;
					break;
				}
				case "updateFrame":
					facade.updateNode(op.id, op.patch as RuntimeNodeUpdatePatch);
					opCount++;
					break;
				case "deleteFrame":
					facade.deleteNode(op.id);
					opCount++;
					break;
				case "addElement": {
					const elementType = op.element["type"] as string | undefined;
					const nodeType = (elementType ?? "rectangle") as PenNodeType;
					const nodeProps: Record<string, unknown> = { ...op.element };
					delete nodeProps["type"];
					delete nodeProps["id"];
					facade.createNode(
						nodeType,
						op.frameId,
						nodeProps as RuntimeNodeCreateProps,
					);
					opCount++;
					break;
				}
				case "updateElement":
					facade.updateNode(op.elementId, op.patch as RuntimeNodeUpdatePatch);
					opCount++;
					break;
				case "deleteElement":
					facade.deleteNode(op.elementId);
					opCount++;
					break;
				default:
					return { success: false, error: "Unknown op type in ops array" };
			}
		} catch (error) {
			return {
				success: false,
				error: `Op "${op.type}" failed: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}

	return { success: true, data: { opCount } };
}

// --- Exported tool handlers (testable without MCP server) ---

export async function executeGetDocument(
	state: GameInspectorState,
): Promise<McpTextContent> {
	const facade = ServerBridge.getInstance();
	if (facade) {
		return toMcpText(getDocumentViaFacade(facade));
	}

	console.warn(LEGACY_BRIDGE_DEPRECATION_WARNING);

	if (!state.page) {
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify({
						error: "No browser open. Call pencil_open first.",
					}),
				},
			],
		};
	}

	const result = await state.page.evaluate(() => {
		const bridge = (
			window as unknown as {
				__PENCIL_BRIDGE__?: { getDocument: () => string };
			}
		).__PENCIL_BRIDGE__;
		if (!bridge)
			return {
				error:
					"__PENCIL_BRIDGE__ not registered. Is the Pencil web app running at port 8089?",
			};
		return { document: JSON.parse(bridge.getDocument()) };
	});

	return {
		content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
	};
}

export async function executeGetSelection(
	state: GameInspectorState,
): Promise<McpTextContent> {
	const facade = ServerBridge.getInstance();
	if (facade) {
		return toMcpText({
			success: false,
			error: "Selection state is not available in headless mode",
		});
	}

	console.warn(LEGACY_BRIDGE_DEPRECATION_WARNING);

	if (!state.page) {
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify({
						error: "No browser open. Call pencil_open first.",
					}),
				},
			],
		};
	}

	const result = await state.page.evaluate(() => {
		const bridge = (
			window as unknown as {
				__PENCIL_BRIDGE__?: { getSelection: () => string };
			}
		).__PENCIL_BRIDGE__;
		if (!bridge) return { error: "__PENCIL_BRIDGE__ not registered" };
		return JSON.parse(bridge.getSelection());
	});

	return {
		content: [{ type: "text", text: JSON.stringify(result) }],
	};
}

export async function executeApplyOps(
	state: GameInspectorState,
	opsJson: string,
): Promise<McpTextContent> {
	const facade = ServerBridge.getInstance();
	if (facade) {
		return toMcpText(applyOpsViaFacade(facade, opsJson));
	}

	console.warn(LEGACY_BRIDGE_DEPRECATION_WARNING);

	if (!state.page) {
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify({
						error: "No browser open. Call pencil_open first.",
					}),
				},
			],
		};
	}

	const result = await state.page.evaluate((json: string) => {
		const bridge = (
			window as unknown as {
				__PENCIL_BRIDGE__?: {
					applyOps: (ops: string) => PencilBridgeResult;
				};
			}
		).__PENCIL_BRIDGE__;
		if (!bridge) {
			return { ok: false, error: "__PENCIL_BRIDGE__ not registered" };
		}
		return bridge.applyOps(json);
	}, opsJson);

	return {
		content: [{ type: "text", text: JSON.stringify(result) }],
	};
}

// --- MCP tool registration ---

export function registerPencilTools(
	server: McpServer,
	state: GameInspectorState,
) {
	server.tool(
		"pencil_open",
		"Open the Pencil design canvas in the browser (http://localhost:8089). Call this before any other pencil_ tools.",
		{},
		async () => {
			const page = await ensurePage(state);
			await page.goto(PENCIL_URL, { waitUntil: "networkidle" });

			// Wait for the bridge to register (Pencil app mounts the bridge on useEffect)
			try {
				await page.waitForFunction(
					() =>
						!!(window as unknown as { __PENCIL_BRIDGE__?: unknown })
							.__PENCIL_BRIDGE__,
					{ timeout: 10000 },
				);
			} catch {
				// Bridge may not be available if API isn't running — continue anyway
			}

			return {
				content: [
					{
						type: "text" as const,
						text: JSON.stringify({ ok: true, url: PENCIL_URL }),
					},
				],
			};
		},
	);

	server.tool(
		"pencil_screenshot",
		"Capture a screenshot of the Pencil design canvas. Returns the image directly.",
		{
			filename: z
				.string()
				.optional()
				.describe("Optional file path to save the screenshot to"),
		},
		async (args) => {
			if (!state.page) {
				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({
								error: "No browser open. Call pencil_open first.",
							}),
						},
					],
				};
			}

			const filename = args.filename as string | undefined;
			if (filename) {
				await state.page.screenshot({ path: filename, fullPage: false });
				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({ ok: true, filename }),
						},
					],
				};
			}

			const result = await takeScreenshotToBuffer(state.page);
			const base64 = result.buffer.toString("base64");
			return {
				content: [
					{
						type: "image" as const,
						data: base64,
						mimeType: "image/png",
					},
				],
			};
		},
	);

	server.tool(
		"pencil_get_document",
		"Get the current DesignDocument JSON from the Pencil canvas. Returns frames and elements.",
		{},
		async () => executeGetDocument(state),
	);

	server.tool(
		"pencil_get_selection",
		"Get the currently selected frame and element IDs in the Pencil canvas.",
		{},
		async () => executeGetSelection(state),
	);

	server.tool(
		"pencil_apply_ops",
		// DEPRECATED: use pencil_create_node, pencil_update_node, etc. instead
		`Apply canvas operations to the live Pencil design document.
Supported op types:
  { type: "addFrame", id?, title?, width?, height?, x?, y? }
  { type: "updateFrame", id, patch }
  { type: "deleteFrame", id }
  { type: "addElement", frameId, element: { id?, type?, label?, ...props } }
  { type: "updateElement", frameId, elementId, patch }
  { type: "deleteElement", frameId, elementId }`,
		{
			ops: z
				.string()
				.describe(
					"JSON array of CanvasOp objects to apply to the design document",
				),
		},
		async (args) => executeApplyOps(state, args.ops as string),
	);
}
