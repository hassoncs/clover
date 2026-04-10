import type { GraphDocument } from "../graph-core/types";
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
export declare function validateGeneratedGraph<TDomain>(adapter: GraphDomainAdapter<TDomain>, domainGraph: TDomain): GraphGenerationResult;
//# sourceMappingURL=ai-generation.d.ts.map