import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GameInspectorState } from "../types.js";

const LogLevelEnum = z.enum(["silent", "error", "warn", "info", "debug", "trace"]);
const LogCategoryEnum = z.enum([
  "lifecycle",
  "input",
  "physics",
  "rules",
  "entities",
  "bridge",
  "assets",
  "render",
  "state",
  "loop",
  "inspector",
]);

export function registerLoggingTools(server: McpServer, state: GameInspectorState) {
  server.tool(
    "set_log_level",
    "Set logging verbosity for the game engine logger",
    {
      level: LogLevelEnum.describe("Global log level (applies to all categories unless overridden)"),
      category: LogCategoryEnum.optional().describe("Specific category to set level for (optional, sets global if omitted)"),
    },
    async (args) => {
      if (!state.page) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open. Call game_open first." }) }],
        };
      }

      const level = args.level as string;
      const category = args.category as string | undefined;

      const result = await state.page.evaluate(
        (params: { level: string; category?: string }) => {
          const runtime = (window as any).__GAME_RUNTIME__;
          if (!runtime) {
            return { error: "__GAME_RUNTIME__ not available. Is the game running?" };
          }

          if (!runtime.logger) {
            return { error: "Logger not available on __GAME_RUNTIME__. Logger may not be initialized yet." };
          }

          const levelMap: Record<string, number> = {
            silent: 0,
            error: 1,
            warn: 2,
            info: 3,
            debug: 4,
            trace: 5,
          };

          const levelValue = levelMap[params.level.toLowerCase()];
          if (levelValue === undefined) {
            return { error: `Invalid log level: ${params.level}` };
          }

          try {
            if (params.category) {
              runtime.logger.configure({
                categories: { [params.category]: levelValue },
              });
              return {
                success: true,
                message: `Set ${params.category} log level to ${params.level}`,
                category: params.category,
                level: params.level,
              };
            } else {
              runtime.logger.configure({ level: levelValue });
              return {
                success: true,
                message: `Set global log level to ${params.level}`,
                level: params.level,
              };
            }
          } catch (err) {
            return { error: `Failed to configure logger: ${String(err)}` };
          }
        },
        { level, category }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "get_log_config",
    "Get current logger configuration",
    {},
    async () => {
      if (!state.page) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open. Call game_open first." }) }],
        };
      }

      const result = await state.page.evaluate(() => {
        const runtime = (window as any).__GAME_RUNTIME__;
        if (!runtime) {
          return { error: "__GAME_RUNTIME__ not available. Is the game running?" };
        }

        if (!runtime.logger) {
          return { error: "Logger not available on __GAME_RUNTIME__." };
        }

        try {
          const config = runtime.logger.getConfig();
          const levelNames = ["silent", "error", "warn", "info", "debug", "trace"];
          return {
            success: true,
            config: {
              level: levelNames[config.level] ?? config.level,
              categories: Object.fromEntries(
                Object.entries(config.categories).map(([k, v]) => [k, levelNames[v as number] ?? v])
              ),
            },
          };
        } catch (err) {
          return { error: `Failed to get logger config: ${String(err)}` };
        }
      });

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
