export interface GameDefinitionValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}
export interface ValidationError {
    code: string;
    message: string;
    path?: string;
}
export interface ValidationWarning {
    code: string;
    message: string;
    path?: string;
}
//# sourceMappingURL=gameDefinitionTypes.d.ts.map