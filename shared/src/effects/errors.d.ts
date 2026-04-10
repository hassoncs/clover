export type GraphValidationErrorCode = 'E_GRAPH_CYCLE' | 'E_RESOURCE_UNRESOLVED' | 'E_BUDGET_EXCEEDED' | 'E_DUPLICATE_NODE_ID' | 'E_DUPLICATE_CONNECTION' | 'E_MISSING_NODE_REF' | 'E_INVALID_SCOPE' | 'E_FORMAT_MISMATCH' | 'E_FEEDBACK_LIMIT' | 'E_FEEDBACK_INVALID' | 'E_EMPTY_GRAPH' | 'E_DISCONNECTED_NODE' | 'E_SELF_LOOP' | 'E_GENERATOR_HAS_INPUT';
export interface GraphValidationError {
    code: GraphValidationErrorCode;
    message: string;
    nodeIds?: string[];
    path?: string;
}
export interface GraphValidationResult {
    valid: boolean;
    errors: GraphValidationError[];
}
//# sourceMappingURL=errors.d.ts.map