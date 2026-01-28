import type { GameDefinition } from '@slopcade/shared/types/GameDefinition';
import type { RuleCondition, RuleAction } from '@slopcade/shared/types';
import type { Value } from '@slopcade/shared/expressions/types';
import { isExpression } from '@slopcade/shared/expressions/types';
import { validateExpression } from '@slopcade/shared/expressions/validator';
import {
  validateGameDefinition,
  mapLegacyResultToReport,
  type GameValidationReport,
  type GameValidationIssue,
  CURRENT_VALIDATOR_VERSION,
} from '@slopcade/shared/validation';

interface ExpressionLocation {
  ruleId: string;
  path: string;
  expression: string;
}

function extractExpressions(game: GameDefinition): ExpressionLocation[] {
  const expressions: ExpressionLocation[] = [];

  function addExpression(ruleId: string, path: string, value: Value<unknown>) {
    if (isExpression(value)) {
      expressions.push({
        ruleId,
        path,
        expression: value.expr,
      });
    }
  }

  function extractFromCondition(ruleId: string, path: string, condition: RuleCondition) {
    if (condition.type === 'expression') {
      expressions.push({
        ruleId,
        path: `${path}.expression`,
        expression: condition.expr,
      });
    }
  }

  function extractFromAction(ruleId: string, path: string, action: RuleAction) {
    const actionPath = `${path}.actions[]`;

    switch (action.type) {
      case 'apply_impulse':
        if (action.x !== undefined) addExpression(ruleId, `${actionPath}.x`, action.x);
        if (action.y !== undefined) addExpression(ruleId, `${actionPath}.y`, action.y);
        if (action.force !== undefined) addExpression(ruleId, `${actionPath}.force`, action.force);
        break;
      case 'apply_force':
        if (action.x !== undefined) addExpression(ruleId, `${actionPath}.x`, action.x);
        if (action.y !== undefined) addExpression(ruleId, `${actionPath}.y`, action.y);
        if (action.force !== undefined) addExpression(ruleId, `${actionPath}.force`, action.force);
        break;
      case 'set_velocity':
        if (action.x !== undefined) addExpression(ruleId, `${actionPath}.x`, action.x);
        if (action.y !== undefined) addExpression(ruleId, `${actionPath}.y`, action.y);
        break;
      case 'move':
        if (action.speed !== undefined) addExpression(ruleId, `${actionPath}.speed`, action.speed);
        break;
      case 'move_toward':
        if (action.speed !== undefined) addExpression(ruleId, `${actionPath}.speed`, action.speed);
        if (action.maxSpeed !== undefined) addExpression(ruleId, `${actionPath}.maxSpeed`, action.maxSpeed);
        break;
      case 'modify':
        if (action.value !== undefined) addExpression(ruleId, `${actionPath}.value`, action.value);
        break;
      case 'set_variable':
        if (action.value !== undefined) addExpression(ruleId, `${actionPath}.value`, action.value);
        break;
      case 'start_cooldown':
        if (action.duration !== undefined) addExpression(ruleId, `${actionPath}.duration`, action.duration);
        break;
      case 'push_to_list':
        if (action.value !== undefined) addExpression(ruleId, `${actionPath}.value`, action.value);
        break;
      case 'camera_shake':
        if (action.intensity !== undefined) addExpression(ruleId, `${actionPath}.intensity`, action.intensity);
        if (action.duration !== undefined) addExpression(ruleId, `${actionPath}.duration`, action.duration);
        break;
      case 'camera_zoom':
        if (action.scale !== undefined) addExpression(ruleId, `${actionPath}.scale`, action.scale);
        if (action.duration !== undefined) addExpression(ruleId, `${actionPath}.duration`, action.duration);
        if (action.restoreDelay !== undefined) addExpression(ruleId, `${actionPath}.restoreDelay`, action.restoreDelay);
        break;
      case 'set_time_scale':
        if (action.scale !== undefined) addExpression(ruleId, `${actionPath}.scale`, action.scale);
        if (action.duration !== undefined) addExpression(ruleId, `${actionPath}.duration`, action.duration);
        break;
    }
  }

  if (game.rules) {
    for (const rule of game.rules) {
      const ruleId = rule.id || 'unknown';
      const rulePath = `rules.${ruleId}`;

      if (rule.conditions) {
        for (let i = 0; i < rule.conditions.length; i++) {
          extractFromCondition(ruleId, `${rulePath}.conditions[${i}]`, rule.conditions[i]);
        }
      }

      if (rule.actions) {
        for (let i = 0; i < rule.actions.length; i++) {
          extractFromAction(ruleId, `${rulePath}.actions[${i}]`, rule.actions[i]);
        }
      }
    }
  }

  return expressions;
}

function validateGameExpressions(game: GameDefinition): GameValidationIssue[] {
  const issues: GameValidationIssue[] = [];
  const knownVariableNames = game.variables ? Object.keys(game.variables) : [];
  const expressions = extractExpressions(game);

  for (const { expression, path } of expressions) {
    const result = validateExpression(expression, {
      knownVariables: knownVariableNames,
      path,
    });

    if (!result.valid) {
      for (const error of result.errors) {
        issues.push({
          code: 'EXPRESSION_ERROR',
          message: error.message,
          severity: 'critical',
          source: 'expressions',
          path,
          context: expression,
        });
      }
    }
  }

  return issues;
}

export function validateGame(game: GameDefinition): GameValidationReport {
  const structureResult = validateGameDefinition(game);
  const structureReport = mapLegacyResultToReport(structureResult, 'gameDefinition');
  const expressionIssues = validateGameExpressions(game);

  const combinedIssues: GameValidationIssue[] = [
    ...structureReport.issues,
    ...expressionIssues,
  ];

  const criticalCount = combinedIssues.filter(i => i.severity === 'critical').length;
  const warningCount = combinedIssues.filter(i => i.severity === 'warning').length;

  const topIssues = [...combinedIssues]
    .sort((a, b) => {
      if (a.severity === 'critical' && b.severity !== 'critical') return -1;
      if (a.severity !== 'critical' && b.severity === 'critical') return 1;
      return a.path.localeCompare(b.path);
    })
    .slice(0, 3);

  const score = Math.max(0, Math.min(100, 100 - (criticalCount * 30) - (warningCount * 3)));

  return {
    valid: criticalCount === 0,
    issues: combinedIssues,
    summary: {
      criticalCount,
      warningCount,
      score,
      topIssues,
    },
    validatorVersion: CURRENT_VALIDATOR_VERSION,
    validatedAt: Date.now(),
  };
}

export function getValidationReportJson(report: GameValidationReport): string {
  return JSON.stringify(report);
}
