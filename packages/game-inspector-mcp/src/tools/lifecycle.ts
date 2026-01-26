import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GameInspectorState } from "../types.js";
import { queryGodot } from "../utils.js";

export function registerLifecycleTools(server: McpServer, state: GameInspectorState) {
  server.tool(
    "spawn",
    "Spawn a new entity",
    {
      template: z.string().describe("Template ID"),
      position: z.object({ x: z.number(), y: z.number() }).optional().describe("Spawn position (default: {x:0, y:0})"),
      properties: z.record(z.unknown()).optional().describe("Initial properties"),
      id: z.string().optional().describe("Custom entity ID (auto-generated if not provided)"),
    },
    async (args) => {
      const request = {
        template: args.template as string,
        position: args.position as { x: number; y: number } | undefined,
        initialProps: args.properties as Record<string, unknown> | undefined,
        idHint: args.id as string | undefined,
      };
      const result = await queryGodot(state.page, "spawn", [request]);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "destroy",
    "Destroy an entity",
    {
      entityId: z.string().describe("Entity ID"),
      recursive: z.boolean().optional().describe("Destroy children too (default: false)"),
    },
    async (args) => {
      const entityId = args.entityId as string;
      const options = { recursive: args.recursive as boolean | undefined };
      const result = await queryGodot(state.page, "destroy", [entityId, options]);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "clone",
    "Clone an entity",
    {
      entityId: z.string().describe("Entity ID to clone"),
      position: z.object({ x: z.number(), y: z.number() }).optional().describe("Clone position (default: same as original)"),
      id: z.string().optional().describe("Custom ID for clone"),
      deep: z.boolean().optional().describe("Clone children too (default: true)"),
    },
    async (args) => {
      const entityId = args.entityId as string;
      const options = {
        offset: args.position as { x: number; y: number } | undefined,
        newName: args.id as string | undefined,
        withChildren: args.deep as boolean | undefined,
      };
      const result = await queryGodot(state.page, "clone", [entityId, options]);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "reparent",
    "Move an entity to a new parent",
    {
      entityId: z.string().describe("Entity ID"),
      newParentId: z.string().describe("New parent ID (use 'root' or 'GameRoot' for scene root)"),
      keepGlobalTransform: z.boolean().optional().describe("Maintain world position (default: true)"),
    },
    async (args) => {
      const entityId = args.entityId as string;
      const newParentId = args.newParentId as string;
      const options = { keepGlobalTransform: args.keepGlobalTransform as boolean | undefined };
      const result = await queryGodot(state.page, "reparent", [entityId, newParentId, options]);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );
}
