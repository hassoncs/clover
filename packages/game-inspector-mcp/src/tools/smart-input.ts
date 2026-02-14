import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GameInspectorState } from "../types.js";

export function registerSmartInputTools(
	server: McpServer,
	state: GameInspectorState,
) {
	server.tool(
		"tap_entity",
		"Tap an entity by ID. Auto-resolves position from entity data, pushes a tap event, steps N frames, and returns updated game state.",
		{
			entityId: z.string().describe("Entity ID to tap"),
			stepFrames: z
				.number()
				.optional()
				.describe("Frames to step after tap (default: 10)"),
		},
		async (args) => {
			const entityId = args.entityId as string;
			const stepFrames = (args.stepFrames as number | undefined) ?? 10;

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

			const result = await state.page.evaluate(
				async (p: { entityId: string; stepFrames: number }) => {
					const w = window as unknown as Record<string, unknown>;
					const runtime = w.__GAME_RUNTIME__ as
						| {
								refs?: {
									gameSystemRunner?: {
										current?: {
											getSystem?: (
												name: string,
											) => Record<string, unknown> | undefined;
										};
									};
								};
								pushEvent?: (evt: Record<string, unknown>) => void;
						  }
						| undefined;
					const bridge = w.SlopcadeDebugBridge as
						| {
								step?: (frames: number) => Promise<Record<string, unknown>>;
						  }
						| undefined;
					const debugOps = w.debugOps as
						| {
								getPosition?: (
									id: string,
								) => Promise<{ x: number; y: number } | null>;
								getGameState?: () => Promise<Record<string, unknown>>;
						  }
						| undefined;

					if (!runtime || !bridge) {
						return { error: "Game runtime or debug bridge not available" };
					}

					let pos: { x: number; y: number } | null = null;
					if (debugOps?.getPosition) {
						pos = await debugOps.getPosition(p.entityId);
					}
					if (!pos) {
						const runner = runtime.refs?.gameSystemRunner?.current;
						const emSystem = runner?.getSystem?.("entity-manager") as
							| {
									entityManager?: {
										getEntity?: (
											id: string,
										) => { transform?: { x: number; y: number } } | undefined;
									};
							  }
							| undefined;
						const entity = emSystem?.entityManager?.getEntity?.(p.entityId);
						if (entity?.transform) {
							pos = { x: entity.transform.x, y: entity.transform.y };
						}
					}

					if (!pos) {
						return {
							error: `Entity "${p.entityId}" not found or has no position`,
						};
					}

					if (runtime.pushEvent) {
						runtime.pushEvent({
							type: "tap",
							x: 0,
							y: 0,
							worldX: pos.x,
							worldY: pos.y,
							targetEntityId: p.entityId,
						});
					}

					const stepResult = await bridge.step?.(p.stepFrames);

					let gameState: Record<string, unknown> | undefined;
					if (debugOps?.getGameState) {
						gameState = (await debugOps.getGameState()) as Record<
							string,
							unknown
						>;
					}

					return {
						success: true,
						entityId: p.entityId,
						position: pos,
						framesAdvanced: p.stepFrames,
						stepResult,
						gameState,
					};
				},
				{ entityId, stepFrames },
			);

			return {
				content: [
					{ type: "text" as const, text: JSON.stringify(result, null, 2) },
				],
			};
		},
	);

	server.tool(
		"drag_entity",
		"Drag an entity to a world position. Resolves entity position, pushes drag start/end events with stepping between them.",
		{
			entityId: z.string().describe("Entity ID to drag"),
			toX: z.number().describe("Target world X coordinate"),
			toY: z.number().describe("Target world Y coordinate"),
			stepFrames: z
				.number()
				.optional()
				.describe("Frames to step after drag end (default: 15)"),
		},
		async (args) => {
			const entityId = args.entityId as string;
			const toX = args.toX as number;
			const toY = args.toY as number;
			const stepFrames = (args.stepFrames as number | undefined) ?? 15;

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

			const result = await state.page.evaluate(
				async (p: {
					entityId: string;
					toX: number;
					toY: number;
					stepFrames: number;
				}) => {
					const w = window as unknown as Record<string, unknown>;
					const runtime = w.__GAME_RUNTIME__ as
						| {
								refs?: {
									gameSystemRunner?: {
										current?: {
											getSystem?: (
												name: string,
											) => Record<string, unknown> | undefined;
										};
									};
								};
								pushEvent?: (evt: Record<string, unknown>) => void;
						  }
						| undefined;
					const bridge = w.SlopcadeDebugBridge as
						| {
								step?: (frames: number) => Promise<Record<string, unknown>>;
						  }
						| undefined;
					const debugOps = w.debugOps as
						| {
								getPosition?: (
									id: string,
								) => Promise<{ x: number; y: number } | null>;
								getGameState?: () => Promise<Record<string, unknown>>;
						  }
						| undefined;

					if (!runtime || !bridge) {
						return { error: "Game runtime or debug bridge not available" };
					}

					let pos: { x: number; y: number } | null = null;
					if (debugOps?.getPosition) {
						pos = await debugOps.getPosition(p.entityId);
					}
					if (!pos) {
						const runner = runtime.refs?.gameSystemRunner?.current;
						const emSystem = runner?.getSystem?.("entity-manager") as
							| {
									entityManager?: {
										getEntity?: (
											id: string,
										) => { transform?: { x: number; y: number } } | undefined;
									};
							  }
							| undefined;
						const entity = emSystem?.entityManager?.getEntity?.(p.entityId);
						if (entity?.transform) {
							pos = { x: entity.transform.x, y: entity.transform.y };
						}
					}

					if (!pos) {
						return {
							error: `Entity "${p.entityId}" not found or has no position`,
						};
					}

					if (runtime.pushEvent) {
						runtime.pushEvent({
							type: "dragStart",
							x: 0,
							y: 0,
							startWorldX: pos.x,
							startWorldY: pos.y,
							currentWorldX: pos.x,
							currentWorldY: pos.y,
							targetEntityId: p.entityId,
						});
					}

					await bridge.step?.(1);

					if (runtime.pushEvent) {
						runtime.pushEvent({
							type: "dragEnd",
							x: 0,
							y: 0,
							worldX: p.toX,
							worldY: p.toY,
							worldVelocityX: 0,
							worldVelocityY: 0,
						});
					}

					const stepResult = await bridge.step?.(p.stepFrames);

					let gameState: Record<string, unknown> | undefined;
					if (debugOps?.getGameState) {
						gameState = (await debugOps.getGameState()) as Record<
							string,
							unknown
						>;
					}

					return {
						success: true,
						entityId: p.entityId,
						from: pos,
						to: { x: p.toX, y: p.toY },
						framesAdvanced: p.stepFrames + 1,
						stepResult,
						gameState,
					};
				},
				{ entityId, toX, toY, stepFrames },
			);

			return {
				content: [
					{ type: "text" as const, text: JSON.stringify(result, null, 2) },
				],
			};
		},
	);

	server.tool(
		"drag_entity_to",
		"Drag an entity to another entity's position. Resolves both positions automatically.",
		{
			entityId: z.string().describe("Entity ID to drag"),
			targetEntityId: z
				.string()
				.describe("Entity ID to drag to (target position)"),
			stepFrames: z
				.number()
				.optional()
				.describe("Frames to step after drag end (default: 15)"),
		},
		async (args) => {
			const entityId = args.entityId as string;
			const targetEntityId = args.targetEntityId as string;
			const stepFrames = (args.stepFrames as number | undefined) ?? 15;

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

			const result = await state.page.evaluate(
				async (p: {
					entityId: string;
					targetEntityId: string;
					stepFrames: number;
				}) => {
					const w = window as unknown as Record<string, unknown>;
					const runtime = w.__GAME_RUNTIME__ as
						| {
								refs?: {
									gameSystemRunner?: {
										current?: {
											getSystem?: (
												name: string,
											) => Record<string, unknown> | undefined;
										};
									};
								};
								pushEvent?: (evt: Record<string, unknown>) => void;
						  }
						| undefined;
					const bridge = w.SlopcadeDebugBridge as
						| {
								step?: (frames: number) => Promise<Record<string, unknown>>;
						  }
						| undefined;
					const debugOps = w.debugOps as
						| {
								getPosition?: (
									id: string,
								) => Promise<{ x: number; y: number } | null>;
								getGameState?: () => Promise<Record<string, unknown>>;
						  }
						| undefined;

					if (!runtime || !bridge) {
						return { error: "Game runtime or debug bridge not available" };
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
							| {
									entityManager?: {
										getEntity?: (
											id: string,
										) => { transform?: { x: number; y: number } } | undefined;
									};
							  }
							| undefined;
						const entity = emSystem?.entityManager?.getEntity?.(eid);
						if (entity?.transform) {
							return { x: entity.transform.x, y: entity.transform.y };
						}
						return null;
					};

					const fromPos = await resolvePos(p.entityId);
					if (!fromPos) {
						return {
							error: `Source entity "${p.entityId}" not found or has no position`,
						};
					}

					const toPos = await resolvePos(p.targetEntityId);
					if (!toPos) {
						return {
							error: `Target entity "${p.targetEntityId}" not found or has no position`,
						};
					}

					if (runtime.pushEvent) {
						runtime.pushEvent({
							type: "dragStart",
							x: 0,
							y: 0,
							startWorldX: fromPos.x,
							startWorldY: fromPos.y,
							currentWorldX: fromPos.x,
							currentWorldY: fromPos.y,
							targetEntityId: p.entityId,
						});
					}

					await bridge.step?.(1);

					if (runtime.pushEvent) {
						runtime.pushEvent({
							type: "dragEnd",
							x: 0,
							y: 0,
							worldX: toPos.x,
							worldY: toPos.y,
							worldVelocityX: 0,
							worldVelocityY: 0,
						});
					}

					const stepResult = await bridge.step?.(p.stepFrames);

					let gameState: Record<string, unknown> | undefined;
					if (debugOps?.getGameState) {
						gameState = (await debugOps.getGameState()) as Record<
							string,
							unknown
						>;
					}

					return {
						success: true,
						entityId: p.entityId,
						targetEntityId: p.targetEntityId,
						from: fromPos,
						to: toPos,
						framesAdvanced: p.stepFrames + 1,
						stepResult,
						gameState,
					};
				},
				{ entityId, targetEntityId, stepFrames },
			);

			return {
				content: [
					{ type: "text" as const, text: JSON.stringify(result, null, 2) },
				],
			};
		},
	);
}
