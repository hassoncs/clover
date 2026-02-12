export type EconomyNodeType =
	| "source"
	| "drain"
	| "pool"
	| "gate"
	| "converter";

export type EconomyEdgeType = "resource" | "state";

export type GateMode = "probabilistic" | "conditional";

interface EconomyNodeBase {
	id: string;
	type: EconomyNodeType;
	label: string;
	position?: { x: number; y: number };
}

export interface SourceNode extends EconomyNodeBase {
	type: "source";
	resourceType: string;
}

export interface DrainNode extends EconomyNodeBase {
	type: "drain";
	resourceType: string;
}

export interface PoolNode extends EconomyNodeBase {
	type: "pool";
	resourceType: string;
	capacity?: number;
	initialValue?: number;
}

export interface GateNode extends EconomyNodeBase {
	type: "gate";
	resourceType: string;
	mode?: GateMode;
}

export interface ConverterNode extends EconomyNodeBase {
	type: "converter";
	inputResourceType: string;
	outputResourceType: string;
	rate?: number;
}

export type EconomyNode =
	| SourceNode
	| DrainNode
	| PoolNode
	| GateNode
	| ConverterNode;

export interface EconomyEdge {
	id: string;
	type: EconomyEdgeType;
	from: string;
	to: string;
	formula?: string;
	probability?: number;
	condition?: string;
}

export interface EconomyGraph {
	id: string;
	resourceTypes: string[];
	nodes: EconomyNode[];
	edges: EconomyEdge[];
}

export interface EconomyState {
	nodeValues: Record<string, number>;
	tick: number;
}

export type EconomyValidationErrorCode =
	| "E_DUPLICATE_NODE_ID"
	| "E_DUPLICATE_EDGE_ID"
	| "E_MISSING_NODE_REF"
	| "E_SELF_LOOP"
	| "E_UNKNOWN_RESOURCE_TYPE"
	| "E_INVALID_CAPACITY"
	| "E_INVALID_GATE_PROBABILITY"
	| "E_EMPTY_GRAPH";

export interface EconomyValidationError {
	code: EconomyValidationErrorCode;
	message: string;
	nodeIds?: string[];
	edgeIds?: string[];
}

export interface EconomyValidationResult {
	valid: boolean;
	errors: EconomyValidationError[];
}
