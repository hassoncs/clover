export type IssueSeverity = 'critical' | 'warning';
export type ValidatorSource = 'gameDefinition' | 'expressions';

export interface GameValidationIssue {
  code: string;
  message: string;
  severity: IssueSeverity;
  source: ValidatorSource;
  path: string;
  context?: string;
}

export interface ValidationSummary {
  criticalCount: number;
  warningCount: number;
  score: number;
  topIssues: GameValidationIssue[];
}

export interface GameValidationReport {
  valid: boolean;
  issues: GameValidationIssue[];
  summary: ValidationSummary;
  validatorVersion: string;
  validatedAt: number;
}

export interface ScoringOptions {
  criticalPenalty?: number;
  warningPenalty?: number;
  minScore?: number;
  maxScore?: number;
}

export interface TopIssuesOptions {
  limit?: number;
  includeWarnings?: boolean;
}

export const CURRENT_VALIDATOR_VERSION = '1.0.0';
