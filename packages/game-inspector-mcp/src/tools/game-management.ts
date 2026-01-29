import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Page } from "playwright";
import type { GameInspectorState, WindowWithBridge } from "../types.js";
import { DEFAULT_BASE_URL, DEFAULT_TIMEOUT } from "../types.js";
import { normalizeGameName, buildGameUrl, buildExampleUrl, ensurePage, waitForDebugBridge, waitForGameReady, clearLogs, getRecentLogs, queryGodot, querySlopcade } from "../utils.js";
import { getAvailableGames, getAvailableExamples, isValidGame, isValidExample, type GameInfo } from "../registry.js";

interface PageError {
  type: string;
  message: string;
  hint: string;
}

async function detectPageError(page: Page): Promise<PageError | null> {
  return page.evaluate(() => {
    const bodyText = document.body?.innerText || "";
    const html = document.documentElement?.innerHTML || "";
    
    if (bodyText.includes("Server Error") || html.includes("Server Error")) {
      const errorMatch = bodyText.match(/Unable to resolve module[^\n]+/);
      const errorMessage = errorMatch?.[0] || bodyText.slice(0, 500);
      return {
        type: "metro-server-error",
        message: errorMessage,
        hint: "Fix the module resolution error in your code",
      };
    }
    
    if (bodyText.includes("Unhandled Runtime Error") || html.includes("Unhandled Runtime Error")) {
      const errorMatch = bodyText.match(/Error:[^\n]+/);
      const errorMessage = errorMatch?.[0] || bodyText.slice(0, 500);
      return {
        type: "runtime-error",
        message: errorMessage,
        hint: "Fix the runtime error in your code",
      };
    }
    
    if (bodyText.includes("Build Error") || html.includes("Build Error")) {
      const errorMatch = bodyText.match(/(?:Error|Failed)[^\n]+/);
      const errorMessage = errorMatch?.[0] || bodyText.slice(0, 500);
      return {
        type: "build-error",
        message: errorMessage,
        hint: "Fix the build error in your code",
      };
    }
    
    if (bodyText.includes("Module not found") || html.includes("Module not found")) {
      const errorMatch = bodyText.match(/Module not found[^\n]+/);
      const errorMessage = errorMatch?.[0] || bodyText.slice(0, 500);
      return {
        type: "module-not-found",
        message: errorMessage,
        hint: "Check that the imported module exists and the path is correct",
      };
    }
    
    if (html.includes('id="__next_error__"') || html.includes("nextjs-portal")) {
      const errorText = document.querySelector('[id*="error"]')?.textContent || bodyText.slice(0, 500);
      return {
        type: "nextjs-error",
        message: errorText,
        hint: "Fix the Next.js error shown on the page",
      };
    }
    
    return null;
  });
}

