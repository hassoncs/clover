import { describe, it, expect, beforeAll } from 'vitest';
import { validateGameDefinition, getValidationSummary } from '../validator';
import { validateExpression } from '../../../shared/src/expressions/validator';
import { isExpression } from '../../../shared/src/expressions/types';
import type { GameDefinition, GameRule, RuleCondition, RuleAction } from '../../../shared/src/types/GameDefinition';
import type { Value } from '../../../shared/src/expressions/types';
import { loadAllTestGames, type TestGameId } from '../../../app/lib/registry/generated/testGames';

interface ExpressionLocation {
  gameId: TestGameId;
  ruleId: string;
  path: string;
  expression: string;
}

function extractExpressions(game: GameDefinition, gameId: TestGameId): ExpressionLocation[] {
  const expressions: ExpressionLocation[] = [];

  function addExpression(ruleId: string, path: string, value: Value<unknown>) {
    if (isExpression(value)) {
      expressions.push({
        gameId,
        ruleId,
        path,
        expression: value.expr,
      });
    }
  }

  function extractFromCondition(ruleId: string, path: string, condition: RuleCondition) {
    if (condition.type === 'expression') {
      expressions.push({
        gameId,
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

function validateGameExpressions(
  game: GameDefinition,
  gameId: TestGameId
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const knownVariableNames = game.variables ? Object.keys(game.variables) : [];

  const expressions = extractExpressions(game, gameId);

  for (const { expression, path } of expressions) {
    const result = validateExpression(expression, {
      knownVariables: knownVariableNames,
      path: `${gameId}.${path}`,
    });

    if (!result.valid) {
      for (const error of result.errors) {
        errors.push(`[${gameId}] ${path}: ${error.message}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

describe('All Test Games Validation', () => {
  let testGames: Array<{ id: TestGameId; data: GameDefinition }> = [];

  beforeAll(async () => {
    testGames = await loadAllTestGames();
  });

  it('should load all test games', () => {
    expect(testGames.length).toBeGreaterThan(0);
    console.log(`Loaded ${testGames.length} test games`);
  });

  describe.each(testGames)('Game: $id', ({ id, data }) => {
    it('should pass GameDefinition validation', () => {
      const result = validateGameDefinition(data);

      if (!result.valid) {
        console.log(`\nValidation errors for ${id}:`);
        console.log(getValidationSummary(result));
        for (const error of result.errors) {
          console.log(`  - [${error.code}] ${error.message} (${error.path})`);
        }
      }

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should have valid expressions', () => {
      const result = validateGameExpressions(data, id);

      if (!result.valid) {
        console.log(`\nExpression errors for ${id}:`);
        for (const error of result.errors) {
          console.log(`  - ${error}`);
        }
      }

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
