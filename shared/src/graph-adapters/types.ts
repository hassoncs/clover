import type { GraphDocument, GraphPort } from "../graph-core/types";

export interface DomainValidationError {
	code: "DOMAIN_CONSTRAINT";
	message: string;
	nodeId?: string;
}

export interface DomainValidationResult {
	valid: boolean;
	errors: DomainValidationError[];
}

export interface NodeCatalogEntry {
	type: string;
	label: string;
	category: string;
	defaultPorts: Pick<GraphPort, "id" | "direction" | "dataType">[];
	description?: string;
}

export interface InspectorFieldConfig {
	key: string;
	label: string;
	type: "string" | "number" | "boolean" | "select" | "color";
	min?: number;
	max?: number;
	options?: Array<{ label: string; value: string }>;
}

export interface InspectorSection {
	label: string;
	fields: InspectorFieldConfig[];
}

export interface InspectorConfig {
	nodeType: string;
	sections: InspectorSection[];
}

export interface GraphDomainAdapter<TDomain = unknown> {
	readonly id: string;
	readonly name: string;
	toGeneric(domainGraph: TDomain): GraphDocument;
	fromGeneric(graph: GraphDocument): TDomain;
	validateDomain(domainGraph: TDomain): DomainValidationResult;
	getNodeCatalog(): NodeCatalogEntry[];
	getInspectorConfig(nodeType: string): InspectorConfig | null;
}
