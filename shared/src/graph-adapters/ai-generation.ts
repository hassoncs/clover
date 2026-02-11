import type { GraphDocument } from "../graph-core/types";
import { validateDocument } from "../graph-core/validator";
import type { GraphDomainAdapter } from "./types";

export interface GraphGenerationRequest {
	adapterId: string;
	prompt: string;
	context?: Record<string, unknown>;
}

export interface GraphGenerationResult {
	success: boolean;
	document?: GraphDocument;
	domainGraph?: unknown;
	errors?: string[];
}

export function validateGeneratedGraph<TDomain>(
	adapter: GraphDomainAdapter<TDomain>,
	domainGraph: TDomain,
): GraphGenerationResult {
	const errors: string[] = [];

	// Step 1: Validate domain-specific constraints
	const domainValidation = adapter.validateDomain(domainGraph);
	if (!domainValidation.valid) {
		errors.push(
			...domainValidation.errors.map(
				(e) =>
					`[${e.code}] ${e.message}${e.nodeId ? ` (node: ${e.nodeId})` : ""}`,
			),
		);
	}

	// Step 2: Convert to generic graph document
	let document: GraphDocument;
	try {
		document = adapter.toGeneric(domainGraph);
	} catch (err) {
		errors.push(
			`Failed to convert domain graph to generic: ${err instanceof Error ? err.message : String(err)}`,
		);
		return { success: false, errors };
	}

	// Step 3: Validate core graph structure
	const coreValidation = validateDocument(document);
	if (!coreValidation.valid) {
		errors.push(
			...coreValidation.errors.map(
				(e) =>
					`[${e.code}] ${e.message}${e.nodeId ? ` (node: ${e.nodeId})` : ""}${e.edgeId ? ` (edge: ${e.edgeId})` : ""}`,
			),
		);
	}

	// Step 4: Return combined result
	if (errors.length > 0) {
		return { success: false, errors, domainGraph, document };
	}

	return { success: true, document, domainGraph };
}
