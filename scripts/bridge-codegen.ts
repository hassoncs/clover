#!/usr/bin/env npx tsx
import { createHash } from "crypto";
import {
	chmodSync,
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from "fs";
import { dirname, resolve } from "path";
import {
	type InterfaceDeclaration,
	type MethodSignature,
	type ParameterDeclaration,
	Project,
	type Type,
} from "ts-morph";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const TYPES_PATH = resolve(ROOT, "packages/godot-bridge/src/types.ts");
const SHARED_TYPES_DIR = resolve(ROOT, "shared/src/types");
const OUTPUT_DIR = resolve(ROOT, "packages/godot-bridge/src/generated");
const OUTPUT_PATH = resolve(OUTPUT_DIR, "bridge-registry.json");
const GDSCRIPT_OUTPUT_DIR = resolve(
	ROOT,
	"godot_project/scripts/bridge/generated",
);
const GDSCRIPT_OUTPUT_PATH = resolve(
	GDSCRIPT_OUTPUT_DIR,
	"BridgeValidation.gd",
);
const GDSCRIPT_METHOD_MAP_PATH = resolve(
	GDSCRIPT_OUTPUT_DIR,
	"BridgeMethodMap.gd",
);

interface MethodParam {
	name: string;
	type: string;
	optional: boolean;
}

export enum WireKind {
	Primitive = "Primitive",
	FlatStruct = "FlatStruct",
	JsonBlob = "JsonBlob",
	Callback = "Callback",
}

interface WireArg {
	name: string;
	type: "string" | "number" | "boolean" | "json";
	accessor: string;
}

interface WireParam {
	name: string;
	tsType: string;
	wireKind: WireKind;
	optional: boolean;
	args: WireArg[];
}

interface MethodEntry {
	tsName: string;
	snakeName: string;
	params: MethodParam[];
	wireParams: WireParam[];
	returnType: string;
	async: boolean;
	category: string;
	tsOnly: boolean;
	source: "GodotBridge" | "EffectsBridge";
	dispatchTarget: "bridge" | "effects";
}

const EFFECTS_BRIDGE_SNAKE_NAMES = new Set([
	"screen_shake",
	"zoom_punch",
	"trigger_shockwave",
	"flash_screen",
	"create_dynamic_shader",
	"apply_dynamic_shader_to_entity",
	"apply_dynamic_post_shader",
	"spawn_particle_preset",
	"apply_sprite_effect",
	"update_sprite_effect_param",
	"clear_sprite_effect",
	"set_post_effect",
	"update_post_effect_param",
	"clear_post_effect",
]);

interface BridgeRegistry {
	generatedAt: string;
	sourceFile: string;
	methods: MethodEntry[];
	nameMap: {
		tsToSnake: Record<string, string>;
		snakeToTs: Record<string, string>;
	};
	stats: {
		total: number;
		bridgeMethods: number;
		tsOnlyMethods: number;
		byCategory: Record<string, number>;
	};
}

const LIFECYCLE_METHODS = new Set(["initialize", "dispose"]);

const RPC_DISPATCHED_METHODS = new Set([
	"loadRules",
	"loadScript",
	"stepPhysics",
	"callRpc",
	"instantiateFromScene",
	"createMouseJointAsync",
	"getAllEntities",
]);

const EVENT_CALLBACK_PATTERN = /^on[A-Z]/;

const BRIDGE_NAME_OVERRIDES: Record<string, string> = {
	loadGame: "load_game_json",
	applyDynamicShader: "apply_dynamic_shader_to_entity",
	stepPhysics: "step",
	effectsUpdateParams: "effects.updateParams",
};

function snakeToCamel(name: string): string {
	return name.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function camelToSnake(name: string): string {
	return (
		name
			// Handle leading digits: "3dViewport" -> "3d_viewport", "2dPosition" -> "2d_position"
			.replace(/^([23])d/i, "_$1d_")
			// Handle all-caps sequences: "AABB" -> "aabb", "UI" -> "ui"
			.replace(/^([A-Z]+)(?=[A-Z][a-z]|$)/g, (match) => match.toLowerCase())
			// Handle "3D" and "2D" in middle/end: "create3D" -> "create_3d"
			.replace(/([23])D(?=[A-Z]|$)/g, "_$1d_")
			// Letter followed by digit: "test2" -> "test_2"
			.replace(/([a-z])(\d)/g, "$1_$2")
			// Digit followed by uppercase: "2D" -> "2_d"
			.replace(/(\d)([A-Z])/g, "$1_$2")
			// Lowercase/digit followed by uppercase: "camelCase" -> "camel_case"
			.replace(/([a-z0-9])([A-Z])/g, "$1_$2")
			// Uppercase followed by uppercase then lowercase: "XMLParser" -> "xml_parser"
			.replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
			// Collapse multiple underscores
			.replace(/_+/g, "_")
			// Remove leading/trailing underscores
			.replace(/^_|_$/g, "")
			.toLowerCase()
	);
}

function isTsOnly(name: string, returnType: string): boolean {
	if (LIFECYCLE_METHODS.has(name)) return true;
	if (RPC_DISPATCHED_METHODS.has(name)) return true;
	if (EVENT_CALLBACK_PATTERN.test(name) && returnType.includes("() => void"))
		return true;
	return false;
}

function isStringLiteralUnion(type: Type): boolean {
	if (!type.isUnion()) return false;
	return type.getUnionTypes().every((t) => t.isStringLiteral());
}

function isNumberLiteralUnion(type: Type): boolean {
	if (!type.isUnion()) return false;
	return type.getUnionTypes().every((t) => t.isNumberLiteral());
}

function getNonNullishUnionMembers(type: Type): Type[] | null {
	if (!type.isUnion()) return null;
	const nonNullish = type
		.getUnionTypes()
		.filter((t) => !t.isUndefined() && !t.isNull());
	if (nonNullish.length === type.getUnionTypes().length) return null;
	return nonNullish;
}

function isBooleanLikeUnion(types: Type[]): boolean {
	return types.length <= 2 && types.every((t) => t.isBooleanLiteral());
}

function getPrimitiveWireType(type: Type): WireArg["type"] | null {
	if (type.isString() || type.isStringLiteral()) return "string";
	if (type.isNumber() || type.isNumberLiteral()) return "number";
	if (type.isBoolean() || type.isBooleanLiteral()) return "boolean";
	if (isStringLiteralUnion(type)) return "string";
	if (isNumberLiteralUnion(type)) return "number";

	const stripped = getNonNullishUnionMembers(type);
	if (!stripped || stripped.length === 0) return null;
	if (stripped.length === 1) return getPrimitiveWireType(stripped[0]);
	if (isBooleanLikeUnion(stripped)) return "boolean";
	if (stripped.every((t) => t.isStringLiteral())) return "string";
	if (stripped.every((t) => t.isNumberLiteral())) return "number";

	return null;
}

function isCallbackType(type: Type): boolean {
	if (type.getCallSignatures().length > 0) return true;
	if (type.isUnion()) {
		return type
			.getUnionTypes()
			.some(
				(t) =>
					!t.isUndefined() && !t.isNull() && t.getCallSignatures().length > 0,
			);
	}
	return false;
}

function isStringLiteralDiscriminator(type: Type): boolean {
	return type.isStringLiteral();
}

function flattenStructType(
	type: Type,
	prefix: string,
	accessorPrefix: string,
	visited: Set<string>,
): WireArg[] | null {
	const typeName = type.getSymbol()?.getName() ?? type.getText();
	if (visited.has(typeName)) return null;
	visited.add(typeName);

	const properties = type.getProperties();
	if (properties.length === 0) return null;

	const args: WireArg[] = [];

	for (const prop of properties) {
		const propName = prop.getName();
		const decls = prop.getDeclarations();
		if (decls.length === 0) continue;

		const rawPropType = prop.getTypeAtLocation(decls[0]);

		if (isStringLiteralDiscriminator(rawPropType)) continue;

		const wireName = prefix ? `${prefix}_${propName}` : propName;
		const accessor = accessorPrefix
			? `${accessorPrefix}.${propName}`
			: propName;

		const primitiveType = getPrimitiveWireType(rawPropType);
		if (primitiveType) {
			args.push({ name: wireName, type: primitiveType, accessor });
			continue;
		}

		const stripped = getNonNullishUnionMembers(rawPropType);
		const resolvedType =
			stripped && stripped.length === 1 ? stripped[0] : rawPropType;

		const nestedArgs = flattenStructType(
			resolvedType,
			wireName,
			accessor,
			new Set(visited),
		);
		if (nestedArgs) {
			args.push(...nestedArgs);
			continue;
		}

		return null;
	}

	return args;
}

function isFlattenableStruct(type: Type): boolean {
	const properties = type.getProperties();
	if (properties.length === 0) return false;
	if (type.isArray()) return false;
	if (type.getCallSignatures().length > 0) return false;
	if (type.getNumberIndexType() || type.getStringIndexType()) return false;

	return flattenStructType(type, "", "", new Set()) !== null;
}

function isJsonParamAnnotated(param: ParameterDeclaration): boolean {
	const typeNodeText = param.getTypeNode()?.getText() ?? "";
	return typeNodeText.startsWith("JsonParam<");
}

function resolveWireParam(param: ParameterDeclaration): WireParam {
	const name = param.getName();
	const type = param.getType();
	const optional = param.isOptional();
	const typeNode = param.getTypeNode();
	const tsType = typeNode ? typeNode.getText() : type.getText(param);

	if (isJsonParamAnnotated(param)) {
		return {
			name,
			tsType,
			wireKind: WireKind.JsonBlob,
			optional,
			args: [{ name, type: "json", accessor: `JSON.stringify(${name})` }],
		};
	}

	if (isCallbackType(type)) {
		return {
			name,
			tsType,
			wireKind: WireKind.Callback,
			optional,
			args: [],
		};
	}

	const primitiveType = getPrimitiveWireType(type);
	if (primitiveType) {
		return {
			name,
			tsType,
			wireKind: WireKind.Primitive,
			optional,
			args: [{ name, type: primitiveType, accessor: name }],
		};
	}

	if (isStringLiteralUnion(type)) {
		return {
			name,
			tsType,
			wireKind: WireKind.Primitive,
			optional,
			args: [{ name, type: "string", accessor: name }],
		};
	}
	if (isNumberLiteralUnion(type)) {
		return {
			name,
			tsType,
			wireKind: WireKind.Primitive,
			optional,
			args: [{ name, type: "number", accessor: name }],
		};
	}

	if (type.isVoid() || type.isUndefined() || type.isNull()) {
		return {
			name,
			tsType,
			wireKind: WireKind.Primitive,
			optional,
			args: [],
		};
	}

	if (isFlattenableStruct(type)) {
		const flatArgs = flattenStructType(type, "", name, new Set());
		if (flatArgs) {
			return {
				name,
				tsType,
				wireKind: WireKind.FlatStruct,
				optional,
				args: flatArgs,
			};
		}
	}

	return {
		name,
		tsType,
		wireKind: WireKind.JsonBlob,
		optional,
		args: [{ name, type: "json", accessor: `JSON.stringify(${name})` }],
	};
}

function resolveWireParams(method: MethodSignature): WireParam[] {
	return method.getParameters().map((p) => resolveWireParam(p));
}

function inferCategory(
	method: MethodSignature,
	interfaceDecl: InterfaceDeclaration,
): string {
	const sourceFile = interfaceDecl.getSourceFile();
	const methodStart = method.getStart();

	const fullText = sourceFile.getFullText();
	const textBefore = fullText.slice(0, methodStart);

	const commentLines = textBefore.split("\n");
	let lastCategory = "uncategorized";

	for (const line of commentLines) {
		const match = line.match(/\/\/\s*(.+)/);
		if (match) {
			const comment = match[1].trim();
			if (comment.startsWith("Lifecycle")) lastCategory = "lifecycle";
			else if (
				comment.startsWith("Effects hot-path") ||
				comment.startsWith("Effects -") ||
				comment.includes("effect graph")
			)
				lastCategory = "effects";
			else if (comment.startsWith("Normalized coordinate"))
				lastCategory = "drawing";
			else if (comment.startsWith("Game management")) lastCategory = "game";
			else if (
				comment.startsWith("Physics control") ||
				comment.startsWith("Physics queries")
			)
				lastCategory = "physics";
			else if (
				comment.startsWith("Inspect mode") ||
				comment.startsWith("Debug stepping") ||
				comment.startsWith("Generic RPC") ||
				comment.startsWith("Debug mode")
			)
				lastCategory = "debug";
			else if (
				comment.startsWith("Entity management") ||
				comment.startsWith("Entity data")
			)
				lastCategory = "entity";
			else if (
				comment.startsWith("Transform queries") ||
				comment.startsWith("Transform control")
			)
				lastCategory = "transform";
			else if (
				comment.startsWith("Velocity control") ||
				comment.startsWith("Force/impulse")
			)
				lastCategory = "physics";
			else if (comment.startsWith("Joints")) lastCategory = "joints";
			else if (comment.startsWith("Coordinate conversion"))
				lastCategory = "coordinate";
			else if (comment.startsWith("Events")) lastCategory = "events";
			else if (comment.startsWith("Property sync")) lastCategory = "properties";
			else if (comment.startsWith("Input")) lastCategory = "input";
			else if (
				comment.startsWith("Dynamic image") ||
				comment.startsWith("Pixel Buffer")
			)
				lastCategory = "visual";
			else if (comment.startsWith("Camera control")) lastCategory = "camera";
			else if (comment.startsWith("Particle effects"))
				lastCategory = "particles";
			else if (comment.startsWith("Audio")) lastCategory = "audio";
			else if (comment.startsWith("Visual Effects - Sprite"))
				lastCategory = "effects_sprite";
			else if (comment.startsWith("Visual Effects - Post"))
				lastCategory = "effects_post";
			else if (comment.startsWith("Visual Effects - Camera"))
				lastCategory = "effects_camera";
			else if (comment.startsWith("Visual Effects - Dynamic"))
				lastCategory = "effects_dynamic";
			else if (comment.startsWith("Visual Effects - Particles"))
				lastCategory = "effects_particles";
			else if (comment.startsWith("Visual Effects - Info"))
				lastCategory = "effects_info";
			else if (comment.startsWith("UI Buttons")) lastCategory = "ui";
			else if (comment.startsWith("Themed UI")) lastCategory = "ui_themed";
			else if (
				comment.startsWith("3D Model") ||
				comment.startsWith("3D Primitives") ||
				comment.startsWith("3D Camera")
			)
				lastCategory = "3d";
			else if (comment.startsWith("External Input"))
				lastCategory = "external_input";
		}
	}

	return lastCategory;
}

export function extractMethod(
	method: MethodSignature,
	interfaceDecl: InterfaceDeclaration,
	source: "GodotBridge" | "EffectsBridge",
): MethodEntry {
	const tsName = method.getName();
	const snakeName = BRIDGE_NAME_OVERRIDES[tsName] ?? camelToSnake(tsName);
	const returnTypeNode = method.getReturnTypeNode();
	const returnType = returnTypeNode
		? returnTypeNode.getText()
		: method.getReturnType().getText(method);
	const isAsync = returnType.startsWith("Promise<");

	const params: MethodParam[] = method.getParameters().map((p) => {
		const typeNode = p.getTypeNode();
		const typeText = typeNode ? typeNode.getText() : p.getType().getText(p);
		return {
			name: p.getName(),
			type: typeText,
			optional: p.isOptional(),
		};
	});

	const wireParams = resolveWireParams(method);

	const category =
		source === "EffectsBridge"
			? "effects_pipeline"
			: inferCategory(method, interfaceDecl);
	const tsOnly = isTsOnly(tsName, returnType);

	const dispatchTarget: "bridge" | "effects" =
		source === "EffectsBridge" || EFFECTS_BRIDGE_SNAKE_NAMES.has(snakeName)
			? "effects"
			: "bridge";

	return {
		tsName,
		snakeName,
		params,
		wireParams,
		returnType,
		async: isAsync,
		category,
		tsOnly,
		source,
		dispatchTarget,
	};
}

function generateGDScriptValidator(registry: BridgeRegistry): void {
	const bridgeMethods = registry.methods.filter((m) => !m.tsOnly);

	const methodEntries = bridgeMethods
		.map((m) => {
			const paramCount = m.params.length;
			const asyncStr = m.async ? "true" : "false";
			// Use TypeScript name (camelCase) as the primary key for validation
			return `  "${m.tsName}": {"param_count": ${paramCount}, "async": ${asyncStr}},`;
		})
		.join("\n");

	const gdscript = `# ⚠️ AUTO-GENERATED - DO NOT EDIT
# This file is automatically generated from types.ts
# Any changes will be overwritten on next generation
# To modify: update app/lib/godot/types.ts and run pnpm generate:bridge
#
# Generated by: scripts/bridge-codegen.ts
# Source: app/lib/godot/types.ts (GodotBridge interface)
# Generated: ${registry.generatedAt}

class_name BridgeValidation

const EXPECTED_METHODS: Dictionary = {
${methodEntries}
}

static func validate(method_map: Dictionary) -> Array[String]:
  var errors: Array[String] = []
  
  # Check for missing methods
  for method_name in EXPECTED_METHODS:
    if not method_map.has(method_name):
      errors.append("MISSING: TypeScript expects '%s' but Godot does not register it" % method_name)
  
  # Check for extra methods
  for method_name in method_map:
    if not EXPECTED_METHODS.has(method_name):
      errors.append("EXTRA: Godot registers '%s' but TypeScript does not define it" % method_name)
  
  return errors
`;

	mkdirSync(GDSCRIPT_OUTPUT_DIR, { recursive: true });

	if (existsSync(GDSCRIPT_OUTPUT_PATH)) {
		chmodSync(GDSCRIPT_OUTPUT_PATH, 0o644);
	}
	writeFileSync(GDSCRIPT_OUTPUT_PATH, gdscript);
	chmodSync(GDSCRIPT_OUTPUT_PATH, 0o444);
}

function godotSnakeToCamel(snake: string): string {
	const parts = snake.split("_");
	if (parts.length === 1) return snake;
	let result = parts[0];
	for (let i = 1; i < parts.length; i++) {
		const part = parts[i];
		if (part === "3d") {
			result += "3D";
		} else if (part === "2d") {
			result += "2D";
		} else {
			result += part.charAt(0).toUpperCase() + part.slice(1);
		}
	}
	return result;
}

function generateGDScriptMethodMap(registry: BridgeRegistry): void {
	const bridgeMethods = registry.methods.filter(
		(m) =>
			!m.tsOnly &&
			m.source !== "EffectsBridge" &&
			!m.snakeName.startsWith("effects."),
	);

	const entries = bridgeMethods
		.map((m) => {
			const jsName = godotSnakeToCamel(m.snakeName);
			return `  "${jsName}": "${m.snakeName}",`;
		})
		.join("\n");

	const gdscript = `# ⚠️ AUTO-GENERATED - DO NOT EDIT
# Generated by: scripts/bridge-codegen.ts
# Source: app/lib/godot/types.ts
# Generated: ${registry.generatedAt}

class_name BridgeMethodMap

const EXPECTED_REGISTRATIONS: Dictionary = {
${entries}
}

static func get_missing_methods(method_map: Dictionary) -> Array[String]:
  var missing: Array[String] = []
  for js_name in EXPECTED_REGISTRATIONS:
    if not method_map.has(js_name):
      missing.append(js_name)
  return missing
`;

	mkdirSync(GDSCRIPT_OUTPUT_DIR, { recursive: true });

	if (existsSync(GDSCRIPT_METHOD_MAP_PATH)) {
		chmodSync(GDSCRIPT_METHOD_MAP_PATH, 0o644);
	}
	writeFileSync(GDSCRIPT_METHOD_MAP_PATH, gdscript);
	chmodSync(GDSCRIPT_METHOD_MAP_PATH, 0o444);
}

function computeSourceHash(): string {
	const content = readFileSync(TYPES_PATH, "utf-8");
	return createHash("sha256").update(content).digest("hex").slice(0, 12);
}

function generateRegistry(): BridgeRegistry {
	const project = new Project({
		compilerOptions: {
			strict: true,
			baseUrl: resolve(ROOT, "app"),
			paths: {
				"@slopcade/shared": [resolve(ROOT, "shared/src/types/index.ts")],
				"@slopcade/shared/*": [resolve(ROOT, "shared/src/*")],
				"@slopcade/shared/effects": [
					resolve(ROOT, "shared/src/types/index.ts"),
				],
			},
		},
	});
	project.addSourceFilesAtPaths([
		TYPES_PATH,
		resolve(SHARED_TYPES_DIR, "**/*.ts"),
	]);

	const sourceFile = project.getSourceFileOrThrow(TYPES_PATH);

	const godotBridge = sourceFile.getInterfaceOrThrow("GodotBridge");
	const effectsBridge = sourceFile.getInterfaceOrThrow("EffectsBridge");

	const methods: MethodEntry[] = [];

	for (const method of effectsBridge.getMethods()) {
		methods.push(extractMethod(method, effectsBridge, "EffectsBridge"));
	}

	for (const method of godotBridge.getMethods()) {
		methods.push(extractMethod(method, godotBridge, "GodotBridge"));
	}

	const allTsNames = new Set(methods.map((m) => m.tsName));
	for (const overrideKey of Object.keys(BRIDGE_NAME_OVERRIDES)) {
		if (!allTsNames.has(overrideKey)) {
			throw new Error(
				`BRIDGE_NAME_OVERRIDES references non-existent method: "${overrideKey}"`,
			);
		}
	}

	const byCategory: Record<string, number> = {};
	const tsToSnake: Record<string, string> = {};
	const snakeToTs: Record<string, string> = {};
	let tsOnlyCount = 0;
	for (const m of methods) {
		byCategory[m.category] = (byCategory[m.category] ?? 0) + 1;
		if (m.tsOnly) tsOnlyCount++;
		tsToSnake[m.tsName] = m.snakeName;
		snakeToTs[m.snakeName] = m.tsName;
	}

	return {
		generatedAt: `source:${computeSourceHash()}`,
		sourceFile: "app/lib/godot/types.ts",
		methods,
		nameMap: { tsToSnake, snakeToTs },
		stats: {
			total: methods.length,
			bridgeMethods: methods.length - tsOnlyCount,
			tsOnlyMethods: tsOnlyCount,
			byCategory,
		},
	};
}

function normalizeRegistry(registry: BridgeRegistry): BridgeRegistry {
	return {
		generatedAt: "",
		sourceFile: registry.sourceFile,
		methods: registry.methods,
		nameMap: registry.nameMap,
		stats: registry.stats,
	};
}

async function checkMode(): Promise<void> {
	if (!existsSync(OUTPUT_PATH)) {
		console.error(`ERROR: Registry not found at ${OUTPUT_PATH}`);
		console.error('Run "pnpm generate:bridge" first to generate the registry.');
		process.exit(1);
	}

	const committedContent = readFileSync(OUTPUT_PATH, "utf-8");
	const committedRegistry = JSON.parse(committedContent) as BridgeRegistry;

	const freshRegistry = generateRegistry();

	const normalizedCommitted = normalizeRegistry(committedRegistry);
	const normalizedFresh = normalizeRegistry(freshRegistry);

	const committedJson = JSON.stringify(normalizedCommitted, null, 2);
	const freshJson = JSON.stringify(normalizedFresh, null, 2);

	if (committedJson !== freshJson) {
		console.error("ERROR: Bridge registry is out of date!");
		console.error("");
		console.error(
			"The committed registry does not match the current TypeScript definitions.",
		);
		console.error('Run "pnpm generate:bridge" to update it.');
		console.error("");
		console.error(`Committed: ${committedRegistry.stats.total} methods`);
		console.error(`Current:   ${freshRegistry.stats.total} methods`);
		process.exit(1);
	}

	console.log("✓ Bridge registry is up to date");
	console.log(`  Total methods: ${freshRegistry.stats.total}`);
	console.log(`  Bridge methods: ${freshRegistry.stats.bridgeMethods}`);
	console.log(`  TS-only methods: ${freshRegistry.stats.tsOnlyMethods}`);

	const { runVerification } = await import("./bridge-verify.js");
	const { success, output } = runVerification();
	console.log("");
	console.log(output);
	if (!success) {
		process.exit(1);
	}
	console.log("✓ Bridge contract verification passed");
}

function generateTypedBridgeClient(registry: BridgeRegistry): void {
	const E2E_OUTPUT_DIR = resolve(ROOT, "tests/e2e/bridge/generated");
	const E2E_OUTPUT_PATH = resolve(E2E_OUTPUT_DIR, "TypedBridgeClient.ts");

	const bridgeMethods = registry.methods.filter((m) => !m.tsOnly);

	// Generate method implementations
	const methodImpls = bridgeMethods
		.map((m) => {
			const params = m.params
				.map((p) => {
					const optionalMark = p.optional ? "?" : "";
					return `${p.name}${optionalMark}: ${p.type}`;
				})
				.join(", ");

			const paramNames = m.params.map((p) => p.name).join(", ");
			const paramsArray = m.params.length > 0 ? `[${paramNames}]` : "[]";

			const returnType = m.async ? m.returnType : `Promise<${m.returnType}>`;

			return `  async ${m.tsName}(${params}): ${returnType} {
    return this.driver.call("${m.snakeName}", ${paramsArray});
  }`;
		})
		.join("\n\n");

	const content = `// ⚠️ AUTO-GENERATED - DO NOT EDIT
// This file is automatically generated from types.ts
// Any changes will be overwritten on next generation
// To modify: update app/lib/godot/types.ts and run pnpm generate:bridge
//
// Generated by: scripts/bridge-codegen.ts
// Source: app/lib/godot/types.ts (GodotBridge + EffectsBridge interfaces)
// Generated: ${registry.generatedAt}

import type {
  GameDefinition,
  GameRule,
  PropertySyncPayload,
  Vec2,
  EntityTransform,
  CollisionEvent,
  SensorEvent,
  SpawnEntityRequest,
  EntitySpawnedEvent,
  RaycastHit,
  DynamicShaderResult,
  EffectsResult,
  EffectsPipelineSnapshot,
  JsonParam,
} from '../../../app/lib/godot/types.js';
import type { CompiledPlan } from '@slopcade/shared/effects';
import type GodotHeadlessDriver from './GodotHeadlessDriver.js';

export class TypedBridgeClient {
  constructor(private driver: GodotHeadlessDriver) {}

${methodImpls}
}
`;

	mkdirSync(E2E_OUTPUT_DIR, { recursive: true });

	if (existsSync(E2E_OUTPUT_PATH)) {
		chmodSync(E2E_OUTPUT_PATH, 0o644);
	}
	writeFileSync(E2E_OUTPUT_PATH, content);
	chmodSync(E2E_OUTPUT_PATH, 0o444);

	console.log(`Generated ${E2E_OUTPUT_PATH}`);
	console.log(`  Methods: ${bridgeMethods.length}`);
}

function wireArgTypeToTS(wireType: WireArg["type"]): string {
	return wireType === "json" ? "string" : wireType;
}

function generateWindowDeclaration(registry: BridgeRegistry): void {
	const WINDOW_DECL_PATH = resolve(OUTPUT_DIR, "window-godot-bridge.d.ts");

	const bridgeMethods = registry.methods.filter((m) => !m.tsOnly);

	const methodLines = bridgeMethods.map((m) => {
		// Collect raw arg entries: { name, type, optional, paramName }
		const rawArgs: {
			name: string;
			type: string;
			optional: boolean;
			paramName: string;
		}[] = [];

		for (const wp of m.wireParams) {
			if (wp.wireKind === WireKind.Callback) continue;

			if (
				wp.wireKind === WireKind.Primitive ||
				wp.wireKind === WireKind.FlatStruct
			) {
				for (const arg of wp.args) {
					rawArgs.push({
						name: arg.name,
						type: wireArgTypeToTS(arg.type),
						optional: wp.optional,
						paramName: wp.name,
					});
				}
			} else if (wp.wireKind === WireKind.JsonBlob) {
				rawArgs.push({
					name: wp.name,
					type: "string",
					optional: wp.optional,
					paramName: wp.name,
				});
			}
		}

		// Detect duplicate names and prefix with paramName where needed
		const nameCounts = new Map<string, number>();
		for (const arg of rawArgs) {
			nameCounts.set(arg.name, (nameCounts.get(arg.name) ?? 0) + 1);
		}

		const wireArgs = rawArgs.map((arg) => {
			const displayName =
				(nameCounts.get(arg.name) ?? 0) > 1
					? `${arg.paramName}_${arg.name}`
					: arg.name;
			const optMark = arg.optional ? "?" : "";
			return `${displayName}${optMark}: ${arg.type}`;
		});

		const paramsStr = wireArgs.join(", ");
		return `\t\t\t${m.tsName}(${paramsStr}): void;`;
	});

	const content = `// ⚠️ AUTO-GENERATED - DO NOT EDIT
// This file is automatically generated from types.ts
// Any changes will be overwritten on next generation
// To modify: update app/lib/godot/types.ts and run pnpm generate:bridge
//
// Generated by: scripts/bridge-codegen.ts
// Source: app/lib/godot/types.ts (GodotBridge + EffectsBridge interfaces)
// Generated: ${registry.generatedAt}
//
// Wire-level type declaration for the Godot bridge object exposed on window.
// Method signatures use flattened primitive parameters matching what Godot's
// _setup_js_bridge() registers via JavaScriptBridge.create_callback().
// All methods return void at the wire level; complex returns go through the
// query/callback system.

declare global {
\tinterface Window {
\t\tGodotBridge?: {
\t\t\t_lastResult: unknown;
\t\t\t_pendingQueries?: Map<string, (result: unknown) => void>;
\t\t\tquery(requestId: string, method: string, argsJson: string): void;
${methodLines.join("\n")}
\t\t};
\t}
}

export {};
`;

	mkdirSync(OUTPUT_DIR, { recursive: true });

	if (existsSync(WINDOW_DECL_PATH)) {
		chmodSync(WINDOW_DECL_PATH, 0o644);
	}
	writeFileSync(WINDOW_DECL_PATH, content);
	chmodSync(WINDOW_DECL_PATH, 0o444);

	console.log(`Generated ${WINDOW_DECL_PATH}`);
	console.log(`  Bridge methods: ${bridgeMethods.length}`);
}

function generateMockGodotBridge(registry: BridgeRegistry): void {
	const MOCK_OUTPUT_DIR = resolve(ROOT, "app/lib/godot/__tests__/generated");
	const MOCK_OUTPUT_PATH = resolve(MOCK_OUTPUT_DIR, "MockGodotBridge.ts");

	// Generate mock method implementations
	const mockMethods = registry.methods
		.map((m) => {
			const params = m.params
				.map((p) => {
					const optionalMark = p.optional ? "?" : "";
					return `${p.name}${optionalMark}: ${p.type}`;
				})
				.join(", ");

			return `  ${m.tsName} = vi.fn<(${params}) => ${m.returnType}>();`;
		})
		.join("\n");

	const content = `// ⚠️ AUTO-GENERATED - DO NOT EDIT
// This file is automatically generated from types.ts
// Any changes will be overwritten on next generation
// To modify: update app/lib/godot/types.ts and run pnpm generate:bridge
//
// Generated by: scripts/bridge-codegen.ts
// Source: app/lib/godot/types.ts (GodotBridge + EffectsBridge interfaces)
// Generated: ${registry.generatedAt}

import { vi } from 'vitest';
import type {
  GodotBridge,
  GameDefinition,
  GameRule,
  PropertySyncPayload,
  Vec2,
  EntityTransform,
  CollisionEvent,
  CollisionEnterEvent,
  CollisionExitEvent,
  SensorEvent,
  SpawnEntityRequest,
  EntitySpawnedEvent,
  RaycastHit,
  Vec3,
  RaycastHit3D,
  SpawnEntityRequest3D,
  EntityTransform3D,
  DynamicShaderResult,
  EffectsResult,
  EffectsPipelineSnapshot,
  RevoluteJointDef,
  DistanceJointDef,
  PrismaticJointDef,
  WeldJointDef,
  MouseJointDef,
  NormalizedDrawCommand,
  DrawCommand,
  JsonParam,
  DisposeOptions,
} from '../../types.js';
import type { CompiledPlan } from '@slopcade/shared/effects';

export class MockGodotBridge implements GodotBridge {
${mockMethods}
}
`;

	mkdirSync(MOCK_OUTPUT_DIR, { recursive: true });

	if (existsSync(MOCK_OUTPUT_PATH)) {
		chmodSync(MOCK_OUTPUT_PATH, 0o644);
	}
	writeFileSync(MOCK_OUTPUT_PATH, content);
	chmodSync(MOCK_OUTPUT_PATH, 0o444);

	console.log(`Generated ${MOCK_OUTPUT_PATH}`);
	console.log(`  Methods: ${registry.methods.length}`);
}

function generateSharedTransport(registry: BridgeRegistry): void {
	const SHARED_OUTPUT_PATH = resolve(OUTPUT_DIR, "bridge-methods.ts");

	const bridgeMethods = registry.methods.filter((m) => !m.tsOnly);

	function wireDefault(wireType: WireArg["type"]): string {
		switch (wireType) {
			case "number":
				return "0";
			case "string":
				return '""';
			case "boolean":
				return "false";
			case "json":
				return '""';
		}
	}

	function safeAccessor(a: WireArg, wp: WireParam): string {
		if (wp.wireKind !== WireKind.FlatStruct) return a.accessor;

		const parts = a.accessor.split(".");
		if (parts.length <= 1) return a.accessor;

		const safeParts = [parts[0]];
		for (let i = 1; i < parts.length; i++) {
			safeParts.push(`?.${parts[i]}`);
		}
		return `${safeParts.join("")} ?? ${wireDefault(a.type)}`;
	}

	function buildWireArgs(m: MethodEntry): string[] {
		const args: string[] = [];
		for (const wp of m.wireParams) {
			if (wp.wireKind === WireKind.Callback) continue;
			for (const a of wp.args) {
				args.push(safeAccessor(a, wp));
			}
		}
		return args;
	}

	function getAsyncInnerType(returnType: string): string | null {
		const match = returnType.match(/^Promise<(.+)>$/s);
		return match ? match[1].trim() : null;
	}

	function getAsyncFallback(innerType: string): string | null {
		if (innerType === "void") return null;
		if (innerType === "number") return "0";
		if (innerType === "number | null") return "null";
		if (innerType === "string | null") return "null";
		if (innerType.endsWith("| null")) return "null";
		if (innerType === "any") return "undefined";
		return null;
	}

	function getDefaultFallback(returnType: string): string | null {
		if (returnType === "void") return null;
		if (returnType === "boolean") return "false";
		if (returnType === "number") return "-1";
		if (returnType === "string") return '""';
		return null;
	}

	function buildParamSignature(m: MethodEntry): string {
		return m.params
			.map((p) => {
				const optionalMark = p.optional ? "?" : "";
				return `${p.name}${optionalMark}: ${p.type}`;
			})
			.join(", ");
	}

	function generateEffectsAsyncBody(m: MethodEntry): string {
		const effectsMethod = `effects.${m.tsName}`;

		if (m.tsName === "snapshot") {
			return `return dispatch.effectsAsync<EffectsPipelineSnapshot>("${effectsMethod}", undefined, normalizeEffectsSnapshot);`;
		}

		if (m.tsName === "restore") {
			return `return dispatch.effectsAsync("${effectsMethod}", { snapshot: createEffectsSnapshotPayload(snapshot) });`;
		}

		const nonCallbackParams = m.wireParams.filter(
			(wp) => wp.wireKind !== WireKind.Callback,
		);

		if (nonCallbackParams.length === 0) {
			return `return dispatch.effectsAsync("${effectsMethod}");`;
		}

		const paramObj = nonCallbackParams.map((wp) => wp.name).join(", ");

		return `return dispatch.effectsAsync("${effectsMethod}", { ${paramObj} });`;
	}

	function generateEffectsSyncBody(m: MethodEntry): string {
		const wireArgs = buildWireArgs(m);
		const argsStr = wireArgs.length > 0 ? `, ${wireArgs.join(", ")}` : "";
		return `dispatch.effectsSync("${m.snakeName}"${argsStr});`;
	}

	function generateBridgeAsyncBody(m: MethodEntry): string {
		const wireArgs = buildWireArgs(m);
		const innerType = getAsyncInnerType(m.returnType);
		const fallback = innerType ? getAsyncFallback(innerType) : null;

		const argsArray = wireArgs.length > 0 ? `[${wireArgs.join(", ")}]` : "[]";

		if (fallback !== null) {
			return `return await dispatch.async<${innerType}>("${m.snakeName}", ${argsArray}) ?? ${fallback};`;
		}
		return `return dispatch.async<${innerType}>("${m.snakeName}", ${argsArray});`;
	}

	function generateBridgeSyncBody(m: MethodEntry): string {
		const wireArgs = buildWireArgs(m);
		const argsStr = wireArgs.length > 0 ? `, ${wireArgs.join(", ")}` : "";
		const fallback = getDefaultFallback(m.returnType);

		if (m.returnType === "void" || m.returnType === "Promise<void>") {
			return `dispatch.sync("${m.snakeName}"${argsStr});`;
		}

		if (fallback !== null) {
			return `return dispatch.sync("${m.snakeName}"${argsStr}) as ${m.returnType} ?? ${fallback};`;
		}

		return `return dispatch.sync("${m.snakeName}"${argsStr}) as ${m.returnType};`;
	}

	function generateMethodBody(m: MethodEntry): string {
		if (m.source === "EffectsBridge") {
			return generateEffectsAsyncBody(m);
		}

		if (m.dispatchTarget === "effects" && !m.async) {
			return generateEffectsSyncBody(m);
		}

		if (m.async) {
			const innerType = getAsyncInnerType(m.returnType);
			if (innerType === "void") {
				return generateBridgeSyncBody(m);
			}
			return generateBridgeAsyncBody(m);
		}

		return generateBridgeSyncBody(m);
	}

	const methodImpls = bridgeMethods
		.map((m) => {
			const params = buildParamSignature(m);
			const body = generateMethodBody(m);
			const asyncPrefix = m.async ? "async " : "";
			const indent = "    ";

			return `  ${asyncPrefix}${m.tsName}(${params}): ${m.returnType} {\n${indent}${body}\n  }`;
		})
		.join(",\n\n");

	const importTypes = new Set<string>();
	for (const m of bridgeMethods) {
		for (const p of m.params) {
			const typeStr = p.type;
			const typeNames = [
				"GameDefinition",
				"GameRule",
				"PropertySyncPayload",
				"Vec2",
				"Vec3",
				"EntityTransform",
				"EntityTransform3D",
				"CollisionEvent",
				"SensorEvent",
				"SpawnEntityRequest",
				"SpawnEntityRequest3D",
				"EntitySpawnedEvent",
				"RaycastHit",
				"RaycastHit3D",
				"DynamicShaderResult",
				"EffectsResult",
				"EffectsPipelineSnapshot",
				"RevoluteJointDef",
				"DistanceJointDef",
				"PrismaticJointDef",
				"WeldJointDef",
				"MouseJointDef",
				"NormalizedDrawCommand",
				"DrawCommand",
				"JsonParam",
			];
			for (const tn of typeNames) {
				if (typeStr.includes(tn)) importTypes.add(tn);
			}
		}
		const retTypeNames = [
			"EntityTransform",
			"EntityTransform3D",
			"Vec2",
			"Vec3",
			"RaycastHit",
			"RaycastHit3D",
			"DynamicShaderResult",
			"EffectsResult",
			"EffectsPipelineSnapshot",
			"PropertySyncPayload",
		];
		for (const tn of retTypeNames) {
			if (m.returnType.includes(tn)) importTypes.add(tn);
		}
	}

	importTypes.add("GodotBridge");

	const hasEffectsPipeline = bridgeMethods.some(
		(m) => m.source === "EffectsBridge",
	);
	const hasSnapshot = bridgeMethods.some(
		(m) => m.source === "EffectsBridge" && m.tsName === "snapshot",
	);
	const hasRestore = bridgeMethods.some(
		(m) => m.source === "EffectsBridge" && m.tsName === "restore",
	);

	const typesImports = Array.from(importTypes).sort();

	const baseImports: string[] = [];
	if (hasEffectsPipeline) {
		const baseItems: string[] = [];
		if (hasSnapshot) baseItems.push("normalizeEffectsSnapshot");
		if (hasRestore) baseItems.push("createEffectsSnapshotPayload");
		if (baseItems.length > 0) {
			baseImports.push(
				`import { ${baseItems.join(", ")} } from '../GodotBridgeBase';`,
			);
		}
	}

	const sharedImports: string[] = [];
	const hasCompiledPlan = bridgeMethods.some((m) =>
		m.params.some((p) => p.type.includes("CompiledPlan")),
	);
	if (hasCompiledPlan) {
		sharedImports.push(
			`import type { CompiledPlan } from '@slopcade/shared/effects';`,
		);
	}

	const content = `// ⚠️ AUTO-GENERATED - DO NOT EDIT
// This file is automatically generated from types.ts
// Any changes will be overwritten on next generation
// To modify: update app/lib/godot/types.ts and run pnpm generate:bridge
//
// Generated by: scripts/bridge-codegen.ts
// Source: app/lib/godot/types.ts (GodotBridge + EffectsBridge interfaces)
// Generated: ${registry.generatedAt}

import type { ${typesImports.join(", ")} } from '../types';
${sharedImports.length > 0 ? sharedImports.join("\n") + "\n" : ""}${baseImports.length > 0 ? baseImports.join("\n") + "\n" : ""}
export interface PlatformDispatch {
  sync(snakeName: string, ...args: unknown[]): unknown;
  async<T>(snakeName: string, ...args: unknown[]): Promise<T>;
  effectsSync(snakeName: string, ...args: unknown[]): void;
  effectsAsync<T = void>(
    method: string,
    params?: Record<string, unknown>,
    mapData?: (rawData: unknown) => T,
  ): Promise<EffectsResult<T>>;
}

export function createBridgeMethods(dispatch: PlatformDispatch): Partial<GodotBridge> {
  return {
${methodImpls},
  };
}
`;

	mkdirSync(OUTPUT_DIR, { recursive: true });

	if (existsSync(SHARED_OUTPUT_PATH)) {
		chmodSync(SHARED_OUTPUT_PATH, 0o644);
	}
	writeFileSync(SHARED_OUTPUT_PATH, content);
	chmodSync(SHARED_OUTPUT_PATH, 0o444);

	console.log(`Generated ${SHARED_OUTPUT_PATH}`);
	console.log(`  Methods: ${bridgeMethods.length}`);
}

function generateMode(): void {
	const registry = generateRegistry();

	// Add AI protection header to JSON
	const jsonContent = `{
  "_comment": "⚠️ AUTO-GENERATED - DO NOT EDIT",
  "_warning": "This file is automatically generated from types.ts",
  "_instructions": "Any changes will be overwritten on next generation",
  "_howToModify": "To modify: update app/lib/godot/types.ts and run pnpm generate:bridge",
${JSON.stringify(registry, null, 2).slice(2)}`;

	mkdirSync(OUTPUT_DIR, { recursive: true });

	if (existsSync(OUTPUT_PATH)) {
		chmodSync(OUTPUT_PATH, 0o644);
	}
	writeFileSync(OUTPUT_PATH, jsonContent);
	chmodSync(OUTPUT_PATH, 0o444);

	console.log(`Generated ${OUTPUT_PATH}`);
	console.log(`  Total methods: ${registry.stats.total}`);
	console.log(`  Bridge methods: ${registry.stats.bridgeMethods}`);
	console.log(`  TS-only methods: ${registry.stats.tsOnlyMethods}`);
	console.log(
		`  Categories: ${Object.keys(registry.stats.byCategory).join(", ")}`,
	);

	generateGDScriptValidator(registry);
	console.log(`Generated ${GDSCRIPT_OUTPUT_PATH}`);

	generateGDScriptMethodMap(registry);
	console.log(`Generated ${GDSCRIPT_METHOD_MAP_PATH}`);

	generateTypedBridgeClient(registry);

	generateMockGodotBridge(registry);

	generateWindowDeclaration(registry);

	generateSharedTransport(registry);
}

async function main() {
	const args = process.argv.slice(2);
	const isCheckMode = args.includes("--check");

	if (isCheckMode) {
		await checkMode();
	} else {
		generateMode();
	}
}

const isDirectExecution =
	process.argv[1]?.endsWith("bridge-codegen.ts") ||
	process.argv[1]?.endsWith("bridge-codegen");
if (isDirectExecution) {
	main();
}
