import { describe, it, expect } from 'vitest';
import { mapLegacyResultToReport, createEmptyReport } from '../mappers/legacy';

describe('mapLegacyResultToReport', () => {
  it('maps empty result to valid report with perfect score', () => {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
    };
    
    const report = mapLegacyResultToReport(result);
    
    expect(report.valid).toBe(true);
    expect(report.issues).toHaveLength(0);
    expect(report.summary.criticalCount).toBe(0);
    expect(report.summary.warningCount).toBe(0);
    expect(report.summary.score).toBe(100);
    expect(report.summary.topIssues).toHaveLength(0);
    expect(report.validatorVersion).toBe('1.0.0');
    expect(typeof report.validatedAt).toBe('number');
  });

  it('maps errors to critical issues', () => {
    const result = {
      valid: false,
      errors: [
        { code: 'MISSING_METADATA', message: 'No metadata', path: 'metadata' },
        { code: 'INVALID_BODY_TYPE', message: 'Bad body type', path: 'entities.player.physics.bodyType' },
      ],
      warnings: [],
    };
    
    const report = mapLegacyResultToReport(result);
    
    expect(report.valid).toBe(false);
    expect(report.issues).toHaveLength(2);
    expect(report.issues[0].severity).toBe('critical');
    expect(report.issues[0].source).toBe('gameDefinition');
    expect(report.issues[0].code).toBe('MISSING_METADATA');
    expect(report.summary.criticalCount).toBe(2);
    expect(report.summary.score).toBe(40);
  });

  it('maps warnings to warning issues', () => {
    const result = {
      valid: true,
      errors: [],
      warnings: [
        { code: 'MISSING_TITLE', message: 'No title', path: 'metadata.title' },
        { code: 'HIGH_DENSITY', message: 'High density', path: 'entities.ball.physics.density' },
      ],
    };
    
    const report = mapLegacyResultToReport(result);
    
    expect(report.valid).toBe(true);
    expect(report.issues).toHaveLength(2);
    expect(report.issues[0].severity).toBe('warning');
    expect(report.issues[0].source).toBe('gameDefinition');
    expect(report.summary.warningCount).toBe(2);
    expect(report.summary.score).toBe(94);
  });

  it('maps mixed errors and warnings', () => {
    const result = {
      valid: false,
      errors: [
        { code: 'MISSING_WIN_CONDITION', message: 'No win condition', path: 'winCondition' },
      ],
      warnings: [
        { code: 'MISSING_VERSION', message: 'No version', path: 'metadata.version' },
      ],
    };
    
    const report = mapLegacyResultToReport(result);
    
    expect(report.valid).toBe(false);
    expect(report.issues).toHaveLength(2);
    expect(report.summary.criticalCount).toBe(1);
    expect(report.summary.warningCount).toBe(1);
    expect(report.summary.score).toBe(67);
  });

  it('uses default empty path when not provided', () => {
    const result = {
      valid: false,
      errors: [
        { code: 'INVALID_GAME', message: 'Not an object' },
      ],
      warnings: [],
    };
    
    const report = mapLegacyResultToReport(result);
    
    expect(report.issues[0].path).toBe('');
  });

  it('uses provided source', () => {
    const result = {
      valid: true,
      errors: [],
      warnings: [{ code: 'WARN', message: 'Warning' }],
    };
    
    const report = mapLegacyResultToReport(result, 'expressions');
    
    expect(report.issues[0].source).toBe('expressions');
  });
});

describe('createEmptyReport', () => {
  it('creates a valid empty report', () => {
    const report = createEmptyReport();
    
    expect(report.valid).toBe(true);
    expect(report.issues).toEqual([]);
    expect(report.summary.criticalCount).toBe(0);
    expect(report.summary.warningCount).toBe(0);
    expect(report.summary.score).toBe(100);
    expect(report.summary.topIssues).toEqual([]);
    expect(report.validatorVersion).toBe('1.0.0');
  });
});
