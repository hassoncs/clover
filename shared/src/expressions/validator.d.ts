import type { ValidationResult, ExpressionError } from './types';
export declare function validateExpression(source: string, options?: {
    knownVariables?: string[];
    path?: string;
}): ValidationResult;
export declare function formatValidationErrors(result: ValidationResult): string;
export declare function validateAllExpressions(expressions: Array<{
    source: string;
    path: string;
}>, knownVariables?: string[]): {
    valid: boolean;
    errors: ExpressionError[];
    warnings: string[];
};
//# sourceMappingURL=validator.d.ts.map