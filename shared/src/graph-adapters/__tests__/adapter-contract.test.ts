import { describe, expect, it } from "vitest";
import { validateDocument } from "../../graph-core/validator";
import type {
	DomainValidationResult,
	GraphDomainAdapter,
	InspectorConfig,
	NodeCatalogEntry,
} from "../types";

/**
 * Contract test factory for GraphDomainAdapter implementations.
 * Any adapter must pass these tests to be considered valid.
 */
export function testAdapterContract<TDomain>(
	adapterName: string,
	createAdapter: () => GraphDomainAdapter<TDomain>,
	validDomainGraph: TDomain,
	invalidDomainGraph: TDomain,
) {
	describe(`${adapterName} - GraphDomainAdapter contract`, () => {
		it("toGeneric produces valid GraphDocument", () => {
			const adapter = createAdapter();
			const generic = adapter.toGeneric(validDomainGraph);

			const result = validateDocument(generic);
			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it("fromGeneric(toGeneric(domain)) round-trips without data loss", () => {
			const adapter = createAdapter();
			const generic = adapter.toGeneric(validDomainGraph);
			const roundTripped = adapter.fromGeneric(generic);

			// Re-convert to generic to compare structure
			const genericAgain = adapter.toGeneric(roundTripped);

			// Should have same number of nodes and edges
			expect(Object.keys(genericAgain.nodes).length).toBe(
				Object.keys(generic.nodes).length,
			);
			expect(Object.keys(genericAgain.edges).length).toBe(
				Object.keys(generic.edges).length,
			);

			// Node data should be preserved
			for (const nodeId of Object.keys(generic.nodes)) {
				const original = generic.nodes[nodeId];
				const restored = genericAgain.nodes[nodeId];
				expect(restored).toBeDefined();
				expect(restored.type).toBe(original.type);
				expect(restored.data).toEqual(original.data);
			}
		});

		it("validateDomain returns valid result for well-formed domain graphs", () => {
			const adapter = createAdapter();
			const result = adapter.validateDomain(validDomainGraph);

			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it("validateDomain returns errors for malformed domain graphs", () => {
			const adapter = createAdapter();
			const result = adapter.validateDomain(invalidDomainGraph);

			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0].code).toBe("DOMAIN_CONSTRAINT");
		});

		it("getNodeCatalog returns non-empty array with valid entries", () => {
			const adapter = createAdapter();
			const catalog = adapter.getNodeCatalog();

			expect(catalog.length).toBeGreaterThan(0);

			for (const entry of catalog) {
				expect(entry.type).toBeTruthy();
				expect(entry.label).toBeTruthy();
				expect(entry.category).toBeTruthy();
				expect(Array.isArray(entry.defaultPorts)).toBe(true);

				// Validate port structure
				for (const port of entry.defaultPorts) {
					expect(port.id).toBeTruthy();
					expect(["input", "output"]).toContain(port.direction);
					expect(port.dataType).toBeTruthy();
				}
			}
		});

		it("getInspectorConfig returns config for known types, null for unknown", () => {
			const adapter = createAdapter();
			const catalog = adapter.getNodeCatalog();

			// Should return config for catalog types
			for (const entry of catalog) {
				const config = adapter.getInspectorConfig(entry.type);
				expect(config).not.toBeNull();
				expect(config!.nodeType).toBe(entry.type);
				expect(Array.isArray(config!.sections)).toBe(true);

				// Validate section structure
				for (const section of config!.sections) {
					expect(section.label).toBeTruthy();
					expect(Array.isArray(section.fields)).toBe(true);

					// Validate field structure
					for (const field of section.fields) {
						expect(field.key).toBeTruthy();
						expect(field.label).toBeTruthy();
						expect([
							"string",
							"number",
							"boolean",
							"select",
							"color",
						]).toContain(field.type);
					}
				}
			}

			// Should return null for unknown types
			const unknownConfig = adapter.getInspectorConfig("nonexistent-type-xyz");
			expect(unknownConfig).toBeNull();
		});

		it("adapter has required metadata", () => {
			const adapter = createAdapter();
			expect(adapter.id).toBeTruthy();
			expect(adapter.name).toBeTruthy();
		});
	});
}

// Mock adapters for testing the contract

interface MockEffectsDomain {
	kind: "mock-effects";
	effects: Array<{ name: string; intensity: number }>;
}

interface MockNarrativeDomain {
	kind: "mock-narrative";
	scenes: Array<{ title: string }>;
}

function createMockEffectsAdapter(): GraphDomainAdapter<MockEffectsDomain> {
	return {
		id: "mock-effects",
		name: "Mock Effects Adapter",
		toGeneric(domainGraph) {
			const nodes: Record<string, any> = {};
			for (const [i, effect] of domainGraph.effects.entries()) {
				nodes[`effect-${i}`] = {
					id: `effect-${i}`,
					type: "effect",
					position: { x: i * 100, y: 0 },
					ports: [{ id: "out", direction: "output", dataType: "effect" }],
					data: { name: effect.name, intensity: effect.intensity },
				};
			}
			return {
				id: "converted",
				nodes,
				edges: {},
				viewport: { pan: { x: 0, y: 0 }, zoom: 1 },
			};
		},
		fromGeneric(graph) {
			const effects = Object.values(graph.nodes).map((n) => ({
				name: n.data.name as string,
				intensity: n.data.intensity as number,
			}));
			return { kind: "mock-effects", effects };
		},
		validateDomain(domainGraph): DomainValidationResult {
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
		getInspectorConfig(nodeType): InspectorConfig | null {
			if (nodeType === "effect") {
				return {
					nodeType: "effect",
					sections: [
						{
							label: "Properties",
							fields: [
								{ key: "name", label: "Name", type: "string" },
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
		toGeneric(domainGraph) {
			const nodes: Record<string, any> = {};
			for (const [i, scene] of domainGraph.scenes.entries()) {
				nodes[`scene-${i}`] = {
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
			return {
				id: "narrative-doc",
				nodes,
				edges: {},
				viewport: { pan: { x: 0, y: 0 }, zoom: 1 },
			};
		},
		fromGeneric(graph) {
			const scenes = Object.values(graph.nodes).map((n) => ({
				title: n.data.title as string,
			}));
			return { kind: "mock-narrative", scenes };
		},
		validateDomain(domainGraph): DomainValidationResult {
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
		getInspectorConfig(nodeType): InspectorConfig | null {
			if (nodeType === "scene") {
				return {
					nodeType: "scene",
					sections: [
						{
							label: "Scene",
							fields: [{ key: "title", label: "Title", type: "string" }],
						},
					],
				};
			}
			return null;
		},
	};
}

// Run contract tests against mock adapters

testAdapterContract(
	"MockEffectsAdapter",
	createMockEffectsAdapter,
	{
		kind: "mock-effects",
		effects: [
			{ name: "glow", intensity: 0.8 },
			{ name: "blur", intensity: 0.3 },
		],
	},
	{
		kind: "mock-effects",
		effects: [{ name: "invalid", intensity: 1.5 }],
	},
);

testAdapterContract(
	"MockNarrativeAdapter",
	createMockNarrativeAdapter,
	{
		kind: "mock-narrative",
		scenes: [{ title: "Opening" }, { title: "Climax" }],
	},
	{
		kind: "mock-narrative",
		scenes: [],
	},
);
