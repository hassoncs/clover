import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GameInspectorState } from "../types.js";
import { ensurePage, takeScreenshotToBuffer } from "../utils.js";

const PENCIL_URL = "http://localhost:8089";

type PencilBridgeResult =
	| { ok: true; opCount?: number }
	| { ok: false; error: string };

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
		async () => {
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
				content: [
					{ type: "text" as const, text: JSON.stringify(result, null, 2) },
				],
			};
		},
	);

	server.tool(
		"pencil_get_selection",
		"Get the currently selected frame and element IDs in the Pencil canvas.",
		{},
		async () => {
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
				content: [{ type: "text" as const, text: JSON.stringify(result) }],
			};
		},
	);

	server.tool(
		"pencil_apply_ops",
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

			const opsJson = args.ops as string;

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
				content: [{ type: "text" as const, text: JSON.stringify(result) }],
			};
		},
	);
}
