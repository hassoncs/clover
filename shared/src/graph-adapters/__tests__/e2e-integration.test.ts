import { describe, expect, it } from "vitest";
import type { EffectGraphSpec } from "../../effects/types";
import {
	createUndoableState,
	executeCommand,
	validateDocument,
} from "../../graph-core";
import type { GraphNode } from "../../graph-core/types";
import type { NarrativeGraph } from "../../narrative/types";
import { validateGeneratedGraph } from "../ai-generation";
import { EffectsGraphAdapter } from "../effects/effects-adapter";
import { NarrativeGraphAdapter } from "../narrative/narrative-adapter";
import { AdapterRegistry } from "../registry";

function makeEffectsGraph(): EffectGraphSpec {
	return {
		id: "e2e-effects",
		version: "1.0.0",
		engineApiVersion: "1.0.0",
		scope: "screen",
		nodes: [
			{
				id: "noise-1",
				type: "noise",
				family: "generator",
				inputSlots: [],
				params: { scale: 10, speed: 1 },
				outputTarget: {
					bufferId: "noise-out",
					format: "rgba8",
					resolution: "full",
				},
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
				params: { radius: 8 },
				outputTarget: {
					bufferId: "blur-out",
					format: "rgba8",
					resolution: "full",
				},
				flags: { stateful: false, fusible: "always" },
			},
		],
		connections: [
			{
				from: { nodeId: "noise-1", output: "output" },
				to: { nodeId: "blur-1", input: "input" },
			},
		],
		feedbackEdges: [],
		lifecycle: { autoStart: true, stopMode: "freeze" },
	};
}

function makeNarrativeGraph(): NarrativeGraph {
	return {
		id: "e2e-narrative",
		title: "E2E Story",
		scenes: [
			{
				id: "start",
				title: "Beginning",
				body: "The story begins...",
				isStart: true,
				choices: [{ id: "choice-1", label: "Continue" }],
			},
			{
				id: "middle",
				title: "Middle",
				body: "The story continues...",
				choices: [{ id: "choice-2", label: "End" }],
			},
			{
				id: "end",
				title: "The End",
				body: "The story ends.",
				isEnding: true,
				choices: [],
			},
		],
		transitions: [
			{
				id: "trans-1",
				fromSceneId: "start",
				choiceId: "choice-1",
				toSceneId: "middle",
			},
			{
				id: "trans-2",
				fromSceneId: "middle",
				choiceId: "choice-2",
				toSceneId: "end",
			},
		],
	};
}

