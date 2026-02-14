import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GameInspectorState } from "../types.js";

export function registerUiTools(server: McpServer, state: GameInspectorState) {
	server.tool(
		"list_ui",
		"List all visible UI elements (dialogs, buttons, overlays). Use this to see what's clickable on the UI layer — separate from game entities.",
		{},
		async () => {
			if (!state.page) {
				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({
								error: "No game open. Call open first.",
							}),
						},
					],
				};
			}

			const result = await state.page.evaluate(() => {
				const runtime = (
					window as unknown as {
						__GAME_RUNTIME__?: { getActiveDialog?: () => unknown };
					}
				).__GAME_RUNTIME__;
				const ui: {
					dialog: unknown;
					gameState: string;
				} = {
					dialog: null,
					gameState: "unknown",
				};

				if (runtime?.getActiveDialog) {
					ui.dialog = runtime.getActiveDialog();
				}

				const debugOps = (
					window as unknown as {
						debugOps?: {
							getGameState?: () => { variables?: Record<string, unknown> };
						};
					}
				).debugOps;
				if (debugOps?.getGameState) {
					const gs = debugOps.getGameState();
					ui.gameState = (gs.variables?.gameState as string) ?? "unknown";
				}

				return ui;
			});

			return {
				content: [
					{
						type: "text" as const,
						text: JSON.stringify(result, null, 2),
					},
				],
			};
		},
	);

	server.tool(
		"press_button",
		"Press a UI button by its event name or label. Works for dialog buttons (Next Level, Replay, Play, etc). Use list_ui to see available buttons first.",
		{
			eventName: z
				.string()
				.optional()
				.describe("The eventName of the button to press (from list_ui output)"),
			label: z
				.string()
				.optional()
				.describe(
					"The label of the button to press (matched case-insensitively)",
				),
			stepFrames: z
				.number()
				.optional()
				.describe(
					"Frames to step after pressing (default: 30 — dialogs need more frames for transitions)",
				),
		},
		async (args) => {
			const eventName = args.eventName as string | undefined;
			const label = args.label as string | undefined;
			const stepFrames = (args.stepFrames as number | undefined) ?? 30;

			if (!eventName && !label) {
				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({
								error:
									"Provide either eventName or label to identify the button.",
							}),
						},
					],
				};
			}

			if (!state.page) {
				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({
								error: "No game open. Call open first.",
							}),
						},
					],
				};
			}

			const result = await state.page.evaluate(
				(params: {
					eventName?: string;
					label?: string;
					stepFrames: number;
				}) => {
					const runtime = (
						window as unknown as {
							__GAME_RUNTIME__?: {
								getActiveDialog?: () => {
									id: string;
									title: string;
									buttons: Array<{
										label: string;
										eventName: string;
										variant?: string;
									}>;
								} | null;
								pressDialogButton?: (
									eventName: string,
									data?: Record<string, unknown>,
								) => void;
							};
						}
					).__GAME_RUNTIME__;

					if (!runtime) {
						return { error: "Game runtime not available" };
					}

					const dialog = runtime.getActiveDialog?.();
					if (!dialog) {
						return {
							error: "No dialog currently visible",
							hint: "Use list_ui to check what's on screen",
						};
					}

					let resolvedEventName = params.eventName;
					if (!resolvedEventName && params.label) {
						const lowerLabel = params.label.toLowerCase();
						const match = dialog.buttons.find(
							(b) => b.label.toLowerCase() === lowerLabel,
						);
						if (!match) {
							return {
								error: `No button with label "${params.label}" found`,
								availableButtons: dialog.buttons.map((b) => ({
									label: b.label,
									eventName: b.eventName,
								})),
							};
						}
						resolvedEventName = match.eventName;
					}

					if (!resolvedEventName) {
						return { error: "Could not resolve button event name" };
					}

					const buttonInfo = dialog.buttons.find(
						(b) => b.eventName === resolvedEventName,
					);
					if (!buttonInfo) {
						return {
							error: `No button with eventName "${resolvedEventName}" in current dialog`,
							availableButtons: dialog.buttons.map((b) => ({
								label: b.label,
								eventName: b.eventName,
							})),
						};
					}

					runtime.pressDialogButton?.(resolvedEventName);

					return {
						success: true,
						pressed: {
							label: buttonInfo.label,
							eventName: resolvedEventName,
						},
						dialog: {
							id: dialog.id,
							title: dialog.title,
						},
					};
				},
				{ eventName, label, stepFrames },
			);

			if (
				result &&
				typeof result === "object" &&
				"success" in result &&
				result.success &&
				stepFrames > 0
			) {
				try {
					await state.page.evaluate(async (frames: number) => {
						const bridge = (
							window as unknown as {
								SlopcadeDebugBridge?: {
									step: (frames: number) => Promise<{ ok: boolean }>;
								};
							}
						).SlopcadeDebugBridge;
						if (bridge) {
							return bridge.step(frames);
						}
						return null;
					}, stepFrames);
				} catch {
					// step may fail if game reloads after button press
				}

				const gameState = await state.page
					.evaluate(() => {
						const debugOps = (
							window as unknown as {
								debugOps?: {
									getGameState?: () => unknown;
								};
							}
						).debugOps;
						return debugOps?.getGameState?.() ?? null;
					})
					.catch(() => null);

				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({ ...result, gameState }, null, 2),
						},
					],
				};
			}

			return {
				content: [
					{
						type: "text" as const,
						text: JSON.stringify(result, null, 2),
					},
				],
			};
		},
	);
}
