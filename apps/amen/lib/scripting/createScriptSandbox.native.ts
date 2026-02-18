import type { IScriptSandbox } from './IScriptSandbox';
import type { ScriptSandboxConfig } from './types';
import { UnsafeScriptSandbox } from './UnsafeScriptSandbox';
import { QuickJSScriptSandbox } from './QuickJSScriptSandbox';

export const USE_SAFE_SANDBOX = false;

export function createScriptSandbox(config: ScriptSandboxConfig): IScriptSandbox {
  if (USE_SAFE_SANDBOX) {
    return new QuickJSScriptSandbox(config);
  }

  return new UnsafeScriptSandbox(config);
}
