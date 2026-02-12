import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const GODOT_SCRIPTS_DIR = resolve(ROOT, "godot_project/scripts");
const REGISTRY_PATH = resolve(
	ROOT,
	"app/lib/godot/generated/bridge-registry.json",
);

type GdArgType = "string" | "float" | "int" | "bool" | "json" | "variant";

interface GodotHandler {
	methodName: string;
	snakeName: string;
	filePath: string;
	argCount: number;
	argTypes: GdArgType[];
	isJsonBlob: boolean;
	isNoArgs: boolean;
	isAlias: boolean;
	aliasTarget?: string;
}

interface RegistryMethod {
	tsName: string;
	snakeName: string;
	wireParams: {
		name: string;
		wireKind: string;
		optional: boolean;
		args: { name: string; type: string; accessor: string }[];
	}[];
	tsOnly: boolean;
	source: string;
	dispatchTarget: string;
}

interface VerifyResult {
	matches: string[];
	mismatches: string[];
	godotOnly: string[];
	tsOnly: string[];
	skipped: string[];
}

function inferArgType(expr: string): GdArgType {
	if (expr.startsWith("str(")) return "string";
	if (expr.startsWith("float(")) return "float";
	if (expr.startsWith("int(")) return "int";
	if (expr.startsWith("bool(")) return "bool";
	return "variant";
}

function extractMaxArgIndex(body: string): number {
	let maxIndex = -1;
	const argPattern = /args\[(\d+)\]/g;
	for (
		let match = argPattern.exec(body);
		match !== null;
		match = argPattern.exec(body)
	) {
		const idx = parseInt(match[1], 10);
		if (idx > maxIndex) maxIndex = idx;
	}

	const sizeCheckPattern = /args\.size\(\)\s*(?:<|>=?|==)\s*(\d+)/g;
	for (
		let match = sizeCheckPattern.exec(body);
		match !== null;
		match = sizeCheckPattern.exec(body)
	) {
		const requiredSize = parseInt(match[1], 10);
		const sizeIndex = requiredSize - 1;
		if (sizeIndex > maxIndex) maxIndex = sizeIndex;
	}

	return maxIndex;
}

function extractArgTypes(body: string, argCount: number): GdArgType[] {
	const types: GdArgType[] = [];
	for (let i = 0; i < argCount; i++) {
		const patterns = [
			new RegExp(`str\\(args\\[${i}\\]\\)`),
			new RegExp(`float\\(args\\[${i}\\]\\)`),
			new RegExp(`int\\(args\\[${i}\\]\\)`),
			new RegExp(`bool\\(args\\[${i}\\]\\)`),
		];
		if (patterns[0].test(body)) types.push("string");
		else if (patterns[1].test(body)) types.push("float");
		else if (patterns[2].test(body)) types.push("int");
		else if (patterns[3].test(body)) types.push("bool");
		else types.push("variant");
	}
	return types;
}

