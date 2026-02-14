#!/usr/bin/env node
import { readdirSync, watch } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { GameInspectorState } from "./types.js";
import { activateTarget, resolveTargetId } from "./utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const state: GameInspectorState = {
	browser: null,
	page: null,
	currentGameId: null,
	consoleLogs: [],
	maxLogEntries: 500,
	activeTargetId: null,
};

let importCounter = 0;

type ToolHandler = (
	args: Record<string, unknown>,
) => Promise<{ content: Array<{ type: "text"; text: string }> }>;
type ToolRegistrar = (server: McpServer, state: GameInspectorState) => void;

interface ToolDefinition {
	description: string;
	schema: Record<string, unknown>;
	handler: ToolHandler;
}

const toolDefinitions: Map<string, ToolDefinition> = new Map();
const toolsDir = path.join(__dirname, "tools");

function discoverToolFiles(): string[] {
	try {
		return readdirSync(toolsDir)
			.filter((f) => f.endsWith(".js") && !f.endsWith(".d.ts"))
			.map((f) => f.replace(".js", ""));
	} catch {
		return [];
	}
}

async function loadAndRegisterTools() {
	const suffix = `?v=${importCounter++}`;
	const toolFiles = discoverToolFiles();

	const tempServer = {
		tool: (
			name: string,
			description: string,
			schema: Record<string, unknown>,
			handler: ToolHandler,
		) => {
			toolDefinitions.set(name, { description, schema, handler });
		},
	} as unknown as McpServer;

	for (const toolFile of toolFiles) {
		try {
			const module = await import(`./tools/${toolFile}.js${suffix}`);
			const registerFn = Object.values(module).find(
				(v): v is ToolRegistrar =>
					typeof v === "function" && v.name.startsWith("register"),
			);
			if (registerFn) {
				registerFn(tempServer, state);
			}
		} catch (err) {
			console.error(`[game-inspector] Failed to load ${toolFile}:`, err);
		}
	}

	console.error(
		`[game-inspector] Loaded ${toolDefinitions.size} tools from ${toolFiles.length} files: ${toolFiles.join(", ")}`,
	);
}

let toolsLoaded = false;

async function ensureToolsLoaded() {
	if (!toolsLoaded) {
		await loadAndRegisterTools();
		toolsLoaded = true;
	}
}

async function reloadTools() {
	console.error("[game-inspector] Reloading tools...");
	try {
		toolDefinitions.clear();
		toolsLoaded = false;
		await ensureToolsLoaded();
		console.error("[game-inspector] Tools reloaded successfully");
	} catch (err) {
		console.error("[game-inspector] Failed to reload tools:", err);
	}
}

let reloadTimeout: ReturnType<typeof setTimeout> | null = null;

watch(toolsDir, { recursive: true }, (_eventType, filename) => {
	if (filename?.endsWith(".js")) {
		if (reloadTimeout) clearTimeout(reloadTimeout);
		reloadTimeout = setTimeout(reloadTools, 100);
	}
});

function serializeSchema(schema: Record<string, unknown>): object {
	try {
		const result: {
			required: string[];
			optional: string[];
			properties: Record<string, { type?: string; description?: string }>;
		} = { required: [], optional: [], properties: {} };

		for (const [key, value] of Object.entries(schema)) {
			if (value && typeof value === "object" && "_def" in value) {
				const def = (value as { _def: Record<string, unknown> })._def;
				const typeName = def.typeName as string | undefined;
				const description = def.description as string | undefined;

				result.properties[key] = {
					type: typeName?.replace("Zod", "").toLowerCase(),
					description,
				};

				if (typeName === "ZodOptional") {
					result.optional.push(key);
				} else {
					result.required.push(key);
				}
			}
		}

		return result;
	} catch {
		return { required: [], optional: [], properties: {} };
	}
}

const server = new Server(
	{ name: "game-inspector", version: "1.0.0" },
	{ capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
	await ensureToolsLoaded();

	return {
		tools: [
			{
				name: "list_ops",
				description:
					"List all available operations with their names, descriptions, and parameter schemas. Also reports any operations that failed to compile.",
				inputSchema: {
					type: "object" as const,
					properties: {},
					required: [] as string[],
					additionalProperties: false,
				},
			},
			{
				name: "call_op",
				description:
					"Execute a named operation. Use list_ops to discover available operations and their parameter schemas. Pass targetId in args to target a specific preview context.",
				inputSchema: {
					type: "object" as const,
					properties: {
						operation: {
							type: "string",
							description: "Operation name (from list_ops)",
						},
						args: {
							type: "object",
							additionalProperties: {},
							description:
								"Operation arguments as key-value pairs. Include targetId to target a specific preview context.",
						},
					},
					required: ["operation"],
					additionalProperties: false,
				},
			},
		],
	};
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const toolName = request.params.name;
	const toolArgs = (request.params.arguments ?? {}) as Record<string, unknown>;

	if (toolName === "list_ops") {
		await ensureToolsLoaded();

		const operations = Array.from(toolDefinitions.entries()).map(
			([name, def]) => ({
				name,
				description: def.description,
				parameters: serializeSchema(def.schema),
			}),
		);

		return {
			content: [
				{
					type: "text" as const,
					text: JSON.stringify({ operations }, null, 2),
				},
			],
		};
	}

	if (toolName === "call_op") {
		const opName = toolArgs.operation as string;
		const args = (toolArgs.args as Record<string, unknown>) ?? {};

		if (!opName) {
			return {
				content: [
					{
						type: "text" as const,
						text: JSON.stringify({
							error: "Missing required parameter: operation",
						}),
					},
				],
			};
		}

		await ensureToolsLoaded();

		if (opName === "list_ops") {
			const operations = Array.from(toolDefinitions.entries()).map(
				([name, def]) => ({
					name,
					description: def.description,
					parameters: serializeSchema(def.schema),
				}),
			);

			return {
				content: [
					{
						type: "text" as const,
						text: JSON.stringify({ operations }, null, 2),
					},
				],
			};
		}

		const def = toolDefinitions.get(opName);
		if (!def) {
			return {
				content: [
					{
						type: "text" as const,
						text: JSON.stringify({
							error: `Operation "${opName}" not found`,
							available: Array.from(toolDefinitions.keys()),
						}),
					},
				],
			};
		}

		try {
			const perCallTargetId = args.targetId as string | undefined;
			delete args.targetId;
			const effectiveTargetId = resolveTargetId(state, perCallTargetId);
			if (effectiveTargetId && state.page) {
				await activateTarget(state.page, effectiveTargetId);
			}

			const result = await def.handler(args);
			return result;
		} catch (err) {
			return {
				content: [
					{
						type: "text" as const,
						text: JSON.stringify({
							error: `Operation "${opName}" threw at runtime`,
							message: err instanceof Error ? err.message : String(err),
							stack: err instanceof Error ? err.stack : undefined,
						}),
					},
				],
			};
		}
	}

	return {
		content: [
			{
				type: "text" as const,
				text: JSON.stringify({ error: `Unknown tool: ${toolName}` }),
			},
		],
	};
});

async function cleanup() {
	console.error("[game-inspector] Shutting down...");
	if (state.browser) {
		await state.browser.close();
	}
	process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

async function main() {
	await ensureToolsLoaded();
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error("[game-inspector] Server started on stdio");
	console.error(`[game-inspector] Watching ${toolsDir} for changes`);
}

main().catch((err) => {
	console.error("[game-inspector] Fatal error:", err);
	process.exit(1);
});
