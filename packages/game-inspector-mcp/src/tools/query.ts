import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GameInspectorState } from "../types.js";
import { queryGodot } from "../utils.js";

export function registerQueryTools(server: McpServer, state: GameInspectorState) {
  server.tool(
    "query",
    "Find entities using CSS-like selectors (e.g., '.peg', '#wall-top', '[template=bluePeg]')",
    {
      selector: z.string().describe("CSS-like selector: '.tag', '#id', 'template', '[attr=value]'"),
      limit: z.number().optional().describe("Max results (default: 100)"),
      offset: z.number().optional().describe("Skip first N results (default: 0)"),
    },
    async (args) => {
      const selector = args.selector as string;
      const options = {
        limit: args.limit as number | undefined,
        offset: args.offset as number | undefined,
      };
      const result = await queryGodot(state.page, "query", [selector, options]);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  // Legacy find tools for compatibility
  server.tool(
    "game_find",
    "Find entities by template, tag, or name pattern",
    {
      template: z.string().optional().describe("Filter by template (e.g., 'candy', 'ball')"),
      tag: z.string().optional().describe("Filter by tag"),
      name: z.string().optional().describe("Filter by name pattern (partial match)"),
      limit: z.number().optional().describe("Max results (default: 20)"),
    },
    async (args) => {
      const opts = {
        template: args.template as string | undefined,
        tag: args.tag as string | undefined,
        name: args.name as string | undefined,
        limit: (args.limit as number | undefined) ?? 20,
      };

      const result = await queryGodot<unknown[]>(state.page, "findEntities", [opts]);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "game_entity",
    "Get detailed info about a specific entity",
    {
      id: z.string().describe("Entity ID"),
    },
    async (args) => {
      const id = args.id as string;
      const result = await queryGodot(state.page, "getEntityDetails", [id]);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "game_at_point",
    "Find entities at or near a world position",
    {
      x: z.number().describe("X coordinate in world units"),
      y: z.number().describe("Y coordinate in world units"),
    },
    async (args) => {
      const x = args.x as number;
      const y = args.y as number;
      const result = await queryGodot<unknown[]>(state.page, "getEntitiesAtPoint", [x, y]);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "game_in_rect",
    "Find entities within a rectangular region",
    {
      minX: z.number().describe("Min X coordinate"),
      minY: z.number().describe("Min Y coordinate"),
      maxX: z.number().describe("Max X coordinate"),
      maxY: z.number().describe("Max Y coordinate"),
    },
    async (args) => {
      const { minX, minY, maxX, maxY } = args as { minX: number; minY: number; maxX: number; maxY: number };
      const result = await queryGodot<unknown[]>(state.page, "getEntitiesInRect", [minX, minY, maxX, maxY]);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "game_count",
    "Count entities by template or tag",
    {
      template: z.string().optional().describe("Filter by template"),
      tag: z.string().optional().describe("Filter by tag"),
    },
    async (args) => {
      const opts = {
        template: args.template as string | undefined,
        tag: args.tag as string | undefined,
      };
      const result = await queryGodot(state.page, "getEntityCount", [opts]);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );
}
