import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GameInspectorState } from "../types.js";
import { queryGodot } from "../utils.js";

export function registerPhysicsTools(server: McpServer, state: GameInspectorState) {
  server.tool(
    "raycast",
    "Cast a ray and find intersecting entities",
    {
      from: z.object({ x: z.number(), y: z.number() }).describe("Ray start position"),
      to: z.object({ x: z.number(), y: z.number() }).describe("Ray end position"),
      mask: z.number().optional().describe("Collision mask filter"),
      excludeEntityId: z.string().optional().describe("Entity to exclude from results"),
      includeNormals: z.boolean().optional().describe("Include surface normals (default: false)"),
    },
    async (args) => {
      const request = {
        from: args.from as { x: number; y: number },
        to: args.to as { x: number; y: number },
        mask: args.mask as number | undefined,
        excludeEntityId: args.excludeEntityId as string | undefined,
        includeNormals: args.includeNormals as boolean | undefined,
      };
      const result = await queryGodot(state.page, "raycast", [request]);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "get_shapes",
    "Get collision shapes attached to an entity",
    {
      entityId: z.string().describe("Entity ID"),
    },
    async (args) => {
      const entityId = args.entityId as string;
      const result = await queryGodot(state.page, "getShapes", [entityId]);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "get_joints",
    "Get physics joints (optionally filtered by entity)",
    {
      entityId: z.string().optional().describe("Entity ID (omit to get all joints)"),
    },
    async (args) => {
      const entityId = args.entityId as string | undefined;
      if (entityId) {
        const result = await queryGodot(state.page, "getEntityJoints", [entityId]);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      }
      const result = await queryGodot(state.page, "getJoints", [{}]);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "get_overlaps",
    "Get entities currently overlapping with the given entity",
    {
      entityId: z.string().describe("Entity ID"),
    },
    async (args) => {
      const entityId = args.entityId as string;
      const result = await queryGodot(state.page, "getOverlaps", [entityId]);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "query_point",
    "Find entities at a specific world position",
    {
      x: z.number().describe("X coordinate in world units"),
      y: z.number().describe("Y coordinate in world units"),
      mask: z.number().optional().describe("Collision mask filter"),
      includeSensors: z.boolean().optional().describe("Include sensor shapes (default: false)"),
    },
    async (args) => {
      const x = args.x as number;
      const y = args.y as number;
      const options = {
        mask: args.mask as number | undefined,
        includeSensors: args.includeSensors as boolean | undefined,
      };
      const result = await queryGodot(state.page, "queryPoint", [x, y, options]);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "query_aabb",
    "Find entities within an axis-aligned bounding box",
    {
      minX: z.number().describe("Min X coordinate"),
      minY: z.number().describe("Min Y coordinate"),
      maxX: z.number().describe("Max X coordinate"),
      maxY: z.number().describe("Max Y coordinate"),
      mask: z.number().optional().describe("Collision mask filter"),
      includeSensors: z.boolean().optional().describe("Include sensor shapes (default: false)"),
    },
    async (args) => {
      const rect = {
        minX: args.minX as number,
        minY: args.minY as number,
        maxX: args.maxX as number,
        maxY: args.maxY as number,
      };
      const options = {
        mask: args.mask as number | undefined,
        includeSensors: args.includeSensors as boolean | undefined,
      };
      const result = await queryGodot(state.page, "queryAABB", [rect, options]);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );
}
