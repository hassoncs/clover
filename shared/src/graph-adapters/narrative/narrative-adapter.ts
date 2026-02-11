import type {
	GraphDocument,
	GraphEdge,
	GraphNode,
	GraphPort,
} from "../../graph-core/types";
import type {
	Choice,
	NarrativeGraph,
	Scene,
	Transition,
} from "../../narrative/types";
import type {
	DomainValidationError,
	DomainValidationResult,
	GraphDomainAdapter,
	InspectorConfig,
	NodeCatalogEntry,
} from "../types";

function sceneNodeType(scene: Scene): string {
	if (scene.isStart) return "start";
	if (scene.isEnding) return "ending";
	return "scene";
}

function sceneToNode(
	scene: Scene,
	index: number,
	narrativeTitle: string,
): GraphNode {
	const ports: GraphPort[] = [
		{ id: "in", direction: "input", dataType: "flow" },
	];

	for (const choice of scene.choices) {
		ports.push({
			id: choice.id,
			direction: "output",
			dataType: "flow",
			label: choice.label,
		});
	}

	return {
		id: scene.id,
		type: sceneNodeType(scene),
		position: { x: 0, y: index * 200 },
		ports,
		data: {
			title: scene.title,
			body: scene.body,
			speaker: scene.speaker,
			isStart: scene.isStart,
			isEnding: scene.isEnding,
			choices: scene.choices,
			narrativeTitle,
		},
		label: scene.title,
	};
}

function transitionToEdge(transition: Transition): GraphEdge {
	return {
		id: transition.id,
		from: { nodeId: transition.fromSceneId, portId: transition.choiceId },
		to: { nodeId: transition.toSceneId, portId: "in" },
	};
}

function nodeToScene(node: GraphNode): Scene {
	const choices = (node.data.choices as Choice[]) ?? [];
	return {
		id: node.id,
		title: node.data.title as string,
		body: node.data.body as string,
		speaker: node.data.speaker as string | undefined,
		choices,
		isStart: (node.data.isStart as boolean) || undefined,
		isEnding: (node.data.isEnding as boolean) || undefined,
	};
}

function edgeToTransition(edge: GraphEdge): Transition {
	return {
		id: edge.id,
		fromSceneId: edge.from.nodeId,
		choiceId: edge.from.portId,
		toSceneId: edge.to.nodeId,
	};
}

