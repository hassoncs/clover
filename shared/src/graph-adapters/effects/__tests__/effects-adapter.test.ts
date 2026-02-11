import { describe, expect, it } from "vitest";
import type { EffectGraphSpec } from "../../../effects/types";
import { testAdapterContract } from "../../__tests__/adapter-contract.test";
import { EffectsGraphAdapter } from "../effects-adapter";

const validSpec: EffectGraphSpec = {
	id: "test-graph",
	version: "1.0.0",
	engineApiVersion: "1.0.0",
	scope: "screen",
	nodes: [
		{
			id: "noise-1",
			type: "noise",
			family: "generator",
			inputSlots: [],
			params: { scale: 2.0, speed: 0.5 },
			outputTarget: {
				bufferId: "noise-1-out",
				format: "rgba8",
				resolution: "full",
			},
			outputs: [{ name: "output", bufferId: "noise-1-out" }],
			flags: { stateful: false, fusible: "always" },
		},
		{
			id: "blur-1",
			type: "blur",
			family: "filter",
			inputSlots: [
				{
					name: "input",
					dataType: "texture",
					connectedTo: { nodeId: "noise-1", output: "output" },
				},
			],
			params: { radius: 4.0 },
			outputTarget: {
				bufferId: "blur-1-out",
				format: "rgba8",
				resolution: "full",
			},
			outputs: [{ name: "output", bufferId: "blur-1-out" }],
			flags: { stateful: false, fusible: "conditional" },
		},
		{
			id: "blend-1",
			type: "blend",
			family: "combiner",
			inputSlots: [
				{
					name: "inputA",
					dataType: "texture",
					connectedTo: { nodeId: "noise-1", output: "output" },
				},
				{
					name: "inputB",
					dataType: "texture",
					connectedTo: { nodeId: "blur-1", output: "output" },
				},
			],
			params: { mode: "additive", opacity: 0.7 },
			outputTarget: {
				bufferId: "blend-1-out",
				format: "rgba8",
				resolution: "full",
			},
			outputs: [{ name: "output", bufferId: "blend-1-out" }],
			flags: { stateful: false, fusible: "never" },
		},
	],
	connections: [
		{
			from: { nodeId: "noise-1", output: "output" },
			to: { nodeId: "blur-1", input: "input" },
		},
		{
			from: { nodeId: "noise-1", output: "output" },
			to: { nodeId: "blend-1", input: "inputA" },
		},
		{
			from: { nodeId: "blur-1", output: "output" },
			to: { nodeId: "blend-1", input: "inputB" },
		},
	],
	feedbackEdges: [],
	lifecycle: { autoStart: true, stopMode: "freeze" },
};

const invalidSpec: EffectGraphSpec = {
	id: "invalid-graph",
	version: "1.0.0",
	engineApiVersion: "1.0.0",
	scope: "screen",
	nodes: [
		{
			id: "node-a",
			type: "blur",
			family: "filter",
			inputSlots: [
				{
					name: "input",
					dataType: "texture",
					connectedTo: { nodeId: "node-b", output: "output" },
				},
			],
			params: {},
			outputTarget: {
				bufferId: "a-out",
				format: "rgba8",
				resolution: "full",
			},
			outputs: [{ name: "output", bufferId: "a-out" }],
			flags: { stateful: false, fusible: "always" },
		},
		{
			id: "node-b",
			type: "blur",
			family: "filter",
			inputSlots: [
				{
					name: "input",
					dataType: "texture",
					connectedTo: { nodeId: "node-a", output: "output" },
				},
			],
			params: {},
			outputTarget: {
				bufferId: "b-out",
				format: "rgba8",
				resolution: "full",
			},
			outputs: [{ name: "output", bufferId: "b-out" }],
			flags: { stateful: false, fusible: "always" },
		},
	],
	connections: [
		{
			from: { nodeId: "node-a", output: "output" },
			to: { nodeId: "node-b", input: "input" },
		},
		{
			from: { nodeId: "node-b", output: "output" },
			to: { nodeId: "node-a", input: "input" },
		},
	],
	feedbackEdges: [],
	lifecycle: { autoStart: true, stopMode: "freeze" },
};

