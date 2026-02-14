import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GameInspectorState } from "../types.js";

export function registerOverviewTools(
	server: McpServer,
	state: GameInspectorState,
) {
	server.tool(
		"game_overview",
		"Get a comprehensive, game-aware state summary in one call. Groups entities by tag, shows container relationships, held entities, script hooks, and game metadata.",
		{
			includePositions: z
				.boolean()
				.optional()
				.describe("Include entity positions in output (default: false)"),
		},
		async (args) => {
			const includePositions =
				(args.includePositions as boolean | undefined) ?? false;

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
				(opts: { includePositions: boolean }) => {
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
								getGameDefinition?: () => Record<string, unknown>;
						  }
						| undefined;
					const debugOps = w.debugOps as
						| {
								getGameState?: () => Record<string, unknown>;
						  }
						| undefined;

					if (!runtime) {
						return { error: "Game runtime not available" };
					}

					const runner = runtime.refs?.gameSystemRunner?.current;
					if (!runner) {
						return { error: "Game system runner not initialized" };
					}

					const rules = runner.getSystem?.("rules") as
						| {
								runtimeState?: {
									vars?: Record<string, unknown>;
									stateMachines?: Record<string, { currentState: string }>;
									gameState?: string;
								};
						  }
						| undefined;
					const emSystem = runner.getSystem?.("entity-manager") as
						| {
								entityManager?: {
									getAllEntities?: () => Array<{
										id: string;
										tags?: string[];
										prefab?: string;
										transform?: { x: number; y: number };
									}>;
								};
						  }
						| undefined;
					const em = emSystem?.entityManager;

					const variables = rules?.runtimeState?.vars ?? {};
					const stateMachines = rules?.runtimeState?.stateMachines;

					const allEntities = em?.getAllEntities?.() ?? [];

					interface EntitySummary {
						id: string;
						prefab?: string;
						tags: string[];
						position?: { x: number; y: number };
					}

					const entitiesByTag: Record<string, EntitySummary[]> = {};
					const containerMap: Record<string, string[]> = {};
					const heldEntities: EntitySummary[] = [];

					for (const entity of allEntities) {
						const tags = entity.tags ?? [];
						const summary: EntitySummary = {
							id: entity.id,
							prefab: entity.prefab,
							tags,
						};
						if (opts.includePositions && entity.transform) {
							summary.position = {
								x: Math.round(entity.transform.x * 100) / 100,
								y: Math.round(entity.transform.y * 100) / 100,
							};
						}

						for (const tag of tags) {
							if (tag.startsWith("in-container-")) {
								const containerName = tag.slice("in-container-".length);
								if (!containerMap[containerName]) {
									containerMap[containerName] = [];
								}
								containerMap[containerName].push(entity.id);
							}

							if (!entitiesByTag[tag]) {
								entitiesByTag[tag] = [];
							}
							entitiesByTag[tag].push(summary);
						}

						if (tags.includes("held")) {
							heldEntities.push(summary);
						}
					}

					const tagCounts: Record<string, number> = {};
					for (const [tag, entities] of Object.entries(entitiesByTag)) {
						tagCounts[tag] = entities.length;
					}

					let scriptHooks: Record<string, boolean> | undefined;
					const scriptSystem = runner.getSystem?.("script-sandbox") as
						| {
								getSandbox?: () =>
									| {
											hasHook?: (name: string) => boolean;
									  }
									| undefined;
						  }
						| undefined;
					const sandbox = scriptSystem?.getSandbox?.();
					if (sandbox?.hasHook) {
						scriptHooks = {
							onStart: sandbox.hasHook("onStart") ?? false,
							onUpdate: sandbox.hasHook("onUpdate") ?? false,
							onInput: sandbox.hasHook("onInput") ?? false,
							onCollision: sandbox.hasHook("onCollision") ?? false,
						};
					}

					let gameMetadata: Record<string, unknown> | undefined;
					if (runtime.getGameDefinition) {
						try {
							const def = runtime.getGameDefinition();
							gameMetadata = {
								title: def.title,
								description: def.description,
								version: def.version,
							};
						} catch {}
					}

					let gameState: Record<string, unknown> | undefined;
					if (debugOps?.getGameState) {
						gameState = debugOps.getGameState() as Record<string, unknown>;
					}

					const smStates: Record<string, string> | undefined = stateMachines
						? Object.fromEntries(
								Object.entries(stateMachines).map(([id, sm]) => [
									id,
									sm.currentState,
								]),
							)
						: undefined;

					return {
						variables,
						stateMachines: smStates,
						entityCount: allEntities.length,
						tagCounts,
						entitiesByTag,
						containers: containerMap,
						heldEntities: heldEntities.length > 0 ? heldEntities : undefined,
						scriptHooks,
						gameMetadata,
						gameState,
					};
				},
				{ includePositions },
			);

			return {
				content: [
					{ type: "text" as const, text: JSON.stringify(result, null, 2) },
				],
			};
		},
	);
}
