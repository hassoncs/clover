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
const TYPES_PATH = resolve(ROOT, "app/lib/godot/types.ts");
const SHARED_TYPES_DIR = resolve(ROOT, "shared/src/types");
const OUTPUT_DIR = resolve(ROOT, "app/lib/godot/generated");
const OUTPUT_PATH = resolve(OUTPUT_DIR, "bridge-registry.json");
const GDSCRIPT_OUTPUT_DIR = resolve(
	ROOT,
	"godot_project/scripts/bridge/generated",
);
const GDSCRIPT_OUTPUT_PATH = resolve(
	GDSCRIPT_OUTPUT_DIR,
	"BridgeValidation.gd",
);

interface MethodParam {
	name: string;
	type: string;
	optional: boolean;
}

enum WireKind {
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
}

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

const EVENT_CALLBACK_PATTERN = /^on[A-Z]/;

const BRIDGE_NAME_OVERRIDES: Record<string, string> = {
	loadGame: "load_game_json",
	applyDynamicShader: "apply_dynamic_shader_to_entity",
	stepPhysics: "step",
	effectsUpdateParams: "effects.updateParams",
};

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
	// Must have properties (interface/object type)
	const properties = type.getProperties();
	if (properties.length === 0) return false;

	// Must not be an array
	if (type.isArray()) return false;

	// Must not have call signatures (not a function)
	if (type.getCallSignatures().length > 0) return false;

	// Must not have index signatures (Record<K,V> types)
	if (type.getNumberIndexType() || type.getStringIndexType()) return false;

	// Try to flatten — if all properties resolve to primitives or nested flat structs, it's flattenable
	return flattenStructType(type, "", "", new Set()) !== null;
}

function resolveWireParam(param: ParameterDeclaration): WireParam {
	const name = param.getName();
	const type = param.getType();
	const optional = param.isOptional();
	const typeNode = param.getTypeNode();
	const tsType = typeNode ? typeNode.getText() : type.getText(param);

	// 1. Callback/function type
	if (isCallbackType(type)) {
		return {
			name,
			tsType,
			wireKind: WireKind.Callback,
			optional,
			args: [],
		};
	}

	// 2. Primitive types (string, number, boolean, void)
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

	// 3. String/number literal unions → treat as primitive
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

	// 4. Void type
	if (type.isVoid() || type.isUndefined() || type.isNull()) {
		return {
			name,
			tsType,
			wireKind: WireKind.Primitive,
			optional,
			args: [],
		};
	}

	// 5. Flattenable struct (all properties are primitives or nested flat structs)
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

	// 6. Everything else → JsonBlob
	return {
		name,
		tsType,
		wireKind: WireKind.JsonBlob,
		optional,
		args: [{ name, type: "json", accessor: `JSON.stringify(${name})` }],
	};
}

function resolveWireParams(method: MethodSignature): WireParam[] {
	return method.getParameters().map(resolveWireParam);
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

function extractMethod(
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

	// Validate that all override keys reference actual methods
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

function checkMode(): void {
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
  SensorEvent,
  SpawnEntityRequest,
  EntitySpawnedEvent,
  RaycastHit,
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

	generateTypedBridgeClient(registry);

	generateMockGodotBridge(registry);
}

function main() {
	const args = process.argv.slice(2);
	const isCheckMode = args.includes("--check");

	if (isCheckMode) {
		checkMode();
	} else {
		generateMode();
	}
}

main();
