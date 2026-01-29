import type { ActionExecutor } from './ActionExecutor';
import type { RunScriptAction } from '@slopcade/shared';
import type { RuleContext } from '../types';
import { ScriptSandbox } from '@/lib/scripting/ScriptSandbox';

export class RunScriptActionExecutor implements ActionExecutor<RunScriptAction> {
  private sandbox: ScriptSandbox | null = null;

  setSandbox(sandbox: ScriptSandbox): void {
    this.sandbox = sandbox;
  }

  execute(action: RunScriptAction, context: RuleContext): void {
    if (!this.sandbox) {
      console.warn('[RunScriptActionExecutor] No script sandbox available');
      return;
    }

    const functionName = action.export ?? 'default';
    
    const runtime = {
      entities: context.entityManager,
      variables: context.variableManager,
      events: context.eventBus,
      gameState: context.gameState,
      input: context.input,
    };

    const result = this.sandbox.callFunction(runtime, functionName, action.args);

    if (!result.success) {
      console.error(`[RunScriptActionExecutor] Script function '${functionName}' failed:`, result.error);
    }
  }
}