function isJsonBlobHandler(body: string): boolean {
	if (/JSON\.new\(\)/.test(body) && /\.parse\(/.test(body)) return true;
	if (/JSON\.parse_string\(/.test(body)) return true;
	if (/args\[0\]\s+is\s+String/.test(body)) return true;
	return false;
}

function isAliasHandler(
	body: string,
	ownMethodName: string,
): { isAlias: boolean; target?: string } {
	if (body.includes("args[")) return { isAlias: false };
	const allJsCalls = [...body.matchAll(/_js_(\w+)\(args\)/g)];
	const delegateCall = allJsCalls.find((m) => `_js_${m[1]}` !== ownMethodName);
	if (delegateCall) {
		return { isAlias: true, target: delegateCall[1] };
	}
	return { isAlias: false };
}

// Files from modules that GameBridge._build_method_map() actually registers.
// These take priority over standalone scripts like JSBridge.gd or EntityLifecycleSystem.gd.
const REGISTERED_MODULE_FILES = new Set([
	"GameBridge.gd",
	"EntityManager.gd",
	"TransformSystem.gd",
	"PhysicsController.gd",
	"JointManager.gd",
	"VisualRenderer.gd",
	"UIManager.gd",
	"CameraController.gd",
	"InputRouter.gd",
	"SyncSystem.gd",
	"PropertyCollector.gd",
	"EventEmitter.gd",
	"PhysicsQueries.gd",
	"PixelBufferManager.gd",
	"DebugBridge.gd",
	"Viewport3D.gd",
	"GameBridgeEffects.gd",
	"CollisionSystem.gd",
]);

export function parseGodotHandlers(scriptsDir: string): GodotHandler[] {
	const handlers: GodotHandler[] = [];
	const gdFiles = findGdFiles(scriptsDir);

	for (const filePath of gdFiles) {
		const content = readFileSync(filePath, "utf-8");
		const lines = content.split("\n");

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const funcMatch = line.match(/^func\s+(_js_\w+)\s*\(([^)]*)\)/);
			if (!funcMatch) continue;

			const fullMethodName = funcMatch[1];
			const snakeName = fullMethodName.slice(4); // strip _js_
			const paramStr = funcMatch[2].trim();

			// Collect the full function body
			let body = line;
			// For single-line functions, the body is just the line
			// For multi-line, collect until next func or dedent
			if (!line.includes(":") || line.trimEnd().endsWith(":")) {
				// Multi-line function
				for (let j = i + 1; j < lines.length; j++) {
					const nextLine = lines[j];
					if (
						nextLine.match(/^func\s/) ||
						nextLine.match(/^class\s/) ||
						nextLine.match(/^var\s/) ||
						(nextLine.trim() !== "" &&
							!nextLine.startsWith("\t") &&
							!nextLine.startsWith("  ") &&
							j > i + 1)
					) {
						break;
					}
					body += "\n" + nextLine;
				}
			}

			// Check for alias (delegates to another _js_ method)
			const aliasCheck = isAliasHandler(body, fullMethodName);

			// Check for _args or no-args pattern
			const isNoArgs =
				paramStr.startsWith("_args") ||
				paramStr.startsWith("_arg") ||
				!body.includes("args[");

			// Check for JSON blob pattern
			const jsonBlob = isJsonBlobHandler(body);

			// Extract arg count and types
			const maxArgIndex = extractMaxArgIndex(body);
			const argCount = isNoArgs ? 0 : maxArgIndex + 1;
			const argTypes = isNoArgs ? [] : extractArgTypes(body, argCount);

			handlers.push({
				methodName: fullMethodName,
				snakeName,
				filePath,
				argCount,
				argTypes,
				isJsonBlob: jsonBlob,
				isNoArgs,
				isAlias: aliasCheck.isAlias,
				aliasTarget: aliasCheck.target,
			});
		}
	}

	return handlers;
}

function findGdFiles(dir: string): string[] {
	const results: string[] = [];
	if (!existsSync(dir)) return results;

	const entries = readdirSync(dir);
	for (const entry of entries) {
		const fullPath = join(dir, entry);
		const stat = statSync(fullPath);
		if (stat.isDirectory()) {
			// Skip generated directory
			if (entry === "generated") continue;
			results.push(...findGdFiles(fullPath));
		} else if (entry.endsWith(".gd")) {
			results.push(fullPath);
		}
	}
	return results;
}

function getWireArgCount(method: RegistryMethod): number {
	let count = 0;
	for (const wp of method.wireParams) {
		if (wp.wireKind === "Callback") continue;
		count += wp.args.length;
	}
	return count;
}

function isJsonWire(method: RegistryMethod): boolean {
	const nonCallbackParams = method.wireParams.filter(
		(wp) => wp.wireKind !== "Callback",
	);
	if (nonCallbackParams.length === 0) return false;
	// If the first non-callback param is a JsonBlob and it's the only one
	// (or all are JsonBlob), it's a JSON method
	return nonCallbackParams.every((wp) => wp.wireKind === "JsonBlob");
}

// Methods that are known to be handled via RPC or other non-standard dispatch
// and should be excluded from arg verification
const EXCLUDED_METHODS = new Set([
	"apply_graph",
	"clear_graph",
	"update_params",
	"start",
	"pause",
	"resume",
	"stop",
	"reset",
	"snapshot",
	"restore",
	"effects.updateParams",
	"apply_dynamic_shader_to_entity",
]);

