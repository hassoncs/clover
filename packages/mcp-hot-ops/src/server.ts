#!/usr/bin/env npx tsx
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { type BuildFailure, build, type Message } from "esbuild";
import { existsSync, readdirSync, watch, writeFileSync } from "fs";
import { createRequire } from "module";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const operationsDir = join(__dirname, "operations");
const nodeRequire = createRequire(import.meta.url);

const NODE_BUILTINS = [
	"assert",
	"buffer",
	"child_process",
	"cluster",
	"crypto",
	"dgram",
	"dns",
	"events",
	"fs",
	"fs/promises",
	"http",
	"https",
	"module",
	"net",
	"os",
	"path",
	"perf_hooks",
	"process",
	"querystring",
	"readline",
	"stream",
	"string_decoder",
	"tls",
	"tty",
	"url",
	"util",
	"v8",
	"vm",
	"worker_threads",
	"zlib",
];

export interface OperationMeta {
	name: string;
	description: string;
	parameters: Record<
		string,
		{ type: string; description: string; required?: boolean }
	>;
	category?: string;
	docs?: string;
}

export interface Operation extends OperationMeta {
	execute: (args: Record<string, unknown>) => Promise<unknown>;
}

interface CachedOperation {
	meta: OperationMeta;
	execute: (args: Record<string, unknown>) => Promise<unknown>;
}

interface BundleError {
	file: string;
	error: string;
	details: Message[];
}

const operationCache = new Map<string, CachedOperation>();
const bundleErrors = new Map<string, BundleError>();
let cacheValid = false;

function discoverOperationFiles(): string[] {
	try {
		return readdirSync(operationsDir)
			.filter(
				(f) => f.endsWith(".ts") && !f.startsWith("_") && !f.endsWith(".d.ts"),
			)
			.map((f) => f.replace(".ts", ""));
	} catch {
		return [];
	}
}

function formatBuildErrors(errors: Message[]): string {
	return errors
		.map((e) => {
			const loc = e.location
				? `${e.location.file}:${e.location.line}:${e.location.column}`
				: "unknown";
			return `${loc}: ${e.text}`;
		})
		.join("\n");
}

async function bundleAndLoad(
	name: string,
): Promise<CachedOperation | BundleError> {
	const entryPoint = join(operationsDir, `${name}.ts`);
	if (!existsSync(entryPoint)) {
		return { file: `${name}.ts`, error: "File not found", details: [] };
	}

	try {
		const result = await build({
			entryPoints: [entryPoint],
			bundle: true,
			write: false,
			format: "cjs",
			platform: "node",
			external: [...NODE_BUILTINS, ...NODE_BUILTINS.map((b) => `node:${b}`)],
			logLevel: "silent",
		});

		if (result.errors.length > 0) {
			return {
				file: `${name}.ts`,
				error: formatBuildErrors(result.errors),
				details: result.errors,
			};
		}

		const code = result.outputFiles[0].text;
		const mod = { exports: {} as Record<string, unknown> };
		const fn = new Function("module", "exports", "require", code);
		fn(mod, mod.exports, nodeRequire);

		const op = (mod.exports.default ?? mod.exports) as Operation;
		if (!op.name || typeof op.execute !== "function") {
			return {
				file: `${name}.ts`,
				error: `Operation must export { name, description, parameters, execute }. Got keys: ${Object.keys(op).join(", ")}`,
				details: [],
			};
		}

		return {
			meta: {
				name: op.name,
				description: op.description,
				parameters: op.parameters,
				category: op.category,
				docs: op.docs,
			},
			execute: op.execute,
		};
	} catch (err) {
		const buildErr = err as BuildFailure;
		if (buildErr.errors?.length) {
			return {
				file: `${name}.ts`,
				error: formatBuildErrors(buildErr.errors),
				details: buildErr.errors,
			};
		}
		return {
			file: `${name}.ts`,
			error: err instanceof Error ? err.message : String(err),
			details: [],
		};
	}
}

function isBundleError(
	result: CachedOperation | BundleError,
): result is BundleError {
	return "error" in result;
}

async function ensureCache(): Promise<void> {
	if (cacheValid) return;

	operationCache.clear();
	bundleErrors.clear();

	for (const file of discoverOperationFiles()) {
		const result = await bundleAndLoad(file);
		if (isBundleError(result)) {
			bundleErrors.set(file, result);
			console.error(`[mcp-hot-ops] ❌ ${file}: ${result.error}`);
		} else {
			operationCache.set(result.meta.name, result);
		}
	}

	cacheValid = true;
	const ok = operationCache.size;
	const failed = bundleErrors.size;
	console.error(
		`[mcp-hot-ops] Loaded ${ok} operations${failed > 0 ? `, ${failed} failed` : ""}`,
	);
}

function invalidateCache() {
	cacheValid = false;
	console.error(
		"[mcp-hot-ops] Cache invalidated — will re-bundle on next call",
	);
}

if (existsSync(operationsDir)) {
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	watch(operationsDir, { recursive: true }, (_event, filename) => {
		if (!filename?.endsWith(".ts")) return;
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			console.error(`[mcp-hot-ops] Changed: ${filename}`);
			invalidateCache();
		}, 50);
	});
	console.error(`[mcp-hot-ops] Watching ${operationsDir}`);
}

function operationParamsToJsonSchema(
	params: OperationMeta["parameters"],
): Record<string, unknown> {
	const properties: Record<string, unknown> = {};
	const required: string[] = [];

	for (const [key, val] of Object.entries(params)) {
		properties[key] = { type: val.type, description: val.description };
		if (val.required) required.push(key);
	}

	return {
		type: "object",
		properties,
		required,
		additionalProperties: false,
	};
}

