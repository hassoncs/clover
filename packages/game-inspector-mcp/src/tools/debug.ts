import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GameInspectorState } from "../types.js";

export function registerDebugTools(
	server: McpServer,
	state: GameInspectorState,
) {
	// ============================================================================
	// game_state - Zero-boilerplate game state access with tiered detail levels
	// ============================================================================
	server.tool(
		"game_state",
		"Get game runtime state (variables, score, lives, game state, entity counts). Use detail='tags' to include entity tag arrays.",
		{
			detail: z
				.enum(["summary", "tags", "full"])
				.optional()
				.describe(
					"Detail level: 'summary' (default) = variables + counts, 'tags' = adds entity tag arrays, 'full' = adds positions",
				),
			tags: z
				.array(z.string())
				.optional()
				.describe(
					"Tags to include in entity counts/lists (default: auto-detect from game)",
				),
		},
		async (args) => {
			const detail =
				(args.detail as "summary" | "tags" | "full" | undefined) ?? "summary";
			const requestedTags = args.tags as string[] | undefined;

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
				(opts: { detail: string; requestedTags?: string[] }) => {
					const w = window as any;
					const runtime = w.__GAME_RUNTIME__;

					if (!runtime) {
						return { error: "No game runtime found. Is the game loaded?" };
					}

					const runner = runtime.refs?.gameSystemRunner?.current;
					if (!runner) {
						return {
							error:
								"No game system runner found. Is the game fully initialized?",
						};
					}

					const rules = runner.getSystem?.("rules");
					const em = runner.getSystem?.("entity-manager")?.entityManager;

					const allTags = new Set<string>();
					const allEntities = em?.getAllEntities?.() ?? [];
					for (const entity of allEntities) {
						if (Array.isArray(entity.tags)) {
							for (const tag of entity.tags) {
								allTags.add(tag);
							}
						}
					}

					const tagsToCount =
						opts.requestedTags ??
						Array.from(allTags)
							.filter(
								(t) =>
									!t.startsWith("tube-") &&
									!t.startsWith("in-container-") &&
									t !== "tube-wall" &&
									t !== "tube-bottom",
							)
							.slice(0, 15);

					const entityCounts: Record<string, number> = {};
					for (const tag of tagsToCount) {
						const entities = em?.getEntitiesByTag?.(tag) ?? [];
						if (entities.length > 0) {
							entityCounts[tag] = entities.length;
						}
					}

					const runtimeState = rules?.runtimeState;
					const variables = runtimeState?.vars ?? {};
					const stateMachines = runtimeState?.stateMachines;
					const response: Record<string, unknown> = {
						gameState:
							(variables as Record<string, unknown>).gameState ??
							runtimeState?.gameState ??
							"unknown",
						score: (variables as Record<string, unknown>).score ?? 0,
						lives: (variables as Record<string, unknown>).lives ?? 0,
						elapsed: 0,
						variables,
						stateMachines: stateMachines
							? (() => {
									const simplified: Record<string, string> = {};
									for (const [id, sm] of Object.entries(stateMachines)) {
										simplified[id] = (
											sm as { currentState: string }
										).currentState;
									}
									return simplified;
								})()
							: undefined,
						entityCounts,
					};

					if (opts.detail === "tags" || opts.detail === "full") {
						const entitiesByTag: Record<
							string,
							Array<{
								id: string;
								tags: string[];
								template?: string;
								position?: { x: number; y: number };
							}>
						> = {};

						for (const tag of tagsToCount) {
							const entities = em?.getEntitiesByTag?.(tag) ?? [];
							if (entities.length > 0) {
								entitiesByTag[tag] = entities.map((e: any) => {
									const entry: {
										id: string;
										tags: string[];
										template?: string;
										position?: { x: number; y: number };
									} = {
										id: e.id,
										tags: e.tags ?? [],
									};
									if (e.template) entry.template = e.template;
									if (opts.detail === "full" && e.transform) {
										entry.position = {
											x: Math.round(e.transform.x * 100) / 100,
											y: Math.round(e.transform.y * 100) / 100,
										};
									}
									return entry;
								});
							}
						}

						response.entitiesByTag = entitiesByTag;
					}

					return response;
				},
				{ detail, requestedTags },
			);

			return {
				content: [
					{ type: "text" as const, text: JSON.stringify(result, null, 2) },
				],
			};
		},
	);

	// ============================================================================
	// debug_eval - Fixed to return last expression value from multi-statement code
	// ============================================================================
	server.tool(
		"debug_eval",
		"Evaluate JavaScript in the game page context. Returns the result. The last expression is automatically returned even in multi-statement code.",
		{
			code: z
				.string()
				.describe("JavaScript code to evaluate in the page context"),
		},
		async (args) => {
			const code = args.code as string;

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

			try {
				const result = await state.page.evaluate((evalCode: string) => {
					const safeStringify = (value: unknown) => {
						return JSON.parse(
							JSON.stringify(value, (key, val) => {
								if (typeof val === "function") return "[Function]";
								if (val instanceof Error)
									return { error: val.message, stack: val.stack };
								if (val === undefined) return "__undefined__";
								return val;
							}),
						);
					};

					try {
						const fn = new Function(`return (${evalCode})`);
						const value = fn();
						return safeStringify(value);
					} catch {}

					try {
						const helperPreamble = `
              const runtime = window.__GAME_RUNTIME__;
              const runner = runtime?.refs?.gameSystemRunner?.current;
              const rules = runner?.getSystem?.('rules');
              const em = runner?.getSystem?.('entity-manager')?.entityManager;
              const getVar = (name) => rules?.getVariable(name);
              const setVar = (name, val) => rules?.setVariable(name, val);
              const getEntitiesByTag = (tag) => em?.getEntitiesByTag(tag);
              const getEntity = (id) => em?.getEntity(id);
              const debugOps = window.debugOps;
              const debugBridge = window.SlopcadeDebugBridge;
              const pushEvent = runtime?.pushEvent;
              const allEntities = () => em?.getAllEntities?.() ?? [];
              const entitiesByTag = (tag) => em?.getEntitiesByTag?.(tag)?.map(e => ({ id: e.id, tags: e.tags, position: e.transform ? { x: e.transform.x, y: e.transform.y } : null })) ?? [];
              const getPosition = (entityId) => { const e = em?.getEntity?.(entityId); return e?.transform ? { x: e.transform.x, y: e.transform.y } : null; };
              const tapEntity = (entityId) => { const pos = getPosition(entityId); if (pos && pushEvent) { pushEvent({ type: 'tap', x: 0, y: 0, worldX: pos.x, worldY: pos.y, targetEntityId: entityId }); return true; } return false; };
              const callExport = (name, args) => { const scriptSystem = runner?.getSystem?.('script-sandbox'); const sandbox = scriptSystem?.getSandbox?.(); return sandbox?.callExport?.(name, args); };
              const assert = (condition, message) => { if (!condition) throw new Error('Assertion failed: ' + (message || '')); return true; };
              const getDialog = () => runtime?.getActiveDialog?.();
              const pressButton = (eventNameOrLabel) => { const d = getDialog(); if (!d) return false; const btn = d.buttons.find(b => b.eventName === eventNameOrLabel || b.label.toLowerCase() === eventNameOrLabel.toLowerCase()); if (btn) { runtime?.pressDialogButton?.(btn.eventName); return true; } return false; };
            `;

						const wrappedCode = `${helperPreamble}\nlet __result__ = undefined;\n${evalCode}\nreturn __result__;`;
						const fn = new Function(wrappedCode);
						const value = fn();

						if (value !== undefined) {
							return safeStringify(value);
						}

						const lines = evalCode.trim().split("\n");
						const lastLine = lines[lines.length - 1].trim();
						const isStatement =
							lastLine.match(
								/^(return|if|for|while|try|const|let|var|function|class|switch|throw|import|export)\b/,
							) || lastLine.endsWith("{");

						if (lastLine && !isStatement) {
							try {
								const codeWithReturn =
									lines.slice(0, -1).join("\n") + "\nreturn (" + lastLine + ")";
								const wrappedWithReturn = `${helperPreamble}\n${codeWithReturn}`;
								const fnWithReturn = new Function(wrappedWithReturn);
								const returnValue = fnWithReturn();
								return safeStringify(returnValue);
							} catch {}
						}

						return {
							executed: true,
							note: "Code executed. Set __result__ = value to return data.",
						};
					} catch (stmtError) {
						return {
							error:
								stmtError instanceof Error
									? stmtError.message
									: String(stmtError),
						};
					}
				}, code);

				return {
					content: [
						{ type: "text" as const, text: JSON.stringify(result, null, 2) },
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({
								error: error instanceof Error ? error.message : String(error),
							}),
						},
					],
				};
			}
		},
	);

	server.tool(
		"debug_script_system",
		"Get detailed debugging information about the script sandbox system, including hook status, console log capture, and input processing state.",
		{},
		async () => {
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

			const result = await state.page.evaluate(() => {
				const w = window as any;
				const runtime = w.__GAME_RUNTIME__;
				const debugInfo: Record<string, unknown> = {
					hasGameRuntime: !!runtime,
					hasGodotDebugBridge: !!w.GodotDebugBridge,
				};

				if (runtime?.getInput) {
					debugInfo.inputState = {
						tap: runtime.getInput("tap"),
						mouse: runtime.getInput("mouse"),
						drag: runtime.getInput("drag"),
					};
				}

				if (runtime?.refs) {
					debugInfo.hasRefs = true;

					if (runtime.refs.gameSystemRunner?.current) {
						const runner = runtime.refs.gameSystemRunner.current;
						debugInfo.hasGameSystemRunner = true;

						const scriptSystem = runner.getSystem?.("script-sandbox");
						if (scriptSystem) {
							debugInfo.hasScriptSystem = true;
							const systemState = scriptSystem.getState?.();
							if (systemState) {
								debugInfo.scriptSystemState = systemState;
							}

							const sandbox = scriptSystem.getSandbox?.();
							if (sandbox) {
								debugInfo.hasSandbox = true;
								const logs = sandbox.getLogs?.();
								if (logs && Array.isArray(logs)) {
									debugInfo.scriptLogs = logs
										.slice(-50)
										.map(
											(log: {
												level: string;
												args: unknown[];
												timestamp: number;
											}) => ({
												level: log.level,
												message: log.args
													.map((arg: unknown) =>
														typeof arg === "object"
															? JSON.stringify(arg)
															: String(arg),
													)
													.join(" "),
												timestamp: log.timestamp,
											}),
										);
									debugInfo.totalLogCount = logs.length;
								}
							}
						}
					}
				}

				return debugInfo;
			});

			return {
				content: [
					{ type: "text" as const, text: JSON.stringify(result, null, 2) },
				],
			};
		},
	);

	server.tool(
		"debug_test_script_console",
		"Test if console.log works from within the script sandbox by triggering a test log message and checking if it appears in captured logs.",
		{
			waitMs: z
				.number()
				.optional()
				.describe("Time to wait for logs to appear (default: 500ms)"),
		},
		async (args) => {
			const waitMs = (args.waitMs as number | undefined) ?? 500;

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

			const beforeTimestamp = Date.now();
			const testMarker = `__SCRIPT_CONSOLE_TEST_${Date.now()}__`;

			const injectResult = await state.page.evaluate((marker: string) => {
				const w = window as any;

				console.log(`[DirectTest] ${marker}`);

				const runtime = w.__GAME_RUNTIME__;
				if (runtime?.refs?.gameSystemRunner?.current) {
					const runner = runtime.refs.gameSystemRunner.current;
					const scriptSystem = runner.getSystem?.("script-sandbox");
					if (scriptSystem) {
						const sandbox = scriptSystem.getSandbox?.();
						if (sandbox) {
							const sandboxLogs = sandbox.getLogs?.() ?? [];
							return {
								hasSandbox: true,
								sandboxInfo: {
									hasOnStart: sandbox.hasHook?.("onStart"),
									hasOnUpdate: sandbox.hasHook?.("onUpdate"),
									hasOnInput: sandbox.hasHook?.("onInput"),
									hasOnCollision: sandbox.hasHook?.("onCollision"),
								},
								sandboxLogs: sandboxLogs
									.slice(-20)
									.map(
										(log: {
											level: string;
											args: unknown[];
											timestamp: number;
										}) => ({
											level: log.level,
											message: log.args
												.map((arg: unknown) =>
													typeof arg === "object"
														? JSON.stringify(arg)
														: String(arg),
												)
												.join(" "),
											timestamp: log.timestamp,
										}),
									),
								totalSandboxLogCount: sandboxLogs.length,
								marker,
							};
						}
					}
				}

				return {
					hasSandbox: false,
					marker,
					note: "Could not access script sandbox. Ensure __GAME_RUNTIME__.refs is exposed.",
				};
			}, testMarker);

			await new Promise((resolve) => setTimeout(resolve, waitMs));

			const recentPlaywrightLogs = state.consoleLogs
				.filter((log) => log.timestamp >= beforeTimestamp)
				.map((log) => ({
					type: log.type,
					text: log.text,
					timestamp: log.timestamp,
				}));

			const foundDirectLog = recentPlaywrightLogs.some((log) =>
				log.text.includes(testMarker),
			);
			const foundScriptLogInPlaywright = recentPlaywrightLogs.some((log) =>
				log.text.includes("[Script]"),
			);
			const foundScriptLogInSandbox =
				"sandboxLogs" in injectResult &&
				Array.isArray(injectResult.sandboxLogs) &&
				injectResult.sandboxLogs.length > 0;

			return {
				content: [
					{
						type: "text" as const,
						text: JSON.stringify(
							{
								...injectResult,
								playwrightLogCapture: {
									foundDirectLog,
									foundScriptLogInPlaywright,
									recentLogsCount: recentPlaywrightLogs.length,
									recentLogs: recentPlaywrightLogs.slice(-20),
								},
								sandboxLogCapture: {
									foundScriptLogInSandbox,
									note: foundScriptLogInSandbox
										? "Script logs found in sandbox buffer (reliable)"
										: "No script logs in sandbox buffer yet",
								},
							},
							null,
							2,
						),
					},
				],
			};
		},
	);

	server.tool(
		"get_console_logs",
		"Get captured console logs from the game. Essential for debugging - returns all console.log, console.warn, console.error output from the game code.",
		{
			filter: z
				.string()
				.optional()
				.describe("Filter logs containing this string (case-insensitive)"),
			limit: z
				.number()
				.optional()
				.describe(
					"Maximum number of logs to return (default: 100, most recent first)",
				),
			since: z
				.number()
				.optional()
				.describe("Only return logs since this timestamp (ms since epoch)"),
			clear: z
				.boolean()
				.optional()
				.describe("Clear logs after retrieving (default: false)"),
		},
		async (args) => {
			const filter = args.filter as string | undefined;
			const limit = (args.limit as number | undefined) ?? 100;
			const since = args.since as number | undefined;
			const clear = (args.clear as boolean | undefined) ?? false;

			let logs = [...state.consoleLogs];

			if (since !== undefined) {
				logs = logs.filter((log) => log.timestamp >= since);
			}

			if (filter) {
				const lowerFilter = filter.toLowerCase();
				logs = logs.filter((log) =>
					log.text.toLowerCase().includes(lowerFilter),
				);
			}

			const recentLogs = logs.slice(-limit);

			if (clear) {
				state.consoleLogs.length = 0;
			}

			return {
				content: [
					{
						type: "text" as const,
						text: JSON.stringify(
							{
								totalCaptured: state.consoleLogs.length,
								returned: recentLogs.length,
								filtered: filter ? true : false,
								logs: recentLogs.map((log) => ({
									type: log.type,
									text: log.text,
									timestamp: log.timestamp,
									relativeTime: `${((log.timestamp - (recentLogs[0]?.timestamp ?? log.timestamp)) / 1000).toFixed(3)}s`,
								})),
							},
							null,
							2,
						),
					},
				],
			};
		},
	);
}
