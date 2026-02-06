import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GameInspectorState } from '../types.js'

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
      if (!state.page) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open. Call open first." }, null, 2) }] };
      }
      const from = args.from as { x: number; y: number };
      const to = args.to as { x: number; y: number };
      const opts = {
        mask: args.mask as number | undefined,
        excludeEntityId: args.excludeEntityId as string | undefined,
      };

      const result = await state.page.evaluate(async ({ from, to, opts }) => {
        try {
          const ops = (window as any).debugOps;
          if (!ops) return { error: "debugOps not available" };
          return await ops.raycast(from, to, opts);
        } catch (e: any) {
          return { error: e.message };
        }
      }, { from, to, opts });

      if (result && typeof result === 'object' && 'error' in result) {
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      }

      const hits = result ? [result] : [];
      return { content: [{ type: "text" as const, text: JSON.stringify({ hits }, null, 2) }] };
    }
  );

  server.tool(
    "get_shapes",
    "Get collision shapes attached to an entity",
    {
      entityId: z.string().describe("Entity ID"),
    },
    async (args) => {
      if (!state.page) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open. Call open first." }, null, 2) }] };
      }
      const entityId = args.entityId as string;
      const result = await state.page.evaluate(async ({ entityId }) => {
        try {
          const ops = (window as any).debugOps;
          if (!ops) return { error: "debugOps not available" };
          return await ops.getShapes(entityId);
        } catch (e: any) {
          return { error: e.message };
        }
      }, { entityId });

      if (result && typeof result === 'object' && 'error' in result) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ entityId, ...result }, null, 2) }] };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ entityId, shapes: result }, null, 2) }] };
    }
  );

  server.tool(
    "get_joints",
    "Get physics joints (optionally filtered by entity)",
    {
      entityId: z.string().optional().describe("Entity ID (omit to get all joints)"),
    },
    async (args) => {
      if (!state.page) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open. Call open first." }, null, 2) }] };
      }
      const entityId = args.entityId as string | undefined;
      const result = await state.page.evaluate(async ({ entityId }) => {
        try {
          const ops = (window as any).debugOps;
          if (!ops) return { error: "debugOps not available" };
          return await ops.getJoints(entityId);
        } catch (e: any) {
          return { error: e.message };
        }
      }, { entityId });

      if (result && typeof result === 'object' && 'error' in result) {
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ joints: result }, null, 2) }] };
    }
  );

  server.tool(
    "get_overlaps",
    "Get entities currently overlapping with the given entity",
    {
      entityId: z.string().describe("Entity ID"),
    },
    async (args) => {
      if (!state.page) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open. Call open first." }, null, 2) }] };
      }
      const entityId = args.entityId as string;
      const result = await state.page.evaluate(async ({ entityId }) => {
        try {
          const ops = (window as any).debugOps;
          if (!ops) return { error: "debugOps not available" };
          return await ops.getOverlaps(entityId);
        } catch (e: any) {
          return { error: e.message };
        }
      }, { entityId });

      if (result && typeof result === 'object' && 'error' in result) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ entityId, ...result, overlappingIds: [] }, null, 2) }] };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ entityId, overlappingIds: result }, null, 2) }] };
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
      if (!state.page) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open. Call open first." }, null, 2) }] };
      }
      const x = args.x as number;
      const y = args.y as number;

      const result = await state.page.evaluate(async ({ x, y }) => {
        try {
          const ops = (window as any).debugOps;
          if (!ops) return { error: "debugOps not available" };
          return await ops.queryPoint({ x, y });
        } catch (e: any) {
          return { error: e.message };
        }
      }, { x, y });

      if (result && typeof result === 'object' && 'error' in result) {
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      }

      const entities = result ? [{ entityId: result as string }] : [];
      return { content: [{ type: "text" as const, text: JSON.stringify({ point: { x, y }, entities }, null, 2) }] };
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
      if (!state.page) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open. Call open first." }, null, 2) }] };
      }
      const minX = args.minX as number;
      const minY = args.minY as number;
      const maxX = args.maxX as number;
      const maxY = args.maxY as number;

      const result = await state.page.evaluate(async ({ minX, minY, maxX, maxY }) => {
        try {
          const ops = (window as any).debugOps;
          if (!ops) return { error: "debugOps not available" };
          return await ops.queryAABB({ x: minX, y: minY }, { x: maxX, y: maxY });
        } catch (e: any) {
          return { error: e.message };
        }
      }, { minX, minY, maxX, maxY });

      if (result && typeof result === 'object' && 'error' in result) {
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      }

      const entities = (result as string[]).map(id => ({ entityId: id }));
      return { content: [{ type: "text" as const, text: JSON.stringify({ rect: { minX, minY, maxX, maxY }, entities }, null, 2) }] };
    }
  );
}
