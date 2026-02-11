import { createEmptyDocument } from "../../commands";
import type { GraphDocument, GraphEdge, GraphNode } from "../../types";

/**
 * Generates a benchmark graph with the specified number of nodes.
 * Creates a chain topology where each node connects to the next.
 *
 * @param nodeCount - Number of nodes to generate (e.g., 20, 50, 100)
 * @returns A valid GraphDocument with connected nodes
 */
export function generateBenchmarkGraph(nodeCount: number): GraphDocument {
	const doc = createEmptyDocument(`benchmark-${nodeCount}`);

	// Generate nodes in a grid layout
	const gridSize = Math.ceil(Math.sqrt(nodeCount));
	const spacing = 200;

	for (let i = 0; i < nodeCount; i++) {
		const row = Math.floor(i / gridSize);
		const col = i % gridSize;

		const node: GraphNode = {
			id: `node-${i}`,
			type: "benchmark",
			position: {
				x: col * spacing,
				y: row * spacing,
			},
			ports: [
				{
					id: `node-${i}-in`,
					direction: "input",
					dataType: "any",
					label: "Input",
				},
				{
					id: `node-${i}-out`,
					direction: "output",
					dataType: "any",
					label: "Output",
				},
			],
			data: {
				index: i,
				benchmarkNode: true,
			},
			label: `Node ${i}`,
		};

		doc.nodes[node.id] = node;
	}

	// Create chain connections (node-0 -> node-1 -> node-2 -> ...)
	for (let i = 0; i < nodeCount - 1; i++) {
		const edge: GraphEdge = {
			id: `edge-${i}`,
			from: {
				nodeId: `node-${i}`,
				portId: `node-${i}-out`,
			},
			to: {
				nodeId: `node-${i + 1}`,
				portId: `node-${i + 1}-in`,
			},
		};

		doc.edges[edge.id] = edge;
	}

	return doc;
}
