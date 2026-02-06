import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GameInspectorState } from '../types.js'

export function registerEventsTools(server: McpServer, state: GameInspectorState) {
  server.tool(
    "subscribe",
    "Subscribe to entity events (spawn, destroy, collision, property changes)",
    {
      eventType: z.enum(["spawn", "destroy", "collision", "propertyChange"]).describe("Event type to monitor"),
      selector: z.string().optional().describe("Entity selector (e.g., '.peg', '#ball')"),
      properties: z.array(z.string()).optional().describe("Properties to watch (for propertyChange events)"),
    },
    async (args) => {
      if (!state.page) return { content: [{ type: "text" as const, text: "No game page open" }] };
      try {
        const result = await state.page.evaluate(async ({ eventType, selector }) => {
          const ops = (window as any).debugOps;
          if (!ops) return { error: "debugOps not available" };
          try {
            const subId = await ops.subscribe(eventType, selector);
            return { subId };
          } catch (e: any) {
            return { error: e.message || String(e) };
          }
        }, { eventType: args.eventType, selector: args.selector });

        if ('error' in result) {
          return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
        }

        return { content: [{ type: "text" as const, text: JSON.stringify({ ok: true, subId: result.subId }, null, 2) }] };
      } catch (e: any) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: e.message || String(e) }, null, 2) }] };
      }
    }
  );

  server.tool(
    "unsubscribe",
    "Unsubscribe from events",
    {
      subscriptionId: z.string().describe("Subscription ID returned from subscribe"),
    },
    async (args) => {
      if (!state.page) return { content: [{ type: "text" as const, text: "No game page open" }] };
      try {
        const result = await state.page.evaluate(async ({ subId }) => {
          const ops = (window as any).debugOps;
          if (!ops) return { error: "debugOps not available" };
          try {
            await ops.unsubscribe(subId);
            return { ok: true };
          } catch (e: any) {
            return { error: e.message || String(e) };
          }
        }, { subId: args.subscriptionId });

        if ('error' in result) {
          return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
        }

        return { content: [{ type: "text" as const, text: JSON.stringify({ ok: true, subId: args.subscriptionId }, null, 2) }] };
      } catch (e: any) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: e.message || String(e) }, null, 2) }] };
      }
    }
  );

  server.tool(
    "poll_events",
    "Poll for new events since last poll",
    {
      subscriptionId: z.string().optional().describe("Subscription ID (omit to get all events)"),
      limit: z.number().optional().describe("Max events to return (default: 100)"),
    },
    async (args) => {
      if (!state.page) return { content: [{ type: "text" as const, text: "No game page open" }] };
      try {
        const result = await state.page.evaluate(async ({ subscriptionId }) => {
          const ops = (window as any).debugOps;
          if (!ops) return { error: "debugOps not available" };
          try {
            const events = await ops.pollEvents(subscriptionId);
            return { events };
          } catch (e: any) {
            return { error: e.message || String(e) };
          }
        }, { subscriptionId: args.subscriptionId });

        if ('error' in result) {
          return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
        }

        const events = result.events || [];
        return { content: [{ type: "text" as const, text: JSON.stringify({ count: events.length, dropped: 0, events }, null, 2) }] };
      } catch (e: any) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: e.message || String(e) }, null, 2) }] };
      }
    }
  );
}
