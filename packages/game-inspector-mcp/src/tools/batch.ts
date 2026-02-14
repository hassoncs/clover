import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GameInspectorState } from "../types.js";
import { takeScreenshot } from "../utils.js";

const actionSchema = z.object({
	type: z.enum([
		"tap_entity",
		"tap_position",
		"drag",
		"step",
		"wait",
		"screenshot",
		"assert_variable",
		"call_script",
	]),
	entityId: z.string().optional(),
	x: z.number().optional(),
	y: z.number().optional(),
	targetEntityId: z.string().optional(),
	toX: z.number().optional(),
	toY: z.number().optional(),
	frames: z.number().optional(),
	ms: z.number().optional(),
	filename: z.string().optional(),
	variable: z.string().optional(),
	expected: z.unknown().optional(),
	export: z.string().optional(),
	args: z.record(z.unknown()).optional(),
});

type Action = z.infer<typeof actionSchema>;

interface ActionResult {
	action: string;
	index: number;
	success: boolean;
	error?: string;
	data?: Record<string, unknown>;
}

interface RuntimeApi {
	refs?: {
		gameSystemRunner?: {
			current?: {
				getSystem?: (name: string) => Record<string, unknown> | undefined;
			};
		};
	};
	pushEvent?: (evt: Record<string, unknown>) => void;
}

interface BridgeApi {
	step?: (frames: number) => Promise<Record<string, unknown>>;
}

interface DebugOpsApi {
	getPosition?: (id: string) => Promise<{ x: number; y: number } | null>;
	getGameState?: () => Promise<Record<string, unknown>>;
}

interface EntityManagerApi {
	entityManager?: {
		getEntity?: (
			id: string,
		) => { transform?: { x: number; y: number } } | undefined;
	};
}

interface ScriptSandboxApi {
	getSandbox?: () =>
		| {
				callExport?: (name: string, args?: Record<string, unknown>) => unknown;
		  }
		| undefined;
}

