import { describe, expect, it } from "vitest";
import type { NarrativeGraph } from "../../../narrative/types";
import { testAdapterContract } from "../../__tests__/adapter-contract.test";
import { NarrativeGraphAdapter } from "../narrative-adapter";

const validNarrative: NarrativeGraph = {
	id: "story-1",
	title: "The Fork in the Road",
	scenes: [
		{
			id: "intro",
			title: "The Beginning",
			body: "You stand at a crossroads.",
			speaker: "Narrator",
			choices: [
				{ id: "go-left", label: "Go left" },
				{ id: "go-right", label: "Go right" },
			],
			isStart: true,
		},
		{
			id: "left-path",
			title: "The Forest",
			body: "You enter a dark forest.",
			speaker: "Narrator",
			choices: [{ id: "continue", label: "Continue deeper" }],
		},
		{
			id: "right-path",
			title: "The Village",
			body: "You arrive at a quiet village.",
			choices: [],
			isEnding: true,
		},
		{
			id: "deep-forest",
			title: "The Clearing",
			body: "You find a magical clearing.",
			choices: [],
			isEnding: true,
		},
	],
	transitions: [
		{
			id: "t1",
			fromSceneId: "intro",
			choiceId: "go-left",
			toSceneId: "left-path",
		},
		{
			id: "t2",
			fromSceneId: "intro",
			choiceId: "go-right",
			toSceneId: "right-path",
		},
		{
			id: "t3",
			fromSceneId: "left-path",
			choiceId: "continue",
			toSceneId: "deep-forest",
		},
	],
};

const invalidNarrative: NarrativeGraph = {
	id: "broken-story",
	title: "No Start",
	scenes: [
		{
			id: "orphan",
			title: "Orphan Scene",
			body: "No way to reach this.",
			choices: [],
		},
	],
	transitions: [],
};

testAdapterContract(
	"NarrativeGraphAdapter",
	() => new NarrativeGraphAdapter(),
	validNarrative,
	invalidNarrative,
);

