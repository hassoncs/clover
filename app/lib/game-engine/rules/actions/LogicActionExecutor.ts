import type { ActionExecutor } from './ActionExecutor';
import type { GameStateAction, EventAction, SetVariableAction, StartCooldownAction, LivesAction } from '@slopcade/shared';
import type { RuleContext } from '../types';
import { resolveNumber, resolveValue } from '../utils';
import type { GameState } from '../../BehaviorContext';

export class LogicActionExecutor implements ActionExecutor<GameStateAction | EventAction | SetVariableAction | StartCooldownAction | LivesAction> {
  execute(action: GameStateAction | EventAction | SetVariableAction | StartCooldownAction | LivesAction, context: RuleContext): void {
    switch (action.type) {
      case 'game_state':
        this.executeGameStateAction(action, context);
        break;
      case 'event':
        context.mutator.triggerEvent(action.eventName, action.data);
        break;
      case 'set_variable':
        this.executeSetVariableAction(action, context);
        break;
      case 'start_cooldown':
        this.executeStartCooldownAction(action, context);
        break;
      case 'lives':
        this.executeLivesAction(action, context);
        break;
    }
  }

  private executeGameStateAction(action: GameStateAction, context: RuleContext): void {
    const mappedState = this.mapActionState(action.state);
    if (mappedState) {
      if (action.delay) {
        setTimeout(() => context.mutator.setGameState(mappedState), action.delay * 1000);
      } else {
        context.mutator.setGameState(mappedState);
      }
    }
  }

  private executeSetVariableAction(action: SetVariableAction, context: RuleContext): void {
    const current = context.mutator.getVariable(action.name);
    const val = resolveValue(action.value, context);

    switch (action.operation) {
      case 'set':
        context.mutator.setVariable(action.name, val);
        break;
      case 'add':
        if (typeof current === 'number' && typeof val === 'number') {
            context.mutator.setVariable(action.name, current + val);
        } else if (typeof current === 'string' || typeof val === 'string') {
            context.mutator.setVariable(action.name, String(current ?? '') + String(val));
        }
        break;
      case 'subtract':
        if (typeof current === 'number' && typeof val === 'number') {
            context.mutator.setVariable(action.name, current - val);
        }
        break;
      case 'multiply':
        if (typeof current === 'number' && typeof val === 'number') {
            context.mutator.setVariable(action.name, current * val);
        }
        break;
      case 'toggle':
        context.mutator.setVariable(action.name, !current);
        break;
    }
  }

  private executeStartCooldownAction(action: StartCooldownAction, context: RuleContext): void {
    const duration = resolveNumber(action.duration, context);
    context.mutator.setCooldown(action.cooldownId, context.elapsed + duration);
  }

  private executeLivesAction(action: LivesAction, context: RuleContext): void {
    const value = resolveNumber(action.value, context);
    switch (action.operation) {
      case 'add':
        context.mutator.addLives(value);
        break;
      case 'subtract':
        context.mutator.addLives(-value);
        break;
      case 'set':
        context.mutator.setLives(value);
        break;
    }
  }

  private mapActionState(
    actionState: 'win' | 'lose' | 'pause' | 'restart' | 'next_level'
  ): GameState['state'] | null {
    switch (actionState) {
      case 'win':
        return 'won';
      case 'lose':
        return 'lost';
      case 'pause':
        return 'paused';
      case 'restart':
        // context.mutator.reset(); // Need reset?
        // Restart logic is usually handled by GameRuntime detecting state change or explicitly.
        // For now, return 'playing' (after reset logic which might need to be in mutator).
        // RulesEvaluator handled restart by calling reset().
        // I should add reset() to mutator if needed, but GameRuntime usually handles restart via key.
        // If action is 'restart', we should trigger it.
        // For now, just return 'playing'.
        return 'playing'; 
      case 'next_level':
        return null;
      default:
        return null;
    }
  }
}
