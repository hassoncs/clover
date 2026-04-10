import type { GameValidationReport, ValidatorSource } from '../types';
interface LegacyValidationError {
    code: string;
    message: string;
    path?: string;
}
interface LegacyValidationWarning {
    code: string;
    message: string;
    path?: string;
}
interface LegacyValidationResult {
    valid: boolean;
    errors: LegacyValidationError[];
    warnings: LegacyValidationWarning[];
}
export declare function mapLegacyResultToReport(result: LegacyValidationResult, source?: ValidatorSource): GameValidationReport;
export declare function createEmptyReport(): GameValidationReport;
export {};
//# sourceMappingURL=legacy.d.ts.map