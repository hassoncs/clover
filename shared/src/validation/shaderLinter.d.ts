import type { GameDefinition } from "../types/GameDefinition";
import type { ValidationError, ValidationWarning } from "./gameDefinitionTypes";
export interface ShaderLintIssue {
    code: string;
    message: string;
    severity: "critical" | "warning";
    line?: number;
    context?: string;
    suggestion?: string;
}
export interface ShaderLintResult {
    valid: boolean;
    issues: ShaderLintIssue[];
    errors: ValidationError[];
    warnings: ValidationWarning[];
}
export declare function lintShaderSource(source: string, path?: string): ShaderLintResult;
export declare function extractShaderSources(game: GameDefinition): Array<{
    id: string;
    source: string;
    path: string;
}>;
export declare function validateShaders(game: GameDefinition, errors: ValidationError[], warnings: ValidationWarning[]): void;
export declare function autoFixShader(source: string): {
    fixed: string;
    changes: Array<{
        from: string;
        to: string;
        line: number;
    }>;
};
//# sourceMappingURL=shaderLinter.d.ts.map