// Methods where TS sends args differently than direct positional args
// (e.g., via callRpc or JSON blob wrapping)
const KNOWN_MISMATCHES = new Map<string, string>();

export function verifyBridgeContract(
	godotHandlers: GodotHandler[],
	registryPath: string,
): VerifyResult {
	const registryContent = readFileSync(registryPath, "utf-8");
	const registry = JSON.parse(registryContent);
	const methods: RegistryMethod[] = registry.methods;

	// Build lookup maps
	const godotBySnake = new Map<string, GodotHandler>();
	const handlersBySnake = new Map<string, GodotHandler[]>();
	for (const h of godotHandlers) {
		const list = handlersBySnake.get(h.snakeName) ?? [];
		list.push(h);
		handlersBySnake.set(h.snakeName, list);
	}

	for (const [snakeName, candidates] of handlersBySnake) {
		const registered = candidates.filter((c) => {
			const fileName = c.filePath.split("/").pop() ?? "";
			return REGISTERED_MODULE_FILES.has(fileName);
		});
		const nonAlias = registered.filter((c) => !c.isAlias);
		if (nonAlias.length > 0) {
			godotBySnake.set(snakeName, nonAlias[0]);
		} else if (registered.length > 0) {
			const alias = registered[0];
			if (alias.isAlias && alias.aliasTarget) {
				const target = handlersBySnake
					.get(alias.aliasTarget)
					?.find((t) => !t.isAlias);
				if (target) {
					godotBySnake.set(snakeName, {
						...target,
						snakeName,
						methodName: alias.methodName,
					});
				} else {
					godotBySnake.set(snakeName, alias);
				}
			} else {
				godotBySnake.set(snakeName, alias);
			}
		} else if (candidates.length > 0) {
			const nonAliasAll = candidates.filter((c) => !c.isAlias);
			godotBySnake.set(
				snakeName,
				nonAliasAll.length > 0 ? nonAliasAll[0] : candidates[0],
			);
		}
	}

	const result: VerifyResult = {
		matches: [],
		mismatches: [],
		godotOnly: [],
		tsOnly: [],
		skipped: [],
	};

	// Check each TS method against Godot
	for (const method of methods) {
		if (method.tsOnly) continue;
		if (EXCLUDED_METHODS.has(method.snakeName)) {
			result.skipped.push(
				`⏭  ${method.snakeName}: excluded (non-standard dispatch)`,
			);
			continue;
		}

		const handler = godotBySnake.get(method.snakeName);
		if (!handler) {
			result.tsOnly.push(
				`❌ ${method.snakeName}: in TS registry but no _js_${method.snakeName} handler in Godot`,
			);
			continue;
		}

		// Check for known mismatches
		const knownIssue = KNOWN_MISMATCHES.get(method.snakeName);
		if (knownIssue) {
			result.mismatches.push(
				`⚠️  ${method.snakeName}: KNOWN MISMATCH - ${knownIssue}`,
			);
			continue;
		}

		const tsArgCount = getWireArgCount(method);
		const tsIsJson = isJsonWire(method);

		// For JSON blob methods, Godot typically reads args[0] as JSON
		// The TS side sends JSON.stringify(data) as a single arg
		if (tsIsJson && handler.isJsonBlob) {
			result.matches.push(`✅ ${method.snakeName}: both sides use JSON blob`);
			continue;
		}

		// For JSON blob on TS side but Godot reads individual args from the parsed JSON
		if (tsIsJson && !handler.isJsonBlob && handler.argCount > 0) {
			// This is fine if Godot parses the JSON and reads fields
			result.matches.push(
				`✅ ${method.snakeName}: TS sends JSON, Godot parses and reads ${handler.argCount} fields`,
			);
			continue;
		}

		// For no-args methods
		if (handler.isNoArgs && tsArgCount === 0) {
			result.matches.push(`✅ ${method.snakeName}: no args on both sides`);
			continue;
		}

		// Compare arg counts
		if (tsArgCount === handler.argCount) {
			result.matches.push(
				`✅ ${method.snakeName}: TS(${tsArgCount} args) == Godot(${handler.argCount} args)`,
			);
		} else {
			// Check if the difference is due to optional args
			const optionalCount = method.wireParams.filter(
				(wp) => wp.optional && wp.wireKind !== "Callback",
			).length;
			const optionalArgCount = method.wireParams
				.filter((wp) => wp.optional && wp.wireKind !== "Callback")
				.reduce((sum, wp) => sum + wp.args.length, 0);
			const requiredArgCount = tsArgCount - optionalArgCount;

			if (
				handler.argCount >= requiredArgCount &&
				handler.argCount <= tsArgCount
			) {
				result.matches.push(
					`✅ ${method.snakeName}: TS(${requiredArgCount}-${tsArgCount} args) ~= Godot(${handler.argCount} args) [optional params]`,
				);
			} else {
				result.mismatches.push(
					`❌ ${method.snakeName}: TS(${tsArgCount} args) != Godot(${handler.argCount} args)`,
				);
			}
		}
	}

	// Check for Godot handlers not in TS registry
	const tsSnakeNames = new Set(
		methods
			.filter((m) => !m.tsOnly && !EXCLUDED_METHODS.has(m.snakeName))
			.map((m) => m.snakeName),
	);
	for (const [snakeName, handler] of godotBySnake) {
		if (!tsSnakeNames.has(snakeName) && !handler.isAlias) {
			result.godotOnly.push(
				`ℹ️  ${snakeName}: Godot handler exists but not in TS registry`,
			);
		}
	}

	return result;
}

