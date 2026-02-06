import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GameInspectorState } from '../types.js'

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
      const template = args.template as string;
      const position = (args.position as { x: number; y: number } | undefined) ?? { x: 0, y: 0 };
      const tags = args.id ? [args.id as string] : undefined;

      if (!state.page) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open." }) }] };
      }

      const result = await state.page.evaluate(async (p: { template: string; position: { x: number; y: number }; tags?: string[] }) => {
        const ops = (window as any).debugOps;
        if (!ops) return { ok: false, error: "debugOps not available" };

        const entityId = await ops.spawn(p.template, p.position, p.tags ? { tags: p.tags } : undefined);
        if (!entityId) return { ok: false, error: `Failed to spawn template "${p.template}"` };
        return { ok: true, entityId };
      }, { template, position, tags });

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

      if (!state.page) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open." }) }] };
      }

      const result = await state.page.evaluate(async (id: string) => {
        const ops = (window as any).debugOps;
        if (!ops) return { ok: false, error: "debugOps not available" };

        const data = await ops.getEntityData(id);
        if (!data) return { ok: false, error: `Entity not found: ${id}` };

        await ops.destroy(id);
        return { ok: true, entityId: id, mode: "queueFree" };
      }, entityId);

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
      const position = args.position as { x: number; y: number } | undefined;
      const withChildren = (args.deep as boolean | undefined) ?? true;

      if (!state.page) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open." }) }] };
      }

      const result = await state.page.evaluate(async (p: { entityId: string; position?: { x: number; y: number }; withChildren: boolean }) => {
        const ops = (window as any).debugOps;
        if (!ops) return { ok: false, error: "debugOps not available" };

        const newId = await ops.clone(p.entityId, { position: p.position, withChildren: p.withChildren });
        if (!newId) return { ok: false, error: `Failed to clone entity "${p.entityId}"` };
        return { ok: true, entityId: newId, sourceId: p.entityId };
      }, { entityId, position, withChildren });

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
      const keepGlobalTransform = (args.keepGlobalTransform as boolean | undefined) ?? true;

      if (!state.page) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open." }) }] };
      }

      const result = await state.page.evaluate(async (p: { entityId: string; newParentId: string; keepGlobalTransform: boolean }) => {
        const ops = (window as any).debugOps;
        if (!ops) return { ok: false, error: "debugOps not available" };

        await ops.reparent(p.entityId, p.newParentId, { keepGlobalTransform: p.keepGlobalTransform });
        return { ok: true, entityId: p.entityId, newParentId: p.newParentId };
      }, { entityId, newParentId, keepGlobalTransform });

      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );
}
