import { describe, expect, it } from "vitest";
import { compileGraph } from "../compiler";
import { getShaderGlslStrict } from "../shaderLibrary";
import {
	needsScreenTextureRewrite,
	rewriteScreenShaderForSubViewport,
} from "../shaderRewrite";
import type { EffectGraphSpec, EffectNode } from "../types";

// ---------------------------------------------------------------------------
// Test helpers — match conventions from validator.test.ts / resources.test.ts
// ---------------------------------------------------------------------------

function makeNode(overrides: Partial<EffectNode> & { id: string }): EffectNode {
	return {
		type: "blur",
		family: "filter",
		inputSlots: [{ name: "input", dataType: "texture", connectedTo: null }],
		params: {},
		outputTarget: {
			bufferId: `${overrides.id}-out`,
			format: "rgba8",
			resolution: "full",
		},
		flags: { stateful: false, fusible: "conditional" },
		...overrides,
	};
}

function makeGenerator(id: string): EffectNode {
	return makeNode({
		id,
		type: "noise",
		family: "generator",
		inputSlots: [],
	});
}

function makeStatefulNode(id: string): EffectNode {
	return makeNode({
		id,
		flags: { stateful: true, fusible: "never" },
	});
}

function makeGraph(overrides: Partial<EffectGraphSpec> = {}): EffectGraphSpec {
	return {
		id: "test-graph",
		version: "1.0.0",
		engineApiVersion: "1.0.0",
		scope: "screen",
		nodes: [makeGenerator("gen"), makeNode({ id: "filter1" })],
		connections: [
			{
				from: { nodeId: "gen", output: "gen-out" },
				to: { nodeId: "filter1", input: "input" },
			},
		],
		feedbackEdges: [],
		lifecycle: { autoStart: true, stopMode: "clear" },
		...overrides,
	};
}

