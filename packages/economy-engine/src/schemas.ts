import { z } from "zod";
import type {
	EconomyGraph,
	EconomyValidationError,
	EconomyValidationErrorCode,
	EconomyValidationResult,
} from "./types";

const PositionSchema = z.object({
	x: z.number(),
	y: z.number(),
});

const EconomyNodeTypeSchema = z.enum([
	"source",
	"drain",
	"pool",
	"gate",
	"converter",
]);

const GateModeSchema = z.enum(["probabilistic", "conditional"]);

const BaseNodeFields = {
	id: z.string().min(1),
	label: z.string().min(1),
	position: PositionSchema.optional(),
};

const SourceNodeSchema = z.object({
	...BaseNodeFields,
	type: z.literal("source"),
	resourceType: z.string().min(1),
});

const DrainNodeSchema = z.object({
	...BaseNodeFields,
	type: z.literal("drain"),
	resourceType: z.string().min(1),
});

const PoolNodeSchema = z.object({
	...BaseNodeFields,
	type: z.literal("pool"),
	resourceType: z.string().min(1),
	capacity: z.number().optional(),
	initialValue: z.number().optional(),
});

const GateNodeSchema = z.object({
	...BaseNodeFields,
	type: z.literal("gate"),
	resourceType: z.string().min(1),
	mode: GateModeSchema.optional(),
});

const ConverterNodeSchema = z.object({
	...BaseNodeFields,
	type: z.literal("converter"),
	inputResourceType: z.string().min(1),
	outputResourceType: z.string().min(1),
	rate: z.number().optional(),
});

export const EconomyNodeSchema = z.discriminatedUnion("type", [
	SourceNodeSchema,
	DrainNodeSchema,
	PoolNodeSchema,
	GateNodeSchema,
	ConverterNodeSchema,
]);

export const EconomyEdgeSchema = z.object({
	id: z.string().min(1),
	type: z.enum(["resource", "state"]),
	from: z.string().min(1),
	to: z.string().min(1),
	formula: z.string().optional(),
	probability: z.number().min(0).max(1).optional(),
	condition: z.string().optional(),
});

export const EconomyGraphSchema = z.object({
	id: z.string().min(1),
	resourceTypes: z.array(z.string().min(1)).min(1),
	nodes: z.array(EconomyNodeSchema).min(1),
	edges: z.array(EconomyEdgeSchema),
});

function err(
	code: EconomyValidationErrorCode,
	message: string,
	opts?: { nodeIds?: string[]; edgeIds?: string[] },
): EconomyValidationError {
	const e: EconomyValidationError = { code, message };
	if (opts?.nodeIds) e.nodeIds = opts.nodeIds;
	if (opts?.edgeIds) e.edgeIds = opts.edgeIds;
	return e;
}

export function validateEconomyGraph(
	graph: EconomyGraph,
): EconomyValidationResult {
	const errors: EconomyValidationError[] = [];

	if (graph.nodes.length === 0) {
		errors.push(
			err("E_EMPTY_GRAPH", "Economy graph must have at least one node"),
		);
		return { valid: false, errors };
	}

	const resourceTypes = new Set(graph.resourceTypes);
	const nodeIds = new Set<string>();

	for (const node of graph.nodes) {
		if (nodeIds.has(node.id)) {
			errors.push(
				err("E_DUPLICATE_NODE_ID", `Duplicate node id "${node.id}"`, {
					nodeIds: [node.id],
				}),
			);
		}
		nodeIds.add(node.id);

		const rt =
			node.type === "converter"
				? [node.inputResourceType, node.outputResourceType]
				: [node.resourceType];

		for (const r of rt) {
			if (!resourceTypes.has(r)) {
				errors.push(
					err(
						"E_UNKNOWN_RESOURCE_TYPE",
						`Node "${node.id}" references unknown resource type "${r}"`,
						{ nodeIds: [node.id] },
					),
				);
			}
		}

		if (
			node.type === "pool" &&
			node.capacity !== undefined &&
			node.capacity < 0
		) {
			errors.push(
				err(
					"E_INVALID_CAPACITY",
					`Pool "${node.id}" has negative capacity ${node.capacity}`,
					{ nodeIds: [node.id] },
				),
			);
		}
	}

	const edgeIds = new Set<string>();

	for (const edge of graph.edges) {
		if (edgeIds.has(edge.id)) {
			errors.push(
				err("E_DUPLICATE_EDGE_ID", `Duplicate edge id "${edge.id}"`, {
					edgeIds: [edge.id],
				}),
			);
		}
		edgeIds.add(edge.id);

		if (!nodeIds.has(edge.from)) {
			errors.push(
				err(
					"E_MISSING_NODE_REF",
					`Edge "${edge.id}" references non-existent node "${edge.from}"`,
					{ edgeIds: [edge.id] },
				),
			);
		}
		if (!nodeIds.has(edge.to)) {
			errors.push(
				err(
					"E_MISSING_NODE_REF",
					`Edge "${edge.id}" references non-existent node "${edge.to}"`,
					{ edgeIds: [edge.id] },
				),
			);
		}
		if (edge.from === edge.to) {
			errors.push(
				err(
					"E_SELF_LOOP",
					`Edge "${edge.id}" is a self-loop on node "${edge.from}"`,
					{ edgeIds: [edge.id], nodeIds: [edge.from] },
				),
			);
		}
	}

	const gateOutEdges = new Map<string, number>();
	for (const edge of graph.edges) {
		if (edge.probability !== undefined) {
			const node = graph.nodes.find((n) => n.id === edge.from);
			if (node && node.type === "gate") {
				gateOutEdges.set(
					edge.from,
					(gateOutEdges.get(edge.from) ?? 0) + edge.probability,
				);
			}
		}
	}
	for (const [gateId, total] of gateOutEdges) {
		if (total > 1 + 1e-9) {
			errors.push(
				err(
					"E_INVALID_GATE_PROBABILITY",
					`Gate "${gateId}" outgoing probabilities sum to ${total} (must be <= 1)`,
					{ nodeIds: [gateId] },
				),
			);
		}
	}

	return { valid: errors.length === 0, errors };
}