export function formatVerifyResult(result: VerifyResult): string {
	const lines: string[] = [];

	lines.push("=== Bridge Contract Verification ===");
	lines.push("");

	if (result.matches.length > 0) {
		lines.push(`Matches (${result.matches.length}):`);
		for (const m of result.matches) lines.push(`  ${m}`);
		lines.push("");
	}

	if (result.mismatches.length > 0) {
		lines.push(`Mismatches (${result.mismatches.length}):`);
		for (const m of result.mismatches) lines.push(`  ${m}`);
		lines.push("");
	}

	if (result.tsOnly.length > 0) {
		lines.push(`TS-only (no Godot handler) (${result.tsOnly.length}):`);
		for (const m of result.tsOnly) lines.push(`  ${m}`);
		lines.push("");
	}

	if (result.godotOnly.length > 0) {
		lines.push(`Godot-only (no TS method) (${result.godotOnly.length}):`);
		for (const m of result.godotOnly) lines.push(`  ${m}`);
		lines.push("");
	}

	if (result.skipped.length > 0) {
		lines.push(`Skipped (${result.skipped.length}):`);
		for (const m of result.skipped) lines.push(`  ${m}`);
		lines.push("");
	}

	const errorCount =
		result.mismatches.filter((m) => m.startsWith("❌")).length +
		result.tsOnly.length;
	const warnCount = result.mismatches.filter((m) => m.startsWith("⚠️")).length;

	lines.push("---");
	lines.push(
		`Summary: ${result.matches.length} matched, ${errorCount} errors, ${warnCount} known issues, ${result.skipped.length} skipped`,
	);

	return lines.join("\n");
}

export function runVerification(): {
	success: boolean;
	output: string;
	result: VerifyResult;
} {
	const handlers = parseGodotHandlers(GODOT_SCRIPTS_DIR);
	const result = verifyBridgeContract(handlers, REGISTRY_PATH);
	const output = formatVerifyResult(result);

	// Errors are hard mismatches (❌) and TS-only methods
	const errorCount =
		result.mismatches.filter((m) => m.startsWith("❌")).length +
		result.tsOnly.length;

	return { success: errorCount === 0, output, result };
}

// Direct execution
const isDirectExecution =
	process.argv[1]?.endsWith("bridge-verify.ts") ||
	process.argv[1]?.endsWith("bridge-verify");
if (isDirectExecution) {
	const { success, output } = runVerification();
	console.log(output);
	process.exit(success ? 0 : 1);
}
