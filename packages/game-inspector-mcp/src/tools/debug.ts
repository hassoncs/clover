import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GameInspectorState } from '../types.js'

export function registerDebugTools(server: McpServer, state: GameInspectorState) {
  server.tool(
    "debug_eval",
    "Evaluate JavaScript in the game page context. Returns the result. Use for debugging game state, script systems, etc.",
    {
      code: z.string().describe("JavaScript code to evaluate in the page context"),
    },
    async (args) => {
      const code = args.code as string;

      if (!state.page) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open. Call game_open first." }) }],
        };
      }

      try {
        const result = await state.page.evaluate((evalCode: string) => {
          try {
            const fn = new Function(`return (${evalCode})`);
            const value = fn();
            return JSON.parse(JSON.stringify(value, (key, val) => {
              if (typeof val === 'function') return '[Function]';
              if (val instanceof Error) return { error: val.message, stack: val.stack };
              return val;
            }));
          } catch (evalError) {
            try {
              const fn = new Function(evalCode);
              fn();
              return { executed: true };
            } catch (stmtError) {
              return { 
                error: evalError instanceof Error ? evalError.message : String(evalError),
                statementError: stmtError instanceof Error ? stmtError.message : String(stmtError)
              };
            }
          }
        }, code);

        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ 
            error: error instanceof Error ? error.message : String(error) 
          }) }],
        };
      }
    }
  );

  server.tool(
    "debug_script_system",
    "Get detailed debugging information about the script sandbox system, including hook status, console log capture, and input processing state.",
    {},
    async () => {
      if (!state.page) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open. Call game_open first." }) }],
        };
      }

      const result = await state.page.evaluate(() => {
        const w = window as any;
        const runtime = w.__GAME_RUNTIME__;
        const debugInfo: Record<string, unknown> = {
          hasGameRuntime: !!runtime,
          hasGodotDebugBridge: !!w.GodotDebugBridge,
        };

        if (runtime?.getInput) {
          debugInfo.inputState = {
            tap: runtime.getInput('tap'),
            mouse: runtime.getInput('mouse'),
            drag: runtime.getInput('drag'),
          };
        }

        if (runtime?.refs) {
          debugInfo.hasRefs = true;
          
          if (runtime.refs.gameSystemRunner?.current) {
            const runner = runtime.refs.gameSystemRunner.current;
            debugInfo.hasGameSystemRunner = true;
            
            const scriptSystem = runner.getSystem?.('script-sandbox');
            if (scriptSystem) {
              debugInfo.hasScriptSystem = true;
              const systemState = scriptSystem.getState?.();
              if (systemState) {
                debugInfo.scriptSystemState = systemState;
              }
              
              const sandbox = scriptSystem.getSandbox?.();
              if (sandbox) {
                debugInfo.hasSandbox = true;
                const logs = sandbox.getLogs?.();
                if (logs && Array.isArray(logs)) {
                  debugInfo.scriptLogs = logs.slice(-50).map((log: { level: string; args: unknown[]; timestamp: number }) => ({
                    level: log.level,
                    message: log.args.map((arg: unknown) => 
                      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                    ).join(' '),
                    timestamp: log.timestamp,
                  }));
                  debugInfo.totalLogCount = logs.length;
                }
              }
            }
          }
        }

        return debugInfo;
      });

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "debug_test_script_console",
    "Test if console.log works from within the script sandbox by triggering a test log message and checking if it appears in captured logs.",
    {
      waitMs: z.number().optional().describe("Time to wait for logs to appear (default: 500ms)"),
    },
    async (args) => {
      const waitMs = (args.waitMs as number | undefined) ?? 500;

      if (!state.page) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open. Call game_open first." }) }],
        };
      }

      const beforeTimestamp = Date.now();
      const testMarker = `__SCRIPT_CONSOLE_TEST_${Date.now()}__`;

      const injectResult = await state.page.evaluate((marker: string) => {
        const w = window as any;
        
        console.log(`[DirectTest] ${marker}`);
        
        const runtime = w.__GAME_RUNTIME__;
        if (runtime?.refs?.gameSystemRunner?.current) {
          const runner = runtime.refs.gameSystemRunner.current;
          const scriptSystem = runner.getSystem?.('script-sandbox');
          if (scriptSystem) {
            const sandbox = scriptSystem.getSandbox?.();
            if (sandbox) {
              const sandboxLogs = sandbox.getLogs?.() ?? [];
              return {
                hasSandbox: true,
                sandboxInfo: {
                  hasOnStart: sandbox.hasHook?.('onStart'),
                  hasOnUpdate: sandbox.hasHook?.('onUpdate'),
                  hasOnInput: sandbox.hasHook?.('onInput'),
                  hasOnCollision: sandbox.hasHook?.('onCollision'),
                },
                sandboxLogs: sandboxLogs.slice(-20).map((log: { level: string; args: unknown[]; timestamp: number }) => ({
                  level: log.level,
                  message: log.args.map((arg: unknown) => 
                    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                  ).join(' '),
                  timestamp: log.timestamp,
                })),
                totalSandboxLogCount: sandboxLogs.length,
                marker,
              };
            }
          }
        }
        
        return { 
          hasSandbox: false, 
          marker,
          note: "Could not access script sandbox. Ensure __GAME_RUNTIME__.refs is exposed."
        };
      }, testMarker);

      await new Promise(resolve => setTimeout(resolve, waitMs));

      const recentPlaywrightLogs = state.consoleLogs
        .filter(log => log.timestamp >= beforeTimestamp)
        .map(log => ({ type: log.type, text: log.text, timestamp: log.timestamp }));

      const foundDirectLog = recentPlaywrightLogs.some(log => log.text.includes(testMarker));
      const foundScriptLogInPlaywright = recentPlaywrightLogs.some(log => log.text.includes('[Script]'));
      const foundScriptLogInSandbox = 'sandboxLogs' in injectResult && 
        Array.isArray(injectResult.sandboxLogs) && 
        injectResult.sandboxLogs.length > 0;

      return {
        content: [{ type: "text" as const, text: JSON.stringify({
          ...injectResult,
          playwrightLogCapture: {
            foundDirectLog,
            foundScriptLogInPlaywright,
            recentLogsCount: recentPlaywrightLogs.length,
            recentLogs: recentPlaywrightLogs.slice(-20),
          },
          sandboxLogCapture: {
            foundScriptLogInSandbox,
            note: foundScriptLogInSandbox 
              ? "Script logs found in sandbox buffer (reliable)" 
              : "No script logs in sandbox buffer yet",
          },
        }, null, 2) }],
      };
    }
  );
}