function generateSkillMarkdown(serverName: string, header?: string): string {
	const ops = Array.from(operationCache.values()).map((op) => op.meta);
	const categories = new Map<string, OperationMeta[]>();

	for (const op of ops) {
		const cat = op.category || "uncategorized";
		if (!categories.has(cat)) categories.set(cat, []);
		categories.get(cat)!.push(op);
	}

	const lines: string[] = [];
	lines.push(`# ${serverName}`);
	lines.push("");
	lines.push(
		`> Auto-generated from operation metadata. ${new Date().toISOString().split("T")[0]}`,
	);
	lines.push("");

	if (header) {
		lines.push(header);
		lines.push("");
	}

	lines.push("## How to Call");
	lines.push("");
	lines.push("```");
	lines.push(`${serverName}_call_op(operation: "name", args: { ... })`);
	lines.push("```");
	lines.push("");
	lines.push(
		`Only call \`${serverName}_list_ops\` if you need to check for newly added operations.`,
	);
	lines.push("");

	lines.push("## Operations");
	lines.push("");

	for (const [category, catOps] of categories) {
		lines.push(`### ${category}`);
		lines.push("");
		lines.push("| Operation | Args | Description |");
		lines.push("|-----------|------|-------------|");

		for (const op of catOps) {
			const args = Object.entries(op.parameters)
				.map(([k, v]) => `\`${k}\`${v.required ? "" : "?"}`)
				.join(", ");
			lines.push(`| \`${op.name}\` | ${args || "—"} | ${op.description} |`);
		}

		lines.push("");

		for (const op of catOps) {
			if (op.docs) {
				lines.push(`#### ${op.name}`);
				lines.push("");
				lines.push(op.docs.trim());
				lines.push("");
			}
		}
	}

	return lines.join("\n");
}

const server = new Server(
	{ name: "mcp-hot-ops", version: "0.1.0" },
	{ capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
	await ensureCache();

	const tools = [
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
				"Execute a named operation. Use list_ops to discover available operations and their parameter schemas.",
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
						description: "Operation arguments as key-value pairs",
					},
				},
				required: ["operation"],
				additionalProperties: false,
			},
		},
	];

	return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const toolName = request.params.name;
	const toolArgs = (request.params.arguments ?? {}) as Record<string, unknown>;

	if (toolName === "list_ops") {
		await ensureCache();

		const operations = Array.from(operationCache.values()).map((op) => op.meta);
		const errors = Array.from(bundleErrors.entries()).map(([, err]) => ({
			file: err.file,
			error: err.error,
		}));

		operations.push({
			name: "generate_skill_docs",
			description:
				"Generate a skill markdown file from all loaded operations. Operations can include category and docs fields for richer output.",
			category: "built-in",
			parameters: {
				output: {
					type: "string",
					description:
						"File path to write markdown to (omit to return as text)",
					required: false,
				},
				serverName: {
					type: "string",
					description: "MCP server name for headings (default: mcp-hot-ops)",
					required: false,
				},
				header: {
					type: "string",
					description: "Optional prose to include at the top of the skill file",
					required: false,
				},
			},
		});

		const result: Record<string, unknown> = { operations };
		if (errors.length > 0) result.compilationErrors = errors;

		return {
			content: [
				{ type: "text" as const, text: JSON.stringify(result, null, 2) },
			],
		};
	}

	if (toolName === "call_op") {
		const operationName = toolArgs.operation as string;
		const args = (toolArgs.args as Record<string, unknown>) ?? {};

		if (!operationName) {
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

		await ensureCache();

		if (operationName === "generate_skill_docs") {
			const outputPath = args.output as string | undefined;
			const serverName = (args.serverName as string) || "mcp-hot-ops";
			const header = args.header as string | undefined;

			const markdown = generateSkillMarkdown(serverName, header);

			if (outputPath) {
				writeFileSync(outputPath, markdown, "utf-8");
				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({
								written: outputPath,
								operations: operationCache.size,
								categories: new Set(
									Array.from(operationCache.values()).map(
										(op) => op.meta.category || "uncategorized",
									),
								).size,
							}),
						},
					],
				};
			}

			return {
				content: [{ type: "text" as const, text: markdown }],
			};
		}

		const op = operationCache.get(operationName);
		if (!op) {
			const matchingError = Array.from(bundleErrors.values()).find(
				(e) => e.file === `${operationName}.ts`,
			);
			if (matchingError) {
				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({
								error: `Operation "${operationName}" failed to compile`,
								compilationError: matchingError.error,
								hint: "Fix the TypeScript error in the operation file, then try again",
							}),
						},
					],
				};
			}

			return {
				content: [
					{
						type: "text" as const,
						text: JSON.stringify({
							error: `Operation "${operationName}" not found`,
							available: Array.from(operationCache.keys()),
						}),
					},
				],
			};
		}

		try {
			const result = await op.execute(args);
			return {
				content: [
					{ type: "text" as const, text: JSON.stringify(result, null, 2) },
				],
			};
		} catch (err) {
			return {
				content: [
					{
						type: "text" as const,
						text: JSON.stringify({
							error: `Operation "${operationName}" threw at runtime`,
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

async function main() {
	await ensureCache();
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error("[mcp-hot-ops] Server started on stdio");
}

main().catch((err) => {
	console.error("[mcp-hot-ops] Fatal error:", err);
	process.exit(1);
});
