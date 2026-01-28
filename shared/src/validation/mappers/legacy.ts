import type { GameValidationIssue, GameValidationReport, ValidatorSource } from '../types';
import { CURRENT_VALIDATOR_VERSION } from '../types';
import { computeValidationSummary } from '../scoring';

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

function mapErrorToIssue(error: LegacyValidationError, source: ValidatorSource): GameValidationIssue {
  return {
    code: error.code,
    message: error.message,
    severity: 'critical',
    source,
    path: error.path || '',
  };
}

function mapWarningToIssue(warning: LegacyValidationWarning, source: ValidatorSource): GameValidationIssue {
  return {
    code: warning.code,
    message: warning.message,
    severity: 'warning',
    source,
    path: warning.path || '',
  };
}

export function mapLegacyResultToReport(
  result: LegacyValidationResult,
  source: ValidatorSource = 'gameDefinition'
): GameValidationReport {
  const issues: GameValidationIssue[] = [
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

export function createEmptyReport(): GameValidationReport {
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
