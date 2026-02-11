import { beforeEach, describe, expect, it } from "vitest";
import { createEmptyDocument } from "../../graph-core/commands";
import type { GraphDocument } from "../../graph-core/types";
import { AdapterRegistry } from "../registry";
import type {
	DomainValidationResult,
	GraphDomainAdapter,
	InspectorConfig,
	NodeCatalogEntry,
} from "../types";

interface MockDomainGraph {
	kind: "mock-effects";
	effects: Array<{ name: string; intensity: number }>;
}

interface MockNarrativeDomain {
	kind: "mock-narrative";
	scenes: Array<{ title: string }>;
}

function createMockEffectsAdapter(): GraphDomainAdapter<MockDomainGraph> {
	return {
		id: "mock-effects",
		name: "Mock Effects Adapter",
		toGeneric(domainGraph: MockDomainGraph): GraphDocument {
			const doc = createEmptyDocument("converted");
			for (const [i, effect] of domainGraph.effects.entries()) {
				doc.nodes[`effect-${i}`] = {
					id: `effect-${i}`,
					type: "effect",
					position: { x: i * 100, y: 0 },
					ports: [{ id: "out", direction: "output", dataType: "effect" }],
					data: { name: effect.name, intensity: effect.intensity },
				};
			}
			return doc;
		},
		fromGeneric(graph: GraphDocument): MockDomainGraph {
			const effects = Object.values(graph.nodes).map((n) => ({
				name: n.data.name as string,
				intensity: n.data.intensity as number,
			}));
			return { kind: "mock-effects", effects };
		},
		validateDomain(domainGraph: MockDomainGraph): DomainValidationResult {
			const errors: DomainValidationResult["errors"] = [];
			for (const effect of domainGraph.effects) {
				if (effect.intensity < 0 || effect.intensity > 1) {
					errors.push({
						code: "DOMAIN_CONSTRAINT",
						message: `Effect "${effect.name}" intensity must be 0-1, got ${effect.intensity}`,
					});
				}
			}
			return { valid: errors.length === 0, errors };
		},
		getNodeCatalog(): NodeCatalogEntry[] {
			return [
				{
					type: "effect",
					label: "Effect Node",
					category: "effects",
					defaultPorts: [
						{ id: "out", direction: "output", dataType: "effect" },
					],
				},
			];
		},
		getInspectorConfig(nodeType: string): InspectorConfig | null {
			if (nodeType === "effect") {
				return {
					nodeType: "effect",
					sections: [
						{
							label: "Properties",
							fields: [
								{
									key: "name",
									label: "Name",
									type: "string",
								},
								{
									key: "intensity",
									label: "Intensity",
									type: "number",
									min: 0,
									max: 1,
								},
							],
						},
					],
				};
			}
			return null;
		},
	};
}

function createMockNarrativeAdapter(): GraphDomainAdapter<MockNarrativeDomain> {
	return {
		id: "mock-narrative",
		name: "Mock Narrative Adapter",
		toGeneric(domainGraph: MockNarrativeDomain): GraphDocument {
			const doc = createEmptyDocument("narrative-doc");
			for (const [i, scene] of domainGraph.scenes.entries()) {
				doc.nodes[`scene-${i}`] = {
					id: `scene-${i}`,
					type: "scene",
					position: { x: 0, y: i * 100 },
					ports: [
						{ id: "in", direction: "input", dataType: "scene" },
						{ id: "out", direction: "output", dataType: "scene" },
					],
					data: { title: scene.title },
				};
			}
			return doc;
		},
		fromGeneric(graph: GraphDocument): MockNarrativeDomain {
			const scenes = Object.values(graph.nodes).map((n) => ({
				title: n.data.title as string,
			}));
			return { kind: "mock-narrative", scenes };
		},
		validateDomain(domainGraph: MockNarrativeDomain): DomainValidationResult {
			const errors: DomainValidationResult["errors"] = [];
			if (domainGraph.scenes.length === 0) {
				errors.push({
					code: "DOMAIN_CONSTRAINT",
					message: "Narrative must have at least one scene",
				});
			}
			return { valid: errors.length === 0, errors };
		},
		getNodeCatalog(): NodeCatalogEntry[] {
			return [
				{
					type: "scene",
					label: "Scene Node",
					category: "narrative",
					defaultPorts: [
						{ id: "in", direction: "input", dataType: "scene" },
						{ id: "out", direction: "output", dataType: "scene" },
					],
				},
			];
		},
		getInspectorConfig(nodeType: string): InspectorConfig | null {
			if (nodeType === "scene") {
				return {
					nodeType: "scene",
					sections: [
						{
							label: "Scene",
							fields: [
								{
									key: "title",
									label: "Title",
									type: "string",
								},
							],
						},
					],
				};
			}
			return null;
		},
	};
}

