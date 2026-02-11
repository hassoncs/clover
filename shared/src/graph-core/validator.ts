import type { GraphDocument, GraphEdge } from "./types";

export type ValidationErrorCode =
	| "DANGLING_EDGE"
	| "MISSING_PORT"
	| "ID_MISMATCH"
	| "SELF_LOOP";

export interface ValidationError {
	code: ValidationErrorCode;
	message: string;
	nodeId?: string;
	edgeId?: string;
}

export interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
}

export function validateEdge(
	doc: GraphDocument,
	edge: GraphEdge,
): ValidationResult {
	const errors: ValidationError[] = [];

	const srcNode = doc.nodes[edge.from.nodeId];
	if (!srcNode) {
		errors.push({
			code: "DANGLING_EDGE",
			message: `Edge ${edge.id}: source node ${edge.from.nodeId} not found`,
			edgeId: edge.id,
		});
	}

	const tgtNode = doc.nodes[edge.to.nodeId];
	if (!tgtNode) {
		errors.push({
			code: "DANGLING_EDGE",
			message: `Edge ${edge.id}: target node ${edge.to.nodeId} not found`,
			edgeId: edge.id,
		});
	}

	if (srcNode && !srcNode.ports.some((p) => p.id === edge.from.portId)) {
		errors.push({
			code: "MISSING_PORT",
			message: `Edge ${edge.id}: source port ${edge.from.portId} not found on node ${edge.from.nodeId}`,
			edgeId: edge.id,
			nodeId: edge.from.nodeId,
		});
	}

	if (tgtNode && !tgtNode.ports.some((p) => p.id === edge.to.portId)) {
		errors.push({
			code: "MISSING_PORT",
			message: `Edge ${edge.id}: target port ${edge.to.portId} not found on node ${edge.to.nodeId}`,
			edgeId: edge.id,
			nodeId: edge.to.nodeId,
		});
	}

	if (edge.from.nodeId === edge.to.nodeId) {
		errors.push({
			code: "SELF_LOOP",
			message: `Edge ${edge.id}: self-loop on node ${edge.from.nodeId}`,
			edgeId: edge.id,
			nodeId: edge.from.nodeId,
		});
	}

	return { valid: errors.length === 0, errors };
}

export function validateDocument(doc: GraphDocument): ValidationResult {
	const errors: ValidationError[] = [];

	for (const [key, node] of Object.entries(doc.nodes)) {
		if (key !== node.id) {
			errors.push({
				code: "ID_MISMATCH",
				message: `Node record key "${key}" does not match node.id "${node.id}"`,
				nodeId: node.id,
			});
		}
	}

	for (const [key, edge] of Object.entries(doc.edges)) {
		if (key !== edge.id) {
			errors.push({
				code: "ID_MISMATCH",
				message: `Edge record key "${key}" does not match edge.id "${edge.id}"`,
				edgeId: edge.id,
			});
		}

		const edgeResult = validateEdge(doc, edge);
		errors.push(...edgeResult.errors);
	}

	return { valid: errors.length === 0, errors };
}
