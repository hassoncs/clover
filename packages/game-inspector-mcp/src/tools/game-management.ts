import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GameInspectorState, WindowWithBridge } from "../types.js";
import { AVAILABLE_GAMES, AVAILABLE_EXAMPLES, DEFAULT_BASE_URL, DEFAULT_TIMEOUT } from "../types.js";
import { normalizeGameName, buildGameUrl, ensurePage, waitForDebugBridge } from "../utils.js";

export function registerGameManagementTools(server: McpServer, state: GameInspectorState) {
  server.tool(
    "game_list",
    "List all available test games",
    {},
    async () => {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                games: AVAILABLE_GAMES,
                examples: AVAILABLE_EXAMPLES,
                aliases: {
                  peggle: "slopeggle",
                  breakout: "breakoutBouncer",
                  pinball: "pinballLite",
                  stacker: "physicsStacker",
                  platformer: "simplePlatformer",
                },
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
    "game_open",
    "Open a test game in the browser and wait for it to be ready",
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
      if (isFullUrl) {
        url = name;
        identifier = new URL(name).pathname.split("/").pop() || name;
      } else {
        const gameId = normalizeGameName(name);
        const isExampleId = AVAILABLE_EXAMPLES.includes(name as any);
        
        if (gameId) {
          url = buildGameUrl(gameId, baseUrl);
          identifier = gameId;
        } else if (isExampleId) {
          url = `${baseUrl}/examples/${name}`;
          identifier = name;
        } else {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: false,
                  error: `Unknown game/example: "${name}". Available games: ${AVAILABLE_GAMES.join(", ")}. Available examples: ${AVAILABLE_EXAMPLES.join(", ")}`,
                }),
              },
            ],
          };
        }
      }

      const page = await ensurePage(state);

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
    "game_close",
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
