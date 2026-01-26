import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GameInspectorState } from "../types.js";
import { queryGodot } from "../utils.js";

export function registerPropertiesTools(server: McpServer, state: GameInspectorState) {
  server.tool(
    "get_props",
    "Get specific properties from an entity",
    {
      entityId: z.string().describe("Entity ID"),
      paths: z.array(z.string()).describe("Property paths (e.g., ['transform.position', 'physics.velocity'])"),
    },
    async (args) => {
      const entityId = args.entityId as string;
      const paths = args.paths as string[];
      const result = await queryGodot(state.page, "getProps", [entityId, paths]);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "get_all_props",
    "Get all properties from an entity",
    {
      entityId: z.string().describe("Entity ID"),
    },
    async (args) => {
      const entityId = args.entityId as string;
      const result = await queryGodot(state.page, "getAllProps", [entityId]);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "set_props",
    "Set properties on an entity",
    {
      entityId: z.string().describe("Entity ID"),
      values: z.record(z.unknown()).describe("Property values (e.g., {'transform.position.x': 5, 'physics.velocity.y': -10})"),
      validate: z.boolean().optional().describe("Validate before applying (default: true)"),
    },
    async (args) => {
      const entityId = args.entityId as string;
      const values = args.values as Record<string, unknown>;
      const options = { validate: args.validate as boolean | undefined };
      const result = await queryGodot(state.page, "setProps", [entityId, values, options]);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "patch_props",
    "Batch property operations (set, increment, multiply, append, remove)",
    {
      ops: z.array(
        z.object({
          op: z.enum(["set", "increment", "multiply", "append", "remove"]),
          entityId: z.string(),
          path: z.string(),
          value: z.unknown().optional(),
        })
      ).describe("Array of patch operations"),
      validate: z.boolean().optional().describe("Validate before applying (default: true)"),
    },
    async (args) => {
      const ops = args.ops as Array<{ op: string; entityId: string; path: string; value?: unknown }>;
      const options = { validate: args.validate as boolean | undefined };
      const result = await queryGodot(state.page, "patchProps", [ops, options]);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );
}