describe("AdapterRegistry", () => {
	let registry: AdapterRegistry;

	beforeEach(() => {
		registry = new AdapterRegistry();
	});

	describe("register and resolve", () => {
		it("registers an adapter and resolves it by id", () => {
			const adapter = createMockEffectsAdapter();
			registry.register(adapter);

			const resolved = registry.resolve("mock-effects");
			expect(resolved).toBe(adapter);
		});

		it("returns undefined for unregistered adapter id", () => {
			const resolved = registry.resolve("nonexistent");
			expect(resolved).toBeUndefined();
		});

		it("throws when registering duplicate adapter id", () => {
			const adapter = createMockEffectsAdapter();
			registry.register(adapter);

			expect(() => registry.register(adapter)).toThrow(/already registered/);
		});
	});

	describe("resolveOrThrow", () => {
		it("returns the adapter when found", () => {
			const adapter = createMockEffectsAdapter();
			registry.register(adapter);

			const resolved = registry.resolveOrThrow("mock-effects");
			expect(resolved).toBe(adapter);
		});

		it("throws with descriptive error for unknown adapter", () => {
			expect(() => registry.resolveOrThrow("unknown-domain")).toThrow(
				/unknown-domain/,
			);
		});
	});

	describe("getAll", () => {
		it("returns empty array when no adapters registered", () => {
			expect(registry.getAll()).toEqual([]);
		});

		it("returns all registered adapters", () => {
			const effects = createMockEffectsAdapter();
			const narrative = createMockNarrativeAdapter();
			registry.register(effects);
			registry.register(narrative);

			const all = registry.getAll();
			expect(all).toHaveLength(2);
			expect(all).toContain(effects);
			expect(all).toContain(narrative);
		});
	});

	describe("has", () => {
		it("returns false for unregistered id", () => {
			expect(registry.has("nope")).toBe(false);
		});

		it("returns true for registered id", () => {
			registry.register(createMockEffectsAdapter());
			expect(registry.has("mock-effects")).toBe(true);
		});
	});

	describe("unregister", () => {
		it("removes a registered adapter", () => {
			registry.register(createMockEffectsAdapter());
			expect(registry.has("mock-effects")).toBe(true);

			const removed = registry.unregister("mock-effects");
			expect(removed).toBe(true);
			expect(registry.has("mock-effects")).toBe(false);
		});

		it("returns false when unregistering nonexistent adapter", () => {
			const removed = registry.unregister("nope");
			expect(removed).toBe(false);
		});
	});
});

describe("GraphDomainAdapter contract", () => {
	it("round-trips domain data through toGeneric/fromGeneric", () => {
		const adapter = createMockEffectsAdapter();
		const original: MockDomainGraph = {
			kind: "mock-effects",
			effects: [
				{ name: "glow", intensity: 0.8 },
				{ name: "blur", intensity: 0.3 },
			],
		};

		const generic = adapter.toGeneric(original);
		const roundTripped = adapter.fromGeneric(generic);

		expect(roundTripped.effects).toHaveLength(2);
		expect(roundTripped.effects[0].name).toBe("glow");
		expect(roundTripped.effects[0].intensity).toBe(0.8);
		expect(roundTripped.effects[1].name).toBe("blur");
	});

	it("validates valid domain data", () => {
		const adapter = createMockEffectsAdapter();
		const result = adapter.validateDomain({
			kind: "mock-effects",
			effects: [{ name: "glow", intensity: 0.5 }],
		});
		expect(result.valid).toBe(true);
		expect(result.errors).toEqual([]);
	});

	it("validates invalid domain data", () => {
		const adapter = createMockEffectsAdapter();
		const result = adapter.validateDomain({
			kind: "mock-effects",
			effects: [{ name: "glow", intensity: 1.5 }],
		});
		expect(result.valid).toBe(false);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].code).toBe("DOMAIN_CONSTRAINT");
	});

	it("returns node catalog entries", () => {
		const adapter = createMockEffectsAdapter();
		const catalog = adapter.getNodeCatalog();

		expect(catalog).toHaveLength(1);
		expect(catalog[0].type).toBe("effect");
		expect(catalog[0].label).toBe("Effect Node");
		expect(catalog[0].category).toBe("effects");
		expect(catalog[0].defaultPorts).toHaveLength(1);
	});

	it("returns inspector config for known node type", () => {
		const adapter = createMockEffectsAdapter();
		const config = adapter.getInspectorConfig("effect");

		expect(config).not.toBeNull();
		expect(config!.nodeType).toBe("effect");
		expect(config!.sections).toHaveLength(1);
		expect(config!.sections[0].fields).toHaveLength(2);
	});

	it("returns null inspector config for unknown node type", () => {
		const adapter = createMockEffectsAdapter();
		const config = adapter.getInspectorConfig("nonexistent");
		expect(config).toBeNull();
	});

	it("supports multiple adapters with different domain types", () => {
		const effects = createMockEffectsAdapter();
		const narrative = createMockNarrativeAdapter();

		const effectsGeneric = effects.toGeneric({
			kind: "mock-effects",
			effects: [{ name: "glow", intensity: 0.5 }],
		});
		const narrativeGeneric = narrative.toGeneric({
			kind: "mock-narrative",
			scenes: [{ title: "Opening" }],
		});

		expect(Object.values(effectsGeneric.nodes)[0].type).toBe("effect");
		expect(Object.values(narrativeGeneric.nodes)[0].type).toBe("scene");
	});
});