export function registerGameManagementTools(server: McpServer, state: GameInspectorState) {
  server.tool(
    "list",
    "List all available test games and examples with their paths",
    {},
    async () => {
      const games = getAvailableGames();
      const examples = getAvailableExamples();
      
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                games: games.map((g: GameInfo) => ({ name: g.id, path: g.path })),
                examples: examples.map((e: GameInfo) => ({ name: e.id, path: e.path })),
                totalGames: games.length,
                totalExamples: examples.length,
                usage: "Pass the game name or path to 'open' to open that game/example. Examples: 'slopeggle', '/test-games/candyCrush', '/examples/draggable_cubes'",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "open",
    "Open a test game or example in the browser and wait for it to be ready",
    {
      name: z.string().describe("Game name, example name, or full URL (e.g., 'candyCrush', 'draggable_cubes', 'http://localhost:8085/examples/draggable_cubes')"),
      baseUrl: z.string().optional().describe(`Base URL for the app (default: ${DEFAULT_BASE_URL})`),
      timeout: z.number().optional().describe(`Timeout in ms to wait for game ready (default: ${DEFAULT_TIMEOUT})`),
    },
    async (args) => {
      const name = args.name as string;
      const baseUrl = (args.baseUrl as string | undefined) ?? DEFAULT_BASE_URL;
      const timeout = (args.timeout as number | undefined) ?? DEFAULT_TIMEOUT;

      let url: string;
      let identifier: string;

      const isFullUrl = name.startsWith("http://") || name.startsWith("https://");
      const isPath = name.startsWith("/");
      
      if (isFullUrl) {
        const urlObj = new URL(name);
        if (!urlObj.searchParams.has("debug")) {
          urlObj.searchParams.set("debug", "true");
        }
        url = urlObj.toString();
        identifier = urlObj.pathname.split("/").pop() || name;
      } else if (isPath) {
        const cleanPath = name.split("?")[0];
        const pathParts = cleanPath.split("/").filter(Boolean);
        identifier = pathParts[pathParts.length - 1] || name;
        
        const hasDebug = name.includes("debug=");
        url = `${baseUrl}${cleanPath}${hasDebug ? "" : (name.includes("?") ? "&debug=true" : "?debug=true")}`;
      } else {
        const gameInfo = normalizeGameName(name);
        
        if (gameInfo) {
          if (gameInfo.type === "game") {
            url = buildGameUrl(gameInfo.id, baseUrl);
          } else {
            url = buildExampleUrl(gameInfo.id, baseUrl);
          }
          identifier = gameInfo.id;
        } else if (isValidExample(name)) {
          url = buildExampleUrl(name, baseUrl);
          identifier = name;
        } else if (isValidGame(name)) {
          url = buildGameUrl(name, baseUrl);
          identifier = name;
        } else {
          const availableGames = getAvailableGames();
          const availableExamples = getAvailableExamples();
          
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: false,
                  error: `Unknown game/example: "${name}". Use game_list to see available options.`,
                  hint: "Try one of these game names directly: " + availableGames.slice(0, 5).map((g: GameInfo) => g.id).join(", ") + "...",
                  totalGames: availableGames.length,
                  totalExamples: availableExamples.length,
                }),
              },
            ],
          };
        }
      }

      const page = await ensurePage(state);

      clearLogs(state);
      
      await page.goto(url);
      
      const pageError = await detectPageError(page);
      if (pageError) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: false,
                error: "Page failed to load - error detected",
                errorType: pageError.type,
                errorMessage: pageError.message,
                url,
                hint: pageError.hint,
              }),
            },
          ],
        };
      }
      
      const bridgeReady = await waitForDebugBridge(page, timeout);

      if (!bridgeReady) {
        const latePageError = await detectPageError(page);
        if (latePageError) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: false,
                  error: "Page failed to load - error detected",
                  errorType: latePageError.type,
                  errorMessage: latePageError.message,
                  url,
                  hint: latePageError.hint,
                }),
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: false,
                error: "Timeout waiting for GodotDebugBridge to become ready",
                url,
                hint: "Make sure the dev server is running (pnpm dev) and the URL is correct",
              }),
            },
          ],
        };
      }

      const gameReady = await waitForGameReady(page, timeout);
      
      if (!gameReady) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: false,
                error: "Timeout waiting for game to finish loading (slopcadeGameReady)",
                url,
                hint: "The Godot iframe loaded but the React GameRuntime did not complete setup",
              }),
            },
          ],
        };
      }

      state.currentGameId = identifier;

      const pauseResult = await querySlopcade(page, "pause", []);
      
      const snapshot = await page.evaluate(async () => {
        const w = window as unknown as WindowWithBridge;
        if (!w.GodotDebugBridge) return null;
        return w.GodotDebugBridge.getSnapshot({ detail: "med" });
      });
      
      const timeState = await querySlopcade(page, "getTimeState", []);

      const startupLogs = getRecentLogs(state);
      const errorLogs = startupLogs.filter(l => 
        l.type === 'error' || l.text.includes('ERROR') || l.text.includes('SCRIPT ERROR')
      );

      const response: Record<string, unknown> = {
        success: true,
        identifier,
        url,
        snapshot,
        paused: true,
        timeState,
        logCount: startupLogs.length,
      };

      if (errorLogs.length > 0) {
        response.errors = errorLogs.map(l => l.text);
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(response),
          },
        ],
      };
    }
  );

  server.tool(
    "close",
    "Close the browser and clean up",
    {},
    async () => {
      if (state.page) {
        await state.page.close();
        state.page = null;
      }
      if (state.browser) {
        await state.browser.close();
        state.browser = null;
      }
      state.currentGameId = null;

      return {
        content: [{ type: "text" as const, text: JSON.stringify({ success: true, message: "Browser closed" }) }],
      };
    }
  );
}
