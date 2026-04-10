import type { GameValidationIssue, ValidationSummary, ScoringOptions, TopIssuesOptions } from './types';
export declare function computeValidationScore(issues: GameValidationIssue[], options?: ScoringOptions): number;
export declare function selectTopIssues(issues: GameValidationIssue[], options?: TopIssuesOptions): GameValidationIssue[];
export declare function computeValidationSummary(issues: GameValidationIssue[], scoringOptions?: ScoringOptions, topIssuesOptions?: TopIssuesOptions): ValidationSummary;
//# sourceMappingURL=scoring.d.ts.map