testAdapterContract(
	"EffectsGraphAdapter",
	() => new EffectsGraphAdapter(),
	validSpec,
	invalidSpec,
);

describe("EffectsGraphAdapter - effects-specific", () => {
	const adapter = new EffectsGraphAdapter();

	describe("toGeneric", () => {
		it("maps each EffectNode to a GraphNode with correct type", () => {
			const doc = adapter.toGeneric(validSpec);

			expect(Object.keys(doc.nodes)).toHaveLength(3);
			expect(doc.nodes["noise-1"].type).toBe("noise");
			expect(doc.nodes["blur-1"].type).toBe("blur");
			expect(doc.nodes["blend-1"].type).toBe("blend");
		});

		it("maps inputSlots as input ports and outputs as output ports", () => {
			const doc = adapter.toGeneric(validSpec);

			const noiseNode = doc.nodes["noise-1"];
			const inputPorts = noiseNode.ports.filter((p) => p.direction === "input");
			const outputPorts = noiseNode.ports.filter(
				(p) => p.direction === "output",
			);
			expect(inputPorts).toHaveLength(0);
			expect(outputPorts).toHaveLength(1);
			expect(outputPorts[0].id).toBe("output");

			const blendNode = doc.nodes["blend-1"];
			const blendInputs = blendNode.ports.filter(
				(p) => p.direction === "input",
			);
			const blendOutputs = blendNode.ports.filter(
				(p) => p.direction === "output",
			);
			expect(blendInputs).toHaveLength(2);
			expect(blendOutputs).toHaveLength(1);
		});

		it("preserves params, family, and flags in node data", () => {
			const doc = adapter.toGeneric(validSpec);

			const noiseData = doc.nodes["noise-1"].data;
			expect(noiseData.family).toBe("generator");
			expect(noiseData.params).toEqual({ scale: 2.0, speed: 0.5 });
			expect(noiseData.flags).toEqual({
				stateful: false,
				fusible: "always",
			});
		});

		it("preserves outputTarget in node data", () => {
			const doc = adapter.toGeneric(validSpec);

			const noiseData = doc.nodes["noise-1"].data;
			expect(noiseData.outputTarget).toEqual({
				bufferId: "noise-1-out",
				format: "rgba8",
				resolution: "full",
			});
		});

		it("maps connections to edges", () => {
			const doc = adapter.toGeneric(validSpec);

			const edges = Object.values(doc.edges);
			expect(edges).toHaveLength(3);

			const firstEdge = edges.find(
				(e) => e.from.nodeId === "noise-1" && e.to.nodeId === "blur-1",
			);
			expect(firstEdge).toBeDefined();
			expect(firstEdge!.from.portId).toBe("output");
			expect(firstEdge!.to.portId).toBe("input");
		});

		it("preserves document id", () => {
			const doc = adapter.toGeneric(validSpec);
			expect(doc.id).toBe("test-graph");
		});
	});

	describe("fromGeneric", () => {
		it("reconstructs EffectNode array from generic nodes", () => {
			const doc = adapter.toGeneric(validSpec);
			const restored = adapter.fromGeneric(doc);

			expect(restored.nodes).toHaveLength(3);
			const nodeIds = restored.nodes.map((n) => n.id).sort();
			expect(nodeIds).toEqual(["blend-1", "blur-1", "noise-1"]);
		});

		it("reconstructs connections from edges", () => {
			const doc = adapter.toGeneric(validSpec);
			const restored = adapter.fromGeneric(doc);

			expect(restored.connections).toHaveLength(3);
		});

		it("preserves family and flags through round-trip", () => {
			const doc = adapter.toGeneric(validSpec);
			const restored = adapter.fromGeneric(doc);

			const noiseNode = restored.nodes.find((n) => n.id === "noise-1");
			expect(noiseNode!.family).toBe("generator");
			expect(noiseNode!.flags).toEqual({
				stateful: false,
				fusible: "always",
			});
		});

		it("preserves params through round-trip", () => {
			const doc = adapter.toGeneric(validSpec);
			const restored = adapter.fromGeneric(doc);

			const blurNode = restored.nodes.find((n) => n.id === "blur-1");
			expect(blurNode!.params).toEqual({ radius: 4.0 });
		});

		it("preserves outputTarget through round-trip", () => {
			const doc = adapter.toGeneric(validSpec);
			const restored = adapter.fromGeneric(doc);

			const noiseNode = restored.nodes.find((n) => n.id === "noise-1");
			expect(noiseNode!.outputTarget).toEqual({
				bufferId: "noise-1-out",
				format: "rgba8",
				resolution: "full",
			});
		});

		it("reconstructs inputSlots with connectedTo from edges", () => {
			const doc = adapter.toGeneric(validSpec);
			const restored = adapter.fromGeneric(doc);

			const blurNode = restored.nodes.find((n) => n.id === "blur-1");
			expect(blurNode!.inputSlots).toHaveLength(1);
			expect(blurNode!.inputSlots[0].connectedTo).toEqual({
				nodeId: "noise-1",
				output: "output",
			});
		});

		it("preserves spec-level metadata through round-trip", () => {
			const doc = adapter.toGeneric(validSpec);
			const restored = adapter.fromGeneric(doc);

			expect(restored.id).toBe("test-graph");
			expect(restored.version).toBe("1.0.0");
			expect(restored.scope).toBe("screen");
			expect(restored.lifecycle).toEqual({
				autoStart: true,
				stopMode: "freeze",
			});
		});
	});

	describe("validateDomain", () => {
		it("detects cycles in connections", () => {
			const result = adapter.validateDomain(invalidSpec);

			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0].code).toBe("DOMAIN_CONSTRAINT");
			expect(result.errors[0].message).toMatch(/cycle/i);
		});

		it("detects dangling connection references", () => {
			const specWithDangling: EffectGraphSpec = {
				...validSpec,
				id: "dangling-test",
				connections: [
					{
						from: { nodeId: "nonexistent", output: "output" },
						to: { nodeId: "blur-1", input: "input" },
					},
				],
			};

			const result = adapter.validateDomain(specWithDangling);
			expect(result.valid).toBe(false);
			expect(result.errors[0].message).toMatch(/not found/i);
		});

		it("passes valid spec with no cycles", () => {
			const result = adapter.validateDomain(validSpec);
			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});
	});

	describe("getNodeCatalog", () => {
		it("includes entries from all three families", () => {
			const catalog = adapter.getNodeCatalog();

			const categories = new Set(catalog.map((e) => e.category));
			expect(categories.has("generator")).toBe(true);
			expect(categories.has("filter")).toBe(true);
			expect(categories.has("combiner")).toBe(true);
		});

		it("each entry has appropriate default ports", () => {
			const catalog = adapter.getNodeCatalog();

			for (const entry of catalog) {
				const hasOutput = entry.defaultPorts.some(
					(p) => p.direction === "output",
				);
				expect(hasOutput).toBe(true);

				if (entry.category === "filter") {
					const hasInput = entry.defaultPorts.some(
						(p) => p.direction === "input",
					);
					expect(hasInput).toBe(true);
				}
			}
		});
	});

	describe("getInspectorConfig", () => {
		it("returns config for blur with radius field", () => {
			const config = adapter.getInspectorConfig("blur");

			expect(config).not.toBeNull();
			expect(config!.nodeType).toBe("blur");
			const allFields = config!.sections.flatMap((s) => s.fields);
			const radiusField = allFields.find((f) => f.key === "radius");
			expect(radiusField).toBeDefined();
			expect(radiusField!.type).toBe("number");
		});

		it("returns config for glow with intensity field", () => {
			const config = adapter.getInspectorConfig("glow");

			expect(config).not.toBeNull();
			const allFields = config!.sections.flatMap((s) => s.fields);
			const intensityField = allFields.find((f) => f.key === "intensity");
			expect(intensityField).toBeDefined();
		});

		it("returns null for unknown type", () => {
			expect(adapter.getInspectorConfig("nonexistent-xyz")).toBeNull();
		});
	});
});
