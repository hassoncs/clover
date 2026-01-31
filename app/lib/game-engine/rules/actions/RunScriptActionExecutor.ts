import type { ActionExecutor } from './ActionExecutor';
import type { RunScriptAction } from '@slopcade/shared';
import type { RuleContext } from '../types';
import { ScriptSandbox } from '@/lib/scripting/ScriptSandbox';

export class RunScriptActionExecutor implements ActionExecutor<RunScriptAction> {
  private sandbox: ScriptSandbox | null = null;

  setSandbox(sandbox: ScriptSandbox): void {
    this.sandbox = sandbox;
  }

  execute(action: RunScriptAction, _context: RuleContext): void {
    if (!this.sandbox) {
      console.warn('[RunScriptActionExecutor] No script sandbox available');
      return;
    }

    const functionName = action.export ?? 'default';
    
    console.warn(`[RunScriptActionExecutor] Script execution not yet implemented for '${functionName}'`);
  }
}