describe("E2E Integration: Full pipeline for both adapters", () => {
	describe("Effects adapter pipeline", () => {
		const adapter = new EffectsGraphAdapter();

		it("domain → toGeneric → executeCommand → validateDocument → validateGeneratedGraph → fromGeneric round-trip", () => {
			const domainGraph = makeEffectsGraph();

			// Step 1: Convert domain to generic
			const generic = adapter.toGeneric(domainGraph);
			expect(Object.keys(generic.nodes)).toHaveLength(2);
			expect(Object.keys(generic.edges)).toHaveLength(1);

			// Step 2: Edit via command system (add a node)
			const state = createUndoableState(generic);
			const newNode: GraphNode = {
				id: "tint-1",
				type: "tint",
				position: { x: 400, y: 0 },
				ports: [
					{ id: "input", direction: "input", dataType: "texture" },
					{ id: "output", direction: "output", dataType: "texture" },
				],
				data: {
					family: "filter",
					params: { color: "#ff0000", intensity: 0.5 },
					flags: { stateful: false, fusible: "always" },
					outputTarget: {
						bufferId: "tint-out",
						format: "rgba8",
						resolution: "full",
					},
					inputSlotMeta: [{ name: "input", dataType: "texture" }],
				},
			};
			const addResult = executeCommand(state, {
				type: "addNode",
				node: newNode,
			});
			expect(addResult.error).toBeUndefined();
			expect(Object.keys(addResult.state.document.nodes)).toHaveLength(3);

			// Step 3: Validate the edited document
			const validation = validateDocument(addResult.state.document);
			expect(validation.valid).toBe(true);
			expect(validation.errors).toEqual([]);

			// Step 4: Validate via AI generation validator on original domain graph
			const aiResult = validateGeneratedGraph(adapter, domainGraph);
			expect(aiResult.success).toBe(true);
			expect(aiResult.document).toBeDefined();

			// Step 5: Round-trip back to domain
			const restored = adapter.fromGeneric(generic);
			expect(restored.id).toBe(domainGraph.id);
			expect(restored.nodes).toHaveLength(domainGraph.nodes.length);
			expect(restored.connections).toHaveLength(domainGraph.connections.length);

			// Step 6: Re-convert to generic and verify structural preservation
			const reConverted = adapter.toGeneric(restored);
			expect(Object.keys(reConverted.nodes)).toHaveLength(
				Object.keys(generic.nodes).length,
			);
			expect(Object.keys(reConverted.edges)).toHaveLength(
				Object.keys(generic.edges).length,
			);
		});
	});

	describe("Narrative adapter pipeline", () => {
		const adapter = new NarrativeGraphAdapter();

		it("domain → toGeneric → executeCommand → validateDocument → validateGeneratedGraph → fromGeneric round-trip", () => {
			const domainGraph = makeNarrativeGraph();

			// Step 1: Convert domain to generic
			const generic = adapter.toGeneric(domainGraph);
			expect(Object.keys(generic.nodes)).toHaveLength(3);
			expect(Object.keys(generic.edges)).toHaveLength(2);

			// Step 2: Edit via command system (add a node)
			const state = createUndoableState(generic);
			const newNode: GraphNode = {
				id: "bonus",
				type: "scene",
				position: { x: 300, y: 300 },
				ports: [
					{ id: "in", direction: "input", dataType: "flow" },
					{ id: "out", direction: "output", dataType: "flow" },
				],
				data: {
					title: "Bonus Scene",
					body: "A hidden scene!",
					choices: [],
					narrativeTitle: "E2E Story",
				},
			};
			const addResult = executeCommand(state, {
				type: "addNode",
				node: newNode,
			});
			expect(addResult.error).toBeUndefined();
			expect(Object.keys(addResult.state.document.nodes)).toHaveLength(4);

			// Step 3: Connect the new node via command
			const connectResult = executeCommand(addResult.state, {
				type: "connect",
				edge: {
					id: "edge-middle-bonus",
					from: { nodeId: "middle", portId: "choice-2" },
					to: { nodeId: "bonus", portId: "in" },
				},
			});
			expect(connectResult.error).toBeUndefined();
			expect(Object.keys(connectResult.state.document.edges)).toHaveLength(3);

			// Step 4: Validate the edited document
			const validation = validateDocument(connectResult.state.document);
			expect(validation.valid).toBe(true);
			expect(validation.errors).toEqual([]);

			// Step 5: Validate via AI generation validator on original domain graph
			const aiResult = validateGeneratedGraph(adapter, domainGraph);
			expect(aiResult.success).toBe(true);
			expect(aiResult.document).toBeDefined();

			// Step 6: Round-trip back to domain
			const restored = adapter.fromGeneric(generic);
			expect(restored.id).toBe(domainGraph.id);
			expect(restored.scenes).toHaveLength(domainGraph.scenes.length);
			expect(restored.transitions).toHaveLength(domainGraph.transitions.length);

			// Step 7: Re-convert to generic and verify structural preservation
			const reConverted = adapter.toGeneric(restored);
			expect(Object.keys(reConverted.nodes)).toHaveLength(
				Object.keys(generic.nodes).length,
			);
			expect(Object.keys(reConverted.edges)).toHaveLength(
				Object.keys(generic.edges).length,
			);
		});
	});

	describe("Registry integration", () => {
		it("registers both adapters and resolves them correctly", () => {
			const registry = new AdapterRegistry();
			const effectsAdapter = new EffectsGraphAdapter();
			const narrativeAdapter = new NarrativeGraphAdapter();

			registry.register(effectsAdapter);
			registry.register(narrativeAdapter);

			expect(registry.has("effects")).toBe(true);
			expect(registry.has("narrative")).toBe(true);
			expect(registry.getAll()).toHaveLength(2);

			const resolved = registry.resolveOrThrow("effects");
			expect(resolved.id).toBe("effects");
			expect(resolved.name).toBe("Effects Graph Adapter");

			const resolvedNarrative = registry.resolveOrThrow("narrative");
			expect(resolvedNarrative.id).toBe("narrative");
			expect(resolvedNarrative.name).toBe("Narrative Graph Adapter");
		});

		it("round-trips both adapters via registry lookup", () => {
			const registry = new AdapterRegistry();
			registry.register(new EffectsGraphAdapter());
			registry.register(new NarrativeGraphAdapter());

			const effectsAdapter = registry.resolveOrThrow("effects");
			const effectsGraph = makeEffectsGraph();
			const effectsGeneric = effectsAdapter.toGeneric(effectsGraph);
			const effectsRestored = effectsAdapter.fromGeneric(
				effectsGeneric,
			) as EffectGraphSpec;
			expect(effectsRestored.nodes).toHaveLength(effectsGraph.nodes.length);

			const narrativeAdapter = registry.resolveOrThrow("narrative");
			const narrativeGraph = makeNarrativeGraph();
			const narrativeGeneric = narrativeAdapter.toGeneric(narrativeGraph);
			const narrativeRestored = narrativeAdapter.fromGeneric(
				narrativeGeneric,
			) as NarrativeGraph;
			expect(narrativeRestored.scenes).toHaveLength(
				narrativeGraph.scenes.length,
			);
		});
	});

	describe("Cross-adapter core isolation", () => {
		it("both adapters produce documents validated by the same core validator", () => {
			const effectsAdapter = new EffectsGraphAdapter();
			const narrativeAdapter = new NarrativeGraphAdapter();

			const effectsDoc = effectsAdapter.toGeneric(makeEffectsGraph());
			const narrativeDoc = narrativeAdapter.toGeneric(makeNarrativeGraph());

			const effectsValidation = validateDocument(effectsDoc);
			const narrativeValidation = validateDocument(narrativeDoc);

			expect(effectsValidation.valid).toBe(true);
			expect(narrativeValidation.valid).toBe(true);

			expect(effectsDoc.id).toBe("e2e-effects");
			expect(narrativeDoc.id).toBe("e2e-narrative");
		});

		it("core executeCommand works identically for documents from either adapter", () => {
			const effectsAdapter = new EffectsGraphAdapter();
			const narrativeAdapter = new NarrativeGraphAdapter();

			const effectsDoc = effectsAdapter.toGeneric(makeEffectsGraph());
			const narrativeDoc = narrativeAdapter.toGeneric(makeNarrativeGraph());

			const moveEffects = executeCommand(createUndoableState(effectsDoc), {
				type: "moveNode",
				nodeId: "noise-1",
				position: { x: 999, y: 999 },
			});
			expect(moveEffects.error).toBeUndefined();
			expect(moveEffects.state.document.nodes["noise-1"].position).toEqual({
				x: 999,
				y: 999,
			});

			const moveNarrative = executeCommand(createUndoableState(narrativeDoc), {
				type: "moveNode",
				nodeId: "start",
				position: { x: 500, y: 500 },
			});
			expect(moveNarrative.error).toBeUndefined();
			expect(moveNarrative.state.document.nodes["start"].position).toEqual({
				x: 500,
				y: 500,
			});
		});
	});
});