export class NarrativeGraphAdapter
	implements GraphDomainAdapter<NarrativeGraph>
{
	readonly id = "narrative";
	readonly name = "Narrative Graph Adapter";

	toGeneric(domainGraph: NarrativeGraph): GraphDocument {
		const nodes: Record<string, GraphNode> = {};
		for (const [i, scene] of domainGraph.scenes.entries()) {
			nodes[scene.id] = sceneToNode(scene, i, domainGraph.title);
		}

		const edges: Record<string, GraphEdge> = {};
		for (const transition of domainGraph.transitions) {
			edges[transition.id] = transitionToEdge(transition);
		}

		return {
			id: domainGraph.id,
			nodes,
			edges,
			viewport: { pan: { x: 0, y: 0 }, zoom: 1 },
		};
	}

	fromGeneric(graph: GraphDocument): NarrativeGraph {
		const scenes = Object.values(graph.nodes).map(nodeToScene);
		const transitions = Object.values(graph.edges).map(edgeToTransition);

		return {
			id: graph.id,
			title:
				(Object.values(graph.nodes)[0]?.data.narrativeTitle as string) ??
				graph.id,
			scenes,
			transitions,
		};
	}

	validateDomain(domainGraph: NarrativeGraph): DomainValidationResult {
		const errors: DomainValidationError[] = [];
		const sceneIds = new Set(domainGraph.scenes.map((s) => s.id));

		const startScenes = domainGraph.scenes.filter((s) => s.isStart);
		if (startScenes.length === 0) {
			errors.push({
				code: "DOMAIN_CONSTRAINT",
				message: "Narrative must have at least one start scene",
			});
		}

		for (const transition of domainGraph.transitions) {
			if (!sceneIds.has(transition.fromSceneId)) {
				errors.push({
					code: "DOMAIN_CONSTRAINT",
					message: `Transition "${transition.id}" references missing source scene "${transition.fromSceneId}"`,
					nodeId: transition.fromSceneId,
				});
			}
			if (!sceneIds.has(transition.toSceneId)) {
				errors.push({
					code: "DOMAIN_CONSTRAINT",
					message: `Transition "${transition.id}" references missing target scene "${transition.toSceneId}"`,
					nodeId: transition.toSceneId,
				});
			}
		}

		if (startScenes.length > 0) {
			const reachable = new Set<string>();
			const queue = startScenes.map((s) => s.id);
			while (queue.length > 0) {
				const current = queue.pop()!;
				if (reachable.has(current)) continue;
				reachable.add(current);
				for (const t of domainGraph.transitions) {
					if (t.fromSceneId === current && sceneIds.has(t.toSceneId)) {
						queue.push(t.toSceneId);
					}
				}
			}

			for (const scene of domainGraph.scenes) {
				if (!scene.isStart && !reachable.has(scene.id)) {
					errors.push({
						code: "DOMAIN_CONSTRAINT",
						message: `Scene "${scene.id}" is unreachable from any start scene`,
						nodeId: scene.id,
					});
				}
			}
		}

		return { valid: errors.length === 0, errors };
	}

	getNodeCatalog(): NodeCatalogEntry[] {
		return [
			{
				type: "scene",
				label: "Scene",
				category: "narrative",
				description: "A story scene with dialogue and choices",
				defaultPorts: [
					{ id: "in", direction: "input", dataType: "flow" },
					{ id: "out", direction: "output", dataType: "flow" },
				],
			},
			{
				type: "start",
				label: "Start Scene",
				category: "narrative",
				description: "The entry point of the story",
				defaultPorts: [
					{ id: "in", direction: "input", dataType: "flow" },
					{ id: "out", direction: "output", dataType: "flow" },
				],
			},
			{
				type: "ending",
				label: "Ending Scene",
				category: "narrative",
				description: "A terminal scene that ends the story",
				defaultPorts: [{ id: "in", direction: "input", dataType: "flow" }],
			},
			{
				type: "choice_hub",
				label: "Choice Hub",
				category: "narrative",
				description: "A branching point with multiple outgoing choices",
				defaultPorts: [
					{ id: "in", direction: "input", dataType: "flow" },
					{ id: "out-a", direction: "output", dataType: "flow" },
					{ id: "out-b", direction: "output", dataType: "flow" },
				],
			},
		];
	}

	getInspectorConfig(nodeType: string): InspectorConfig | null {
		const sceneFields = {
			nodeType: "scene" as const,
			sections: [
				{
					label: "Content",
					fields: [
						{ key: "title", label: "Title", type: "string" as const },
						{ key: "body", label: "Body Text", type: "string" as const },
						{
							key: "speaker",
							label: "Speaker",
							type: "string" as const,
						},
					],
				},
			],
		};

		switch (nodeType) {
			case "scene":
				return sceneFields;
			case "start":
				return {
					...sceneFields,
					nodeType: "start",
					sections: [
						...sceneFields.sections,
						{
							label: "Flags",
							fields: [
								{
									key: "isStart",
									label: "Is Start",
									type: "boolean" as const,
								},
							],
						},
					],
				};
			case "ending":
				return {
					...sceneFields,
					nodeType: "ending",
					sections: [
						...sceneFields.sections,
						{
							label: "Flags",
							fields: [
								{
									key: "isEnding",
									label: "Is Ending",
									type: "boolean" as const,
								},
							],
						},
					],
				};
			case "choice_hub":
				return {
					nodeType: "choice_hub",
					sections: [
						{
							label: "Hub",
							fields: [
								{
									key: "title",
									label: "Title",
									type: "string" as const,
								},
							],
						},
					],
				};
			default:
				return null;
		}
	}
}
