import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GameInspectorState, WindowWithBridge } from "../types.js";
import { DEFAULT_BASE_URL, DEFAULT_TIMEOUT } from "../types.js";
import { normalizeGameName, buildGameUrl, buildExampleUrl, ensurePage, waitForDebugBridge, clearLogs } from "../utils.js";
import { getAvailableGames, getAvailableExamples, isValidGame, isValidExample, type GameInfo } from "../registry.js";

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
        
        if (pathParts[0] === "test-games") {
          url += "&autostart=true";
        }
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
      const ready = await waitForDebugBridge(page, timeout);

      if (!ready) {
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

      state.currentGameId = identifier;

      const snapshot = await page.evaluate(async () => {
        const w = window as unknown as WindowWithBridge;
        if (!w.GodotDebugBridge) return null;
        return w.GodotDebugBridge.getSnapshot({ detail: "med" });
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              identifier,
              url,
              snapshot,
            }),
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