describe("compileGraph", () => {
	describe("happy paths", () => {
		it("compiles a simple 2-node graph (generator -> filter)", () => {
			const result = compileGraph(makeGraph());

			expect(result.success).toBe(true);
			expect(result.errors).toHaveLength(0);
			expect(result.plan).toBeDefined();
			expect(result.plan!.passes).toHaveLength(2);
			expect(result.plan!.passes[0].id).toBe("gen");
			expect(result.plan!.passes[1].id).toBe("filter1");
		});

		it("compiles a 3-node chain (A->B->C) in topological order", () => {
			const graph = makeGraph({
				nodes: [
					makeGenerator("A"),
					makeNode({ id: "B" }),
					makeNode({ id: "C" }),
				],
				connections: [
					{
						from: { nodeId: "A", output: "A-out" },
						to: { nodeId: "B", input: "input" },
					},
					{
						from: { nodeId: "B", output: "B-out" },
						to: { nodeId: "C", input: "input" },
					},
				],
			});

			const result = compileGraph(graph);

			expect(result.success).toBe(true);
			const passIds = result.plan!.passes.map((p) => p.id);
			expect(passIds).toEqual(["A", "B", "C"]);
		});

		it("populates compiled pass fields correctly", () => {
			const graph = makeGraph({
				nodes: [
					makeGenerator("gen"),
					makeNode({
						id: "blur1",
						params: { radius: 5, intensity: 0.8 },
					}),
				],
				connections: [
					{
						from: { nodeId: "gen", output: "gen-out" },
						to: { nodeId: "blur1", input: "input" },
					},
				],
			});

			const result = compileGraph(graph);
			expect(result.success).toBe(true);

			const blurPass = result.plan!.passes.find((p) => p.id === "blur1")!;
			expect(blurPass.params).toEqual({
				radius: 5,
				intensity: 0.8,
				inputBindings: { input: "gen:gen-out" },
			});
			expect(blurPass.paramsSchema).toEqual([]);
			expect(blurPass.persistence).toBe("none");
			expect(blurPass.qualityTier).toBe("medium");
			expect(blurPass.constraints).toEqual({});
		});
	});

	describe("deterministic hash", () => {
		it("produces identical hash across 100 compilations", () => {
			const graph = makeGraph();
			const hashes = new Set<string>();

			for (let i = 0; i < 100; i++) {
				const result = compileGraph(graph);
				expect(result.success).toBe(true);
				hashes.add(result.plan!.hash);
			}

			expect(hashes.size).toBe(1);
		});

		it("produces different hashes for different graphs", () => {
			const graph1 = makeGraph({ id: "graph-1" });
			const graph2 = makeGraph({ id: "graph-2" });

			const result1 = compileGraph(graph1);
			const result2 = compileGraph(graph2);

			expect(result1.plan!.hash).not.toBe(result2.plan!.hash);
		});
	});

	describe("stable tie-breaking", () => {
		it("orders independent nodes alphabetically by ID", () => {
			const graph = makeGraph({
				nodes: [
					makeGenerator("zebra"),
					makeGenerator("alpha"),
					makeGenerator("middle"),
				],
				connections: [],
			});

			const result = compileGraph(graph);

			expect(result.success).toBe(true);
			const passIds = result.plan!.passes.map((p) => p.id);
			expect(passIds).toEqual(["alpha", "middle", "zebra"]);
		});

		it("stable tie-break is consistent across repeated compilations", () => {
			const graph = makeGraph({
				nodes: [makeGenerator("c"), makeGenerator("a"), makeGenerator("b")],
				connections: [],
			});

			const orders: string[][] = [];
			for (let i = 0; i < 10; i++) {
				const result = compileGraph(graph);
				orders.push(result.plan!.passes.map((p) => p.id));
			}

			for (const order of orders) {
				expect(order).toEqual(["a", "b", "c"]);
			}
		});
	});

	describe("feedback edges", () => {
		it("compiles graph with feedback edge without cycle error", () => {
			const graph = makeGraph({
				nodes: [makeGenerator("gen"), makeStatefulNode("stateful1")],
				connections: [
					{
						from: { nodeId: "gen", output: "gen-out" },
						to: { nodeId: "stateful1", input: "input" },
					},
				],
				feedbackEdges: [
					{
						from: { nodeId: "stateful1", output: "stateful1-out" },
						to: { nodeId: "stateful1", input: "feedback" },
						policy: {
							initMode: "clear",
							swapPolicy: "pingPong",
							stopBehavior: "freeze",
							bufferFormat: "rgba8",
						},
					},
				],
			});

			const result = compileGraph(graph);

			expect(result.success).toBe(true);
			expect(result.plan!.passes).toHaveLength(2);
		});

		it("extracts feedback policies into compiled plan", () => {
			const policy = {
				initMode: "clear" as const,
				swapPolicy: "pingPong" as const,
				stopBehavior: "freeze" as const,
				bufferFormat: "rgba8" as const,
			};
			const graph = makeGraph({
				nodes: [makeGenerator("gen"), makeStatefulNode("stateful1")],
				connections: [
					{
						from: { nodeId: "gen", output: "gen-out" },
						to: { nodeId: "stateful1", input: "input" },
					},
				],
				feedbackEdges: [
					{
						from: { nodeId: "stateful1", output: "stateful1-out" },
						to: { nodeId: "stateful1", input: "feedback" },
						policy,
					},
				],
			});

			const result = compileGraph(graph);

			expect(result.success).toBe(true);
			const fbKeys = Object.keys(result.plan!.feedbackPolicies);
			expect(fbKeys).toHaveLength(1);
			expect(Object.values(result.plan!.feedbackPolicies)[0]).toEqual(policy);
		});

		it("sets persistence to pingPong for stateful nodes", () => {
			const graph = makeGraph({
				nodes: [makeGenerator("gen"), makeStatefulNode("stateful1")],
				connections: [
					{
						from: { nodeId: "gen", output: "gen-out" },
						to: { nodeId: "stateful1", input: "input" },
					},
				],
				feedbackEdges: [
					{
						from: { nodeId: "stateful1", output: "stateful1-out" },
						to: { nodeId: "stateful1", input: "feedback" },
						policy: {
							initMode: "clear",
							swapPolicy: "pingPong",
							stopBehavior: "freeze",
							bufferFormat: "rgba8",
						},
					},
				],
			});

			const result = compileGraph(graph);
			const statefulPass = result.plan!.passes.find(
				(p) => p.id === "stateful1",
			)!;
			expect(statefulPass.persistence).toBe("pingPong");
		});
	});

	describe("inputBindings", () => {
		it("generates inputBindings mapping slot names to resource IDs for connections", () => {
			const graph = makeGraph({
				nodes: [makeGenerator("gen"), makeNode({ id: "blur1" })],
				connections: [
					{
						from: { nodeId: "gen", output: "gen-out" },
						to: { nodeId: "blur1", input: "input" },
					},
				],
			});

			const result = compileGraph(graph);
			expect(result.success).toBe(true);

			const blurPass = result.plan!.passes.find((p) => p.id === "blur1")!;
			expect(blurPass.params.inputBindings).toBeDefined();
			const bindings = blurPass.params.inputBindings as Record<string, string>;
			expect(bindings["input"]).toBe("gen:gen-out");
		});

		it("generates inputBindings for feedback edges with correct slot name", () => {
			const graph = makeGraph({
				nodes: [
					makeNode({
						id: "fx",
						inputSlots: [
							{
								name: "current_buffer",
								dataType: "texture",
								connectedTo: null,
							},
						],
						outputTarget: {
							bufferId: "canvas",
							format: "rgba8",
							resolution: "full",
						},
						flags: { stateful: true, fusible: "never" },
					}),
				],
				connections: [],
				feedbackEdges: [
					{
						from: { nodeId: "fx", output: "canvas" },
						to: { nodeId: "fx", input: "current_buffer" },
						policy: {
							initMode: "clear",
							swapPolicy: "pingPong",
							stopBehavior: "freeze",
							bufferFormat: "rgba8",
						},
					},
				],
			});

			const result = compileGraph(graph);
			expect(result.success).toBe(true);

			const fxPass = result.plan!.passes.find((p) => p.id === "fx")!;
			const bindings = fxPass.params.inputBindings as Record<string, string>;
			expect(bindings["current_buffer"]).toBe("__feedback:fx->fx");
		});

		it("generates inputBindings for explicit connection inputs", () => {
			const graph = makeGraph({
				scope: "entity",
				nodes: [
					makeGenerator("gen"),
					makeNode({
						id: "fx",
						inputSlots: [
							{ name: "custom_input", dataType: "texture", connectedTo: null },
						],
						flags: { stateful: false, fusible: "conditional" },
					}),
				],
				connections: [
					{
						from: { nodeId: "gen", output: "gen-out" },
						to: { nodeId: "fx", input: "custom_input" },
					},
				],
				feedbackEdges: [],
			});

			const result = compileGraph(graph);
			expect(result.success).toBe(true);

			const fxPass = result.plan!.passes.find((p) => p.id === "fx")!;
			const bindings = fxPass.params.inputBindings as Record<string, string>;
			expect(bindings["custom_input"]).toBe("gen:gen-out");
		});

		it("generates empty inputBindings for generator nodes with no inputs", () => {
			const graph = makeGraph({
				nodes: [makeGenerator("gen")],
				connections: [],
			});

			const result = compileGraph(graph);
			expect(result.success).toBe(true);

			const genPass = result.plan!.passes.find((p) => p.id === "gen")!;
			const bindings = genPass.params.inputBindings as Record<string, string>;
			expect(bindings).toEqual({});
		});

		it("paint-like graph: feedback binding is correct", () => {
			const graph = makeGraph({
				scope: "entity",
				nodes: [
					makeNode({
						id: "fx",
						type: "custom",
						inputSlots: [
							{
								name: "current_buffer",
								dataType: "texture",
								connectedTo: null,
							},
						],
						outputTarget: {
							bufferId: "canvas",
							format: "rgba8",
							resolution: "full",
						},
						flags: { stateful: true, fusible: "never" },
					}),
				],
				connections: [],
				feedbackEdges: [
					{
						from: { nodeId: "fx", output: "canvas" },
						to: { nodeId: "fx", input: "current_buffer" },
						policy: {
							initMode: "seedFromInput",
							swapPolicy: "pingPong",
							stopBehavior: "freeze",
							bufferFormat: "rgba8",
						},
					},
				],
			});

			const result = compileGraph(graph);
			expect(result.success).toBe(true);

			const fxPass = result.plan!.passes.find((p) => p.id === "fx")!;
			const bindings = fxPass.params.inputBindings as Record<string, string>;
			expect(bindings["current_buffer"]).toBe("__feedback:fx->fx");
			expect(fxPass.persistence).toBe("pingPong");
		});
	});

	describe("ordering constraints", () => {
		it("honors after constraint", () => {
			const nodeA = makeGenerator("A");
			const nodeB = makeGenerator("B");
			const nodeC = makeGenerator("C");

			const graph = makeGraph({
				nodes: [nodeC, nodeA, nodeB],
				connections: [],
			});

			const result = compileGraph(graph, {
				orderingConstraints: { C: { after: ["A"] } },
			});

			expect(result.success).toBe(true);
			const passIds = result.plan!.passes.map((p) => p.id);
			const indexA = passIds.indexOf("A");
			const indexC = passIds.indexOf("C");
			expect(indexC).toBeGreaterThan(indexA);
		});

		it("honors before constraint", () => {
			const graph = makeGraph({
				nodes: [makeGenerator("X"), makeGenerator("Y"), makeGenerator("Z")],
				connections: [],
			});

			const result = compileGraph(graph, {
				orderingConstraints: { X: { before: ["Z"] } },
			});

			expect(result.success).toBe(true);
			const passIds = result.plan!.passes.map((p) => p.id);
			const indexX = passIds.indexOf("X");
			const indexZ = passIds.indexOf("Z");
			expect(indexX).toBeLessThan(indexZ);
		});
	});

	describe("E_ORDER_CONFLICT", () => {
		it("fails on contradictory before/after constraints", () => {
			const graph = makeGraph({
				nodes: [makeGenerator("A"), makeGenerator("B")],
				connections: [],
			});

			const result = compileGraph(graph, {
				orderingConstraints: {
					A: { before: ["B"] },
					B: { before: ["A"] },
				},
			});

			expect(result.success).toBe(false);
			expect(result.errors.some((e) => e.code === "E_ORDER_CONFLICT")).toBe(
				true,
			);
		});
	});

	describe("validation failure passthrough", () => {
		it("returns validation errors for cyclic graph", () => {
			const graph = makeGraph({
				nodes: [makeNode({ id: "A" }), makeNode({ id: "B" })],
				connections: [
					{
						from: { nodeId: "A", output: "A-out" },
						to: { nodeId: "B", input: "input" },
					},
					{
						from: { nodeId: "B", output: "B-out" },
						to: { nodeId: "A", input: "input" },
					},
				],
			});

			const result = compileGraph(graph);

			expect(result.success).toBe(false);
			expect(result.errors.some((e) => e.code === "E_GRAPH_CYCLE")).toBe(true);
		});

		it("returns validation errors for empty graph", () => {
			const graph = makeGraph({ nodes: [], connections: [] });

			const result = compileGraph(graph);

			expect(result.success).toBe(false);
			expect(result.errors.some((e) => e.code === "E_EMPTY_GRAPH")).toBe(true);
		});
	});

	describe("resource resolution failure passthrough", () => {
		it("returns resource errors for unresolved connections", () => {
			const nodeA = makeNode({
				id: "A",
				family: "generator",
				inputSlots: [],
			});
			const nodeB = makeNode({
				id: "B",
				inputSlots: [
					{
						name: "input",
						dataType: "texture",
						connectedTo: { nodeId: "A", output: "nonexistent-output" },
					},
				],
			});

			const graph = makeGraph({
				nodes: [nodeA, nodeB],
				connections: [
					{
						from: { nodeId: "A", output: "nonexistent-output" },
						to: { nodeId: "B", input: "input" },
					},
				],
			});

			const result = compileGraph(graph);

			expect(result.success).toBe(false);
			expect(
				result.errors.some((e) => e.code === "E_RESOURCE_UNRESOLVED"),
			).toBe(true);
		});
	});

	describe("resource map", () => {
		it("contains all resources from the graph", () => {
			const graph = makeGraph();
			const result = compileGraph(graph);

			expect(result.success).toBe(true);
			const resourceMap = result.plan!.resourceMap;
			const resourceIds = Object.keys(resourceMap);
			expect(resourceIds.length).toBeGreaterThan(0);

			for (const ref of Object.values(resourceMap)) {
				expect(ref.id).toBeDefined();
				expect(ref.type).toBeDefined();
				expect(ref.format).toBeDefined();
				expect(ref.resolution).toBeDefined();
			}
		});

		it("includes implicit screen input resource", () => {
			const graph = makeGraph();
			const result = compileGraph(graph);

			expect(result.success).toBe(true);
			const resourceIds = Object.keys(result.plan!.resourceMap);
			expect(
				resourceIds.some((id) => id.includes("screen") || id.includes("__")),
			).toBe(true);
		});
	});

	describe("inline GLSL generation", () => {
		it("generates inline GLSL for builtin effects", () => {
			const graph = makeGraph({
				nodes: [makeGenerator("gen"), makeNode({ id: "blur", type: "blur" })],
				connections: [
					{
						from: { nodeId: "gen", output: "gen-out" },
						to: { nodeId: "blur", input: "input" },
					},
				],
			});

			const result = compileGraph(graph);
			expect(result.success).toBe(true);

			// Check that blur pass has inline GLSL
			const blurPass = result.plan!.passes.find((p) => p.id === "blur")!;
			expect(blurPass.shaderSource.glsl).toBeDefined();
			expect(blurPass.shaderSource.glsl).toContain("shader_type");
			expect(blurPass.shaderSource.glsl).not.toContain(".gdshader");

			// Verify no builtin references
			expect(blurPass.shaderSource).not.toHaveProperty("type");
			expect(blurPass.shaderSource).not.toHaveProperty("effectType");
		});
	});

	describe("metadata", () => {
		it("populates graphId, graphVersion, engineApiVersion", () => {
			const graph = makeGraph({
				id: "my-graph",
				version: "2.0.0",
				engineApiVersion: "3.0.0",
			});

			const result = compileGraph(graph);

			expect(result.success).toBe(true);
			expect(result.plan!.graphId).toBe("my-graph");
			expect(result.plan!.graphVersion).toBe("2.0.0");
			expect(result.plan!.engineApiVersion).toBe("3.0.0");
		});

		it("sets compiledAt as ISO timestamp", () => {
			const result = compileGraph(makeGraph());

			expect(result.success).toBe(true);
			const compiledAt = result.plan!.compiledAt;
			expect(compiledAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
			expect(() => new Date(compiledAt)).not.toThrow();
		});

		it("sets plan id from graphId", () => {
			const graph = makeGraph({ id: "my-graph" });
			const result = compileGraph(graph);

			expect(result.success).toBe(true);
			expect(result.plan!.id).toContain("my-graph");
		});

		it("sets scope from graph spec", () => {
			const graph = makeGraph({ scope: "entity" });
			const result = compileGraph(graph);

			expect(result.success).toBe(true);
			expect(result.plan!.scope).toBe("entity");
		});
	});
});

describe("external inputs", () => {
	it("generates inputBindings for external inputs", () => {
		const node: EffectNode = {
			id: "blur",
			type: "filter.blur",
			family: "filter",
			inputSlots: [
				{ name: "pixelBuffer", dataType: "texture", connectedTo: null },
			],
			params: { radius: 5 },
			outputTarget: { bufferId: "output", format: "rgba8", resolution: "full" },
			flags: { stateful: false, fusible: "always" },
		};

		const spec: EffectGraphSpec = {
			id: "test",
			version: "1.0.0",
			engineApiVersion: "1.0.0",
			scope: "entity",
			nodes: [node],
			connections: [],
			feedbackEdges: [],
			externalInputs: [
				{ name: "pixelBuffer", dataType: "texture", source: "entity" },
			],
			lifecycle: { autoStart: true, stopMode: "freeze" },
		};

		const result = compileGraph(spec);
		expect(result.success).toBe(true);
		expect(result.plan).toBeDefined();

		const pass = result.plan!.passes[0];
		expect(pass.params.inputBindings).toBeDefined();
		expect(
			(pass.params.inputBindings as Record<string, string>).pixelBuffer,
		).toBe("__external:pixelBuffer");
	});
});

describe("named buffers", () => {
	it("includes named buffer resources in resourceMap", () => {
		const nodeA = makeNode({
			id: "blur",
			inputSlots: [{ name: "input", dataType: "texture", connectedTo: null }],
			outputTarget: {
				bufferId: "buf-blur",
				format: "rgba8",
				resolution: "full",
			},
			outputs: [{ name: "output", bufferId: "blurred" }],
		});
		const nodeB = makeNode({
			id: "vignette",
			inputSlots: [{ name: "input", dataType: "texture", connectedTo: null }],
		});

		const graph = makeGraph({
			nodes: [nodeA, nodeB],
			connections: [
				{
					from: { nodeId: "blur", output: "blurred" },
					to: { nodeId: "vignette", input: "input" },
				},
			],
		});

		const result = compileGraph(graph);

		expect(result.success).toBe(true);
		expect(result.plan!.resourceMap["__named:blurred"]).toBeDefined();
		expect(result.plan!.resourceMap["__named:blurred"].type).toBe("texture");
	});

	it("generates inputBindings for named buffer connections", () => {
		const nodeA = makeNode({
			id: "blur",
			outputTarget: {
				bufferId: "buf-blur",
				format: "rgba8",
				resolution: "full",
			},
			outputs: [{ name: "output", bufferId: "blurred" }],
		});
		const nodeB = makeNode({
			id: "vignette",
			inputSlots: [{ name: "input", dataType: "texture", connectedTo: null }],
		});

		const graph = makeGraph({
			nodes: [nodeA, nodeB],
			connections: [
				{
					from: { nodeId: "blur", output: "blurred" },
					to: { nodeId: "vignette", input: "input" },
				},
			],
		});

		const result = compileGraph(graph);

		expect(result.success).toBe(true);
		const vignettePass = result.plan!.passes.find((p) => p.id === "vignette")!;
		const bindings = vignettePass.params.inputBindings as Record<
			string,
			string
		>;
		expect(bindings["input"]).toBe("__named:blurred");
	});

	it("compiles multi-pass chain with named buffers in correct order", () => {
		const nodeA = makeNode({
			id: "blur",
			outputTarget: {
				bufferId: "buf-blur",
				format: "rgba8",
				resolution: "full",
			},
			outputs: [{ name: "output", bufferId: "temp" }],
		});
		const nodeB = makeNode({
			id: "vignette",
			inputSlots: [{ name: "input", dataType: "texture", connectedTo: null }],
			outputTarget: {
				bufferId: "buf-vignette",
				format: "rgba8",
				resolution: "full",
			},
			outputs: [{ name: "output", bufferId: "final" }],
		});
		const nodeC = makeNode({
			id: "sharpen",
			inputSlots: [{ name: "input", dataType: "texture", connectedTo: null }],
		});

		const graph = makeGraph({
			nodes: [nodeA, nodeB, nodeC],
			connections: [
				{
					from: { nodeId: "blur", output: "temp" },
					to: { nodeId: "vignette", input: "input" },
				},
				{
					from: { nodeId: "vignette", output: "final" },
					to: { nodeId: "sharpen", input: "input" },
				},
			],
		});

		const result = compileGraph(graph);

		expect(result.success).toBe(true);
		const passIds = result.plan!.passes.map((p) => p.id);
		expect(passIds).toEqual(["blur", "vignette", "sharpen"]);
	});

	it("includes provides entries for named buffer outputs", () => {
		const nodeA = makeNode({
			id: "blur",
			inputSlots: [{ name: "input", dataType: "texture", connectedTo: null }],
			outputTarget: {
				bufferId: "buf-blur",
				format: "rgba8",
				resolution: "full",
			},
			outputs: [{ name: "output", bufferId: "blurred" }],
		});
		const nodeB = makeNode({
			id: "vignette",
			inputSlots: [{ name: "input", dataType: "texture", connectedTo: null }],
		});

		const graph = makeGraph({
			nodes: [nodeA, nodeB],
			connections: [
				{
					from: { nodeId: "blur", output: "blurred" },
					to: { nodeId: "vignette", input: "input" },
				},
			],
		});

		const result = compileGraph(graph);

		expect(result.success).toBe(true);
		const blurPass = result.plan!.passes.find((p) => p.id === "blur")!;
		expect(blurPass.provides.some((r) => r.id === "__named:blurred")).toBe(
			true,
		);
	});

	it("includes requires entries for named buffer inputs", () => {
		const nodeA = makeNode({
			id: "blur",
			outputTarget: {
				bufferId: "buf-blur",
				format: "rgba8",
				resolution: "full",
			},
			outputs: [{ name: "output", bufferId: "blurred" }],
		});
		const nodeB = makeNode({
			id: "vignette",
			inputSlots: [{ name: "input", dataType: "texture", connectedTo: null }],
		});

		const graph = makeGraph({
			nodes: [nodeA, nodeB],
			connections: [
				{
					from: { nodeId: "blur", output: "blurred" },
					to: { nodeId: "vignette", input: "input" },
				},
			],
		});

		const result = compileGraph(graph);

		expect(result.success).toBe(true);
		const vignettePass = result.plan!.passes.find((p) => p.id === "vignette")!;
		expect(vignettePass.requires.some((r) => r.id === "__named:blurred")).toBe(
			true,
		);
	});
});

describe("screen-scope shader rewrite contract", () => {
	function extractSamplerUniforms(glsl: string): string[] {
		const matches = glsl.matchAll(/uniform\s+sampler2D\s+(\w+)/g);
		return [...matches].map((m) => m[1]);
	}

	it("screen-scope underwater shader is pre-rewritten with 'input' uniform matching inputBindings", () => {
		const graph: EffectGraphSpec = {
			id: "test",
			version: "1.0.0",
			engineApiVersion: "1.0.0",
			scope: "screen",
			nodes: [
				{
					id: "underwater_node",
					type: "underwater",
					family: "filter",
					inputSlots: [
						{ name: "input", dataType: "texture", connectedTo: null },
					],
					params: {
						intensity: 0.5,
						wave_speed: 1.0,
						wave_frequency: 10.0,
						wave_amplitude: 0.01,
					},
					outputTarget: {
						bufferId: "wave_buf",
						format: "rgba8",
						resolution: "full",
					},
					flags: { stateful: false, fusible: "conditional" },
				},
			],
			connections: [],
			feedbackEdges: [],
			lifecycle: { autoStart: true, stopMode: "clear" },
		};

		const result = compileGraph(graph);
		expect(result.success).toBe(true);

		const pass = result.plan!.passes[0];
		const bindings = pass.params.inputBindings as Record<string, string>;
		expect(bindings).toHaveProperty("input");

		const glsl = pass.shaderSource.glsl;
		expect(needsScreenTextureRewrite(glsl)).toBe(false);

		const uniforms = extractSamplerUniforms(glsl);
		expect(uniforms).toContain("input");
		expect(uniforms).not.toContain("SCREEN_TEXTURE");

		for (const uniformName of Object.keys(bindings)) {
			expect(uniforms).toContain(uniformName);
		}
	});

	it("rewritten shader replaces SCREEN_UV with UV", () => {
		const glsl = getShaderGlslStrict("scanlines");
		expect(glsl).toContain("SCREEN_UV");

		const rewritten = rewriteScreenShaderForSubViewport(glsl);
		expect(rewritten).not.toContain("SCREEN_UV");
		expect(rewritten).toContain("UV");
	});

	it("rewritten shader replaces SCREEN_PIXEL_SIZE with screen_pixel_size", () => {
		const glsl = getShaderGlslStrict("vignette");
		expect(glsl).toContain("SCREEN_PIXEL_SIZE");

		const rewritten = rewriteScreenShaderForSubViewport(glsl);
		expect(rewritten).not.toContain("SCREEN_PIXEL_SIZE");
		expect(rewritten).toContain("screen_pixel_size");
		expect(rewritten).toContain("uniform vec2 screen_pixel_size");
	});

	it("multi-node screen graph: all passes have inputBindings keys matching rewritten uniforms", () => {
		const graph: EffectGraphSpec = {
			id: "multi-pass-screen",
			version: "1.0.0",
			engineApiVersion: "1.0.0",
			scope: "screen",
			nodes: [
				{
					id: "wave_node",
					type: "underwater",
					family: "filter",
					inputSlots: [
						{ name: "input", dataType: "texture", connectedTo: null },
					],
					params: {
						intensity: 0.5,
						wave_speed: 1.0,
						wave_frequency: 6.0,
						wave_amplitude: 0.005,
					},
					outputTarget: {
						bufferId: "wave_buf",
						format: "rgba8",
						resolution: "full",
					},
					flags: { stateful: false, fusible: "conditional" },
				},
				{
					id: "scanlines_node",
					type: "scanlines",
					family: "filter",
					inputSlots: [
						{
							name: "input",
							dataType: "texture",
							connectedTo: { nodeId: "wave_node", output: "wave_buf" },
						},
					],
					params: { scanline_count: 200, scanline_opacity: 0.2 },
					outputTarget: {
						bufferId: "scanlines_buf",
						format: "rgba8",
						resolution: "full",
					},
					flags: { stateful: false, fusible: "conditional" },
				},
			],
			connections: [
				{
					from: { nodeId: "wave_node", output: "wave_buf" },
					to: { nodeId: "scanlines_node", input: "input" },
				},
			],
			feedbackEdges: [],
			lifecycle: { autoStart: true, stopMode: "clear" },
		};

		const result = compileGraph(graph);
		expect(result.success).toBe(true);
		expect(result.plan!.passes).toHaveLength(2);

		for (const pass of result.plan!.passes) {
			const bindings = pass.params.inputBindings as Record<string, string>;
			const glsl = pass.shaderSource.glsl;

			expect(glsl).not.toContain("SCREEN_TEXTURE");
			expect(glsl).not.toContain("hint_screen_texture");

			const uniforms = extractSamplerUniforms(glsl);
			for (const uniformName of Object.keys(bindings)) {
				expect(uniforms).toContain(uniformName);
			}
		}
	});

	it("3-node screen chain: uniform contract holds for all passes", () => {
		const graph: EffectGraphSpec = {
			id: "three-pass-screen",
			version: "1.0.0",
			engineApiVersion: "1.0.0",
			scope: "screen",
			nodes: [
				{
					id: "pass_a",
					type: "underwater",
					family: "filter",
					inputSlots: [
						{ name: "input", dataType: "texture", connectedTo: null },
					],
					params: {},
					outputTarget: {
						bufferId: "buf_a",
						format: "rgba8",
						resolution: "full",
					},
					flags: { stateful: false, fusible: "conditional" },
				},
				{
					id: "pass_b",
					type: "scanlines",
					family: "filter",
					inputSlots: [
						{
							name: "input",
							dataType: "texture",
							connectedTo: { nodeId: "pass_a", output: "buf_a" },
						},
					],
					params: {},
					outputTarget: {
						bufferId: "buf_b",
						format: "rgba8",
						resolution: "full",
					},
					flags: { stateful: false, fusible: "conditional" },
				},
				{
					id: "pass_c",
					type: "vignette",
					family: "filter",
					inputSlots: [
						{
							name: "input",
							dataType: "texture",
							connectedTo: { nodeId: "pass_b", output: "buf_b" },
						},
					],
					params: {},
					outputTarget: {
						bufferId: "buf_c",
						format: "rgba8",
						resolution: "full",
					},
					flags: { stateful: false, fusible: "conditional" },
				},
			],
			connections: [
				{
					from: { nodeId: "pass_a", output: "buf_a" },
					to: { nodeId: "pass_b", input: "input" },
				},
				{
					from: { nodeId: "pass_b", output: "buf_b" },
					to: { nodeId: "pass_c", input: "input" },
				},
			],
			feedbackEdges: [],
			lifecycle: { autoStart: true, stopMode: "clear" },
		};

		const result = compileGraph(graph);
		expect(result.success).toBe(true);
		expect(result.plan!.passes).toHaveLength(3);

		for (const pass of result.plan!.passes) {
			const bindings = pass.params.inputBindings as Record<string, string>;
			const glsl = pass.shaderSource.glsl;

			expect(glsl).not.toContain("SCREEN_TEXTURE");
			expect(glsl).not.toContain("hint_screen_texture");

			const uniforms = extractSamplerUniforms(glsl);
			for (const key of Object.keys(bindings)) {
				expect(uniforms).toContain(key);
			}
		}
	});

	it("sprite-scope shaders are NOT rewritten (no hint_screen_texture)", () => {
		const glsl = getShaderGlslStrict("glow");
		expect(needsScreenTextureRewrite(glsl)).toBe(false);
	});

	it("rewrite is idempotent", () => {
		const glsl = getShaderGlslStrict("underwater");
		const once = rewriteScreenShaderForSubViewport(glsl);
		const twice = rewriteScreenShaderForSubViewport(once);
		expect(twice).toBe(once);
	});
});

describe("screen-scope compiler pre-rewrites GLSL (single source of truth)", () => {
	it("screen-scope plan contains pre-rewritten GLSL with no SCREEN_TEXTURE", () => {
		const graph: EffectGraphSpec = {
			id: "screen-prerewrite",
			version: "1.0.0",
			engineApiVersion: "2.0.0",
			scope: "screen",
			nodes: [
				{
					id: "wave",
					type: "underwater",
					family: "filter",
					inputSlots: [
						{ name: "input", dataType: "texture", connectedTo: null },
					],
					params: {},
					outputTarget: {
						bufferId: "wave_buf",
						format: "rgba8",
						resolution: "full",
					},
					flags: { stateful: false, fusible: "conditional" },
				},
			],
			connections: [],
			feedbackEdges: [],
			lifecycle: { autoStart: true, stopMode: "clear" },
		};

		const result = compileGraph(graph);
		expect(result.success).toBe(true);

		const pass = result.plan!.passes[0];
		expect(pass.shaderSource.glsl).not.toContain("SCREEN_TEXTURE");
		expect(pass.shaderSource.glsl).not.toContain("hint_screen_texture");
		expect(pass.shaderSource.glsl).not.toContain("SCREEN_UV");
		expect(pass.shaderSource.glsl).toContain("uniform sampler2D input");
	});

	it("entity-scope plan keeps original GLSL unchanged", () => {
		const graph: EffectGraphSpec = {
			id: "entity-no-rewrite",
			version: "1.0.0",
			engineApiVersion: "2.0.0",
			scope: "entity",
			nodes: [
				{
					id: "glow_node",
					type: "glow",
					family: "filter",
					inputSlots: [
						{ name: "input", dataType: "texture", connectedTo: null },
					],
					params: {},
					outputTarget: {
						bufferId: "glow_buf",
						format: "rgba8",
						resolution: "full",
					},
					flags: { stateful: false, fusible: "conditional" },
				},
			],
			connections: [],
			feedbackEdges: [],
			lifecycle: { autoStart: true, stopMode: "clear" },
		};

		const result = compileGraph(graph);
		expect(result.success).toBe(true);

		const pass = result.plan!.passes[0];
		const originalGlsl = getShaderGlslStrict("glow");
		expect(pass.shaderSource.glsl).toBe(originalGlsl);
	});

	it("ballSort 2-pass screen graph: both passes have pre-rewritten GLSL and correct inputBindings", () => {
		const graph: EffectGraphSpec = {
			id: "ballSort_wavy_scanlines",
			version: "1.0.0",
			engineApiVersion: "2.0.0",
			scope: "screen",
			nodes: [
				{
					id: "wave_node",
					type: "underwater",
					family: "filter",
					inputSlots: [
						{ name: "input", dataType: "texture", connectedTo: null },
					],
					params: { intensity: 0.0, wave_speed: 1.0 },
					outputTarget: {
						bufferId: "wave_buf",
						format: "rgba8",
						resolution: "full",
					},
					flags: { stateful: false, fusible: "conditional" },
				},
				{
					id: "scanlines_node",
					type: "scanlines",
					family: "filter",
					inputSlots: [
						{
							name: "input",
							dataType: "texture",
							connectedTo: {
								nodeId: "wave_node",
								output: "wave_buf",
							},
						},
					],
					params: { scanline_count: 200 },
					outputTarget: {
						bufferId: "scanlines_buf",
						format: "rgba8",
						resolution: "full",
					},
					flags: { stateful: false, fusible: "conditional" },
				},
			],
			connections: [
				{
					from: { nodeId: "wave_node", output: "wave_buf" },
					to: { nodeId: "scanlines_node", input: "input" },
				},
			],
			feedbackEdges: [],
			lifecycle: { autoStart: true, stopMode: "clear" },
		};

		const result = compileGraph(graph);
		expect(result.success).toBe(true);
		expect(result.plan!.passes).toHaveLength(2);

		for (const pass of result.plan!.passes) {
			expect(pass.shaderSource.glsl).not.toContain("SCREEN_TEXTURE");
			expect(pass.shaderSource.glsl).not.toContain("hint_screen_texture");
			expect(pass.shaderSource.glsl).toContain("uniform sampler2D input");
		}

		const wavePass = result.plan!.passes.find((p) => p.id === "wave_node")!;
		const scanPass = result.plan!.passes.find(
			(p) => p.id === "scanlines_node",
		)!;

		const waveBindings = wavePass.params.inputBindings as Record<
			string,
			string
		>;
		expect(waveBindings.input).toBe("__screenColor");

		const scanBindings = scanPass.params.inputBindings as Record<
			string,
			string
		>;
		expect(scanBindings.input).toBe("wave_node:wave_buf");
	});
});