describe("NarrativeGraphAdapter - narrative-specific", () => {
	const adapter = new NarrativeGraphAdapter();

	describe("round-trip fidelity", () => {
		it("preserves scene titles, body, speaker, and flags", () => {
			const generic = adapter.toGeneric(validNarrative);
			const roundTripped = adapter.fromGeneric(generic);

			for (const original of validNarrative.scenes) {
				const restored = roundTripped.scenes.find((s) => s.id === original.id);
				expect(restored).toBeDefined();
				expect(restored!.title).toBe(original.title);
				expect(restored!.body).toBe(original.body);
				expect(restored!.speaker).toBe(original.speaker);
				expect(restored!.isStart).toBe(original.isStart);
				expect(restored!.isEnding).toBe(original.isEnding);
			}
		});

		it("preserves choices on scenes", () => {
			const generic = adapter.toGeneric(validNarrative);
			const roundTripped = adapter.fromGeneric(generic);

			const introScene = roundTripped.scenes.find((s) => s.id === "intro");
			expect(introScene).toBeDefined();
			expect(introScene!.choices).toHaveLength(2);
			expect(introScene!.choices[0].id).toBe("go-left");
			expect(introScene!.choices[0].label).toBe("Go left");
			expect(introScene!.choices[1].id).toBe("go-right");
			expect(introScene!.choices[1].label).toBe("Go right");
		});

		it("preserves transitions", () => {
			const generic = adapter.toGeneric(validNarrative);
			const roundTripped = adapter.fromGeneric(generic);

			expect(roundTripped.transitions).toHaveLength(3);
			const t1 = roundTripped.transitions.find((t) => t.id === "t1");
			expect(t1).toBeDefined();
			expect(t1!.fromSceneId).toBe("intro");
			expect(t1!.choiceId).toBe("go-left");
			expect(t1!.toSceneId).toBe("left-path");
		});

		it("preserves narrative-level metadata", () => {
			const generic = adapter.toGeneric(validNarrative);
			const roundTripped = adapter.fromGeneric(generic);

			expect(roundTripped.id).toBe(validNarrative.id);
			expect(roundTripped.title).toBe(validNarrative.title);
		});
	});

	describe("toGeneric mapping", () => {
		it("maps scenes to graph nodes", () => {
			const generic = adapter.toGeneric(validNarrative);
			const nodeCount = Object.keys(generic.nodes).length;
			expect(nodeCount).toBe(validNarrative.scenes.length);
		});

		it("maps transitions to graph edges", () => {
			const generic = adapter.toGeneric(validNarrative);
			const edgeCount = Object.keys(generic.edges).length;
			expect(edgeCount).toBe(validNarrative.transitions.length);
		});

		it("assigns scene node type based on flags", () => {
			const generic = adapter.toGeneric(validNarrative);
			const introNode = generic.nodes["intro"];
			expect(introNode.type).toBe("start");

			const endNode = generic.nodes["right-path"];
			expect(endNode.type).toBe("ending");

			const midNode = generic.nodes["left-path"];
			expect(midNode.type).toBe("scene");
		});

		it("stores scene data in node data", () => {
			const generic = adapter.toGeneric(validNarrative);
			const introNode = generic.nodes["intro"];
			expect(introNode.data.title).toBe("The Beginning");
			expect(introNode.data.body).toBe("You stand at a crossroads.");
			expect(introNode.data.speaker).toBe("Narrator");
		});

		it("creates output ports for each choice", () => {
			const generic = adapter.toGeneric(validNarrative);
			const introNode = generic.nodes["intro"];
			const outputPorts = introNode.ports.filter(
				(p) => p.direction === "output",
			);
			expect(outputPorts).toHaveLength(2);
			expect(outputPorts[0].id).toBe("go-left");
			expect(outputPorts[1].id).toBe("go-right");
		});
	});

	describe("validation", () => {
		it("detects missing start scene", () => {
			const noStart: NarrativeGraph = {
				id: "no-start",
				title: "No Start",
				scenes: [{ id: "s1", title: "Scene", body: "text", choices: [] }],
				transitions: [],
			};
			const result = adapter.validateDomain(noStart);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.message.includes("start"))).toBe(true);
		});

		it("detects unreachable scenes", () => {
			const unreachable: NarrativeGraph = {
				id: "unreachable",
				title: "Unreachable",
				scenes: [
					{
						id: "start",
						title: "Start",
						body: "Begin",
						choices: [],
						isStart: true,
					},
					{
						id: "island",
						title: "Island",
						body: "No transitions lead here",
						choices: [],
					},
				],
				transitions: [],
			};
			const result = adapter.validateDomain(unreachable);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.message.includes("unreachable"))).toBe(
				true,
			);
		});

		it("detects transitions referencing missing scenes", () => {
			const badRef: NarrativeGraph = {
				id: "bad-ref",
				title: "Bad Ref",
				scenes: [
					{
						id: "start",
						title: "Start",
						body: "Begin",
						choices: [{ id: "c1", label: "Go" }],
						isStart: true,
					},
				],
				transitions: [
					{
						id: "t1",
						fromSceneId: "start",
						choiceId: "c1",
						toSceneId: "nonexistent",
					},
				],
			};
			const result = adapter.validateDomain(badRef);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.message.includes("nonexistent"))).toBe(
				true,
			);
		});

		it("accepts a valid narrative graph", () => {
			const result = adapter.validateDomain(validNarrative);
			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});
	});

	describe("catalog and inspector", () => {
		it("provides scene, start, ending, and choice_hub node types", () => {
			const catalog = adapter.getNodeCatalog();
			const types = catalog.map((e) => e.type);
			expect(types).toContain("scene");
			expect(types).toContain("start");
			expect(types).toContain("ending");
			expect(types).toContain("choice_hub");
		});

		it("scene inspector has text/dialogue editing fields", () => {
			const config = adapter.getInspectorConfig("scene");
			expect(config).not.toBeNull();
			const allFields = config!.sections.flatMap((s) => s.fields);
			const fieldKeys = allFields.map((f) => f.key);
			expect(fieldKeys).toContain("title");
			expect(fieldKeys).toContain("body");
			expect(fieldKeys).toContain("speaker");
		});
	});
});
