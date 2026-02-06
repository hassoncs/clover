import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GameInspectorState } from '../types.js'

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
      const limit = (args.limit as number | undefined) ?? 100;
      const offset = (args.offset as number | undefined) ?? 0;

      if (!state.page) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open." }) }] };
      }

      const result = await state.page.evaluate(async (p: { selector: string; limit: number; offset: number }) => {
        const ops = (window as any).debugOps;
        if (!ops) return { error: "debugOps not available" };

        let entityIds: string[];
        if (p.selector === '*') {
          entityIds = await ops.queryEntities();
        } else {
          entityIds = await ops.queryCss(p.selector);
        }

        const sliced = entityIds.slice(p.offset, p.offset + p.limit);
        const matches: Array<Record<string, unknown>> = [];

        for (const id of sliced) {
          const data = await ops.getEntityData(id);
          if (data) {
            matches.push({
              entityId: data.id,
              name: data.id,
              position: data.position,
              angle: data.rotation,
              tags: data.tags,
              template: data.template,
              visible: true,
              zIndex: 0,
            });
          }
        }

        return { count: matches.length, hasMore: entityIds.length > p.offset + p.limit, matches };
      }, { selector, limit, offset });

      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

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
      const template = args.template as string | undefined;
      const tag = args.tag as string | undefined;
      const name = args.name as string | undefined;
      const limit = (args.limit as number | undefined) ?? 20;

      if (!state.page) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open." }) }] };
      }

      const result = await state.page.evaluate(async (p: { template?: string; tag?: string; name?: string; limit: number }) => {
        const ops = (window as any).debugOps;
        if (!ops) return [];

        const query: Record<string, unknown> = {};
        if (p.template) query.templateId = p.template;
        if (p.tag) query.tag = p.tag;

        const entities: Array<Record<string, unknown>> = await ops.queryEntitiesWithData(Object.keys(query).length > 0 ? query : undefined);

        let filtered = entities;
        if (p.name) {
          const pattern = p.name.toLowerCase();
          filtered = entities.filter((e: any) => String(e.id).toLowerCase().includes(pattern));
        }

        return filtered.slice(0, p.limit).map((e: any) => ({
          id: e.id,
          template: e.template,
          tags: e.tags,
          position: e.position,
          angle: e.rotation,
        }));
      }, { template, tag, name, limit });

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

      if (!state.page) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open." }) }] };
      }

      const result = await state.page.evaluate(async (entityId: string) => {
        const ops = (window as any).debugOps;
        if (!ops) return { entityId, error: "debugOps not available" };

        const data = await ops.getEntityData(entityId);
        if (!data) return { entityId, error: "Entity not found" };

        const allProps = await ops.getAllEntityProps(entityId);

        return { entityId: data.id, ...allProps };
      }, id);

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

      if (!state.page) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open." }) }] };
      }

      const result = await state.page.evaluate(async (p: { x: number; y: number }) => {
        const ops = (window as any).debugOps;
        if (!ops) return [];

        const entityId = await ops.queryPoint({ x: p.x, y: p.y });
        if (!entityId) return [];

        const data = await ops.getEntityData(entityId);
        if (!data) return [];

        return [{
          id: data.id,
          template: data.template,
          position: data.position,
          distance: Math.sqrt(Math.pow(data.position.x - p.x, 2) + Math.pow(data.position.y - p.y, 2)),
        }];
      }, { x, y });

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

      if (!state.page) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open." }) }] };
      }

      const result = await state.page.evaluate(async (p: { minX: number; minY: number; maxX: number; maxY: number }) => {
        const ops = (window as any).debugOps;
        if (!ops) return [];

        const entities = await ops.queryEntitiesWithData({ inAABB: p });
        return (entities as any[]).map((e: any) => ({
          id: e.id,
          template: e.template,
          tags: e.tags,
          position: e.position,
          angle: e.rotation,
        }));
      }, { minX, minY, maxX, maxY });

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
      const template = args.template as string | undefined;
      const tag = args.tag as string | undefined;

      if (!state.page) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open." }) }] };
      }

      const result = await state.page.evaluate(async (p: { template?: string; tag?: string }) => {
        const ops = (window as any).debugOps;
        if (!ops) return { total: 0, byTemplate: {} };

        const query: Record<string, unknown> = {};
        if (p.template) query.templateId = p.template;
        if (p.tag) query.tag = p.tag;

        const entities: Array<{ template?: string }> = await ops.queryEntitiesWithData(Object.keys(query).length > 0 ? query : undefined);
        const byTemplate: Record<string, number> = {};
        for (const e of entities) {
          const t = e.template ?? 'unknown';
          byTemplate[t] = (byTemplate[t] ?? 0) + 1;
        }

        return { total: entities.length, byTemplate };
      }, { template, tag });

      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );
}