export function registerBatchTools(
	server: McpServer,
	state: GameInspectorState,
) {
	server.tool(
		"execute_moves",
		"Execute a sequence of tube-to-tube moves for Ball Sort. Each move is [fromTubeIndex, toTubeIndex]. Example: [[0, 1], [2, 0]] moves from tube-0 to tube-1, then tube-2 to tube-0.",
		{
			moves: z
				.array(z.array(z.number()).length(2))
				.describe(
					"Array of [fromTubeIndex, toTubeIndex] pairs. Tube indices are 0-based.",
				),
			framesPerMove: z
				.number()
				.optional()
				.describe("Frames to step after each move (default: 10)"),
			finalScreenshot: z
				.boolean()
				.optional()
				.describe("Take a screenshot after all moves (default: false)"),
		},
		async (args) => {
			const moves = args.moves as number[][];
			const framesPerMove = (args.framesPerMove as number | undefined) ?? 10;
			const finalScreenshot =
				(args.finalScreenshot as boolean | undefined) ?? false;

			if (!Array.isArray(moves) || moves.length === 0) {
				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({
								error:
									"moves must be a non-empty array of [fromTubeIndex, toTubeIndex] pairs",
								example: "[[0, 1], [2, 0]]",
								received: moves,
							}),
						},
					],
				};
			}

			for (let i = 0; i < moves.length; i++) {
				const move = moves[i];
				if (!Array.isArray(move) || move.length !== 2) {
					return {
						content: [
							{
								type: "text" as const,
								text: JSON.stringify({
									error: `Invalid move at index ${i}: must be [fromTubeIndex, toTubeIndex]`,
									move: move,
									expectedFormat: "[number, number]",
								}),
							},
						],
					};
				}
				if (typeof move[0] !== "number" || typeof move[1] !== "number") {
					return {
						content: [
							{
								type: "text" as const,
								text: JSON.stringify({
									error: `Invalid move at index ${i}: both values must be numbers`,
									move: move,
								}),
							},
						],
					};
				}
			}

			if (!state.page) {
				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({ error: "No game open. Call open first." }),
						},
					],
				};
			}

			const results: Array<{
				move: number[];
				moveIndex: number;
				success: boolean;
				fromEntityId: string;
				toEntityId: string;
				error?: string;
			}> = [];

			for (let i = 0; i < moves.length; i++) {
				const [fromIdx, toIdx] = moves[i];
				const fromEntityId = `tube-${fromIdx}`;
				const toEntityId = `tube-${toIdx}`;

				const result = await state.page.evaluate(
					async (p: {
						fromEntityId: string;
						toEntityId: string;
						framesPerMove: number;
						moveIndex: number;
						move: number[];
					}) => {
						const w = window as unknown as Record<string, unknown>;
						const runtime = w.__GAME_RUNTIME__ as RuntimeApi | undefined;
						const bridge = w.SlopcadeDebugBridge as BridgeApi | undefined;
						const debugOps = w.debugOps as DebugOpsApi | undefined;

						if (!runtime) {
							return {
								success: false,
								error: "Game runtime not available",
							};
						}

						const fromPos = await debugOps?.getPosition?.(p.fromEntityId);
						const toPos = await debugOps?.getPosition?.(p.toEntityId);

						if (!fromPos) {
							return {
								success: false,
								error: `Tube "${p.fromEntityId}" not found`,
							};
						}
						if (!toPos) {
							return {
								success: false,
								error: `Tube "${p.toEntityId}" not found`,
							};
						}

						runtime.pushEvent?.({
							type: "tap",
							x: 0,
							y: 0,
							worldX: fromPos.x,
							worldY: fromPos.y,
							targetEntityId: p.fromEntityId,
						});

						// Step to let the game pick up the ball
						await bridge?.step?.(1);

						runtime.pushEvent?.({
							type: "tap",
							x: 0,
							y: 0,
							worldX: toPos.x,
							worldY: toPos.y,
							targetEntityId: p.toEntityId,
						});

						await bridge?.step?.(p.framesPerMove - 1);

						return {
							success: true,
							fromPos,
							toPos,
						};
					},
					{
						fromEntityId,
						toEntityId,
						framesPerMove,
						moveIndex: i,
						move: moves[i],
					},
				);

				results.push({
					move: moves[i],
					moveIndex: i,
					success: result.success ?? false,
					fromEntityId,
					toEntityId,
					error: result.error,
				});

				if (!result.success) {
					break;
				}
			}

			const response: Record<string, unknown> = {
				success: results.every((r) => r.success),
				totalMoves: moves.length,
				completedMoves: results.filter((r) => r.success).length,
				results,
			};

			if (state.page) {
				const gameState = await state.page.evaluate(() => {
					const w = window as unknown as Record<string, unknown>;
					const ops = w.debugOps as
						| { getGameState?: () => Record<string, unknown> }
						| undefined;
					return ops?.getGameState?.() ?? null;
				});
				if (gameState) {
					response.gameState = gameState;
				}
			}

			if (finalScreenshot && state.page) {
				try {
					const ssResult = await takeScreenshot(state.page, {
						prefix: "moves-final",
					});
					response.screenshotPath = ssResult.filepath;
				} catch {}
			}

			return {
				content: [
					{
						type: "text" as const,
						text: JSON.stringify(response, null, 2),
					},
				],
			};
		},
	);

	server.tool(
		"execute_sequence",
		"Execute a series of game actions in one call. Supports tap_entity, tap_position, drag, step, wait, screenshot, assert_variable, and call_script actions.",
		{
			actions: z
				.array(actionSchema)
				.describe("Array of actions to execute sequentially"),
			finalScreenshot: z
				.boolean()
				.optional()
				.describe("Take a screenshot after all actions (default: false)"),
			finalState: z
				.boolean()
				.optional()
				.describe("Return game state after all actions (default: true)"),
		},
		async (args) => {
			if (!args.actions || !Array.isArray(args.actions)) {
				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({
								error: "Parameter 'actions' is required and must be an array",
								received: typeof args.actions,
								example: {
									actions: [
										{ type: "tap_entity", entityId: "tube-0" },
										{ type: "step", frames: 10 },
									],
								},
								hint: "For Ball Sort moves, use execute_moves with [[fromTube, toTube], ...] format",
							}),
						},
					],
				};
			}

			const actions = args.actions as Action[];
			const finalScreenshot =
				(args.finalScreenshot as boolean | undefined) ?? false;
			const finalState = (args.finalState as boolean | undefined) ?? true;

			if (!state.page) {
				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({
								error: "No game open. Call game_open first.",
							}),
						},
					],
				};
			}

			const results: ActionResult[] = [];
			const assertions: {
				passed: number;
				failed: number;
				details: Array<{
					variable: string;
					expected: unknown;
					actual: unknown;
					passed: boolean;
				}>;
			} = { passed: 0, failed: 0, details: [] };

			for (let i = 0; i < actions.length; i++) {
				const action = actions[i];

				if (action.type === "screenshot") {
					try {
						const ssResult = await takeScreenshot(state.page, {
							filepath: action.filename,
							prefix: `batch-${i}`,
						});
						results.push({
							action: action.type,
							index: i,
							success: true,
							data: {
								filepath: ssResult.filepath,
								width: ssResult.width,
								height: ssResult.height,
							},
						});
					} catch (err) {
						results.push({
							action: action.type,
							index: i,
							success: false,
							error: err instanceof Error ? err.message : String(err),
						});
					}
					continue;
				}

				if (action.type === "wait") {
					const ms = action.ms ?? 100;
					await new Promise((resolve) => setTimeout(resolve, ms));
					results.push({
						action: action.type,
						index: i,
						success: true,
						data: { waitedMs: ms },
					});
					continue;
				}

				const evalResult = await state.page.evaluate(
					async (p: {
						action: Action;
						index: number;
					}): Promise<ActionResult> => {
						const w = window as unknown as Record<string, unknown>;
						const runtime = w.__GAME_RUNTIME__ as RuntimeApi | undefined;
						const bridge = w.SlopcadeDebugBridge as BridgeApi | undefined;
						const debugOps = w.debugOps as DebugOpsApi | undefined;

						if (!runtime) {
							return {
								action: p.action.type,
								index: p.index,
								success: false,
								error: "Game runtime not available",
							};
						}

						const resolvePos = async (
							eid: string,
						): Promise<{ x: number; y: number } | null> => {
							if (debugOps?.getPosition) {
								const pos = await debugOps.getPosition(eid);
								if (pos) return pos;
							}
							const runner = runtime.refs?.gameSystemRunner?.current;
							const emSystem = runner?.getSystem?.("entity-manager") as
								| EntityManagerApi
								| undefined;
							const entity = emSystem?.entityManager?.getEntity?.(eid);
							if (entity?.transform) {
								return {
									x: entity.transform.x,
									y: entity.transform.y,
								};
							}
							return null;
						};

						const act = p.action;

						switch (act.type) {
							case "tap_entity": {
								if (!act.entityId) {
									return {
										action: act.type,
										index: p.index,
										success: false,
										error: "entityId required",
									};
								}
								const pos = await resolvePos(act.entityId);
								if (!pos) {
									return {
										action: act.type,
										index: p.index,
										success: false,
										error: `Entity "${act.entityId}" not found`,
									};
								}
								runtime.pushEvent?.({
									type: "tap",
									x: 0,
									y: 0,
									worldX: pos.x,
									worldY: pos.y,
									targetEntityId: act.entityId,
								});
								const stepRes = await bridge?.step?.(act.frames ?? 10);
								return {
									action: act.type,
									index: p.index,
									success: true,
									data: {
										entityId: act.entityId,
										position: pos,
										stepResult: stepRes,
									},
								};
							}

							case "tap_position": {
								if (act.x === undefined || act.y === undefined) {
									return {
										action: act.type,
										index: p.index,
										success: false,
										error: "x and y required",
									};
								}
								runtime.pushEvent?.({
									type: "tap",
									x: 0,
									y: 0,
									worldX: act.x,
									worldY: act.y,
								});
								const stepRes = await bridge?.step?.(act.frames ?? 10);
								return {
									action: act.type,
									index: p.index,
									success: true,
									data: {
										position: { x: act.x, y: act.y },
										stepResult: stepRes,
									},
								};
							}

							case "drag": {
								const fromId = act.entityId;
								let fromPos: { x: number; y: number } | null = null;
								if (fromId) {
									fromPos = await resolvePos(fromId);
								} else if (act.x !== undefined && act.y !== undefined) {
									fromPos = { x: act.x, y: act.y };
								}
								if (!fromPos) {
									return {
										action: act.type,
										index: p.index,
										success: false,
										error: "Could not resolve drag start position",
									};
								}

								let toPos: { x: number; y: number } | null = null;
								if (act.targetEntityId) {
									toPos = await resolvePos(act.targetEntityId);
								} else if (act.toX !== undefined && act.toY !== undefined) {
									toPos = { x: act.toX, y: act.toY };
								}
								if (!toPos) {
									return {
										action: act.type,
										index: p.index,
										success: false,
										error: "Could not resolve drag end position",
									};
								}

								runtime.pushEvent?.({
									type: "dragStart",
									x: 0,
									y: 0,
									startWorldX: fromPos.x,
									startWorldY: fromPos.y,
									currentWorldX: fromPos.x,
									currentWorldY: fromPos.y,
									targetEntityId: fromId,
								});
								await bridge?.step?.(1);
								runtime.pushEvent?.({
									type: "dragEnd",
									x: 0,
									y: 0,
									worldX: toPos.x,
									worldY: toPos.y,
									worldVelocityX: 0,
									worldVelocityY: 0,
								});
								const stepRes = await bridge?.step?.(act.frames ?? 15);
								return {
									action: act.type,
									index: p.index,
									success: true,
									data: {
										from: fromPos,
										to: toPos,
										stepResult: stepRes,
									},
								};
							}

							case "step": {
								const stepRes = await bridge?.step?.(act.frames ?? 1);
								return {
									action: act.type,
									index: p.index,
									success: true,
									data: { stepResult: stepRes },
								};
							}

							case "assert_variable": {
								if (!act.variable) {
									return {
										action: act.type,
										index: p.index,
										success: false,
										error: "variable required",
									};
								}
								const runner = runtime.refs?.gameSystemRunner?.current;
								const rules = runner?.getSystem?.("rules") as
									| {
											getVariable?: (name: string) => unknown;
									  }
									| undefined;
								const actual = rules?.getVariable?.(act.variable);
								const passed =
									JSON.stringify(actual) === JSON.stringify(act.expected);
								return {
									action: act.type,
									index: p.index,
									success: true,
									data: {
										variable: act.variable,
										expected: act.expected as
											| Record<string, unknown>
											| undefined,
										actual: actual as Record<string, unknown> | undefined,
										passed,
									},
								};
							}

							case "call_script": {
								if (!act.export) {
									return {
										action: act.type,
										index: p.index,
										success: false,
										error: "export name required",
									};
								}
								const runner = runtime.refs?.gameSystemRunner?.current;
								const scriptSystem = runner?.getSystem?.("script-sandbox") as
									| ScriptSandboxApi
									| undefined;
								const sandbox = scriptSystem?.getSandbox?.();
								if (!sandbox?.callExport) {
									return {
										action: act.type,
										index: p.index,
										success: false,
										error: "Script sandbox not available",
									};
								}
								try {
									const result = sandbox.callExport(act.export, act.args);
									return {
										action: act.type,
										index: p.index,
										success: true,
										data: {
											export: act.export,
											result: result as Record<string, unknown> | undefined,
										},
									};
								} catch (err) {
									return {
										action: act.type,
										index: p.index,
										success: false,
										error: err instanceof Error ? err.message : String(err),
									};
								}
							}

							default:
								return {
									action: act.type,
									index: p.index,
									success: false,
									error: `Unknown action type: ${act.type}`,
								};
						}
					},
					{ action, index: i },
				);

				results.push(evalResult);

				if (evalResult.action === "assert_variable" && evalResult.data) {
					const detail = {
						variable: action.variable ?? "",
						expected: action.expected,
						actual: evalResult.data.actual,
						passed: evalResult.data.passed as boolean,
					};
					assertions.details.push(detail);
					if (detail.passed) {
						assertions.passed++;
					} else {
						assertions.failed++;
					}
				}
			}

			const response: Record<string, unknown> = { results };

			if (assertions.details.length > 0) {
				response.assertions = assertions;
			}

			if (finalState && state.page) {
				const gameState = await state.page.evaluate(() => {
					const w = window as unknown as Record<string, unknown>;
					const ops = w.debugOps as
						| {
								getGameState?: () => Record<string, unknown>;
						  }
						| undefined;
					if (ops?.getGameState) {
						return ops.getGameState();
					}
					return null;
				});
				if (gameState) {
					response.finalState = gameState;
				}
			}

			if (finalScreenshot && state.page) {
				try {
					const ssResult = await takeScreenshot(state.page, {
						prefix: "batch-final",
					});
					response.screenshotPath = ssResult.filepath;
				} catch {}
			}

			return {
				content: [
					{
						type: "text" as const,
						text: JSON.stringify(response, null, 2),
					},
				],
			};
		},
	);
}
