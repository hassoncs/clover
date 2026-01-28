import { describe, it, expect } from 'vitest';
import type { GameValidationIssue } from '../types';
import { computeValidationScore, selectTopIssues, computeValidationSummary } from '../scoring';

describe('computeValidationScore', () => {
  it('returns 100 for no issues', () => {
    expect(computeValidationScore([])).toBe(100);
  });

  it('deducts 30 points per critical issue', () => {
    const issues: GameValidationIssue[] = [
      { code: 'ERR1', message: 'Error 1', severity: 'critical', source: 'gameDefinition', path: 'a' },
    ];
    expect(computeValidationScore(issues)).toBe(70);
  });

  it('deducts 3 points per warning', () => {
    const issues: GameValidationIssue[] = [
      { code: 'WARN1', message: 'Warning 1', severity: 'warning', source: 'gameDefinition', path: 'a' },
    ];
    expect(computeValidationScore(issues)).toBe(97);
  });

  it('combines critical and warning penalties', () => {
    const issues: GameValidationIssue[] = [
      { code: 'ERR1', message: 'Error 1', severity: 'critical', source: 'gameDefinition', path: 'a' },
      { code: 'WARN1', message: 'Warning 1', severity: 'warning', source: 'gameDefinition', path: 'b' },
      { code: 'WARN2', message: 'Warning 2', severity: 'warning', source: 'gameDefinition', path: 'c' },
    ];
    expect(computeValidationScore(issues)).toBe(64);
  });

  it('clamps to minimum of 0', () => {
    const issues: GameValidationIssue[] = Array(10).fill(null).map((_, i) => ({
      code: `ERR${i}`,
      message: `Error ${i}`,
      severity: 'critical' as const,
      source: 'gameDefinition' as const,
      path: `path${i}`,
    }));
    expect(computeValidationScore(issues)).toBe(0);
  });

  it('respects custom penalties', () => {
    const issues: GameValidationIssue[] = [
      { code: 'ERR1', message: 'Error 1', severity: 'critical', source: 'gameDefinition', path: 'a' },
    ];
    expect(computeValidationScore(issues, { criticalPenalty: 50 })).toBe(50);
  });

  it('respects custom min/max scores', () => {
    expect(computeValidationScore([], { minScore: 10, maxScore: 90 })).toBe(90);
    
    const issues: GameValidationIssue[] = [
      { code: 'ERR1', message: 'Error 1', severity: 'critical', source: 'gameDefinition', path: 'a' },
      { code: 'ERR2', message: 'Error 2', severity: 'critical', source: 'gameDefinition', path: 'b' },
      { code: 'ERR3', message: 'Error 3', severity: 'critical', source: 'gameDefinition', path: 'c' },
    ];
    expect(computeValidationScore(issues, { minScore: 10 })).toBe(10);
  });
});

describe('selectTopIssues', () => {
  const createIssues = (): GameValidationIssue[] => [
    { code: 'WARN1', message: 'Warning 1', severity: 'warning', source: 'gameDefinition', path: 'z' },
    { code: 'CRIT1', message: 'Critical 1', severity: 'critical', source: 'gameDefinition', path: 'b' },
    { code: 'WARN2', message: 'Warning 2', severity: 'warning', source: 'gameDefinition', path: 'a' },
    { code: 'CRIT2', message: 'Critical 2', severity: 'critical', source: 'gameDefinition', path: 'a' },
    { code: 'WARN3', message: 'Warning 3', severity: 'warning', source: 'gameDefinition', path: 'm' },
  ];

  it('returns critical issues first, sorted by path', () => {
    const issues = createIssues();
    const top = selectTopIssues(issues, { limit: 3 });
    
    expect(top).toHaveLength(3);
    expect(top[0].severity).toBe('critical');
    expect(top[0].path).toBe('a');
    expect(top[1].severity).toBe('critical');
    expect(top[1].path).toBe('b');
    expect(top[2].severity).toBe('warning');
  });

  it('respects limit', () => {
    const issues = createIssues();
    const top = selectTopIssues(issues, { limit: 2 });
    expect(top).toHaveLength(2);
  });

  it('excludes warnings when includeWarnings is false', () => {
    const issues = createIssues();
    const top = selectTopIssues(issues, { limit: 10, includeWarnings: false });
    
    expect(top).toHaveLength(2);
    expect(top.every(i => i.severity === 'critical')).toBe(true);
  });

  it('returns empty array for no issues', () => {
    expect(selectTopIssues([])).toEqual([]);
  });

  it('returns all issues if fewer than limit', () => {
    const issues: GameValidationIssue[] = [
      { code: 'WARN1', message: 'Warning', severity: 'warning', source: 'gameDefinition', path: 'a' },
    ];
    const top = selectTopIssues(issues, { limit: 5 });
    expect(top).toHaveLength(1);
  });
});

describe('computeValidationSummary', () => {
  it('computes complete summary', () => {
    const issues: GameValidationIssue[] = [
      { code: 'ERR1', message: 'Error 1', severity: 'critical', source: 'gameDefinition', path: 'a' },
      { code: 'ERR2', message: 'Error 2', severity: 'critical', source: 'gameDefinition', path: 'b' },
      { code: 'WARN1', message: 'Warning 1', severity: 'warning', source: 'gameDefinition', path: 'c' },
    ];
    
    const summary = computeValidationSummary(issues);
    
    expect(summary.criticalCount).toBe(2);
    expect(summary.warningCount).toBe(1);
    expect(summary.score).toBe(37);
    expect(summary.topIssues).toHaveLength(3);
  });

  it('passes options to scoring and top issues', () => {
    const issues: GameValidationIssue[] = [
      { code: 'ERR1', message: 'Error 1', severity: 'critical', source: 'gameDefinition', path: 'a' },
      { code: 'WARN1', message: 'Warning 1', severity: 'warning', source: 'gameDefinition', path: 'b' },
    ];
    
    const summary = computeValidationSummary(
      issues,
      { criticalPenalty: 20 },
      { limit: 1 }
    );
    
    expect(summary.score).toBe(77);
    expect(summary.topIssues).toHaveLength(1);
  });
});
