import type { IScriptSandbox } from './IScriptSandbox';
import type { ScriptSandboxConfig } from './types';
import { UnsafeScriptSandbox } from './UnsafeScriptSandbox';
import { QuickJSScriptSandbox } from './QuickJSScriptSandbox';

/**
 * Feature flag to switch between sandbox implementations.
 *
 * - false (default): Use UnsafeScriptSandbox (eval-based, NO SECURITY)
 * - true: Use QuickJSScriptSandbox (WASM-based, full isolation)
 *
 * TODO: Set to true once QuickJS integration is verified working.
 */
export const USE_SAFE_SANDBOX = false;

export function createScriptSandbox(config: ScriptSandboxConfig): IScriptSandbox {
  if (USE_SAFE_SANDBOX) {
    return new QuickJSScriptSandbox(config);
  }
  return new UnsafeScriptSandbox(config);
}
