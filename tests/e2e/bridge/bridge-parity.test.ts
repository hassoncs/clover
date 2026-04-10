import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import GodotHeadlessDriver from "./GodotHeadlessDriver.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BridgeMethod {
	tsName: string;
	snakeName: string;
	params: Array<{ name: string; type: string; optional: boolean }>;
	returnType: string;
	async: boolean;
	category: string;
	tsOnly: boolean;
	source: string;
}

interface BridgeRegistry {
	generatedAt: string;
	sourceFile: string;
	methods: BridgeMethod[];
}

interface GodotBridgeMethods {
	total: number;
	methods: Array<{ name: string; owner: string }>;
	byModule: Record<string, string[]>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findRepoRoot(): string {
	const thisFile = fileURLToPath(import.meta.url);
	// tests/e2e/bridge/bridge-parity.test.ts -> repo root is 4 levels up
	return resolve(dirname(thisFile), "..", "..", "..");
}

function loadBridgeRegistry(): BridgeRegistry {
	const repoRoot = findRepoRoot();
	const registryPath = resolve(
		repoRoot,
		"packages/godot-bridge/src/generated/bridge-registry.json",
	);
	const content = readFileSync(registryPath, "utf-8");
	return JSON.parse(content);
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe("Bridge Parity: TypeScript ↔ GDScript", () => {
	let driver: GodotHeadlessDriver;
	let registry: BridgeRegistry;
	let godotMethods: GodotBridgeMethods;

	beforeAll(async () => {
		// Load TypeScript registry
		registry = loadBridgeRegistry();

		// Boot headless Godot
		driver = new GodotHeadlessDriver({ quiet: true });
		await driver.start();

		// Get actual Godot methods
		godotMethods = (await driver.call(
			"get_bridge_methods",
		)) as GodotBridgeMethods;
	});

	afterAll(async () => {
		await driver.stop();
	});

	it("should have loaded TypeScript registry", () => {
		expect(registry).toBeDefined();
		expect(registry.methods).toBeInstanceOf(Array);
		expect(registry.methods.length).toBeGreaterThan(0);
	});

	it("should have loaded Godot methods", () => {
		expect(godotMethods).toBeDefined();
		expect(godotMethods.methods).toBeInstanceOf(Array);
		expect(godotMethods.total).toBeGreaterThan(0);
	});

	it("should have matching method counts (excluding tsOnly)", () => {
		const tsMethodsForGodot = registry.methods.filter((m) => !m.tsOnly);
		const godotMethodNames = new Set(godotMethods.methods.map((m) => m.name));

		// Filter out TypeScript-only methods from expected count
		const expectedInGodot = tsMethodsForGodot.filter((m) =>
			godotMethodNames.has(m.snakeName),
		);

		expect(expectedInGodot.length).toBe(godotMethods.total);
	});

	it("should have all TypeScript methods implemented in Godot (excluding tsOnly)", () => {
		const tsMethodsForGodot = registry.methods.filter((m) => !m.tsOnly);
		const godotMethodNames = new Set(godotMethods.methods.map((m) => m.name));

		const missing: string[] = [];

		for (const method of tsMethodsForGodot) {
			if (!godotMethodNames.has(method.snakeName)) {
				missing.push(`${method.snakeName} (${method.tsName})`);
			}
		}

		if (missing.length > 0) {
			const report = [
				`❌ ${missing.length} TypeScript method(s) missing from Godot:`,
				...missing.map((m) => `  - ${m}`),
			].join("\n");
			throw new Error(report);
		}

		expect(missing).toHaveLength(0);
	});

	it("should have no extra methods in Godot that aren't in TypeScript", () => {
		const tsMethodSet = new Set(
			registry.methods.filter((m) => !m.tsOnly).map((m) => m.snakeName),
		);

		const extra: string[] = [];

		for (const godotMethod of godotMethods.methods) {
			if (!tsMethodSet.has(godotMethod.name)) {
				extra.push(`${godotMethod.name} (owner: ${godotMethod.owner})`);
			}
		}

		if (extra.length > 0) {
			const report = [
				`❌ ${extra.length} Godot method(s) not in TypeScript registry:`,
				...extra.map((m) => `  - ${m}`),
			].join("\n");
			throw new Error(report);
		}

		expect(extra).toHaveLength(0);
	});

	it("should have all tsOnly methods excluded from Godot", () => {
		const tsOnlyMethods = registry.methods.filter((m) => m.tsOnly);
		const godotMethodNames = new Set(godotMethods.methods.map((m) => m.name));

		const incorrectlyInGodot: string[] = [];

		for (const method of tsOnlyMethods) {
			if (godotMethodNames.has(method.snakeName)) {
				incorrectlyInGodot.push(`${method.snakeName} (${method.tsName})`);
			}
		}

		if (incorrectlyInGodot.length > 0) {
			const report = [
				`❌ ${incorrectlyInGodot.length} tsOnly method(s) incorrectly found in Godot:`,
				...incorrectlyInGodot.map((m) => `  - ${m}`),
			].join("\n");
			throw new Error(report);
		}

		expect(incorrectlyInGodot).toHaveLength(0);
	});

	it("should report registry metadata", () => {
		console.log("\n📊 Bridge Registry Stats:");
		console.log(`  Generated: ${registry.generatedAt}`);
		console.log(`  Source: ${registry.sourceFile}`);
		console.log(`  Total methods: ${registry.methods.length}`);
		console.log(
			`  TypeScript-only: ${registry.methods.filter((m) => m.tsOnly).length}`,
		);
		console.log(
			`  Godot methods: ${registry.methods.filter((m) => !m.tsOnly).length}`,
		);
		console.log(`  Godot runtime: ${godotMethods.total}`);

		const categories = new Set(registry.methods.map((m) => m.category));
		console.log(`  Categories: ${Array.from(categories).sort().join(", ")}`);
	});
});
