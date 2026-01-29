/**
 * Scripting module for game runtime scripts.
 *
 * Currently uses eval-based execution for trusted code.
 * QuickJS sandbox integration is planned for untrusted code support.
 */

export * from './types';
export { EvalSandbox, createSeededRandom, createMockScriptContext } from './EvalSandbox';
export { QuickJSSandbox } from './QuickJSSandbox';

// Re-export the current sandbox as the default
export { EvalSandbox as Sandbox } from './EvalSandbox';
