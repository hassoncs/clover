import type { GraphDocument, GraphEdge } from "./types";
export type ValidationErrorCode = "DANGLING_EDGE" | "MISSING_PORT" | "ID_MISMATCH" | "SELF_LOOP";
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
export declare function validateEdge(doc: GraphDocument, edge: GraphEdge): ValidationResult;
export declare function validateDocument(doc: GraphDocument): ValidationResult;
//# sourceMappingURL=validator.d.ts.map