import { dirname, resolve } from "path";
import {
	type InterfaceDeclaration,
	type MethodSignature,
	Project,
} from "ts-morph";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

import { extractMethod, WireKind } from "../bridge-codegen";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "../..");
const TYPES_PATH = resolve(ROOT, "packages/godot-bridge/src/types.ts");
const SHARED_TYPES_DIR = resolve(ROOT, "shared/src/types");

function getProject() {
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
	return project;
}

function getMethod(
	project: Project,
	methodName: string,
	interfaceName: "GodotBridge" | "EffectsBridge" = "GodotBridge",
): { method: MethodSignature; iface: InterfaceDeclaration } {
	const sourceFile = project.getSourceFileOrThrow(TYPES_PATH);
	const iface = sourceFile.getInterfaceOrThrow(interfaceName);
	const method = iface.getMethodOrThrow(methodName);
	return { method, iface };
}

describe("bridge-codegen", () => {
	const project = getProject();

	describe("loadGame: Promise<void> uses sync dispatch", () => {
		it("marks as async but wire params are JSON blob for definition", () => {
			const { method, iface } = getMethod(project, "loadGame");
			const entry = extractMethod(method, iface, "GodotBridge");

			expect(entry.async).toBe(true);
			expect(entry.returnType).toBe("Promise<void>");
			expect(entry.wireParams).toHaveLength(1);
			expect(entry.wireParams[0].wireKind).toBe(WireKind.JsonBlob);
		});
	});

	describe("spawnEntity: arg order matches Godot wire protocol", () => {
		it("flattens as prefabId, position.x, position.y, entityId", () => {
			const { method, iface } = getMethod(project, "spawnEntity");
			const entry = extractMethod(method, iface, "GodotBridge");

			const flatArgs = entry.wireParams[0].args;
			expect(flatArgs.map((a) => a.accessor)).toEqual([
				"request.prefabId",
				"request.position.x",
				"request.position.y",
				"request.entityId",
			]);
		});
	});

	describe("joint methods: exclude type discriminator field", () => {
		it("createRevoluteJoint excludes type, starts with bodyA, bodyB", () => {
			const { method, iface } = getMethod(project, "createRevoluteJoint");
			const entry = extractMethod(method, iface, "GodotBridge");

			const argNames = entry.wireParams[0].args.map((a) => a.name);
			expect(argNames).not.toContain("type");
			expect(argNames[0]).toBe("bodyA");
			expect(argNames[1]).toBe("bodyB");
		});

		it("createDistanceJoint excludes type", () => {
			const { method, iface } = getMethod(project, "createDistanceJoint");
			const entry = extractMethod(method, iface, "GodotBridge");

			const argNames = entry.wireParams[0].args.map((a) => a.name);
			expect(argNames).not.toContain("type");
		});

		it("createPrismaticJoint excludes type", () => {
			const { method, iface } = getMethod(project, "createPrismaticJoint");
			const entry = extractMethod(method, iface, "GodotBridge");

			const argNames = entry.wireParams[0].args.map((a) => a.name);
			expect(argNames).not.toContain("type");
		});

		it("createWeldJoint excludes type", () => {
			const { method, iface } = getMethod(project, "createWeldJoint");
			const entry = extractMethod(method, iface, "GodotBridge");

			const argNames = entry.wireParams[0].args.map((a) => a.name);
			expect(argNames).not.toContain("type");
		});

		it("createMouseJoint excludes type", () => {
			const { method, iface } = getMethod(project, "createMouseJoint");
			const entry = extractMethod(method, iface, "GodotBridge");

			const argNames = entry.wireParams[0].args.map((a) => a.name);
			expect(argNames).not.toContain("type");
		});
	});

	describe("setupWorld: nested objects serialize as JSON", () => {
		it("uses JsonBlob for world param", () => {
			const { method, iface } = getMethod(project, "setupWorld");
			const entry = extractMethod(method, iface, "GodotBridge");

			const worldParam = entry.wireParams[0];
			expect(worldParam.wireKind).toBe(WireKind.JsonBlob);
			expect(worldParam.args).toHaveLength(1);
			expect(worldParam.args[0].type).toBe("json");
		});
	});

	describe("setDebugSettings: inline object serializes as JSON", () => {
		it("uses JsonBlob for settings param", () => {
			const { method, iface } = getMethod(project, "setDebugSettings");
			const entry = extractMethod(method, iface, "GodotBridge");

			const settingsParam = entry.wireParams[0];
			expect(settingsParam.wireKind).toBe(WireKind.JsonBlob);
			expect(settingsParam.args).toHaveLength(1);
			expect(settingsParam.args[0].type).toBe("json");
		});
	});

	describe("no override maps exported", () => {
		it("WIRE_OVERRIDES not exported", async () => {
			const mod = await import("../bridge-codegen");
			expect("WIRE_OVERRIDES" in mod).toBe(false);
		});

		it("FLATTEN_SKIP_FIELDS not exported", async () => {
			const mod = await import("../bridge-codegen");
			expect("FLATTEN_SKIP_FIELDS" in mod).toBe(false);
		});
	});
});
