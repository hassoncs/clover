import { CURRENT_VALIDATOR_VERSION } from '../types';
import { computeValidationSummary } from '../scoring';
function mapErrorToIssue(error, source) {
    return {
        code: error.code,
        message: error.message,
        severity: 'critical',
        source,
        path: error.path || '',
    };
}
function mapWarningToIssue(warning, source) {
    return {
        code: warning.code,
        message: warning.message,
        severity: 'warning',
        source,
        path: warning.path || '',
    };
}
export function mapLegacyResultToReport(result, source = 'gameDefinition') {
    const issues = [
        ...result.errors.map(e => mapErrorToIssue(e, source)),
        ...result.warnings.map(w => mapWarningToIssue(w, source)),
    ];
    return {
        valid: result.valid,
        issues,
        summary: computeValidationSummary(issues),
        validatorVersion: CURRENT_VALIDATOR_VERSION,
        validatedAt: Date.now(),
    };
}
export function createEmptyReport() {
    return {
        valid: true,
        issues: [],
        summary: {
            criticalCount: 0,
            warningCount: 0,
            score: 100,
            topIssues: [],
        },
        validatorVersion: CURRENT_VALIDATOR_VERSION,
        validatedAt: Date.now(),
    };
}
//# sourceMappingURL=legacy.js.map