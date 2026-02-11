import { describe, expect, it } from "vitest";
import type { EffectGraphSpec } from "../../effects/types";
import type { NarrativeGraph } from "../../narrative/types";
import { validateGeneratedGraph } from "../ai-generation";
import { EffectsGraphAdapter } from "../effects/effects-adapter";
import { NarrativeGraphAdapter } from "../narrative/narrative-adapter";

describe("validateGeneratedGraph", () => {
	describe("effects adapter", () => {
		const adapter = new EffectsGraphAdapter();

		it("validates a valid effects graph", () => {
			const validGraph: EffectGraphSpec = {
				id: "test-effect",
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

			const result = validateGeneratedGraph(adapter, validGraph);

			expect(result.success).toBe(true);
			expect(result.document).toBeDefined();
			expect(result.domainGraph).toBe(validGraph);
			expect(result.errors).toBeUndefined();
		});

		it("rejects effects graph with missing connection target", () => {
			const invalidGraph: EffectGraphSpec = {
				id: "test-effect",
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
				],
				connections: [
					{
						from: { nodeId: "noise-1", output: "output" },
						to: { nodeId: "missing-node", input: "input" },
					},
				],
				feedbackEdges: [],
				lifecycle: { autoStart: true, stopMode: "freeze" },
			};

			const result = validateGeneratedGraph(adapter, invalidGraph);

			expect(result.success).toBe(false);
			expect(result.errors).toBeDefined();
			expect(result.errors?.some((e) => e.includes("missing-node"))).toBe(true);
		});

		it("rejects effects graph with cycle", () => {
			const cyclicGraph: EffectGraphSpec = {
				id: "test-effect",
				version: "1.0.0",
				engineApiVersion: "1.0.0",
				scope: "screen",
				nodes: [
					{
						id: "blur-1",
						type: "blur",
						family: "filter",
						inputSlots: [
							{
								name: "input",
								dataType: "texture",
								connectedTo: { nodeId: "blur-2", output: "output" },
							},
						],
						params: { radius: 8 },
						outputTarget: {
							bufferId: "blur-1-out",
							format: "rgba8",
							resolution: "full",
						},
						flags: { stateful: false, fusible: "always" },
					},
					{
						id: "blur-2",
						type: "blur",
						family: "filter",
						inputSlots: [
							{
								name: "input",
								dataType: "texture",
								connectedTo: { nodeId: "blur-1", output: "output" },
							},
						],
						params: { radius: 8 },
						outputTarget: {
							bufferId: "blur-2-out",
							format: "rgba8",
							resolution: "full",
						},
						flags: { stateful: false, fusible: "always" },
					},
				],
				connections: [
					{
						from: { nodeId: "blur-1", output: "output" },
						to: { nodeId: "blur-2", input: "input" },
					},
					{
						from: { nodeId: "blur-2", output: "output" },
						to: { nodeId: "blur-1", input: "input" },
					},
				],
				feedbackEdges: [],
				lifecycle: { autoStart: true, stopMode: "freeze" },
			};

			const result = validateGeneratedGraph(adapter, cyclicGraph);

			expect(result.success).toBe(false);
			expect(result.errors).toBeDefined();
			expect(result.errors?.some((e) => e.includes("Cycle detected"))).toBe(
				true,
			);
		});
	});

	describe("narrative adapter", () => {
		const adapter = new NarrativeGraphAdapter();

		it("validates a valid narrative graph", () => {
			const validGraph: NarrativeGraph = {
				id: "test-narrative",
				title: "Test Story",
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

			const result = validateGeneratedGraph(adapter, validGraph);

			expect(result.success).toBe(true);
			expect(result.document).toBeDefined();
			expect(result.domainGraph).toBe(validGraph);
			expect(result.errors).toBeUndefined();
		});

		it("rejects narrative graph without start scene", () => {
			const invalidGraph: NarrativeGraph = {
				id: "test-narrative",
				title: "Test Story",
				scenes: [
					{
						id: "middle",
						title: "Middle",
						body: "The story continues...",
						choices: [],
					},
				],
				transitions: [],
			};

			const result = validateGeneratedGraph(adapter, invalidGraph);

			expect(result.success).toBe(false);
			expect(result.errors).toBeDefined();
			expect(result.errors?.some((e) => e.includes("start scene"))).toBe(true);
		});

		it("rejects narrative graph with unreachable scene", () => {
			const invalidGraph: NarrativeGraph = {
				id: "test-narrative",
				title: "Test Story",
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
						id: "orphan",
						title: "Orphan",
						body: "This scene is unreachable.",
						choices: [],
					},
				],
				transitions: [],
			};

			const result = validateGeneratedGraph(adapter, invalidGraph);

			expect(result.success).toBe(false);
			expect(result.errors).toBeDefined();
			expect(result.errors?.some((e) => e.includes("unreachable"))).toBe(true);
		});

		it("rejects narrative graph with missing transition target", () => {
			const invalidGraph: NarrativeGraph = {
				id: "test-narrative",
				title: "Test Story",
				scenes: [
					{
						id: "start",
						title: "Beginning",
						body: "The story begins...",
						isStart: true,
						choices: [{ id: "choice-1", label: "Continue" }],
					},
				],
				transitions: [
					{
						id: "trans-1",
						fromSceneId: "start",
						choiceId: "choice-1",
						toSceneId: "missing",
					},
				],
			};

			const result = validateGeneratedGraph(adapter, invalidGraph);

			expect(result.success).toBe(false);
			expect(result.errors).toBeDefined();
			expect(result.errors?.some((e) => e.includes("missing"))).toBe(true);
		});
	});
});
