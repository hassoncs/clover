import type {
	ConverterNode,
	DrainNode,
	EconomyEdge,
	EconomyGraph,
	EconomyNode,
	GateNode,
	PoolNode,
	SourceNode,
} from "./types";

export function makeSource(id: string, resourceType: string): SourceNode {
	return { id, type: "source", label: id, resourceType };
}

export function makeDrain(id: string, resourceType: string): DrainNode {
	return { id, type: "drain", label: id, resourceType };
}

export function makePool(
	id: string,
	resourceType: string,
	capacity?: number,
): PoolNode {
	return {
		id,
		type: "pool",
		label: id,
		resourceType,
		capacity,
		initialValue: 0,
	};
}

export function makeGate(id: string, resourceType: string): GateNode {
	return { id, type: "gate", label: id, resourceType, mode: "probabilistic" };
}

export function makeConverter(
	id: string,
	inputResourceType: string,
	outputResourceType: string,
	rate = 1,
): ConverterNode {
	return {
		id,
		type: "converter",
		label: id,
		inputResourceType,
		outputResourceType,
		rate,
	};
}

export function makeResourceEdge(
	id: string,
	from: string,
	to: string,
	formula?: string,
): EconomyEdge {
	return { id, type: "resource", from, to, formula };
}

export function makeStateEdge(
	id: string,
	from: string,
	to: string,
): EconomyEdge {
	return { id, type: "state", from, to };
}

export function makeGraph(
	nodes: EconomyNode[],
	edges: EconomyEdge[],
	resourceTypes: string[],
): EconomyGraph {
	return {
		id: "test-economy",
		resourceTypes,
		nodes,
		edges,
	};
}
