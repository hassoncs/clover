import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GameInspectorState } from '../types.js'

async function setPropViaWorldOps(
  page: NonNullable<GameInspectorState['page']>,
  entityId: string,
  path: string,
  value: unknown
): Promise<void> {
  await page.evaluate(async (p: { entityId: string; path: string; value: unknown }) => {
    const ops = (window as any).debugOps;
    if (!ops) throw new Error("debugOps not available");

    if (p.path.startsWith('transform.position')) {
      const pos = await ops.getPosition(p.entityId);
      if (!pos) throw new Error("Entity not found");
      if (p.path === 'transform.position.x') await ops.setPosition(p.entityId, { x: p.value, y: pos.y });
      else if (p.path === 'transform.position.y') await ops.setPosition(p.entityId, { x: pos.x, y: p.value });
      else if (p.path === 'transform.position') await ops.setPosition(p.entityId, p.value);
    } else if (p.path === 'transform.rotation') {
      await ops.setRotation(p.entityId, p.value);
    } else if (p.path.startsWith('transform.scale')) {
      const scale = await ops.getScale(p.entityId);
      if (!scale) throw new Error("Entity not found");
      if (p.path === 'transform.scale.x') await ops.setScale(p.entityId, { x: p.value, y: scale.y });
      else if (p.path === 'transform.scale.y') await ops.setScale(p.entityId, { x: scale.x, y: p.value });
      else if (p.path === 'transform.scale') await ops.setScale(p.entityId, p.value);
    } else if (p.path === 'render.visible' || p.path === 'visible') {
      await ops.setVisible(p.entityId, p.value);
    } else if (p.path.startsWith('physics.velocity')) {
      const vel = (await ops.getVelocity(p.entityId)) || { x: 0, y: 0 };
      if (p.path === 'physics.velocity.x') await ops.setVelocity(p.entityId, { x: p.value, y: vel.y });
      else if (p.path === 'physics.velocity.y') await ops.setVelocity(p.entityId, { x: vel.x, y: p.value });
      else if (p.path === 'physics.velocity') await ops.setVelocity(p.entityId, p.value);
    } else if (p.path === 'physics.angularVelocity') {
      await ops.setAngularVelocity(p.entityId, p.value);
    } else {
      const propObj: Record<string, unknown> = {};
      propObj[p.path] = p.value;
      await ops.setEntityProps(p.entityId, propObj);
    }
  }, { entityId, path, value });
}

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
      if (!state.page) return { content: [{ type: "text", text: JSON.stringify({ error: "No game open" }) }] };

      const result = await state.page.evaluate(async ({ entityId, paths }) => {
        const ops = (window as any).debugOps;
        if (!ops) return { error: "debugOps not available" };
        try {
          return await ops.getEntityProps(entityId, paths);
        } catch (e: any) {
          return { error: e.message };
        }
      }, { entityId, paths });

      if (result && typeof result === 'object' && 'error' in result) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ entityId, ...result }, null, 2) }] };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ entityId, values: result }, null, 2) }] };
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
      if (!state.page) return { content: [{ type: "text", text: JSON.stringify({ error: "No game open" }) }] };

      const result = await state.page.evaluate(async (entityId) => {
        const ops = (window as any).debugOps;
        if (!ops) return { error: "debugOps not available" };
        try {
          return await ops.getAllEntityProps(entityId);
        } catch (e: any) {
          return { error: e.message };
        }
      }, entityId);

      if (result && typeof result === 'object' && 'error' in result) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ entityId, ...result }, null, 2) }] };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ entityId, ...(result as object) }, null, 2) }] };
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

      if (!state.page) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open." }) }] };
      }

      const applied: Array<{ path: string; ok: boolean; error?: string }> = [];
      const changes: Record<string, unknown> = {};

      for (const [path, value] of Object.entries(values)) {
        try {
          await setPropViaWorldOps(state.page, entityId, path, value);
          applied.push({ path, ok: true });
          changes[path] = value;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          applied.push({ path, ok: false, error: msg });
        }
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            entityId,
            applied,
            snapshotDelta: { entities: [{ entityId, changes }] },
          }, null, 2),
        }],
      };
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

      if (!state.page) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open." }) }] };
      }

      const results: Array<{ op: string; entityId: string; path: string; ok: boolean; error?: string }> = [];

      for (const op of ops) {
        try {
          if (op.op === 'set') {
            await setPropViaWorldOps(state.page, op.entityId, op.path, op.value);
            results.push({ op: op.op, entityId: op.entityId, path: op.path, ok: true });
          } else if (op.op === 'increment' || op.op === 'multiply') {
            const props = await state.page.evaluate(async ({ entityId, path }) => {
              const ops = (window as any).debugOps;
              if (!ops) throw new Error("debugOps not available");
              return await ops.getEntityProps(entityId, [path]);
            }, { entityId: op.entityId, path: op.path });

            const current = (props && typeof props === 'object' && !('error' in props)) ? (props as Record<string, unknown>)[op.path] : undefined;
            if (typeof current !== 'number') {
              results.push({ op: op.op, entityId: op.entityId, path: op.path, ok: false, error: "Property not numeric" });
              continue;
            }
            const newVal = op.op === 'increment' ? current + (op.value as number) : current * (op.value as number);
            await setPropViaWorldOps(state.page, op.entityId, op.path, newVal);
            results.push({ op: op.op, entityId: op.entityId, path: op.path, ok: true });
          } else {
            results.push({ op: op.op, entityId: op.entityId, path: op.path, ok: false, error: `Unsupported op: ${op.op}` });
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          results.push({ op: op.op, entityId: op.entityId, path: op.path, ok: false, error: msg });
        }
      }

      return { content: [{ type: "text" as const, text: JSON.stringify({ results }, null, 2) }] };
    }
  );
}
