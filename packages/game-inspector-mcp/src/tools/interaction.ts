import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type {
	AssertParams,
	ConsoleLogEntry,
	GameInspectorState,
} from "../types.js";
import { getRecentLogs, takeScreenshot } from "../utils.js";

export function registerInteractionTools(
	server: McpServer,
	state: GameInspectorState,
) {
	server.tool(
		"simulate_input",
		"Simulate any type of user input - goes through the same code path as real input",
		{
			type: z
				.enum([
					"tap",
					"mouse_move",
					"mouse_leave",
					"drag_start",
					"drag_move",
					"drag_end",
					"key_down",
					"key_up",
				])
				.describe("Input type to simulate"),

			worldX: z
				.number()
				.optional()
				.describe("World X coordinate (for position-based inputs)"),
			worldY: z
				.number()
				.optional()
				.describe("World Y coordinate (for position-based inputs)"),

			startWorldX: z
				.number()
				.optional()
				.describe("Drag start X (for drag_start)"),
			startWorldY: z
				.number()
				.optional()
				.describe("Drag start Y (for drag_start)"),

			targetEntityId: z
				.string()
				.optional()
				.describe("Entity being dragged (for drag_start)"),

			velocity: z
				.object({
					x: z.number(),
					y: z.number(),
				})
				.optional()
				.describe("Release velocity (for drag_end)"),

			key: z
				.enum(["left", "right", "up", "down", "jump", "action"])
				.optional()
				.describe("Button key (for key_down/key_up)"),

			waitMs: z
				.number()
				.optional()
				.describe(
					"Time to wait after input before capturing screenshot/logs (default: 100ms)",
				),
			skipScreenshot: z
				.boolean()
				.optional()
				.describe("Skip automatic screenshot capture (default: false)"),
			skipLogs: z
				.boolean()
				.optional()
				.describe("Skip returning console logs (default: false)"),
		},
		async (args) => {
			const inputType = args.type as string;
			let worldX = args.worldX as number | undefined;
			let worldY = args.worldY as number | undefined;
			const startWorldX = args.startWorldX as number | undefined;
			const startWorldY = args.startWorldY as number | undefined;
			let targetEntityId = args.targetEntityId as string | undefined;
			const velocity = args.velocity as { x: number; y: number } | undefined;
			const key = args.key as string | undefined;
			const waitMs = (args.waitMs as number | undefined) ?? 100;
			const skipScreenshot =
				(args.skipScreenshot as boolean | undefined) ?? false;
			const skipLogs = (args.skipLogs as boolean | undefined) ?? false;

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

			let resolvedFromEntityId: string | undefined;
			let resolvedWorldX: number | undefined;
			let resolvedWorldY: number | undefined;

			if (
				inputType === "tap" &&
				targetEntityId &&
				(worldX === undefined || worldY === undefined)
			) {
				const entityResult = await state.page.evaluate(async (eid: string) => {
					const ops = (window as any).debugOps;
					if (!ops) return null;
					try {
						const data = await ops.getEntityData(eid);
						if (!data) return null;
						const pos = await ops.getPosition(eid);
						return { entityId: data.id, position: pos };
					} catch (e) {
						return null;
					}
				}, targetEntityId);

				if (!entityResult || !entityResult.position) {
					return {
						content: [
							{
								type: "text" as const,
								text: JSON.stringify({
									error: `Cannot tap entity: ${targetEntityId} - entity not found or has no position`,
									targetEntityId,
									resolved: false,
								}),
							},
						],
					};
				}

				worldX = entityResult.position.x;
				worldY = entityResult.position.y;
				resolvedFromEntityId = targetEntityId;
				resolvedWorldX = worldX;
				resolvedWorldY = worldY;
			}

			if (
				inputType === "tap" &&
				worldX !== undefined &&
				worldY !== undefined &&
				!targetEntityId
			) {
				const queryResult = await state.page.evaluate(
					async (p: { x: number; y: number }) => {
						const ops = (window as any).debugOps;
						if (!ops) return null;
						try {
							return await ops.queryPoint({ x: p.x, y: p.y });
						} catch (e) {
							return null;
						}
					},
					{ x: worldX, y: worldY },
				);

				if (queryResult) {
					targetEntityId = queryResult;
				}
			}

			const result = await state.page.evaluate(
				async (params: {
					type: string;
					worldX?: number;
					worldY?: number;
					startWorldX?: number;
					startWorldY?: number;
					targetEntityId?: string;
					velocity?: { x: number; y: number };
					key?: string;
				}) => {
					const runtime = (window as any).__GAME_RUNTIME__;
					if (!runtime) {
						return {
							error: "__GAME_RUNTIME__ not available. Is the game running?",
						};
					}

					switch (params.type) {
						case "tap":
							if (params.worldX === undefined || params.worldY === undefined) {
								return { error: "tap requires worldX and worldY" };
							}
							if (runtime.pushEvent) {
								runtime.pushEvent({
									type: "tap",
									x: 0,
									y: 0,
									worldX: params.worldX,
									worldY: params.worldY,
									targetEntityId: params.targetEntityId,
								});
							} else {
								runtime.setInput("tap", {
									x: 0,
									y: 0,
									worldX: params.worldX,
									worldY: params.worldY,
									targetEntityId: params.targetEntityId,
								});
							}
							return {
								success: true,
								type: "tap",
								world: { x: params.worldX, y: params.worldY },
								targetEntityId: params.targetEntityId,
							};

						case "mouse_move":
							if (params.worldX === undefined || params.worldY === undefined) {
								return { error: "mouse_move requires worldX and worldY" };
							}
							runtime.setInput("mouse", {
								x: 0,
								y: 0,
								worldX: params.worldX,
								worldY: params.worldY,
							});
							return {
								success: true,
								type: "mouse_move",
								world: { x: params.worldX, y: params.worldY },
							};

						case "mouse_leave":
							runtime.clearInput("mouse");
							return { success: true, type: "mouse_leave" };

						case "drag_start":
							if (
								params.startWorldX === undefined ||
								params.startWorldY === undefined
							) {
								return {
									error: "drag_start requires startWorldX and startWorldY",
								};
							}
							runtime.setInput("drag", {
								startX: 0,
								startY: 0,
								currentX: 0,
								currentY: 0,
								startWorldX: params.startWorldX,
								startWorldY: params.startWorldY,
								currentWorldX: params.startWorldX,
								currentWorldY: params.startWorldY,
								targetEntityId: params.targetEntityId,
							});
							return {
								success: true,
								type: "drag_start",
								world: { x: params.startWorldX, y: params.startWorldY },
								targetEntityId: params.targetEntityId,
							};

						case "drag_move": {
							if (params.worldX === undefined || params.worldY === undefined) {
								return { error: "drag_move requires worldX and worldY" };
							}
							const currentDrag = runtime.getInput?.("drag");
							if (!currentDrag) {
								return { error: "No active drag. Call drag_start first." };
							}
							runtime.setInput("drag", {
								...currentDrag,
								currentX: 0,
								currentY: 0,
								currentWorldX: params.worldX,
								currentWorldY: params.worldY,
							});
							return {
								success: true,
								type: "drag_move",
								world: { x: params.worldX, y: params.worldY },
							};
						}

						case "drag_end":
							if (!params.velocity) {
								return { error: "drag_end requires velocity {x, y}" };
							}
							runtime.setInput("dragEnd", {
								velocityX: 0,
								velocityY: 0,
								worldVelocityX: params.velocity.x,
								worldVelocityY: params.velocity.y,
							});
							runtime.clearInput("drag");
							return {
								success: true,
								type: "drag_end",
								velocity: params.velocity,
							};

						case "key_down":
							if (!params.key) {
								return { error: "key_down requires key parameter" };
							}
							{
								const keyMap: Record<string, string> = {
									left: "ArrowLeft",
									right: "ArrowRight",
									up: "ArrowUp",
									down: "ArrowDown",
									jump: " ",
									action: "Enter",
								};
								const keyCode = keyMap[params.key] || params.key;
								const event = new KeyboardEvent("keydown", {
									key: keyCode,
									bubbles: true,
									cancelable: true,
								});
								window.dispatchEvent(event);
							}
							return { success: true, type: "key_down", key: params.key };

						case "key_up":
							if (!params.key) {
								return { error: "key_up requires key parameter" };
							}
							{
								const keyMap: Record<string, string> = {
									left: "ArrowLeft",
									right: "ArrowRight",
									up: "ArrowUp",
									down: "ArrowDown",
									jump: " ",
									action: "Enter",
								};
								const keyCode = keyMap[params.key] || params.key;
								const event = new KeyboardEvent("keyup", {
									key: keyCode,
									bubbles: true,
									cancelable: true,
								});
								window.dispatchEvent(event);
							}
							return { success: true, type: "key_up", key: params.key };

						default:
							return { error: `Unknown input type: ${params.type}` };
					}
				},
				{
					type: inputType,
					worldX,
					worldY,
					startWorldX,
					startWorldY,
					targetEntityId,
					velocity,
					key,
				},
			);

			const timestampBeforeWait = Date.now();

			await new Promise((resolve) => setTimeout(resolve, Math.max(waitMs, 50)));

			let screenshotPath: string | undefined;
			if (!skipScreenshot && state.page) {
				try {
					const result = await takeScreenshot(state.page, {
						prefix: `input-${inputType}`,
					});
					screenshotPath = result.filepath;
				} catch {
					// Screenshot failed, continue without it
				}
			}

			let logs: ConsoleLogEntry[] = [];
			if (!skipLogs) {
				logs = getRecentLogs(state, timestampBeforeWait - 1000);
			}

			const response: Record<string, unknown> = {
				...(result as Record<string, unknown>),
			};
			if (screenshotPath) {
				response.screenshotPath = screenshotPath;
			}
			if (logs.length > 0) {
				response.logs = logs.map((l) => ({
					type: l.type,
					text: l.text,
					timestamp: l.timestamp,
				}));
			}
			if (resolvedFromEntityId) {
				response.targetEntityId = resolvedFromEntityId;
				response.resolvedWorldX = resolvedWorldX;
				response.resolvedWorldY = resolvedWorldY;
				response.resolvedFromEntityId = true;
			}

			return {
				content: [{ type: "text" as const, text: JSON.stringify(response) }],
			};
		},
	);

	server.tool(
		"game_wait_stationary",
		"Wait for an entity to stop moving",
		{
			entityId: z.string().describe("Entity ID to wait for"),
			timeout: z
				.number()
				.optional()
				.describe("Timeout in milliseconds (default: 5000)"),
			epsilon: z
				.number()
				.optional()
				.describe("Velocity threshold to consider stationary (default: 0.1)"),
		},
		async (args) => {
			const entityId = args.entityId as string;
			const timeout = (args.timeout as number | undefined) ?? 5000;
			const epsilon = (args.epsilon as number | undefined) ?? 0.1;

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

			const params = { entityId, timeout, epsilon };
			const result = await state.page.evaluate(async (p: typeof params) => {
				const ops = (window as any).debugOps;
				if (!ops) return { error: "debugOps not available" };

				const startTime = Date.now();
				const pollInterval = 50;

				while (Date.now() - startTime < p.timeout) {
					const vel = await ops.getVelocity(p.entityId);
					if (!vel)
						return {
							success: true,
							elapsedMs: Date.now() - startTime,
							timedOut: false,
							lastValue: true,
						};
					const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
					if (speed < p.epsilon)
						return {
							success: true,
							elapsedMs: Date.now() - startTime,
							timedOut: false,
							lastValue: true,
						};
					await new Promise((r) => setTimeout(r, pollInterval));
				}

				return {
					success: false,
					elapsedMs: Date.now() - startTime,
					timedOut: true,
					lastValue: false,
				};
			}, params);

			return {
				content: [{ type: "text" as const, text: JSON.stringify(result) }],
			};
		},
	);

	server.tool(
		"game_wait_collision",
		"Wait for a collision between two entities",
		{
			entityA: z.string().describe("First entity ID"),
			entityB: z.string().describe("Second entity ID"),
			timeout: z
				.number()
				.optional()
				.describe("Timeout in milliseconds (default: 5000)"),
		},
		async (args) => {
			const entityA = args.entityA as string;
			const entityB = args.entityB as string;
			const timeout = (args.timeout as number | undefined) ?? 5000;

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

			const params = { entityA, entityB, timeout };
			const result = await state.page.evaluate(async (p: typeof params) => {
				const w = window as any;
				if (!w.GodotDebugBridge)
					return { error: "GodotDebugBridge not available" };
				return w.GodotDebugBridge.waitForCollision(
					p.entityA,
					p.entityB,
					p.timeout,
				);
			}, params);

			return {
				content: [{ type: "text" as const, text: JSON.stringify(result) }],
			};
		},
	);

	server.tool(
		"game_assert",
		"Run an assertion on the game state",
		{
			type: z
				.enum([
					"exists",
					"nearPosition",
					"hasVelocity",
					"isStationary",
					"collisionOccurred",
					"hasTag",
					"entityCount",
				])
				.describe("Assertion type"),
			entityId: z
				.string()
				.optional()
				.describe("Entity ID (for entity-specific assertions)"),
			position: z
				.object({ x: z.number(), y: z.number() })
				.optional()
				.describe("Target position (for nearPosition)"),
			tolerance: z
				.number()
				.optional()
				.describe("Position tolerance (for nearPosition)"),
			threshold: z
				.number()
				.optional()
				.describe("Velocity threshold (for hasVelocity/isStationary)"),
			entityA: z
				.string()
				.optional()
				.describe("First entity (for collisionOccurred)"),
			entityB: z
				.string()
				.optional()
				.describe("Second entity (for collisionOccurred)"),
			tag: z
				.string()
				.optional()
				.describe("Tag to check (for hasTag/entityCount)"),
			count: z.number().optional().describe("Expected count (for entityCount)"),
		},
		async (args) => {
			const params: AssertParams = {
				type: args.type as string,
				entityId: args.entityId as string | undefined,
				position: args.position as { x: number; y: number } | undefined,
				tolerance: args.tolerance as number | undefined,
				threshold: args.threshold as number | undefined,
				entityA: args.entityA as string | undefined,
				entityB: args.entityB as string | undefined,
				tag: args.tag as string | undefined,
				count: args.count as number | undefined,
			};

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

			const result = await state.page.evaluate(async (p: AssertParams) => {
				const ops = (window as any).debugOps;
				const bridge = (window as any).GodotDebugBridge;
				if (!ops) return { error: "debugOps not available" };

				const ts = Date.now();

				switch (p.type) {
					case "exists": {
						const data = await ops.getEntityData(p.entityId!);
						return data
							? {
									passed: true,
									message: `Entity "${p.entityId}" exists`,
									assertionType: "exists",
									entityId: p.entityId,
									timestamp: ts,
								}
							: {
									passed: false,
									message: `Entity "${p.entityId}" not found`,
									assertionType: "exists",
									entityId: p.entityId,
									timestamp: ts,
								};
					}

					case "nearPosition": {
						const pos = await ops.getPosition(p.entityId!);
						if (!pos)
							return {
								passed: false,
								message: `Entity "${p.entityId}" not found`,
								assertionType: "nearPosition",
								entityId: p.entityId,
								timestamp: ts,
							};
						const dx = pos.x - p.position!.x;
						const dy = pos.y - p.position!.y;
						const dist = Math.sqrt(dx * dx + dy * dy);
						const epsilon = p.tolerance ?? 0.5;
						return dist <= epsilon
							? {
									passed: true,
									message: `Entity "${p.entityId}" is within ${epsilon}m of target (distance: ${dist.toFixed(2)}m)`,
									assertionType: "nearPosition",
									expected: p.position,
									actual: pos,
									entityId: p.entityId,
									timestamp: ts,
								}
							: {
									passed: false,
									message: `Entity "${p.entityId}" is ${dist.toFixed(2)}m from target (expected within ${epsilon}m)`,
									assertionType: "nearPosition",
									expected: p.position,
									actual: pos,
									entityId: p.entityId,
									timestamp: ts,
								};
					}

					case "hasVelocity": {
						const vel = await ops.getVelocity(p.entityId!);
						if (!vel)
							return {
								passed: false,
								message: `Entity "${p.entityId}" has no velocity data`,
								assertionType: "hasVelocity",
								expected: p.threshold ?? 1.0,
								entityId: p.entityId,
								timestamp: ts,
							};
						const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
						const min = p.threshold ?? 1.0;
						return speed >= min
							? {
									passed: true,
									message: `Entity "${p.entityId}" is moving at ${speed.toFixed(2)}m/s`,
									assertionType: "hasVelocity",
									expected: min,
									actual: speed,
									entityId: p.entityId,
									timestamp: ts,
								}
							: {
									passed: false,
									message: `Entity "${p.entityId}" speed ${speed.toFixed(2)}m/s is below minimum ${min}m/s`,
									assertionType: "hasVelocity",
									expected: min,
									actual: speed,
									entityId: p.entityId,
									timestamp: ts,
								};
					}

					case "isStationary": {
						const vel = await ops.getVelocity(p.entityId!);
						const epsilon = p.threshold ?? 0.1;
						if (!vel)
							return {
								passed: true,
								message: `Entity "${p.entityId}" has no velocity (stationary)`,
								assertionType: "isStationary",
								entityId: p.entityId,
								timestamp: ts,
							};
						const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
						return speed < epsilon
							? {
									passed: true,
									message: `Entity "${p.entityId}" is stationary (speed: ${speed.toFixed(3)}m/s)`,
									assertionType: "isStationary",
									entityId: p.entityId,
									timestamp: ts,
								}
							: {
									passed: false,
									message: `Entity "${p.entityId}" is moving at ${speed.toFixed(2)}m/s`,
									assertionType: "isStationary",
									entityId: p.entityId,
									timestamp: ts,
								};
					}

					case "collisionOccurred": {
						if (bridge?.assert?.collisionOccurred) {
							return bridge.assert.collisionOccurred(p.entityA!, p.entityB!);
						}
						return {
							passed: false,
							message: "Collision tracking not available",
							assertionType: "collisionOccurred",
							timestamp: ts,
						};
					}

					case "hasTag": {
						const has = await ops.hasTag(p.entityId!, p.tag!);
						return has
							? {
									passed: true,
									message: `Entity "${p.entityId}" has tag "${p.tag}"`,
									assertionType: "hasTag",
									entityId: p.entityId,
									timestamp: ts,
								}
							: {
									passed: false,
									message: `Entity "${p.entityId}" does not have tag "${p.tag}"`,
									assertionType: "hasTag",
									entityId: p.entityId,
									timestamp: ts,
								};
					}

					case "entityCount": {
						const query: Record<string, unknown> = {};
						if (p.tag) query.tag = p.tag;
						const ids: string[] = await ops.queryEntities(
							Object.keys(query).length > 0 ? query : undefined,
						);
						const actual = ids.length;
						const expected = p.count!;
						return actual === expected
							? {
									passed: true,
									message: `Entity count is ${actual}`,
									assertionType: "entityCount",
									expected,
									actual,
									timestamp: ts,
								}
							: {
									passed: false,
									message: `Entity count is ${actual}, expected ${expected}`,
									assertionType: "entityCount",
									expected,
									actual,
									timestamp: ts,
								};
					}

					default:
						return { error: `Unknown assertion type: ${p.type}` };
				}
			}, params);

			return {
				content: [{ type: "text" as const, text: JSON.stringify(result) }],
			};
		},
	);
}
