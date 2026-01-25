import type { ActionExecutor } from './ActionExecutor';
import type { PathStartAction, PathStopAction } from '@slopcade/shared';
import type { RuleContext } from '../types';
import { resolveEntityTarget, resolveNumber } from '../utils';

type PathAction = PathStartAction | PathStopAction;

export class PathActionExecutor implements ActionExecutor<PathAction> {
  execute(action: PathAction, context: RuleContext): void {
    switch (action.type) {
      case 'path_start': this.executeStart(action, context); break;
      case 'path_stop': this.executeStop(action, context); break;
    }
  }

  private executeStart(action: PathStartAction, context: RuleContext): void {
    const entities = resolveEntityTarget(action.target, context);
    if (entities.length === 0) return;

    const stateKey = '__pathFollowers';
    let states = context.mutator.getVariable(stateKey) as Record<string, { pathId: string; progress: number; speed: number; active: boolean }> | undefined;
    if (!states) states = {};

    const speed = action.speed ? resolveNumber(action.speed, context) : 2;

    for (const entity of entities) {
      states[entity.id] = { pathId: action.pathId, progress: 0, speed, active: true };
    }

    context.mutator.setVariable(stateKey, states as unknown as number);
  }

  private executeStop(action: PathStopAction, context: RuleContext): void {
    const entities = resolveEntityTarget(action.target, context);
    if (entities.length === 0) return;

    const stateKey = '__pathFollowers';
    let states = context.mutator.getVariable(stateKey) as Record<string, { pathId: string; progress: number; speed: number; active: boolean }> | undefined;
    if (!states) return;

    for (const entity of entities) {
      if (states[entity.id]) states[entity.id].active = false;
    }

    context.mutator.setVariable(stateKey, states as unknown as number);
  }
}
